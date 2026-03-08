import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilBuilding,
  cilLocationPin,
  cilCart,
  cilCommentSquare,
  cilDescription,
  cilFile,
  cilPeople,
  cilFactory,
  cilIndustry,
  cilBell,
  cilUser,
  cilLayers,
  cilTags,
  cilList,
  cilMap,
  cilHome,
  cilStar,
  cilClipboard,
  cilFolder,
} from '@coreui/icons'
import { CNavItem, CNavGroup } from '@coreui/react'

// Purchase Manager / Purchase Executive – show only these bucket items (used in AppSidebar)
export const PURCHASE_ROLE_NAV = [
  { component: CNavItem, name: 'Dashboard', to: '/dashboard', icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />, module: null },
  { component: CNavItem, name: 'Procurement Bucket', to: '/purchase-tasks', icon: <CIcon icon={cilClipboard} customClassName="nav-icon" />, module: 'purchase_tasks', roles: ['purchase_manager', 'purchase_exicutive'] },
  { component: CNavItem, name: 'Follow up Bucket', to: '/follow-up', icon: <CIcon icon={cilBell} customClassName="nav-icon" />, module: 'follow_up', roles: ['purchase_manager', 'purchase_exicutive'] },
  { component: CNavItem, name: 'DMG Bucket', to: '/dmg', icon: <CIcon icon={cilFolder} customClassName="nav-icon" />, module: 'dmg', roles: ['purchase_manager', 'purchase_exicutive'] },
]

// Define which roles can access each menu item
// 'module' maps to the RBAC permission module key for granular access control
// Full-access roles (super_admin, admin, hod) bypass permission checks
const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    module: null, // All roles can access dashboard
  },
  {
    component: CNavItem,
    name: 'Companies',
    to: '/companies',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    module: 'companies',
  },
  {
    component: CNavItem,
    name: 'Branches',
    to: '/branches',
    icon: <CIcon icon={cilLocationPin} customClassName="nav-icon" />,
    module: 'branches',
  },
  {
    component: CNavItem,
    name: 'Zones',
    to: '/zones',
    icon: <CIcon icon={cilMap} customClassName="nav-icon" />,
    module: 'zones',
  },
  {
    component: CNavItem,
    name: 'Industries',
    to: '/industries',
    icon: <CIcon icon={cilIndustry} customClassName="nav-icon" />,
    module: 'industries',
  },
  {
    component: CNavItem,
    name: 'Industry Branches',
    to: '/industry-branches',
    icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
    module: 'industry_branches',
  },
  {
    component: CNavGroup,
    name: 'Product Management',
    to: '/products',
    icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
    module: 'products',
    items: [
      {
        component: CNavItem,
        name: 'Groups',
        to: '/groups',
        icon: <CIcon icon={cilList} customClassName="nav-icon" />,
        module: 'groups',
      },
      {
        component: CNavItem,
        name: 'Categories',
        to: '/categories',
        icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
        module: 'categories',
      },
      {
        component: CNavItem,
        name: 'Brands',
        to: '/brands',
        icon: <CIcon icon={cilTags} customClassName="nav-icon" />,
        module: 'brands',
      },
      {
        component: CNavItem,
        name: 'Products',
        to: '/products',
        icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
        module: 'products',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Product Lead',
    to: '/product-lead',
    icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
    module: 'products',
  },
  {
    component: CNavItem,
    name: 'Queries',
    to: '/queries',
    icon: <CIcon icon={cilCommentSquare} customClassName="nav-icon" />,
    module: 'queries',
  },
  {
    component: CNavItem,
    name: 'Quotations',
    to: '/quotations',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
    module: 'quotations',
  },
  {
    component: CNavItem,
    name: 'Suppliers',
    to: '/suppliers',
    icon: <CIcon icon={cilFactory} customClassName="nav-icon" />,
    module: 'suppliers',
  },
  {
    component: CNavItem,
    name: 'Rate Card',
    to: '/rate-cards',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
    module: 'rate_cards',
  },
  {
    component: CNavItem,
    name: 'Employees',
    to: '/employees',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    module: 'employees',
  },
]

export default _nav
