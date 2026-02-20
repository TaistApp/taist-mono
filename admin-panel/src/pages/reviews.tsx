import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";

interface Review {
  id: number;
  order_id: number;
  from_user_email: string;
  to_user_email: string;
  rating: number;
  review: string | null;
  tip_amount: number;
  created_at: number;
}

function formatReviewId(id: number) {
  return `R${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

const columns: ColumnDef<Review>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Review ID" />
    ),
    cell: ({ row }) => formatReviewId(row.original.id),
  },
  {
    accessorKey: "from_user_email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
  },
  {
    accessorKey: "to_user_email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chef" />
    ),
  },
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rating" />
    ),
    cell: ({ row }) => `${row.original.rating}/5`,
    sortingFn: "basic",
  },
  {
    accessorKey: "review",
    header: "Review",
    cell: ({ row }) => {
      const text = row.original.review;
      if (!text) return <span className="text-gray-400">—</span>;
      return (
        <span className="text-xs" title={text}>
          {text.length > 60 ? text.slice(0, 60) + "..." : text}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "tip_amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tip" />
    ),
    cell: ({ row }) => `$${row.original.tip_amount.toFixed(2)}`,
    sortingFn: "basic",
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.created_at),
  },
];

export default function ReviewsPage() {
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["reviews"],
    queryFn: () => api.get("/reviews").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Reviews</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={reviews}
          searchPlaceholder="Search reviews..."
        />
      )}
    </div>
  );
}
