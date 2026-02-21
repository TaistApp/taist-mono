import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Users, ShoppingCart, Clock, DollarSign } from "lucide-react";

interface DashboardStats {
  total_chefs: number;
  total_customers: number;
  total_orders: number;
  pending_count: number;
  monthly_revenue: number;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard").then((r) => r.data),
  });

  const cards = [
    {
      title: "Total Chefs",
      value: data?.total_chefs ?? 0,
      icon: ChefHat,
      color: "bg-violet-100 text-violet-600",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Total Customers",
      value: data?.total_customers ?? 0,
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Total Orders",
      value: data?.total_orders ?? 0,
      icon: ShoppingCart,
      color: "bg-emerald-100 text-emerald-600",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Pending Chefs",
      value: data?.pending_count ?? 0,
      icon: Clock,
      color: "bg-amber-100 text-amber-600",
      format: (v: number) => v.toLocaleString(),
    },
    {
      title: "Monthly Revenue",
      value: data?.monthly_revenue ?? 0,
      icon: DollarSign,
      color: "bg-emerald-100 text-emerald-600",
      format: (v: number) =>
        "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                <div className="text-2xl font-bold tracking-tight">
                  {card.format(card.value)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
