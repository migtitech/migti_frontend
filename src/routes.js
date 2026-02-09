import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))

// Admin routes
const BranchManagement = React.lazy(() => import('./views/admin/BranchManagement'))
const BranchUserManagement = React.lazy(() => import('./views/admin/BranchUserManagement'))

// Companies
const CompanyList = React.lazy(() => import('./views/admin/CompanyList'))
const CompanyForm = React.lazy(() => import("./views/admin/CompanyForm"))
const CompanyView = React.lazy(() => import('./views/admin/CompanyView'))

// Branches
const BranchList = React.lazy(() => import('./views/admin/BranchList'))
const BranchView = React.lazy(() => import('./views/admin/BranchView'))

// Categories
const CategoryList = React.lazy(() => import('./views/admin/CategoryList'))
const CategoryForm = React.lazy(() => import('./views/admin/CategoryForm'))
const CategoryView = React.lazy(() => import('./views/admin/CategoryView'))

// Brands
const BrandList2 = React.lazy(() => import('./views/admin/BrandList'))
const BrandForm = React.lazy(() => import('./views/admin/BrandForm'))
// Products
const ProductList = React.lazy(() => import('./views/admin/ProductList'))
const ProductForm = React.lazy(() => import('./views/admin/ProductForm'))
const ProductView = React.lazy(() => import('./views/admin/ProductView'))

// Queries
const QueryList = React.lazy(() => import('./views/admin/QueryList'))
const QueryView = React.lazy(() => import('./views/admin/QueryView'))
const QueryForm = React.lazy(() => import('./views/admin/QueryForm'))
const RawQuery = React.lazy(() => import('./views/admin/RawQuery'))
const RawQueryView = React.lazy(() => import('./views/admin/RawQueryView'))
const RawQueryCreate = React.lazy(() => import('./views/admin/RawQueryCreate'))
const Tracking = React.lazy(() => import('./views/admin/Tracking'))

// Quotations
const QuotationList = React.lazy(() => import('./views/admin/QuotationList'))
const QuotationView = React.lazy(() => import('./views/admin/QuotationView'))
const QuotationForm = React.lazy(() => import('./views/admin/QuotationForm')) 
// Purchase Orders
const PurchaseOrderList = React.lazy(() => import('./views/admin/PurchaseOrderList'))
const PurchaseOrderView = React.lazy(() => import('./views/admin/PurchaseOrderView'))

// Finance
const FinanceDashboard = React.lazy(() => import('./views/admin/FinanceDashboard'))

// Suppliers
const SupplierList = React.lazy(() => import('./views/admin/SupplierList'))
const SupplierView = React.lazy(() => import('./views/admin/SupplierView'))
const SupplierForm = React.lazy(() => import('./views/admin/SupplierForm'))

const FollowUpDashboard = React.lazy(() => import('./views/admin/FollowUpDashboard'))

// Rate Cards
const RateCardList = React.lazy(() => import('./views/admin/RateCardList'))
const RateCardView = React.lazy(() => import('./views/admin/RateCardView'))

// Employees
const EmployeeList = React.lazy(() => import('./views/admin/EmployeeList'))
const EmployeeView = React.lazy(() => import('./views/admin/EmployeeView'))
const EmployeeForm = React.lazy(() => import('./views/admin/EmployeeForm'))

// Areas
const AreaList = React.lazy(() => import('./views/admin/AreaList'))
const AreaForm = React.lazy(() => import('./views/admin/AreaForm'))
const AreaView = React.lazy(() => import('./views/admin/AreaView'))

// Industries
const IndustryList = React.lazy(() => import('./views/admin/IndustryList'))
const IndustryForm = React.lazy(() => import('./views/admin/IndustryForm'))
const IndustryView = React.lazy(() => import('./views/admin/IndustryView'))

// Error pages
const Page401 = React.lazy(() => import('./views/pages/page401/Page401'))

// Role-based route configuration
// If allowedRoles is empty or not specified, all authenticated users can access
const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard, allowedRoles: [] },

  // Companies - accessible by super_admin, admin, sales, hod
  { path: '/companies', name: 'Companies', element: CompanyList, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/companies/new', name: 'Add Company', element: CompanyForm, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/companies/edit/:id', name: 'Add Company', element: CompanyForm, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/companies/:id', name: 'Company Details', element: CompanyView, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/companies/:companyId/branches', name: 'Company Branches', element: BranchManagement, allowedRoles: ['super_admin', 'admin', 'hod'] },
