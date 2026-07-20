import React from "react";
import PropTypes from "prop-types";
import { Switch } from "../ui";
import StatusBadge from "../StatusBadge/StatusBadge";
import { getStatusLabel } from "../../constants/colorTheme";
import { cn } from "../../lib/utils";

const toActive = (status, checked) => {
  if (typeof checked === "boolean") return checked;
  if (typeof status === "boolean") return status;
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  return key === "active";
};

/**
 * Shared Active / Inactive status control.
 * Circular toggle follows the standard shadcn Switch (Tailwind + cn).
 * Pass either `status` ("active" | "inactive") or boolean `checked`.
 */
const StatusToggle = React.forwardRef(
  (
    {
      status,
      checked,
      onCheckedChange,
      disabled = false,
      showLabel = true,
      id,
      className,
      switchClassName,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const isActive = toActive(status, checked);
    const labelStatus = isActive ? "active" : "inactive";

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Switch
          ref={ref}
          id={id}
          checked={isActive}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={ariaLabel}
          className={switchClassName}
          {...props}
        />
        {showLabel ? (
          <StatusBadge status={labelStatus}>
            {getStatusLabel(labelStatus)}
          </StatusBadge>
        ) : null}
      </div>
    );
  },
);

StatusToggle.displayName = "StatusToggle";

StatusToggle.propTypes = {
  status: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  checked: PropTypes.bool,
  onCheckedChange: PropTypes.func,
  disabled: PropTypes.bool,
  showLabel: PropTypes.bool,
  id: PropTypes.string,
  className: PropTypes.string,
  switchClassName: PropTypes.string,
  "aria-label": PropTypes.string,
};

export default StatusToggle;
