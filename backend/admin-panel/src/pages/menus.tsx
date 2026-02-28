import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { ExpandableText } from "@/components/expandable-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Menu {
  id: number;
  user_email: string;
  user_name: string;
  user_photo: string | null;
  title: string;
  description: string | null;
  price: number;
  serving_size: number;
  estimated_time: number;
  is_live: boolean;
  category_names: string;
  allergen_names: string;
  appliance_names: string;
  created_at: number;
}

function formatMenuId(id: number) {
  return `MI${String(id).padStart(7, "0")}`;
}

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
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

const columns: ColumnDef<Menu>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Menu ID" />
    ),
    cell: ({ row }) => formatMenuId(row.original.id),
  },
  {
    accessorKey: "user_email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chef Email" />
    ),
  },
  {
    accessorKey: "user_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chef Name" />
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const desc = row.original.description;
      if (!desc) return <span className="text-gray-400">—</span>;
      return <ExpandableText text={desc} className="max-w-[320px]" />;
    },
    enableSorting: false,
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => formatCurrency(row.original.price),
    sortingFn: "basic",
  },
  {
    accessorKey: "serving_size",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Servings" />
    ),
  },
  {
    accessorKey: "category_names",
    header: "Categories",
    cell: ({ row }) =>
      row.original.category_names || (
        <span className="text-gray-400">—</span>
      ),
    enableSorting: false,
  },
  {
    accessorKey: "allergen_names",
    header: "Allergens",
    cell: ({ row }) =>
      row.original.allergen_names || (
        <span className="text-gray-400">—</span>
      ),
    enableSorting: false,
  },
  {
    accessorKey: "appliance_names",
    header: "Appliances",
    cell: ({ row }) =>
      row.original.appliance_names || (
        <span className="text-gray-400">—</span>
      ),
    enableSorting: false,
  },
  {
    accessorKey: "estimated_time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Est. Time" />
    ),
    cell: ({ row }) => `${row.original.estimated_time} min`,
  },
  {
    id: "is_live",
    accessorKey: "is_live",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Live?" />
    ),
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.is_live
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        }
      >
        {row.original.is_live ? "Yes" : "No"}
      </Badge>
    ),
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
            navigate(`/admin-new/menus/${row.original.id}/edit`)
          }
        >
          Edit
        </Button>
      );
    },
    enableSorting: false,
  },
];

export default function MenusPage() {
  const { data: menus = [], isLoading } = useQuery<Menu[]>({
    queryKey: ["menus"],
    queryFn: () => api.get("/menus").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Menu Items</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={menus}
          searchPlaceholder="Search menu items..."
        />
      )}
    </div>
  );
}
