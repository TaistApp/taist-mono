import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
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
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import ChefDetailDrawer from "@/components/chef-detail-drawer";

// ---------- Types ----------

interface Chef {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  verified: number;
  is_pending: number;
  phone: string;
  birthday: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: string;
  longitude: string;
  photo: string;
  created_at: number;
  weekly_availability: string[];
  live_overrides: {
    date: string;
    start: string;
    end: string;
    status: string;
  }[];
  live_menus: string[];
}

interface Pending {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  birthday: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  bio: string;
  photo: string;
  created_at: number;
  availability: Record<string, string | null>;
  min_order_amount: number | null;
  max_order_distance: number | null;
}

// Unified row for all tabs
export interface ChefRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  verified: number;
  phone: string;
  birthday: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: string;
  longitude?: string;
  photo: string;
  created_at: number;
  weekly_availability?: string[];
  live_overrides?: {
    date: string;
    start: string;
    end: string;
    status: string;
  }[];
  live_menus?: string[];
  bio?: string;
  availability?: Record<string, string | null>;
  min_order_amount?: number | null;
  max_order_distance?: number | null;
}

// ---------- Helpers ----------

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  Pending: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  Rejected: "bg-red-500/15 text-red-700 border-red-500/20",
  Banned: "bg-gray-500/15 text-gray-700 border-gray-500/20",
};

