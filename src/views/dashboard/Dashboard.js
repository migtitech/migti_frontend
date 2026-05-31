import React from "react";
import { useAuth, ROLES } from "../../context/AuthContext";
import SuperAdminDashboard from "./SuperAdminDashboard";
import AdminDashboard from "./AdminDashboard";
import SalesDashboard from "./SalesDashboard";
import PurchaseDashboard from "./PurchaseDashboard";

const Dashboard = () => {
  const { user } = useAuth();

  // Render dashboard based on user role
  const renderDashboard = () => {
    switch (user?.role) {
      case ROLES.SUPER_ADMIN:
        return <SuperAdminDashboard />;
      case ROLES.ADMIN:
        return <AdminDashboard />;
      case ROLES.HEAD_OF_DEPARTMENT:
      case "hod":
        return <SalesDashboard />;
      case ROLES.SALES_MANAGER:
      case ROLES.SALES_EXICUTIVE:
        return <SalesDashboard />;
      case ROLES.PURCHASE_EXICUTIVE:
      case ROLES.PROCUREMENT:
        return <PurchaseDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return renderDashboard();
};

export default Dashboard;
