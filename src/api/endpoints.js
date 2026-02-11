

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4545/api'

export const API_VERSION = '/v1'

export const AUTH = {
  LOGIN: '/auth/login',
  ADMIN_LOGIN: '/admin/login',
  SUPERADMIN_LOGIN: '/admin/superadmin/login',
  EMPLOYEE_LOGIN: '/employees/login',
  LOGOUT: '/auth/logout',
  REGISTER: '/auth/register',
  REFRESH_TOKEN: '/auth/refresh-token',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  ME: '/auth/me',
}

export const USERS = {
  BASE: '/users',
  BY_ID: (id) => `/users/${id}`,
  PROFILE: '/users/profile',
  UPDATE_PASSWORD: '/users/update-password',
}

export const COMPANIES = {
  CREATE: '/companies/create',
  LIST: '/companies/list',
  GET_BY_ID: '/companies/get-by-id',
  UPDATE: '/companies/update',
  DELETE: '/companies/delete',
}

export const BRANCHES = {
  CREATE: '/company-branches/create',
  LIST: '/company-branches/list',
  GET_BY_ID: '/company-branches/get-by-id',
  UPDATE: '/company-branches/update',
  DELETE: '/company-branches/delete',
}

export const EMPLOYEES = {
  CREATE: '/employees/create',
  LIST: '/employees/list',
  GET_BY_ID: '/employees/get-by-id',
  UPDATE: '/employees/update',
  DELETE: '/employees/delete',
}

export const RAW_QUERIES = {
  CREATE: '/raw-queries/create',
  LIST: '/raw-queries/list',
  GET_BY_ID: '/raw-queries/get-by-id',
  UPDATE: '/raw-queries/update',
  DELETE: '/raw-queries/delete',
  ACTIVITIES: '/raw-queries/activities',
  RECORD_ACTIVITY: '/raw-queries/record-activity',
}

// Dashboard endpoints
export const DASHBOARD = {
  STATS: '/dashboard/stats',
  CHARTS: '/dashboard/charts',
  RECENT_ACTIVITY: '/dashboard/recent-activity',
}

export const CATEGORIES = {
  CREATE: '/categories/create',
  LIST: '/categories/list',
  GET_BY_ID: '/categories/get-by-id',
  UPDATE: '/categories/update',
  DELETE: '/categories/delete',
}

export const BRANDS = {
  CREATE: '/brands/create',
  LIST: '/brands/list',
  GET_BY_ID: '/brands/get-by-id',
  UPDATE: '/brands/update',
  DELETE: '/brands/delete',
}

export const PRODUCTS = {
  CREATE: '/products/create',
  LIST: '/products/list',
  GET_BY_ID: '/products/get-by-id',
  UPDATE: '/products/update',
  DELETE: '/products/delete',
  UPLOAD_IMAGES: '/products/upload-images',
  UPLOAD_IMAGES_S3: '/products/upload-images-s3',
}

export const IMAGES = {
  UPLOAD: '/images/upload',
  DELETE: '/images/delete',
}

export const SUPPLIERS = {
  CREATE: '/suppliers/create',
  LIST: '/suppliers/list',
  SEARCH: '/suppliers/search',
  GET_BY_ID: '/suppliers/get-by-id',
  UPDATE: '/suppliers/update',
  DELETE: '/suppliers/delete',
}

export const RATE_CARDS = {
  UPSERT_RATE: '/rate-cards/upsert-rate',
  BY_PRODUCT: '/rate-cards/by-product',
  BY_SUPPLIER: '/rate-cards/by-supplier',
  DELETE: '/rate-cards/delete',
  SEARCH_PRODUCTS: '/rate-cards/search-products',
  SEARCH_SUPPLIERS: '/rate-cards/search-suppliers',
}

export const AREAS = {
  CREATE: '/areas/create',
  LIST: '/areas/list',
  GET_BY_ID: '/areas/get-by-id',
  UPDATE: '/areas/update',
  DELETE: '/areas/delete',
}

export const INDUSTRIES = {
  CREATE: '/industries/create',
  LIST: '/industries/list',
  GET_BY_ID: '/industries/get-by-id',
  UPDATE: '/industries/update',
  DELETE: '/industries/delete',
}

export const QUERIES = {
  CREATE: '/queries/create',
  LIST: '/queries/list',
  GET_BY_ID: '/queries/get-by-id',
  UPDATE: '/queries/update',
  DELETE: '/queries/delete',
  ACTIVITIES: '/queries/activities',
  RECORD_ACTIVITY: '/queries/record-activity',
}

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
  BRANDS,
  PRODUCTS,
  SUPPLIERS,
  RATE_CARDS,
<<<<<<< HEAD
  IMAGES,
=======
  AREAS,
  INDUSTRIES,
  QUERIES,
>>>>>>> origin/develop
}
