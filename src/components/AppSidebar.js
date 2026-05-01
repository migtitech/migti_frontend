import React, { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from "@coreui/react";

import { AppSidebarNav } from "./AppSidebarNav";
import usePermissions, { normalizeRole } from "../hooks/usePermissions";
import { useAuth } from "../context/AuthContext";

// sidebar nav config
import navigation from "../_nav";

/** Nav routes hidden for head_of_department / hod only (full-access otherwise sees all modules). */
const HOD_HIDDEN_PATHS = new Set([
  "/billing-requests",
  "/my-visits",
  "/purchase-order-sidebar",
  "/dispatchment",
  "/inventory-bucket",
  "/pro-bucket",
  "/pro-dashboard",
  "/pending-payment",
  "/task-dashboard",
  "/task-bucket",
  "/rate-cards",
  "/purchase-bucket",
]);

const AppSidebar = () => {
  const dispatch = useDispatch();
  const unfoldable = useSelector((state) => state.sidebarUnfoldable);
  const sidebarShow = useSelector((state) => state.sidebarShow);
  const { user } = useAuth();
  const { hasAnyPermission, isFullAccess, financeNavShowsModule } =
    usePermissions();

  // Filter navigation items based on permissions (or use purchase-only nav for PM/PE)
  const filteredNavigation = useMemo(() => {
    const role = String(user?.role || "").toLowerCase();
    const isHod = role === "head_of_department" || role === "hod";
    const isPurchaseManager = role === "purchase_manager";

    /** Purchase manager: only Dashboard + nav entries for assigned module permissions. */
    if (isPurchaseManager) {
      const pmFilter = (item) => {
        if (item.roles?.length) {
          const allowed = item.roles.map((r) => String(r).toLowerCase());
          if (!allowed.includes(role)) return false;
        }
        if (
          item.rolePrefix &&
          !role.startsWith(String(item.rolePrefix).toLowerCase())
        ) {
          return false;
        }
        if (!item.module) {
          return item.to === "/dashboard";
        }
        return hasAnyPermission(item.module);
      };
      return navigation
        .filter(pmFilter)
        .map((item) => {
          if (item.items) {
            const filteredItems = item.items.filter(pmFilter);
            if (filteredItems.length === 0) return null;
            return { ...item, items: filteredItems };
          }
          return item;
        })
        .filter(Boolean);
    }

    /** Finance: sidebar shows only entries whose nav `module` is granted by `user.permissions` (see `financeNavShowsModule`). */
    if (normalizeRole(user?.role) === "finance") {
      const financeRoleKey = normalizeRole(user?.role);
      const financeFilter = (item) => {
        if (item.roles?.length) {
          const allowed = item.roles.map((r) => normalizeRole(r));
          if (!allowed.includes(financeRoleKey)) return false;
        }
        if (
          item.rolePrefix &&
          !financeRoleKey.startsWith(String(item.rolePrefix).toLowerCase())
        ) {
          return false;
        }
        if (!item.module) return false;
        return hasAnyPermission(item.module);
      };
      return navigation
        .map((item) => {
          if (item.items) {
            const filteredItems = item.items.filter(financeFilter);
            if (filteredItems.length === 0) return null;
            return { ...item, items: filteredItems };
          }
          return financeFilter(item) ? item : null;
        })
        .filter(Boolean);
    }

    // Fixed sidebar for admin role only.
    if (role === "admin") {
      const allowedPaths = new Set([
        "/dashboard",
        "/companies",
        "/branches",
        "/zones",
        "/industries",
        "/branch-analytics",
        "/target-analytics",
        "/visit-management-sidebar",
        "/inventory-bucket",
        "/dispatchment",
        "/billing-requests",
      ]);
      return navigation.filter((item) => item?.to && allowedPaths.has(item.to));
    }

    const filterItem = (item) => {
      if (item.roles?.length) {
        const allowed = item.roles.map((r) => String(r).toLowerCase());
        if (!allowed.includes(role)) return false;
      }
      if (
        item.rolePrefix &&
        !role.startsWith(String(item.rolePrefix).toLowerCase())
      ) {
        return false;
      }
      if (isHod && item.to && HOD_HIDDEN_PATHS.has(item.to)) return false;
      // No module: show most global links; hide main Dashboard for granular-RBAC users
      if (!item.module) {
        if (
          item.to === "/dashboard" &&
          !isFullAccess &&
          Array.isArray(user?.permissions) &&
          user.permissions.length > 0
        ) {
          return false;
        }
        return true;
      }
      // Show Sub-zones by default only to HOD; other roles need explicit permission.
      if (item.module === "sub_zones")
        return isHod || hasAnyPermission("sub_zones");
      // Full-access roles see everything
      if (isFullAccess) return true;
      // Check if user has any permission for this module
      return hasAnyPermission(item.module);
    };

    return navigation
      .filter(filterItem)
      .map((item) => {
        // For groups with sub-items, filter sub-items too
        if (item.items) {
          const filteredItems = item.items.filter((subItem) => {
            if (subItem.roles?.length) {
              const allowed = subItem.roles.map((r) => String(r).toLowerCase());
              if (!allowed.includes(role)) return false;
            }
            if (
              subItem.rolePrefix &&
              !role.startsWith(String(subItem.rolePrefix).toLowerCase())
            ) {
              return false;
            }
            if (isHod && subItem.to && HOD_HIDDEN_PATHS.has(subItem.to))
              return false;
            if (!subItem.module) return true;
            if (subItem.module === "sub_zones")
              return isHod || hasAnyPermission("sub_zones");
            if (isFullAccess) return true;
            return hasAnyPermission(subItem.module);
          });
          if (filteredItems.length === 0) return null;
          return { ...item, items: filteredItems };
        }
        return item;
      })
      .filter(Boolean);
  }, [hasAnyPermission, financeNavShowsModule, isFullAccess, user]);

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: "set", sidebarShow: visible });
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/" className="text-decoration-none">
          <span className="sidebar-brand-full fs-4 fw-bold text-white">
            MigtiCRM
          </span>
          <span className="sidebar-brand-narrow fs-5 fw-bold text-white">
            MC
          </span>
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: "set", sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={filteredNavigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() =>
            dispatch({ type: "set", sidebarUnfoldable: !unfoldable })
          }
        />
      </CSidebarFooter>
    </CSidebar>
  );
};

export default React.memo(AppSidebar);
