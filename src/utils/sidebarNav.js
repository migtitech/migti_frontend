import navigation, { PURCHASE_ROLE_NAV } from "../_nav";
import { isPurchaseFamilyRole, normalizeRole } from "../hooks/usePermissions";

/** Routes visible in the sidebar and open to every authenticated role. */
export const UNIVERSAL_NAV_PATHS = new Set(["/sidebar-docs"]);

/** Modules where HOD must have explicit permission (no full-access bypass). */
export const HOD_PERMISSION_REQUIRED_MODULES = new Set(["po_payment_backlog"]);

/** Nav routes hidden for head_of_department / hod only. */
export const HOD_HIDDEN_PATHS = new Set([
  "/companies",
  "/branches",
  "/employee-locations",
  "/billing-requests",
  "/batch-billing-requests",
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
  "/target-analytics",
]);

export const DISPATCH_MANAGER_ALLOWED_PATHS = new Set(["/dispatchment"]);

export const INVENTORY_MANAGER_ALLOWED_PATHS = new Set(["/inventory-bucket"]);

export const FINANCE_ALLOWED_PATHS = new Set([
  "/billing-requests",
  "/po-payment",
  "/sidebar-docs",
]);

export const ADMIN_ALLOWED_PATHS = new Set([
  "/dashboard",
  "/companies",
  "/branches",
  "/zones",
  "/industries",
  "/branch-analytics",
  "/target-analytics",
  "/target-dashboard",
  "/visit-management-sidebar",
  "/inventory-bucket",
  "/dispatchment",
  "/delivery-approval",
  "/billing-requests",
  "/po-payment-backlog",
]);

const PURCHASE_ROLE_KEYS = new Set([
  "purchase_exicutive",
  "procurement",
]);

export const roleMatchesNavPrefix = (role, rolePrefix) => {
  const prefix = String(rolePrefix || "").toLowerCase();
  if (!prefix) return true;
  if (prefix === "purchase") return isPurchaseFamilyRole(role);
  return String(role || "").toLowerCase().startsWith(prefix);
};

const isProBucketRoute = (pathname) =>
  pathname === "/pro-bucket" || pathname.startsWith("/pro-bucket/");

const collectNavPaths = (items, paths = new Set()) => {
  for (const item of items || []) {
    if (item.to) paths.add(item.to);
    if (item.items?.length) collectNavPaths(item.items, paths);
  }
  return paths;
};

const mergeNavByTo = (baseNav, extraNav) => {
  const seen = collectNavPaths(baseNav);
  const merged = [...(baseNav || [])];
  for (const item of extraNav || []) {
    if (item?.to && seen.has(item.to)) continue;
    merged.push(item);
    if (item?.to) seen.add(item.to);
  }
  return merged;
};

const isSharedPurchaseNavItem = (item) => {
  if (!item?.roles?.length) return true;
  const allowed = item.roles.map((r) => String(r).toLowerCase());
  return allowed.some((r) => PURCHASE_ROLE_KEYS.has(r));
};

const augmentNavForProBucketRoute = (
  nav,
  pathname,
  { role, isFullAccess, hasAnyPermission },
) => {
  if (!isProBucketRoute(pathname) || !Array.isArray(nav)) return nav;

  const normalized = String(role || "").toLowerCase();
  const extras = PURCHASE_ROLE_NAV.filter((item) => {
    if (!isSharedPurchaseNavItem(item)) {
      return item.roles?.some((r) => String(r).toLowerCase() === normalized);
    }
    if (item.rolePrefix) {
      return roleMatchesNavPrefix(normalized, item.rolePrefix);
    }
    if (item.module) {
      return isFullAccess || hasAnyPermission(item.module);
    }
    return isFullAccess;
  });

  return mergeNavByTo(nav, extras);
};

const roleInList = (role, roles) => {
  if (!roles?.length) return true;
  const normalized = String(role || "").toLowerCase();
  return roles.some((r) => String(r).toLowerCase() === normalized);
};

const matchesExcludeRolePrefix = (role, excludeRolePrefix) => {
  if (!excludeRolePrefix) return false;
  return String(role || "")
    .toLowerCase()
    .startsWith(String(excludeRolePrefix).toLowerCase());
};

const hasExplicitModulePermission = (permissions, module) =>
  Array.isArray(permissions) &&
  permissions.some((p) => String(p).startsWith(`${module}:`));

/**
 * Core visibility check for a single nav item. Role strategy selects which rules apply.
 */
