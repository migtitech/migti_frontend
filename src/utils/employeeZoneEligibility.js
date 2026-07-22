/** Roles that use zone / sub-zone assignment (field sales). */
export const SALES_EMPLOYEE_ROLES = ["sales_manager", "sales_exicutive"];

export const isSalesEmployeeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .startsWith("sales");

export const isSalesEmployeeDesignation = (designation) =>
  /sales/i.test(String(designation || "").trim());

/** Show zone & sub-zone when role or designation is sales-related. */
export const shouldShowEmployeeZoneFields = (role, designation) =>
  isSalesEmployeeRole(role) || isSalesEmployeeDesignation(designation);

/**
 * F-EMP / D27: procurement/purchase-type roles map to product GROUPS (mandatory)
 * and hide the zone axis. Must match the backend
 * PROCUREMENT_PURCHASE_ROLES set (employee.service.js).
 */
export const PROCUREMENT_PURCHASE_ROLES = [
  "procurement",
  "purchase_manager",
  "purchase_exicutive",
  "localprocurement",
  "localpurchase",
];

export const isProcurementPurchaseRole = (role) =>
  PROCUREMENT_PURCHASE_ROLES.includes(
    String(role || "")
      .trim()
      .toLowerCase(),
  );

/** Show the group-mapping section (required) only for procurement/purchase roles. */
export const shouldShowEmployeeGroupFields = (role) =>
  isProcurementPurchaseRole(role);
