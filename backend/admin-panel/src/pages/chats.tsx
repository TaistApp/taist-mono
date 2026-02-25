import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { ExpandableText } from "@/components/expandable-text";

interface Chat {
  id: number;
  order_id: number;
  from_user: { name: string; email: string };
  to_user: { name: string; email: string };
  message: string;
  is_viewed: boolean;
  created_at: number;
}

function formatChatId(id: number) {
  return `CHAT${String(id).padStart(7, "0")}`;
}

function formatOrderId(id: number) {
  return `ORDER${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const columns: ColumnDef<Chat>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chat ID" />
    ),
    cell: ({ row }) => formatChatId(row.original.id),
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
      <DataTableColumnHeader column={column} title="Sender" />
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
      <DataTableColumnHeader column={column} title="Recipient" />
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
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => (
      <ExpandableText text={row.original.message} className="max-w-[320px]" />
    ),
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

export default function ChatsPage() {
  const { data: chats = [], isLoading } = useQuery<Chat[]>({
    queryKey: ["chats"],
    queryFn: () => api.get("/chats").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Chats</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={chats}
          searchPlaceholder="Search chats..."
        />
      )}
    </div>
  );
}
