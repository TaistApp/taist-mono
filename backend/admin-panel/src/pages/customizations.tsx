import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { Button } from "@/components/ui/button";

interface Customization {
  id: number;
  menu_id: number;
  menu_title: string | null;
  name: string;
  upcharge_price: number;
  created_at: number;
}

function formatCustId(id: number) {
  return `CUST${String(id).padStart(7, "0")}`;
}

function formatMenuId(id: number) {
  return `MI${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const columns: ColumnDef<Customization>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customization ID" />
    ),
    cell: ({ row }) => formatCustId(row.original.id),
  },
  {
    id: "menu_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Menu ID" />
    ),
    accessorFn: (row) => row.menu_id,
    cell: ({ row }) => formatMenuId(row.original.menu_id),
  },
  {
    accessorKey: "menu_title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Menu Item" />
    ),
    cell: ({ row }) =>
      row.original.menu_title || (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customization" />
    ),
  },
  {
    accessorKey: "upcharge_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => `$${row.original.upcharge_price.toFixed(2)}`,
    sortingFn: "basic",
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.created_at),
  },
  {
    id: "actions",
    header: "Actions",
    cell: function ActionsCell({ row }) {
      const navigate = useNavigate();
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            navigate(
              `/admin-new/customizations/${row.original.id}/edit`
            )
          }
        >
          Edit
        </Button>
      );
    },
    enableSorting: false,
  },
];

export default function CustomizationsPage() {
  const { data: customizations = [], isLoading } = useQuery<Customization[]>({
    queryKey: ["customizations"],
    queryFn: () => api.get("/customizations").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Customizations</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={customizations}
          searchPlaceholder="Search customizations..."
        />
      )}
    </div>
  );
}
