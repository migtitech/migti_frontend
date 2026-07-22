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
    category: "Electronics",
    qty: 4,
    unitPrice: 310,
    returnValue: 1240,
    reason: "Damaged in transit",
    status: "pending",
    refund: "Awaited",
    raisedOn: "2026-07-16",
    resolvedOn: null,
    performanceImpact: -2,
    remark:
      "Two connectors arrived with bent pins; photos shared with supplier.",
  },
  {
    id: "RET-116",
    po: "PO-3335",
    supplier: "Shree Packaging Co.",
    product: "Corrugated Box 12x10x8",
    category: "Packaging Material",
    qty: 60,
    unitPrice: 22,
    returnValue: 1320,
    reason: "Quality issue",
    status: "approved",
    refund: "Credit note",
    raisedOn: "2026-07-14",
    resolvedOn: null,
    performanceImpact: -1,
    remark: "Box wall thickness below spec; supplier agreed to credit note.",
  },
  {
    id: "RET-112",
    po: "PO-3328",
    supplier: "Indore Corrugated Box Works",
    product: "Bubble Wrap Roll 1m",
    category: "Packaging Material",
    qty: 8,
    unitPrice: 650,
    returnValue: 5200,
    reason: "Excess quantity",
    status: "pending",
    refund: "Awaited",
    raisedOn: "2026-07-11",
    resolvedOn: null,
    performanceImpact: -1,
    remark: "Ordered 8 extra rolls by mistake — merge with next PR instead.",
  },
  {
    id: "RET-104",
    po: "PO-3310",
    supplier: "Kumar Electronics Traders",
    product: "Cable Ties 200mm",
    category: "Electronics",
    qty: 20,
    unitPrice: 42,
    returnValue: 840,
    reason: "Wrong item shipped",
    status: "resolved",
    refund: "Refunded",
    raisedOn: "2026-07-05",
    resolvedOn: "2026-07-09",
    performanceImpact: -3,
    remark: "200mm sent instead of 300mm. Full refund received.",
  },
  {
    id: "RET-098",
    po: "PO-3290",
    supplier: "Om Electricals & Components",
    product: "Power Adapter 12V 2A",
    category: "Electronics",
    qty: 6,
    unitPrice: 210,
    returnValue: 1260,
    reason: "Quality issue",
    status: "resolved",
    refund: "Refunded",
    raisedOn: "2026-06-28",
    resolvedOn: "2026-07-02",
    performanceImpact: -2,
    remark: "Adapters failed QC voltage test.",
  },
  {
    id: "RET-091",
    po: "PO-3277",
    supplier: "Bright Circuits Pvt Ltd",
    product: "USB-C Cable 1.5m",
    category: "Electronics",
    qty: 15,
    unitPrice: 85,
    returnValue: 1275,
    reason: "Damaged in transit",
    status: "rejected",
    refund: "Denied",
    raisedOn: "2026-06-20",
    resolvedOn: "2026-06-24",
    performanceImpact: 0,
    remark: "Supplier rejected claim — damage found to be post-delivery.",
  },
];

/** Reasons offered in the Create Return form. */
export const purchaseReturnReasons = [
  "Damaged in transit",
  "Wrong item shipped",
  "Quality issue",
  "Excess quantity",
  "Expired / near expiry",
  "Not as described",
];

/** Suppliers offered in the Create Return form (subset of the supplier list). */
export const purchaseReturnSuppliers = [
  "Bright Circuits Pvt Ltd",
  "Kumar Electronics Traders",
  "Om Electricals & Components",
  "Shree Packaging Co.",
  "Indore Corrugated Box Works",
];

/**
 * Returnable sources for the Create Return flow. A purchase return is ALWAYS
 * raised against goods that were actually received (a PO + its GRN), so the
 * supplier and the delivered products are known and tracked — the user picks a
 * source here and the supplier + product lines auto-fill (they are never typed
 * fresh). Each line carries the received qty and rate so return value can be
 * computed and the returnable qty can be capped. Frontend-only sample data.
 */
