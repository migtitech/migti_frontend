import React, { Suspense, useLayoutEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import "./scss/style.scss";

import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { DataProvider } from "./context/DataContext";
import Loader from "./components/Loader/Loader";
import RealtimeNotificationAlert from "./components/RealtimeNotificationAlert";

// Containers
const DefaultLayout = React.lazy(() => import("./layout/DefaultLayout"));

// Pages
const Login = React.lazy(() => import("./views/pages/login/Login"));
const Page404 = React.lazy(() => import("./views/pages/page404/Page404"));
const Page500 = React.lazy(() => import("./views/pages/page500/Page500"));

/** Must match CoreUI template default so any legacy code reads the same key. */
const COREUI_THEME_STORAGE_KEY = "coreui-free-react-admin-template-theme";

function applyGlobalLightTheme() {
  const root = document.documentElement;
  root.dataset.coreuiTheme = "light";
  root.dispatchEvent(new Event("ColorSchemeChange"));
  try {
    localStorage.setItem(COREUI_THEME_STORAGE_KEY, "light");
  } catch {
    // ignore quota / private mode
  }
}

const App = () => {
  useLayoutEffect(() => {
    applyGlobalLightTheme();
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <DataProvider>
            <Toaster containerStyle={{ zIndex: 20000 }} />
            <HashRouter>
              <RealtimeNotificationAlert />
              <Suspense
                fallback={
                  <div className="pt-3 min-vh-100 d-flex align-items-center justify-content-center">
                    <Loader message="Loading..." />
                  </div>
                }
              >
                <Routes>
                  <Route
                    exact
                    path="/login"
                    name="Login Page"
                    element={<Login />}
                  />
                  <Route
                    exact
                    path="/404"
                    name="Page 404"
                    element={<Page404 />}
                  />
                  <Route
                    exact
                    path="/500"
                    name="Page 500"
                    element={<Page500 />}
                  />
                  <Route path="*" name="Home" element={<DefaultLayout />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </DataProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
