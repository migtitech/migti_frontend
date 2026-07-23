/**
 * Central UI color tokens. Use these instead of hardcoded hex values or
 * ad-hoc Bootstrap utility classes for branded status and accent colors.
 */
export const COLOR_THEME = {
  status: {
    active: "#027a48",
    inactive: "#667085",
  },
};

const STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  pending_hod_approval: "Pending Approval",
  rejected: "Rejected",
  draft: "Draft",
};

export const getStatusLabel = (status) =>
  STATUS_LABELS[status] || (status === "active" ? "Active" : "Inactive");

export const getStatusColor = (status) =>
  status === "active" ? COLOR_THEME.status.active : COLOR_THEME.status.inactive;

export const isActiveStatus = (status) => status === "active";