export const returnableSources = [
  {
    id: "PO-3338",
    grn: "GRN-2231",
    supplier: "Bright Circuits Pvt Ltd",
    supplierId: "SUP-3",
    supplierCode: "BPL-SUPP-3",
    receivedOn: "2026-07-15",
    lines: [
      {
        sku: "ELE-HD-19",
        name: "HDMI Connector 19-Pin",
        receivedQty: 116,
        rate: 42,
      },
    ],
  },
  {
    id: "PO-3330",
    grn: "GRN-2225",
    supplier: "Shree Packaging Co.",
    supplierId: "SUP-1",
    supplierCode: "IND-SUPP-1",
    receivedOn: "2026-07-12",
    lines: [
      {
        sku: "PKG-BW-150",
        name: "Bubble Wrap Roll 1m x 50m",
        receivedQty: 18,
        rate: 650,
      },
      {
        sku: "PKG-CB-121212",
        name: "Corrugated Box 12x12x12",
        receivedQty: 200,
        rate: 22,
      },
    ],
  },
  {
    id: "PO-3322",
    grn: "GRN-2219",
    supplier: "Indore Corrugated Box Works",
    supplierId: "SUP-4",
    supplierCode: "IND-SUPP-4",
    receivedOn: "2026-07-09",
    lines: [
      {
        sku: "PKG-CB-121212",
        name: "Corrugated Box 12x12x12",
        receivedQty: 300,
        rate: 22,
      },
    ],
  },
  {
    id: "PO-3310",
    grn: "GRN-2205",
    supplier: "Kumar Electronics Traders",
    supplierId: "SUP-2",
    supplierCode: "IND-SUPP-2",
    receivedOn: "2026-07-02",
    lines: [
      {
        sku: "ELE-CT-200",
        name: "Cable Ties 200mm (Pack of 100)",
        receivedQty: 60,
        rate: 85,
      },
    ],
  },
  {
    id: "PO-3290",
    grn: "GRN-2188",
    supplier: "Om Electricals & Components",
    supplierId: "SUP-5",
    supplierCode: "UJJ-SUPP-5",
    receivedOn: "2026-06-25",
    lines: [
      {
        sku: "ELE-PA-12",
        name: "Power Adapter 12V 2A",
        receivedQty: 40,
        rate: 210,
      },
    ],
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
    rawProductCode: "ELE-HD-19",
    supplier: "Bright Circuits Pvt Ltd",
    category: "Electronics",
    mode: "brand",
    unit: "pcs",
    qty: 120,
    oldPrice: 38,
    currentPrice: 42,
    priceHistory: [36, 37, 38, 40, 42],
    poCode: "PO-3338",
    queryCode: "QP-8841",
    buyer: "Deepak Kumar",
    paymentStatus: "paid",
    purchasedOn: "2026-07-14",
    remark: "Bulk order for SO-2198. Rate negotiated down from ₹44.",
  },
  {
    id: "PH-2",
    product: "Bubble Wrap Roll 1m x 50m",
    rawProductCode: "PKG-BW-150",
    supplier: "Shree Packaging Co.",
    category: "Packaging Material",
    mode: "local",
    unit: "roll",
    qty: 18,
    oldPrice: 610,
    currentPrice: 650,
    priceHistory: [590, 600, 610, 630, 650],
    poCode: "PO-3330",
    queryCode: "QP-8820",
    buyer: "Ramesh Patel",
    paymentStatus: "partial",
    purchasedOn: "2026-07-12",
    remark: "Local pickup from Indore market zone.",
  },
  {
    id: "PH-3",
    product: "Corrugated Box 12x12x12",
    rawProductCode: "PKG-CB-121212",
    supplier: "Indore Corrugated Box Works",
    category: "Packaging Material",
    mode: "local",
    unit: "pcs",
    qty: 300,
    oldPrice: 20,
    currentPrice: 22,
    priceHistory: [19, 20, 20, 21, 22],
    poCode: "PO-3320",
    queryCode: "QP-8802",
    buyer: "Ramesh Patel",
    paymentStatus: "paid",
    purchasedOn: "2026-07-09",
    remark: "",
  },
  {
    id: "PH-4",
    product: "Cable Ties 200mm (Pack of 100)",
    rawProductCode: "ELE-CT-200",
    supplier: "Kumar Electronics Traders",
    category: "Electronics",
    mode: "brand",
    unit: "pack",
    qty: 60,
    oldPrice: 80,
    currentPrice: 85,
    priceHistory: [78, 80, 82, 83, 85],
    poCode: "PO-3310",
    queryCode: "QP-8790",
    buyer: "Deepak Kumar",
    paymentStatus: "paid",
    purchasedOn: "2026-07-02",
    remark: "Repeat order — same supplier as last quarter.",
  },
  {
    id: "PH-5",
    product: "Power Adapter 12V 2A",
    rawProductCode: "ELE-PA-12",
    supplier: "Om Electricals & Components",
    category: "Electronics",
    mode: "brand",
    unit: "pcs",
    qty: 40,
    oldPrice: 295,
    currentPrice: 310,
    priceHistory: [285, 290, 295, 300, 310],
    poCode: "PO-3290",
    queryCode: "QP-8775",
    buyer: "Vivek Joshi",
    paymentStatus: "pending",
    purchasedOn: "2026-06-25",
    remark: "Awaiting vendor invoice before payment release.",
  },
  {
    id: "PH-6",
    product: "USB-C Cable 1.5m",
    rawProductCode: "ELE-UC-150",
    supplier: "Bright Circuits Pvt Ltd",
    category: "Electronics",
    mode: "brand",
    unit: "pcs",
    qty: 200,
    oldPrice: 90,
    currentPrice: 85,
    priceHistory: [95, 93, 92, 88, 85],
    poCode: "PO-3277",
    queryCode: "QP-8760",
    buyer: "Deepak Kumar",
    paymentStatus: "paid",
    purchasedOn: "2026-06-18",
    remark: "Price dropped after switching to bulk slab.",
  },
  {
    id: "PH-7",
    product: "Stretch Film 500mm",
    rawProductCode: "PKG-SF-500",
    supplier: "Indore Corrugated Box Works",
    category: "Packaging Material",
    mode: "local",
    unit: "roll",
    qty: 25,
    oldPrice: 420,
    currentPrice: 420,
    priceHistory: [415, 420, 418, 420, 420],
    poCode: "PO-3265",
    queryCode: "QP-8748",
    buyer: "Ramesh Patel",
    paymentStatus: "paid",
    purchasedOn: "2026-06-10",
    remark: "",
  },
];

/** Payment-status presentation for Purchase History. */
export const purchaseHistoryPaymentMeta = {
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  pending: { label: "Pending", variant: "secondary" },
};

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

/* ============================================================================
 * DETAILED VIEW DATA
 * ----------------------------------------------------------------------------
 * Everything below powers the "detailed view" pages — every screen a user
 * opens shows the full story of that record (where it came from, why, rates,
 * cash/credit, how much from which supplier, waste/wastage mapping to product
 * codes, authorisation trail, documents, timeline). Keyed by the same IDs used
 * in the list tables above so a detail page can look a record up by :id.
 * Frontend-only sample data — nothing here is wired to a backend API.
 * ========================================================================== */

/** Fallback used by detail pages when an :id is not found in the map below —
 * keeps the demo pages from crashing on an unknown id. */
