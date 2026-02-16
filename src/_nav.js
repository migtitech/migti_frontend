import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilBuilding,
  cilLocationPin,
  cilCart,
  cilCommentSquare,
  cilCode,
  cilDescription,
  cilFile,
  cilDollar,
  cilPeople,
  cilFactory,
  cilIndustry,
  cilBell,
  cilUser,
  cilLayers,
  cilTags,
  cilList,
  cilMap,
  cilSearch,
} from '@coreui/icons'
import { CNavItem, CNavGroup } from '@coreui/react'

// Define which roles can access each menu item
// If 'roles' is not specified or empty array, all roles can access
const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    roles: [], // All roles can access dashboard
  },
  {
    component: CNavItem,
    name: 'Companies',
    to: '/companies',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'sales', 'hod'],
    // items: [
    //   {
    //     component: CNavItem,
    //     name: 'All Companies',
    //     to: '/companies',
    //   },
    //   {
    //     component: CNavItem,
    //     name: 'Add Company',
    //     to: '/companies/new',
    //   },
    // ],
  },
  {
    component: CNavItem,
    name: 'Branches',
    to: '/branches',
    icon: <CIcon icon={cilLocationPin} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Zones',
    to: '/areas',
    icon: <CIcon icon={cilMap} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Industries',
    to: '/industries',
    icon: <CIcon icon={cilIndustry} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'purchase', 'hod'],
  },
  {
    component: CNavGroup,
    name: 'Product Management',
    to: '/products',
    icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'sales', 'finance', 'purchase', 'hod'],
    items: [
      {
        component: CNavItem,
        name: 'Groups',
        to: '/groups',
        icon: <CIcon icon={cilList} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Categories',
        to: '/categories',
        icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Brands',
        to: '/brands',
        icon: <CIcon icon={cilTags} customClassName="nav-icon" />,
      },
      {
        component: CNavItem,
        name: 'Products',
        to: '/products',
        icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Queries',
    to: '/queries',
    icon: <CIcon icon={cilCommentSquare} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'sales', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Raw Query',
    to: '/raw-query',
    icon: <CIcon icon={cilCode} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'sales', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Tracking',
    to: '/tracking',
    icon: <CIcon icon={cilSearch} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'sales', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Quotations',
    to: '/quotations',
    icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'finance', 'sales', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Purchase Orders',
    to: '/purchase-orders',
    icon: <CIcon icon={cilFile} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'finance', 'purchase', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Finance',
    to: '/finance',
    icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'finance', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Suppliers',
    to: '/suppliers',
    icon: <CIcon icon={cilFactory} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'purchase', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Rate Card',
    to: '/rate-cards',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'purchase', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Follow-up Dashboard',
    to: '/follow-up',
    icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'sales', 'hod'],
  },
  {
    component: CNavItem,
    name: 'Employees',
    to: '/employees',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
    roles: ['super_admin', 'admin', 'hod'],
  },
]

export default _nav
