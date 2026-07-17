import React from "react";
import { cn } from "../../lib/utils";

const colorMap = {
  primary: "bg-primary!",
  success: "bg-success!",
  warning: "bg-warning!",
  destructive: "bg-destructive",
  info: "bg-primary!",
};

/** Determinate progress bar. Replaces CoreUI CProgress. */
const Progress = React.forwardRef(
  (
    { value = 0, color = "primary", className, barClassName, ...props },
    ref,
  ) => {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    return (
      <div
        ref={ref}
        className={cn(
          "h-2 w-full overflow-hidden rounded-full bg-secondary!",
          className,
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            colorMap[color] || colorMap.primary,
            barClassName,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
