import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  /** Allow admin OR manager (used for read-only manager pages) */
  allowManager?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false, allowManager = false }: ProtectedRouteProps) => {
  const { user, isAdmin, isManager, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) {
    const loginPath = requireAdmin ? "/admin/login" : "/login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }
  if (requireAdmin) {
    const ok = isAdmin || (allowManager && isManager);
    if (!ok) return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
