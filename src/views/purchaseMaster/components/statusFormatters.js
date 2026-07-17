/** Presentational status-code → Badge variant map for the Purchase Manager section. */
const VARIANT_MAP = {
  open: "warning",
  "in progress": "info",
  purchased: "success",
  pending: "warning",
  confirmed: "info",
  sent: "info",
  draft: "secondary",
  verified: "success",
  rejected: "destructive",
  overdue: "destructive",
  complete: "success",
  "short received": "warning",
  resolved: "success",
  active: "success",
  inactive: "secondary",
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export const statusVariant = (s) =>
  VARIANT_MAP[String(s || "").trim()] || "secondary";
