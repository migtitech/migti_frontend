import { useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAccessToken,
  getRefreshToken,
  registerAuthFailureHandler,
} from "../api/axiosClient";
import { hasValidAccessSession } from "../utils/authSession";

const PUBLIC_PATHS = new Set(["/login", "/404", "/500"]);

const normalizePath = (pathname) => {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return p;
};

/**
 * Registers SPA logout navigation and redirects unauthenticated users
 * before protected routes paint (avoids layout flicker on expired sessions).
 */
const AuthRouteMiddleware = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, logout } = useAuth();

  useLayoutEffect(() => {
    return registerAuthFailureHandler(() => {
      logout();
      const path = normalizePath(window.location.hash.replace(/^#/, ""));
      if (path !== "/login") {
        navigate("/login", { replace: true });
      }
    });
  }, [logout, navigate]);

  useLayoutEffect(() => {
    if (loading) return;

    const path = normalizePath(location.pathname);
    if (PUBLIC_PATHS.has(path)) return;

    if (!hasValidAccessSession(getAccessToken, getRefreshToken)) {
      logout();
      navigate("/login", { replace: true });
    }
  }, [location.pathname, loading, logout, navigate]);

  return children;
};

export default AuthRouteMiddleware;
