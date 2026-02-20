import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";

interface Transaction {
  id: number;
  order_id: number;
  from_user: { name: string; email: string };
  to_user: { name: string; email: string };
  amount: number;
  notes: string | null;
  created_at: number;
}

function formatTxId(id: number) {
  return `X${String(id).padStart(7, "0")}`;
}

function formatOrderId(id: number) {
  return `ORDER${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction ID" />
    ),
    cell: ({ row }) => formatTxId(row.original.id),
  },
  {
    accessorKey: "order_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order ID" />
    ),
    cell: ({ row }) => formatOrderId(row.original.order_id),
  },
  {
    id: "from_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    accessorFn: (row) => row.from_user.email,
    cell: ({ row }) => {
      const u = row.original.from_user;
      return (
        <div className="text-xs">
          <div>{u.name}</div>
          <div className="text-gray-500">{u.email}</div>
        </div>
      );
    },
  },
  {
    id: "to_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chef" />
    ),
    accessorFn: (row) => row.to_user.email,
    cell: ({ row }) => {
      const u = row.original.to_user;
      return (
        <div className="text-xs">
          <div>{u.name}</div>
          <div className="text-gray-500">{u.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => `$${row.original.amount.toFixed(2)}`,
    sortingFn: "basic",
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) =>
      row.original.notes || <span className="text-gray-400">—</span>,
    enableSorting: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.created_at),
  },
];

export default function TransactionsPage() {
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: () => api.get("/transactions").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Transactions</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
          searchPlaceholder="Search transactions..."
        />
      )}
    </div>
  );
}
