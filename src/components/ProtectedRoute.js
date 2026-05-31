import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import usePermissions, { isPurchaseFamilyRole } from "../hooks/usePermissions";
import Loader from "./Loader/Loader";

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

/** Local procurement (LP) may only access My Pro Bucket. */
const LOCAL_PROCUREMENT_OPEN_PATHS = new Set(["/local-pro", "/unauthorized"]);

/** Local purchase (LPU) may only access My Purchase. */
const LOCAL_PURCHASE_OPEN_PATHS = new Set(["/my-purchase", "/unauthorized"]);

/** Dispatch manager may only access Dispatchment. */
const DISPATCH_MANAGER_OPEN_PATHS = new Set(["/dispatchment", "/unauthorized"]);

/** Inventory manager may only access Inventory bucket. */
const INVENTORY_MANAGER_OPEN_PATHS = new Set([
  "/inventory-bucket",
  "/unauthorized",
]);

/** Finance may only access Billing request and PO payment flows. */
const FINANCE_OPEN_PATHS = new Set([
  "/billing-requests",
  "/po-payment",
  "/unauthorized",
]);

const isFinanceAllowedPath = (path) => {
  if (FINANCE_OPEN_PATHS.has(path)) return true;
  return path.startsWith("/billing-requests/");
};

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
  excludeRolePrefix,
  allowRolePrefixOrModule = false,
}) => {
  const { loading, isAuthenticated, user } = useAuth();
  const { hasPermission, isFullAccess } = usePermissions();
  const location = useLocation();
  const path = normalizePath(location.pathname);
  const isLocalProcurement = normalizeRole(user?.role) === "localprocurement";
  const isLocalPurchase = normalizeRole(user?.role) === "localpurchase";
  const isDispatchManager = normalizeRole(user?.role) === "dispatch_manager";
  const isInventoryManager = normalizeRole(user?.role) === "inventry_manager";

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

  const userRole = normalizeRole(user?.role);

  if (isLocalProcurement) {
    if (!LOCAL_PROCUREMENT_OPEN_PATHS.has(path)) {
      return <Navigate to="/local-pro" replace />;
    }
    return children;
  }

  if (isLocalPurchase) {
    if (!LOCAL_PURCHASE_OPEN_PATHS.has(path)) {
      return <Navigate to="/my-purchase" replace />;
    }
    return children;
  }

  if (isDispatchManager) {
    if (!DISPATCH_MANAGER_OPEN_PATHS.has(path)) {
      return <Navigate to="/dispatchment" replace />;
    }
    return children;
  }

  if (isInventoryManager) {
    if (!INVENTORY_MANAGER_OPEN_PATHS.has(path)) {
      return <Navigate to="/inventory-bucket" replace />;
    }
    return children;
  }

  if (userRole === "finance" && !isFinanceAllowedPath(path)) {
    return <Navigate to="/billing-requests" replace />;
  }

  if (
    excludeRolePrefix &&
    userRole.startsWith(String(excludeRolePrefix).trim().toLowerCase())
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles?.length) {
    const u = userRole;
    const ok = allowedRoles.some((r) => normalizeRole(r) === u);
    if (!ok) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (allowedRolePrefix) {
    const prefix = String(allowedRolePrefix).trim().toLowerCase();
    const roleAllowed = prefix === "purchase"
      ? isPurchaseFamilyRole(userRole)
      : userRole.startsWith(prefix);
    if (roleAllowed) {
      return children;
    }
    if (!allowRolePrefixOrModule) {
      return <Navigate to="/unauthorized" replace />;
    }
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
