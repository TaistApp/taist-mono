import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
  chef_id: number;
  chef_email: string;
  menu_id: number;
  menu_title: string | null;
  status: string;
  status_code: number;
  created_at: number;
}

interface CategoriesResponse {
  categories: Category[];
  requested_count: number;
}

const statusColors: Record<string, string> = {
  Requested: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

function formatCatId(id: number) {
  return `CAT${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

const columns: ColumnDef<Category>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => formatCatId(row.original.id),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "chef_email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chef Email" />
    ),
  },
  {
    accessorKey: "menu_title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Menu Item" />
    ),
    cell: ({ row }) => {
      const title = row.original.menu_title;
      return title || <span className="text-gray-400">—</span>;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="outline" className={statusColors[status] ?? ""}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.created_at),
  },
];

type FilterStatus = "all" | "requested" | "approved" | "rejected";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    ids: number[];
  }>({ open: false, action: "", ids: [] });
  const [selectedRows, setSelectedRows] = useState<Category[]>([]);

  const { data, isLoading } = useQuery<CategoriesResponse>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });

  const allCategories = data?.categories ?? [];
  const requestedCount = data?.requested_count ?? 0;

  const filteredCategories = allCategories.filter((c) => {
    if (filter === "all") return true;
    if (filter === "requested") return c.status_code === 1;
    if (filter === "approved") return c.status_code === 2;
    if (filter === "rejected") return c.status_code === 3;
    return true;
  });

  const getSelectedIds = () => selectedRows.map((r) => r.id);

  const handleAction = (action: string) => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Select at least one category");
      return;
    }
    setConfirmDialog({ open: true, action, ids });
  };

  const confirmAction = async () => {
    const { action, ids } = confirmDialog;
    setConfirmDialog({ open: false, action: "", ids: [] });

    try {
      const statusMap: Record<string, number> = {
        Approved: 2,
        Rejected: 3,
      };
      await api.get("/adminapi/change_category_status", {
        params: { ids: ids.join(","), status: statusMap[action] },
      });
      toast.success(`Category status changed to ${action}`);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const filterButtons: { label: string; value: FilterStatus; count?: number }[] = [
    { label: "Requested", value: "requested", count: requestedCount },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "All", value: "all" },
  ];

  const toolbar = (
    <div className="flex items-center gap-2">
      {filterButtons.map((fb) => (
        <Button
          key={fb.value}
          size="sm"
          variant={filter === fb.value ? "default" : "outline"}
          onClick={() => setFilter(fb.value)}
        >
          {fb.label}
          {fb.count != null && fb.count > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {fb.count}
            </Badge>
          )}
        </Button>
      ))}
      <div className="mx-2 h-6 w-px bg-gray-200" />
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("Approved")}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("Rejected")}
      >
        Reject
      </Button>
    </div>
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Categories</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCategories}
          searchPlaceholder="Search categories..."
          toolbar={toolbar}
          enableRowSelection
          onRowSelectionChange={setSelectedRows}
        />
      )}

      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, action: "", ids: [] })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Change status to "{confirmDialog.action}" for{" "}
              {confirmDialog.ids.length} selected category(ies)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, action: "", ids: [] })
              }
            >
              Cancel
            </Button>
            <Button onClick={confirmAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
