import { useState, useEffect, useMemo, useRef } from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnOrderState,
  type FilterFn,
  type Column,
  type Header,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bookmark,
  ChevronDown,
  ListFilter,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { DataTableFacetedFilter } from "./faceted-filter";

export interface FacetedFilterConfig {
  columnId: string;
  title: string;
  options?: { label: string; value: string }[];
}

interface TableViewState {
  columnOrder?: string[];
  columnVisibility?: VisibilityState;
  sorting?: SortingState;
  showFilterRow?: boolean;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
  facetedFilters?: FacetedFilterConfig[];
  /** Unique page key — enables column drag-reorder persistence via Save View */
  viewKey?: string;
}

// Substring match for text filters; exact-match-any for faceted (array) filters
const smartIncludesFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true;
    return filterValue.includes(value) || filterValue.includes(String(value));
  }
  return String(value ?? "")
    .toLowerCase()
    .includes(String(filterValue).toLowerCase());
};

function getColumnIds<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): string[] {
  return columns
    .map((c) => {
      if (c.id) return c.id;
      const key = (c as { accessorKey?: unknown }).accessorKey;
      return typeof key === "string" ? key : "";
    })
    .filter(Boolean);
}

function ColumnFilterInput<TData, TValue>({
  column,
}: {
  column: Column<TData, TValue>;
}) {
  const value = column.getFilterValue();
  return (
    <Input
      value={typeof value === "string" ? value : ""}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      placeholder={
        Array.isArray(value) ? `${value.length} selected` : "Filter..."
      }
      className="h-7 w-full min-w-20 text-xs font-normal"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function DraggableTableHead<TData, TValue>({
  header,
  draggable,
}: {
  header: Header<TData, TValue>;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: header.column.id,
      disabled: !draggable || header.column.id === "select",
    });

  return (
    <TableHead
      ref={setNodeRef}
      colSpan={header.colSpan}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
        zIndex: isDragging ? 1 : 0,
      }}
      className={
        draggable && header.column.id !== "select"
          ? "cursor-grab whitespace-nowrap active:cursor-grabbing"
          : undefined
      }
      {...attributes}
      {...listeners}
    >
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
    </TableHead>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  toolbar,
  enableRowSelection = false,
  onRowSelectionChange,
  onRowClick,
  facetedFilters = [],
  viewKey,
}: DataTableProps<TData, TValue>) {
  const queryClient = useQueryClient();
  const defaultOrder = useMemo(() => getColumnIds(columns), [columns]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(defaultOrder);
  const [showFilterRow, setShowFilterRow] = useState(false);

  const { data: savedViews } = useQuery<Record<string, TableViewState>>({
    queryKey: ["table-views"],
    queryFn: () => api.get("/table-views").then((r) => r.data),
    enabled: !!viewKey,
    staleTime: 5 * 60 * 1000,
  });

  // Apply the saved view once when it loads
  const viewAppliedRef = useRef(false);
  useEffect(() => {
    if (!viewKey || !savedViews || viewAppliedRef.current) return;
    viewAppliedRef.current = true;
    const view = savedViews[viewKey];
    if (!view) return;
    if (Array.isArray(view.columnOrder)) {
      // Drop columns that no longer exist; append new ones at the end
      const valid = view.columnOrder.filter((id) => defaultOrder.includes(id));
      const missing = defaultOrder.filter((id) => !valid.includes(id));
      setColumnOrder([...valid, ...missing]);
    }
    if (view.columnVisibility && typeof view.columnVisibility === "object") {
      setColumnVisibility(view.columnVisibility);
    }
    if (Array.isArray(view.sorting)) {
      setSorting(view.sorting);
    }
    if (typeof view.showFilterRow === "boolean") {
      setShowFilterRow(view.showFilterRow);
    }
  }, [savedViews, viewKey, defaultOrder]);

  const table = useReactTable({
    data,
    columns,
    defaultColumn: { filterFn: smartIncludesFilter as FilterFn<TData> },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onColumnOrderChange: setColumnOrder,
    globalFilterFn: "includesString",
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    enableRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      columnOrder,
    },
  });

  useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumnOrder((order) => {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      if (oldIndex < 0 || newIndex < 0) return order;
      return arrayMove(order, oldIndex, newIndex);
    });
  };

  const saveView = async () => {
    if (!viewKey) return;
    const state: TableViewState = {
      columnOrder,
      columnVisibility,
      sorting,
      showFilterRow,
    };
    try {
      await api.put(`/table-views/${viewKey}`, { state });
      queryClient.setQueryData<Record<string, TableViewState>>(
        ["table-views"],
        (old) => ({ ...(old ?? {}), [viewKey]: state })
      );
      toast.success("View saved");
    } catch {
      toast.error("Failed to save view. Please try again.");
    }
  };

  const resetView = async () => {
    if (!viewKey) return;
    try {
      await api.delete(`/table-views/${viewKey}`);
      queryClient.setQueryData<Record<string, TableViewState>>(
        ["table-views"],
        (old) => {
          if (!old) return old;
          const next = { ...old };
          delete next[viewKey];
          return next;
        }
      );
      setColumnOrder(defaultOrder);
      setColumnVisibility({});
      setSorting([]);
      setShowFilterRow(false);
      toast.success("View reset to default");
    } catch {
      toast.error("Failed to reset view. Please try again.");
    }
  };

  const visibleColumnIds = table.getVisibleLeafColumns().map((c) => c.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilterRow((s) => !s)}
          >
            <ListFilter className="mr-2 h-4 w-4" />
            Filters
            {columnFilters.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 rounded-sm px-1 font-normal"
              >
                {columnFilters.length}
              </Badge>
            )}
          </Button>
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setColumnFilters([])}
              title="Clear all column filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {viewKey && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Bookmark className="mr-2 h-4 w-4" />
                  View <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={saveView}>
                  <Save className="mr-2 h-4 w-4" />
                  Save view
                </DropdownMenuItem>
                <DropdownMenuItem onClick={resetView}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {facetedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {facetedFilters.map((filter) => {
            const col = table.getColumn(filter.columnId);
            if (!col) return null;
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={col}
                title={filter.title}
                options={filter.options}
              />
            );
          })}
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setColumnFilters([])}
            >
              Reset
              <X className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
      >
        <div className="rounded-lg border shadow-sm overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  <SortableContext
                    items={visibleColumnIds}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <DraggableTableHead
                        key={header.id}
                        header={header}
                        draggable={!!viewKey}
                      />
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
              {showFilterRow && (
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableHead key={column.id} className="py-1.5">
                      {column.getCanFilter() ? (
                        <ColumnFilterInput column={column} />
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`transition-colors hover:bg-muted/50 ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-500">
          {enableRowSelection && (
            <span>
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export { type RowSelectionState };
