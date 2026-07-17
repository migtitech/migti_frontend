import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AppContent,
  AppSidebar,
  AppFooter,
  AppHeader,
  Loader,
} from "../components/index";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import EmployeeLocationTracker from "../components/EmployeeLocationTracker";

const DefaultLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  const unfoldable = useSelector((state) => state.sidebarUnfoldable);

  if (loading) {
    return (
      <div className="pt-3 min-vh-100 d-flex align-items-center justify-content-center">
        <Loader message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <EmployeeLocationTracker />
      <AppSidebar />
      <div
        className={cn(
          "app-wrapper d-flex flex-column min-vh-100",
          unfoldable && "app-wrapper--narrow",
        )}
      >
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  );
};

export default DefaultLayout;
