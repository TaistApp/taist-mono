import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DiscountCode {
  id: number;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  is_active: boolean;
  created_at: string;
}

interface UsageRecord {
  id: number;
  customer_user_id: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  order_id: number;
  order_status: number;
  used_at: string;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return d.slice(0, 10);
}

// ─── Create / Edit form state ───────────────────────────────────
interface FormState {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  max_uses: string;
  max_uses_per_customer: string;
  valid_from: string;
  valid_until: string;
  minimum_order_amount: string;
  maximum_discount_amount: string;
}

const emptyForm: FormState = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  max_uses: "",
  max_uses_per_customer: "",
  valid_from: "",
  valid_until: "",
  minimum_order_amount: "",
  maximum_discount_amount: "",
};

function formFromCode(dc: DiscountCode): FormState {
  return {
    code: dc.code,
    description: dc.description ?? "",
    discount_type: dc.discount_type,
    discount_value: String(dc.discount_value),
    max_uses: dc.max_uses != null ? String(dc.max_uses) : "",
    max_uses_per_customer:
      dc.max_uses_per_customer != null
        ? String(dc.max_uses_per_customer)
        : "",
    valid_from: dc.valid_from ?? "",
    valid_until: dc.valid_until ?? "",
    minimum_order_amount:
      dc.minimum_order_amount != null
        ? String(dc.minimum_order_amount)
        : "",
    maximum_discount_amount:
      dc.maximum_discount_amount != null
        ? String(dc.maximum_discount_amount)
        : "",
  };
}

// ─── Page ───────────────────────────────────────────────────────
export default function DiscountCodesPage() {
  const queryClient = useQueryClient();

  const { data: codes = [], isLoading } = useQuery<DiscountCode[]>({
    queryKey: ["discount-codes"],
    queryFn: () => api.get("/discount-codes").then((r) => r.data),
  });

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [usageId, setUsageId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: usageData = [] } = useQuery<UsageRecord[]>({
    queryKey: ["discount-codes", usageId, "usage"],
    queryFn: () =>
      api
        .get(`/discount-codes/${usageId}/usage`)
        .then((r) => r.data?.data?.usages ?? []),
    enabled: usageId != null,
  });

  const setField = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  // ─── handlers ──────────────────────────────────
  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post("/discount-codes", {
        code: form.code,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: numOrNull(form.max_uses),
        max_uses_per_customer: numOrNull(form.max_uses_per_customer),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        minimum_order_amount: numOrNull(form.minimum_order_amount),
        maximum_discount_amount: numOrNull(form.maximum_discount_amount),
      });
      toast.success("Discount code created");
      queryClient.invalidateQueries({ queryKey: ["discount-codes"] });
      setCreateOpen(false);
      setForm(emptyForm);
    } catch {
      toast.error("Failed to create discount code");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.put(`/discount-codes/${editId}`, {
        description: form.description || null,
        max_uses: numOrNull(form.max_uses),
        max_uses_per_customer: numOrNull(form.max_uses_per_customer),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        minimum_order_amount: numOrNull(form.minimum_order_amount),
        maximum_discount_amount: numOrNull(form.maximum_discount_amount),
      });
      toast.success("Discount code updated");
      queryClient.invalidateQueries({ queryKey: ["discount-codes"] });
      setEditOpen(false);
    } catch {
      toast.error("Failed to update discount code");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (dc: DiscountCode) => {
    const action = dc.is_active ? "deactivate" : "activate";
    try {
      await api.post(`/discount-codes/${dc.id}/${action}`);
      toast.success(`Code ${dc.is_active ? "deactivated" : "activated"}`);
      queryClient.invalidateQueries({ queryKey: ["discount-codes"] });
    } catch {
      toast.error(`Failed to ${action}`);
    }
  };

  // ─── columns ──────────────────────────────────
  const columns: ColumnDef<DiscountCode>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "discount_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.discount_type === "percentage" ? "%" : "$"}
        </Badge>
      ),
    },
    {
      accessorKey: "discount_value",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Value" />
      ),
      cell: ({ row }) =>
        row.original.discount_type === "percentage"
          ? `${row.original.discount_value}%`
          : `$${row.original.discount_value.toFixed(2)}`,
      sortingFn: "basic",
    },
    {
      accessorKey: "current_uses",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Uses" />
      ),
      cell: ({ row }) => {
        const dc = row.original;
        const uses = dc.current_uses ?? 0;
        return dc.max_uses
          ? `${uses} / ${dc.max_uses}`
          : String(uses);
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "valid_until",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valid Until" />
      ),
      cell: ({ row }) => formatDate(row.original.valid_until),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Actions",
      cell: function ActionsCell({ row }) {
        const dc = row.original;
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setForm(formFromCode(dc));
                setEditId(dc.id);
                setEditOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant={dc.is_active ? "destructive" : "default"}
              onClick={() => toggleActive(dc)}
            >
              {dc.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setUsageId(dc.id);
                setUsageOpen(true);
              }}
            >
              Usage
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  // ─── form fields (shared between create & edit) ─────
  const formFields = (isEdit: boolean) => (
    <div className="grid gap-3">
      {!isEdit && (
        <div>
          <Label>Code</Label>
          <Input
            value={form.code}
            onChange={(e) => setField("code", e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            className="mt-1 font-mono"
          />
        </div>
      )}
      <div>
        <Label>Description</Label>
        <Textarea
          rows={2}
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          className="mt-1"
        />
      </div>
      {!isEdit && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select
              value={form.discount_type}
              onValueChange={(v) =>
                setField("discount_type", v as "percentage" | "fixed")
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input
              type="number"
              value={form.discount_value}
              onChange={(e) => setField("discount_value", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Max Uses (total)</Label>
          <Input
            type="number"
            value={form.max_uses}
            onChange={(e) => setField("max_uses", e.target.value)}
            placeholder="Unlimited"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Max Uses / Customer</Label>
          <Input
            type="number"
            value={form.max_uses_per_customer}
            onChange={(e) => setField("max_uses_per_customer", e.target.value)}
            placeholder="Unlimited"
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Valid From</Label>
          <Input
            type="date"
            value={form.valid_from}
            onChange={(e) => setField("valid_from", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Valid Until</Label>
          <Input
            type="date"
            value={form.valid_until}
            onChange={(e) => setField("valid_until", e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Min Order Amount ($)</Label>
          <Input
            type="number"
            value={form.minimum_order_amount}
            onChange={(e) => setField("minimum_order_amount", e.target.value)}
            placeholder="None"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Max Discount Amount ($)</Label>
          <Input
            type="number"
            value={form.maximum_discount_amount}
            onChange={(e) =>
              setField("maximum_discount_amount", e.target.value)
            }
            placeholder="None"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discount Codes</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setCreateOpen(true);
          }}
        >
          Create Code
        </Button>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={codes}
          searchPlaceholder="Search discount codes..."
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Discount Code</DialogTitle>
          </DialogHeader>
          {formFields(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Discount Code</DialogTitle>
          </DialogHeader>
          {formFields(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Usage History</DialogTitle>
          </DialogHeader>
          {usageData.length === 0 ? (
            <p className="text-sm text-gray-500">No usage records.</p>
          ) : (
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-1">Customer</th>
                    <th className="pb-1">Order</th>
                    <th className="pb-1">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-1">
                        {u.customer_first_name} {u.customer_last_name}
                        <br />
                        <span className="text-gray-500">{u.customer_email}</span>
                      </td>
                      <td className="py-1">
                        ORDER{String(u.order_id).padStart(7, "0")}
                      </td>
                      <td className="py-1">{formatDate(u.used_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
