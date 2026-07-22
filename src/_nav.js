import React from "react";
import {
  Gauge,
  Building2,
  MapPin,
  ShoppingCart,
  MessageSquare,
  FileText,
  Users,
  Factory,
  Bell,
  User,
  Layers,
  Tags,
  List,
  Map,
  Star,
  Clipboard,
  Folder,
  ListChecks,
  LineChart,
  Calendar,
  ShoppingBasket,
  IndianRupee,
  Truck,
  Clock,
  CheckCircle2,
  Wallet,
  Send,
  ClipboardList,
  Target,
  RotateCcw,
  PauseCircle,
  Receipt,
} from "lucide-react";

const CNavGroup = "group";
const CNavItem = "item";

// Purchase Executive – reference nav (permission-filter if wired to sidebar)
export const PURCHASE_ROLE_NAV = [
  {
    component: CNavItem,
    name: "Pro Dashboard",
    to: "/pro-dashboard",
    icon: <Gauge className="nav-icon" />,
    module: "pro_bucket",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "Procurement Bucket",
    to: "/procurement-requests",
    icon: <Clipboard className="nav-icon" />,
    module: "purchase_tasks",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "Follow-up Bucket",
    to: "/follow-up",
    icon: <Bell className="nav-icon" />,
    module: "follow_up",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "DMG Bucket",
    to: "/dmg",
    icon: <Folder className="nav-icon" />,
    module: "dmg",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "Pro Bucket",
    to: "/pro-bucket",
    icon: <ShoppingBasket className="nav-icon" />,
    module: "pro_bucket",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "Local Procurement",
    to: "/local-pro",
    icon: <Users className="nav-icon" />,
    roles: ["procurement"],
  },
  {
    component: CNavItem,
    name: "My Procurement Bucket",
    to: "/local-pro",
    icon: <ShoppingBasket className="nav-icon" />,
    roles: ["localprocurement"],
  },
  {
    component: CNavItem,
    name: "Local Purchase",
    to: "/local-purchase",
    icon: <ShoppingCart className="nav-icon" />,
    module: "purchase_bucket",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "My Purchase",
    to: "/my-purchase",
    icon: <ShoppingCart className="nav-icon" />,
    roles: ["localpurchase"],
  },
  {
    component: CNavItem,
    name: "Sales Order Bucket",
    to: "/po-bucket",
    icon: <ShoppingBasket className="nav-icon" />,
    module: "po_bucket",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "Sales Order Payment",
    to: "/po-payment",
    icon: <IndianRupee className="nav-icon" />,
    module: "po_payment",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "Inventory Bucket",
    to: "/inventory-bucket",
    icon: <LineChart className="nav-icon" />,
    module: "inventory_bucket",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "Dispatch",
    to: "/dispatchment",
    icon: <Truck className="nav-icon" />,
    module: "dispatchment",
    roles: ["purchase_exicutive", "procurement"],
  },
  {
    component: CNavItem,
    name: "Suppliers",
    to: "/suppliers",
    icon: <Factory className="nav-icon" />,
    module: "suppliers",
    roles: ["purchase_exicutive", "procurement"],
  },
  // "Purchase Bucket" (/purchase-bucket) is intentionally hidden from the
  // sidebar. Its route still exists; only the nav link was removed.
  // "Batch Billing Requests" (/batch-billing-requests) is intentionally
  // hidden from the sidebar. Its route still exists; only the nav link
  // was removed.
];

