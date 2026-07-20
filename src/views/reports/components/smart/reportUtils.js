/**
 * Pure, dependency-free helpers shared by the smart Reports pages:
 * period scaling for interactive filters, insight generation, formatting
 * and CSV export. Everything here operates on the frontend sample data —
 * it never calls a backend.
 */

export const PERIODS = [
  { value: "this_week", label: "This Week", scale: 0.25 },
  { value: "this_month", label: "This Month", scale: 1 },
  { value: "this_quarter", label: "This Quarter", scale: 3 },
  { value: "ytd", label: "Year to Date", scale: 7 },
];

/** Deterministic 0..1 pseudo-noise from a string+index so scaled numbers
 *  look organic but stay stable across renders (no Math.random flicker). */
const jitter = (seed, i) => {
  let h = 2166136261 ^ i;
  for (let k = 0; k < seed.length; k++) {
    h = Math.imul(h ^ seed.charCodeAt(k), 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
};

export const periodScale = (period) =>
  PERIODS.find((p) => p.value === period)?.scale ?? 1;

/** Scale a KPI-ish number by the selected period, with light organic noise. */
export const scaleValue = (value, period, seed = "kpi") => {
  const s = periodScale(period);
  const n = Number(value) || 0;
  const wobble = 0.94 + jitter(seed, Math.round(n)) * 0.12;
  return Math.round(n * s * wobble);
};

/** Scale a whole series (for charts) by period. */
export const scaleSeries = (series, period, seed = "series") =>
  (series || []).map((v, i) =>
    Math.round(
      (Number(v) || 0) * periodScale(period) * (0.92 + jitter(seed, i) * 0.16),
    ),
  );

/** Previous-period value used for the delta chips when comparison is on. */
export const prevValue = (value, deltaPct) => {
  const n = Number(value) || 0;
  const d = Number(deltaPct) || 0;
  return Math.round(n / (1 + d / 100));
};

/* ----------------------------- formatting ----------------------------- */
export const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const formatINRCompact = (value) => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
};

export const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN");

/* ------------------------------ insights ------------------------------ */
/**
 * Build an "Insights" list from a small declarative spec so every report
 * gets consistent auto-callouts. Each rule returns { tone, icon, text } or
 * null. tone ∈ positive | warning | negative | neutral.
 */
export const buildInsights = (rules = []) => rules.filter(Boolean).slice(0, 6);

export const trendInsight = (label, series, unit = "") => {
  if (!series || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  if (!first) return null;
  const pct = Math.round(((last - first) / Math.abs(first)) * 100);
  const up = pct >= 0;
  return {
    tone: up ? "positive" : "negative",
    text: `${label} ${up ? "grew" : "fell"} ${Math.abs(pct)}% over the period${unit ? ` (now ${unit})` : ""}.`,
  };
};

export const bestOf = (rows, keyLabel, keyValue, format = (v) => v) => {
  if (!rows || rows.length === 0) return null;
  const best = [...rows].sort((a, b) => keyValue(b) - keyValue(a))[0];
  return {
    tone: "positive",
    text: `${keyLabel(best)} leads with ${format(keyValue(best))}.`,
  };
};

export const worstOf = (rows, keyLabel, keyValue, format = (v) => v) => {
  if (!rows || rows.length === 0) return null;
  const worst = [...rows].sort((a, b) => keyValue(a) - keyValue(b))[0];
  return {
    tone: "warning",
    text: `${keyLabel(worst)} is lowest at ${format(keyValue(worst))} — worth a look.`,
  };
};

/* ------------------------------- export ------------------------------- */
/** Minimal CSV export (no xlsx dependency) — safe & offline. */
export const exportRowsToCsv = (filename, columns, rows) => {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = (rows || [])
    .map((r) => columns.map((c) => esc(c.value(r))).join(","))
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
