import { useMemo, useCallback } from 'react'
import { useAuth, FULL_ACCESS_ROLES } from '../context/AuthContext'

const normalizeRole = (role) =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const hasPurchaseOrderBypass = (role) => {
  const normalized = normalizeRole(role)
  if (['back_office_exicutive', 'back_office_executive', 'boe'].includes(normalized)) return true
  return normalized.replace(/_/g, '').includes('backoffice')
}

const usePermissions = () => {
  const { user } = useAuth()

  const isFullAccess = useMemo(
    () => !!user && FULL_ACCESS_ROLES.includes(user.role),
    [user],
  )

  const permissions = useMemo(() => user?.permissions || [], [user])

  const hasPermission = useCallback(
    (module, action) => {
      if (!user) return false
      if (isFullAccess) return true
      if (module === 'purchase_orders' && hasPurchaseOrderBypass(user.role)) return true
      return permissions.includes(`${module}:${action}`)
    },
    [user, isFullAccess, permissions],
  )

  const canRead = useCallback((module) => hasPermission(module, 'read'), [hasPermission])
  const canCreate = useCallback((module) => hasPermission(module, 'create'), [hasPermission])
  const canUpdate = useCallback((module) => hasPermission(module, 'update'), [hasPermission])
  const canDelete = useCallback((module) => hasPermission(module, 'delete'), [hasPermission])

  // Check if user has any permission for a module (used for sidebar visibility)
  const hasAnyPermission = useCallback(
    (module) => {
      if (!user) return false
      if (isFullAccess) return true
      if (module === 'purchase_orders' && hasPurchaseOrderBypass(user.role)) return true
      return permissions.some((p) => p.startsWith(`${module}:`))
    },
    [user, isFullAccess, permissions],
  )

  return {
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    hasAnyPermission,
    isFullAccess,
    permissions,
  }
}

export default usePermissions
