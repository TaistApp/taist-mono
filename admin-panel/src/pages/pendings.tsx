import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
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
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

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

function formatChefId(id: number) {
  return `CHEF${String(id).padStart(7, "0")}`;
}

function formatTimestamp(ts: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

const columns: ColumnDef<Pending>[] = [
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
    accessorKey: "bio",
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
    (day): ColumnDef<Pending> => ({
      id: `avail_${day}`,
      header: day,
      cell: ({ row }) => {
        const time = row.original.availability[day];
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
    accessorKey: "min_order_amount",
    header: "Min Order",
    cell: ({ row }) => {
      const v = row.original.min_order_amount;
      return v != null ? `$${v}` : <span className="text-gray-400">—</span>;
    },
  },
  {
    accessorKey: "max_order_distance",
    header: "Max Dist",
    cell: ({ row }) => {
      const v = row.original.max_order_distance;
      return v != null ? `${v} mi` : <span className="text-gray-400">—</span>;
    },
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

export default function PendingsPage() {
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    ids: number[];
  }>({ open: false, action: "", ids: [] });
  const [selectedRows, setSelectedRows] = useState<Pending[]>([]);

  const { data: pendings = [], isLoading } = useQuery<Pending[]>({
    queryKey: ["pendings"],
    queryFn: () => api.get("/pendings").then((r) => r.data),
  });

  const getSelectedIds = () => selectedRows.map((r) => r.id);

  const handleAction = (action: string) => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Select at least one chef");
      return;
    }
    setConfirmDialog({ open: true, action, ids });
  };

  const confirmAction = async () => {
    const { action, ids } = confirmDialog;
    setConfirmDialog({ open: false, action: "", ids: [] });

    try {
      const statusMap: Record<string, number> = {
        Activate: 1,
        Reject: 2,
      };
      await api.get("/adminapi/change_chef_status", {
        params: { ids: ids.join(","), status: statusMap[action] },
      });
      toast.success(
        action === "Activate" ? "Chef(s) activated" : "Chef(s) rejected"
      );
      queryClient.invalidateQueries({ queryKey: ["pendings"] });
      queryClient.invalidateQueries({ queryKey: ["chefs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const handleExport = () => {
    const exportData = pendings.map((p) => ({
      Email: p.email,
      "First Name": p.first_name,
      "Last Name": p.last_name,
      Phone: p.phone,
      Birthday: formatTimestamp(p.birthday),
      Address: p.address,
      City: p.city,
      State: p.state,
      Zip: p.zip,
      Bio: p.bio,
      "Created At": formatTimestamp(p.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending Chefs");
    XLSX.writeFile(wb, "Taist - Pending Chefs.xlsx");
  };

  const toolbar = (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("Activate")}
      >
        Activate
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("Reject")}
      >
        Reject
      </Button>
      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Pending Chefs</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={pendings}
          searchPlaceholder="Search pending chefs..."
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
              {confirmDialog.action === "Activate"
                ? `Activate ${confirmDialog.ids.length} pending chef(s)? They will be notified.`
                : `Reject ${confirmDialog.ids.length} pending chef(s)?`}
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
