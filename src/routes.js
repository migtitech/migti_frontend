import React from "react";

const Dashboard = React.lazy(() => import("./views/dashboard/Dashboard"));
const SalesDashboard = React.lazy(
  () => import("./views/dashboard/SalesDashboard"),
);
const PurchaseDashboard = React.lazy(
  () => import("./views/dashboard/PurchaseDashboard"),
);

// Admin routes
const BranchManagement = React.lazy(
  () => import("./views/admin/BranchManagement"),
);
const BranchUserManagement = React.lazy(
  () => import("./views/admin/BranchUserManagement"),
);

// Companies
const CompanyList = React.lazy(() => import("./views/admin/CompanyList"));
const CompanyForm = React.lazy(() => import("./views/admin/CompanyForm"));
const CompanyView = React.lazy(() => import("./views/admin/CompanyView"));

// Branches
const BranchList = React.lazy(() => import("./views/admin/BranchList"));
const BranchView = React.lazy(() => import("./views/admin/BranchView"));

// Categories
const CategoryList = React.lazy(() => import("./views/admin/CategoryList"));
const CategoryForm = React.lazy(() => import("./views/admin/CategoryForm"));
const CategoryView = React.lazy(() => import("./views/admin/CategoryView"));

// Subcategories
const SubcategoryList = React.lazy(
  () => import("./views/admin/SubcategoryList"),
);
const SubcategoryForm = React.lazy(
  () => import("./views/admin/SubcategoryForm"),
);
const SubcategoryView = React.lazy(
  () => import("./views/admin/SubcategoryView"),
);

// Groups
const GroupList = React.lazy(() => import("./views/admin/GroupList"));
const GroupForm = React.lazy(() => import("./views/admin/GroupForm"));

// Brands
const BrandList2 = React.lazy(() => import("./views/admin/BrandList"));
const BrandForm = React.lazy(() => import("./views/admin/BrandForm"));
// Products
const ProductList = React.lazy(() => import("./views/admin/ProductList"));
const ProductLead = React.lazy(() => import("./views/admin/ProductLead"));
const ProductLeadView = React.lazy(
  () => import("./views/admin/ProductLeadView"),
);
const ProductForm = React.lazy(() => import("./views/admin/ProductForm"));
const ProductView = React.lazy(() => import("./views/admin/ProductView"));

// Queries
const QueryList = React.lazy(() => import("./views/admin/QueryList"));
const QueryView = React.lazy(() => import("./views/admin/QueryView"));
const QueryForm = React.lazy(() => import("./views/admin/QueryForm"));
const RawQuery = React.lazy(() => import("./views/admin/RawQuery"));
const RawQueryView = React.lazy(() => import("./views/admin/RawQueryView"));
const RawQueryCreate = React.lazy(() => import("./views/admin/RawQueryCreate"));
const Tracking = React.lazy(() => import("./views/admin/Tracking"));

// Quotations
const QuotationList = React.lazy(() => import("./views/admin/QuotationList"));
const QuotationView = React.lazy(() => import("./views/admin/QuotationView"));
const QuotationForm = React.lazy(() => import("./views/admin/QuotationForm"));
const QuotationGenerate = React.lazy(
  () => import("./views/admin/QuotationGenerate"),
);
const FinalizeSalesOrder = React.lazy(
  () => import("./views/admin/FinalizeSalesOrder"),
);
const QuoteLogsView = React.lazy(() => import("./views/admin/QuoteLogsView"));
// Finance
const FinanceDashboard = React.lazy(
  () => import("./views/admin/FinanceDashboard"),
);
const BranchAnalytics = React.lazy(
  () => import("./views/admin/BranchAnalytics"),
);
const TargetAnalytics = React.lazy(
  () => import("./views/admin/TargetAnalytics"),
);
const TargetDashboard = React.lazy(
  () => import("./views/admin/TargetDashboard"),
);
const MyTargets = React.lazy(() => import("./views/admin/MyTargets"));
const PurchaseOrderSidebar = React.lazy(
  () => import("./views/admin/PurchaseOrderSidebar"),
);
const PoPaymentSidebar = React.lazy(
  () => import("./views/admin/PoPaymentSidebar"),
);
const PendingPayment = React.lazy(() => import("./views/admin/PendingPayment"));
const PoPaymentBacklog = React.lazy(
  () => import("./views/admin/PoPaymentBacklog"),
);
const HodPaymentBacklog = React.lazy(
  () => import("./views/hod/HodPaymentBacklog"),
);
const HodDashboard = React.lazy(() => import("./views/hod/HodDashboard"));
const SalaryManagement = React.lazy(
  () => import("./views/hod/SalaryManagement"),
);
const SalarySlipForm = React.lazy(() => import("./views/hod/SalarySlipForm"));
const MySalary = React.lazy(() => import("./views/employee/MySalary"));
const QuotationFollowupDashboard = React.lazy(
  () => import("./views/admin/QuotationFollowupDashboard"),
);
const BillingRequestList = React.lazy(
  () => import("./views/admin/BillingRequestList"),
);
const BillingRequestView = React.lazy(
  () => import("./views/admin/BillingRequestView"),
);
const HodPurchaseRequestList = React.lazy(
  () => import("./views/admin/HodPurchaseRequestList"),
);
const HodPurchaseRequestView = React.lazy(
  () => import("./views/admin/HodPurchaseRequestView"),
);
const BatchBillingRequests = React.lazy(
  () => import("./views/admin/BatchBillingRequests"),
);
const BatchBillingRequestDetail = React.lazy(
  () => import("./views/admin/BatchBillingRequestDetail"),
);
const VisitManagementSidebar = React.lazy(
  () => import("./views/admin/VisitManagementSidebar"),
);
const MyVisits = React.lazy(() => import("./views/admin/MyVisits"));

// Suppliers
const SupplierList = React.lazy(() => import("./views/admin/SupplierList"));
const SupplierView = React.lazy(() => import("./views/admin/SupplierView"));
const SupplierForm = React.lazy(() => import("./views/admin/SupplierForm"));

const FollowUpDashboard = React.lazy(
  () => import("./views/admin/FollowUpDashboard"),
);

// Rate Cards
const RateCardList = React.lazy(() => import("./views/admin/RateCardList"));

// Master > Rate Master (mock/demo board)
const RateMasterBoard = React.lazy(
  () => import("./views/master/RateMasterBoard"),
);
const RateMasterVariants = React.lazy(
  () => import("./views/master/RateMasterVariants"),
);

// Purchase Tasks (My Task / Rate Bucket / Admin Tracking)
const PurchaseTasks = React.lazy(() => import("./views/admin/PurchaseTasks"));

// Task Dashboard (Task Management)
const TaskList = React.lazy(() => import("./views/admin/TaskList"));
const TaskForm = React.lazy(() => import("./views/admin/TaskForm"));
const TaskView = React.lazy(() => import("./views/admin/TaskView"));
const TaskBucket = React.lazy(() => import("./views/admin/TaskBucket"));
const TaskBucketView = React.lazy(() => import("./views/admin/TaskBucketView"));
const TaskBucketRateForm = React.lazy(
  () => import("./views/admin/TaskBucketRateForm"),
);

// DMG Bucket (Purchase role)
const DmgBucket = React.lazy(() => import("./views/admin/DmgBucket"));
const ProBucketList = React.lazy(() => import("./views/admin/ProBucketList"));
const QueryProductsList = React.lazy(
  () => import("./views/admin/QueryProductsList"),
);
const QueryProductView = React.lazy(
  () => import("./views/admin/QueryProductView"),
);
const ProBucketDetail = React.lazy(
  () => import("./views/admin/ProBucketDetail"),
);
const LocalProcurementList = React.lazy(
  () => import("./views/admin/LocalProcurementList"),
);
const LocalPurchaseList = React.lazy(
  () => import("./views/admin/LocalPurchaseList"),
);
const MyPurchaseList = React.lazy(() => import("./views/admin/MyPurchaseList"));
const ProDashboard = React.lazy(() => import("./views/dashboard/ProDashboard"));
const PurchaseBucketList = React.lazy(
  () => import("./views/admin/PurchaseBucketList"),
);
const PurchaseBucketDetail = React.lazy(
  () => import("./views/admin/PurchaseBucketDetail"),
);
const RaiseBillingRequest = React.lazy(
  () => import("./views/admin/RaiseBillingRequest"),
);
const PoBucketDashboard = React.lazy(
  () => import("./views/admin/PoBucketDashboard"),
);
const PoBucketView = React.lazy(() => import("./views/admin/PoBucketView"));
const InventoryBucketList = React.lazy(
  () => import("./views/admin/InventoryBucketList"),
);
const DispatchmentList = React.lazy(
  () => import("./views/admin/DispatchmentList"),
);
const DeliveryApprovalList = React.lazy(
  () => import("./views/admin/DeliveryApprovalList"),
);
const PoProductsList = React.lazy(() => import("./views/admin/PoProductsList"));
const PoProductView = React.lazy(() => import("./views/admin/PoProductView"));
const PoProductAdd = React.lazy(() => import("./views/admin/PoProductAdd"));
const PoProductCreate = React.lazy(
  () => import("./views/admin/PoProductCreate"),
);

// Employees
const EmployeeList = React.lazy(() => import("./views/admin/EmployeeList"));
const EmployeeView = React.lazy(() => import("./views/admin/EmployeeView"));
const EmployeeForm = React.lazy(() => import("./views/admin/EmployeeForm"));
const EmployeeLocations = React.lazy(
  () => import("./views/hod/EmployeeLocations"),
);

// Areas
const AreaList = React.lazy(() => import("./views/admin/AreaList"));
const AreaForm = React.lazy(() => import("./views/admin/AreaForm"));
const AreaView = React.lazy(() => import("./views/admin/AreaView"));
const SubZoneList = React.lazy(() => import("./views/admin/SubZoneList"));
const SubZoneForm = React.lazy(() => import("./views/admin/SubZoneForm"));
const CompanyDocumentList = React.lazy(
  () => import("./views/admin/CompanyDocumentList"),
);
const BranchSettings = React.lazy(() => import("./views/admin/BranchSettings"));
const SidebarDocs = React.lazy(() => import("./views/admin/SidebarDocs"));

// Industries
const IndustryList = React.lazy(() => import("./views/admin/IndustryList"));
const IndustryForm = React.lazy(() => import("./views/admin/IndustryForm"));
const IndustryView = React.lazy(() => import("./views/admin/IndustryView"));

// Industry Branches
const IndustryBranchList = React.lazy(
  () => import("./views/admin/IndustryBranchList"),
);
const IndustryBranchForm = React.lazy(
  () => import("./views/admin/IndustryBranchForm"),
);
const IndustryBranchView = React.lazy(
  () => import("./views/admin/IndustryBranchView"),
);

// Contact Persons (Customer Contacts / Supplier Contacts) — frontend-only
// dummy data, not backed by a real API (see data/businessPartnerDummy.js)
const CustomerContactList = React.lazy(() =>
  import("./views/admin/ContactPersonList").then((m) => ({
    default: m.CustomerContactList,
  })),
);
const CustomerContactForm = React.lazy(() =>
  import("./views/admin/ContactPersonForm").then((m) => ({
    default: m.CustomerContactForm,
  })),
);
const SupplierContactList = React.lazy(() =>
  import("./views/admin/ContactPersonList").then((m) => ({
    default: m.SupplierContactList,
  })),
);
const SupplierContactForm = React.lazy(() =>
  import("./views/admin/ContactPersonForm").then((m) => ({
    default: m.SupplierContactForm,
  })),
);

// Notifications
const NotificationsPage = React.lazy(
  () => import("./views/notifications/NotificationsPage"),
);

// Error pages
const Page401 = React.lazy(() => import("./views/pages/page401/Page401"));

// Reports section — frontend-only, sample-data report pages
const ReportsOverview = React.lazy(
  () => import("./views/reports/ReportsOverview"),
);
const SalesReport = React.lazy(() => import("./views/reports/SalesReport"));
const PurchaseReport = React.lazy(
  () => import("./views/reports/PurchaseReport"),
);
const InventoryReport = React.lazy(
  () => import("./views/reports/InventoryReport"),
);
const FinanceReport = React.lazy(() => import("./views/reports/FinanceReport"));
const HrReport = React.lazy(() => import("./views/reports/HrReport"));
const TargetsReport = React.lazy(() => import("./views/reports/TargetsReport"));

// Sales Manager section — frontend-only, sample-data pages (sidebar-gated
// to the sales_manager role; see _nav.js). Dashboard content lives in the
// existing views/dashboard/SalesDashboard.js (updated in place), not here.
const SalesMasterDuePayments = React.lazy(
  () => import("./views/salesMaster/DuePayments"),
);
const SalesMasterClients = React.lazy(
  () => import("./views/salesMaster/Clients"),
);
const SalesMasterProductSalesList = React.lazy(
  () => import("./views/salesMaster/ProductSalesList"),
);
const SalesMasterQuery = React.lazy(() => import("./views/salesMaster/Query"));
const SalesMasterQueryProducts = React.lazy(
  () => import("./views/salesMaster/QueryProducts"),
);
const SalesMasterQueryFollowup = React.lazy(
  () => import("./views/salesMaster/QueryFollowup"),
);
const SalesMasterQuotation = React.lazy(
  () => import("./views/salesMaster/Quotation"),
);
const SalesMasterQuotationProducts = React.lazy(
  () => import("./views/salesMaster/QuotationProducts"),
);
const SalesMasterQuotationFollowup = React.lazy(
  () => import("./views/salesMaster/QuotationFollowup"),
);
const SalesMasterCreateSalesOrder = React.lazy(
  () => import("./views/salesMaster/CreateSalesOrder"),
);
const SalesMasterSalesOrderStatus = React.lazy(
  () => import("./views/salesMaster/SalesOrderStatus"),
);
const SalesMasterPerformanceReport = React.lazy(
  () => import("./views/salesMaster/MyPerformanceReport"),
);
const SalesMasterClientView = React.lazy(
  () => import("./views/salesMaster/ClientView"),
);
const SalesMasterQueryView = React.lazy(
  () => import("./views/salesMaster/QueryView"),
);
const SalesMasterQuotationView = React.lazy(
  () => import("./views/salesMaster/QuotationView"),
);
const SalesMasterSalesOrderView = React.lazy(
  () => import("./views/salesMaster/SalesOrderView"),
);
const SalesMasterDuePaymentView = React.lazy(
  () => import("./views/salesMaster/DuePaymentView"),
);
const SalesMasterProductSalesView = React.lazy(
  () => import("./views/salesMaster/ProductSalesView"),
);

// Purchase Manager section — frontend-only, sample-data pages (sidebar-gated
// to the purchase_exicutive role; see _nav.js).
const PurchaseMasterDashboard = React.lazy(
  () => import("./views/purchaseMaster/PurchaseMasterDashboard"),
);
const PurchaseMasterSuppliers = React.lazy(
  () => import("./views/purchaseMaster/Suppliers"),
);
const PurchaseMasterPurchaseRequests = React.lazy(
  () => import("./views/purchaseMaster/PurchaseRequests"),
);
const PurchaseMasterLocalPurchase = React.lazy(
  () => import("./views/purchaseMaster/LocalPurchase"),
);
const PurchaseMasterBrandPurchase = React.lazy(
  () => import("./views/purchaseMaster/BrandPurchase"),
);
const PurchaseMasterPurchaseOrder = React.lazy(
  () => import("./views/purchaseMaster/PurchaseOrder"),
);
const PurchaseMasterGrn = React.lazy(
  () => import("./views/purchaseMaster/Grn"),
);
const PurchaseMasterPurchaseReturn = React.lazy(
  () => import("./views/purchaseMaster/PurchaseReturn"),
);
const PurchaseMasterVendorPayments = React.lazy(
  () => import("./views/purchaseMaster/VendorPayments"),
);
const PurchaseMasterPurchaseHistory = React.lazy(
  () => import("./views/purchaseMaster/PurchaseHistory"),
);
const PurchaseMasterPerformanceReport = React.lazy(
  () => import("./views/purchaseMaster/MyPerformanceReport"),
);

// Procurement Manager section — frontend-only, sample-data pages
// (sidebar-gated to the procurement_master role; see _nav.js).
const ProcurementMasterDashboard = React.lazy(
  () => import("./views/procurementMaster/ProcurementMasterDashboard"),
);
const ProcurementMasterSuppliers = React.lazy(
  () => import("./views/procurementMaster/Suppliers"),
);
const ProcurementMasterProcurementRequests = React.lazy(
  () => import("./views/procurementMaster/ProcurementRequests"),
);
const ProcurementMasterLocalProcurement = React.lazy(
  () => import("./views/procurementMaster/LocalProcurement"),
);
const ProcurementMasterBrandProcurement = React.lazy(
  () => import("./views/procurementMaster/BrandProcurement"),
);
const ProcurementMasterProcurementHistory = React.lazy(
  () => import("./views/procurementMaster/ProcurementHistory"),
);
const ProcurementMasterPerformanceReport = React.lazy(
  () => import("./views/procurementMaster/MyPerformanceReport"),
);

import sidebarPageRoutes from "./routes/sidebarPageRoutes";
// 'module' maps to the RBAC module key, 'action' specifies required permission
// Routes without module are accessible to all authenticated users
const routes = [
  { path: "/", exact: true, name: "Home" },
  { path: "/dashboard", name: "Dashboard", element: Dashboard },
  {
    path: "/sales-dashboard",
    name: "Sales Dashboard",
    element: SalesDashboard,
  },
  {
    path: "/purchase-dashboard",
    name: "Purchase Dashboard",
    element: PurchaseDashboard,
  },

  // Companies
  {
    path: "/companies",
    name: "Companies",
    element: CompanyList,
    module: "companies",
    action: "read",
  },
  {
    path: "/companies/new",
    name: "Add Company",
    element: CompanyForm,
    module: "companies",
    action: "create",
  },
  {
    path: "/companies/edit/:id",
    name: "Edit Company",
    element: CompanyForm,
    module: "companies",
    action: "update",
  },
  {
    path: "/companies/:id",
    name: "Company Details",
    element: CompanyView,
    module: "companies",
    action: "read",
  },
  {
    path: "/companies/:companyId/branches",
    name: "Company Branches",
    element: BranchManagement,
    module: "branches",
    action: "read",
  },

  // Branches
  {
    path: "/branches",
    name: "Branches",
    element: BranchList,
    module: "branches",
    action: "read",
  },
  {
    path: "/branches/:id",
    name: "Branch Details",
    element: BranchView,
    module: "branches",
    action: "read",
  },

  // Categories
  {
    path: "/categories",
    name: "Categories",
    element: CategoryList,
    module: "categories",
    action: "read",
  },
  {
    path: "/categories/new",
    name: "Add Category",
    element: CategoryForm,
    module: "categories",
    action: "create",
  },
  {
    path: "/categories/edit/:id",
    name: "Edit Category",
    element: CategoryForm,
    module: "categories",
    action: "update",
  },
  {
    path: "/categories/:id",
    name: "Category Details",
    element: CategoryView,
    module: "categories",
    action: "read",
  },

  // Subcategories
  {
    path: "/sub-categories",
    name: "Sub Categories",
    element: SubcategoryList,
    module: "subcategories",
    action: "read",
  },
  {
    path: "/sub-categories/new",
    name: "Add Subcategory",
    element: SubcategoryForm,
    module: "subcategories",
    action: "create",
  },
  {
    path: "/sub-categories/edit/:id",
    name: "Edit Subcategory",
    element: SubcategoryForm,
    module: "subcategories",
    action: "update",
  },
  {
    path: "/sub-categories/:id",
    name: "Subcategory Details",
    element: SubcategoryView,
    module: "subcategories",
    action: "read",
  },

  // Legacy path aliases
  {
    path: "/subcategories",
    name: "Subcategories",
    element: SubcategoryList,
    module: "subcategories",
    action: "read",
  },
  {
    path: "/subcategories/new",
    name: "Add Subcategory",
    element: SubcategoryForm,
    module: "subcategories",
    action: "create",
  },
  {
    path: "/subcategories/edit/:id",
    name: "Edit Subcategory",
    element: SubcategoryForm,
    module: "subcategories",
    action: "update",
  },
  {
    path: "/subcategories/:id",
    name: "Subcategory Details",
    element: SubcategoryView,
    module: "subcategories",
    action: "read",
  },

  // Groups
  {
    path: "/groups",
    name: "Groups",
    element: GroupList,
    module: "groups",
    action: "read",
  },
  {
    path: "/groups/new",
    name: "Add Group",
    element: GroupForm,
    module: "groups",
    action: "create",
  },
  {
    path: "/groups/edit/:id",
    name: "Edit Group",
    element: GroupForm,
    module: "groups",
    action: "update",
  },

  // Brands
  {
    path: "/brands",
    name: "Brands",
    element: BrandList2,
    module: "brands",
    action: "read",
  },
  {
    path: "/brands/new",
    name: "Add Brands",
    element: BrandForm,
    module: "brands",
    action: "create",
  },
  {
    path: "/brands/edit/:id",
    name: "Edit Brands",
    element: BrandForm,
    module: "brands",
    action: "update",
  },

  // Products
  {
    path: "/products",
    name: "Products",
    element: ProductList,
    module: "products",
    action: "read",
  },
  {
    path: "/products/new",
    name: "Add Product",
    element: ProductForm,
    module: "products",
    action: "create",
  },
  {
    path: "/products/edit/:id",
    name: "Edit Product",
    element: ProductForm,
    module: "products",
    action: "update",
  },
  {
    path: "/products/:id",
    name: "Product Details",
    element: ProductView,
    module: "products",
    action: "read",
  },
  {
    path: "/product-lead",
    name: "Product Lead",
    element: ProductLead,
    module: "products",
    action: "read",
  },
  {
    path: "/product-lead/:id",
    name: "Product Lead Details",
    element: ProductLeadView,
    module: "products",
    action: "read",
  },

  // Queries
  {
    path: "/queries",
    name: "Queries",
    element: QueryList,
    module: "queries",
    action: "read",
  },
  {
    path: "/queries/new",
    name: "Add Queries",
    element: QueryForm,
    module: "queries",
    action: "create",
  },
  {
    path: "/queries/edit/:id",
    name: "Edit Queries",
    element: QueryForm,
    module: "queries",
    action: "update",
  },
  {
    path: "/queries/:id",
    name: "Query Details",
    element: QueryView,
    module: "queries",
    action: "read",
  },
  {
    path: "/raw-query",
    name: "Raw Query",
    element: RawQuery,
    module: "raw_queries",
    action: "read",
  },
  {
    path: "/raw-query/new",
    name: "New Raw Query",
    element: RawQueryCreate,
    module: "raw_queries",
    action: "create",
  },
  {
    path: "/raw-query/:id",
    name: "Raw Query Details",
    element: RawQueryView,
    module: "raw_queries",
    action: "read",
  },
  {
    path: "/tracking",
    name: "Tracking",
    element: Tracking,
    module: "queries",
    action: "read",
  },

  // Quotations
  {
    path: "/quotations",
    name: "Quotations",
    element: QuotationList,
    module: "quotations",
    action: "read",
  },
  {
    path: "/quote-logs",
    name: "Quote Logs",
    element: QuoteLogsView,
    module: "quotations",
    action: "read",
  },
  {
    path: "/quotations/generate/:queryId",
    name: "Generate Quotation",
    element: QuotationGenerate,
    module: "quotations",
    action: "create",
    allowedRolePrefix: "sales",
    allowRolePrefixOrModule: true,
  },
  {
    path: "/quotations/new",
    name: "Add Quotations",
    element: QuotationForm,
    module: "quotations",
    action: "create",
  },
  {
    path: "/quotations/edit/:id",
    name: "Edit Quotations",
    element: QuotationForm,
    module: "quotations",
    action: "update",
  },
  {
    path: "/quotations/:id/finalize-sales-order",
    name: "Finalize Sales Order",
    element: FinalizeSalesOrder,
    module: "quotations",
    action: "read",
  },
  {
    path: "/quotations/:id",
    name: "Quotation Details",
    element: QuotationView,
    module: "quotations",
    action: "read",
  },

  // Finance
  {
    path: "/finance",
    name: "Finance",
    element: FinanceDashboard,
    module: "finance",
    action: "read",
  },
  {
    path: "/branch-analytics",
    name: "Branch Analytics",
    element: BranchAnalytics,
    module: "branch_analytics",
    action: "read",
  },
  {
    path: "/target-analytics",
    name: "Target Analytics",
    element: TargetAnalytics,
    module: "target_analytics",
    action: "read",
  },
  {
    path: "/hod-dashboard",
    name: "HOD Dashboard",
    element: HodDashboard,
    allowedRoles: ["head_of_department", "hod", "super_admin", "admin"],
  },
  {
    path: "/salary-management",
    name: "Salary Management",
    element: SalaryManagement,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/salary-management/generate",
    name: "Generate Salary Slip",
    element: SalarySlipForm,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/salary-management/edit/:id",
    name: "Edit Salary Slip",
    element: SalarySlipForm,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/my-salary",
    name: "My Salary",
    element: MySalary,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/target-dashboard",
    name: "Target Dashboard",
    element: TargetDashboard,
    allowedRoles: ["head_of_department", "hod", "super_admin", "admin"],
  },
  {
    path: "/my-targets",
    name: "My Targets",
    element: MyTargets,
    module: "target_analytics",
    action: "read",
    allowedRolePrefix: "sales",
  },
  {
    path: "/purchase-order-sidebar",
    name: "Sales Order",
    element: PurchaseOrderSidebar,
    module: "po_payment",
    action: "read",
  },
  {
    path: "/po-payment",
    name: "Sales Order payment",
    element: PoPaymentSidebar,
    module: "po_payment",
    action: "read",
    excludeRolePrefix: "sales",
  },
  {
    path: "/pending-payment",
    name: "Pending payment",
    element: PendingPayment,
    allowedRolePrefix: "sales",
  },
  {
    path: "/po-payment-backlog",
    name: "Sales Order Payment Backlog",
    element: PoPaymentBacklog,
    module: "po_payment_backlog",
    action: "read",
  },
  {
    path: "/hod-payment-backlog",
    name: "Payment Backlog",
    element: HodPaymentBacklog,
    allowedRoles: ["head_of_department", "hod", "super_admin"],
  },
  {
    path: "/quotation-followup",
    name: "Quotation Follow-up",
    element: QuotationFollowupDashboard,
    module: "quotations",
    action: "read",
    allowedRolePrefix: "sales",
  },
  {
    path: "/followup-dashboard",
    name: "Follow-up Dashboard",
    element: QuotationFollowupDashboard,
    allowedRoles: ["head_of_department", "hod", "super_admin"],
  },
  {
    path: "/billing-requests",
    name: "Billing request",
    element: BillingRequestList,
    module: "billing_request",
    action: "read",
  },
  {
    path: "/billing-requests/:id",
    name: "Billing Request Detail",
    element: BillingRequestView,
    module: "billing_request",
    action: "read",
  },
  {
    path: "/purchase-requests",
    name: "Purchase Requests",
    element: HodPurchaseRequestList,
    module: null,
    action: "read",
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/purchase-requests/:id",
    name: "Purchase Request Detail",
    element: HodPurchaseRequestView,
    module: null,
    action: "read",
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/batch-billing-requests",
    name: "Batch Billing Requests",
    element: BatchBillingRequests,
    allowedRolePrefix: "purchase",
  },
  {
    path: "/batch-billing-requests/:id",
    name: "Batch Billing Request Detail",
    element: BatchBillingRequestDetail,
    allowedRolePrefix: "purchase",
  },
  {
    path: "/visit-management-sidebar",
    name: "Visit Management",
    element: VisitManagementSidebar,
    module: "visit_management",
    action: "read",
  },
  {
    path: "/my-visits",
    name: "My Visits",
    element: MyVisits,
    module: "my_visits",
    action: "read",
  },

  // Suppliers
  {
    path: "/suppliers",
    name: "Suppliers",
    element: SupplierList,
    module: "suppliers",
    action: "read",
  },
  {
    path: "/suppliers/new",
    name: "Add Supplier",
    element: SupplierForm,
    module: "suppliers",
    action: "create",
  },
  {
    path: "/suppliers/edit/:id",
    name: "Edit Supplier",
    element: SupplierForm,
    module: "suppliers",
    action: "update",
  },
  {
    path: "/suppliers/:id",
    name: "Supplier Details",
    element: SupplierView,
    module: "suppliers",
    action: "read",
  },

  // Rate Cards
  {
    path: "/rate-cards",
    name: "Rate Cards",
    element: RateCardList,
    module: "rate_cards",
    action: "read",
  },

  // Master > Rate Master (mock/demo board)
  {
    path: "/master/rate-master",
    name: "Rate Master",
    element: RateMasterBoard,
    module: null,
    action: "read",
  },
  {
    path: "/master/rate-master/:productId",
    name: "Rate Master Variants",
    element: RateMasterVariants,
    module: null,
    action: "read",
  },

  // Purchase Tasks
  {
    path: "/purchase-tasks",
    name: "Purchase Tasks",
    element: PurchaseTasks,
    module: "purchase_tasks",
    action: "read",
  },

  // Task Dashboard
  {
    path: "/task-dashboard",
    name: "Task Dashboard",
    element: TaskList,
    module: "task_management",
    action: "read",
  },
  {
    path: "/task-dashboard/new",
    name: "Create Task",
    element: TaskForm,
    module: "task_management",
    action: "create",
  },
  {
    path: "/task-dashboard/:id",
    name: "Task Details",
    element: TaskView,
    module: "task_management",
    action: "read",
  },

  // Task Bucket (tasks assigned to current employee)
  {
    path: "/task-bucket",
    name: "Task Bucket",
    element: TaskBucket,
    module: "task_bucket",
    action: "read",
  },
  {
    path: "/task-bucket/:id",
    name: "Task Bucket Details",
    element: TaskBucketView,
    module: "task_bucket",
    action: "read",
  },
  {
    path: "/task-bucket/:id/rate",
    name: "Task Bucket Rate",
    element: TaskBucketRateForm,
    module: "task_bucket",
    action: "update",
  },

  // Follow-up Dashboard
  {
    path: "/follow-up",
    name: "Follow-up Dashboard",
    element: FollowUpDashboard,
    module: "follow_up",
    action: "read",
  },

  // DMG Bucket (Purchase Executive)
  {
    path: "/dmg",
    name: "DMG Bucket",
    element: DmgBucket,
    module: "dmg",
    action: "read",
  },

  {
    path: "/pro-dashboard",
    name: "Pro Dashboard",
    element: ProDashboard,
    module: "pro_bucket",
    action: "read",
  },
  {
    path: "/pro-bucket",
    name: "Pro Bucket",
    element: ProBucketList,
    module: "pro_bucket",
    action: "read",
  },
  {
    path: "/query-products",
    name: "Query Products",
    element: QueryProductsList,
    module: "queries",
    action: "read",
  },
  {
    path: "/query-products/:id",
    name: "Query Product Detail",
    element: QueryProductView,
    module: "queries",
    action: "read",
  },
  {
    path: "/po-bucket",
    name: "Sales Order Bucket",
    element: PoBucketDashboard,
    module: "po_bucket",
    action: "read",
  },
  {
    path: "/po-bucket/:id",
    name: "Sales Order Bucket item",
    element: PoBucketView,
    module: "po_bucket",
    action: "read",
  },
  {
    path: "/inventory-bucket",
    name: "Inventory bucket",
    element: InventoryBucketList,
    module: "inventory_bucket",
    action: "read",
  },
  {
    path: "/dispatchment",
    name: "Dispatchment",
    element: DispatchmentList,
    module: "dispatchment",
    action: "read",
  },
  {
    path: "/delivery-approval",
    name: "Delivery approval",
    element: DeliveryApprovalList,
    module: null,
    action: "read",
    allowedRoles: ["super_admin", "admin", "head_of_department", "hod"],
  },
  {
    path: "/po-products",
    name: "Sales Order Products",
    element: PoProductsList,
    module: null,
    action: "read",
    allowedRoles: ["super_admin", "admin", "head_of_department", "hod"],
  },
  {
    path: "/po-products/add",
    name: "Add Sales Order Product",
    element: PoProductAdd,
    module: null,
    action: "read",
    allowedRoles: ["super_admin", "admin", "head_of_department", "hod"],
  },
  {
    path: "/po-products/create",
    name: "Create Sales Order Product",
    element: PoProductCreate,
    module: null,
    action: "read",
    allowedRoles: ["super_admin", "admin", "head_of_department", "hod"],
  },
  {
    path: "/po-products/:id",
    name: "Sales Order Product Detail",
    element: PoProductView,
    module: null,
    action: "read",
    allowedRoles: ["super_admin", "admin", "head_of_department", "hod"],
  },
  {
    path: "/pro-bucket/:id",
    name: "Pro Bucket item",
    element: ProBucketDetail,
    module: "pro_bucket",
    action: "read",
  },
  {
    path: "/local-pro",
    name: "Local Pro",
    element: LocalProcurementList,
    module: null,
    action: "read",
    allowedRoles: [
      "procurement",
      "localprocurement",
      "super_admin",
      "admin",
      "head_of_department",
      "hod",
    ],
  },
  {
    path: "/local-purchase",
    name: "Local Purchase",
    element: LocalPurchaseList,
    module: null,
    action: "read",
    allowedRoles: [
      "procurement",
      "purchase_exicutive",
      "super_admin",
      "admin",
      "head_of_department",
      "hod",
    ],
  },
  {
    path: "/my-purchase",
    name: "My Purchase",
    element: MyPurchaseList,
    module: null,
    action: "read",
    allowedRoles: ["localpurchase"],
  },
  {
    path: "/purchase-bucket",
    name: "Purchase Bucket",
    element: PurchaseBucketList,
    module: "purchase_bucket",
    action: "read",
  },
  {
    path: "/purchase-bucket/raise-billing-request",
    name: "Raise Billing Request",
    element: RaiseBillingRequest,
    module: "purchase_bucket",
    action: "update",
  },
  {
    path: "/purchase-bucket/:id",
    name: "Purchase Bucket item",
    element: PurchaseBucketDetail,
    module: "purchase_bucket",
    action: "read",
  },

  // Employees
  {
    path: "/employee-locations",
    name: "Employee locations",
    element: EmployeeLocations,
    module: null,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/employees",
    name: "Employees",
    element: EmployeeList,
    module: "employees",
    action: "read",
  },
  {
    path: "/employees/new",
    name: "Add Employee",
    element: EmployeeForm,
    module: "employees",
    action: "create",
  },
  {
    path: "/employees/edit/:id",
    name: "Edit Employee",
    element: EmployeeForm,
    module: "employees",
    action: "update",
  },
  {
    path: "/employees/:id",
    name: "Employee Details",
    element: EmployeeView,
    module: "employees",
    action: "read",
  },

  // Zones
  {
    path: "/zones",
    name: "Zones",
    element: AreaList,
    module: "zones",
    action: "read",
  },
  {
    path: "/zones/new",
    name: "Add Zone",
    element: AreaForm,
    module: "zones",
    action: "create",
  },
  {
    path: "/zones/edit/:id",
    name: "Edit Zone",
    element: AreaForm,
    module: "zones",
    action: "update",
  },
  {
    path: "/zones/:id",
    name: "Zone Details",
    element: AreaView,
    module: "zones",
    action: "read",
  },

  {
    path: "/sub-zones",
    name: "Sub-zones",
    element: SubZoneList,
    module: "sub_zones",
    action: "read",
  },
  {
    path: "/sub-zones/new",
    name: "Add sub-zone",
    element: SubZoneForm,
    module: "sub_zones",
    action: "create",
  },
  {
    path: "/company-documents",
    name: "Company documents",
    element: CompanyDocumentList,
    module: null,
    action: "read",
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/branch-settings",
    name: "Settings",
    element: BranchSettings,
    module: null,
    action: "read",
    allowedRoles: ["head_of_department", "hod", "admin", "super_admin"],
  },
  {
    path: "/company-catalog",
    name: "Company Catalog",
    element: SidebarDocs,
    module: null,
    action: "read",
  },

  // Industries
  {
    path: "/industries",
    name: "Customers",
    element: IndustryList,
    module: "industries",
    action: "read",
  },
  {
    path: "/industries/new",
    name: "Add customer",
    element: IndustryForm,
    module: "industries",
    action: "create",
  },
  {
    path: "/industries/edit/:id",
    name: "Edit customer",
    element: IndustryForm,
    module: "industries",
    action: "update",
  },
  {
    path: "/industries/:id",
    name: "Customer details",
    element: IndustryView,
    module: "industries",
    action: "read",
  },

  // Industry Branches
  {
    path: "/industry-branches",
    name: "Client branches",
    element: IndustryBranchList,
    module: "industry_branches",
    action: "read",
  },
  {
    path: "/industry-branches/new",
    name: "Add client branch",
    element: IndustryBranchForm,
    module: "industry_branches",
    action: "create",
  },
  {
    path: "/industry-branches/edit/:id",
    name: "Edit client branch",
    element: IndustryBranchForm,
    module: "industry_branches",
    action: "update",
  },
  {
    path: "/industry-branches/:id",
    name: "Client branch details",
    element: IndustryBranchView,
    module: "industry_branches",
    action: "read",
  },

  // Customer Contacts (new, dummy) — replaces the old /industry-branches
  // link on the sidebar only; /industry-branches itself is untouched.
  {
    path: "/customer-contacts",
    name: "Customer contacts",
    element: CustomerContactList,
    module: "industry_branches",
    action: "read",
  },
  {
    path: "/customer-contacts/new",
    name: "Add customer contact",
    element: CustomerContactForm,
    module: "industry_branches",
    action: "create",
  },
  {
    path: "/customer-contacts/edit/:id",
    name: "Edit customer contact",
    element: CustomerContactForm,
    module: "industry_branches",
    action: "update",
  },

  // Supplier Contacts (new, dummy) — was a dead sidebar link before
  {
    path: "/supplier-contacts",
    name: "Supplier contacts",
    element: SupplierContactList,
    module: "suppliers",
    action: "read",
  },
  {
    path: "/supplier-contacts/new",
    name: "Add supplier contact",
    element: SupplierContactForm,
    module: "suppliers",
    action: "create",
  },
  {
    path: "/supplier-contacts/edit/:id",
    name: "Edit supplier contact",
    element: SupplierContactForm,
    module: "suppliers",
    action: "update",
  },

  // Admin routes for company/branch management (legacy)
  {
    path: "/admin/companies/:companyId/branches",
    name: "Branches",
    element: BranchManagement,
    module: "branches",
    action: "read",
  },
  {
    path: "/admin/companies/:companyId/branches/:branchId/users",
    name: "Branch Users",
    element: BranchUserManagement,
    module: "branches",
    action: "read",
  },

  // Reports — frontend-only sample-data views, accessible to all
  // authenticated users (no module/action: not yet wired to a backend
  // permission).
  { path: "/reports", name: "Reports Overview", element: ReportsOverview },
  { path: "/reports/sales", name: "Sales Report", element: SalesReport },
  {
    path: "/reports/purchase",
    name: "Purchase Report",
    element: PurchaseReport,
  },
  {
    path: "/reports/inventory",
    name: "Inventory Report",
    element: InventoryReport,
  },
  { path: "/reports/finance", name: "Finance Report", element: FinanceReport },
  { path: "/reports/hr", name: "HR Report", element: HrReport },
  { path: "/reports/targets", name: "Targets Report", element: TargetsReport },

  // Sales Manager section — frontend-only sample-data views. Only linked
  // from the sidebar for the sales_manager role (see _nav.js); routes
  // themselves carry no module/action gating, same as Reports above.
  {
    path: "/sales-master/due-payments",
    name: "Sales Manager Due Payments",
    element: SalesMasterDuePayments,
  },
  {
    path: "/sales-master/due-payments/:id",
    name: "Sales Manager Due Payment Detail",
    element: SalesMasterDuePaymentView,
  },
  {
    path: "/sales-master/clients",
    name: "Sales Manager Client",
    element: SalesMasterClients,
  },
  {
    path: "/sales-master/clients/:id",
    name: "Sales Manager Client Detail",
    element: SalesMasterClientView,
  },
  {
    path: "/sales-master/product-sales-list",
    name: "Sales Manager Product Sales List",
    element: SalesMasterProductSalesList,
  },
  {
    path: "/sales-master/product-sales-list/:sku",
    name: "Sales Manager Product Sales Detail",
    element: SalesMasterProductSalesView,
  },
  {
    path: "/sales-master/query",
    name: "Sales Manager Query",
    element: SalesMasterQuery,
  },
  {
    path: "/sales-master/query/:id",
    name: "Sales Manager Query Detail",
    element: SalesMasterQueryView,
  },
  {
    path: "/sales-master/query-products",
    name: "Sales Manager Query Products",
    element: SalesMasterQueryProducts,
  },
  {
    path: "/sales-master/query-followup",
    name: "Sales Manager Query Followup",
    element: SalesMasterQueryFollowup,
  },
  {
    path: "/sales-master/quotation",
    name: "Sales Manager Quotation",
    element: SalesMasterQuotation,
  },
  {
    path: "/sales-master/quotation/:id",
    name: "Sales Manager Quotation Detail",
    element: SalesMasterQuotationView,
  },
  {
    path: "/sales-master/quotation-products",
    name: "Sales Manager Quotation Product",
    element: SalesMasterQuotationProducts,
  },
  {
    path: "/sales-master/quotation-followup",
    name: "Sales Manager Quotation Followup",
    element: SalesMasterQuotationFollowup,
  },
  {
    path: "/sales-master/sales-order/create",
    name: "Create Sales Order",
    element: SalesMasterCreateSalesOrder,
  },
  {
    path: "/sales-master/sales-order/status",
    name: "Sales Order Status",
    element: SalesMasterSalesOrderStatus,
  },
  {
    path: "/sales-master/sales-order/:id",
    name: "Sales Manager Sales Order Detail",
    element: SalesMasterSalesOrderView,
  },
  {
    path: "/sales-master/reports/my-performance",
    name: "My Performance Report",
    element: SalesMasterPerformanceReport,
  },

  // Purchase Manager section — frontend-only sample-data views. Only linked
  // from the sidebar for the purchase_manager role (see _nav.js); routes
  // themselves carry no module/action gating, same as Sales Manager above.
  {
    path: "/purchase-master/dashboard",
    name: "Purchase Manager Dashboard",
    element: PurchaseMasterDashboard,
  },
  {
    path: "/purchase-master/suppliers",
    name: "Purchase Manager Suppliers",
    element: PurchaseMasterSuppliers,
  },
  {
    path: "/purchase-master/purchase-requests",
    name: "Purchase Manager Purchase Requests",
    element: PurchaseMasterPurchaseRequests,
  },
  {
    path: "/purchase-master/local-purchase",
    name: "Purchase Manager Local Purchase",
    element: PurchaseMasterLocalPurchase,
  },
  {
    path: "/purchase-master/brand-purchase",
    name: "Purchase Manager Brand Purchase",
    element: PurchaseMasterBrandPurchase,
  },
  {
    path: "/purchase-master/purchase-order",
    name: "Purchase Manager Purchase Order",
    element: PurchaseMasterPurchaseOrder,
  },
  {
    path: "/purchase-master/grn",
    name: "Purchase Manager GRN",
    element: PurchaseMasterGrn,
  },
  {
    path: "/purchase-master/purchase-return",
    name: "Purchase Manager Purchase Return",
    element: PurchaseMasterPurchaseReturn,
  },
  {
    path: "/purchase-master/vendor-payments",
    name: "Purchase Manager Vendor Payments",
    element: PurchaseMasterVendorPayments,
  },
  {
    path: "/purchase-master/purchase-history",
    name: "Purchase Manager Purchase History",
    element: PurchaseMasterPurchaseHistory,
  },
  {
    path: "/purchase-master/reports/my-performance",
    name: "Purchase Manager My Performance Report",
    element: PurchaseMasterPerformanceReport,
  },

  // Procurement Manager section — frontend-only sample-data views. Only
  // linked from the sidebar for the procurement_master role (see _nav.js);
  // routes themselves carry no module/action gating, same as Purchase
  // Manager above.
  {
    path: "/procurement-master/dashboard",
    name: "Procurement Master Dashboard",
    element: ProcurementMasterDashboard,
  },
  {
    path: "/procurement-master/suppliers",
    name: "Procurement Master Suppliers",
    element: ProcurementMasterSuppliers,
  },
  {
    path: "/procurement-master/procurement-requests",
    name: "Procurement Master Procurement Requests",
    element: ProcurementMasterProcurementRequests,
  },
  {
    path: "/procurement-master/local-procurement",
    name: "Procurement Master Local Procurement",
    element: ProcurementMasterLocalProcurement,
  },
  {
    path: "/procurement-master/brand-procurement",
    name: "Procurement Master Brand Procurement",
    element: ProcurementMasterBrandProcurement,
  },
  {
    path: "/procurement-master/procurement-history",
    name: "Procurement Master Procurement History",
    element: ProcurementMasterProcurementHistory,
  },
  {
    path: "/procurement-master/reports/my-performance",
    name: "Procurement Master My Performance Report",
    element: ProcurementMasterPerformanceReport,
  },

  // Notifications - accessible to all authenticated users
  { path: "/notifications", name: "Notifications", element: NotificationsPage },

  // Unauthorized page - accessible by all
  { path: "/unauthorized", name: "Unauthorized", element: Page401 },

  // Sidebar module pages (UI entry points – existing workflows unchanged)
  ...sidebarPageRoutes,
];

export default routes;
