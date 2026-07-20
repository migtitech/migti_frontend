import navigation, { PURCHASE_ROLE_NAV } from "../_nav";
import {
  isBackOfficeRole,
  isPurchaseFamilyRole,
  normalizeRole,
} from "../hooks/usePermissions";

/** Routes visible in the sidebar and open to every authenticated role. */
export const UNIVERSAL_NAV_PATHS = new Set([
  "/company-catalog",
  "/visit-management-sidebar",
]);

/** Modules where HOD must have explicit permission (no full-access bypass). */
export const HOD_PERMISSION_REQUIRED_MODULES = new Set(["po_payment_backlog"]);

/** Nav routes under Branch Settings hidden for back office roles. */
export const BACK_OFFICE_HIDDEN_PATHS = new Set([
  "/zones",
  "/sub-zones",
  "/employees",
  "/company-documents",
  "/branch-settings",
  "/branch-analytics",
  "/target-dashboard",
  "/my-visits",
  "/visit-management-sidebar",
  "/billing-requests",
  "/dispatchment",
  "/task-dashboard",
  "/task-bucket",
  "/inventory-bucket",
]);

/** Nav routes hidden for head_of_department / hod only. */
export const HOD_HIDDEN_PATHS = new Set([
  "/companies",
  "/branches",
  "/employee-locations",
  "/billing-requests",
  "/batch-billing-requests",
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

/** Top-level nav GROUPS hidden for purchase_exicutive only, by group name —
 * these are now redundant/cluttered next to the dedicated Purchase Manager
 * screens (see _nav.js). Matched by name, not path, since these are whole
 * groups rather than single leaf routes. */
export const PURCHASE_MANAGER_HIDDEN_GROUP_NAMES = new Set([
  "Master",
  "Sales Order Master",
  "Delivery Master",
  "Purchase Master",
]);

/** Top-level nav GROUPS whose children are hoisted to the sidebar top level for
 * the procurement role — the items show directly instead of nested inside the
 * group wrapper. Matched by group name. */
export const PROCUREMENT_FLATTENED_GROUP_NAMES = new Set([
  "Procurement Master",
]);

export const DISPATCH_MANAGER_ALLOWED_PATHS = new Set(["/dispatchment"]);

export const INVENTORY_MANAGER_ALLOWED_PATHS = new Set(["/inventory-bucket"]);

export const FINANCE_ALLOWED_PATHS = new Set([
  "/billing-requests",
  "/po-payment",
  "/finance",
  "/sidebar-docs",
  "/payment/customer",
  "/payment/supplier",
  "/payment/overdue-supplier",
  "/order-tracking/finance",
]);

export const ADMIN_ALLOWED_PATHS = new Set([
  "/dashboard",
  "/companies",
  "/branches",
  "/zones",
  "/branch-settings",
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

const PURCHASE_ROLE_KEYS = new Set(["purchase_exicutive", "procurement"]);

/** The single dashboard the procurement role should see in the sidebar. */
export const PROCUREMENT_ALLOWED_DASHBOARD_PATH = "/purchase-dashboard";

/** Dashboard leaves that otherwise show for procurement but must be hidden so
 * only the final Purchase Dashboard remains. Procurement-only rule. */
export const PROCUREMENT_HIDDEN_DASHBOARD_PATHS = new Set([
  "/dashboard",
  "/sales-dashboard",
  "/pro-dashboard",
  "/hod-dashboard",
  "/finance",
]);

export const roleMatchesNavPrefix = (role, rolePrefix) => {
  const prefix = String(rolePrefix || "").toLowerCase();
  if (!prefix) return true;
  if (prefix === "purchase") return isPurchaseFamilyRole(role);
  return String(role || "")
    .toLowerCase()
    .startsWith(prefix);
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
    // Keep procurement's single-dashboard rule consistent when extras are
    // merged in on the pro-bucket route.
    if (
      normalized === "procurement" &&
      item.to &&
      item.to !== PROCUREMENT_ALLOWED_DASHBOARD_PATH &&
      PROCUREMENT_HIDDEN_DASHBOARD_PATHS.has(item.to)
    ) {
      return false;
    }
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
  const { role, strategy, isHod, isFullAccess, hasAnyPermission, permissions } =
    ctx;

  if (
    isBackOfficeRole(role) &&
    item.to &&
    BACK_OFFICE_HIDDEN_PATHS.has(item.to)
  ) {
    return false;
  }

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
    return Boolean(item.to && DISPATCH_MANAGER_ALLOWED_PATHS.has(item.to));
  }

  if (strategy === "inventory_manager") {
    return Boolean(item.to && INVENTORY_MANAGER_ALLOWED_PATHS.has(item.to));
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

  // Procurement sidebar shows only the final Purchase Dashboard: hide the
  // other dashboard leaves so a single dashboard remains. Procurement-only.
  if (
    role === "procurement" &&
    item.to &&
    item.to !== PROCUREMENT_ALLOWED_DASHBOARD_PATH &&
    PROCUREMENT_HIDDEN_DASHBOARD_PATHS.has(item.to)
  ) {
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

  const isProcurement = ctx.role === "procurement";

  const applyGroupFilter = (list, isTopLevel = false) =>
    list.flatMap((item) => {
      if (
        isPurchaseFamilyRole(ctx.role) &&
        PURCHASE_MANAGER_HIDDEN_GROUP_NAMES.has(item.name)
      ) {
        return [];
      }
      if (item.items) {
        const filteredItems = applyGroupFilter(item.items);
        if (filteredItems.length === 0) return [];
        // For procurement, collapse the "Dashboard" group into a single flat
        // "Dashboard" item that opens the Purchase Dashboard directly — no
        // nested sub-dashboard. Procurement-only.
        if (isTopLevel && isProcurement && item.name === "Dashboard") {
          const target =
            filteredItems.find(
              (child) => child.to === PROCUREMENT_ALLOWED_DASHBOARD_PATH,
            ) || filteredItems[0];
          return [
            {
              ...target,
              name: "Dashboard",
              icon: item.icon,
            },
          ];
        }
        // For procurement, hoist this group's children to the top level
        // instead of nesting them inside the group wrapper.
        if (
          isTopLevel &&
          isProcurement &&
          PROCUREMENT_FLATTENED_GROUP_NAMES.has(item.name)
        ) {
          return filteredItems;
        }
        return [{ ...item, items: filteredItems }];
      }
      return filter(item) ? [item] : [];
    });

  if (
    ctx.strategy === "admin" ||
    ctx.strategy === "finance" ||
    ctx.strategy === "dispatch_manager" ||
    ctx.strategy === "inventory_manager"
  ) {
    return applyGroupFilter(items, true);
  }

  return applyGroupFilter(
    items.filter((item) => item.items?.length || filter(item)),
    true,
  );
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

/**
 * Filters an already role-filtered nav tree down to items whose name
 * matches `query`, keeping any ancestor group that has a matching
 * descendant (so the branch stays intact, not just the leaf).
 */
export const filterNavBySearch = (items, query) => {
  const term = String(query || "")
    .trim()
    .toLowerCase();
  if (!term) return items;

  const walk = (list) =>
    (list || [])
      .map((item) => {
        const nameMatches =
          typeof item.name === "string" &&
          item.name.toLowerCase().includes(term);
        if (item.items?.length) {
          const children = walk(item.items);
          if (nameMatches || children.length) {
            return { ...item, items: nameMatches ? item.items : children };
          }
          return null;
        }
        return nameMatches ? item : null;
      })
      .filter(Boolean);

  return walk(items);
};
