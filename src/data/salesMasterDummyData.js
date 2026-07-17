/**
 * Static dummy/sample data that powers the Sales Manager section UI only.
 *
 * IMPORTANT: This is frontend presentational sample data — it is NOT wired
 * to any API/service and does not read or write real records. Swap this
 * module out for real service calls whenever this section is connected to
 * the backend; nothing else needs to change.
 */

// ---------------------------------------------------------------------------
// Dashboard: pending work / assigned tasks / assigned work
// ---------------------------------------------------------------------------
export const salesMasterDashboard = {
  kpis: {
    pendingWorkCount: 14,
    assignedTaskCount: 9,
    assignedWorkCount: 22,
    monthRevenue: 1542000,
  },
  pendingWork: [
    {
      id: "PW-101",
      title: "Follow up with Vantage Industries on QT-3391",
      priority: "high",
      due: "2026-07-17",
    },
    {
      id: "PW-102",
      title: "Send revised quotation to Orion Manufacturing",
      priority: "high",
      due: "2026-07-17",
    },
    {
      id: "PW-103",
      title: "Confirm delivery date for SO-8841",
      priority: "medium",
      due: "2026-07-18",
    },
    {
      id: "PW-104",
      title: "Collect due payment from Kridha Steelworks",
      priority: "high",
      due: "2026-07-18",
    },
    {
      id: "PW-105",
      title: "Update client contact for Baltic Engineering",
      priority: "low",
      due: "2026-07-20",
    },
    {
      id: "PW-106",
      title: "Review query QR-5521 pricing",
      priority: "medium",
      due: "2026-07-19",
    },
  ],
  assignedTasks: [
    {
      id: "TSK-501",
      title: "Prepare monthly sales review deck",
      assignedBy: "Regional Head",
      status: "in progress",
      due: "2026-07-19",
    },
    {
      id: "TSK-502",
      title: "Visit Suryodaya Fabricators for renewal",
      assignedBy: "Regional Head",
      status: "pending",
      due: "2026-07-21",
    },
    {
      id: "TSK-503",
      title: "Onboard new client Meridian Auto Parts",
      assignedBy: "Admin",
      status: "pending",
      due: "2026-07-22",
    },
    {
      id: "TSK-504",
      title: "Team target review — North zone",
      assignedBy: "Regional Head",
      status: "completed",
      due: "2026-07-15",
    },
  ],
  assignedWork: [
    {
      id: "WRK-901",
      title: "Query QR-5521 — Zenith Plastics",
      type: "Query",
      status: "open",
      due: "2026-07-18",
    },
    {
      id: "WRK-902",
      title: "Quotation QT-3391 — Vantage Industries",
      type: "Quotation",
      status: "sent",
      due: "2026-07-17",
    },
    {
      id: "WRK-903",
      title: "Sales Order SO-8839 — Kridha Steelworks",
      type: "Sales Order",
      status: "pending",
      due: "2026-07-19",
    },
    {
      id: "WRK-904",
      title: "Quotation QT-3387 — Orion Manufacturing",
      type: "Quotation",
      status: "draft",
      due: "2026-07-20",
    },
    {
      id: "WRK-905",
      title: "Query QR-5518 — Baltic Engineering",
      type: "Query",
      status: "closed",
      due: "2026-07-14",
    },
  ],
  monthlyTrend: {
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    revenue: [1120000, 1264000, 1198000, 1387000, 1329000, 1542000],
  },
};

