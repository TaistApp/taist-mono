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

interface Customer {
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
  status: string;
  verified: number;
  latitude: string;
  longitude: string;
  created_at: number;
}

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Rejected: "bg-red-100 text-red-800",
  Banned: "bg-gray-100 text-gray-800",
};

function formatCustomerId(id: number) {
  return `C${String(id).padStart(7, "0")}`;
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

const columns: ColumnDef<Customer>[] = [
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
      <DataTableColumnHeader column={column} title="Customer ID" />
    ),
    cell: ({ row }) => formatCustomerId(row.original.id),
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
    accessorKey: "latitude",
    header: "Lat",
  },
  {
    accessorKey: "longitude",
    header: "Lng",
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.created_at),
  },
];

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    ids: number[];
  }>({ open: false, action: "", ids: [] });
  const [selectedRows, setSelectedRows] = useState<Customer[]>([]);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => api.get("/customers").then((r) => r.data),
  });

  const getSelectedIds = () => selectedRows.map((r) => r.id);

  const handleStatusChange = (action: string) => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Select at least one customer");
      return;
    }
    setConfirmDialog({ open: true, action, ids });
  };

  const handleDelete = () => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Select at least one customer");
      return;
    }
    setConfirmDialog({ open: true, action: "delete", ids });
  };

  const confirmAction = async () => {
    const { action, ids } = confirmDialog;
    setConfirmDialog({ open: false, action: "", ids: [] });

    try {
      if (action === "delete") {
        await api.get("/adminapi/change_chef_status", {
          params: { ids: ids.join(","), status: 4 },
        });
        toast.success(`${ids.length} customer(s) permanently deleted`);
      } else {
        const statusMap: Record<string, number> = {
          Active: 1,
          Rejected: 2,
        };
        await api.get("/adminapi/change_chef_status", {
          params: { ids: ids.join(","), status: statusMap[action] },
        });
        toast.success(`Status changed to ${action}`);
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const handleExport = () => {
    const exportData = customers.map((c) => ({
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
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "Taist - Customers.xlsx");
  };

  const toolbar = (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleStatusChange("Active")}
      >
        Active
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleStatusChange("Rejected")}
      >
        Rejected
      </Button>
      <Button size="sm" variant="destructive" onClick={handleDelete}>
        <Trash2 className="mr-1 h-4 w-4" />
        Delete
      </Button>
      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Customers</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          searchPlaceholder="Search customers..."
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
              {confirmDialog.action === "delete"
                ? `Permanently delete ${confirmDialog.ids.length} selected customer(s)? This cannot be undone.`
                : `Change status to "${confirmDialog.action}" for ${confirmDialog.ids.length} selected customer(s)?`}
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
    </div>
  );
}
