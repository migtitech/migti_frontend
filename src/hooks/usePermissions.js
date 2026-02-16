import { useMemo, useCallback } from 'react'
import { useAuth, FULL_ACCESS_ROLES } from '../context/AuthContext'

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