export const emptyPurchaseRequestDetail = {
  notFound: true,
};

/**
 * Full detail per Purchase Request, keyed by PR id. Answers the "10th-class
 * student can understand everything" bar: from where, why, what rate, cash vs
 * credit, how much qty from supplier 1 vs supplier 2, wastage mapped to the
 * product code, who authorised it, documents and a status timeline.
 */
export const purchaseRequestDetails = {
  "PR-1042": {
    id: "PR-1042",
    product: "Cable Ties 200mm (Pack of 100)",
    productCode: "ELE-CT-200",
    category: "Electronics",
    unit: "pack",
    bucketType: "local",
    status: "open",
    priority: "high",
    qty: 5,
    hodApprovedOn: "2026-07-15",
    hodApprovedBy: "HOD — Rajesh Mehta",
    raisedBy: "Sales — Priya Sharma",
    raisedOn: "2026-07-14",
    targetDate: "2026-07-20",
    // Why this purchase exists / where the demand came from
    origin: {
      why: "Approved sales orders need cable ties for cable-harness kits. Stock on hand is below the reorder level, so a purchase request was auto-created and HOD-approved.",
      fromWhere:
        "Raised from 5 separate sales orders (SO lines) for the same product; the buckets merged them into one request and only increased the quantity.",
      mergedFrom: ["SO-2210", "SO-2208", "SO-2201", "SO-2197", "SO-2190"],
      linkedQuery: "QP-8791",
    },
    // Rate + payment terms decided for this purchase
    commercials: {
      purchaseRate: 85,
      purchaseType: "credit", // credit purchase or cash purchase
      creditDays: 30,
      lastPurchaseRate: 82,
      gstPercent: 18,
      expectedValue: 425,
    },
    // How much qty is being bought from which supplier (split sourcing)
    supplierSplit: [
      {
        supplier: "Kumar Electronics Traders",
        supplierCode: "IND-SUPP-2",
        qty: 3,
        rate: 85,
        purchaseType: "credit",
        note: "Primary supplier, best rate on this SKU.",
      },
      {
        supplier: "Om Electricals & Components",
        supplierCode: "UJJ-SUPP-5",
        qty: 2,
        rate: 88,
        purchaseType: "cash",
        note: "Balance qty to meet target date; slightly higher rate.",
      },
    ],
    // Wastage mapped to product code (the "waste detail mapped with the code")
    wastage: [
      {
        productCode: "ELE-CT-200",
        expectedWastePercent: 2,
        expectedWasteQty: 0.1,
        reason: "Packaging cuts / QC rejects during kitting.",
      },
    ],
    // Authorisation trail — "Mukesh ki taraf se okay hai"
    authorisation: {
      authorisedBy: "Mukesh Agrawal (Purchase Head)",
      authorisedOn: "2026-07-15",
      note: "Mukesh ki taraf se OK — rate & supplier split approved, proceed with purchase.",
      status: "authorised",
    },
    documents: [
      { name: "HOD Approval Note.pdf", type: "approval", size: "88 KB" },
      { name: "Rate Comparison Sheet.xlsx", type: "sheet", size: "24 KB" },
    ],
    remark:
      "Merged from 5 SO lines. Split across two suppliers to hit the 20 Jul target date.",
    timeline: [
      { label: "Raised by Sales", on: "2026-07-14", by: "Priya Sharma" },
      { label: "HOD Approved", on: "2026-07-15", by: "Rajesh Mehta" },
      {
        label: "Authorised for Purchase",
        on: "2026-07-15",
        by: "Mukesh Agrawal",
      },
      { label: "Open in Purchase bucket", on: "2026-07-15", by: "System" },
    ],
  },
  "PR-1039": {
    id: "PR-1039",
    product: "HDMI Connector 19-Pin",
    productCode: "ELE-HD-19",
    category: "Electronics",
    unit: "pcs",
    bucketType: "brand",
    status: "in progress",
    priority: "high",
    qty: 120,
    hodApprovedOn: "2026-07-14",
    hodApprovedBy: "HOD — Rajesh Mehta",
    raisedBy: "Sales — Anil Gupta",
    raisedOn: "2026-07-13",
    targetDate: "2026-07-19",
    origin: {
      why: "Branded HDMI connectors required for SO-2198 (display-cable assembly). Customer specified a brand-grade part, so it routes to the Brand purchase bucket.",
      fromWhere: "Single sales order SO-2198, brand-grade line item.",
      mergedFrom: ["SO-2198"],
      linkedQuery: "QP-8841",
    },
    commercials: {
      purchaseRate: 42,
      purchaseType: "credit",
      creditDays: 45,
      lastPurchaseRate: 40,
      gstPercent: 18,
      expectedValue: 5040,
    },
    supplierSplit: [
      {
        supplier: "Bright Circuits Pvt Ltd",
        supplierCode: "BPL-SUPP-3",
        qty: 120,
        rate: 42,
        purchaseType: "credit",
        note: "Authorised brand distributor — full qty from one source.",
      },
    ],
    wastage: [
      {
        productCode: "ELE-HD-19",
        expectedWastePercent: 1,
        expectedWasteQty: 1.2,
        reason: "Crimping test failures.",
      },
    ],
    authorisation: {
      authorisedBy: "Mukesh Agrawal (Purchase Head)",
      authorisedOn: "2026-07-14",
      note: "Brand part, approved distributor — go ahead on credit terms.",
      status: "authorised",
    },
    documents: [
      {
        name: "Brand Authorisation Letter.pdf",
        type: "approval",
        size: "120 KB",
      },
    ],
    remark: "Brand-grade line; single approved distributor.",
    timeline: [
      { label: "Raised by Sales", on: "2026-07-13", by: "Anil Gupta" },
      { label: "HOD Approved", on: "2026-07-14", by: "Rajesh Mehta" },
      {
        label: "Authorised for Purchase",
        on: "2026-07-14",
        by: "Mukesh Agrawal",
      },
      {
        label: "PO drafting in progress",
        on: "2026-07-15",
        by: "Deepak Kumar",
      },
    ],
  },
  "PR-1035": {
    id: "PR-1035",
    product: "Corrugated Box 12x12x12",
    productCode: "PKG-CB-121212",
    category: "Packaging Material",
    unit: "pcs",
    bucketType: "local",
    status: "open",
    priority: "medium",
    qty: 300,
    hodApprovedOn: "2026-07-13",
    hodApprovedBy: "HOD — Rajesh Mehta",
    raisedBy: "Sales — Neha Jain",
    raisedOn: "2026-07-12",
    targetDate: "2026-07-18",
    origin: {
      why: "Outer packaging boxes needed for dispatch of SO-2185. Local, non-branded packaging item — handled directly by the purchase manager.",
      fromWhere: "Sales order SO-2185 packaging requirement.",
      mergedFrom: ["SO-2185"],
      linkedQuery: "QP-8802",
    },
    commercials: {
      purchaseRate: 22,
      purchaseType: "cash",
      creditDays: 0,
      lastPurchaseRate: 21,
      gstPercent: 12,
      expectedValue: 6600,
    },
    supplierSplit: [
      {
        supplier: "Indore Corrugated Box Works",
        supplierCode: "IND-SUPP-4",
        qty: 300,
        rate: 22,
        purchaseType: "cash",
        note: "Local vendor, cash purchase, same-day pickup.",
      },
    ],
    wastage: [
      {
        productCode: "PKG-CB-121212",
        expectedWastePercent: 3,
        expectedWasteQty: 9,
        reason: "Crushed/damaged boxes during transit and handling.",
      },
    ],
    authorisation: {
      authorisedBy: "Mukesh Agrawal (Purchase Head)",
      authorisedOn: "2026-07-13",
      note: "Local cash buy, within limit — OK.",
      status: "authorised",
    },
    documents: [],
    remark: "Local packaging item, cash purchase from Indore market zone.",
    timeline: [
      { label: "Raised by Sales", on: "2026-07-12", by: "Neha Jain" },
      { label: "HOD Approved", on: "2026-07-13", by: "Rajesh Mehta" },
      { label: "Open in Purchase bucket", on: "2026-07-13", by: "System" },
    ],
  },
  "PR-1030": {
    id: "PR-1030",
    product: "Bubble Wrap Roll 1m x 50m",
    productCode: "PKG-BW-150",
    category: "Packaging Material",
    unit: "roll",
    bucketType: "local",
    status: "purchased",
    priority: "low",
    qty: 18,
    hodApprovedOn: "2026-07-10",
    hodApprovedBy: "HOD — Rajesh Mehta",
    raisedBy: "Sales — Neha Jain",
    raisedOn: "2026-07-09",
    targetDate: "2026-07-12",
    origin: {
      why: "Protective wrapping for fragile items in SO-2170. Local packaging item, already purchased.",
      fromWhere: "Sales order SO-2170.",
      mergedFrom: ["SO-2170"],
      linkedQuery: "QP-8820",
    },
    commercials: {
      purchaseRate: 650,
      purchaseType: "cash",
      creditDays: 0,
      lastPurchaseRate: 630,
      gstPercent: 18,
      expectedValue: 11700,
    },
    supplierSplit: [
      {
        supplier: "Shree Packaging Co.",
        supplierCode: "IND-SUPP-1",
        qty: 18,
        rate: 650,
        purchaseType: "cash",
        note: "Local pickup from Indore market zone.",
      },
    ],
    wastage: [
      {
        productCode: "PKG-BW-150",
        expectedWastePercent: 1,
        expectedWasteQty: 0.18,
        reason: "Torn wrap at roll ends.",
      },
    ],
    authorisation: {
      authorisedBy: "Mukesh Agrawal (Purchase Head)",
      authorisedOn: "2026-07-10",
      note: "Routine local buy — approved.",
      status: "authorised",
    },
    documents: [{ name: "Cash Bill 4471.jpg", type: "bill", size: "210 KB" }],
    remark: "Completed — moved to Purchase History as PH-2.",
    timeline: [
      { label: "Raised by Sales", on: "2026-07-09", by: "Neha Jain" },
      { label: "HOD Approved", on: "2026-07-10", by: "Rajesh Mehta" },
      { label: "Purchased", on: "2026-07-12", by: "Ramesh Patel" },
    ],
  },
  "PR-1028": {
    id: "PR-1028",
    product: "Branded Power Adapter 12V 2A",
    productCode: "ELE-PA-12",
    category: "Electronics",
    unit: "pcs",
    bucketType: "brand",
    status: "open",
    priority: "medium",
    qty: 60,
    hodApprovedOn: "2026-07-09",
    hodApprovedBy: "HOD — Rajesh Mehta",
    raisedBy: "Sales — Anil Gupta",
    raisedOn: "2026-07-08",
    targetDate: "2026-07-17",
    origin: {
      why: "Branded power adapters requested by the customer on SO-2160. Brand-grade line — routes to the Brand purchase bucket.",
      fromWhere: "Sales order SO-2160.",
      mergedFrom: ["SO-2160"],
      linkedQuery: "QP-8775",
    },
    commercials: {
      purchaseRate: 310,
      purchaseType: "credit",
      creditDays: 30,
      lastPurchaseRate: 300,
      gstPercent: 18,
      expectedValue: 18600,
    },
    supplierSplit: [
      {
        supplier: "Om Electricals & Components",
        supplierCode: "UJJ-SUPP-5",
        qty: 40,
        rate: 310,
        purchaseType: "credit",
        note: "Primary brand stockist.",
      },
      {
        supplier: "Bright Circuits Pvt Ltd",
        supplierCode: "BPL-SUPP-3",
        qty: 20,
        rate: 315,
        purchaseType: "cash",
        note: "Shortfall covered from secondary stockist.",
      },
    ],
    wastage: [
      {
        productCode: "ELE-PA-12",
        expectedWastePercent: 2,
        expectedWasteQty: 1.2,
        reason: "QC voltage-test rejects.",
      },
    ],
    authorisation: {
      authorisedBy: "Mukesh Agrawal (Purchase Head)",
      authorisedOn: "2026-07-09",
      note: "Split sourcing approved to meet the target date.",
      status: "authorised",
    },
    documents: [{ name: "Brand Price List.pdf", type: "sheet", size: "64 KB" }],
    remark: "Split across two brand stockists to meet 17 Jul target.",
    timeline: [
      { label: "Raised by Sales", on: "2026-07-08", by: "Anil Gupta" },
      { label: "HOD Approved", on: "2026-07-09", by: "Rajesh Mehta" },
      {
        label: "Authorised for Purchase",
        on: "2026-07-09",
        by: "Mukesh Agrawal",
      },
      { label: "Open in Purchase bucket", on: "2026-07-09", by: "System" },
    ],
  },
};

