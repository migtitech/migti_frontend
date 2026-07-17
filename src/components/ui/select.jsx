import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Styled native <select>. A drop-in, dependency-free replacement for
 * CoreUI's CFormSelect — same value/onChange/children API, so existing
 * form logic keeps working unchanged. Renders the design-system chrome
 * (border, focus ring, chevron) around the browser control.
 */
const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <div className="relative w-full">
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 py-1 pr-9 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  </div>
));
Select.displayName = "Select";

export { Select };
