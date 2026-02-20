import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import AuthGuard from "./auth-guard";

export default function AppShell() {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 pt-14 lg:pt-6">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  );
}
