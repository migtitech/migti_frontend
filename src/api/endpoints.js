export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7200/api";

/** Socket.IO server URL (same host as API, no /api path) */
export const getSocketUrl = () => {
  const base = BASE_URL.replace(/\/api\/?$/, "");
  return (
    base ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:7200")
  );
};

/** Base URL for assets (no /api). Use for image src: getAssetsUrl(document.path) */
export const getAssetsBaseUrl = () => {
  const base = BASE_URL.replace(/\/api\/?$/, "");
  return base || (typeof window !== "undefined" ? window.location.origin : "");
};
/** If path is full URL (e.g. S3), return as-is; else build local /assets/ URL */
export const getAssetsUrl = (path) => {
  if (!path) return "";
  if (
    typeof path === "string" &&
    (path.startsWith("http://") || path.startsWith("https://"))
  )
    return path;
  return `${getAssetsBaseUrl()}/assets/${path}`;
};

export const API_VERSION = "/v1";

export const AUTH = {
  LOGIN: "/auth/login",
  ADMIN_LOGIN: "/admin/login",
  SUPERADMIN_LOGIN: "/admin/superadmin/login",
  EMPLOYEE_LOGIN: "/employees/login",
  LOGOUT: "/auth/logout",
  REGISTER: "/auth/register",
  REFRESH_TOKEN: "/auth/refresh-token",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  VERIFY_EMAIL: "/auth/verify-email",
  ME: "/auth/me",
};

export const USERS = {
  BASE: "/users",
  BY_ID: (id) => `/users/${id}`,
  PROFILE: "/users/profile",
  UPDATE_PASSWORD: "/users/update-password",
};

export const COMPANIES = {
  CREATE: "/companies/create",
  LIST: "/companies/list",
  GET_BY_ID: "/companies/get-by-id",
  UPDATE: "/companies/update",
  DELETE: "/companies/delete",
  UPLOAD_LOGO: "/companies/upload-logo",
};

export const BRANCHES = {
  CREATE: "/company-branches/create",
  LIST: "/company-branches/list",
  GET_BY_ID: "/company-branches/get-by-id",
  UPDATE: "/company-branches/update",
  DELETE: "/company-branches/delete",
};

export const EMPLOYEES = {
  CREATE: "/employees/create",
  LIST: "/employees/list",
  GET_BY_ID: "/employees/get-by-id",
  UPDATE: "/employees/update",
  DELETE: "/employees/delete",
};

export const RAW_QUERIES = {
  CREATE: "/raw-queries/create",
  LIST: "/raw-queries/list",
  GET_BY_ID: "/raw-queries/get-by-id",
  UPDATE: "/raw-queries/update",
  DELETE: "/raw-queries/delete",
  ACTIVITIES: "/raw-queries/activities",
  RECORD_ACTIVITY: "/raw-queries/record-activity",
};

// Dashboard endpoints
export const DASHBOARD = {
  STATS: "/dashboard/stats",
  CHARTS: "/dashboard/charts",
  RECENT_ACTIVITY: "/dashboard/recent-activity",
};

export const CATEGORIES = {
  CREATE: "/categories/create",
  LIST: "/categories/list",
  GET_BY_ID: "/categories/get-by-id",
  UPDATE: "/categories/update",
  DELETE: "/categories/delete",
};

export const GROUPS = {
  CREATE: "/groups/create",
  LIST: "/groups/list",
  GET_BY_ID: "/groups/get-by-id",
  UPDATE: "/groups/update",
  DELETE: "/groups/delete",
};

export const BRANDS = {
  CREATE: "/brands/create",
  LIST: "/brands/list",
  GET_BY_ID: "/brands/get-by-id",
  UPDATE: "/brands/update",
  DELETE: "/brands/delete",
};

export const PRODUCTS = {
  CREATE: "/products/create",
  LIST: "/products/list",
  GET_BY_ID: "/products/get-by-id",
  UPDATE: "/products/update",
  DELETE: "/products/delete",
  UPLOAD_IMAGES: "/products/upload-images",
};

export const QUERY_NEW_PRODUCTS = {
  CREATE: "/query-new-products/create",
  LIST: "/query-new-products/list",
  GET_BY_ID: "/query-new-products/get-by-id",
  DELETE: "/query-new-products/delete",
};

export const DOCUMENTS = {
  UPLOAD: "/documents/upload",
  UPLOAD_ATTACHMENT: "/documents/upload-attachment",
  SERVE: (id) => `/documents/serve/${id}`,
};

export const SUPPLIERS = {
  CREATE: "/suppliers/create",
  LIST: "/suppliers/list",
  SEARCH: "/suppliers/search",
  GET_BY_ID: "/suppliers/get-by-id",
  UPDATE: "/suppliers/update",
  DELETE: "/suppliers/delete",
  UPLOAD_CATALOG: "/suppliers/upload-catalog",
};

export const RATE_CARDS = {
  UPSERT_RATE: "/rate-cards/upsert-rate",
  BY_PRODUCT: "/rate-cards/by-product",
  BY_SUPPLIER: "/rate-cards/by-supplier",
  DELETE: "/rate-cards/delete",
  SEARCH_PRODUCTS: "/rate-cards/search-products",
  SEARCH_SUPPLIERS: "/rate-cards/search-suppliers",
};

export const AREAS = {
  CREATE: "/areas/create",
  LIST: "/areas/list",
  GET_BY_ID: "/areas/get-by-id",
  UPDATE: "/areas/update",
  DELETE: "/areas/delete",
};

export const SUB_ZONES = {
  CREATE: "/sub-zones/create",
  LIST: "/sub-zones/list",
  LIST_GROUPED: "/sub-zones/list-grouped",
  UPDATE: "/sub-zones/update",
  DELETE: "/sub-zones/delete",
};

