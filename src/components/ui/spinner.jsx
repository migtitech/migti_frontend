import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const sizes = { sm: "h-4 w-4", default: "h-5 w-5", lg: "h-8 w-8" };

/** Inline loading spinner. Replaces CoreUI CSpinner for buttons and panels. */
const Spinner = ({ size = "default", className, ...props }) => (
  <Loader2
    className={cn(
      "animate-spin text-current",
      sizes[size] || sizes.default,
      className,
    )}
    aria-label="Loading"
    {...props}
  />
);

export { Spinner };