/** Look up a purchase request detail by id, with a safe fallback. */
export const getPurchaseRequestDetail = (id) =>
  purchaseRequestDetails[id] || { ...emptyPurchaseRequestDetail, id };

/** Options for the "Assign to Local Purchase" tab of the Action dialog. */
export const localPurchaseAssignees = [
  { id: "LP-1", name: "Ramesh Patel — Local Purchase Exec (Indore)" },
  { id: "LP-2", name: "Sunita Verma — Local Purchase Exec (Indore)" },
  { id: "LP-3", name: "Imran Khan — Local Purchase Exec (Bhopal)" },
];

/** Priority options reused across the direct-purchase action form. */
export const purchasePriorityOptions = ["high", "medium", "low"];

/** Authorisers offered in the direct-purchase action form. */
export const purchaseAuthorisers = [
  "Mukesh Agrawal (Purchase Head)",
  "Rajesh Mehta (HOD)",
  "Anita Rao (Finance)",
];

/**
 * Full detail per Purchase Order, keyed by PO id. Powers the PO detail page:
 * line items, supplier & billing/shipping, payment terms, GRN/receipt status,
 * payment status and a timeline. Merges with the summary in `purchaseOrders`.
 */
export const purchaseOrderDetails = {
  "PO-3341": {
    id: "PO-3341",
    supplier: "Kumar Electronics Traders",
    supplierCode: "IND-SUPP-2",
    supplierContact: "Deepak Kumar · 9876500022",
    date: "2026-07-16",
    expectedDelivery: "2026-07-22",
    hodVerification: "pending",
    status: "pending",
    createdBy: "Purchase — Deepak Kumar",
    billingAddress: {
      company: "MIGTI Technologies Pvt Ltd",
      line: "45 Industrial Area, Sector 3",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
      gstin: "23ABCDE1234F1Z5",
    },
    shippingAddress: {
      company: "MIGTI Central Warehouse",
      line: "Plot 12, Logistics Park, Ring Road",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452016",
    },
    lines: [
      {
        sku: "ELE-CT-200",
        name: "Cable Ties 200mm (Pack of 100)",
        qty: 300,
        rate: 85,
        gstPercent: 18,
      },
      {
        sku: "ELE-HD-19",
        name: "HDMI Connector 19-Pin",
        qty: 100,
        rate: 42,
        gstPercent: 18,
      },
    ],
    paymentTerms: {
      type: "credit",
      creditDays: 30,
      advancePercent: 0,
      mode: "NEFT / Bank Transfer",
      dueDate: "2026-08-15",
      paid: false,
    },
    receipt: {
      grn: null,
      materialReceived: false,
      note: "Material not yet received — awaiting HOD verification and dispatch.",
    },
    terms:
      "1. Delivery within 7 working days of PO date.\n2. Payment: net 30 days on GRN.\n3. Goods must match approved sample/specification.\n4. Any damage/shortage to be reported within 48 hours of receipt.",
    timeline: [
      { label: "PO Drafted", on: "2026-07-16", by: "Deepak Kumar" },
      { label: "Awaiting HOD Verification", on: "2026-07-16", by: "System" },
    ],
  },
  "PO-3338": {
    id: "PO-3338",
    supplier: "Bright Circuits Pvt Ltd",
    supplierCode: "BPL-SUPP-3",
    supplierContact: "Suresh Nair · 9876500033",
    date: "2026-07-14",
    expectedDelivery: "2026-07-19",
    hodVerification: "verified",
    status: "confirmed",
    createdBy: "Purchase — Deepak Kumar",
    billingAddress: {
      company: "MIGTI Technologies Pvt Ltd",
      line: "45 Industrial Area, Sector 3",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
      gstin: "23ABCDE1234F1Z5",
    },
    shippingAddress: {
      company: "MIGTI Central Warehouse",
      line: "Plot 12, Logistics Park, Ring Road",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452016",
    },
    lines: [
      {
        sku: "ELE-HD-19",
        name: "HDMI Connector 19-Pin",
        qty: 120,
        rate: 42,
        gstPercent: 18,
      },
    ],
    paymentTerms: {
      type: "credit",
      creditDays: 45,
      advancePercent: 0,
      mode: "NEFT / Bank Transfer",
      dueDate: "2026-08-28",
      paid: false,
    },
    receipt: {
      grn: "GRN-2231",
      materialReceived: true,
      receivedQty: 116,
      orderedQty: 120,
      note: "Short received — 116 of 120. Return RET-118 raised for 4 damaged units.",
    },
    terms:
      "1. Delivery within 5 working days of PO date.\n2. Payment: net 45 days on GRN.\n3. Brand-grade parts only, with authorisation letter.\n4. Damage/shortage reported within 48 hours.",
    timeline: [
      { label: "PO Drafted", on: "2026-07-14", by: "Deepak Kumar" },
      { label: "HOD Verified", on: "2026-07-14", by: "Rajesh Mehta" },
      { label: "Sent to Supplier", on: "2026-07-14", by: "Deepak Kumar" },
      { label: "GRN Received (short)", on: "2026-07-15", by: "Sunil Verma" },
    ],
  },
  "PO-3330": {
    id: "PO-3330",
    supplier: "Shree Packaging Co.",
    supplierCode: "IND-SUPP-1",
    supplierContact: "Manoj Shah · 9876500011",
    date: "2026-07-11",
    expectedDelivery: "2026-07-15",
    hodVerification: "verified",
    status: "sent",
    createdBy: "Purchase — Ramesh Patel",
    billingAddress: {
      company: "MIGTI Technologies Pvt Ltd",
      line: "45 Industrial Area, Sector 3",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
      gstin: "23ABCDE1234F1Z5",
    },
    shippingAddress: {
      company: "MIGTI Central Warehouse",
      line: "Plot 12, Logistics Park, Ring Road",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452016",
    },
    lines: [
      {
        sku: "PKG-BW-150",
        name: "Bubble Wrap Roll 1m x 50m",
        qty: 18,
        rate: 650,
        gstPercent: 18,
      },
      {
        sku: "PKG-CB-121212",
        name: "Corrugated Box 12x12x12",
        qty: 200,
        rate: 22,
        gstPercent: 12,
      },
      {
        sku: "PKG-SF-500",
        name: "Stretch Film 500mm",
        qty: 25,
        rate: 420,
        gstPercent: 18,
      },
    ],
    paymentTerms: {
      type: "credit",
      creditDays: 30,
      advancePercent: 50,
      mode: "NEFT / Bank Transfer",
      dueDate: "2026-08-10",
      paid: false,
    },
    receipt: {
      grn: "GRN-2225",
      materialReceived: true,
      receivedQty: 18,
      orderedQty: 18,
      note: "Bubble wrap fully received (GRN-2225). Boxes & film pending.",
    },
    terms:
      "1. Delivery within 4 working days.\n2. Payment: 50% advance, balance net 30 on GRN.\n3. Local pickup allowed.\n4. Damage/shortage within 48 hours.",
    timeline: [
      { label: "PO Drafted", on: "2026-07-11", by: "Ramesh Patel" },
      { label: "HOD Verified", on: "2026-07-11", by: "Rajesh Mehta" },
      { label: "Sent to Supplier", on: "2026-07-11", by: "Ramesh Patel" },
    ],
  },
  "PO-3322": {
    id: "PO-3322",
    supplier: "Indore Corrugated Box Works",
    supplierCode: "IND-SUPP-4",
    supplierContact: "Ramesh Patel · 9876500044",
    date: "2026-07-08",
    expectedDelivery: "2026-07-12",
    hodVerification: "rejected",
    status: "draft",
    createdBy: "Purchase — Ramesh Patel",
    billingAddress: {
      company: "MIGTI Technologies Pvt Ltd",
      line: "45 Industrial Area, Sector 3",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
      gstin: "23ABCDE1234F1Z5",
    },
    shippingAddress: {
      company: "MIGTI Central Warehouse",
      line: "Plot 12, Logistics Park, Ring Road",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452016",
    },
    lines: [
      {
        sku: "PKG-CB-121212",
        name: "Corrugated Box 12x12x12",
        qty: 300,
        rate: 22,
        gstPercent: 12,
      },
    ],
    paymentTerms: {
      type: "cash",
      creditDays: 0,
      advancePercent: 100,
      mode: "Cash",
      dueDate: "2026-07-12",
      paid: false,
    },
    receipt: {
      grn: null,
      materialReceived: false,
      note: "PO rejected by HOD — rate above the approved ceiling. Needs re-negotiation.",
    },
    terms:
      "1. Cash purchase, immediate delivery.\n2. Goods to match sample.\n3. Damage/shortage within 48 hours.",
    timeline: [
      { label: "PO Drafted", on: "2026-07-08", by: "Ramesh Patel" },
      { label: "HOD Rejected", on: "2026-07-08", by: "Rajesh Mehta" },
    ],
  },
};