function formatChefId(id: number) {
  return `CHEF${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

// ---------- Column definitions ----------

const baseColumns: ColumnDef<ChefRow>[] = [
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
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="First Name" />
    ),
  },
  {
    accessorKey: "last_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Name" />
    ),
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
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
  },
  {
    accessorKey: "birthday",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Birthday" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.birthday),
  },
  {
    accessorKey: "address",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Address" />
    ),
  },
  {
    accessorKey: "city",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="City" />
    ),
  },
  {
    accessorKey: "state",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="State" />
    ),
  },
  {
    accessorKey: "zip",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Zip" />
    ),
  },
  {
    accessorKey: "photo",
    header: "Photo",
    cell: ({ row }) => {
      const photo = row.original.photo;
      if (!photo) return null;
      return (
        <img
          src={`/assets/uploads/images/${photo}`}
          alt=""
          className="h-10 w-10 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    },
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

const chefExtraColumns: ColumnDef<ChefRow>[] = [
  {
    id: "weekly_availability",
    header: "Weekly Availability",
    cell: ({ row }) => {
      const avail = row.original.weekly_availability;
      if (!avail?.length) return <span className="text-gray-400">Not set</span>;
      return (
        <div className="whitespace-nowrap text-xs">
          {avail.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "live_overrides",
    header: "Live Overrides",
    cell: ({ row }) => {
      const overrides = row.original.live_overrides;
      if (!overrides?.length)
        return <span className="text-gray-400">None</span>;
      return (
        <div className="whitespace-nowrap text-xs">
          {overrides.map((o, i) => (
            <div
              key={i}
              className={
                o.status === "cancelled"
                  ? "text-red-600"
                  : o.status === "confirmed"
                    ? "text-green-600"
                    : "text-yellow-600"
              }
            >
              {o.date}: {o.start}-{o.end}
            </div>
          ))}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "live_menus",
    header: "Live Menus",
    cell: ({ row }) => {
      const menus = row.original.live_menus;
      if (!menus?.length) return <span className="text-gray-400">None</span>;
      return <span className="text-xs">{menus.join(", ")}</span>;
    },
    enableSorting: false,
  },
];

const pendingExtraColumns: ColumnDef<ChefRow>[] = [
  {
    id: "bio",
    header: "Bio",
    cell: ({ row }) => {
      const bio = row.original.bio;
      if (!bio) return <span className="text-gray-400">None</span>;
      return (
        <span className="text-xs" title={bio}>
          {bio.length > 60 ? bio.slice(0, 60) + "…" : bio}
        </span>
      );
    },
    enableSorting: false,
  },
  ...["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (day): ColumnDef<ChefRow> => ({
      id: `avail_${day}`,
      header: day,
      cell: ({ row }) => {
        const time = row.original.availability?.[day];
        return time ? (
          <span className="whitespace-nowrap text-xs">{time}</span>
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
      enableSorting: false,
    })
  ),
  {
    id: "min_order_amount",
    header: "Min Order",
    cell: ({ row }) => {
      const v = row.original.min_order_amount;
      return v != null ? `$${v}` : <span className="text-gray-400">—</span>;
    },
  },
  {
    id: "max_order_distance",
    header: "Max Dist",
    cell: ({ row }) => {
      const v = row.original.max_order_distance;
      return v != null ? `${v} mi` : <span className="text-gray-400">—</span>;
    },
  },
];

// ---------- Tab types ----------

type TabFilter = "all" | "pending" | "active" | "rejected";

// ---------- Page component ----------

export default function ChefsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    ids: number[];
  }>({ open: false, action: "", ids: [] });
  const [selectedRows, setSelectedRows] = useState<ChefRow[]>([]);
  const [drawerChef, setDrawerChef] = useState<ChefRow | null>(null);

  const { data: chefs = [], isLoading: loadingChefs } = useQuery<Chef[]>({
    queryKey: ["chefs"],
    queryFn: () => api.get("/chefs").then((r) => r.data),
  });

  const { data: pendings = [], isLoading: loadingPendings } = useQuery<Pending[]>({
    queryKey: ["pendings"],
    queryFn: () => api.get("/pendings").then((r) => r.data),
  });

  const isLoading = loadingChefs || loadingPendings;

  // Convert chefs to ChefRow
  const chefRows: ChefRow[] = chefs.map((c) => ({
    ...c,
  }));

  // Convert pendings to ChefRow
  const pendingRows: ChefRow[] = pendings.map((p) => ({
    id: p.id,
    email: p.email,
    first_name: p.first_name,
    last_name: p.last_name,
    status: "Pending",
    verified: 0,
    phone: p.phone,
    birthday: p.birthday,
    address: p.address,
    city: p.city,
    state: p.state,
    zip: p.zip,
    photo: p.photo,
    created_at: p.created_at,
    bio: p.bio,
    availability: p.availability,
    min_order_amount: p.min_order_amount,
    max_order_distance: p.max_order_distance,
  }));

  // Filter rows by tab
  const filteredRows: ChefRow[] = (() => {
    switch (tab) {
      case "pending":
        return pendingRows;
      case "active":
        return chefRows.filter((c) => c.verified === 1);
      case "rejected":
        return chefRows.filter((c) => c.verified === 2);
      case "all":
      default:
        return chefRows;
    }
  })();

  // Build columns based on active tab
  const columns: ColumnDef<ChefRow>[] =
    tab === "pending"
      ? [...baseColumns, ...pendingExtraColumns]
      : [...baseColumns, ...chefExtraColumns];

  const pendingCount = pendings.length;
  const activeCount = chefs.filter((c) => c.verified === 1).length;

  // ---------- Actions ----------

  const getSelectedIds = () => selectedRows.map((r) => r.id);

  const handleStatusChange = (status: number) => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Select at least one chef");
      return;
    }
    const labels: Record<number, string> = {
      1: "Active",
      2: "Rejected",
    };
    setConfirmDialog({ open: true, action: labels[status], ids });
  };

  const handleDeleteStripe = () => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Select at least one chef");
      return;
    }
    setConfirmDialog({ open: true, action: "delete_stripe", ids });
  };

  const handleDelete = () => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Select at least one chef");
      return;
    }
    setConfirmDialog({ open: true, action: "delete", ids });
  };

  const confirmAction = async () => {
    const { action, ids } = confirmDialog;
    setConfirmDialog({ open: false, action: "", ids: [] });

    try {
      const statusMap: Record<string, number> = {
        Active: 1,
        Rejected: 2,
      };

      if (action === "delete_stripe") {
        await api.post("/adminapi/delete_stripe_accounts", {
          ids: ids.join(","),
        });
        toast.success("Stripe accounts deleted");
      } else if (action === "delete") {
        await api.get("/adminapi/change_chef_status", {
          params: { ids: ids.join(","), status: 4 },
        });
        toast.success(`${ids.length} chef(s) permanently deleted`);
      } else {
        await api.get("/adminapi/change_chef_status", {
          params: { ids: ids.join(","), status: statusMap[action] },
        });
        toast.success(`Status changed to ${action}`);
      }
      queryClient.invalidateQueries({ queryKey: ["chefs"] });
      queryClient.invalidateQueries({ queryKey: ["pendings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const handleExport = () => {
    const exportData = filteredRows.map((c) => ({
      Email: c.email,
      "First Name": c.first_name,
      "Last Name": c.last_name,
      Phone: c.phone,
      Birthday: formatTimestamp(c.birthday),
      Address: c.address,
      City: c.city,
      State: c.state,
      Zip: c.zip,
      Status: c.status,
      "Created At": formatTimestamp(c.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chefs");
    XLSX.writeFile(wb, "Taist - Chefs.xlsx");
  };

  // ---------- Tab buttons ----------

  const tabs: { label: string; value: TabFilter; count?: number }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending", count: pendingCount },
    { label: "Active", value: "active", count: activeCount },
    { label: "Rejected", value: "rejected" },
  ];

  // Context-aware action buttons
  const actionButtons = (() => {
    switch (tab) {
      case "pending":
        return (
          <>
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(1)}>
              Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(2)}>
              Reject
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </>
        );
      case "active":
        return (
          <>
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(2)}>
              Rejected
            </Button>
            <Button size="sm" variant="outline" onClick={handleDeleteStripe}>
              Delete Stripe
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </>
        );
      case "rejected":
        return (
          <>
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(1)}>
              Activate
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </>
        );
      default:
        return (
          <>
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(1)}>
              Active
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleStatusChange(2)}>
              Rejected
            </Button>
            <Button size="sm" variant="outline" onClick={handleDeleteStripe}>
              Delete Stripe
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </>
        );
    }
  })();

  const toolbar = (
    <div className="flex items-center gap-2">
      {tabs.map((t) => (
        <Button
          key={t.value}
          size="sm"
          variant={tab === t.value ? "default" : "outline"}
          onClick={() => {
            setTab(t.value);
            setSelectedRows([]);
          }}
        >
          {t.label}
          {t.count != null && t.count > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {t.count}
            </Badge>
          )}
        </Button>
      ))}
      <div className="mx-2 h-6 w-px bg-gray-200" />
      {actionButtons}
      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );

  // ---------- Render ----------

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Chefs</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRows}
          searchPlaceholder="Search chefs..."
          toolbar={toolbar}
          enableRowSelection
          onRowSelectionChange={setSelectedRows}
          onRowClick={setDrawerChef}
        />
      )}

      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, action: "", ids: [] })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "delete"
                ? `Permanently delete ${confirmDialog.ids.length} selected chef(s)? This cannot be undone.`
                : confirmDialog.action === "delete_stripe"
                  ? `Delete Stripe accounts for ${confirmDialog.ids.length} selected chef(s)?`
                  : `Change status to "${confirmDialog.action}" for ${confirmDialog.ids.length} selected chef(s)?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, action: "", ids: [] })
              }
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action === "delete" ? "destructive" : "default"}
              onClick={confirmAction}
            >
              {confirmDialog.action === "delete" ? "Delete Permanently" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChefDetailDrawer
        chef={drawerChef}
        open={drawerChef != null}
        onOpenChange={(open) => !open && setDrawerChef(null)}
      />
    </div>
  );
}
