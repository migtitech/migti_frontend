import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import usePermissions from "../hooks/usePermissions";
import Loader from "./Loader/Loader";

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

/** Paths a purchase manager may open without a `module` on the route (see routes.js). */
const PURCHASE_MANAGER_OPEN_PATHS = new Set(["/dashboard", "/unauthorized"]);

const normalizePath = (pathname) => {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return p;
};

const ProtectedRoute = ({
  children,
  module,
  action = "read",
  allowedRoles,
  allowedRolePrefix,
}) => {
  const { loading, isAuthenticated, user } = useAuth();
  const { hasPermission, isFullAccess } = usePermissions();
  const location = useLocation();
  const path = normalizePath(location.pathname);
  const isPurchaseManager = normalizeRole(user?.role) === "purchase_manager";

  if (loading) {
    return (
      <div className="pt-3">
        <Loader message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length) {
    const u = normalizeRole(user?.role);
    const ok = allowedRoles.some((r) => normalizeRole(r) === u);
    if (!ok) {
      return (
        <Navigate
          to={isPurchaseManager ? "/dashboard" : "/unauthorized"}
          replace
        />
      );
    }
  }

  if (allowedRolePrefix) {
    const u = normalizeRole(user?.role);
    const prefix = String(allowedRolePrefix).trim().toLowerCase();
    if (!u.startsWith(prefix)) {
      return (
        <Navigate
          to={isPurchaseManager ? "/dashboard" : "/unauthorized"}
          replace
        />
      );
    }
  }

  // Purchase manager: only dashboard (and unauthorized fallback) without module; else require RBAC
  if (isPurchaseManager) {
    if (!module) {
      if (!PURCHASE_MANAGER_OPEN_PATHS.has(path)) {
        return <Navigate to="/dashboard" replace />;
      }
      return children;
    }
    if (!hasPermission(module, action)) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  // If no module specified, allow all authenticated users (e.g., dashboard)
  if (!module) {
    return children;
  }

  // Full-access roles bypass permission checks
  if (isFullAccess) {
    return children;
  }

  // Check specific permission
  if (!hasPermission(module, action)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
