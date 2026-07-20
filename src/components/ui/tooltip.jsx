import React, { useState } from "react";
import { cn } from "../../lib/utils";

/**
 * Minimal, dependency-free hover/focus tooltip. Wrap a trigger and pass
 * `content`. Used where CoreUI CTooltip / title attributes were before.
 */
const Tooltip = ({ content, side = "top", className, children, ...props }) => {
  const [open, setOpen] = useState(false);
  const sideClass = {
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
    left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
    right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      {...props}
    >
      {children}
      {open && content && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-[1060] whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md",
            sideClass,
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
};

export { Tooltip };