/** Look up a purchase order detail by id, with a safe fallback. */
export const getPurchaseOrderDetail = (id) =>
  purchaseOrderDetails[id] || { id, notFound: true };

/** Billing / shipping / company presets offered in the Create PO wizard. */
export const companyBillingPresets = [
  {
    id: "BILL-1",
    company: "MIGTI Technologies Pvt Ltd",
    line: "45 Industrial Area, Sector 3",
    city: "Indore",
    state: "Madhya Pradesh",
    pincode: "452010",
    gstin: "23ABCDE1234F1Z5",
  },
];
export const companyShippingPresets = [
  {
    id: "SHIP-1",
    company: "MIGTI Central Warehouse",
    line: "Plot 12, Logistics Park, Ring Road",
    city: "Indore",
    state: "Madhya Pradesh",
    pincode: "452016",
  },
  {
    id: "SHIP-2",
    company: "MIGTI Bhopal Branch",
    line: "22 MP Nagar, Zone 1",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pincode: "462011",
  },
];

/** Payment-term presets offered on the last step of the Create PO wizard. */
export const paymentTermPresets = [
  {
    id: "PT-1",
    label: "Net 30 days on GRN",
    type: "credit",
    creditDays: 30,
    advancePercent: 0,
  },
  {
    id: "PT-2",
    label: "Net 45 days on GRN",
    type: "credit",
    creditDays: 45,
    advancePercent: 0,
  },
  {
    id: "PT-3",
    label: "50% advance, 50% on GRN",
    type: "credit",
    creditDays: 30,
    advancePercent: 50,
  },
  {
    id: "PT-4",
    label: "100% advance (cash)",
    type: "cash",
    creditDays: 0,
    advancePercent: 100,
  },
];