// ---------------------------------------------------------------------------
// Due Payments
// ---------------------------------------------------------------------------
export const duePayments = [
  {
    id: "INV-3391",
    client: "Vantage Industries",
    dueDate: "2026-07-18",
    amount: 184200,
    daysOverdue: 0,
    status: "pending",
  },
  {
    id: "INV-3384",
    client: "Kridha Steelworks",
    dueDate: "2026-07-10",
    amount: 341000,
    daysOverdue: 6,
    status: "overdue",
  },
  {
    id: "INV-3378",
    client: "Suryodaya Fabricators",
    dueDate: "2026-07-05",
    amount: 128900,
    daysOverdue: 11,
    status: "overdue",
  },
  {
    id: "INV-3372",
    client: "Baltic Engineering",
    dueDate: "2026-07-22",
    amount: 65800,
    daysOverdue: 0,
    status: "pending",
  },
  {
    id: "INV-3365",
    client: "Zenith Plastics",
    dueDate: "2026-07-01",
    amount: 77300,
    daysOverdue: 15,
    status: "overdue",
  },
  {
    id: "INV-3360",
    client: "Meridian Auto Parts",
    dueDate: "2026-07-25",
    amount: 219400,
    daysOverdue: 0,
    status: "pending",
  },
];

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export const clients = [
  {
    id: "CL-001",
    name: "Vantage Industries",
    city: "Mumbai",
    contact: "Rakesh Mehta",
    phone: "9820011223",
    orders: 18,
    lifetimeValue: 2842000,
    status: "active",
  },
  {
    id: "CL-002",
    name: "Orion Manufacturing",
    city: "Pune",
    contact: "Sunita Rao",
    phone: "9822033445",
    orders: 12,
    lifetimeValue: 1524000,
    status: "active",
  },
  {
    id: "CL-003",
    name: "Kridha Steelworks",
    city: "Ahmedabad",
    contact: "Manoj Patel",
    phone: "9825044556",
    orders: 9,
    lifetimeValue: 1986000,
    status: "active",
  },
  {
    id: "CL-004",
    name: "Baltic Engineering",
    city: "Indore",
    contact: "Alok Jain",
    phone: "9826055667",
    orders: 6,
    lifetimeValue: 542000,
    status: "inactive",
  },
  {
    id: "CL-005",
    name: "Suryodaya Fabricators",
    city: "Nagpur",
    contact: "Deepak Kulkarni",
    phone: "9827066778",
    orders: 14,
    lifetimeValue: 1128000,
    status: "active",
  },
  {
    id: "CL-006",
    name: "Meridian Auto Parts",
    city: "Indore",
    contact: "Farah Sheikh",
    phone: "9828077889",
    orders: 21,
    lifetimeValue: 3241000,
    status: "active",
  },
  {
    id: "CL-007",
    name: "Zenith Plastics",
    city: "Bhopal",
    contact: "Ritu Verma",
    phone: "9829088990",
    orders: 5,
    lifetimeValue: 386000,
    status: "inactive",
  },
];

// ---------------------------------------------------------------------------
// Product Sales List
// ---------------------------------------------------------------------------
export const productSalesList = [
  {
    name: "Industrial Bearing Set",
    sku: "BRG-2201",
    category: "Bearings",
    unitsSold: 412,
    revenue: 1284500,
    avgRate: 3118,
  },
  {
    name: "Hydraulic Pump HX-40",
    sku: "HYD-4400",
    category: "Hydraulics",
    unitsSold: 268,
    revenue: 986200,
    avgRate: 3680,
  },
  {
    name: "Steel Conveyor Belt 12m",
    sku: "CNV-1200",
    category: "Conveyors",
    unitsSold: 190,
    revenue: 845000,
    avgRate: 4447,
  },
  {
    name: "Precision Gear Box",
    sku: "GRB-0880",
    category: "Gearboxes",
    unitsSold: 174,
    revenue: 712300,
    avgRate: 4094,
  },
  {
    name: "Motor Controller MC-9",
    sku: "MTC-0900",
    category: "Electricals",
    unitsSold: 152,
    revenue: 601800,
    avgRate: 3959,
  },
  {
    name: "Ball Valve 2 inch",
    sku: "VLV-0220",
    category: "Valves",
    unitsSold: 348,
    revenue: 452400,
    avgRate: 1300,
  },
];

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------
export const queries = [
  {
    id: "QR-5521",
    client: "Zenith Plastics",
    product: "Ball Valve 2 inch",
    date: "2026-07-15",
    status: "open",
  },
  {
    id: "QR-5520",
    client: "Vantage Industries",
    product: "Industrial Bearing Set",
    date: "2026-07-14",
    status: "quoted",
  },
  {
    id: "QR-5519",
    client: "Meridian Auto Parts",
    product: "Motor Controller MC-9",
    date: "2026-07-14",
    status: "quoted",
  },
  {
    id: "QR-5518",
    client: "Baltic Engineering",
    product: "Hydraulic Pump HX-40",
    date: "2026-07-13",
    status: "closed",
  },
  {
    id: "QR-5517",
    client: "Orion Manufacturing",
    product: "Precision Gear Box",
    date: "2026-07-12",
    status: "open",
  },
  {
    id: "QR-5516",
    client: "Suryodaya Fabricators",
    product: "Steel Conveyor Belt 12m",
    date: "2026-07-11",
    status: "quoted",
  },
];

