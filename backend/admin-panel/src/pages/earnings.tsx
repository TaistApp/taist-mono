import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/api";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface Earning {
  chef_id: number;
  email: string;
  name: string;
  monthly_earning: number;
  monthly_orders: number;
  monthly_items: number;
  yearly_earning: number;
  yearly_orders: number;
  yearly_items: number;
}

function formatChefId(id: number) {
  return `CHEF${String(id).padStart(7, "0")}`;
}

function formatCurrency(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const columns: ColumnDef<Earning>[] = [
  {
    accessorKey: "chef_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Chef ID" />
    ),
    cell: ({ row }) => formatChefId(row.original.chef_id),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "monthly_earning",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="$/Month" />
    ),
    cell: ({ row }) => formatCurrency(row.original.monthly_earning),
    sortingFn: "basic",
  },
  {
    accessorKey: "monthly_orders",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Orders/Month" />
    ),
    sortingFn: "basic",
  },
  {
    accessorKey: "monthly_items",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items/Month" />
    ),
    sortingFn: "basic",
  },
  {
    accessorKey: "yearly_earning",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="$/Year" />
    ),
    cell: ({ row }) => formatCurrency(row.original.yearly_earning),
    sortingFn: "basic",
  },
  {
    accessorKey: "yearly_orders",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Orders/Year" />
    ),
    sortingFn: "basic",
  },
  {
    accessorKey: "yearly_items",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items/Year" />
    ),
    sortingFn: "basic",
  },
];

export default function EarningsPage() {
  const { data: earnings = [], isLoading } = useQuery<Earning[]>({
    queryKey: ["earnings"],
    queryFn: () => api.get("/earnings").then((r) => r.data),
  });

  const handleExport = () => {
    const exportData = earnings.map((e) => ({
      "Chef ID": formatChefId(e.chef_id),
      Email: e.email,
      Name: e.name,
      "Monthly Earning": e.monthly_earning,
      "Monthly Orders": e.monthly_orders,
      "Monthly Items": e.monthly_items,
      "Yearly Earning": e.yearly_earning,
      "Yearly Orders": e.yearly_orders,
      "Yearly Items": e.yearly_items,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Earnings");
    XLSX.writeFile(wb, "Taist - Earnings.xlsx");
  };

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
      <h1 className="mb-4 text-2xl font-bold">Earnings</h1>
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={earnings}
          searchPlaceholder="Search chefs..."
          toolbar={toolbar}
        />
      )}
    </div>
  );
}
