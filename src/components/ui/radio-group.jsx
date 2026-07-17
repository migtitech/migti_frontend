import React, { createContext, useContext } from "react";
import { cn } from "../../lib/utils";

/**
 * Lightweight, dependency-free radio group. API mirrors common usage:
 * <RadioGroup value onValueChange><RadioGroupItem value id/></RadioGroup>.
 */
const RadioGroupContext = createContext({
  value: undefined,
  onValueChange: undefined,
  name: undefined,
});

const RadioGroup = React.forwardRef(
  ({ className, value, onValueChange, name, children, ...props }, ref) => (
    <RadioGroupContext.Provider value={{ value, onValueChange, name }}>
      <div
        ref={ref}
        role="radiogroup"
        className={cn("grid gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  ),
);
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef(
  ({ className, value, ...props }, ref) => {
    const ctx = useContext(RadioGroupContext);
    return (
      <input
        ref={ref}
        type="radio"
        name={ctx.name}
        value={value}
        checked={ctx.value === value}
        onChange={() => ctx.onValueChange?.(value)}
        className={cn(
          "h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-background transition-colors checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--color-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
