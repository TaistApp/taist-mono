import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface WaitlistEntry {
  id: number;
  email: string;
  first_name: string;
  zip: string;
  user_type: number;
  type_label: string;
  source: string;
  household: string | null;
  referral: string | null;
  converted: boolean;
  converted_user_id: number | null;
  created_at: number | null;
}

const typeColors: Record<string, string> = {
  Customer: "bg-blue-100 text-blue-800",
  Chef: "bg-orange-100 text-orange-800",
};

const sourceColors: Record<string, string> = {
  "website-waitlist": "bg-purple-100 text-purple-800",
  "meta-lead-ad": "bg-indigo-100 text-indigo-800",
};

const referralLabels: Record<string, string> = {
  friend: "Friend",
  social: "Social Media",
  google: "Google",
  event: "Event",
  other: "Other",
};

function formatTimestamp(ts: number | null) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const columns: ColumnDef<WaitlistEntry>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
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
    accessorKey: "zip",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Zip" />
    ),
  },
  {
    accessorKey: "type_label",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const label = row.original.type_label;
      return (
        <Badge variant="outline" className={typeColors[label] ?? ""}>
          {label}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "source",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Source" />
    ),
    cell: ({ row }) => {
      const source = row.original.source;
      return (
        <Badge variant="outline" className={sourceColors[source] ?? ""}>
          {source}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "household",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Household" />
    ),
    cell: ({ row }) => {
      const h = row.original.household;
      if (!h) return <span className="text-muted-foreground">&mdash;</span>;
      return h;
    },
  },
  {
    accessorKey: "referral",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Referral" />
    ),
    cell: ({ row }) => {
      const r = row.original.referral;
      if (!r) return <span className="text-muted-foreground">&mdash;</span>;
      return (
        <Badge variant="outline">
          {referralLabels[r] ?? r}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "converted",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Converted" />
    ),
    cell: ({ row }) => {
      const converted = row.original.converted;
      return (
        <Badge
          variant="outline"
          className={
            converted
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }
        >
          {converted ? "Yes" : "No"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Signed Up" />
    ),
    cell: ({ row }) => formatTimestamp(row.original.created_at),
  },
];

export default function WaitlistPage() {
  const { data: entries = [], isLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ["waitlist"],
    queryFn: () => api.get("/waitlist").then((r) => r.data),
  });

  const handleExport = () => {
    const exportData = entries.map((w) => ({
      Email: w.email,
      "First Name": w.first_name,
      Zip: w.zip,
      Type: w.type_label,
      Source: w.source,
      Household: w.household ?? "",
      Referral: w.referral ? (referralLabels[w.referral] ?? w.referral) : "",
      Converted: w.converted ? "Yes" : "No",
      "Signed Up": formatTimestamp(w.created_at),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Waitlist");
    XLSX.writeFile(wb, "Taist - Waitlist.xlsx");
  };

  const customerCount = entries.filter((e) => e.user_type === 1).length;
  const chefCount = entries.filter((e) => e.user_type === 2).length;
  const convertedCount = entries.filter((e) => e.converted).length;

  const toolbar = (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Waitlist</h1>

      <div className="mb-4 flex gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{entries.length}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{customerCount}</div>
          <div className="text-sm text-muted-foreground">Customers</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{chefCount}</div>
          <div className="text-sm text-muted-foreground">Chefs</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{convertedCount}</div>
          <div className="text-sm text-muted-foreground">Converted</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={entries}
          searchPlaceholder="Search waitlist..."
          toolbar={toolbar}
          facetedFilters={[
            { columnId: "type_label", title: "Type" },
            { columnId: "source", title: "Source" },
            { columnId: "referral", title: "Referral" },
          ]}
        />
      )}
    </div>
  );
}
