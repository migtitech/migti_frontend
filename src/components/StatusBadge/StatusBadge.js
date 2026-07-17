import React from "react";
import PropTypes from "prop-types";
import { Badge } from "../ui";

/**
 * Maps an ERP status/state string to a consistent Badge variant so every
 * status pill across the app reads the same. Unknown values fall back to a
 * neutral outline badge. Pass `variant` to override the auto-detected one.
 */
const SUCCESS = [
  "active",
  "approved",
  "completed",
  "complete",
  "paid",
  "delivered",
  "success",
  "done",
  "finalized",
  "confirmed",
  "resolved",
  "closed",
  "verified",
  "accepted",
  "yes",
  "enabled",
];
const WARNING = [
  "pending",
  "in progress",
  "in-progress",
  "inprogress",
  "processing",
  "partial",
  "partially paid",
  "on hold",
  "hold",
  "draft",
  "awaiting",
  "review",
  "requested",
  "open",
];
const DESTRUCTIVE = [
  "inactive",
  "rejected",
  "cancelled",
  "canceled",
  "failed",
  "overdue",
  "expired",
  "unpaid",
  "declined",
  "blocked",
  "error",
  "no",
  "disabled",
  "deleted",
];

const INFO = [
  "sent",
  "submitted",
  "rate submitted",
  "fulfilled",
  "dispatched",
  "shipped",
  "in transit",
  "assigned",
  "new",
  "info",
];

const detectVariant = (status) => {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!key) return "secondary";
  if (SUCCESS.includes(key)) return "success";
  if (WARNING.includes(key)) return "warning";
  if (DESTRUCTIVE.includes(key)) return "destructive";
  if (INFO.includes(key)) return "info";
  return "secondary";
};

const StatusBadge = ({ status, variant, className, children }) => (
  <Badge variant={variant || detectVariant(status)} className={className}>
    {children ?? status}
  </Badge>
);

StatusBadge.propTypes = {
  status: PropTypes.node,
  variant: PropTypes.oneOf([
    "default",
    "secondary",
    "success",
    "warning",
    "destructive",
    "info",
    "outline",
  ]),
  className: PropTypes.string,
  children: PropTypes.node,
};

export { detectVariant };
export default StatusBadge;