export const queryProducts = [
  {
    queryId: "QR-5521",
    product: "Ball Valve 2 inch",
    sku: "VLV-0220",
    qty: 120,
    targetRate: 1250,
    status: "pending",
  },
  {
    queryId: "QR-5520",
    product: "Industrial Bearing Set",
    sku: "BRG-2201",
    qty: 60,
    targetRate: 3000,
    status: "rate submitted",
  },
  {
    queryId: "QR-5519",
    product: "Motor Controller MC-9",
    sku: "MTC-0900",
    qty: 25,
    targetRate: 3900,
    status: "rate submitted",
  },
  {
    queryId: "QR-5518",
    product: "Hydraulic Pump HX-40",
    sku: "HYD-4400",
    qty: 10,
    targetRate: 3650,
    status: "converted",
  },
  {
    queryId: "QR-5517",
    product: "Precision Gear Box",
    sku: "GRB-0880",
    qty: 18,
    targetRate: 4050,
    status: "pending",
  },
];

export const queryFollowups = [
  {
    queryId: "QR-5521",
    client: "Zenith Plastics",
    followupDate: "2026-07-17",
    note: "Awaiting budget confirmation",
    nextAction: "Call client",
    status: "pending",
  },
  {
    queryId: "QR-5520",
    client: "Vantage Industries",
    followupDate: "2026-07-16",
    note: "Rate shared, awaiting approval",
    nextAction: "Send reminder",
    status: "pending",
  },
  {
    queryId: "QR-5519",
    client: "Meridian Auto Parts",
    followupDate: "2026-07-15",
    note: "Client requested revised quantity",
    nextAction: "Revise quote",
    status: "done",
  },
  {
    queryId: "QR-5517",
    client: "Orion Manufacturing",
    followupDate: "2026-07-14",
    note: "Technical spec clarification needed",
    nextAction: "Share datasheet",
    status: "pending",
  },
];

// ---------------------------------------------------------------------------
// Quotation
// ---------------------------------------------------------------------------
export const quotations = [
  {
    id: "QT-3391",
    client: "Vantage Industries",
    date: "2026-07-15",
    amount: 184200,
    status: "sentToClient",
  },
  {
    id: "QT-3388",
    client: "Orion Manufacturing",
    date: "2026-07-13",
    amount: 92500,
    status: "hod_approved",
  },
  {
    id: "QT-3387",
    client: "Meridian Auto Parts",
    date: "2026-07-13",
    amount: 219400,
    status: "draft",
  },
  {
    id: "QT-3384",
    client: "Kridha Steelworks",
    date: "2026-07-10",
    amount: 341000,
    status: "poReceived",
  },
  {
    id: "QT-3378",
    client: "Suryodaya Fabricators",
    date: "2026-07-05",
    amount: 128900,
    status: "followup01",
  },
  {
    id: "QT-3365",
    client: "Zenith Plastics",
    date: "2026-07-01",
    amount: 77300,
    status: "closed",
  },
];

export const quotationProducts = [
  {
    quotationId: "QT-3391",
    product: "Industrial Bearing Set",
    sku: "BRG-2201",
    qty: 60,
    rate: 3070,
    amount: 184200,
  },
  {
    quotationId: "QT-3388",
    product: "Precision Gear Box",
    sku: "GRB-0880",
    qty: 22,
    rate: 4204,
    amount: 92488,
  },
  {
    quotationId: "QT-3387",
    product: "Motor Controller MC-9",
    sku: "MTC-0900",
    qty: 55,
    rate: 3989,
    amount: 219395,
  },
  {
    quotationId: "QT-3384",
    product: "Steel Conveyor Belt 12m",
    sku: "CNV-1200",
    qty: 76,
    rate: 4487,
    amount: 341012,
  },
];

