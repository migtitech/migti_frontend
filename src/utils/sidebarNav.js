import navigation, { PURCHASE_ROLE_NAV, FINANCE_ROLE_NAV } from "../_nav";
import {
  isBackOfficeRole,
  isPurchaseFamilyRole,
  normalizeRole,
} from "../hooks/usePermissions";

// Nav component discriminators (mirror _nav.js CNavGroup / CNavItem).
const CNAV_GROUP = "group";
const CNAV_ITEM = "item";

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

/** Purchase Master role (purchase_manager) sees ONLY these sidebar paths —
 * everything else is hidden for this role. This is a purchase_manager-only
 * allowlist; it does not affect HOD or any other role. Company Information
 * children (Companies / Branches / Documents) are included so that group
 * shows with its items. */
export const PURCHASE_MASTER_ALLOWED_PATHS = new Set([
  "/purchase-master/dashboard",
  "/purchase-master/suppliers",
  "/supplier-contacts",
  "/purchase-master/purchase-requests",
  "/purchase-master/purchase-order",
  "/purchase-master/grn",
  "/purchase-master/purchase-return",
  "/purchase-master/vendor-payments",
  "/purchase-master/reports/my-performance",
  // Company Information group children:
  "/companies",
  "/branches",
  "/sidebar-docs",
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

  if (strategy === "purchase_master") {
    return Boolean(item.to && PURCHASE_MASTER_ALLOWED_PATHS.has(item.to));
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
  if (role === "purchase_manager") return "purchase_master";
  if (role === "finance") return "finance";
  if (role === "admin") return "admin";
  if (role === "dispatch_manager") return "dispatch_manager";
  if (role === "inventry_manager") return "inventory_manager";
  // Every sales-family role (sales_manager, sales_exicutive, …) gets the
  // curated Sales sidebar (reuses the real HOD sections; see buildSalesNav).
  if (String(role || "").startsWith("sales")) return "sales";
  // Procurement gets its own curated sidebar (see buildProcurementNav).
  if (role === "procurement") return "procurement";
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

// ---- Sales role curated sidebar --------------------------------------------
// Legacy sample-data pages (superseded by the real HOD sections for Sales).
const SALES_DEMO_PREFIX = "/sales-master/";
// Leaves shown as their own top-level Sales sections (hoisted out of groups).
const SALES_HOISTED_PATHS = new Set(["/pending-payment", "/my-targets"]);
// Supplier sub-items hidden under Business Partner for Sales.
const SALES_SUPPLIER_HIDDEN = new Set(["/suppliers", "/supplier-contacts"]);
// Product Master: Sales sees only the Product Sale List.
const SALES_PRODUCT_ONLY = new Set(["/product-sale-list"]);
// Query Master: hide Report for Sales.
const SALES_QUERY_HIDDEN = new Set(["/query-master/report"]);
// Quotation Master: hide Quotation Products + Report for Sales.
const SALES_QUOTATION_HIDDEN = new Set([
  "/quotation-products",
  "/quotation-master/report",
]);
// Sales Order Master: Sales sees only the Create Sales Order screen.
const SALES_ORDER_CREATE_PATH = "/sales-master/sales-order/create";

const findNodeByTo = (items, to) => {
  for (const it of items || []) {
    if (it.to === to) return it;
    if (it.items?.length) {
      const found = findNodeByTo(it.items, to);
      if (found) return found;
    }
  }
  return null;
};

/** Remove leaves matching `shouldRemove`, pruning any group left empty. */
const stripLeaves = (items, shouldRemove) =>
  (items || []).flatMap((it) => {
    if (it.items?.length) {
      const kids = stripLeaves(it.items, shouldRemove);
      return kids.length ? [{ ...it, items: kids }] : [];
    }
    return shouldRemove(it) ? [] : [it];
  });

/**
 * Builds the curated Sales sidebar. Reuses the real HOD sections (same routes)
 * and only decides ordering/visibility — no new pages. Order:
 *   Dashboard, Due Payment, Business Partner, Product Master, Query Master,
 *   Quotation Master, Sales Order Master, My Performance, Company Information,
 *   Miscellaneous (everything else the role can access).
 */
const buildSalesNav = (navItems, ctx) => {
  const duNode = findNodeByTo(navItems, "/pending-payment");
  const mpNode = findNodeByTo(navItems, "/my-targets");

  // Standard visibility (role flags + granted permissions).
  const base = filterNavigationItems(navItems, { ...ctx, strategy: "default" });
  const canDuePayment = !!findNodeByTo(base, "/pending-payment");
  const canMyPerformance = !!findNodeByTo(base, "/my-targets");

  // Drop superseded demo pages and the leaves hoisted to the top level.
  const cleaned = stripLeaves(
    base,
    (it) =>
      !!it.to &&
      (it.to.startsWith(SALES_DEMO_PREFIX) || SALES_HOISTED_PATHS.has(it.to)),
  );

  const byName = new Map(cleaned.map((i) => [i.name, i]));
  const consumed = new Set();
  const out = [];
  const take = (name, transform) => {
    const node = byName.get(name);
    if (!node) return;
    consumed.add(name);
    const result = transform ? transform(node) : node;
    if (!result) return;
    if (Array.isArray(result.items) && result.items.length === 0) return;
    out.push(result);
  };

  // 1. Dashboard → single item opening the Sales Dashboard (no sub-heading).
  take("Dashboard", (node) => {
    const target =
      node.items?.find((c) => c.to === "/sales-dashboard") || node.items?.[0];
    return target ? { ...target, name: "Dashboard", icon: node.icon } : null;
  });
  // 2. Due Payment (hoisted).
  if (canDuePayment && duNode) {
    out.push({
      component: CNAV_ITEM,
      name: "Due Payment",
      to: "/pending-payment",
      icon: duNode.icon,
    });
  }
  // 3. Business Partner (Supplier sub-items hidden).
  take("Business Partner", (node) => {
    const items = (node.items || []).filter(
      (c) => !SALES_SUPPLIER_HIDDEN.has(c.to),
    );
    return items.length ? { ...node, items } : null;
  });
  // 4. Product Master — only the Product Sale List.
  take("Product Master", (node) => {
    const items = (node.items || []).filter((c) =>
      SALES_PRODUCT_ONLY.has(c.to),
    );
    return items.length ? { ...node, items } : null;
  });
  // 5. Query Master — hide Report.
  take("Query Master", (node) => {
    const items = (node.items || []).filter(
      (c) => !SALES_QUERY_HIDDEN.has(c.to),
    );
    return items.length ? { ...node, items } : null;
  });
  // 6. Quotation Master — hide Quotation Products + Report.
  take("Quotation Master", (node) => {
    const items = (node.items || []).filter(
      (c) => !SALES_QUOTATION_HIDDEN.has(c.to),
    );
    return items.length ? { ...node, items } : null;
  });
  // 7. Sales Order Master — only the Create Sales Order screen.
  {
    const soGroup = byName.get("Sales Order Master");
    const createNode = findNodeByTo(navItems, SALES_ORDER_CREATE_PATH);
    consumed.add("Sales Order Master");
    out.push({
      component: CNAV_GROUP,
      name: "Sales Order Master",
      icon: soGroup?.icon,
      items: [
        {
          component: CNAV_ITEM,
          name: "Create Sales Order",
          to: SALES_ORDER_CREATE_PATH,
          icon: createNode?.icon,
        },
      ],
    });
  }
  // 8. My Performance (hoisted).
  if (canMyPerformance && mpNode) {
    out.push({
      component: CNAV_ITEM,
      name: "My Performance",
      to: "/my-targets",
      icon: mpNode.icon,
    });
  }
  // 9. Company Information.
  take("Company Information");

  // Miscellaneous is intentionally omitted — Sales sees only the curated
  // sections above; everything else is hidden.
  return out;
};

// ---- Procurement role curated sidebar --------------------------------------
// Business Partner: Client/Customer side hidden (procurement is supplier-side).
const PROC_CLIENT_HIDDEN = new Set(["/industries", "/customer-contacts"]);
// Dashboard collapses to the Purchase Dashboard for procurement.
const PROC_DASHBOARD_PATH = "/purchase-dashboard";
// "My Performance" opens a clean, standalone report of the person's own work
// (no cross-section sub-nav) — frontend-only, no permission gating so the
// procurement role can access it. The old /my-targets page needs
// target_analytics permission the role lacks.
const PROC_MY_PERFORMANCE_PATH = "/my-performance";
// Icon reused from the My Targets nav node.
const PROC_MY_PERFORMANCE_ICON_PATH = "/my-targets";

/**
 * Builds the curated Procurement sidebar. Reuses the real HOD sections. Order:
 *   Dashboard, Business Partner (no Client), Procurement Master, Purchase
 *   Master, My Performance, Company Information, Miscellaneous.
 */
const buildProcurementNav = (navItems, ctx) => {
  const mpNode = findNodeByTo(navItems, PROC_MY_PERFORMANCE_ICON_PATH);

  // Standard visibility, with the legacy procurement flatten/collapse quirks
  // suppressed (curatedBase) so Procurement/Purchase Master stay real groups.
  const base = filterNavigationItems(navItems, {
    ...ctx,
    strategy: "default",
    curatedBase: true,
  });

  const byName = new Map(base.map((i) => [i.name, i]));
  const consumed = new Set();
  const out = [];
  const take = (name, transform) => {
    const node = byName.get(name);
    if (!node) return;
    consumed.add(name);
    const result = transform ? transform(node) : node;
    if (!result) return;
    if (Array.isArray(result.items) && result.items.length === 0) return;
    out.push(result);
  };

  // 1. Dashboard → single item opening the Purchase Dashboard (no sub-heading).
  take("Dashboard", (node) => {
    const target =
      node.items?.find((c) => c.to === PROC_DASHBOARD_PATH) || node.items?.[0];
    return target ? { ...target, name: "Dashboard", icon: node.icon } : null;
  });
  // 2. Business Partner (Client / Customer side hidden).
  take("Business Partner", (node) => {
    const items = (node.items || []).filter(
      (c) => !PROC_CLIENT_HIDDEN.has(c.to),
    );
    return items.length ? { ...node, items } : null;
  });
  // 3. Procurement Master — all HOD items the role can access.
  take("Procurement Master");
  // 4. Purchase Master — all HOD items the role can access.
  take("Purchase Master");
  // 5. My Performance (reuse My Targets; hardcoded since it is sales-gated in nav).
  out.push({
    component: CNAV_ITEM,
    name: "My Performance",
    to: PROC_MY_PERFORMANCE_PATH,
    icon: mpNode?.icon,
  });
  // 6. Company Information.
  take("Company Information");

  // Miscellaneous intentionally omitted — Procurement sees only the curated
  // sections above; everything else is hidden.
  return out;
};

// ---- Finance role curated sidebar ------------------------------------------
/**
 * Builds the curated Finance sidebar. Unlike Sales/Procurement (which reuse the
 * HOD sections), Finance has its own dedicated pages under /finance/*, so the
 * tree is fully defined in _nav.js (FINANCE_ROLE_NAV) and returned as-is — no
 * permission filtering. The finance role reaches these routes via the frontend
 * gate in ProtectedRoute (isFinanceAllowedPath), which also keeps it off every
 * other path. Order: Dashboard, Purchase Requests, Purchase Return Requests,
 * Amount Due (Client / Supplier), Billing, Payments (To Make / Hold).
 */
const buildFinanceNav = () => FINANCE_ROLE_NAV;

/**
 * Filter top-level navigation (and nested groups) for the current user role.
 */
export const filterNavigationItems = (navItems, ctx) => {
  const filter = (item) => isNavItemVisible(item, ctx);
  const items = navItems || [];

  if (ctx.strategy === "sales") {
    return buildSalesNav(navItems, ctx);
  }

  if (ctx.strategy === "procurement") {
    return buildProcurementNav(navItems, ctx);
  }

  if (ctx.strategy === "finance") {
    return buildFinanceNav();
  }

  if (ctx.strategy === "roles_only") {
    return items.filter(filter);
  }

  // Legacy procurement flatten/collapse quirks are suppressed while collecting
  // the curated base (see buildProcurementNav) so groups stay intact.
  const isProcurement = ctx.role === "procurement" && !ctx.curatedBase;

  const applyGroupFilter = (list, isTopLevel = false) =>
    list.flatMap((item) => {
      if (
        isPurchaseFamilyRole(ctx.role) &&
        !ctx.curatedBase &&
        PURCHASE_MANAGER_HIDDEN_GROUP_NAMES.has(item.name)
      ) {
        return [];
      }
      // Purchase Master (purchase_manager) shows a fixed flat list of items plus
      // the Company Information group only. Every other top-level GROUP is
      // dropped so an allowlisted leaf that also lives inside some other group
      // (e.g. Suppliers Contacts under Business Partner) doesn't reappear
      // nested there — it shows only as the intended flat item.
      if (
        ctx.strategy === "purchase_master" &&
        isTopLevel &&
        item.items &&
        item.name !== "Company Information"
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
    ctx.strategy === "purchase_master" ||
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
  // Curated sidebars (sales/procurement/finance) are already final — skip the
  // pro-bucket-route augmentation that would merge extra purchase items.
  if (
    ctx.strategy === "sales" ||
    ctx.strategy === "procurement" ||
    ctx.strategy === "finance"
  ) {
    return filtered;
  }
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
