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
