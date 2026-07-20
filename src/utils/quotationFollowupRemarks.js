/**
 * Standard remark options + status classification for quotation follow-ups.
 *
 * The backend stores a follow-up as a plain remark string (no status field),
 * so the workflow status (Lost / Revise / On Hold / Won / Active) is derived
 * on the frontend from the remark text. Lost rows feed the Lost Quotations
 * page; revise / hold rows surface with their status badge on the follow-up
 * dashboards.
 */

export const QUOTATION_REMARK_GROUPS = [
  {
    label: "In Progress",
    options: [
      "Called – no response",
      "Called – client asked to call back later",
      "Quotation under review by client",
      "Negotiation in progress",
      "Awaiting client decision",
    ],
  },
  {
    label: "Won",
    options: ["Order confirmed – PO awaited", "PO received from client"],
  },
  {
    label: "Revision Needed",
    options: [
      "Revision requested – prices to be updated",
      "Revise quotation with updated specifications",
      "Requote requested – quantity changed",
    ],
  },
  {
    label: "On Hold",
    options: [
      "On hold – client asked to wait",
      "Decision postponed – follow up later",
      "Budget on hold – revisit next quarter",
      "Project delayed by client",
    ],
  },
  {
    label: "Lost",
    options: [
      "Quotation lost – order given to competitor",
      "Quotation lost – price too high",
      "Quotation lost – requirement cancelled",
      "Client not interested – closed",
    ],
  },
];

export const QUOTATION_REMARK_OPTIONS = QUOTATION_REMARK_GROUPS.flatMap(
  (g) => g.options,
);

export const FOLLOWUP_STATUS_META = {
  lost: { label: "Lost Quotation", badgeVariant: "destructive" },
  revise: { label: "Revise", badgeVariant: "info" },
  hold: { label: "On Hold", badgeVariant: "warning" },
  won: { label: "Won", badgeVariant: "success" },
  active: { label: "Active", badgeVariant: "secondary" },
};

const LOST_PATTERNS = [
  /\blost\b/,
  /not\s+interested/,
  /\bcancelled\b/,
  /\bcanceled\b/,
  /\bcompetitor\b/,
  /\brejected\b/,
  /\bdropped\b/,
  /order\s+given\s+to/,
  /price\s+too\s+high/,
  /deal\s+closed\s+elsewhere/,
];

const REVISE_PATTERNS = [
  /\brevis/, // revise, revised, revision
  /\brequote\b/,
  /\bre-?quote\b/,
  /\brework\b/,
  /updated?\s+(price|rate|spec)/,
  /price\s+revision/,
];

const HOLD_PATTERNS = [
  /\bhold\b/,
  /\bwait\b/,
  /\bpostpon/,
  /\bdelayed\b/,
  /\bdefer/,
  /next\s+(quarter|month|year)/,
  /budget\s+(freeze|hold|issue)/,
  /follow\s*-?\s*up\s+later/,
];

const WON_PATTERNS = [
  /order\s+confirmed/,
  /po\s+received/,
  /\bwon\b/,
  /deal\s+closed\s+with\s+us/,
];

/**
 * Classify a remark string into a follow-up status key.
 * @returns {"lost"|"revise"|"hold"|"won"|"active"}
 */
export const classifyFollowupRemark = (remark) => {
  const text = String(remark || "").toLowerCase();
  if (!text.trim()) return "active";
  if (LOST_PATTERNS.some((re) => re.test(text))) return "lost";
  if (REVISE_PATTERNS.some((re) => re.test(text))) return "revise";
  if (HOLD_PATTERNS.some((re) => re.test(text))) return "hold";
  if (WON_PATTERNS.some((re) => re.test(text))) return "won";
  return "active";
};

/** Latest remark of a quotation follow-up row (history first, then row.remark). */
export const getLatestFollowupRemark = (row) => {
  const history = Array.isArray(row?.followupHistory)
    ? [...row.followupHistory]
    : [];
  if (history.length) {
    history.sort(
      (a, b) =>
        new Date(b.followedUpAt || 0) - new Date(a.followedUpAt || 0) ||
        (b.sequence || 0) - (a.sequence || 0),
    );
    return history[0]?.remark || row?.remark || "";
  }
  return row?.remark || "";
};

/** Derived status meta ({key, label, badgeVariant}) for a follow-up row. */
export const getFollowupRowStatus = (row) => {
  const key = classifyFollowupRemark(getLatestFollowupRemark(row));
  return { key, ...FOLLOWUP_STATUS_META[key] };
};
