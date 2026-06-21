import axios from "axios";
import { BASE_URL, API_VERSION, AUTH } from "./endpoints";
import {
  clearAuthStorage,
  hasValidAccessSession,
  isTokenExpired,
} from "../utils/authSession";

// Create axios instance
const axiosClient = axios.create({
  baseURL: `${BASE_URL}${API_VERSION}`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management
const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

let authFailureInProgress = false;

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setTokens = (accessToken, refreshToken) => {
  authFailureInProgress = false;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const AUTH_BYPASS_401_PATHS = new Set([
  AUTH.LOGIN,
  AUTH.ADMIN_LOGIN,
  AUTH.SUPERADMIN_LOGIN,
  AUTH.EMPLOYEE_LOGIN,
  AUTH.EMPLOYEE_PASSWORD_RESET_REQUEST,
  AUTH.REFRESH_TOKEN,
]);

let authFailureHandler = null;

export const registerAuthFailureHandler = (handler) => {
  authFailureHandler = handler;
  return () => {
    authFailureHandler = null;
    authFailureInProgress = false;
  };
};

const triggerAuthFailure = () => {
  if (authFailureInProgress) return;
  authFailureInProgress = true;
  clearAuthStorage();

  if (authFailureHandler) {
    authFailureHandler();
    return;
  }

  const base = `${window.location.origin}${window.location.pathname || "/"}`;
  window.location.replace(`${base}#/login`);
};

const isAuthBypassRequest = (url) =>
  AUTH_BYPASS_401_PATHS.has(String(url || ""));

const rejectUnauthenticatedRequest = () => {
  triggerAuthFailure();
  return Promise.reject({
    status: 401,
    message: "Session expired. Please log in again.",
    errors: null,
    data: null,
    cancelled: true,
  });
};

// Request interceptor — block protected requests without a valid session
axiosClient.interceptors.request.use(
  (config) => {
    const requestUrl = String(config.url || "");
    if (isAuthBypassRequest(requestUrl)) {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }

    const token = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!token && !refreshToken) {
      return rejectUnauthenticatedRequest();
    }

    if (token && isTokenExpired(token) && !refreshToken) {
      return rejectUnauthenticatedRequest();
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
axiosClient.interceptors.response.use(
  (response) => {
    if (response.config.responseType === "blob") return response;
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message || "";
    const requestUrl = String(originalRequest.url || "");
    if (
      status === 401 &&
      !isAuthBypassRequest(requestUrl) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${BASE_URL}${API_VERSION}${AUTH.REFRESH_TOKEN}`,
            {
              refreshToken,
            },
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          setTokens(accessToken, newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return axiosClient(originalRequest);
        } catch (refreshError) {
          triggerAuthFailure();
          return Promise.reject(refreshError);
        }
      }

      triggerAuthFailure();
      const errorResponse = {
        status: error.response?.status,
        message:
          error.response?.data?.message || error.message || "An error occurred",
        errors: error.response?.data?.errors || null,
        data: error.response?.data || null,
      };
      return Promise.reject(errorResponse);
    }

    // Some backends return 403 for invalid/mismatched token
    if (status === 403) {
      const msg = String(errorMessage).toLowerCase();
      if (
        msg.includes("unauthorized") ||
        msg.includes("forbidden") ||
        msg.includes("token") ||
        msg.includes("jwt")
      ) {
        triggerAuthFailure();
      }
    }

    // Format error response
    const errorResponse = {
      status: error.response?.status,
      message:
        error.response?.data?.message || error.message || "An error occurred",
      errors:
        error.response?.data?.errors || error.response?.data?.error || null,
      data: error.response?.data || null,
    };

    return Promise.reject(errorResponse);
  },
);

// HTTP methods
export const api = {
  get: (url, config = {}) => axiosClient.get(url, config),
  post: (url, data, config = {}) => axiosClient.post(url, data, config),
  put: (url, data, config = {}) => axiosClient.put(url, data, config),
  patch: (url, data, config = {}) => axiosClient.patch(url, data, config),
  delete: (url, config = {}) => axiosClient.delete(url, config),
};

export default axiosClient;