// Finance role – curated, self-contained sidebar. These are dedicated finance
// pages (all under /finance/*) built for the finance login only. The tree is
// returned as-is by buildFinanceNav (see fe/src/utils/sidebarNav.js) — no
// permission filtering is applied; the finance role reaches these paths via the
// frontend gate in ProtectedRoute (isFinanceAllowedPath). Groups are detected
// by the presence of `items`; icons are JSX like every other nav node.
export const FINANCE_ROLE_NAV = [
  {
    component: CNavItem,
    name: "Dashboard",
    to: "/finance",
    icon: <Gauge className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: "Purchase Requests",
    to: "/finance/purchase-requests",
    icon: <FileText className="nav-icon" />,
  },
  {
    component: CNavItem,
    name: "Purchase Return Requests",
    to: "/finance/purchase-returns",
    icon: <RotateCcw className="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: "Amount Due",
    icon: <Wallet className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: "Client Dues (Receivable)",
        to: "/finance/receivables/clients",
        icon: <Users className="nav-icon" />,
      },
      {
        component: CNavItem,
        name: "Supplier Dues (Payable)",
        to: "/finance/receivables/suppliers",
        icon: <Factory className="nav-icon" />,
      },
    ],
  },
  {
    component: CNavItem,
    name: "Billing",
    to: "/finance/billing",
    icon: <Receipt className="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: "Payments",
    icon: <IndianRupee className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: "Payments to Make",
        to: "/finance/payments/due",
        icon: <Clock className="nav-icon" />,
      },
      {
        component: CNavItem,
        name: "Payment Hold",
        to: "/finance/payments/hold",
        icon: <PauseCircle className="nav-icon" />,
      },
    ],
  },
];