//  { path: '/suppliers/new', name: 'Add Supplier', element: SupplierForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
 
  // Branches - accessible by super_admin, admin, hod
  { path: '/branches', name: 'Branches', element: BranchList, allowedRoles: ['super_admin', 'admin', 'hod'] },
  { path: '/branches/:id', name: 'Branch Details', element: BranchView, allowedRoles: ['super_admin', 'admin', 'hod'] },

  // Categories - accessible by super_admin, admin, purchase, hod
  { path: '/categories', name: 'Categories', element: CategoryList, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/categories/new', name: 'Add Category', element: CategoryForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/categories/edit/:id', name: 'Edit Category', element: CategoryForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/categories/:id', name: 'Category Details', element: CategoryView, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },

  // Brands - accessible by super_admin, admin, purchase, hod
  { path: '/brands', name: 'Brands', element: BrandList2, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/brands/new', name: 'Add Brands', element: BrandForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/brands/edit/:id', name: 'Edit Brands', element: BrandForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },


  // Products - accessible by super_admin, admin, sales, finance, purchase, hod
  { path: '/products', name: 'Products', element: ProductList, allowedRoles: ['super_admin', 'admin', 'sales', 'finance', 'purchase', 'hod'] },
  { path: '/products/new', name: 'Add Product', element: ProductForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/products/edit/:id', name: 'Edit Product', element: ProductForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/products/:id', name: 'Product Details', element: ProductView, allowedRoles: ['super_admin', 'admin', 'sales', 'finance', 'purchase', 'hod'] },

  // Queries - accessible by super_admin, admin, sales, hod
  { path: '/queries', name: 'Queries', element: QueryList, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/queries/new', name: 'Add Queries', element: QueryForm, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/queries/edit/:id', name: 'Edit Queries', element: QueryForm, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/queries/:id', name: 'Query Details', element: QueryView, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/raw-query', name: 'Raw Query', element: RawQuery, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/raw-query/new', name: 'New Raw Query', element: RawQueryCreate, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/raw-query/:id', name: 'Raw Query Details', element: RawQueryView, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },
  { path: '/tracking', name: 'Tracking', element: Tracking, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },

  // Quotations - accessible by super_admin, admin, finance, sales, hod
  { path: '/quotations', name: 'Quotations', element: QuotationList, allowedRoles: ['super_admin', 'admin', 'finance', 'sales', 'hod'] },
  { path: '/quotations/:id', name: 'Quotation Details', element: QuotationView, allowedRoles: ['super_admin', 'admin', 'finance', 'sales', 'hod'] },
  { path: '/quotations/new', name: 'Add Quotations', element: QuotationForm, allowedRoles: ['super_admin', 'admin', 'finance', 'sales', 'hod'] },
  { path: '/quotations/edit/:id', name: 'Edit Quotations', element: QuotationForm, allowedRoles: ['super_admin', 'admin', 'finance', 'sales', 'hod'] },
  
  // Purchase Orders - accessible by super_admin, admin, finance, purchase, hod
  { path: '/purchase-orders', name: 'Purchase Orders', element: PurchaseOrderList, allowedRoles: ['super_admin', 'admin', 'finance', 'purchase', 'hod'] },
  { path: '/purchase-orders/:id', name: 'Purchase Order Details', element: PurchaseOrderView, allowedRoles: ['super_admin', 'admin', 'finance', 'purchase', 'hod'] },

  // Finance - accessible by super_admin, admin, finance, hod
  { path: '/finance', name: 'Finance', element: FinanceDashboard, allowedRoles: ['super_admin', 'admin', 'finance', 'hod'] },

  // Suppliers - accessible by super_admin, admin, purchase, hod
  { path: '/suppliers', name: 'Suppliers', element: SupplierList, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/suppliers/new', name: 'Add Supplier', element: SupplierForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/suppliers/edit/:id', name: 'Edit Supplier', element: SupplierForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/suppliers/:id', name: 'Supplier Details', element: SupplierView, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },

  // Rate Cards - accessible by super_admin, admin, purchase, hod
  { path: '/rate-cards', name: 'Rate Cards', element: RateCardList, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/rate-cards/:id', name: 'Rate Card Details', element: RateCardView, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },

  // Follow-up Dashboard - accessible by super_admin, admin, sales, hod
  { path: '/follow-up', name: 'Follow-up Dashboard', element: FollowUpDashboard, allowedRoles: ['super_admin', 'admin', 'sales', 'hod'] },

  // Employees - accessible by super_admin, admin, hod
  { path: '/employees', name: 'Employees', element: EmployeeList, allowedRoles: ['super_admin', 'admin', 'hod'] },
  { path: '/employees/new', name: 'Add Employee', element: EmployeeForm, allowedRoles: ['super_admin', 'admin', 'hod'] },
  { path: '/employees/edit/:id', name: 'Edit Employee', element: EmployeeForm, allowedRoles: ['super_admin', 'admin', 'hod'] },
  { path: '/employees/:id', name: 'Employee Details', element: EmployeeView, allowedRoles: ['super_admin', 'admin', 'hod'] },

  // Areas - company, branch, name, city, area type
  { path: '/areas', name: 'Areas', element: AreaList, allowedRoles: ['super_admin', 'admin', 'hod'] },
  { path: '/areas/new', name: 'Add Area', element: AreaForm, allowedRoles: ['super_admin', 'admin', 'hod'] },
  { path: '/areas/edit/:id', name: 'Edit Area', element: AreaForm, allowedRoles: ['super_admin', 'admin', 'hod'] },
  { path: '/areas/:id', name: 'Area Details', element: AreaView, allowedRoles: ['super_admin', 'admin', 'hod'] },

  // Industries - accessible by super_admin, admin, purchase, hod
  { path: '/industries', name: 'Industries', element: IndustryList, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/industries/new', name: 'Add Industry', element: IndustryForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/industries/edit/:id', name: 'Edit Industry', element: IndustryForm, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },
  { path: '/industries/:id', name: 'Industry Details', element: IndustryView, allowedRoles: ['super_admin', 'admin', 'purchase', 'hod'] },

  // Admin routes for company/branch management (legacy)
  { path: '/admin/companies/:companyId/branches', name: 'Branches', element: BranchManagement, allowedRoles: ['super_admin', 'admin', 'hod'] },
  { path: '/admin/companies/:companyId/branches/:branchId/users', name: 'Branch Users', element: BranchUserManagement, allowedRoles: ['super_admin', 'admin', 'hod'] },
  

  // Unauthorized page - accessible by all
  { path: '/unauthorized', name: 'Unauthorized', element: Page401, allowedRoles: [] },
]

export default routes