export const quotationFollowups = [
  {
    quotationId: "QT-3391",
    client: "Vantage Industries",
    followupDate: "2026-07-17",
    stage: "Follow-up 1",
    note: "Client reviewing internally",
    status: "pending",
  },
  {
    quotationId: "QT-3378",
    client: "Suryodaya Fabricators",
    followupDate: "2026-07-16",
    stage: "Follow-up 2",
    note: "Price negotiation ongoing",
    status: "pending",
  },
  {
    quotationId: "QT-3388",
    client: "Orion Manufacturing",
    followupDate: "2026-07-14",
    stage: "Follow-up 1",
    note: "Awaiting HOD sign-off",
    status: "done",
  },
];

// ---------------------------------------------------------------------------
// Sales Order — create form product catalog + existing orders / statuses
// ---------------------------------------------------------------------------
export const salesOrderCatalog = [
  { sku: "BRG-2201", name: "Industrial Bearing Set", rate: 3118 },
  { sku: "HYD-4400", name: "Hydraulic Pump HX-40", rate: 3680 },
  { sku: "CNV-1200", name: "Steel Conveyor Belt 12m", rate: 4447 },
  { sku: "GRB-0880", name: "Precision Gear Box", rate: 4094 },
  { sku: "MTC-0900", name: "Motor Controller MC-9", rate: 3959 },
  { sku: "VLV-0220", name: "Ball Valve 2 inch", rate: 1300 },
];

export const salesOrderClients = clients.map((c) => ({
  id: c.id,
  name: c.name,
}));

export const salesOrders = [
  {
    id: "SO-8841",
    client: "Vantage Industries",
    date: "2026-07-14",
    amount: 184200,
    items: 3,
    status: "delivered",
  },
  {
    id: "SO-8840",
    client: "Orion Manufacturing",
    date: "2026-07-14",
    amount: 92500,
    items: 2,
    status: "confirmed",
  },
  {
    id: "SO-8839",
    client: "Kridha Steelworks",
    date: "2026-07-13",
    amount: 341000,
    items: 4,
    status: "pending",
  },
  {
    id: "SO-8838",
    client: "Baltic Engineering",
    date: "2026-07-12",
    amount: 65800,
    items: 1,
    status: "delivered",
  },
  {
    id: "SO-8837",
    client: "Suryodaya Fabricators",
    date: "2026-07-12",
    amount: 128900,
    items: 2,
    status: "cancelled",
  },
  {
    id: "SO-8836",
    client: "Meridian Auto Parts",
    date: "2026-07-11",
    amount: 219400,
    items: 3,
    status: "confirmed",
  },
  {
    id: "SO-8835",
    client: "Zenith Plastics",
    date: "2026-07-10",
    amount: 77300,
    items: 1,
    status: "delivered",
  },
];

// ---------------------------------------------------------------------------
// My Performance Report
// ---------------------------------------------------------------------------
export const myPerformanceReport = {
  kpis: {
    revenue: 1542000,
    revenueGrowth: 8.6,
    target: 1400000,
    achievementPct: 110,
    dealsWon: 21,
    dealsWonGrowth: 5.0,
    conversionRate: 36.4,
    conversionGrowth: 2.1,
  },
  monthlyTrend: {
    months: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    achieved: [1120000, 1264000, 1198000, 1387000, 1329000, 1542000],
    target: [1100000, 1150000, 1200000, 1250000, 1350000, 1400000],
  },
  funnel: [
    { stage: "Queries", value: 86 },
    { stage: "Quotations Sent", value: 58 },
    { stage: "Follow-ups", value: 41 },
    { stage: "Sales Orders Won", value: 21 },
  ],
  recentDeals: [
    {
      id: "SO-8841",
      client: "Vantage Industries",
      amount: 184200,
      closedOn: "2026-07-14",
    },
    {
      id: "SO-8838",
      client: "Baltic Engineering",
      amount: 65800,
      closedOn: "2026-07-12",
    },
    {
      id: "SO-8835",
      client: "Zenith Plastics",
      amount: 77300,
      closedOn: "2026-07-10",
    },
    {
      id: "SO-8830",
      client: "Meridian Auto Parts",
      amount: 148600,
      closedOn: "2026-07-07",
    },
  ],
};