export const isNavItemVisible = (item, ctx) => {
  const {
    role,
    strategy,
    isHod,
    isFullAccess,
    hasAnyPermission,
    permissions,
  } = ctx;

  if (item.to && UNIVERSAL_NAV_PATHS.has(item.to)) {
    return true;
  }

  if (strategy === "roles_only") {
    return Boolean(item.roles?.length && roleInList(role, item.roles));
  }

  if (strategy === "admin") {
    return Boolean(item.to && ADMIN_ALLOWED_PATHS.has(item.to));
  }

  if (strategy === "dispatch_manager") {
    return Boolean(
      item.to && DISPATCH_MANAGER_ALLOWED_PATHS.has(item.to),
    );
  }

  if (strategy === "inventory_manager") {
    return Boolean(
      item.to && INVENTORY_MANAGER_ALLOWED_PATHS.has(item.to),
    );
  }

  if (item.roles?.length && !roleInList(role, item.roles)) {
    return false;
  }

  if (item.rolePrefix && !roleMatchesNavPrefix(role, item.rolePrefix)) {
    return false;
  }

  if (matchesExcludeRolePrefix(role, item.excludeRolePrefix)) {
    return false;
  }

  if (strategy === "finance") {
    if (!item.to || !FINANCE_ALLOWED_PATHS.has(item.to)) return false;
    if (!item.module) return false;
    return hasAnyPermission(item.module);
  }

  // Default strategy (super_admin, hod, sales, procurement, etc.)
  if (isHod && item.to && HOD_HIDDEN_PATHS.has(item.to)) {
    return false;
  }

  // Procurement sees Pro Bucket by default (no explicit pro_bucket permission required).
  if (role === "procurement" && item.to === "/pro-bucket") {
    return true;
  }

  if (!item.module) {
    if (
      item.to === "/dashboard" &&
      !isFullAccess &&
      Array.isArray(permissions) &&
      permissions.length > 0
    ) {
      return false;
    }
    return true;
  }

  if (item.module === "sub_zones") {
    return isHod || hasAnyPermission("sub_zones");
  }

  if (isHod && HOD_PERMISSION_REQUIRED_MODULES.has(item.module)) {
    return hasExplicitModulePermission(permissions, item.module);
  }

  if (isFullAccess) return true;

  return hasAnyPermission(item.module);
};

const resolveNavStrategy = (role) => {
  if (role === "localprocurement" || role === "localpurchase") {
    return "roles_only";
  }
  if (role === "finance") return "finance";
  if (role === "admin") return "admin";
  if (role === "dispatch_manager") return "dispatch_manager";
  if (role === "inventry_manager") return "inventory_manager";
  return "default";
};

const buildNavFilterContext = (user, { hasAnyPermission, isFullAccess }) => {
  const role = normalizeRole(user?.role);
  const isHod = role === "head_of_department" || role === "hod";

  return {
    role,
    isHod,
    isFullAccess,
    hasAnyPermission,
    permissions: user?.permissions || [],
    strategy: resolveNavStrategy(role),
  };
};

/**
 * Filter top-level navigation (and nested groups) for the current user role.
 */
export const filterNavigationItems = (navItems, ctx) => {
  const filter = (item) => isNavItemVisible(item, ctx);
  const items = navItems || [];

  if (ctx.strategy === "roles_only") {
    return items.filter(filter);
  }

  const applyGroupFilter = (list) =>
    list
      .map((item) => {
        if (item.items) {
          const filteredItems = item.items.filter(filter);
          if (filteredItems.length === 0) return null;
          return { ...item, items: filteredItems };
        }
        return filter(item) ? item : null;
      })
      .filter(Boolean);

  if (
    ctx.strategy === "admin" ||
    ctx.strategy === "finance" ||
    ctx.strategy === "dispatch_manager" ||
    ctx.strategy === "inventory_manager"
  ) {
    return applyGroupFilter(items);
  }

  return applyGroupFilter(items.filter(filter));
};

/**
 * Returns sidebar nav entries visible to the current user, including Pro Bucket route augmentation.
 */
export const getFilteredSidebarNav = (
  navItems = navigation,
  { user, hasAnyPermission, isFullAccess, pathname = "" },
) => {
  const ctx = buildNavFilterContext(user, { hasAnyPermission, isFullAccess });
  const filtered = filterNavigationItems(navItems, ctx);
  return augmentNavForProBucketRoute(filtered, pathname, ctx);
};

export const navContainsTo = (items, path) => {
  for (const item of items || []) {
    if (item.to === path) return true;
    if (item.items?.length && navContainsTo(item.items, path)) return true;
  }
  return false;
};