/**
 * Full detail per GRN, keyed by GRN id. Powers the GRN detail page: ordered vs
 * received per line, condition, QC, storage bin, documents and a timeline.
 */
export const grnDetails = {
  "GRN-2231": {
    id: "GRN-2231",
    po: "PO-3338",
    supplier: "Bright Circuits Pvt Ltd",
    supplierCode: "BPL-SUPP-3",
    receivedOn: "2026-07-15",
    receivedBy: "Inventory — Sunil Verma",
    status: "short received",
    invoiceNo: "BC/INV/5521",
    vehicleNo: "MP09 GH 4412",
    gatePass: "GP-7781",
    lines: [
      {
        sku: "ELE-HD-19",
        name: "HDMI Connector 19-Pin",
        qtyOrdered: 120,
        qtyReceived: 116,
        qtyAccepted: 116,
        qtyRejected: 4,
        condition: "4 units damaged (bent pins)",
        bin: "A-12-03",
      },
    ],
    qc: {
      status: "partial pass",
      checkedBy: "QC — Alok Nema",
      note: "4 connectors failed pin-alignment check; return raised.",
    },
    linkedReturn: "RET-118",
    documents: [
      { name: "Supplier Invoice BC-5521.pdf", type: "bill", size: "142 KB" },
      { name: "Gate Pass GP-7781.pdf", type: "approval", size: "40 KB" },
    ],
    remark: "Short received; RET-118 raised for the 4 damaged units.",
    timeline: [
      { label: "Vehicle In", on: "2026-07-15", by: "Gate — Ravi" },
      { label: "Unloaded & Counted", on: "2026-07-15", by: "Sunil Verma" },
      { label: "QC Checked", on: "2026-07-15", by: "Alok Nema" },
      {
        label: "Return Raised (RET-118)",
        on: "2026-07-16",
        by: "Deepak Kumar",
      },
    ],
  },
  "GRN-2225": {
    id: "GRN-2225",
    po: "PO-3330",
    supplier: "Shree Packaging Co.",
    supplierCode: "IND-SUPP-1",
    receivedOn: "2026-07-12",
    receivedBy: "Inventory — Sunil Verma",
    status: "complete",
    invoiceNo: "SP/INV/3390",
    vehicleNo: "MP09 AB 1123",
    gatePass: "GP-7760",
    lines: [
      {
        sku: "PKG-BW-150",
        name: "Bubble Wrap Roll 1m x 50m",
        qtyOrdered: 18,
        qtyReceived: 18,
        qtyAccepted: 18,
        qtyRejected: 0,
        condition: "Good",
        bin: "C-04-01",
      },
    ],
    qc: {
      status: "pass",
      checkedBy: "QC — Alok Nema",
      note: "All rolls within spec.",
    },
    linkedReturn: null,
    documents: [
      { name: "Supplier Invoice SP-3390.pdf", type: "bill", size: "98 KB" },
    ],
    remark: "Full receipt, QC passed.",
    timeline: [
      { label: "Vehicle In", on: "2026-07-12", by: "Gate — Ravi" },
      { label: "Unloaded & Counted", on: "2026-07-12", by: "Sunil Verma" },
      { label: "QC Passed", on: "2026-07-12", by: "Alok Nema" },
      { label: "Stored", on: "2026-07-12", by: "Sunil Verma" },
    ],
  },
  "GRN-2219": {
    id: "GRN-2219",
    po: "PO-3322",
    supplier: "Indore Corrugated Box Works",
    supplierCode: "IND-SUPP-4",
    receivedOn: "2026-07-09",
    receivedBy: "Inventory — Manisha Tiwari",
    status: "complete",
    invoiceNo: "ICB/INV/2210",
    vehicleNo: "MP09 CD 7788",
    gatePass: "GP-7740",
    lines: [
      {
        sku: "PKG-CB-121212",
        name: "Corrugated Box 12x12x12",
        qtyOrdered: 300,
        qtyReceived: 300,
        qtyAccepted: 300,
        qtyRejected: 0,
        condition: "Good",
        bin: "C-06-02",
      },
    ],
    qc: {
      status: "pass",
      checkedBy: "QC — Alok Nema",
      note: "Wall thickness within spec.",
    },
    linkedReturn: null,
    documents: [
      { name: "Supplier Invoice ICB-2210.pdf", type: "bill", size: "76 KB" },
    ],
    remark: "Full receipt.",
    timeline: [
      { label: "Vehicle In", on: "2026-07-09", by: "Gate — Ravi" },
      { label: "Unloaded & Counted", on: "2026-07-09", by: "Manisha Tiwari" },
      { label: "QC Passed", on: "2026-07-09", by: "Alok Nema" },
      { label: "Stored", on: "2026-07-09", by: "Manisha Tiwari" },
    ],
  },
};
export const getGrnDetail = (id) => grnDetails[id] || { id, notFound: true };

