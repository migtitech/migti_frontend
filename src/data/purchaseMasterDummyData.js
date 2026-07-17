/**
 * Sample/demo data for the Purchase Manager (purchase_exicutive) section.
 * Frontend-only — nothing here is wired to a backend API.
 */

/** Categories this purchase manager is assigned to — suppliers & new-supplier
 * creation are scoped to these categories only. */
export const assignedCategories = ["Electronics", "Packaging Material"];

export const purchaseMasterDashboard = {
  kpis: {
    pendingWorkCount: 9,
    assignedTaskCount: 5,
    assignedWorkCount: 14,
    monthPurchaseValue: 1285000,
  },
  pendingWork: [
    {
      id: "PW-1",
      title: "Generate PO for PR-1042 (Cable Ties, 500 pcs)",
      priority: "high",
      due: "2026-07-17",
    },
    {
      id: "PW-2",
      title: "Verify GRN mismatch — GRN-2231",
      priority: "high",
      due: "2026-07-17",
    },
    {
      id: "PW-3",
      title: "Respond to supplier quote — Shree Packaging",
      priority: "medium",
      due: "2026-07-18",
    },
    {
      id: "PW-4",
      title: "Upload signed PO copy — PO-3341",
      priority: "medium",
      due: "2026-07-19",
    },
    {
      id: "PW-5",
      title: "Review purchase return — RET-118",
      priority: "low",
      due: "2026-07-21",
    },
  ],
  assignedTasks: [
    {
      id: "AT-1",
      title: "Source alternate vendor for HDMI connectors",
      assignedBy: "HOD - Rajesh Mehta",
      status: "pending",
      due: "2026-07-18",
    },
    {
      id: "AT-2",
      title: "Negotiate rate for Q3 packaging bulk order",
      assignedBy: "HOD - Rajesh Mehta",
      status: "in progress",
      due: "2026-07-20",
    },
    {
      id: "AT-3",
      title: "Close pending vendor payment follow-up",
      assignedBy: "Finance - Anita Rao",
      status: "pending",
      due: "2026-07-19",
    },
  ],
  assignedWork: [
    {
      id: "PR-1042",
      type: "Purchase Request",
      status: "open",
      due: "2026-07-17",
    },
    {
      id: "PR-1039",
      type: "Purchase Request",
      status: "in progress",
      due: "2026-07-18",
    },
    {
      id: "PO-3341",
      type: "Purchase Order",
      status: "pending",
      due: "2026-07-19",
    },
    {
      id: "PO-3338",
      type: "Purchase Order",
      status: "confirmed",
      due: "2026-07-16",
    },
    {
      id: "RET-118",
      type: "Purchase Return",
      status: "pending",
      due: "2026-07-21",
    },
  ],
  monthlyTrend: {
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    value: [720000, 845000, 910000, 1005000, 1120000, 1285000],
  },
};

/** Suppliers — only suppliers under this purchase manager's assigned
 * categories are visible; new suppliers can only be created under one of
 * these categories. */
export const suppliers = [
  {
    id: "SUP-1",
    name: "Shree Packaging Co.",
    category: "Packaging Material",
    city: "Indore",
    contact: "Manoj Shah",
    phone: "9876500011",
    rating: 4.5,
    status: "active",
  },
  {
    id: "SUP-2",
    name: "Kumar Electronics Traders",
    category: "Electronics",
    city: "Indore",
    contact: "Deepak Kumar",
    phone: "9876500022",
    rating: 4.2,
    status: "active",
  },
  {
    id: "SUP-3",
    name: "Bright Circuits Pvt Ltd",
    category: "Electronics",
    city: "Bhopal",
    contact: "Suresh Nair",
    phone: "9876500033",
    rating: 4.7,
    status: "active",
  },
  {
    id: "SUP-4",
    name: "Indore Corrugated Box Works",
    category: "Packaging Material",
    city: "Indore",
    contact: "Ramesh Patel",
    phone: "9876500044",
    rating: 4.0,
    status: "inactive",
  },
  {
    id: "SUP-5",
    name: "Om Electricals & Components",
    category: "Electronics",
    city: "Ujjain",
    contact: "Vivek Joshi",
    phone: "9876500055",
    rating: 4.3,
    status: "active",
  },
];

/** Purchase Requests bucket — products HOD has approved & verified with a
 * supplier assigned on the sales order, waiting to be purchased. Repeat
 * entries of the same open product are merged (qty increases) rather than
 * creating a new row — see `mergedNote`. `bucketType` marks whether the item
 * additionally shows up in the Local or Brand purchase bucket. */
