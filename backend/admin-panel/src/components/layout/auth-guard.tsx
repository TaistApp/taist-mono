import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { loginPathFor } from "@/lib/login-redirect";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginPathFor(location.pathname + location.search)} replace />;
  }

  return <>{children}</>;
}