/** Look up a purchase return detail by id — returns the row plus derived extras. */
export const getPurchaseReturnDetail = (id) => {
  const base = purchaseReturns.find((r) => r.id === id);
  if (!base) return { id, notFound: true };
  return {
    ...base,
    debitNote:
      base.status === "resolved" || base.status === "approved"
        ? `DN-${base.id.replace("RET-", "")}`
        : null,
    grn:
      base.id === "RET-118"
        ? "GRN-2231"
        : base.id === "RET-116"
          ? "GRN-2218"
          : null,
    photos:
      base.reason === "Damaged in transit" || base.reason === "Quality issue"
        ? [`${base.product} defect 1.jpg`, `${base.product} defect 2.jpg`]
        : [],
    timeline: [
      {
        label: "Return Raised",
        on: base.raisedOn,
        by: "Purchase — Deepak Kumar",
      },
      base.status !== "pending"
        ? {
            label:
              base.status === "rejected"
                ? "Rejected by Supplier"
                : base.status === "approved"
                  ? "Approved by Supplier"
                  : "Resolved",
            on: base.resolvedOn || base.raisedOn,
            by: "Supplier",
          }
        : {
            label: "Awaiting supplier response",
            on: base.raisedOn,
            by: "System",
          },
    ].filter(Boolean),
  };
};

