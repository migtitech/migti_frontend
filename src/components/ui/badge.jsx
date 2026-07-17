import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary! text-primary-foreground",
        secondary: "border-transparent bg-secondary! text-secondary-foreground",
        success: "border-transparent bg-success-muted text-success!",
        warning: "border-transparent bg-warning-muted text-warning!",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        info: "border-transparent bg-accent text-accent-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Badge = ({ className, variant, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
