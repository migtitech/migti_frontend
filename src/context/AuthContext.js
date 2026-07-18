import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import authService from "../services/authService";
import {
  getAccessToken,
  getRefreshToken,
  clearTokens,
  setTokens,
} from "../api/axiosClient";
import { hasValidAccessSession, USER_STORAGE_KEY } from "../utils/authSession";

const AuthContext = createContext(null);

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  HEAD_OF_DEPARTMENT: "head_of_department",
  SALES_MANAGER: "sales_manager",
  SALES_EXICUTIVE: "sales_exicutive",
  PURCHASE_EXICUTIVE: "purchase_exicutive",
  PROCUREMENT: "procurement",
  BACK_OFFICE_EXICUTIVE: "back_office_exicutive",
  ADMINISTRATOR: "administrator",
  FINANCE: "finance",
  INVENTRY_MANAGER: "inventry_manager",
  DISPATCH_MANAGER: "dispatch_manager",
  LOCAL_PROCUREMENT: "localprocurement",
  LOCAL_PURCHASE: "localpurchase",
  PROCUREMENT_MASTER: "procurement_master",
  PURCHASE_MANAGER: "purchase_manager",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.HEAD_OF_DEPARTMENT]: "Head Of Department",
  [ROLES.SALES_MANAGER]: "Sales Manager",
  [ROLES.SALES_EXICUTIVE]: "Sales Exicutive",
  [ROLES.PURCHASE_EXICUTIVE]: "Purchase Exicutive",
  [ROLES.PROCUREMENT]: "Procurement",
  [ROLES.BACK_OFFICE_EXICUTIVE]: "Back Office Exicutive",
  [ROLES.ADMINISTRATOR]: "Administrator",
  [ROLES.FINANCE]: "Finance",
  [ROLES.INVENTRY_MANAGER]: "Inventry Manager",
  [ROLES.DISPATCH_MANAGER]: "Dispatch Manager",
  [ROLES.LOCAL_PROCUREMENT]: "Local Procurement",
  [ROLES.LOCAL_PURCHASE]: "Local Purchase",
  [ROLES.PROCUREMENT_MASTER]: "Procurement Master",
  [ROLES.PURCHASE_MANAGER]: "Purchase Manager",
};

// Roles that get full access to everything (no permission checks needed)
export const FULL_ACCESS_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.HEAD_OF_DEPARTMENT,
];

/**
 * Demo-only credentials for the Procurement Master sample section. Handled
 * entirely on the frontend (no API call) — see login() below.
 */
const PROCUREMENT_MASTER_DEMO_CREDENTIALS = {
  email: "procurement@gmail.com",
  password: "123456",
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const sessionValid = hasValidAccessSession(getAccessToken, getRefreshToken);

    if (storedUser && sessionValid) {
      setUser(JSON.parse(storedUser));
    } else if (storedUser || getAccessToken() || getRefreshToken()) {
      clearTokens();
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password, role) => {
    if (role === ROLES.PROCUREMENT_MASTER) {
      const emailMatches =
        String(email || "")
          .trim()
          .toLowerCase() === PROCUREMENT_MASTER_DEMO_CREDENTIALS.email;
      if (
        emailMatches &&
        password === PROCUREMENT_MASTER_DEMO_CREDENTIALS.password
      ) {
        const userData = {
          name: "Procurement Master",
          email: PROCUREMENT_MASTER_DEMO_CREDENTIALS.email,
          role: ROLES.PROCUREMENT_MASTER,
          permissions: [],
        };
        setTokens(
          "mock-procurement-master-token",
          "mock-procurement-master-token",
        );
        setUser(userData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        return { success: true, user: userData };
      }
      return { success: false, error: "Invalid email or password" };
    }

    if (role === ROLES.SUPER_ADMIN) {
      try {
        const response = await authService.loginSuperAdmin(email, password);
        if (response?.success) {
          const apiUser = response?.data?.superAdmin || {};
          const userData = {
            ...apiUser,
            role: ROLES.SUPER_ADMIN,
          };
          setUser(userData);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
          return { success: true, user: userData };
        }
        return {
          success: false,
          error: response?.message || "Login failed",
        };
      } catch (error) {
        return {
          success: false,
          error: error?.message || "Login failed",
        };
      }
    }

    if (role === ROLES.ADMIN) {
      try {
        const response = await authService.loginAdmin(email, password);
        if (response?.success) {
          const apiUser = response?.data?.admin || {};
          const userData = {
            ...apiUser,
            role: ROLES.ADMIN,
          };
          setUser(userData);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
          return { success: true, user: userData };
        }
        return {
          success: false,
          error: response?.message || "Login failed",
        };
      } catch (error) {
        return {
          success: false,
          error: error?.message || "Login failed",
        };
      }
    }

    if (
      [
        ROLES.HEAD_OF_DEPARTMENT,
        ROLES.SALES_MANAGER,
        ROLES.SALES_EXICUTIVE,
        ROLES.PURCHASE_EXICUTIVE,
        ROLES.PROCUREMENT,
        ROLES.BACK_OFFICE_EXICUTIVE,
        ROLES.ADMINISTRATOR,
        ROLES.FINANCE,
        ROLES.INVENTRY_MANAGER,
        ROLES.DISPATCH_MANAGER,
        ROLES.LOCAL_PROCUREMENT,
        ROLES.LOCAL_PURCHASE,
        ROLES.PURCHASE_MANAGER,
      ].includes(role)
    ) {
      try {
        const response = await authService.loginEmployee(email, password, role);
        if (response?.success) {
          const apiUser = response?.data?.employee || {};
          const userData = {
            ...apiUser,
            role: apiUser?.role || role,
          };
          setUser(userData);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
          return { success: true, user: userData };
        }
        return {
          success: false,
          error: response?.message || "Login failed",
        };
      } catch (error) {
        return {
          success: false,
          error: error?.message || "Login failed",
        };
      }
    }

    return { success: false, error: "Role not supported" };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    clearTokens();
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      loading,
      isAuthenticated:
        !!user && hasValidAccessSession(getAccessToken, getRefreshToken),
    }),
    [user, login, logout, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