/**
 * Full detail per vendor due payment, keyed by invoice id. Powers the vendor
 * payment detail page: invoice, PO link, ageing, bank details and a schedule.
 */
export const vendorPaymentDetails = {
  "INV-8841": {
    id: "INV-8841",
    vendor: "Kumar Electronics Traders",
    vendorCode: "IND-SUPP-2",
    po: "PO-3341",
    grn: null,
    invoiceDate: "2026-07-16",
    dueDate: "2026-07-20",
    amount: 42500,
    gstAmount: 6483,
    tds: 425,
    payable: 42075,
    daysOverdue: 0,
    status: "pending",
    paymentMode: "NEFT",
    bank: {
      name: "HDFC Bank",
      account: "50200012345678",
      ifsc: "HDFC0001234",
      branch: "Indore Main",
    },
    schedule: [
      {
        label: "Invoice Received",
        on: "2026-07-16",
        amount: 42500,
        done: true,
      },
      { label: "Due", on: "2026-07-20", amount: 42075, done: false },
    ],
    remark: "Awaiting GRN confirmation before release.",
  },
  "INV-8830": {
    id: "INV-8830",
    vendor: "Bright Circuits Pvt Ltd",
    vendorCode: "BPL-SUPP-3",
    po: "PO-3338",
    grn: "GRN-2231",
    invoiceDate: "2026-07-01",
    dueDate: "2026-07-10",
    amount: 88400,
    gstAmount: 13485,
    tds: 884,
    payable: 87516,
    daysOverdue: 6,
    status: "overdue",
    paymentMode: "NEFT",
    bank: {
      name: "ICICI Bank",
      account: "623405001122",
      ifsc: "ICIC0006234",
      branch: "Bhopal MP Nagar",
    },
    schedule: [
      {
        label: "Invoice Received",
        on: "2026-07-01",
        amount: 88400,
        done: true,
      },
      { label: "Due (overdue)", on: "2026-07-10", amount: 87516, done: false },
    ],
    remark:
      "Overdue by 6 days. Short-receipt adjustment for RET-118 to be netted before payment.",
  },
  "INV-8811": {
    id: "INV-8811",
    vendor: "Shree Packaging Co.",
    vendorCode: "IND-SUPP-1",
    po: "PO-3330",
    grn: "GRN-2225",
    invoiceDate: "2026-07-11",
    dueDate: "2026-07-18",
    amount: 30600,
    gstAmount: 4668,
    tds: 306,
    payable: 30294,
    daysOverdue: 0,
    status: "pending",
    paymentMode: "NEFT",
    bank: {
      name: "SBI",
      account: "38771122334",
      ifsc: "SBIN0003877",
      branch: "Indore Market",
    },
    schedule: [
      {
        label: "Advance Paid (50%)",
        on: "2026-07-11",
        amount: 15300,
        done: true,
      },
      { label: "Balance Due", on: "2026-07-18", amount: 14994, done: false },
    ],
    remark: "50% advance already paid; balance due on 18 Jul.",
  },
};
export const getVendorPaymentDetail = (id) =>
  vendorPaymentDetails[id] || { id, notFound: true };

/** Look up a purchase history detail by id — the row already carries most of it. */
export const getPurchaseHistoryDetail = (id) => {
  const base = purchaseHistory.find((r) => r.id === id);
  if (!base) return { id, notFound: true };
  return {
    ...base,
    priceTrendMonths: ["Mar", "Apr", "May", "Jun", "Jul"],
    supplierCode:
      {
        "Bright Circuits Pvt Ltd": "BPL-SUPP-3",
        "Shree Packaging Co.": "IND-SUPP-1",
        "Indore Corrugated Box Works": "IND-SUPP-4",
        "Kumar Electronics Traders": "IND-SUPP-2",
        "Om Electricals & Components": "UJJ-SUPP-5",
      }[base.supplier] || "—",
    grn:
      base.poCode === "PO-3338"
        ? "GRN-2231"
        : base.poCode === "PO-3330"
          ? "GRN-2225"
          : base.poCode === "PO-3320"
            ? "GRN-2219"
            : "—",
    timeline: [
      { label: "PO Raised", on: base.purchasedOn, by: base.buyer },
      { label: "Goods Received", on: base.purchasedOn, by: "Inventory" },
      {
        label:
          base.paymentStatus === "paid"
            ? "Payment Cleared"
            : base.paymentStatus === "partial"
              ? "Part Payment Done"
              : "Payment Pending",
        on: base.purchasedOn,
        by: "Finance",
      },
    ],
  };
};
