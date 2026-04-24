import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import usePermissions from "../hooks/usePermissions";
import Loader from "./Loader/Loader";

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const ProtectedRoute = ({
  children,
  module,
  action = "read",
  allowedRoles,
}) => {
  const { loading, isAuthenticated, user } = useAuth();
  const { hasPermission, isFullAccess } = usePermissions();

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
