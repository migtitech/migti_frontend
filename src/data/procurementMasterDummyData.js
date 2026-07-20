/**
 * Sample/demo data for the Procurement Master (procurement_master) section.
 * Frontend-only — nothing here is wired to a backend API.
 */

/** Categories this procurement manager is assigned to — suppliers & the
 * request bucket are scoped to these categories only. */
export const assignedCategories = ["Raw Material", "Machinery Spares"];

/** Categories auto-routed to the Brand Procurement bucket; everything else
 * (including anything outside assignedCategories) is Local. */
const BRAND_CATEGORIES = ["Machinery Spares"];

/** Decides Local vs Brand automatically from the product's category — this
 * is computed, not hand-tagged, per product. */
export const deriveBucketType = (category) =>
  BRAND_CATEGORIES.includes(category) ? "brand" : "local";

export const procurementMasterDashboard = {
  kpis: {
    fromQueryCount: 4,
    hodRatePendingCount: 3,
    verificationCount: 2,
    monthProcurementValue: 962000,
  },
  pendingWork: [
    {
      id: "PW-1",
      title: "Submit rate for QP-2404 (MS Angle 25x25x3mm)",
      priority: "high",
      due: "2026-07-17",
    },
    {
      id: "PW-2",
      title: "Respond to HOD rate query — QP-2401",
      priority: "high",
      due: "2026-07-17",
    },
    {
      id: "PW-3",
      title: "Confirm supplier for verification — QP-2397",
      priority: "medium",
      due: "2026-07-18",
    },
    {
      id: "PW-4",
      title: "Update rate card for Bearing 6205 ZZ",
      priority: "medium",
      due: "2026-07-19",
    },
  ],
  assignedWork: [
    {
      id: "QP-2404",
      type: "Procurement Request",
      status: "query",
      due: "2026-07-17",
    },
    {
      id: "QP-2401",
      type: "Procurement Request",
      status: "hod_rate_pending",
      due: "2026-07-17",
    },
    {
      id: "QP-2397",
      type: "Procurement Request",
      status: "verification",
      due: "2026-07-18",
    },
    {
      id: "QP-2388",
      type: "Procurement Request",
      status: "fulfilled",
      due: "2026-07-14",
    },
  ],
  monthlyTrend: {
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    value: [520000, 610000, 705000, 780000, 860000, 962000],
  },
};

/** Suppliers — scoped to this procurement manager's assigned categories,
 * i.e. the "category wise supplier" view (mirrors Purchase Master). */
export const suppliers = [
  {
    id: "SUP-P1",
    name: "Malwa Steel Traders",
    category: "Raw Material",
    city: "Indore",
    contact: "Ashok Bhatia",
    phone: "9876511011",
    rating: 4.4,
    status: "active",
  },
  {
    id: "SUP-P2",
    name: "Narmada Alloys Pvt Ltd",
    category: "Raw Material",
    city: "Ujjain",
    contact: "Vinod Chouhan",
    phone: "9876511022",
    rating: 4.1,
    status: "active",
  },
  {
    id: "SUP-P3",
    name: "Precision Bearings Co.",
    category: "Machinery Spares",
    city: "Indore",
    contact: "Harish Solanki",
    phone: "9876511033",
    rating: 4.6,
    status: "active",
  },
  {
    id: "SUP-P4",
    name: "Central India Fasteners",
    category: "Machinery Spares",
    city: "Dewas",
    contact: "Prakash Rathore",
    phone: "9876511044",
    rating: 3.9,
    status: "inactive",
  },
  {
    id: "SUP-P5",
    name: "Shivam Metal Works",
    category: "Raw Material",
    city: "Indore",
    contact: "Mahesh Agarwal",
    phone: "9876511055",
    rating: 4.3,
    status: "active",
  },
];

const rawRequests = [
  {
    id: "QP-2404",
    product: "MS Angle 25x25x3mm",
    category: "Raw Material",
    stage: "query",
    queryCode: "QRY-5510",
    targetRate: 62,
    submittedRate: null,
    rateStatus: "pending",
    status: "open",
    receivedOn: "2026-07-16",
  },
  {
    id: "QP-2401",
    product: "Bearing 6205 ZZ",
    category: "Machinery Spares",
    stage: "hod_rate_pending",
    queryCode: "QRY-5498",
    targetRate: 145,
    submittedRate: null,
    rateStatus: "pending",
    status: "open",
    receivedOn: "2026-07-15",
  },
  {
    id: "QP-2397",
    product: "Hex Bolt M12x50",
    category: "Machinery Spares",
    stage: "verification",
    queryCode: "QRY-5480",
    targetRate: 8,
    submittedRate: 8.5,
    rateStatus: "submitted",
    status: "rate_submitted",
    receivedOn: "2026-07-13",
  },
  {
    id: "QP-2392",
    product: "MS Flat Bar 40x6mm",
    category: "Raw Material",
    stage: "query",
    queryCode: "QRY-5471",
    targetRate: 58,
    submittedRate: null,
    rateStatus: "pending",
    status: "open",
    receivedOn: "2026-07-12",
  },
  {
    id: "QP-2388",
    product: "V-Belt B-Section 52 inch",
    category: "Machinery Spares",
    stage: "fulfilled",
    queryCode: "QRY-5450",
    targetRate: 320,
    submittedRate: 310,
    rateStatus: "submitted",
    status: "fulfilled",
    receivedOn: "2026-07-09",
  },
  {
    id: "QP-2381",
    product: "MS Round Bar 16mm",
    category: "Raw Material",
    stage: "hod_rate_pending",
    queryCode: "QRY-5432",
    targetRate: 68,
    submittedRate: null,
    rateStatus: "pending",
    status: "open",
    receivedOn: "2026-07-08",
  },
];

