import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import ErrorBoundary from "@/components/layout/error-boundary";
import AppShell from "@/components/layout/app-shell";

const LoginPage = lazy(() => import("./pages/login"));
const DashboardPage = lazy(() => import("./pages/dashboard"));
const ChefsPage = lazy(() => import("./pages/chefs"));
const CategoriesPage = lazy(() => import("./pages/categories"));
const CustomersPage = lazy(() => import("./pages/customers"));
const OrdersPage = lazy(() => import("./pages/orders"));
const EarningsPage = lazy(() => import("./pages/earnings"));
const TicketsPage = lazy(() => import("./pages/tickets"));
const MenusPage = lazy(() => import("./pages/menus"));
const MenuEditPage = lazy(() => import("./pages/menu-edit"));
const DiscountCodesPage = lazy(() => import("./pages/discount-codes"));
const ServiceAreasPage = lazy(() => import("./pages/service-areas"));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
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
              <Route path="/admin-new/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />

              <Route path="/admin-new" element={<AppShell />}>
                <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
                <Route path="chefs" element={<Suspense fallback={<PageLoader />}><ChefsPage /></Suspense>} />
                <Route path="categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
                <Route path="customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
                <Route path="orders" element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} />
                <Route path="earnings" element={<Suspense fallback={<PageLoader />}><EarningsPage /></Suspense>} />
                <Route path="tickets" element={<Suspense fallback={<PageLoader />}><TicketsPage /></Suspense>} />
                <Route path="menus" element={<Suspense fallback={<PageLoader />}><MenusPage /></Suspense>} />
                <Route path="menus/:id/edit" element={<Suspense fallback={<PageLoader />}><MenuEditPage /></Suspense>} />
                <Route path="discount-codes" element={<Suspense fallback={<PageLoader />}><DiscountCodesPage /></Suspense>} />
                <Route path="service-areas" element={<Suspense fallback={<PageLoader />}><ServiceAreasPage /></Suspense>} />

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
