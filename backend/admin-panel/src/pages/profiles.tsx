import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { ExpandableText } from "@/components/expandable-text";
import { Button } from "@/components/ui/button";

interface Profile {
  id: number;
  email: string;
  name: string;
  bio: string | null;
  availability: Record<string, string | null>;
  min_order_amount: number | null;
  max_order_distance: number | null;
  created_at: number;
}

function formatChefId(id: number) {
  return `CHEF${String(id).padStart(7, "0")}`;
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

const dayKeys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const columns: ColumnDef<Profile>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chef ID" />
    ),
    cell: ({ row }) => formatChefId(row.original.id),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "bio",
    header: "Bio",
    cell: ({ row }) => {
      const bio = row.original.bio;
      if (!bio) return <span className="text-gray-400">—</span>;
      return <ExpandableText text={bio} className="max-w-[320px]" />;
    },
    enableSorting: false,
  },
  ...dayKeys.map(
    (day): ColumnDef<Profile> => ({
      id: day,
      header: day,
      cell: ({ row }) => {
        const val = row.original.availability[day];
        return val || <span className="text-gray-400">—</span>;
      },
      enableSorting: false,
    })
  ),
  {
    id: "min_order",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Min Order" />
    ),
    accessorFn: (row) => row.min_order_amount,
    cell: ({ row }) =>
      row.original.min_order_amount != null
        ? `$${row.original.min_order_amount}`
        : "—",
  },
  {
    id: "max_distance",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Max Distance" />
    ),
    accessorFn: (row) => row.max_order_distance,
    cell: ({ row }) =>
      row.original.max_order_distance != null
        ? `${row.original.max_order_distance} mi`
        : "—",
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
            navigate(`/admin-new/profiles/${row.original.id}/edit`)
          }
        >
          Edit
        </Button>
      );
    },
    enableSorting: false,
  },
];

export default function ProfilesPage() {
  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: () => api.get("/profiles").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Profiles</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={profiles}
          searchPlaceholder="Search profiles..."
        />
      )}
    </div>
  );
}
