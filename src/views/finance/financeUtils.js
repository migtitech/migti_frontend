// Shared helpers for the Finance role pages (views/finance/*).
// Keeps amount formatting and API response unwrapping consistent across the
// dedicated finance dashboard and its sub-pages.

/** Format a number as Indian Rupees, no decimals (e.g. ₹1,20,000). */
export const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** Compact INR for big KPI numbers (e.g. ₹1.2L, ₹3.4Cr). */
export const formatAmountCompact = (value) => {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return formatAmount(n);
};

/** Unwrap the `{ success, message, data }` envelope the API returns. */
export const unwrap = (res) => {
  const payload = res?.data && typeof res.data === "object" ? res.data : res;
  return payload?.data && typeof payload.data === "object"
    ? payload.data
    : payload || {};
};

const PAYMENT_TOLERANCE = 0.01;

/**
 * Outstanding (client-receivable) amount for a sales order. Prefers the
 * server's `remainingAmount`; falls back to grandTotal − totalPaid.
 */
export const orderRemaining = (order) => {
  const fin = order?.financials || {};
  const remaining = Number(fin.remainingAmount);
  if (!Number.isNaN(remaining)) return Math.max(remaining, 0);
  const total = Number(fin.grandTotal) || 0;
  const paid = Number(fin.totalPaid) || 0;
  return Math.max(total - paid, 0);
};

/** True when a sales order still owes money (used to filter receivables). */
export const orderHasDue = (order) => {
  if (String(order?.paymentReceivedStatus || "") === "full_payment_received") {
    return false;
  }
  return orderRemaining(order) > PAYMENT_TOLERANCE;
};

/** Days a date is overdue relative to now (negative = not yet due). */
export const daysOverdue = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
};

export const isOverdue = (dateStr) => {
  const d = daysOverdue(dateStr);
  return d != null && d > 0;
};
