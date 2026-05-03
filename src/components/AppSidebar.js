import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";

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
import queryService from "../services/queryService";
import quotationService from "../services/quotationService";
import deliveryApprovalService from "../services/deliveryApprovalService";
import dispatchmentBucketService from "../services/dispatchmentBucketService";
import proBucketService from "../services/proBucketService";
import purchaseBucketService from "../services/purchaseBucketService";
import purchaseBillingRequestService from "../services/purchaseBillingRequestService";

// sidebar nav config
import navigation from "../_nav";

const SIDEBAR_COUNT_BADGE_STYLE = {
  backgroundColor: "#2563EB",
  color: "#FFFFFF",
};

/** Nav routes hidden for head_of_department / hod only (full-access otherwise sees all modules). */
const HOD_HIDDEN_PATHS = new Set([
  "/billing-requests",
  "/my-visits",
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

const navContainsTo = (items, path) => {
  for (const item of items || []) {
    if (item.to === path) return true;
    if (item.items?.length && navContainsTo(item.items, path)) return true;
  }
  return false;
};

const AppSidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const unfoldable = useSelector((state) => state.sidebarUnfoldable);
  const sidebarShow = useSelector((state) => state.sidebarShow);
  const { user } = useAuth();
  const { hasAnyPermission, isFullAccess, financeNavShowsModule } =
    usePermissions();
  const [draftQueryCount, setDraftQueryCount] = useState(null);
  const [draftQuotationCount, setDraftQuotationCount] = useState(null);
  const [deliveryApprovalPendingCount, setDeliveryApprovalPendingCount] =
    useState(null);
  const [readyForDispatchmentCount, setReadyForDispatchmentCount] =
    useState(null);
  const [proBucketPendingCount, setProBucketPendingCount] = useState(null);
  const [purchaseBucketOpenCount, setPurchaseBucketOpenCount] =
    useState(null);
  const [billingRequestPendingCount, setBillingRequestPendingCount] =
    useState(null);

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
        "/delivery-approval",
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

  const queriesNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/queries"),
    [filteredNavigation],
  );

  const quotationsNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/quotations"),
    [filteredNavigation],
  );

  const deliveryApprovalNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/delivery-approval"),
    [filteredNavigation],
  );

  const dispatchmentNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/dispatchment"),
    [filteredNavigation],
  );

  const proBucketNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/pro-bucket"),
    [filteredNavigation],
  );

  const purchaseBucketNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/purchase-bucket"),
    [filteredNavigation],
  );

  const billingRequestsNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/billing-requests"),
    [filteredNavigation],
  );

  useEffect(() => {
    if (!queriesNavVisible) {
      setDraftQueryCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await queryService.getAll({
          pageNumber: 1,
          pageSize: 1,
          status: "drafted",
        });
        const data = res?.data || res;
        const result = data?.data ?? data;
        const total = Number(result?.pagination?.totalItems ?? 0);
        if (!cancelled)
          setDraftQueryCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setDraftQueryCount(0);
      }
    };
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [queriesNavVisible, location.pathname]);

  useEffect(() => {
    if (!quotationsNavVisible) {
      setDraftQuotationCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await quotationService.getAll({
          pageNumber: 1,
          pageSize: 1,
          status: "draft",
        });
        const data = res?.data || res;
        const result = data?.data ?? data;
        const total = Number(result?.pagination?.totalItems ?? 0);
        if (!cancelled)
          setDraftQuotationCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setDraftQuotationCount(0);
      }
    };
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [quotationsNavVisible, location.pathname]);

  useEffect(() => {
    if (!deliveryApprovalNavVisible) {
      setDeliveryApprovalPendingCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await deliveryApprovalService.list({
          page: 1,
          pageSize: 1,
        });
        const inner = res?.data ?? res;
        const total = Number(inner?.total ?? 0);
        if (!cancelled)
          setDeliveryApprovalPendingCount(
            Number.isFinite(total) ? total : 0,
          );
      } catch {
        if (!cancelled) setDeliveryApprovalPendingCount(0);
      }
    };
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [deliveryApprovalNavVisible, location.pathname]);

  useEffect(() => {
    if (!dispatchmentNavVisible) {
      setReadyForDispatchmentCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await dispatchmentBucketService.list({
          page: 1,
          pageSize: 1,
          status: "ready_for_dispatchment",
        });
        const inner = res?.data ?? res;
        const total = Number(inner?.total ?? 0);
        if (!cancelled)
          setReadyForDispatchmentCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setReadyForDispatchmentCount(0);
      }
    };
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [dispatchmentNavVisible, location.pathname]);

  useEffect(() => {
    if (!proBucketNavVisible) {
      setProBucketPendingCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await proBucketService.list({
          page: 1,
          pageSize: 1,
          status: "pending",
        });
        const inner = res?.data ?? res;
        const total = Number(inner?.total ?? 0);
        if (!cancelled)
          setProBucketPendingCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setProBucketPendingCount(0);
      }
    };
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [proBucketNavVisible, location.pathname]);

  useEffect(() => {
    if (!purchaseBucketNavVisible) {
      setPurchaseBucketOpenCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await purchaseBucketService.list({
          page: 1,
          pageSize: 1,
          status: "open",
        });
        const inner = res?.data ?? res;
        const total = Number(inner?.total ?? 0);
        if (!cancelled)
          setPurchaseBucketOpenCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setPurchaseBucketOpenCount(0);
      }
    };
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [purchaseBucketNavVisible, location.pathname]);

  useEffect(() => {
    if (!billingRequestsNavVisible) {
      setBillingRequestPendingCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await purchaseBillingRequestService.list({
          pageNumber: 1,
          pageSize: 1,
          status: "pending",
        });
        const inner = res?.data ?? res;
        const total = Number(inner?.pagination?.totalItems ?? 0);
        if (!cancelled)
          setBillingRequestPendingCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setBillingRequestPendingCount(0);
      }
    };
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [billingRequestsNavVisible, location.pathname]);

  const navigationForSidebar = useMemo(() => {
    const formatBadgeText = (n) => (n > 99 ? "99+" : String(n));
    const mapItems = (items) =>
      (items || []).map((item) => {
        if (item.items) {
          return { ...item, items: mapItems(item.items) };
        }
        if (
          item.to === "/queries" &&
          draftQueryCount != null &&
          draftQueryCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(draftQueryCount),
              style: SIDEBAR_COUNT_BADGE_STYLE,
            },
          };
        }
        if (
          item.to === "/quotations" &&
          draftQuotationCount != null &&
          draftQuotationCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(draftQuotationCount),
              style: SIDEBAR_COUNT_BADGE_STYLE,
            },
          };
        }
        if (
          item.to === "/delivery-approval" &&
          deliveryApprovalPendingCount != null &&
          deliveryApprovalPendingCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(deliveryApprovalPendingCount),
              style: SIDEBAR_COUNT_BADGE_STYLE,
            },
          };
        }
        if (
          item.to === "/dispatchment" &&
          readyForDispatchmentCount != null &&
          readyForDispatchmentCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(readyForDispatchmentCount),
              style: SIDEBAR_COUNT_BADGE_STYLE,
            },
          };
        }
        if (
          item.to === "/pro-bucket" &&
          proBucketPendingCount != null &&
          proBucketPendingCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(proBucketPendingCount),
              style: SIDEBAR_COUNT_BADGE_STYLE,
            },
          };
        }
        if (
          item.to === "/purchase-bucket" &&
          purchaseBucketOpenCount != null &&
          purchaseBucketOpenCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(purchaseBucketOpenCount),
              style: SIDEBAR_COUNT_BADGE_STYLE,
            },
          };
        }
        if (
          item.to === "/billing-requests" &&
          billingRequestPendingCount != null &&
          billingRequestPendingCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(billingRequestPendingCount),
              style: SIDEBAR_COUNT_BADGE_STYLE,
            },
          };
        }
        return item;
      });
    return mapItems(filteredNavigation);
  }, [
    filteredNavigation,
    draftQueryCount,
    draftQuotationCount,
    deliveryApprovalPendingCount,
    readyForDispatchmentCount,
    proBucketPendingCount,
    purchaseBucketOpenCount,
    billingRequestPendingCount,
  ]);

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
      <AppSidebarNav items={navigationForSidebar} />
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
