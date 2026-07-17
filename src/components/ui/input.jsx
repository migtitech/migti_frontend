import React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 file:mr-3 file:h-7 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:text-xs file:font-medium file:text-primary-foreground hover:file:opacity-90",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
