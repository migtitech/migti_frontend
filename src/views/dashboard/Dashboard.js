import React from 'react'
import { useAuth, ROLES } from '../../context/AuthContext'
import SuperAdminDashboard from './SuperAdminDashboard'
import AdminDashboard from './AdminDashboard'
import HODDashboard from './HODDashboard'
import SalesDashboard from './SalesDashboard'
import PurchaseDashboard from './PurchaseDashboard'
import FinanceDashboard from './FinanceDashboard'
import DeliveryDashboard from './DeliveryDashboard'

const Dashboard = () => {
  const { user } = useAuth()

  // Render dashboard based on user role
  const renderDashboard = () => {
    switch (user?.role) {
      case ROLES.SUPER_ADMIN:
        return <SuperAdminDashboard />
      case ROLES.ADMIN:
        return <AdminDashboard />
      case ROLES.HOD:
        return <HODDashboard />
      case ROLES.SALES:
        return <SalesDashboard />
      case ROLES.PURCHASE:
        return <PurchaseDashboard />
      case ROLES.FINANCE:
        return <FinanceDashboard />
      case ROLES.DELIVERY:
        return <DeliveryDashboard />
      default:
        return <AdminDashboard />
    }
  }

  return renderDashboard()
}

export default Dashboard