export const purchaseRequests = [
  {
    id: "PR-1042",
    product: "Cable Ties 200mm (Pack of 100)",
    category: "Electronics",
    bucketType: "local",
    qty: 5,
    salesOrder: "SO-2210",
    supplier: "Kumar Electronics Traders",
    status: "open",
    hodApprovedOn: "2026-07-15",
    mergedNote:
      "Merged from 5 separate SO lines — same product, qty increased instead of new rows.",
  },
  {
    id: "PR-1039",
    product: "HDMI Connector 19-Pin",
    category: "Electronics",
    bucketType: "brand",
    qty: 120,
    salesOrder: "SO-2198",
    supplier: "Bright Circuits Pvt Ltd",
    status: "in progress",
    hodApprovedOn: "2026-07-14",
  },
  {
    id: "PR-1035",
    product: "Corrugated Box 12x12x12",
    category: "Packaging Material",
    bucketType: "local",
    qty: 300,
    salesOrder: "SO-2185",
    supplier: "Indore Corrugated Box Works",
    status: "open",
    hodApprovedOn: "2026-07-13",
  },
  {
    id: "PR-1030",
    product: "Bubble Wrap Roll 1m x 50m",
    category: "Packaging Material",
    bucketType: "local",
    qty: 18,
    salesOrder: "SO-2170",
    supplier: "Shree Packaging Co.",
    status: "purchased",
    hodApprovedOn: "2026-07-10",
  },
  {
    id: "PR-1028",
    product: "Branded Power Adapter 12V 2A",
    category: "Electronics",
    bucketType: "brand",
    qty: 60,
    salesOrder: "SO-2160",
    supplier: "Om Electricals & Components",
    status: "open",
    hodApprovedOn: "2026-07-09",
  },
];

export const localPurchaseBucket = purchaseRequests.filter(
  (r) => r.bucketType === "local",
);
export const brandPurchaseBucket = purchaseRequests.filter(
  (r) => r.bucketType === "brand",
);

/** Product catalog for the Create Purchase Order form, scoped by supplier's category. */
export const purchaseOrderCatalog = [
  {
    sku: "ELE-CT-200",
    name: "Cable Ties 200mm (Pack of 100)",
    category: "Electronics",
    rate: 85,
  },
  {
    sku: "ELE-HD-19",
    name: "HDMI Connector 19-Pin",
    category: "Electronics",
    rate: 42,
  },
  {
    sku: "ELE-PA-12",
    name: "Branded Power Adapter 12V 2A",
    category: "Electronics",
    rate: 310,
  },
  {
    sku: "PKG-CB-121212",
    name: "Corrugated Box 12x12x12",
    category: "Packaging Material",
    rate: 22,
  },
  {
    sku: "PKG-BW-150",
    name: "Bubble Wrap Roll 1m x 50m",
    category: "Packaging Material",
    rate: 650,
  },
];

export const purchaseOrders = [
  {
    id: "PO-3341",
    supplier: "Kumar Electronics Traders",
    items: 2,
    amount: 42500,
    hodVerification: "pending",
    status: "pending",
    date: "2026-07-16",
  },
  {
    id: "PO-3338",
    supplier: "Bright Circuits Pvt Ltd",
    items: 1,
    amount: 88400,
    hodVerification: "verified",
    status: "confirmed",
    date: "2026-07-14",
  },
  {
    id: "PO-3330",
    supplier: "Shree Packaging Co.",
    items: 3,
    amount: 61200,
    hodVerification: "verified",
    status: "sent",
    date: "2026-07-11",
  },
  {
    id: "PO-3322",
    supplier: "Indore Corrugated Box Works",
    items: 1,
    amount: 15800,
    hodVerification: "rejected",
    status: "draft",
    date: "2026-07-08",
  },
];

/** GRN — Goods Received Note, created by the Inventory side on receipt. Read-only here. */
export const grnList = [
  {
    id: "GRN-2231",
    po: "PO-3338",
    supplier: "Bright Circuits Pvt Ltd",
    product: "HDMI Connector 19-Pin",
    qtyOrdered: 120,
    qtyReceived: 116,
    receivedOn: "2026-07-15",
    status: "short received",
    receivedBy: "Inventory - Sunil Verma",
  },
  {
    id: "GRN-2225",
    po: "PO-3330",
    supplier: "Shree Packaging Co.",
    product: "Bubble Wrap Roll 1m x 50m",
    qtyOrdered: 18,
    qtyReceived: 18,
    receivedOn: "2026-07-12",
    status: "complete",
    receivedBy: "Inventory - Sunil Verma",
  },
  {
    id: "GRN-2219",
    po: "PO-3322",
    supplier: "Indore Corrugated Box Works",
    product: "Corrugated Box 12x12x12",
    qtyOrdered: 300,
    qtyReceived: 300,
    receivedOn: "2026-07-09",
    status: "complete",
    receivedBy: "Inventory - Manisha Tiwari",
  },
];

