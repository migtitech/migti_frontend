import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, ROLES } from '../context/AuthContext'
import usePermissions from '../hooks/usePermissions'
import Loader from './Loader/Loader'

const PURCHASE_BUCKET_MODULES = ['purchase_tasks', 'follow_up', 'dmg']
const PURCHASE_ROLES = [ROLES.PURCHASE_MANAGER, ROLES.PURCHASE_EXICUTIVE]

const ProtectedRoute = ({ children, module, action = 'read' }) => {
  const { loading, isAuthenticated, user } = useAuth()
  const { hasPermission, isFullAccess } = usePermissions()

  if (loading) {
    return (
      <div className="pt-3">
        <Loader message="Loading..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If no module specified, allow all authenticated users (e.g., dashboard)
  if (!module) {
    return children
  }

  // Full-access roles bypass permission checks
  if (isFullAccess) {
    return children
  }

  // Purchase Manager / Purchase Executive: allow access to Procurement, Follow up, DMG buckets
  if (user?.role && PURCHASE_ROLES.includes(user.role) && PURCHASE_BUCKET_MODULES.includes(module)) {
    return children
  }

  // Check specific permission
  if (!hasPermission(module, action)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute
