import React from "react";
import createSidebarPlaceholderPage from "../views/sidebar/createSidebarPlaceholderPage";

const LostQuotationsPage = createSidebarPlaceholderPage(
  "Lost Quotation",
  "Track quotations that were lost or not converted.",
);
const QuotationMasterReportPage = React.lazy(
  () => import("../views/admin/QuotationReportDashboard"),
);
const SupplierContactsPage = createSidebarPlaceholderPage(
  "Suppliers Contacts",
  "Supplier contact directory and communication details.",
);
const SalesOrderMasterReportPage = createSidebarPlaceholderPage(
  "Sales Order Report",
  "Sales order reporting and analytics.",
);
const QueryMasterReportPage = React.lazy(
  () => import("../views/admin/QueryReportDashboard"),
);
const GrnPage = createSidebarPlaceholderPage(
  "GRN",
  "Goods receipt notes for incoming purchase inventory.",
);
const PurchaseReturnPage = createSidebarPlaceholderPage(
  "Purchase Return",
  "Purchase return requests and history.",
);
const AttendancePage = createSidebarPlaceholderPage(
  "Attendance",
  "Employee attendance records and daily logs.",
);
const LeaveManagementPage = createSidebarPlaceholderPage(
  "Leave Management",
  "Employee leave requests and approvals.",
);
const FuelManagementPage = createSidebarPlaceholderPage(
  "Fuel Management",
  "Employee fuel usage and reimbursement tracking.",
);
const SalaryManagementPage = createSidebarPlaceholderPage(
  "Salary Management",
  "Employee salary records and payroll overview.",
);

const PendingActionsPage = React.lazy(
  () => import("../views/hod/HodDashboard"),
);
const ProductSaleListPage = React.lazy(
  () => import("../views/admin/ProductLead"),
);
const QuotationProductsPage = React.lazy(
  () => import("../views/admin/QuoteLogsView"),
);
const CustomerPaymentsPage = React.lazy(
  () => import("../views/admin/PoPaymentSidebar"),
);
const OverdueCustomerPaymentsPage = React.lazy(
  () => import("../views/hod/HodPaymentBacklog"),
);
const SupplierPaymentsPage = React.lazy(
  () => import("../views/admin/BillingRequestList"),
);
const OverdueSupplierPaymentsPage = React.lazy(
  () => import("../views/admin/PoPaymentBacklog"),
);
const PaymentFollowUpPage = React.lazy(
  () => import("../views/hod/HodPaymentBacklog"),
);
const PaymentHistoryPage = React.lazy(
  () => import("../views/admin/BatchBillingRequests"),
);
const PaymentHoldPage = React.lazy(
  () => import("../views/admin/PendingPayment"),
);
const SalesOrderHistoryPage = React.lazy(
  () => import("../views/admin/PoBucketDashboard"),
);
const OrderTrackingPurchasePage = React.lazy(
  () => import("../views/admin/HodPurchaseRequestList"),
);
const OrderTrackingFinancePage = React.lazy(
  () => import("../views/admin/PoPaymentSidebar"),
);
const OrderTrackingInventoryPage = React.lazy(
  () => import("../views/admin/InventoryBucketList"),
);
const OrderTrackingDispatchPage = React.lazy(
  () => import("../views/admin/DispatchmentList"),
);
const PurchaseHistoryPage = React.lazy(
  () => import("../views/admin/PurchaseBucketList"),
);
const BrandPurchasePage = React.lazy(
  () => import("../views/admin/PurchaseBucketList"),
);
const VendorPaymentsPage = React.lazy(
  () => import("../views/admin/BillingRequestList"),
);
const ProcurementHistoryPage = React.lazy(
  () => import("../views/admin/ProBucketList"),
);
const BrandProcurementPage = React.lazy(
  () => import("../views/admin/ProBucketList"),
);
const HrReportsPage = React.lazy(
  () => import("../views/admin/BranchAnalytics"),
);
const SalesReportPage = React.lazy(
  () => import("../views/admin/TargetAnalytics"),
);
const QuotationReportPage = React.lazy(
  () => import("../views/admin/QuoteLogsView"),
);
const SupplierReportPage = React.lazy(
  () => import("../views/admin/SupplierList"),
);

