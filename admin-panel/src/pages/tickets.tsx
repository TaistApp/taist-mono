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

interface IssueContext {
  issue_type?: string;
  origin_screen?: string;
  current_screen?: string;
  entry_point?: string;
  platform?: string;
  device_model?: string;
  device_os?: string;
  app_version?: string;
  app_build?: string;
  app_env?: string;
  client_timestamp?: string;
  screenshot_url?: string;
  [key: string]: string | undefined;
}

interface Contact {
  id: number;
  user_id: number;
  email: string;
  subject: string;
  message: string;
  issue_context: IssueContext | null;
  status: string;
  status_code: number;
  created_at: number;
}

const statusColors: Record<string, string> = {
  "In Review": "bg-yellow-100 text-yellow-800",
  Resolved: "bg-green-100 text-green-800",
};

function formatTicketId(id: number) {
  return `T${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

function formatIssueType(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const contextLabels: Record<string, string> = {
  issue_type: "Issue Type",
  origin_screen: "Opened From",
  current_screen: "Submitted On",
  entry_point: "Entry Point",
  platform: "Platform",
  device_model: "Device",
  device_os: "OS",
  app_version: "App Version",
  app_build: "Build",
  app_env: "Environment",
  client_timestamp: "Client Time",
  screenshot_url: "Screenshot",
};

const contextKeyOrder = [
  "issue_type",
  "origin_screen",
  "current_screen",
  "entry_point",
  "platform",
  "device_model",
  "device_os",
  "app_version",
  "app_build",
  "app_env",
  "client_timestamp",
  "screenshot_url",
];

const columns: ColumnDef<Contact>[] = [
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
      <DataTableColumnHeader column={column} title="Ticket ID" />
    ),
    cell: ({ row }) => formatTicketId(row.original.id),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subject" />
    ),
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => {
      const msg = row.original.message;
      return (
        <span className="text-xs" title={msg}>
          {msg.length > 60 ? msg.slice(0, 60) + "..." : msg}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    id: "context",
    header: "Issue Context",
    cell: ({ row }) => {
      const ctx = row.original.issue_context;
      if (!ctx) return <span className="text-gray-400">—</span>;
      return (
        <div className="space-y-0.5 text-xs">
          {contextKeyOrder.map((key) => {
            const value = ctx[key];
            if (!value) return null;
            const label = contextLabels[key] || key;
            let display: React.ReactNode = value;
            if (key === "issue_type") display = formatIssueType(value);
            if (key === "screenshot_url")
              display = (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View
                </a>
              );
            return (
              <div key={key}>
                <span className="text-gray-500">{label}:</span> {display}
              </div>
            );
          })}
        </div>
      );
    },
    enableSorting: false,
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
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.created_at),
  },
];

type FilterStatus = "all" | "in_review" | "resolved";

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    ids: number[];
  }>({ open: false, action: "", ids: [] });
  const [selectedRows, setSelectedRows] = useState<Contact[]>([]);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => api.get("/contacts").then((r) => r.data),
  });

  const filteredContacts = contacts.filter((c) => {
    if (filter === "all") return true;
    if (filter === "in_review") return c.status_code === 1;
    if (filter === "resolved") return c.status_code === 2;
    return true;
  });

  const getSelectedIds = () => selectedRows.map((r) => r.id);

  const handleAction = (action: string) => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Select at least one ticket");
      return;
    }
    setConfirmDialog({ open: true, action, ids });
  };

  const confirmAction = async () => {
    const { action, ids } = confirmDialog;
    setConfirmDialog({ open: false, action: "", ids: [] });

    try {
      const statusMap: Record<string, number> = {
        "In Review": 1,
        Resolved: 2,
      };
      await api.get("/adminapi/change_ticket_status", {
        params: { ids: ids.join(","), status: statusMap[action] },
      });
      toast.success(`Ticket status changed to ${action}`);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const inReviewCount = contacts.filter((c) => c.status_code === 1).length;

  const filterButtons: {
    label: string;
    value: FilterStatus;
    count?: number;
  }[] = [
    { label: "In Review", value: "in_review", count: inReviewCount },
    { label: "Resolved", value: "resolved" },
    { label: "All", value: "all" },
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
          {fb.count != null && fb.count > 0 && (
            <Badge variant="secondary" className="ml-1.5">
              {fb.count}
            </Badge>
          )}
        </Button>
      ))}
      <div className="mx-2 h-6 w-px bg-gray-200" />
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("In Review")}
      >
        In Review
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("Resolved")}
      >
        Resolved
      </Button>
    </div>
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Tickets</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredContacts}
          searchPlaceholder="Search tickets..."
          toolbar={toolbar}
          enableRowSelection
          onRowSelectionChange={setSelectedRows}
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
              Change status to &quot;{confirmDialog.action}&quot; for{" "}
              {confirmDialog.ids.length} selected ticket(s)?
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
            <Button onClick={confirmAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
