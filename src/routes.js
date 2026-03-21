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

// Groups
const GroupList = React.lazy(() => import('./views/admin/GroupList'))
const GroupForm = React.lazy(() => import('./views/admin/GroupForm'))

// Brands
const BrandList2 = React.lazy(() => import('./views/admin/BrandList'))
const BrandForm = React.lazy(() => import('./views/admin/BrandForm'))
// Products
const ProductList = React.lazy(() => import('./views/admin/ProductList'))
const ProductLead = React.lazy(() => import('./views/admin/ProductLead'))
const ProductLeadView = React.lazy(() => import('./views/admin/ProductLeadView'))
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
const QuotationGenerate = React.lazy(() => import('./views/admin/QuotationGenerate')) 
const QuoteLogsView = React.lazy(() => import('./views/admin/QuoteLogsView'))
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

// Purchase Tasks (My Task / Rate Bucket / Admin Tracking)
const PurchaseTasks = React.lazy(() => import('./views/admin/PurchaseTasks'))

// Task Dashboard (Task Management)
const TaskList = React.lazy(() => import('./views/admin/TaskList'))
const TaskForm = React.lazy(() => import('./views/admin/TaskForm'))
const TaskView = React.lazy(() => import('./views/admin/TaskView'))
const TaskBucket = React.lazy(() => import('./views/admin/TaskBucket'))
const TaskBucketView = React.lazy(() => import('./views/admin/TaskBucketView'))
const TaskBucketRateForm = React.lazy(() => import('./views/admin/TaskBucketRateForm'))

// DMG Bucket (Purchase role)
const DmgBucket = React.lazy(() => import('./views/admin/DmgBucket'))

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

// Industry Branches
const IndustryBranchList = React.lazy(() => import('./views/admin/IndustryBranchList'))
const IndustryBranchForm = React.lazy(() => import('./views/admin/IndustryBranchForm'))
const IndustryBranchView = React.lazy(() => import('./views/admin/IndustryBranchView'))

// Error pages
const Page401 = React.lazy(() => import('./views/pages/page401/Page401'))

