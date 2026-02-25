import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ---------- Types ----------

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

interface Chat {
  id: number;
  order_id: number;
  from_user: { name: string; email: string };
  to_user: { name: string; email: string };
  message: string;
  is_viewed: boolean;
  created_at: number;
}

interface Transaction {
  id: number;
  order_id: number;
  from_user: { name: string; email: string };
  to_user: { name: string; email: string };
  amount: number;
  notes: string | null;
  created_at: number;
}

// ---------- Helpers ----------

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
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

// ---------- Component ----------

interface OrderDetailDrawerProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderDetailDrawer({
  order,
  open,
  onOpenChange,
}: OrderDetailDrawerProps) {
  // Fetch chats and transactions (small datasets, cached)
  const { data: allChats = [] } = useQuery<Chat[]>({
    queryKey: ["chats"],
    queryFn: () => api.get("/chats").then((r) => r.data),
    enabled: open,
  });

  const { data: allTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: () => api.get("/transactions").then((r) => r.data),
    enabled: open,
  });

  if (!order) return null;

  // Filter by this order
  const orderChats = allChats.filter((c) => c.order_id === order.id);
  const orderTransactions = allTransactions.filter((t) => t.order_id === order.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{formatOrderId(order.id)}</SheetTitle>
          <SheetDescription>Order details</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Order Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <Badge variant="outline" className={statusColors[order.status] ?? ""}>
                {order.status}
              </Badge>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Order Date:</span>{" "}
              {formatTimestamp(order.order_date)}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Total:</span>{" "}
              {formatCurrency(order.total_price)}
            </div>
            {order.menu_title && (
              <div className="text-sm">
                <span className="text-gray-500">Menu Item:</span>{" "}
                {order.menu_title} x{order.quantity}
              </div>
            )}
            {order.notes && (
              <div className="text-sm">
                <span className="text-gray-500">Notes:</span> {order.notes}
              </div>
            )}
          </div>

          {/* Customer & Chef */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Customer
              </h3>
              <div className="text-sm">{order.customer.name}</div>
              <div className="text-xs text-gray-500">{order.customer.email}</div>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Chef
              </h3>
              <div className="text-sm">{order.chef.name}</div>
              <div className="text-xs text-gray-500">{order.chef.email}</div>
            </div>
          </div>

          {/* Chat */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Chat
            </h3>
            {orderChats.length === 0 ? (
              <p className="text-sm text-gray-400">No messages.</p>
            ) : (
              <div className="space-y-2">
                {orderChats.map((chat) => (
                  <div key={chat.id} className="rounded-md bg-gray-50 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{chat.from_user.name}</span>
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(chat.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-gray-700">{chat.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Review
            </h3>
            {!order.review ? (
              <p className="text-sm text-gray-400">No review yet.</p>
            ) : (
              <div className="rounded-md bg-gray-50 p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{order.review.rating}/5</span>
                  {order.review.tip_amount > 0 && (
                    <span className="text-gray-500">
                      Tip: {formatCurrency(order.review.tip_amount)}
                    </span>
                  )}
                </div>
                {order.review.text && (
                  <p className="mt-1 text-gray-700">{order.review.text}</p>
                )}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Transactions
            </h3>
            {orderTransactions.length === 0 ? (
              <p className="text-sm text-gray-400">No transactions recorded.</p>
            ) : (
              <div className="space-y-2">
                {orderTransactions.map((tx) => (
                  <div key={tx.id} className="rounded-md bg-gray-50 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>
                        {tx.from_user.name} → {tx.to_user.name}
                      </span>
                      <span className="font-medium">{formatCurrency(tx.amount)}</span>
                    </div>
                    {tx.notes && (
                      <p className="mt-0.5 text-gray-500">{tx.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancellation */}
          {order.cancelled_by && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Cancellation
              </h3>
              <div className="rounded-md bg-red-50 p-2 text-sm">
                <div>
                  Cancelled by{" "}
                  <span className="font-medium">
                    {order.cancelled_by.role
                      ? `${order.cancelled_by.role.charAt(0).toUpperCase()}${order.cancelled_by.role.slice(1)}`
                      : "Unknown"}{" "}
                    — {order.cancelled_by.name}
                  </span>
                </div>
                {order.cancellation_type && (
                  <div className="mt-1 text-gray-600">
                    Type: <span className="capitalize">{order.cancellation_type}</span>
                  </div>
                )}
                {order.cancellation_reason && (
                  <div className="mt-1 text-gray-600">
                    Reason: {order.cancellation_reason}
                  </div>
                )}
                {order.is_auto_closed && (
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-gray-500/15 text-gray-700 border-gray-500/20">
                      Auto-closed
                    </Badge>
                  </div>
                )}
                {order.refund_amount != null && (
                  <div className="mt-1">
                    Refund: {formatCurrency(order.refund_amount)} (
                    {order.refund_percentage}%)
                    {order.refund_stripe_id && (
                      <span className="ml-1 text-xs text-gray-400">
                        {order.refund_stripe_id}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