export const INDUSTRIES = {
  CREATE: "/industries/create",
  LIST: "/industries/list",
  GET_BY_ID: "/industries/get-by-id",
  UPDATE: "/industries/update",
  DELETE: "/industries/delete",
};

export const INDUSTRY_BRANCHES = {
  CREATE: "/industry-branches/create",
  LIST: "/industry-branches/list",
  GET_BY_ID: "/industry-branches/get-by-id",
  UPDATE: "/industry-branches/update",
  DELETE: "/industry-branches/delete",
};

export const QUERIES = {
  CREATE: "/queries/create",
  LIST: "/queries/list",
  BY_INDUSTRY: "/queries/by-industry",
  TODAY_STATS: "/queries/today-stats",
  SALES_DASHBOARD_CARDS: "/queries/sales-dashboard-cards",
  SALES_RECENT_BILLINGS: "/queries/sales-recent-billings",
  HOD_DASHBOARD_CARDS: "/queries/hod-dashboard-cards",
  BRANCH_ANALYTICS: "/queries/branch-analytics",
  TARGET_ANALYTICS: "/queries/target-analytics",
  TARGET_ANALYTICS_SUMMARY: "/queries/target-analytics/summary",
  TARGET_ANALYTICS_ZONE: "/queries/target-analytics/zone",
  TARGET_ANALYTICS_ZONE_SUMMARY: "/queries/target-analytics/zone/summary",
  TARGET_ANALYTICS_EMPLOYEE: "/queries/target-analytics/employee",
  TARGET_ANALYTICS_EMPLOYEE_SUMMARY:
    "/queries/target-analytics/employee/summary",
  GET_BY_ID: "/queries/get-by-id",
  UPDATE: "/queries/update",
  DELETE: "/queries/delete",
  CONVERT_TO_QUOTATION: "/queries/convert-to-quotation",
  LINK_CONVERTED_QUOTATION: "/queries/link-converted-quotation",
  ACTIVITIES: "/queries/activities",
  RECORD_ACTIVITY: "/queries/record-activity",
  EXPORT_PDF: "/queries/export-pdf",
};

export const QUOTATIONS = {
  LIST: "/quotations/list",
  BY_INDUSTRY: "/quotations/by-industry",
  GET_BY_ID: "/quotations/get-by-id",
  SNAPSHOTS_LIST: "/quotations/snapshots/list",
  UPDATE: "/quotations/update",
  UPDATE_STATUS: "/quotations/update-status",
  EXPORT_PDF: "/quotations/export-pdf",
  RATE_LOGS_LIST: "/quotations/rate-logs/list",
  DELETE: "/quotations/delete",
};

export const PURCHASE_ORDERS = {
  LIST: "/purchase-orders/list",
  GET_BY_ID: "/purchase-orders/get-by-id",
  BY_QUOTATION: "/purchase-orders/by-quotation",
  CREATE_FROM_QUOTATION: "/purchase-orders/create-from-quotation",
  UPDATE: "/purchase-orders/update",
  UPDATE_STATUS: "/purchase-orders/update-status",
  APPEND_PAYMENT: "/purchase-orders/append-payment",
};

export const PURCHASE_TASKS = {
  ASSIGN: "/purchase-tasks/assign",
  MY_TASKS: "/purchase-tasks/my-tasks",
  UPDATE_STATUS: "/purchase-tasks/update-status",
  UPDATE_REMARK: "/purchase-tasks/update-remark",
  RATE_BUCKET: "/purchase-tasks/rate-bucket",
  ADMIN_LIST: "/purchase-tasks/admin-list",
};

export const PO_BILLING = {
  CREATE_PO: "/po-billing/po/create",
  CREATE_BILLING: "/po-billing/billing/create",
  ANALYTICS: "/po-billing/analytics",
  FORM_OPTIONS: "/po-billing/form-options",
};

export const VISITS = {
  CREATE: "/visits/create",
  LIST: "/visits/list",
  MY_VISITS: "/visits/my-visits",
  COMPLETE_WITH_REMARK: "/visits/complete-with-remark",
};

export const EMPLOYEE_LOCATIONS = {
  CREATE: "/employee-locations/create",
  LIST: "/employee-locations/list",
  LATEST: "/employee-locations/latest",
  TEAM_LATEST: "/employee-locations/team-latest",
  HISTORY_BINNED: "/employee-locations/history-binned",
};

export const TASK_MANAGEMENT = {
  CREATE: "/task-management/create",
  LIST: "/task-management/list",
  MY_TASKS: "/task-management/my-tasks",
  GET_BY_ID: (id) => `/task-management/get-by-id/${id}`,
  ASSIGN_EMPLOYEE: "/task-management/assign-employee",
  UPDATE_SUPPLIER: "/task-management/update-supplier",
  UPDATE: "/task-management/update",
  DELETE: "/task-management/delete",
};

export const ADMIN = {
  PERMISSIONS_MODULES: "/admin/permissions/modules",
};

// Export all endpoints
export default {
  BASE_URL,
  API_VERSION,
  AUTH,
  USERS,
  COMPANIES,
  BRANCHES,
  EMPLOYEES,
  RAW_QUERIES,
  DASHBOARD,
  CATEGORIES,
  GROUPS,
  BRANDS,
  PRODUCTS,
  QUERY_NEW_PRODUCTS,
  SUPPLIERS,
  RATE_CARDS,
  AREAS,
  INDUSTRIES,
  INDUSTRY_BRANCHES,
  QUERIES,
  QUOTATIONS,
  PURCHASE_ORDERS,
  PURCHASE_TASKS,
  PO_BILLING,
  VISITS,
  EMPLOYEE_LOCATIONS,
  TASK_MANAGEMENT,
};
