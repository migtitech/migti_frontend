/** Presentational status-code → Badge variant map for the Procurement Master section. */
const VARIANT_MAP = {
  query: "secondary",
  hod_rate_pending: "warning",
  verification: "info",
  rate_submitted: "success",
  fulfilled: "success",
  open: "warning",
  pending: "warning",
  active: "success",
  inactive: "secondary",
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export const statusVariant = (s) =>
  VARIANT_MAP[String(s || "").trim()] || "secondary";

const STAGE_LABELS = {
  query: "Query",
  hod_rate_pending: "Sent for HOD Rate",
  verification: "Sent for Verification",
  fulfilled: "Fulfilled",
};

export const stageLabel = (s) => STAGE_LABELS[String(s || "").trim()] || s;
