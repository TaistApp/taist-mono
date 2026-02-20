import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import ErrorBoundary from "@/components/layout/error-boundary";
import AppShell from "@/components/layout/app-shell";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ChefsPage from "@/pages/chefs";
import CategoriesPage from "@/pages/categories";
import CustomersPage from "@/pages/customers";
import OrdersPage from "@/pages/orders";
import EarningsPage from "@/pages/earnings";
import TicketsPage from "@/pages/tickets";
import MenusPage from "@/pages/menus";
import MenuEditPage from "@/pages/menu-edit";
import DiscountCodesPage from "@/pages/discount-codes";
import ServiceAreasPage from "@/pages/service-areas";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/admin-new/login" element={<LoginPage />} />

              <Route path="/admin-new" element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="chefs" element={<ChefsPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="earnings" element={<EarningsPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="menus" element={<MenusPage />} />
                <Route path="menus/:id/edit" element={<MenuEditPage />} />
                <Route path="discount-codes" element={<DiscountCodesPage />} />
                <Route path="service-areas" element={<ServiceAreasPage />} />

                {/* Redirects for removed/renamed routes */}
                <Route path="pendings" element={<Navigate to="/admin-new/chefs" replace />} />
                <Route path="contacts" element={<Navigate to="/admin-new/tickets" replace />} />
                <Route path="zipcodes" element={<Navigate to="/admin-new/service-areas" replace />} />
                <Route path="profiles" element={<Navigate to="/admin-new/chefs" replace />} />
                <Route path="profiles/:id/edit" element={<Navigate to="/admin-new/chefs" replace />} />
                <Route path="customizations" element={<Navigate to="/admin-new/menus" replace />} />
                <Route path="customizations/:id/edit" element={<Navigate to="/admin-new/menus" replace />} />
                <Route path="chats" element={<Navigate to="/admin-new/orders" replace />} />
                <Route path="reviews" element={<Navigate to="/admin-new/orders" replace />} />
                <Route path="transactions" element={<Navigate to="/admin-new/orders" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/admin-new/" replace />} />
            </Routes>
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
