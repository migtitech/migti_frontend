import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import authService from '../services/authService'

const AuthContext = createContext(null)

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HOD: 'hod',
  SALES: 'sales',
  PURCHASE: 'purchase',
  FINANCE: 'finance',
  DELIVERY: 'delivery',
}

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.HOD]: 'HOD',
  [ROLES.SALES]: 'Sales',
  [ROLES.PURCHASE]: 'Purchase',
  [ROLES.FINANCE]: 'Finance',
  [ROLES.DELIVERY]: 'Delivery',
}

// Roles that get full access to everything (no permission checks needed)
export const FULL_ACCESS_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HOD]

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('migticrm_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password, role) => {
    if (role === ROLES.SUPER_ADMIN) {
      try {
        const response = await authService.loginSuperAdmin(email, password)
        if (response?.success) {
          const apiUser = response?.data?.superAdmin || {}
          const userData = {
            ...apiUser,
            role: ROLES.SUPER_ADMIN,
          }
          setUser(userData)
          localStorage.setItem('migticrm_user', JSON.stringify(userData))
          return { success: true, user: userData }
        }
        return {
          success: false,
          error: response?.message || 'Login failed',
        }
      } catch (error) {
        return {
          success: false,
          error: error?.message || 'Login failed',
        }
      }
    }

    if (role === ROLES.ADMIN) {
      try {
        const response = await authService.loginAdmin(email, password)
        if (response?.success) {
          const apiUser = response?.data?.admin || {}
          const userData = {
            ...apiUser,
            role: ROLES.ADMIN,
          }
          setUser(userData)
          localStorage.setItem('migticrm_user', JSON.stringify(userData))
          return { success: true, user: userData }
        }
        return {
          success: false,
          error: response?.message || 'Login failed',
        }
      } catch (error) {
        return {
          success: false,
          error: error?.message || 'Login failed',
        }
      }
    }

    if ([ROLES.HOD, ROLES.SALES, ROLES.PURCHASE, ROLES.FINANCE, ROLES.DELIVERY].includes(role)) {
      try {
        const response = await authService.loginEmployee(email, password, role)
        if (response?.success) {
          const apiUser = response?.data?.employee || {}
          const userData = {
            ...apiUser,
            role: apiUser?.role || role,
          }
          setUser(userData)
          localStorage.setItem('migticrm_user', JSON.stringify(userData))
          return { success: true, user: userData }
        }
        return {
          success: false,
          error: response?.message || 'Login failed',
        }
      } catch (error) {
        return {
          success: false,
          error: error?.message || 'Login failed',
        }
      }
    }

    return { success: false, error: 'Role not supported' }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('migticrm_user')
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      loading,
      isAuthenticated: !!user,
    }),
    [user, login, logout, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
