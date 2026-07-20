/**
 * Static dummy/sample data for the "New Follow-up" popup on the Quotation
 * Follow-up dashboard.
 *
 * IMPORTANT: Frontend presentational sample data only — NOT wired to any
 * API/service. It lets a sales employee pick a quotation, see its last few
 * follow-ups, and log a new decision-driven follow-up for UI preview. Swap
 * for real service calls when this flow is connected to the backend.
 */

/**
 * Decision presets. Each decision maps the quotation to a status and offers a
 * short curated set of professional remark suggestions. "other" lets the user
 * type free text. Attachment + next follow-up date apply to every decision.
 */
export const FOLLOWUP_DECISIONS = [
  {
    key: "lost",
    label: "Quotation Lost",
    status: "lost",
    statusLabel: "Lost",
    badgeVariant: "destructive",
    hint: "Deal is closed — quotation will be marked Lost.",
    presets: [
      "Lost — client's price expectation lower than our best rate.",
      "Lost — order awarded to a competing vendor.",
      "Lost — customer's budget not approved this cycle.",
      "Lost — requirement cancelled / project dropped by client.",
      "Lost — delivery timeline did not meet client's schedule.",
    ],
  },
  {
    key: "hold",
    label: "Hold",
    status: "hold",
    statusLabel: "On Hold",
    badgeVariant: "warning",
    hint: "Quotation paused — will be marked On Hold.",
    presets: [
      "On hold — client asked to revisit next quarter.",
      "On hold — awaiting client's internal approval.",
      "On hold — project temporarily postponed by customer.",
      "On hold — pending site readiness at client's end.",
    ],
  },
  {
    key: "revise",
    label: "Revise",
    status: "revise",
    statusLabel: "Revision Requested",
    badgeVariant: "info",
    hint: "Client wants changes — quotation will move to Revise.",
    presets: [
      "Revise — client requested updated pricing.",
      "Revise — specification change, quantity revised.",
      "Revise — client wants updated delivery & payment terms.",
      "Revise — add/remove line items per client feedback.",
    ],
  },
  {
    key: "wait",
    label: "Wait",
    status: "wait",
    statusLabel: "Awaiting Response",
    badgeVariant: "secondary",
    hint: "No decision yet — quotation stays in Wait / follow up again.",
    presets: [
      "Waiting — client reviewing the quotation internally.",
      "Waiting — decision expected after client's internal meeting.",
      "Waiting — client to confirm after management approval.",
      "Waiting — follow up again on the next scheduled date.",
    ],
  },
  {
    key: "other",
    label: "Other",
    status: "wait",
    statusLabel: "Awaiting Response",
    badgeVariant: "secondary",
    hint: "Type your own remark — status stays as Awaiting Response.",
    presets: [],
  },
];

export const getDecision = (key) =>
  FOLLOWUP_DECISIONS.find((d) => d.key === key) || null;

/**
 * Sample quotations carrying a follow-up outcome status (lost / hold / revise /
 * wait) — powers the Lost Quotations page. `statusKey` matches a decision key
 * above so labels & badge colors stay consistent with the New Follow-up popup.
 */