// Permission-based route configuration
// 'module' maps to the RBAC module key, 'action' specifies required permission
// Routes without module are accessible to all authenticated users
const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },

  // Companies
  { path: '/companies', name: 'Companies', element: CompanyList, module: 'companies', action: 'read' },
  { path: '/companies/new', name: 'Add Company', element: CompanyForm, module: 'companies', action: 'create' },
  { path: '/companies/edit/:id', name: 'Edit Company', element: CompanyForm, module: 'companies', action: 'update' },
  { path: '/companies/:id', name: 'Company Details', element: CompanyView, module: 'companies', action: 'read' },
  { path: '/companies/:companyId/branches', name: 'Company Branches', element: BranchManagement, module: 'branches', action: 'read' },

  // Branches
  { path: '/branches', name: 'Branches', element: BranchList, module: 'branches', action: 'read' },
  { path: '/branches/:id', name: 'Branch Details', element: BranchView, module: 'branches', action: 'read' },

  // Categories
  { path: '/categories', name: 'Categories', element: CategoryList, module: 'categories', action: 'read' },
  { path: '/categories/new', name: 'Add Category', element: CategoryForm, module: 'categories', action: 'create' },
  { path: '/categories/edit/:id', name: 'Edit Category', element: CategoryForm, module: 'categories', action: 'update' },
  { path: '/categories/:id', name: 'Category Details', element: CategoryView, module: 'categories', action: 'read' },

  // Groups
  { path: '/groups', name: 'Groups', element: GroupList, module: 'groups', action: 'read' },
  { path: '/groups/new', name: 'Add Group', element: GroupForm, module: 'groups', action: 'create' },
  { path: '/groups/edit/:id', name: 'Edit Group', element: GroupForm, module: 'groups', action: 'update' },

  // Brands
  { path: '/brands', name: 'Brands', element: BrandList2, module: 'brands', action: 'read' },
  { path: '/brands/new', name: 'Add Brands', element: BrandForm, module: 'brands', action: 'create' },
  { path: '/brands/edit/:id', name: 'Edit Brands', element: BrandForm, module: 'brands', action: 'update' },

  // Products
  { path: '/products', name: 'Products', element: ProductList, module: 'products', action: 'read' },
  { path: '/products/new', name: 'Add Product', element: ProductForm, module: 'products', action: 'create' },
  { path: '/products/edit/:id', name: 'Edit Product', element: ProductForm, module: 'products', action: 'update' },
  { path: '/products/:id', name: 'Product Details', element: ProductView, module: 'products', action: 'read' },
  { path: '/product-lead', name: 'Product Lead', element: ProductLead, module: 'products', action: 'read' },
  { path: '/product-lead/:id', name: 'Product Lead Details', element: ProductLeadView, module: 'products', action: 'read' },

  // Queries
  { path: '/queries', name: 'Queries', element: QueryList, module: 'queries', action: 'read' },
  { path: '/queries/new', name: 'Add Queries', element: QueryForm, module: 'queries', action: 'create' },
  { path: '/queries/edit/:id', name: 'Edit Queries', element: QueryForm, module: 'queries', action: 'update' },
  { path: '/queries/:id', name: 'Query Details', element: QueryView, module: 'queries', action: 'read' },
  { path: '/raw-query', name: 'Raw Query', element: RawQuery, module: 'raw_queries', action: 'read' },
  { path: '/raw-query/new', name: 'New Raw Query', element: RawQueryCreate, module: 'raw_queries', action: 'create' },
  { path: '/raw-query/:id', name: 'Raw Query Details', element: RawQueryView, module: 'raw_queries', action: 'read' },
  { path: '/tracking', name: 'Tracking', element: Tracking, module: 'queries', action: 'read' },

  // Quotations
  { path: '/quotations', name: 'Quotations', element: QuotationList, module: 'quotations', action: 'read' },
  { path: '/quote-logs', name: 'Quote Logs', element: QuoteLogsView, module: 'quotations', action: 'read' },
  { path: '/quotations/generate/:queryId', name: 'Generate Quotation', element: QuotationGenerate, module: 'quotations', action: 'create' },
  { path: '/quotations/new', name: 'Add Quotations', element: QuotationForm, module: 'quotations', action: 'create' },
  { path: '/quotations/edit/:id', name: 'Edit Quotations', element: QuotationForm, module: 'quotations', action: 'update' },
  { path: '/quotations/:id', name: 'Quotation Details', element: QuotationView, module: 'quotations', action: 'read' },

  // Purchase Orders
  { path: '/purchase-orders', name: 'Purchase Orders', element: PurchaseOrderList, module: 'purchase_orders', action: 'read' },
  { path: '/purchase-orders/:id', name: 'Purchase Order Details', element: PurchaseOrderView, module: 'purchase_orders', action: 'read' },

  // Finance
  { path: '/finance', name: 'Finance', element: FinanceDashboard, module: 'finance', action: 'read' },

  // Suppliers
  { path: '/suppliers', name: 'Suppliers', element: SupplierList, module: 'suppliers', action: 'read' },
  { path: '/suppliers/new', name: 'Add Supplier', element: SupplierForm, module: 'suppliers', action: 'create' },
  { path: '/suppliers/edit/:id', name: 'Edit Supplier', element: SupplierForm, module: 'suppliers', action: 'update' },
  { path: '/suppliers/:id', name: 'Supplier Details', element: SupplierView, module: 'suppliers', action: 'read' },

  // Rate Cards
  { path: '/rate-cards', name: 'Rate Cards', element: RateCardList, module: 'rate_cards', action: 'read' },

  // Purchase Tasks
  { path: '/purchase-tasks', name: 'Purchase Tasks', element: PurchaseTasks, module: 'purchase_tasks', action: 'read' },

  // Task Dashboard
  { path: '/task-dashboard', name: 'Task Dashboard', element: TaskList, module: 'task_management', action: 'read' },
  { path: '/task-dashboard/new', name: 'Create Task', element: TaskForm, module: 'task_management', action: 'create' },
  { path: '/task-dashboard/:id', name: 'Task Details', element: TaskView, module: 'task_management', action: 'read' },

  // Task Bucket (tasks assigned to current employee)
  { path: '/task-bucket', name: 'Task Bucket', element: TaskBucket, module: 'task_bucket', action: 'read' },
  { path: '/task-bucket/:id', name: 'Task Bucket Details', element: TaskBucketView, module: 'task_bucket', action: 'read' },
  { path: '/task-bucket/:id/rate', name: 'Task Bucket Rate', element: TaskBucketRateForm, module: 'task_bucket', action: 'update' },

  // Follow-up Dashboard
  { path: '/follow-up', name: 'Follow-up Dashboard', element: FollowUpDashboard, module: 'follow_up', action: 'read' },

  // DMG Bucket (Purchase Manager / Purchase Executive)
  { path: '/dmg', name: 'DMG Bucket', element: DmgBucket, module: 'dmg', action: 'read' },

  // Employees
  { path: '/employees', name: 'Employees', element: EmployeeList, module: 'employees', action: 'read' },
  { path: '/employees/new', name: 'Add Employee', element: EmployeeForm, module: 'employees', action: 'create' },
  { path: '/employees/edit/:id', name: 'Edit Employee', element: EmployeeForm, module: 'employees', action: 'update' },
  { path: '/employees/:id', name: 'Employee Details', element: EmployeeView, module: 'employees', action: 'read' },

  // Zones
  { path: '/zones', name: 'Zones', element: AreaList, module: 'zones', action: 'read' },
  { path: '/zones/new', name: 'Add Zone', element: AreaForm, module: 'zones', action: 'create' },
  { path: '/zones/edit/:id', name: 'Edit Zone', element: AreaForm, module: 'zones', action: 'update' },
  { path: '/zones/:id', name: 'Zone Details', element: AreaView, module: 'zones', action: 'read' },

  // Industries
  { path: '/industries', name: 'Industries', element: IndustryList, module: 'industries', action: 'read' },
  { path: '/industries/new', name: 'Add Industry', element: IndustryForm, module: 'industries', action: 'create' },
  { path: '/industries/edit/:id', name: 'Edit Industry', element: IndustryForm, module: 'industries', action: 'update' },
  { path: '/industries/:id', name: 'Industry Details', element: IndustryView, module: 'industries', action: 'read' },

  // Industry Branches
  { path: '/industry-branches', name: 'Industry Branches', element: IndustryBranchList, module: 'industry_branches', action: 'read' },
  { path: '/industry-branches/new', name: 'Add Industry Branch', element: IndustryBranchForm, module: 'industry_branches', action: 'create' },
  { path: '/industry-branches/edit/:id', name: 'Edit Industry Branch', element: IndustryBranchForm, module: 'industry_branches', action: 'update' },
  { path: '/industry-branches/:id', name: 'Industry Branch Details', element: IndustryBranchView, module: 'industry_branches', action: 'read' },

  // Admin routes for company/branch management (legacy)
  { path: '/admin/companies/:companyId/branches', name: 'Branches', element: BranchManagement, module: 'branches', action: 'read' },
  { path: '/admin/companies/:companyId/branches/:branchId/users', name: 'Branch Users', element: BranchUserManagement, module: 'branches', action: 'read' },

  // Unauthorized page - accessible by all
  { path: '/unauthorized', name: 'Unauthorized', element: Page401 },
]

export default routes
