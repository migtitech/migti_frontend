import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import authService from "../services/authService";
import { getAccessToken, clearTokens } from "../api/axiosClient";

const AuthContext = createContext(null);

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  HEAD_OF_DEPARTMENT: "head_of_department",
  SALES_MANAGER: "sales_manager",
  SALES_EXICUTIVE: "sales_exicutive",
  PURCHASE_MANAGER: "purchase_manager",
  PURCHASE_EXICUTIVE: "purchase_exicutive",
  BACK_OFFICE_EXICUTIVE: "back_office_exicutive",
  ADMINISTRATOR: "administrator",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.HEAD_OF_DEPARTMENT]: "Head Of Department",
  [ROLES.SALES_MANAGER]: "Sales Manager",
  [ROLES.SALES_EXICUTIVE]: "Sales Exicutive",
  [ROLES.PURCHASE_MANAGER]: "Purchase Manager",
  [ROLES.PURCHASE_EXICUTIVE]: "Purchase Exicutive",
  [ROLES.BACK_OFFICE_EXICUTIVE]: "Back Office Exicutive",
  [ROLES.ADMINISTRATOR]: "Administrator",
};

// Roles that get full access to everything (no permission checks needed)
export const FULL_ACCESS_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.HEAD_OF_DEPARTMENT,
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session: require BOTH user and access token
    const storedUser = localStorage.getItem("migticrm_user");
    const token = getAccessToken();
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    } else if (storedUser && !token) {
      // Token missing or cleared (e.g. expired) – clear stale user
      localStorage.removeItem("migticrm_user");
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password, role) => {
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
          localStorage.setItem("migticrm_user", JSON.stringify(userData));
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
          localStorage.setItem("migticrm_user", JSON.stringify(userData));
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
        ROLES.PURCHASE_MANAGER,
        ROLES.PURCHASE_EXICUTIVE,
        ROLES.BACK_OFFICE_EXICUTIVE,
        ROLES.ADMINISTRATOR,
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
          localStorage.setItem("migticrm_user", JSON.stringify(userData));
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
    localStorage.removeItem("migticrm_user");
    clearTokens();
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      loading,
      isAuthenticated: !!user && !!getAccessToken(),
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
