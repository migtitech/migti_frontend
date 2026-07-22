import React from "react";
import { cn } from "../../lib/utils";

// Native date/time inputs render a calendar/clock picker indicator on the right.
// Give those types a touch more right padding and tidy the indicator so it sits
// cleanly inside the rounded border instead of hugging/overflowing it.
const DATE_LIKE_TYPES = new Set([
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
]);

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 file:mr-3 file:h-7 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:text-xs file:font-medium file:text-primary-foreground hover:file:opacity-90",
      DATE_LIKE_TYPES.has(type) &&
        "pr-2.5 [&::-webkit-calendar-picker-indicator]:ml-1 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:rounded [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:transition-opacity hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-inner-spin-button]:appearance-none",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
