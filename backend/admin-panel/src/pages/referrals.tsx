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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────

interface ReferralSettings {
  id: number;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  max_referrals_per_customer: number;
  credit_expiration_days: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  is_active: boolean;
}

interface ReferralRow {
  id: number;
  referrer_user_id: number;
  referral_code: string;
  referral_type: "general" | "chef";
  chef_user_id: number | null;
  referred_phone: string;
  referred_user_id: number | null;
  status: "pending" | "signed_up" | "completed" | "expired";
  referrer_first_name: string;
  referrer_last_name: string;
  referrer_email: string;
  referred_first_name: string | null;
  referred_last_name: string | null;
  referred_email: string | null;
  chef_first_name: string | null;
  chef_last_name: string | null;
  referrer_credit_code: string | null;
  referrer_credit_used: number | null;
  referred_credit_code: string | null;
  referred_credit_used: number | null;
  sms_sent_at: string | null;
  signed_up_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ReferralStats {
  total: number;
  pending: number;
  signed_up: number;
  completed: number;
  expired: number;
  credits_issued: number;
}

// ─── Helpers ───────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  signed_up: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-600",
};

// ─── Page ──────────────────────────────────────────────────────

export default function ReferralsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"referrals" | "settings">("referrals");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // ─── Settings ────────────────────────────────────
  const { data: settings } = useQuery<ReferralSettings>({
    queryKey: ["referral-settings"],
    queryFn: () => api.get("/referral-settings").then((r) => r.data),
  });

  const [settingsForm, setSettingsForm] = useState<Partial<ReferralSettings>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  const currentSettings = { ...settings, ...settingsForm } as ReferralSettings;

  const setSettingsField = <K extends keyof ReferralSettings>(k: K, v: ReferralSettings[K]) =>
    setSettingsForm((f) => ({ ...f, [k]: v }));

  const handleSaveSettings = async () => {
    if (Object.keys(settingsForm).length === 0) return;
    setSettingsSaving(true);
    try {
      await api.put("/referral-settings", settingsForm);
      toast.success("Referral settings updated");
      queryClient.invalidateQueries({ queryKey: ["referral-settings"] });
      setSettingsForm({});
    } catch {
      toast.error("Failed to update settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  // ─── Referrals list ──────────────────────────────
  const { data: referrals = [], isLoading: referralsLoading } = useQuery<ReferralRow[]>({
    queryKey: ["referrals", statusFilter, typeFilter],
    queryFn: () =>
      api
        .get("/referrals", { params: { status: statusFilter, type: typeFilter } })
        .then((r) => r.data),
  });

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["referral-stats"],
    queryFn: () => api.get("/referrals/stats").then((r) => r.data),
  });

  // ─── Columns ─────────────────────────────────────
  const columns: ColumnDef<ReferralRow>[] = [
    {
      accessorKey: "referrer_first_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Referrer" />,
      cell: ({ row }) =>
        `${row.original.referrer_first_name} ${row.original.referrer_last_name}`,
    },
    {
      accessorKey: "referred_phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Referred Phone" />,
    },
    {
      accessorKey: "referred_first_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Referred User" />,
      cell: ({ row }) =>
        row.original.referred_first_name
          ? `${row.original.referred_first_name} ${row.original.referred_last_name}`
          : "—",
    },
    {
      accessorKey: "referral_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.referral_type}
        </Badge>
      ),
    },
    {
      accessorKey: "chef_first_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Chef" />,
      cell: ({ row }) =>
        row.original.chef_first_name
          ? `${row.original.chef_first_name} ${row.original.chef_last_name}`
          : "—",
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[row.original.status] || ""}`}
        >
          {row.original.status.replace("_", " ")}
        </span>
      ),
    },
    {
      accessorKey: "referrer_credit_code",
      header: "Referrer Credit",
      cell: ({ row }) =>
        row.original.referrer_credit_code ? (
          <span className="font-mono text-xs">
            {row.original.referrer_credit_code}
            {row.original.referrer_credit_used ? " (used)" : ""}
          </span>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "referred_credit_code",
      header: "Referred Credit",
      cell: ({ row }) =>
        row.original.referred_credit_code ? (
          <span className="font-mono text-xs">
            {row.original.referred_credit_code}
            {row.original.referred_credit_used ? " (used)" : ""}
          </span>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sent" />,
      cell: ({ row }) => formatDate(row.original.sms_sent_at || row.original.created_at),
    },
  ];

  // ─── Render ──────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted-foreground">
          Manage the customer referral program and view all referrals.
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            ["Total", stats.total],
            ["Pending", stats.pending],
            ["Signed Up", stats.signed_up],
            ["Completed", stats.completed],
            ["Expired", stats.expired],
            ["Credits Issued", stats.credits_issued],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-white p-3 text-center">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab buttons */}
      <div className="flex gap-2 border-b pb-1">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTab === "referrals"
              ? "bg-white border border-b-white -mb-px text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("referrals")}
        >
          All Referrals
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTab === "settings"
              ? "bg-white border border-b-white -mb-px text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      {/* ─── Settings Tab ─── */}
      {activeTab === "settings" && settings && (
        <div className="rounded-lg border bg-white p-6 space-y-6 max-w-xl">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Program Status</Label>
            <Select
              value={currentSettings.is_active ? "active" : "inactive"}
              onValueChange={(v) => setSettingsField("is_active", v === "active")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={currentSettings.discount_type}
                onValueChange={(v) =>
                  setSettingsField("discount_type", v as "fixed" | "percentage")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Discount Value{" "}
                {currentSettings.discount_type === "percentage" ? "(%)" : "($)"}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={currentSettings.discount_value ?? ""}
                onChange={(e) =>
                  setSettingsField("discount_value", Number(e.target.value))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Max Referrals per Customer</Label>
              <Input
                type="number"
                min="1"
                value={currentSettings.max_referrals_per_customer ?? ""}
                onChange={(e) =>
                  setSettingsField(
                    "max_referrals_per_customer",
                    Number(e.target.value)
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Credit Expiration (days)</Label>
              <Input
                type="number"
                min="1"
                value={currentSettings.credit_expiration_days ?? ""}
                onChange={(e) =>
                  setSettingsField(
                    "credit_expiration_days",
                    Number(e.target.value)
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum Order Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="No minimum"
                value={currentSettings.minimum_order_amount ?? ""}
                onChange={(e) =>
                  setSettingsField(
                    "minimum_order_amount",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Max Discount Cap ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="No cap"
                value={currentSettings.maximum_discount_amount ?? ""}
                onChange={(e) =>
                  setSettingsField(
                    "maximum_discount_amount",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={settingsSaving || Object.keys(settingsForm).length === 0}
          >
            {settingsSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}

      {/* ─── Referrals Tab ─── */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="signed_up">Signed Up</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="chef">Chef</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {referralsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
            </div>
          ) : (
            <DataTable
              viewKey="referrals"
              columns={columns}
              data={referrals}
              searchPlaceholder="Search by referrer name..."
            />
          )}
        </div>
      )}
    </div>
  );
}
