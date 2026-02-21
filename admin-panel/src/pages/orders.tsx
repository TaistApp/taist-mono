import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { ExpandableText } from "@/components/expandable-text";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import OrderDetailDrawer from "@/components/order-detail-drawer";

interface Order {
  id: number;
  customer: { name: string; email: string };
  chef: { name: string; email: string };
  menu_title: string | null;
  quantity: number;
  total_price: number;
  order_date: number;
  status: string;
  status_code: number;
  notes: string | null;
  cancelled_by: { role: string; name: string; email: string } | null;
  cancelled_at: string | null;
  cancellation_type: string | null;
  cancellation_reason: string | null;
  refund_amount: number | null;
  refund_percentage: number | null;
  refund_processed_at: string | null;
  refund_stripe_id: string | null;
  is_auto_closed: boolean;
  review: { rating: number; text: string | null; tip_amount: number } | null;
  created_at: number;
}

const statusColors: Record<string, string> = {
  Requested: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  Accepted: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  Completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  Cancelled: "bg-red-500/15 text-red-700 border-red-500/20",
  Rejected: "bg-red-500/15 text-red-700 border-red-500/20",
  Expired: "bg-gray-500/15 text-gray-700 border-gray-500/20",
  "On My Way": "bg-violet-500/15 text-violet-700 border-violet-500/20",
};

function formatOrderId(id: number) {
  return `ORDER${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function formatDate(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

const columns: ColumnDef<Order>[] = [
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
      <DataTableColumnHeader column={column} title="Order ID" />
    ),
    cell: ({ row }) => formatOrderId(row.original.id),
  },
  {
    id: "customer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    accessorFn: (row) => row.customer.email,
    cell: ({ row }) => {
      const c = row.original.customer;
      return (
        <div className="text-xs">
          <div>{c.name}</div>
          <div className="text-gray-500">{c.email}</div>
        </div>
      );
    },
  },
  {
    id: "chef",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chef" />
    ),
    accessorFn: (row) => row.chef.email,
    cell: ({ row }) => {
      const c = row.original.chef;
      return (
        <div className="text-xs">
          <div>{c.name}</div>
          <div className="text-gray-500">{c.email}</div>
        </div>
      );
    },
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
    accessorKey: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Qty" />
    ),
  },
  {
    accessorKey: "total_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => formatCurrency(row.original.total_price),
  },
  {
    accessorKey: "order_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Date" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.order_date),
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
    id: "cancellation",
    header: "Cancellation",
    cell: ({ row }) => {
      const o = row.original;
      if (!o.cancelled_by) return <span className="text-gray-400">—</span>;
      return (
        <div className="text-xs">
          <div>
            {o.cancelled_by.role
              ? `${o.cancelled_by.role.charAt(0).toUpperCase()}${o.cancelled_by.role.slice(1)}`
              : ""}{" "}
            - {o.cancelled_by.name}
          </div>
          {o.cancellation_reason && (
            <ExpandableText
              text={o.cancellation_reason}
              maxLength={60}
              className="text-gray-500"
            />
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "refund",
    header: "Refund",
    cell: ({ row }) => {
      const o = row.original;
      if (o.refund_amount == null) return <span className="text-gray-400">—</span>;
      return (
        <div className="text-xs">
          <div>
            {formatCurrency(o.refund_amount)} ({o.refund_percentage}%)
          </div>
          {o.refund_stripe_id && (
            <div className="text-gray-500" title={o.refund_stripe_id}>
              {o.refund_stripe_id.slice(0, 20)}...
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "review",
    header: "Review",
    cell: ({ row }) => {
      const r = row.original.review;
      if (!r) return <span className="text-gray-400">—</span>;
      return (
        <div className="text-xs">
          <div>{r.rating}/5</div>
          {r.text && (
            <ExpandableText
              text={r.text}
              maxLength={60}
              className="text-gray-500"
            />
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];

type FilterStatus = "all" | "requested" | "accepted" | "completed" | "cancelled";

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedRows, setSelectedRows] = useState<Order[]>([]);
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    orderId: number | null;
  }>({ open: false, orderId: null });
  const [cancelReason, setCancelReason] = useState("");
  const [refundPct, setRefundPct] = useState(100);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders").then((r) => r.data),
  });

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "requested") return o.status_code === 1;
    if (filter === "accepted") return o.status_code === 2;
    if (filter === "completed") return o.status_code === 3;
    if (filter === "cancelled") return [4, 5, 6].includes(o.status_code);
    return true;
  });

  const handleCancelOrder = () => {
    const ids = selectedRows.map((r) => r.id);
    if (!ids.length) {
      toast.error("Select at least one order");
      return;
    }
    if (ids.length > 1) {
      toast.error("Cancel one order at a time");
      return;
    }
    const order = selectedRows[0];
    if ([4, 5, 6].includes(order.status_code)) {
      toast.error("Order is already cancelled/rejected/expired");
      return;
    }
    setCancelDialog({ open: true, orderId: order.id });
    setCancelReason("");
    setRefundPct(100);
  };

  const confirmCancel = async () => {
    if (cancelReason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    const orderId = cancelDialog.orderId;
    setCancelDialog({ open: false, orderId: null });

    try {
      await api.post(`/adminapi/orders/${orderId}/cancel`, {
        cancellation_reason: cancelReason,
        refund_percentage: refundPct,
      });
      toast.success("Order cancelled");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("Failed to cancel order. Please try again.");
    }
  };

  const handleExport = () => {
    const exportData = orders.map((o) => ({
      "Order ID": formatOrderId(o.id),
      Customer: `${o.customer.name} (${o.customer.email})`,
      Chef: `${o.chef.name} (${o.chef.email})`,
      "Menu Item": o.menu_title ?? "",
      Qty: o.quantity,
      Total: o.total_price,
      "Order Date": formatTimestamp(o.order_date),
      Status: o.status,
      Created: formatDate(o.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "Taist - Orders.xlsx");
  };

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Requested", value: "requested" },
    { label: "Accepted", value: "accepted" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
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
        </Button>
      ))}
      <div className="mx-2 h-6 w-px bg-gray-200" />
      <Button size="sm" variant="destructive" onClick={handleCancelOrder}>
        Cancel Order
      </Button>
      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Orders</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredOrders}
          searchPlaceholder="Search orders..."
          toolbar={toolbar}
          enableRowSelection
          onRowSelectionChange={setSelectedRows}
          onRowClick={setDrawerOrder}
        />
      )}

      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) =>
          !open && setCancelDialog({ open: false, orderId: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Cancel order{" "}
              {cancelDialog.orderId
                ? formatOrderId(cancelDialog.orderId)
                : ""}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cancel-reason">
                Reason (min 10 characters)
              </Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="refund-pct">Refund Percentage: {refundPct}%</Label>
              <Input
                id="refund-pct"
                type="range"
                min={0}
                max={100}
                value={refundPct}
                onChange={(e) => setRefundPct(Number(e.target.value))}
                className="mt-1"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCancelDialog({ open: false, orderId: null })
              }
            >
              Back
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailDrawer
        order={drawerOrder}
        open={drawerOrder != null}
        onOpenChange={(open) => !open && setDrawerOrder(null)}
      />
    </div>
  );
}