/** Procurement Requests bucket — every product that comes in either fresh
 * off a query, sent by the HOD for a rate, or sent for verification lands
 * here in one unified list. `bucketType` is auto-derived from category. */
export const procurementRequests = rawRequests.map((r) => ({
  ...r,
  bucketType: deriveBucketType(r.category),
}));

export const localProcurementBucket = procurementRequests.filter(
  (r) => r.bucketType === "local",
);
export const brandProcurementBucket = procurementRequests.filter(
  (r) => r.bucketType === "brand",
);

/** Round-robin sample suppliers/buyers so history rows carry who-sourced-what. */
const PROC_SUPPLIERS = [
  "Anand Steel & Alloys",
  "Precision Fasteners Co.",
  "Indore Bearings House",
  "Metro Raw Materials",
];
const PROC_BUYERS = ["Sunil Verma", "Anjali Rao", "Farhan Sheikh"];

/** Procurement History — every procurement item, across all stages, with
 * its rate target vs what was actually submitted. */
export const procurementHistory = [
  ...procurementRequests.map((r, i) => ({
    id: `PH-${r.id}`,
    product: r.product,
    category: r.category,
    bucketType: r.bucketType,
    stage: r.stage,
    queryCode: r.queryCode,
    qty: 50 + i * 25,
    unit: "pcs",
    targetRate: r.targetRate,
    submittedRate: r.submittedRate,
    supplier: PROC_SUPPLIERS[i % PROC_SUPPLIERS.length],
    buyer: PROC_BUYERS[i % PROC_BUYERS.length],
    status: r.status,
    date: r.receivedOn,
    remark: "",
  })),
  {
    id: "PH-QP-2370",
    product: "Bearing 6202 ZZ",
    category: "Machinery Spares",
    bucketType: "brand",
    stage: "fulfilled",
    queryCode: "QRY-5388",
    qty: 200,
    unit: "pcs",
    targetRate: 95,
    submittedRate: 92,
    supplier: "Indore Bearings House",
    buyer: "Anjali Rao",
    status: "fulfilled",
    date: "2026-07-05",
    remark: "Sourced ₹3 under target after negotiating slab pricing.",
  },
  {
    id: "PH-QP-2361",
    product: "MS Channel 75x40mm",
    category: "Raw Material",
    bucketType: "local",
    stage: "fulfilled",
    queryCode: "QRY-5361",
    qty: 120,
    unit: "kg",
    targetRate: 74,
    submittedRate: 74,
    supplier: "Metro Raw Materials",
    buyer: "Sunil Verma",
    status: "fulfilled",
    date: "2026-06-29",
    remark: "Matched target rate exactly; local pickup.",
  },
  {
    id: "PH-QP-2350",
    product: "Hex Nut M12",
    category: "Machinery Spares",
    bucketType: "brand",
    stage: "fulfilled",
    queryCode: "QRY-5350",
    qty: 1000,
    unit: "pcs",
    targetRate: 3.2,
    submittedRate: 3.4,
    supplier: "Precision Fasteners Co.",
    buyer: "Farhan Sheikh",
    status: "fulfilled",
    date: "2026-06-22",
    remark: "Rate came in ₹0.20 over target due to material cost rise.",
  },
];

export const myProcurementPerformanceReport = {
  kpis: {
    ratesAssigned: 18,
    ratesSubmittedOnTimePct: 89,
    avgTurnaroundHrs: 6.5,
    performanceScore: 84,
  },
  monthlyTrend: {
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    submitted: [14, 15, 16, 17, 17, 18],
    target: [15, 15, 16, 16, 17, 18],
  },
  stageBreakdown: [
    { stage: "Query", value: 2 },
    { stage: "HOD Rate", value: 2 },
    { stage: "Verification", value: 1 },
    { stage: "Fulfilled", value: 2 },
  ],
  recentActivity: [
    {
      id: "QP-2397",
      type: "Rate Submitted",
      detail: "Hex Bolt M12x50 — target ₹8, submitted ₹8.5",
      date: "2026-07-13",
    },
    {
      id: "QP-2388",
      type: "Fulfilled",
      detail: "V-Belt B-Section 52 inch — target ₹320, submitted ₹310",
      date: "2026-07-09",
    },
    {
      id: "QP-2370",
      type: "Fulfilled",
      detail: "Bearing 6202 ZZ — target ₹95, submitted ₹92",
      date: "2026-07-05",
    },
  ],
};
