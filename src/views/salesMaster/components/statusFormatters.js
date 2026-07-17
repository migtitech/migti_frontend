/** Presentational status-code → label maps, mirrors dashboard/SalesDashboard.js. */
export const formatQueryStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  const map = {
    open: "Open",
    quoted: "Quoted",
    closed: "Closed",
    drafted: "Draft",
    convertedToQuotation: "Converted",
  };
  return map[v] || v;
};

export const formatQuotationStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  const map = {
    draft: "Draft",
    partial: "Partial",
    fulfilled: "Fulfilled",
    ready: "Ready",
    hod_approved: "Approved",
    sentToClient: "Sent to client",
    poReceived: "Sales Order received",
    followup01: "Follow-up 1",
    followup02: "Follow-up 2",
    closed: "Closed",
  };
  return map[v] || v;
};

export const formatOrderStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  const map = {
    draft: "Draft",
    pending: "Pending",
    confirmed: "Confirmed",
    fulfilled: "Fulfilled",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[v] || v;
};

/** Explicit status-code → Badge variant map (used instead of StatusBadge's auto-detect for codes it doesn't recognize, e.g. "hod_approved", "sentToClient"). */
const VARIANT_MAP = {
  open: "warning",
  quoted: "info",
  closed: "success",
  drafted: "warning",
  convertedToQuotation: "success",
  draft: "warning",
  partial: "warning",
  fulfilled: "success",
  ready: "info",
  hod_approved: "success",
  sentToClient: "info",
  poReceived: "success",
  followup01: "warning",
  followup02: "warning",
  pending: "warning",
  confirmed: "info",
  delivered: "success",
  cancelled: "destructive",
  done: "success",
  active: "success",
  inactive: "secondary",
  overdue: "destructive",
  "rate submitted": "info",
  converted: "success",
  high: "destructive",
  medium: "warning",
  low: "secondary",
  completed: "success",
  "in progress": "info",
};

export const statusVariant = (s) =>
  VARIANT_MAP[String(s || "").trim()] || "secondary";
