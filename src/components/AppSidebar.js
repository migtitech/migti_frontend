import React, { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'
import usePermissions from '../hooks/usePermissions'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { hasAnyPermission, isFullAccess } = usePermissions()

  // Filter navigation items based on permissions
  const filteredNavigation = useMemo(() => {
    const filterItem = (item) => {
      // No module = accessible to all (e.g., Dashboard)
      if (!item.module) return true
      // Full-access roles see everything
      if (isFullAccess) return true
      // Check if user has any permission for this module
      return hasAnyPermission(item.module)
    }

    return navigation
      .filter(filterItem)
      .map((item) => {
        // For groups with sub-items, filter sub-items too
        if (item.items) {
          const filteredItems = item.items.filter((subItem) => {
            if (!subItem.module) return true
            if (isFullAccess) return true
            return hasAnyPermission(subItem.module)
          })
          if (filteredItems.length === 0) return null
          return { ...item, items: filteredItems }
        }
        return item
      })
      .filter(Boolean)
  }, [hasAnyPermission, isFullAccess])

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/" className="text-decoration-none">
          <span className="sidebar-brand-full fs-4 fw-bold text-white">MigtiCRM</span>
          <span className="sidebar-brand-narrow fs-5 fw-bold text-white">MC</span>
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={filteredNavigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