export const lostQuotationSample = [
  {
    id: "LQ-1",
    quotationCode: "QT-3391",
    company: "Vantage Industries",
    salesPerson: "Rakesh Kicholiya",
    zone: "Indore",
    amount: 184200,
    statusKey: "lost",
    followupCount: 3,
    quotedOn: "2026-06-28",
    lastFollowup: "2026-07-14",
    reason: "Order awarded to a competing vendor at a lower rate.",
  },
  {
    id: "LQ-2",
    quotationCode: "QT-3402",
    company: "Baltic Engineering",
    salesPerson: "Sunil Verma",
    zone: "Pune",
    amount: 96500,
    statusKey: "lost",
    followupCount: 4,
    quotedOn: "2026-06-20",
    lastFollowup: "2026-07-12",
    reason: "Client's budget not approved this cycle.",
  },
  {
    id: "LQ-3",
    quotationCode: "QT-3378",
    company: "Suryodaya Fabricators",
    salesPerson: "Kavita Rao",
    zone: "Mumbai",
    amount: 128900,
    statusKey: "hold",
    followupCount: 4,
    quotedOn: "2026-06-30",
    lastFollowup: "2026-07-15",
    reason: "Client asked to revisit next quarter.",
  },
  {
    id: "LQ-4",
    quotationCode: "QT-3388",
    company: "Orion Manufacturing",
    salesPerson: "Sunil Verma",
    zone: "Delhi NCR",
    amount: 92500,
    statusKey: "revise",
    followupCount: 2,
    quotedOn: "2026-07-02",
    lastFollowup: "2026-07-12",
    reason: "Client requested updated pricing and delivery terms.",
  },
  {
    id: "LQ-5",
    quotationCode: "QT-3410",
    company: "Meridian Auto Parts",
    salesPerson: "Anita Desai",
    zone: "Bengaluru",
    amount: 219400,
    statusKey: "wait",
    followupCount: 1,
    quotedOn: "2026-07-08",
    lastFollowup: "2026-07-13",
    reason: "Client reviewing the quotation internally.",
  },
  {
    id: "LQ-6",
    quotationCode: "QT-3365",
    company: "Zenith Plastics",
    salesPerson: "Rakesh Kicholiya",
    zone: "Indore",
    amount: 77300,
    statusKey: "lost",
    followupCount: 5,
    quotedOn: "2026-06-12",
    lastFollowup: "2026-07-05",
    reason: "Requirement cancelled — project dropped by client.",
  },
  {
    id: "LQ-7",
    quotationCode: "QT-3421",
    company: "Kridha Steelworks",
    salesPerson: "Anita Desai",
    zone: "Bengaluru",
    amount: 341000,
    statusKey: "hold",
    followupCount: 2,
    quotedOn: "2026-07-04",
    lastFollowup: "2026-07-14",
    reason: "Pending site readiness at client's end.",
  },
  {
    id: "LQ-8",
    quotationCode: "QT-3399",
    company: "Nova Precision Tools",
    salesPerson: "Kavita Rao",
    zone: "Mumbai",
    amount: 154600,
    statusKey: "revise",
    followupCount: 3,
    quotedOn: "2026-06-25",
    lastFollowup: "2026-07-11",
    reason: "Specification change — quantity revised.",
  },
  {
    id: "LQ-9",
    quotationCode: "QT-3415",
    company: "Apex Hydraulics",
    salesPerson: "Sunil Verma",
    zone: "Pune",
    amount: 63800,
    statusKey: "wait",
    followupCount: 2,
    quotedOn: "2026-07-06",
    lastFollowup: "2026-07-13",
    reason: "Decision expected after client's internal meeting.",
  },
];

/** Sample quotations selectable in the New Follow-up popup, with prior follow-ups. */
export const sampleQuotationsForFollowup = [
  {
    id: "qf-1",
    quotationCode: "QT-3391",
    company: "Vantage Industries",
    amount: 184200,
    status: "sentToClient",
    previousFollowups: [
      {
        sequence: 3,
        date: "2026-07-14",
        by: "Rakesh Kicholiya",
        decision: "wait",
        remark: "Waiting — client reviewing the quotation internally.",
      },
      {
        sequence: 2,
        date: "2026-07-09",
        by: "Rakesh Kicholiya",
        decision: "wait",
        remark: "Shared revised delivery schedule, client to confirm.",
      },
      {
        sequence: 1,
        date: "2026-07-04",
        by: "Rakesh Kicholiya",
        decision: "wait",
        remark: "Initial follow-up call done, quotation acknowledged.",
      },
    ],
  },
  {
    id: "qf-2",
    quotationCode: "QT-3388",
    company: "Orion Manufacturing",
    amount: 92500,
    status: "hod_approved",
    previousFollowups: [
      {
        sequence: 2,
        date: "2026-07-12",
        by: "Sunil Verma",
        decision: "revise",
        remark: "Revise — client requested updated pricing.",
      },
      {
        sequence: 1,
        date: "2026-07-08",
        by: "Sunil Verma",
        decision: "wait",
        remark: "Client comparing with another vendor.",
      },
    ],
  },
  {
    id: "qf-3",
    quotationCode: "QT-3384",
    company: "Kridha Steelworks",
    amount: 341000,
    status: "poReceived",
    previousFollowups: [
      {
        sequence: 1,
        date: "2026-07-11",
        by: "Anita Desai",
        decision: "wait",
        remark: "PO expected shortly, awaiting paperwork.",
      },
    ],
  },
  {
    id: "qf-4",
    quotationCode: "QT-3378",
    company: "Suryodaya Fabricators",
    amount: 128900,
    status: "followup01",
    previousFollowups: [
      {
        sequence: 4,
        date: "2026-07-15",
        by: "Kavita Rao",
        decision: "hold",
        remark: "On hold — client asked to revisit next quarter.",
      },
      {
        sequence: 3,
        date: "2026-07-10",
        by: "Kavita Rao",
        decision: "wait",
        remark: "Client budget review in progress.",
      },
      {
        sequence: 2,
        date: "2026-07-06",
        by: "Kavita Rao",
        decision: "wait",
        remark: "Sent product catalogue on request.",
      },
      {
        sequence: 1,
        date: "2026-07-02",
        by: "Kavita Rao",
        decision: "wait",
        remark: "First follow-up, quotation received by client.",
      },
    ],
  },
  {
    id: "qf-5",
    quotationCode: "QT-3387",
    company: "Meridian Auto Parts",
    amount: 219400,
    status: "draft",
    previousFollowups: [],
  },
];