/** Purchase Return — lowers the purchase manager's performance score. */
export const purchaseReturns = [
  {
    id: "RET-118",
    po: "PO-3338",
    supplier: "Bright Circuits Pvt Ltd",
    product: "HDMI Connector 19-Pin",
    qty: 4,
    reason: "Damaged in transit",
    status: "pending",
    raisedOn: "2026-07-16",
    performanceImpact: -2,
  },
  {
    id: "RET-104",
    po: "PO-3310",
    supplier: "Kumar Electronics Traders",
    product: "Cable Ties 200mm",
    qty: 20,
    reason: "Wrong item shipped",
    status: "resolved",
    raisedOn: "2026-07-05",
    performanceImpact: -3,
  },
  {
    id: "RET-098",
    po: "PO-3290",
    supplier: "Om Electricals & Components",
    product: "Power Adapter 12V 2A",
    qty: 6,
    reason: "Quality issue",
    status: "resolved",
    raisedOn: "2026-06-28",
    performanceImpact: -2,
  },
];

/** Vendor Payments — only the DUE amount is shown; cleared invoices are omitted entirely. */
export const vendorDuePayments = [
  {
    id: "INV-8841",
    vendor: "Kumar Electronics Traders",
    po: "PO-3341",
    dueDate: "2026-07-20",
    amount: 42500,
    daysOverdue: 0,
    status: "pending",
  },
  {
    id: "INV-8830",
    vendor: "Bright Circuits Pvt Ltd",
    po: "PO-3338",
    dueDate: "2026-07-10",
    amount: 88400,
    daysOverdue: 6,
    status: "overdue",
  },
  {
    id: "INV-8811",
    vendor: "Shree Packaging Co.",
    po: "PO-3330",
    dueDate: "2026-07-18",
    amount: 30600,
    daysOverdue: 0,
    status: "pending",
  },
];

/** Purchase History — product-wise with old vs current price. Total amount is
 * intentionally NOT included/shown, per policy. */
export const purchaseHistory = [
  {
    id: "PH-1",
    product: "HDMI Connector 19-Pin",
    supplier: "Bright Circuits Pvt Ltd",
    qty: 120,
    oldPrice: 38,
    currentPrice: 42,
    purchasedOn: "2026-07-14",
  },
  {
    id: "PH-2",
    product: "Bubble Wrap Roll 1m x 50m",
    supplier: "Shree Packaging Co.",
    qty: 18,
    oldPrice: 610,
    currentPrice: 650,
    purchasedOn: "2026-07-12",
  },
  {
    id: "PH-3",
    product: "Corrugated Box 12x12x12",
    supplier: "Indore Corrugated Box Works",
    qty: 300,
    oldPrice: 20,
    currentPrice: 22,
    purchasedOn: "2026-07-09",
  },
  {
    id: "PH-4",
    product: "Cable Ties 200mm (Pack of 100)",
    supplier: "Kumar Electronics Traders",
    qty: 60,
    oldPrice: 80,
    currentPrice: 85,
    purchasedOn: "2026-07-02",
  },
  {
    id: "PH-5",
    product: "Power Adapter 12V 2A",
    supplier: "Om Electricals & Components",
    qty: 40,
    oldPrice: 295,
    currentPrice: 310,
    purchasedOn: "2026-06-25",
  },
];

export const myPurchasePerformanceReport = {
  kpis: {
    poCount: 22,
    onTimeDeliveryPct: 91,
    costSavingsPct: 6.5,
    performanceScore: 88,
  },
  monthlyTrend: {
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    purchaseValue: [720000, 845000, 910000, 1005000, 1120000, 1285000],
    target: [800000, 850000, 900000, 950000, 1100000, 1250000],
  },
  returnsImpact: [
    { stage: "Total POs", value: 22 },
    { stage: "Returns Raised", value: 3 },
    { stage: "Resolved Returns", value: 2 },
  ],
  recentActivity: [
    {
      id: "PO-3341",
      type: "Purchase Order",
      detail: "Kumar Electronics Traders — ₹42,500",
      date: "2026-07-16",
    },
    {
      id: "RET-118",
      type: "Purchase Return",
      detail: "Bright Circuits Pvt Ltd — 4 units",
      date: "2026-07-16",
    },
    {
      id: "PO-3338",
      type: "Purchase Order",
      detail: "Bright Circuits Pvt Ltd — ₹88,400",
      date: "2026-07-14",
    },
    {
      id: "GRN-2225",
      type: "GRN Received",
      detail: "Shree Packaging Co. — 18/18 units",
      date: "2026-07-12",
    },
  ],
};
