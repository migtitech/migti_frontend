import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { Search, X, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";

import { cn } from "../lib/utils";
import { AppSidebarNav } from "./AppSidebarNav";
import usePermissions from "../hooks/usePermissions";
import { useAuth } from "../context/AuthContext";
import {
  getFilteredSidebarNav,
  navContainsTo,
  filterNavBySearch,
} from "../utils/sidebarNav";
import queryService from "../services/queryService";
import quotationService from "../services/quotationService";
import deliveryApprovalService from "../services/deliveryApprovalService";
import dispatchmentBucketService from "../services/dispatchmentBucketService";
import proBucketService from "../services/proBucketService";
import purchaseBucketService from "../services/purchaseBucketService";
import purchaseBillingRequestService from "../services/purchaseBillingRequestService";
import billingRequestBatchService from "../services/billingRequestBatchService";
import {
  SIDEBAR_BADGE_STYLE_NEUTRAL,
  SIDEBAR_BADGE_STYLE_URGENT,
} from "../constants/designTokens";

// sidebar nav config
import navigation from "../_nav";

const SIDEBAR_COUNT_BADGE_STYLE = SIDEBAR_BADGE_STYLE_NEUTRAL;

const AppSidebar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const unfoldable = useSelector((state) => state.sidebarUnfoldable);
  const sidebarShow = useSelector((state) => state.sidebarShow);
  const { user, logout } = useAuth();
  const { hasAnyPermission, isFullAccess } = usePermissions();
  const [navSearch, setNavSearch] = useState("");
  const [draftQueryCount, setDraftQueryCount] = useState(null);
  const [draftQuotationCount, setDraftQuotationCount] = useState(null);
  const [deliveryApprovalPendingCount, setDeliveryApprovalPendingCount] =
    useState(null);
  const [readyForDispatchmentCount, setReadyForDispatchmentCount] =
    useState(null);
  const [proBucketPendingCount, setProBucketPendingCount] = useState(null);
  const [purchaseBucketOpenCount, setPurchaseBucketOpenCount] = useState(null);
  const [billingRequestPendingCount, setBillingRequestPendingCount] =
    useState(null);
  const [queryProductsHodPendingCount, setQueryProductsHodPendingCount] =
    useState(null);
  const [poProductsHodPendingCount, setPoProductsHodPendingCount] =
    useState(null);
  const [purchaseRequestPendingCount, setPurchaseRequestPendingCount] =
    useState(null);

  const filteredNavigation = useMemo(
    () =>
      getFilteredSidebarNav(navigation, {
        user,
        hasAnyPermission,
        isFullAccess,
        pathname: location.pathname,
      }),
    [hasAnyPermission, isFullAccess, user, location.pathname],
  );

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

  const queryProductsNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/query-products"),
    [filteredNavigation],
  );

  const poProductsNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/po-products"),
    [filteredNavigation],
  );

  const purchaseRequestNavVisible = useMemo(
    () => navContainsTo(filteredNavigation, "/purchase-requests"),
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
        if (!cancelled) setDraftQueryCount(Number.isFinite(total) ? total : 0);
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
          setDeliveryApprovalPendingCount(Number.isFinite(total) ? total : 0);
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

  useEffect(() => {
    if (!queryProductsNavVisible) {
      setQueryProductsHodPendingCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await proBucketService.list({
          page: 1,
          pageSize: 1,
          status: "approval_pending",
        });
        const inner = res?.data ?? res;
        const total = Number(inner?.total ?? 0);
        if (!cancelled)
          setQueryProductsHodPendingCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setQueryProductsHodPendingCount(0);
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
  }, [queryProductsNavVisible, location.pathname]);

  useEffect(() => {
    if (!poProductsNavVisible) {
      setPoProductsHodPendingCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await deliveryApprovalService.list({
          page: 1,
          pageSize: 1,
          deliverySubStatus: "all",
          status: "hod_approval_pending",
        });
        const inner = res?.data ?? res;
        const total = Number(inner?.total ?? 0);
        if (!cancelled)
          setPoProductsHodPendingCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setPoProductsHodPendingCount(0);
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
  }, [poProductsNavVisible, location.pathname]);

  useEffect(() => {
    if (!purchaseRequestNavVisible) {
      setPurchaseRequestPendingCount(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await billingRequestBatchService.list({
          pageNumber: 1,
          pageSize: 1,
          status: "hod_approval_pending",
        });
        const inner = res?.data ?? res;
        const data = inner?.data ?? inner;
        const total = Number(data?.pagination?.totalItems ?? 0);
        if (!cancelled)
          setPurchaseRequestPendingCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (!cancelled) setPurchaseRequestPendingCount(0);
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
  }, [purchaseRequestNavVisible, location.pathname]);

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
        if (
          item.to === "/query-products" &&
          queryProductsHodPendingCount != null &&
          queryProductsHodPendingCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(queryProductsHodPendingCount),
              style: SIDEBAR_BADGE_STYLE_URGENT,
            },
          };
        }
        if (
          item.to === "/po-products" &&
          poProductsHodPendingCount != null &&
          poProductsHodPendingCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(poProductsHodPendingCount),
              style: SIDEBAR_BADGE_STYLE_URGENT,
            },
          };
        }
        if (
          item.to === "/purchase-requests" &&
          purchaseRequestPendingCount != null &&
          purchaseRequestPendingCount > 0
        ) {
          return {
            ...item,
            badge: {
              text: formatBadgeText(purchaseRequestPendingCount),
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
    queryProductsHodPendingCount,
    poProductsHodPendingCount,
    purchaseRequestPendingCount,
  ]);

  const searchedNavigation = useMemo(
    () => filterNavBySearch(navigationForSidebar, navSearch),
    [navigationForSidebar, navSearch],
  );
  const isSearching = navSearch.trim().length > 0;

  // Clear a stale search once the user actually navigates somewhere.
  useEffect(() => {
    setNavSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  // Responsive parity with CoreUI CSidebar: keep the off-canvas sidebar
  // collapsed on small screens (close it when at/below the lg breakpoint).
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 991.98px)");
    const sync = (matches) => {
      if (matches) dispatch({ type: "set", sidebarShow: false });
    };
    sync(mql.matches);
    const onChange = (e) => sync(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [dispatch]);

  const closeSidebar = useCallback(() => {
    dispatch({ type: "set", sidebarShow: false });
  }, [dispatch]);

  // Tapping a link inside the off-canvas (mobile) drawer should close it —
  // no-op on desktop where the sidebar is always docked, not off-canvas.
  const handleNavigate = useCallback(() => {
    if (window.matchMedia("(max-width: 991.98px)").matches) {
      closeSidebar();
    }
  }, [closeSidebar]);

  // Escape closes the mobile drawer; body scroll is locked while it's open
  // so the page behind can't scroll along with the overlay.
  useEffect(() => {
    if (!sidebarShow) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKeyDown);
    const { style } = document.body;
    const prevOverflow = style.overflow;
    const isMobile = window.matchMedia("(max-width: 991.98px)").matches;
    if (isMobile) style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      style.overflow = prevOverflow;
    };
  }, [sidebarShow, closeSidebar]);

  return (
    <>
      <div
        className={cn(
          "app-sidebar-backdrop",
          sidebarShow && "app-sidebar-backdrop--show",
        )}
        onClick={closeSidebar}
        aria-hidden
      />
      <aside
        className={cn(
          "app-sidebar sidebar-enhanced",
          unfoldable && "app-sidebar--narrow",
          sidebarShow && "app-sidebar--show",
        )}
      >
        <div className="app-sidebar__brand">
          <NavLink
            to="/"
            className="text-decoration-none me-auto"
            onClick={handleNavigate}
          >
            <span className="sidebar-brand-full text-2xl font-bold text-white">
              ERP
            </span>
            <span className="sidebar-brand-narrow text-xl font-bold text-white">
              E
            </span>
          </NavLink>
          <button
            type="button"
            className="d-lg-none btn btn-sm text-white bg-transparent border-0"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="app-sidebar__search">
          <Search className="app-sidebar__search-icon" size={16} />
          <input
            type="text"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Search menu..."
            aria-label="Search sidebar menu"
          />
          {isSearching && (
            <button
              type="button"
              className="app-sidebar__search-clear"
              onClick={() => setNavSearch("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isSearching && searchedNavigation.length === 0 ? (
          <div className="app-sidebar__search-empty">
            No menu items match &ldquo;{navSearch.trim()}&rdquo;
          </div>
        ) : (
          <AppSidebarNav
            items={searchedNavigation}
            onNavigate={handleNavigate}
            forceOpenAll={isSearching}
          />
        )}

        <div className="app-sidebar__footer justify-content-between p-2">
          <button
            type="button"
            className="btn btn-sm text-white bg-transparent border-0 d-flex align-items-center gap-2"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={18} />
            <span className="app-sidebar__label">Logout</span>
          </button>
          <button
            type="button"
            className="d-none d-lg-inline-flex btn btn-sm text-white bg-transparent border-0"
            onClick={() =>
              dispatch({ type: "set", sidebarUnfoldable: !unfoldable })
            }
            aria-label={unfoldable ? "Expand sidebar" : "Collapse sidebar"}
            title={unfoldable ? "Expand sidebar" : "Collapse sidebar"}
          >
            {unfoldable ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default React.memo(AppSidebar);
