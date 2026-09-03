import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Loader2 } from "lucide-react";

const ROLE_HOME = {
  // Backend returns UPPERCASE role names.
  OWNER: "/owner/dashboard",
  MANAGER: "/manager/dashboard",
  CASHIER: "/cashier/dashboard",
  WAITER: "/waiter/dashboard",
  KITCHEN: "/kitchen/dashboard",
};

/**
 * Gate a route to a set of allowed roles.
 * Compares in a case-insensitive way so guards written with lowercase
 * strings still match the UPPERCASE role that the backend returns.
 */
export const RoleRoute = ({ roles, children }) => {
  const { authUser, isCheckingAuth } = useAuthStore();
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = String(authUser.role || "").toUpperCase();
  const allowed = roles.map((r) => String(r).toUpperCase());
  if (!allowed.includes(userRole)) {
    const fallback = ROLE_HOME[userRole] || ROLE_HOME[authUser.role] || "/login";
    return <Navigate to={fallback} replace />;
  }

  return children;
};

/** Redirect an authenticated user to their role dashboard. */
export const RedirectHome = () => {
  const { authUser } = useAuthStore();
  const home = ROLE_HOME[String(authUser?.role || "").toUpperCase()] || "/login";
  return <Navigate to={home} replace />;
};

export default RoleRoute;