/** Dedicated routes for reorganized sidebar items (UI-only entry points). */
const sidebarPageRoutes = [
  {
    path: "/pending-actions",
    name: "Pending Actions",
    element: PendingActionsPage,
    module: null,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/product-sale-list",
    name: "Product Sale List",
    element: ProductSaleListPage,
    module: "products",
    action: "read",
  },
  {
    path: "/query-master/report",
    name: "Query Report",
    element: QueryMasterReportPage,
    module: "queries",
    action: "read",
  },
  {
    path: "/quotation-products",
    name: "Quotation Products",
    element: QuotationProductsPage,
    module: "quotations",
    action: "read",
  },
  {
    path: "/lost-quotations",
    name: "Lost Quotation",
    element: LostQuotationsPage,
    module: "quotations",
    action: "read",
  },
  {
    path: "/quotation-master/report",
    name: "Quotation Report",
    element: QuotationMasterReportPage,
    module: "quotations",
    action: "read",
  },
  {
    path: "/supplier-contacts",
    name: "Suppliers Contacts",
    element: SupplierContactsPage,
    module: "suppliers",
    action: "read",
  },
  {
    path: "/sales-order-history",
    name: "Sales Order History",
    element: SalesOrderHistoryPage,
    module: "po_bucket",
    action: "read",
  },
  {
    path: "/sales-order-master/report",
    name: "Sales Order Report",
    element: SalesOrderMasterReportPage,
    module: "po_bucket",
    action: "read",
  },
  {
    path: "/order-tracking/purchase",
    name: "Order Tracking – Purchase",
    element: OrderTrackingPurchasePage,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/order-tracking/finance",
    name: "Order Tracking – Finance",
    element: OrderTrackingFinancePage,
    module: "po_payment",
    action: "read",
    excludeRolePrefix: "sales",
  },
  {
    path: "/order-tracking/inventory",
    name: "Order Tracking – Inventory",
    element: OrderTrackingInventoryPage,
    module: "inventory_bucket",
    action: "read",
    excludeRolePrefix: "sales",
  },
  {
    path: "/order-tracking/dispatch",
    name: "Order Tracking – Dispatch",
    element: OrderTrackingDispatchPage,
    module: "dispatchment",
    action: "read",
    excludeRolePrefix: "sales",
  },
  {
    path: "/payment/customer",
    name: "Customer Payments",
    element: CustomerPaymentsPage,
    module: "po_payment",
    action: "read",
    excludeRolePrefix: "sales",
  },
  {
    path: "/payment/overdue-customer",
    name: "OverDue Customer Payments",
    element: OverdueCustomerPaymentsPage,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/payment/supplier",
    name: "Supplier Payments",
    element: SupplierPaymentsPage,
    module: "billing_request",
    action: "read",
    excludeRolePrefix: "sales",
  },
  {
    path: "/payment/overdue-supplier",
    name: "OverDue Supplier Payments",
    element: OverdueSupplierPaymentsPage,
    module: "po_payment_backlog",
    action: "read",
  },
  {
    path: "/payment/follow-up",
    name: "Payment Follow-up",
    element: PaymentFollowUpPage,
    allowedRoles: ["head_of_department", "hod"],
  },
  {
    path: "/payment/history",
    name: "Payment History",
    element: PaymentHistoryPage,
    allowedRolePrefix: "purchase",
  },
  {
    path: "/payment/hold",
    name: "Payment Hold",
    element: PaymentHoldPage,
    allowedRolePrefix: "sales",
  },
  {
    path: "/purchase/grn",
    name: "GRN",
    element: GrnPage,
    module: "inventory_bucket",
    action: "read",
    excludeRolePrefix: "sales",
  },
  {
    path: "/purchase/return",
    name: "Purchase Return",
    element: PurchaseReturnPage,
    module: "purchase_bucket",
    action: "read",
  },
  {
    path: "/purchase/history",
    name: "Purchase History",
    element: PurchaseHistoryPage,
    module: "purchase_bucket",
    action: "read",
  },
  {
    path: "/purchase/brand",
    name: "Brand Purchase",
    element: BrandPurchasePage,
    module: "purchase_bucket",
    action: "read",
  },
  {
    path: "/purchase/vendor-payments",
    name: "Vendor Payments",
    element: VendorPaymentsPage,
    module: "billing_request",
    action: "read",
    excludeRolePrefix: "sales",
  },
  {
    path: "/procurement/history",
    name: "Procurement History",
    element: ProcurementHistoryPage,
    module: "pro_bucket",
    action: "read",
  },
  {
    path: "/procurement/brand",
    name: "Brand Procurement",
    element: BrandProcurementPage,
    module: "pro_bucket",
    action: "read",
  },
  {
    path: "/hr/attendance",
    name: "Attendance",
    element: AttendancePage,
    module: "employees",
    action: "read",
  },
  {
    path: "/hr/leave",
    name: "Leave Management",
    element: LeaveManagementPage,
    module: "employees",
    action: "read",
  },
  {
    path: "/hr/fuel",
    name: "Fuel Management",
    element: FuelManagementPage,
    module: "employees",
    action: "read",
  },
  {
    path: "/hr/salary",
    name: "Salary Management",
    element: SalaryManagementPage,
    module: "employees",
    action: "read",
  },
  {
    path: "/hr/reports",
    name: "HR Reports",
    element: HrReportsPage,
    module: "branch_analytics",
    action: "read",
  },
  {
    path: "/reports/sales",
    name: "Sales Report",
    element: SalesReportPage,
    module: "target_analytics",
    action: "read",
  },
  {
    path: "/reports/quotation",
    name: "Quotation Report",
    element: QuotationReportPage,
    module: "quotations",
    action: "read",
  },
  {
    path: "/reports/supplier",
    name: "Supplier Report",
    element: SupplierReportPage,
    module: "suppliers",
    action: "read",
  },
];

export default sidebarPageRoutes;
