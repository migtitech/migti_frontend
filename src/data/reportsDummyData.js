/**
 * Static dummy/sample data that powers the Reports section UI only.
 *
 * IMPORTANT: This is frontend presentational sample data — it is NOT wired
 * to any API/service and does not read or write real records. Swap this
 * module out for real service calls whenever the Reports section is
 * connected to the backend; nothing else needs to change.
 */

export const REPORT_MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------
export const salesReport = {
  kpis: {
    totalRevenue: 8842500,
    revenueGrowth: 12.4,
    totalOrders: 386,
    ordersGrowth: 6.1,
    avgOrderValue: 22908,
    avgOrderGrowth: 3.9,
    conversionRate: 34.2,
    conversionGrowth: -1.8,
  },
  monthlyRevenue: [612000, 705000, 668000, 812000, 774000, 884250],
  monthlyTarget: [650000, 700000, 700000, 780000, 800000, 850000],
  ordersByStatus: [
    { label: "Delivered", value: 214, color: "#12b76a" },
    { label: "In progress", value: 86, color: "#2970ff" },
    { label: "Pending", value: 54, color: "#f79009" },
    { label: "Cancelled", value: 32, color: "#f04438" },
  ],
  topProducts: [
    {
      name: "Industrial Bearing Set",
      sku: "BRG-2201",
      units: 412,
      revenue: 1284500,
    },
    {
      name: "Hydraulic Pump HX-40",
      sku: "HYD-4400",
      units: 268,
      revenue: 986200,
    },
    {
      name: "Steel Conveyor Belt 12m",
      sku: "CNV-1200",
      units: 190,
      revenue: 845000,
    },
    {
      name: "Precision Gear Box",
      sku: "GRB-0880",
      units: 174,
      revenue: 712300,
    },
    {
      name: "Motor Controller MC-9",
      sku: "MTC-0900",
      units: 152,
      revenue: 601800,
    },
  ],
  topSalesReps: [
    {
      name: "Ananya Sharma",
      region: "North",
      deals: 62,
      revenue: 1542000,
      target: 1400000,
    },
    {
      name: "Rohit Verma",
      region: "West",
      deals: 55,
      revenue: 1387500,
      target: 1350000,
    },
    {
      name: "Kavya Iyer",
      region: "South",
      deals: 48,
      revenue: 1122000,
      target: 1200000,
    },
    {
      name: "Farhan Khan",
      region: "East",
      deals: 41,
      revenue: 986400,
      target: 950000,
    },
    {
      name: "Priya Nair",
      region: "North",
      deals: 37,
      revenue: 874200,
      target: 900000,
    },
  ],
  recentOrders: [
    {
      id: "SO-8841",
      customer: "Vantage Industries",
      date: "2026-07-14",
      amount: 184200,
      status: "delivered",
    },
    {
      id: "SO-8840",
      customer: "Orion Manufacturing",
      date: "2026-07-14",
      amount: 92500,
      status: "confirmed",
    },
    {
      id: "SO-8839",
      customer: "Kridha Steelworks",
      date: "2026-07-13",
      amount: 341000,
      status: "pending",
    },
    {
      id: "SO-8838",
      customer: "Baltic Engineering",
      date: "2026-07-12",
      amount: 65800,
      status: "delivered",
    },
    {
      id: "SO-8837",
      customer: "Suryodaya Fabricators",
      date: "2026-07-12",
      amount: 128900,
      status: "cancelled",
    },
    {
      id: "SO-8836",
      customer: "Meridian Auto Parts",
      date: "2026-07-11",
      amount: 219400,
      status: "confirmed",
    },
    {
      id: "SO-8835",
      customer: "Zenith Plastics",
      date: "2026-07-10",
      amount: 77300,
      status: "delivered",
    },
  ],
};

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------
export const purchaseReport = {
  kpis: {
    totalSpend: 5218400,
    spendGrowth: 8.7,
    totalPOs: 214,
    poGrowth: 4.2,
    avgLeadTimeDays: 6.4,
    leadTimeGrowth: -9.5,
    onTimeDeliveryRate: 91.3,
    onTimeGrowth: 2.1,
  },
  monthlySpend: [398000, 452000, 411000, 486000, 470000, 521840],
  spendByCategory: [
    { label: "Raw Materials", value: 42, color: "#2970ff" },
    { label: "Components", value: 27, color: "#12b76a" },
    { label: "Packaging", value: 14, color: "#f79009" },
    { label: "Logistics", value: 10, color: "#7a5af8" },
    { label: "Other", value: 7, color: "#98a2b3" },
  ],
  topSuppliers: [
    { name: "Everest Alloys Pvt Ltd", orders: 48, spend: 1284000, onTime: 96 },
    { name: "Bluecrest Components", orders: 39, spend: 1042500, onTime: 92 },
    { name: "Northgate Logistics", orders: 33, spend: 786400, onTime: 88 },
    { name: "Silverline Packaging Co.", orders: 28, spend: 542200, onTime: 94 },
    { name: "Trident Fabrication", orders: 21, spend: 418900, onTime: 85 },
  ],
  pendingPOs: [
    {
      id: "PO-5521",
      supplier: "Everest Alloys Pvt Ltd",
      date: "2026-07-15",
      amount: 218400,
      status: "pending",
    },
    {
      id: "PO-5519",
      supplier: "Bluecrest Components",
      date: "2026-07-14",
      amount: 96200,
      status: "approved",
    },
    {
      id: "PO-5516",
      supplier: "Trident Fabrication",
      date: "2026-07-13",
      amount: 142800,
      status: "pending",
    },
    {
      id: "PO-5512",
      supplier: "Northgate Logistics",
      date: "2026-07-11",
      amount: 68500,
      status: "approved",
    },
    {
      id: "PO-5509",
      supplier: "Silverline Packaging Co.",
      date: "2026-07-09",
      amount: 34200,
      status: "delivered",
    },
  ],
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export const inventoryReport = {
  kpis: {
    totalStockValue: 12480000,
    stockValueGrowth: 5.3,
    skuCount: 1842,
    skuGrowth: 2.8,
    lowStockItems: 37,
    lowStockGrowth: 14.6,
    turnoverRatio: 4.6,
    turnoverGrowth: 0.6,
  },
  stockByWarehouse: [
    { label: "Mumbai DC", value: 4820000, color: "#2970ff" },
    { label: "Delhi DC", value: 3410000, color: "#12b76a" },
    { label: "Bengaluru DC", value: 2650000, color: "#f79009" },
    { label: "Chennai DC", value: 1600000, color: "#7a5af8" },
  ],
  movementTrend: [8400, 9100, 8700, 10200, 9600, 11050],
  lowStock: [
    {
      name: "Hydraulic Pump HX-40",
      sku: "HYD-4400",
      warehouse: "Mumbai DC",
      qty: 8,
      reorderLevel: 25,
    },
    {
      name: "Precision Gear Box",
      sku: "GRB-0880",
      warehouse: "Delhi DC",
      qty: 12,
      reorderLevel: 30,
    },
    {
      name: "Motor Controller MC-9",
      sku: "MTC-0900",
      warehouse: "Bengaluru DC",
      qty: 5,
      reorderLevel: 20,
    },
    {
      name: "Steel Conveyor Belt 12m",
      sku: "CNV-1200",
      warehouse: "Chennai DC",
      qty: 3,
      reorderLevel: 15,
    },
    {
      name: "Industrial Bearing Set",
      sku: "BRG-2201",
      warehouse: "Mumbai DC",
      qty: 14,
      reorderLevel: 40,
    },
  ],
};

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------
export const financeReport = {
  kpis: {
    revenue: 8842500,
    revenueGrowth: 12.4,
    expenses: 5896200,
    expensesGrowth: 7.2,
    netProfit: 2946300,
    netProfitGrowth: 24.6,
    outstandingReceivables: 1284600,
    receivablesGrowth: -6.3,
  },
  revenueVsExpense: {
    revenue: [612000, 705000, 668000, 812000, 774000, 884250],
    expenses: [428000, 462000, 471000, 512000, 498000, 589620],
  },
  expenseBreakdown: [
    { label: "Procurement", value: 46, color: "#2970ff" },
    { label: "Payroll", value: 28, color: "#12b76a" },
    { label: "Logistics", value: 12, color: "#f79009" },
    { label: "Admin & Ops", value: 9, color: "#7a5af8" },
    { label: "Other", value: 5, color: "#98a2b3" },
  ],
  payments: [
    {
      id: "INV-3391",
      party: "Vantage Industries",
      type: "Receivable",
      date: "2026-07-15",
      amount: 184200,
      status: "pending",
    },
    {
      id: "INV-3388",
      party: "Orion Manufacturing",
      type: "Receivable",
      date: "2026-07-13",
      amount: 92500,
      status: "paid",
    },
    {
      id: "PAY-2210",
      party: "Everest Alloys Pvt Ltd",
      type: "Payable",
      date: "2026-07-12",
      amount: 218400,
      status: "paid",
    },
    {
      id: "INV-3384",
      party: "Kridha Steelworks",
      type: "Receivable",
      date: "2026-07-10",
      amount: 341000,
      status: "overdue",
    },
    {
      id: "PAY-2206",
      party: "Bluecrest Components",
      type: "Payable",
      date: "2026-07-08",
      amount: 96200,
      status: "pending",
    },
  ],
};

// ---------------------------------------------------------------------------
// HR / Employee
// ---------------------------------------------------------------------------
export const hrReport = {
  kpis: {
    headcount: 214,
    headcountGrowth: 4.1,
    attendanceRate: 96.2,
    attendanceGrowth: 0.8,
    avgTenureYears: 3.4,
    tenureGrowth: 5.2,
    attritionRate: 5.6,
    attritionGrowth: -1.2,
  },
  headcountByDept: [
    { label: "Sales", value: 62, color: "#2970ff" },
    { label: "Procurement", value: 41, color: "#12b76a" },
    { label: "Operations", value: 48, color: "#f79009" },
    { label: "Finance", value: 24, color: "#7a5af8" },
    { label: "Support/Admin", value: 39, color: "#98a2b3" },
  ],
  attendanceTrend: [95.1, 94.8, 96.3, 95.7, 96.9, 96.2],
  topPerformers: [
    {
      name: "Ananya Sharma",
      dept: "Sales",
      role: "Sr. Sales Executive",
      score: 96,
    },
    { name: "Vikram Rathore", dept: "Operations", role: "Ops Lead", score: 94 },
    { name: "Kavya Iyer", dept: "Sales", role: "Sales Executive", score: 92 },
    {
      name: "Neha Kapoor",
      dept: "Finance",
      role: "Finance Analyst",
      score: 90,
    },
    { name: "Rohit Verma", dept: "Sales", role: "Sales Executive", score: 89 },
  ],
};

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------
export const targetsReport = {
  kpis: {
    overallAchievement: 87.4,
    achievementGrowth: 3.6,
    targetsMet: 18,
    targetsTotal: 24,
    topTeamAchievement: 112.8,
    atRiskTargets: 4,
  },
  achievementTrend: [78, 82, 85, 83, 89, 87],
  byTeam: [
    { team: "North Region", target: 1400000, achieved: 1542000, pct: 110 },
    { team: "West Region", target: 1350000, achieved: 1387500, pct: 103 },
    { team: "South Region", target: 1200000, achieved: 1122000, pct: 94 },
    { team: "East Region", target: 950000, achieved: 986400, pct: 104 },
    { team: "Procurement", target: 5400000, achieved: 5218400, pct: 97 },
  ],
};

// ---------------------------------------------------------------------------
// Cross-module overview (Reports landing page)
// ---------------------------------------------------------------------------
export const overviewReport = {
  kpis: {
    totalRevenue: salesReport.kpis.totalRevenue,
    totalSpend: purchaseReport.kpis.totalSpend,
    netProfit: financeReport.kpis.netProfit,
    stockValue: inventoryReport.kpis.totalStockValue,
  },
  revenueVsSpend: {
    months: REPORT_MONTHS,
    revenue: salesReport.monthlyRevenue,
    spend: purchaseReport.monthlySpend,
  },
  moduleSummaries: [
    {
      key: "sales",
      label: "Sales",
      headline: `₹${(salesReport.kpis.totalRevenue / 100000).toFixed(1)}L revenue`,
      trend: salesReport.kpis.revenueGrowth,
      description: `${salesReport.kpis.totalOrders} orders · ${salesReport.kpis.conversionRate}% conversion`,
    },
    {
      key: "purchase",
      label: "Purchase",
      headline: `₹${(purchaseReport.kpis.totalSpend / 100000).toFixed(1)}L spend`,
      trend: purchaseReport.kpis.spendGrowth,
      description: `${purchaseReport.kpis.totalPOs} POs · ${purchaseReport.kpis.onTimeDeliveryRate}% on-time`,
    },
    {
      key: "inventory",
      label: "Inventory",
      headline: `₹${(inventoryReport.kpis.totalStockValue / 100000).toFixed(1)}L in stock`,
      trend: inventoryReport.kpis.stockValueGrowth,
      description: `${inventoryReport.kpis.skuCount} SKUs · ${inventoryReport.kpis.lowStockItems} low stock`,
    },
    {
      key: "finance",
      label: "Finance",
      headline: `₹${(financeReport.kpis.netProfit / 100000).toFixed(1)}L net profit`,
      trend: financeReport.kpis.netProfitGrowth,
      description: `₹${(financeReport.kpis.outstandingReceivables / 100000).toFixed(1)}L receivable`,
    },
    {
      key: "hr",
      label: "HR",
      headline: `${hrReport.kpis.headcount} employees`,
      trend: hrReport.kpis.headcountGrowth,
      description: `${hrReport.kpis.attendanceRate}% attendance · ${hrReport.kpis.attritionRate}% attrition`,
    },
    {
      key: "targets",
      label: "Targets",
      headline: `${targetsReport.kpis.overallAchievement}% achieved`,
      trend: targetsReport.kpis.achievementGrowth,
      description: `${targetsReport.kpis.targetsMet}/${targetsReport.kpis.targetsTotal} targets met`,
    },
  ],
};
