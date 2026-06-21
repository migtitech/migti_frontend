import { useMemo, useCallback } from "react";
import { useAuth, FULL_ACCESS_ROLES } from "../context/AuthContext";

/**
 * New granular module keys; employees who only have these legacy perms
 * (from before the split) keep the same access.
 * Key = new module; value = older module keys that imply access.
 */
const MODULE_INHERITANCE = {
  po_bucket: ["purchase_orders"],
  inventory_bucket: ["purchase_orders"],
  dispatchment: ["purchase_orders"],
  /** Legacy `request` + list API previously allowed `purchase_orders:read`. */
  billing_request: ["request", "purchase_orders"],
  /** Legacy PO–billing module was `billing`. */
  po_payment: ["billing"],
};

export const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const isBackOfficeRole = (role) => {
  const normalized = normalizeRole(role);
  if (
    ["back_office_exicutive", "back_office_executive", "boe"].includes(
      normalized,
    )
  ) {
    return true;
  }
  return normalized.replace(/_/g, "").includes("backoffice");
};

export const hasPurchaseOrderBypass = (role) => {
  const normalized = normalizeRole(role);
  if (normalized.startsWith("sales")) return true;
  if (isBackOfficeRole(normalized)) return true;
  return false;
};

/** Procurement always sees Suppliers in the sidebar (read access). */
export const hasProcurementSuppliersBypass = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "procurement";
};

/** Procurement role uses Purchase Bucket without explicit RBAC module grants. */
export const hasProcurementPurchaseBucketBypass = (role) =>
  normalizeRole(role) === "procurement";

/** Matches purchase_exicutive and standalone procurement role. */
export const isPurchaseFamilyRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "procurement" || normalized.startsWith("purchase");
};

/** HOD-approved quotation → PO (quotation detail action). */
export const canConvertQuotationToPo = (role) => hasPurchaseOrderBypass(role);

/** Head of Department (includes legacy `hod` role key). */
export const isHodRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "head_of_department" || normalized === "hod";
};

/**
 * Query edit visibility:
 * - drafted → roles with queries:update (existing permission logic)
 * - any other non-closed status → HOD only
 */
export const canEditQuery = (role, status, hasUpdatePermission = true) => {
  if (status === "closed") return false;
  if (status === "drafted") return !!hasUpdatePermission;
  return isHodRole(role);
};

/** Quotation detail — Add New Product tab: HOD and back office only. */
export const canAddNewProductOnQuotation = (role) => {
  const normalized = normalizeRole(role);
  return isHodRole(normalized) || isBackOfficeRole(normalized);
};

const usePermissions = () => {
  const { user } = useAuth();

  const isFullAccess = useMemo(
    () => !!user && FULL_ACCESS_ROLES.includes(user.role),
    [user],
  );

  const permissions = useMemo(() => user?.permissions || [], [user]);

  const hasPermission = useCallback(
    (module, action) => {
      if (!user) return false;
      if (isFullAccess) return true;
      if (
        module === "suppliers" &&
        hasProcurementSuppliersBypass(user.role) &&
        action === "read"
      ) {
        return true;
      }
      if (
        module === "purchase_bucket" &&
        hasProcurementPurchaseBucketBypass(user.role)
      ) {
        return true;
      }
      if (module === "purchase_orders" && hasPurchaseOrderBypass(user.role))
        return true;
      const p = `${module}:${action}`;
      if (permissions.includes(p)) return true;
      for (const legacy of MODULE_INHERITANCE[module] || []) {
        if (legacy === "purchase_orders" && hasPurchaseOrderBypass(user.role)) {
          return true;
        }
        if (permissions.includes(`${legacy}:${action}`)) return true;
      }
      return false;
    },
    [user, isFullAccess, permissions],
  );

  const canRead = useCallback(
    (module) => hasPermission(module, "read"),
    [hasPermission],
  );
  const canCreate = useCallback(
    (module) => hasPermission(module, "create"),
    [hasPermission],
  );
  const canUpdate = useCallback(
    (module) => hasPermission(module, "update"),
    [hasPermission],
  );
  const canDelete = useCallback(
    (module) => hasPermission(module, "delete"),
    [hasPermission],
  );

  // Check if user has any permission for a module (used for sidebar visibility)
  const hasAnyPermission = useCallback(
    (module) => {
      if (!user) return false;
      if (isFullAccess) return true;
      if (module === "suppliers" && hasProcurementSuppliersBypass(user.role)) {
        return true;
      }
      if (
        module === "purchase_bucket" &&
        hasProcurementPurchaseBucketBypass(user.role)
      ) {
        return true;
      }
      if (module === "purchase_orders" && hasPurchaseOrderBypass(user.role))
        return true;
      const anyFor = (m) => {
        if (m === "purchase_orders" && hasPurchaseOrderBypass(user.role))
          return true;
        return permissions.some((p) => p.startsWith(`${m}:`));
      };
      if (anyFor(module)) return true;
      for (const legacy of MODULE_INHERITANCE[module] || []) {
        if (anyFor(legacy)) return true;
      }
      return false;
    },
    [user, isFullAccess, permissions],
  );

  /**
   * Finance role sidebar: show a nav item only when `user.permissions` grants that
   * nav `module` (any action). Uses MODULE_INHERITANCE for legacy keys (`billing` →
   * po_payment, `request` / `purchase_orders` → billing_request and PO flows, etc.).
   * Does not use full-access or role bypasses — the menu mirrors the permission list.
   */
  const financeNavShowsModule = useCallback(
    (module) => {
      if (!module) return false;
      if (!Array.isArray(permissions) || permissions.length === 0) return false;
      const keyMatch = (key) =>
        permissions.some(
          (p) => typeof p === "string" && p.startsWith(`${key}:`),
        );
      if (keyMatch(module)) return true;
      for (const legacy of MODULE_INHERITANCE[module] || []) {
        if (keyMatch(legacy)) return true;
      }
      return false;
    },
    [permissions],
  );

  return {
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    hasAnyPermission,
    financeNavShowsModule,
    isFullAccess,
    permissions,
  };
};

export default usePermissions;