// Define which roles can access each menu item
// 'module' maps to the RBAC permission module key for granular access control
// Full-access roles (super_admin, admin, hod) bypass permission checks
//
// Top-level order (as arranged for the main sidebar):
// Dashboard, Business Partner, Product Master, Query Master, Master,
// Procurement Master, Quotation Master, Sales Order Master, Purchase Master,
// Inventory Master, Delivery Master, Report, Branch Setting,
// Company Information, HR Master
const _nav = [
  {
    component: CNavGroup,
    name: "Dashboard",
    to: "/dashboard",
    icon: <Gauge className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "HOD Dashboard",
        to: "/hod-dashboard",
        icon: <LineChart className="nav-icon" />,
        module: null,
        roles: ["head_of_department", "hod"],
      },
      {
        component: CNavItem,
        name: "Sales Dashboard",
        to: "/sales-dashboard",
        icon: <LineChart className="nav-icon" />,
        module: null,
      },
      {
        component: CNavItem,
        name: "Purchase Dashboard",
        to: "/purchase-dashboard",
        icon: <LineChart className="nav-icon" />,
        rolePrefix: "purchase",
      },
      {
        component: CNavItem,
        name: "Finance Dashboard",
        to: "/finance",
        icon: <IndianRupee className="nav-icon" />,
        module: "finance",
      },
      {
        component: CNavItem,
        name: "Pending Actions",
        to: "/pending-actions",
        icon: <Bell className="nav-icon" />,
        roles: ["head_of_department", "hod"],
      },
      {
        component: CNavItem,
        name: "Pro Dashboard",
        to: "/pro-dashboard",
        icon: <Gauge className="nav-icon" />,
        module: "pro_bucket",
      },
    ],
  },
  // Sales Manager screens — sample/demo pages, visible only to the
  // sales_manager role. Flat top-level items (no wrapping group/"Master"
  // style parent) per separate-screens request. Each carries
  // `roles: ["sales_manager"]` so every item is filtered out entirely for
  // every other role (including head_of_department/hod) without touching
  // any existing nav entry or permission logic. The dashboard itself is
  // NOT a separate entry here — its content was folded into the existing
  // "Sales Dashboard" item under the Dashboard group above.
  {
    component: CNavItem,
    name: "Due Payments",
    to: "/sales-master/due-payments",
    icon: <Wallet className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Client",
    to: "/sales-master/clients",
    icon: <Users className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Product Sales List",
    to: "/sales-master/product-sales-list",
    icon: <Star className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Query",
    to: "/sales-master/query",
    icon: <MessageSquare className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Query Products",
    to: "/sales-master/query-products",
    icon: <Clipboard className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Query Follow-up",
    to: "/sales-master/query-followup",
    icon: <Bell className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Quotation",
    to: "/sales-master/quotation",
    icon: <FileText className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Quotation Product",
    to: "/sales-master/quotation-products",
    icon: <ListChecks className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Quotation Follow-up",
    to: "/sales-master/quotation-followup",
    icon: <Send className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Create Sales Order",
    to: "/sales-master/sales-order/create",
    icon: <ShoppingCart className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "Sales Order Status",
    to: "/sales-master/sales-order/status",
    icon: <ClipboardList className="nav-icon" />,
    roles: ["sales_manager"],
  },
  {
    component: CNavItem,
    name: "My Performance Report",
    to: "/sales-master/reports/my-performance",
    icon: <Target className="nav-icon" />,
    roles: ["sales_manager"],
  },
  // Purchase Manager screens — sample/demo pages, visible to the
  // purchase_manager role (and purchase_exicutive for backward
  // compatibility). Flat top-level items (no wrapping group/pill
  // sub-nav) per separate-screens request, same treatment as Sales Manager
  // above. Each carries `roles: ["purchase_manager", "purchase_exicutive"]`
  // so every item is filtered out entirely for every other role (including
  // head_of_department/hod) without touching any existing nav entry or
  // permission logic.
  {
    component: CNavItem,
    name: "Purchase Dashboard",
    to: "/purchase-master/dashboard",
    icon: <Gauge className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "Suppliers",
    to: "/purchase-master/suppliers",
    icon: <Factory className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "Supplier Contact",
    to: "/supplier-contacts",
    icon: <Users className="nav-icon" />,
    roles: ["purchase_manager"],
  },
  {
    component: CNavItem,
    name: "Purchase Requests",
    to: "/purchase-master/purchase-requests",
    icon: <Clipboard className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "Local Purchase",
    to: "/purchase-master/local-purchase",
    icon: <ShoppingCart className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "Brand Purchase",
    to: "/purchase-master/brand-purchase",
    icon: <ShoppingCart className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "Purchase Order",
    to: "/purchase-master/purchase-order",
    icon: <FileText className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "GRN",
    to: "/purchase-master/grn",
    icon: <CheckCircle2 className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "Purchase Return",
    to: "/purchase-master/purchase-return",
    icon: <ShoppingCart className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "Vendor Payments",
    to: "/purchase-master/vendor-payments",
    icon: <IndianRupee className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "Purchase History",
    to: "/purchase-master/purchase-history",
    icon: <List className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  {
    component: CNavItem,
    name: "My Performance Report",
    to: "/purchase-master/reports/my-performance",
    icon: <Target className="nav-icon" />,
    roles: ["purchase_manager", "purchase_exicutive"],
  },
  // Procurement Manager screens — sample/demo pages, visible only to the
  // procurement_master role. Flat top-level items (no wrapping group/pill
  // sub-nav), same treatment as Sales Manager / Purchase Manager above.
  // Named "Procurement Manager" (not "Procurement Master") to avoid colliding
  // with the existing real "Procurement Master" permission-based group
  // below. Each carries `roles: ["procurement_master"]` so every item is
  // filtered out entirely for every other role (including
  // head_of_department/hod) without touching any existing nav entry or
  // permission logic.
  {
    component: CNavItem,
    name: "Procurement Dashboard",
    to: "/procurement-master/dashboard",
    icon: <Gauge className="nav-icon" />,
    roles: ["procurement_master"],
  },
  {
    component: CNavItem,
    name: "Suppliers",
    to: "/procurement-master/suppliers",
    icon: <Factory className="nav-icon" />,
    roles: ["procurement_master"],
  },
  // Procurement screens are also visible to purchase_manager (real employee
  // login) so that role sees both Purchase and Procurement options,
  // including Local Purchase and Local Procurement. Dashboard / Suppliers /
  // My Performance Report stay procurement_master-only to avoid duplicate
  // entries next to the Purchase Manager items above.
  {
    component: CNavItem,
    name: "Procurement Requests",
    to: "/procurement-master/procurement-requests",
    icon: <Clipboard className="nav-icon" />,
    roles: ["procurement_master", "purchase_manager"],
  },
  {
    component: CNavItem,
    name: "Local Procurement",
    to: "/procurement-master/local-procurement",
    icon: <ShoppingBasket className="nav-icon" />,
    roles: ["procurement_master", "purchase_manager"],
  },
  {
    component: CNavItem,
    name: "Brand Procurement",
    to: "/procurement-master/brand-procurement",
    icon: <Star className="nav-icon" />,
    roles: ["procurement_master", "purchase_manager"],
  },
  {
    component: CNavItem,
    name: "Procurement History",
    to: "/procurement-master/procurement-history",
    icon: <List className="nav-icon" />,
    roles: ["procurement_master", "purchase_manager"],
  },
  {
    component: CNavItem,
    name: "My Performance Report",
    to: "/procurement-master/reports/my-performance",
    icon: <Target className="nav-icon" />,
    roles: ["procurement_master"],
  },
  {
    component: CNavGroup,
    name: "Business Partner",
    to: "/industries",
    icon: <Building2 className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Customer",
        to: "/industries",
        icon: <Building2 className="nav-icon" />,
        module: "industries",
      },
      {
        component: CNavItem,
        name: "Customer Contacts",
        to: "/customer-contacts",
        icon: <Users className="nav-icon" />,
        module: "industry_branches",
      },
      {
        component: CNavItem,
        name: "Suppliers",
        to: "/suppliers",
        icon: <Factory className="nav-icon" />,
        module: "suppliers",
      },
      {
        component: CNavItem,
        name: "Suppliers Contacts",
        to: "/supplier-contacts",
        icon: <Users className="nav-icon" />,
        module: "suppliers",
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Product Master",
    to: "/products",
    icon: <ShoppingCart className="nav-icon" />,
    module: "products",
    items: [
      {
        component: CNavItem,
        name: "Group",
        to: "/groups",
        icon: <List className="nav-icon" />,
        module: "groups",
      },
      {
        component: CNavItem,
        name: "Categories",
        to: "/categories",
        icon: <Layers className="nav-icon" />,
        module: "categories",
      },
      {
        component: CNavItem,
        name: "Sub Categories",
        to: "/sub-categories",
        icon: <Layers className="nav-icon" />,
        module: "categories",
      },
      {
        component: CNavItem,
        name: "Brands",
        to: "/brands",
        icon: <Tags className="nav-icon" />,
        module: "brands",
      },
      {
        component: CNavItem,
        name: "Products",
        to: "/products",
        icon: <ShoppingCart className="nav-icon" />,
        module: "products",
      },
      {
        component: CNavItem,
        name: "Product Sale List",
        to: "/product-sale-list",
        icon: <Star className="nav-icon" />,
        module: "products",
      },
      {
        component: CNavItem,
        name: "Rate Card",
        to: "/rate-cards",
        icon: <List className="nav-icon" />,
        module: "rate_cards",
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Query Master",
    to: "/queries",
    icon: <MessageSquare className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Query",
        to: "/queries",
        icon: <MessageSquare className="nav-icon" />,
        module: "queries",
      },
      {
        component: CNavItem,
        name: "Query Products",
        to: "/query-products",
        icon: <Clipboard className="nav-icon" />,
        module: "queries",
        excludeRolePrefix: "sales",
      },
      {
        component: CNavItem,
        name: "Follow-up",
        to: "/follow-up",
        icon: <Bell className="nav-icon" />,
        module: "follow_up",
      },
      {
        component: CNavItem,
        name: "Report",
        to: "/query-master/report",
        icon: <LineChart className="nav-icon" />,
        module: "queries",
      },
      // "Product Lead" hidden from Query Master menu (route still available directly)
      // {
      //   component: CNavItem,
      //   name: "Product Lead",
      //   to: "/product-lead",
      //   icon: <Star className="nav-icon" />,
      //   module: "products",
      // },
    ],
  },
  {
    component: CNavGroup,
    name: "Master",
    to: "/master/rate-master",
    icon: <Layers className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Rate Master",
        to: "/master/rate-master",
        icon: <IndianRupee className="nav-icon" />,
        module: null,
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Procurement Master",
    icon: <ShoppingBasket className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavGroup,
        name: "Procurement",
        to: "/procurement-requests",
        items: [
          {
            component: CNavItem,
            name: "Procurement Requests",
            to: "/procurement-requests",
            icon: <Clipboard className="nav-icon" />,
            module: "purchase_tasks",
          },
          // "Local Procurement" (/local-pro) and "Brand Procurement"
          // (/procurement/brand) are intentionally hidden from the sidebar.
          // Their routes still exist; only the nav links were removed.
        ],
      },
      {
        component: CNavItem,
        name: "Task Dashboard",
        to: "/task-dashboard",
        icon: <ListChecks className="nav-icon" />,
        module: "task_management",
      },
      // "Task Bucket" (/task-bucket) and "Pro Bucket" (/pro-bucket) are
      // intentionally hidden from the sidebar. Their routes still exist;
      // only the nav links were removed.
      {
        // "Local Procurement" for procurement lives inside the Procurement
        // subgroup above; keeping a group-level copy here duplicated it for
        // the procurement role, so that copy was removed.
        component: CNavItem,
        name: "My Procurement Bucket",
        to: "/local-pro",
        icon: <ShoppingBasket className="nav-icon" />,
        roles: ["localprocurement"],
      },
      {
        component: CNavItem,
        name: "Procurement History",
        to: "/procurement/history",
        icon: <List className="nav-icon" />,
        module: "pro_bucket",
      },
      // "Batch Billing Requests" (/batch-billing-requests) is intentionally
      // hidden from the sidebar. Its route still exists; only the nav link
      // was removed.
    ],
  },
  {
    component: CNavGroup,
    name: "Quotation Master",
    to: "/quotations",
    icon: <FileText className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Quotation",
        to: "/quotations",
        icon: <FileText className="nav-icon" />,
        module: "quotations",
      },
      {
        component: CNavItem,
        name: "Quotation Products",
        to: "/quotation-products",
        icon: <List className="nav-icon" />,
        module: "quotations",
      },
      {
        component: CNavItem,
        name: "Follow-up",
        to: "/quotation-followup",
        icon: <Bell className="nav-icon" />,
        module: "quotations",
        rolePrefix: "sales",
      },
      {
        component: CNavItem,
        name: "Lost Quotation",
        to: "/lost-quotations",
        icon: <FileText className="nav-icon" />,
        module: "quotations",
      },
      {
        component: CNavItem,
        name: "Report",
        to: "/quotation-master/report",
        icon: <LineChart className="nav-icon" />,
        module: "quotations",
      },
      {
        component: CNavItem,
        name: "Follow-up Dashboard",
        to: "/followup-dashboard",
        icon: <Bell className="nav-icon" />,
        roles: ["head_of_department", "hod"],
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Sales Order Master",
    to: "/purchase-order-sidebar",
    icon: <Clipboard className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Sales Orders",
        to: "/sales-master/sales-orders",
        icon: <Clipboard className="nav-icon" />,
        module: "po_payment",
      },
      {
        component: CNavItem,
        name: "Sales Order Product",
        to: "/po-products",
        icon: <List className="nav-icon" />,
        roles: ["super_admin", "admin", "head_of_department", "hod"],
      },
      {
        component: CNavGroup,
        name: "Order Tracking",
        to: "/order-tracking/purchase",
        items: [
          {
            component: CNavItem,
            name: "Purchase",
            to: "/order-tracking/purchase",
            icon: <IndianRupee className="nav-icon" />,
            roles: ["head_of_department", "hod"],
          },
          {
            component: CNavItem,
            name: "Finance",
            to: "/order-tracking/finance",
            icon: <IndianRupee className="nav-icon" />,
            module: "po_payment",
            excludeRolePrefix: "sales",
          },
          {
            component: CNavItem,
            name: "Inventory",
            to: "/order-tracking/inventory",
            icon: <LineChart className="nav-icon" />,
            module: "inventory_bucket",
            excludeRolePrefix: "sales",
          },
          {
            component: CNavItem,
            name: "Dispatch",
            to: "/order-tracking/dispatch",
            icon: <Truck className="nav-icon" />,
            module: "dispatchment",
            excludeRolePrefix: "sales",
          },
        ],
      },
      {
        component: CNavItem,
        name: "Sales Order History",
        to: "/sales-order-history",
        icon: <ShoppingBasket className="nav-icon" />,
        module: "po_bucket",
      },
      {
        component: CNavItem,
        name: "Report",
        to: "/sales-order-master/report",
        icon: <LineChart className="nav-icon" />,
        module: "po_bucket",
      },
      {
        component: CNavItem,
        name: "Sales Order Bucket",
        to: "/po-bucket",
        icon: <ShoppingBasket className="nav-icon" />,
        module: "po_bucket",
      },
      {
        component: CNavItem,
        name: "Sales Order Payment",
        to: "/po-payment",
        icon: <IndianRupee className="nav-icon" />,
        module: "po_payment",
        excludeRolePrefix: "sales",
      },
      {
        component: CNavItem,
        name: "Purchase Request",
        to: "/purchase-requests",
        icon: <IndianRupee className="nav-icon" />,
        roles: ["head_of_department", "hod"],
      },
      {
        component: CNavGroup,
        name: "Payment Management",
        to: "/po-payment",
        items: [
          {
            component: CNavItem,
            name: "Customer Payments",
            to: "/payment/customer",
            icon: <IndianRupee className="nav-icon" />,
            module: "po_payment",
            excludeRolePrefix: "sales",
          },
          {
            component: CNavItem,
            name: "Overdue Customer Payments",
            to: "/payment/overdue-customer",
            icon: <Clock className="nav-icon" />,
            roles: ["head_of_department", "hod"],
          },
          {
            component: CNavItem,
            name: "Supplier Payments",
            to: "/payment/supplier",
            icon: <IndianRupee className="nav-icon" />,
            module: "billing_request",
            excludeRolePrefix: "sales",
          },
          {
            component: CNavItem,
            name: "Overdue Supplier Payments",
            to: "/payment/overdue-supplier",
            icon: <Clock className="nav-icon" />,
            module: "po_payment_backlog",
          },
          {
            component: CNavItem,
            name: "Payment Follow-up",
            to: "/payment/follow-up",
            icon: <Bell className="nav-icon" />,
            roles: ["head_of_department", "hod"],
          },
          {
            component: CNavItem,
            name: "Payment History",
            to: "/payment/history",
            icon: <List className="nav-icon" />,
            rolePrefix: "purchase",
          },
          {
            component: CNavItem,
            name: "Payment Hold",
            to: "/payment/hold",
            icon: <Clock className="nav-icon" />,
            rolePrefix: "sales",
          },
          {
            component: CNavItem,
            name: "Payment Backlog",
            to: "/hod-payment-backlog",
            icon: <Clock className="nav-icon" />,
            roles: ["head_of_department", "hod"],
          },
        ],
      },
      {
        component: CNavItem,
        name: "Pending Payments",
        to: "/po-payment-backlog",
        icon: <IndianRupee className="nav-icon" />,
        module: "po_payment_backlog",
      },
      {
        component: CNavItem,
        name: "Pending Payment",
        to: "/pending-payment",
        icon: <Clock className="nav-icon" />,
        /** Sales roles only; no po_payment permission required (read-only assigned POs). */
        rolePrefix: "sales",
      },
      {
        component: CNavItem,
        name: "Billing Request",
        to: "/billing-requests",
        icon: <IndianRupee className="nav-icon" />,
        module: "billing_request",
        excludeRolePrefix: "sales",
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Purchase Master",
    icon: <ShoppingCart className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavGroup,
        name: "Purchase",
        to: "/purchase-requests",
        items: [
          {
            component: CNavItem,
            name: "Purchase Requests",
            to: "/purchase-requests",
            icon: <Clipboard className="nav-icon" />,
            roles: ["head_of_department", "hod"],
          },
          {
            component: CNavItem,
            name: "Purchases Request",
            to: "/purchase-request-bucket",
            icon: <Clipboard className="nav-icon" />,
            module: "purchase_bucket",
          },
          {
            component: CNavItem,
            name: "Raised Purchases",
            to: "/raised-purchases",
            icon: <ShoppingCart className="nav-icon" />,
            module: "purchase_bucket",
          },
          // "Local Purchase" (/local-purchase) and "Brand Purchase"
          // (/purchase/brand) are intentionally hidden from the sidebar.
          // Their routes still exist; only the nav links were removed.
        ],
      },
      {
        component: CNavItem,
        name: "Purchase Orders",
        // Points to the full Purchase Order workflow: create-PO wizard
        // (product & supplier search + billing/shipping address), the PO
        // table, and a detail page with HOD verification + status timeline.
        // The old PO/billing analytics page still lives at /purchase-order-sidebar.
        to: "/purchase-master/purchase-order",
        icon: <Clipboard className="nav-icon" />,
        module: "po_payment",
      },
      {
        component: CNavItem,
        name: "GRN",
        // Full Goods Received Note page: GRN list + per-GRN detail (ordered vs
        // received, QC, documents, timeline). Placeholder still at /purchase/grn.
        to: "/purchase-master/grn",
        icon: <CheckCircle2 className="nav-icon" />,
        module: "inventory_bucket",
        excludeRolePrefix: "sales",
      },
      {
        component: CNavItem,
        name: "Purchase Return",
        // Full Purchase Return workflow: return list, a guided Create Return
        // form (source PO/GRN → items & qty → reason/refund/photos → review),
        // and a per-return detail page. Old dashboard still at /purchase/return.
        to: "/purchase-master/purchase-return",
        icon: <ShoppingCart className="nav-icon" />,
        module: "purchase_bucket",
      },
      {
        component: CNavItem,
        name: "Vendor Payments",
        to: "/purchase/vendor-payments",
        icon: <IndianRupee className="nav-icon" />,
        module: "billing_request",
        excludeRolePrefix: "sales",
      },
      {
        component: CNavItem,
        name: "Purchase History",
        to: "/purchase/history",
        icon: <List className="nav-icon" />,
        module: "purchase_bucket",
      },
      {
        component: CNavItem,
        name: "My Purchase",
        to: "/my-purchase",
        icon: <ShoppingCart className="nav-icon" />,
        roles: ["localpurchase"],
      },
      // "Purchase Bucket" (/purchase-bucket) is intentionally hidden from the
      // sidebar. Its route still exists; only the nav link was removed.
    ],
  },
  {
    component: CNavGroup,
    name: "Inventory Master",
    to: "/inventory-bucket",
    icon: <LineChart className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Inventory Bucket",
        to: "/inventory-bucket",
        icon: <LineChart className="nav-icon" />,
        module: "inventory_bucket",
        excludeRolePrefix: "sales",
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Delivery Master",
    to: "/dispatchment",
    icon: <Truck className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Dispatch",
        to: "/dispatchment",
        icon: <Truck className="nav-icon" />,
        module: "dispatchment",
        excludeRolePrefix: "sales",
      },
      {
        component: CNavItem,
        name: "Delivery Approval",
        to: "/delivery-approval",
        icon: <CheckCircle2 className="nav-icon" />,
        roles: ["super_admin", "admin", "head_of_department", "hod"],
      },
      {
        component: CNavItem,
        name: "Visit Management",
        to: "/visit-management-sidebar",
        icon: <Calendar className="nav-icon" />,
        module: "visit_management",
      },
      {
        component: CNavItem,
        name: "My Visits",
        to: "/my-visits",
        icon: <Calendar className="nav-icon" />,
        module: "my_visits",
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Report",
    to: "/target-analytics",
    icon: <LineChart className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Sales Report",
        to: "/reports/sales",
        icon: <LineChart className="nav-icon" />,
        module: "target_analytics",
      },
      {
        component: CNavItem,
        name: "Quotation Report",
        to: "/reports/quotation",
        icon: <FileText className="nav-icon" />,
        module: "quotations",
      },
      {
        component: CNavItem,
        name: "Supplier Report",
        to: "/reports/supplier",
        icon: <Factory className="nav-icon" />,
        module: "suppliers",
      },
      {
        component: CNavItem,
        name: "Target Analytics",
        to: "/target-analytics",
        icon: <LineChart className="nav-icon" />,
        module: "target_analytics",
      },
      {
        component: CNavItem,
        name: "My Targets",
        to: "/my-targets",
        icon: <ListChecks className="nav-icon" />,
        rolePrefix: "sales",
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Branch Settings",
    to: "/zones",
    icon: <Map className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Zones",
        to: "/zones",
        icon: <Map className="nav-icon" />,
        module: "zones",
      },
      {
        component: CNavItem,
        name: "Sub Zones",
        to: "/sub-zones",
        icon: <Layers className="nav-icon" />,
        module: "sub_zones",
      },
      {
        component: CNavItem,
        name: "Branch Analytics",
        to: "/branch-analytics",
        icon: <LineChart className="nav-icon" />,
        module: "branch_analytics",
      },
      {
        component: CNavItem,
        name: "Target Dashboard",
        to: "/target-dashboard",
        icon: <LineChart className="nav-icon" />,
        roles: ["head_of_department", "hod"],
      },
    ],
  },
  {
    component: CNavGroup,
    name: "Company Information",
    to: "/sidebar-docs",
    icon: <Building2 className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavItem,
        name: "Companies",
        to: "/companies",
        icon: <Building2 className="nav-icon" />,
        module: "companies",
      },
      {
        component: CNavItem,
        name: "Branches",
        to: "/branches",
        icon: <MapPin className="nav-icon" />,
        module: "branches",
      },
      {
        component: CNavItem,
        name: "Documents",
        to: "/sidebar-docs",
        icon: <FileText className="nav-icon" />,
        module: null,
      },
    ],
  },
  {
    component: CNavGroup,
    name: "HR Master",
    to: "/employees",
    icon: <User className="nav-icon" />,
    module: null,
    items: [
      {
        component: CNavGroup,
        name: "Employees",
        to: "/employees",
        items: [
          {
            component: CNavItem,
            name: "Employees",
            to: "/employees",
            icon: <User className="nav-icon" />,
            module: "employees",
          },
          {
            component: CNavItem,
            name: "Attendance",
            to: "/hr/attendance",
            icon: <Calendar className="nav-icon" />,
            module: "employees",
          },
          {
            component: CNavItem,
            name: "Leave Management",
            to: "/hr/leave",
            icon: <Calendar className="nav-icon" />,
            module: "employees",
          },
          {
            component: CNavItem,
            name: "Fuel Management",
            to: "/hr/fuel",
            icon: <Truck className="nav-icon" />,
            module: "employees",
          },
          {
            component: CNavItem,
            name: "Employees Document",
            to: "/company-documents",
            icon: <Folder className="nav-icon" />,
            module: null,
            roles: ["head_of_department", "hod"],
          },
        ],
      },
      {
        component: CNavItem,
        name: "Salary Management",
        to: "/hr/salary",
        icon: <IndianRupee className="nav-icon" />,
        module: "employees",
      },
      {
        component: CNavItem,
        name: "HR Reports",
        to: "/hr/reports",
        icon: <LineChart className="nav-icon" />,
        module: "branch_analytics",
      },
      {
        component: CNavItem,
        name: "Employee Locations",
        to: "/employee-locations",
        icon: <Map className="nav-icon" />,
        module: null,
        roles: ["head_of_department", "hod"],
      },
    ],
  },
];

export default _nav;
