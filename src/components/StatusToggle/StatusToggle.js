import React from "react";
import PropTypes from "prop-types";
import * as SwitchPrimitive from "@radix-ui/react-switch";
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
        <SwitchPrimitive.Root
          ref={ref}
          id={id}
          checked={isActive}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={ariaLabel}
          className={cn(
            "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-[9999px] border border-transparent shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input data-[state=unchecked]:border-border",
            switchClassName,
          )}
          {...props}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              "pointer-events-none block size-5 rounded-[9999px] bg-background shadow-md ring-0 transition-transform",
              "data-[state=checked]:translate-x-[1.25rem] data-[state=unchecked]:translate-x-0.5",
            )}
          />
        </SwitchPrimitive.Root>
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
