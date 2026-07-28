import type { ReactNode } from "react";
import {
  Navigate,
  useLocation,
} from "react-router";
import { LoaderCircle } from "lucide-react";
import {
  useAuth,
  type UserRole,
} from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();

  const {
    loading,
    isAuthenticated,
    profile,
  } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading__content">
          <LoaderCircle className="app-loading__icon" />

          <p>جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  if (
    allowedRoles?.length &&
    !allowedRoles.includes(profile.role)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return children;
}
