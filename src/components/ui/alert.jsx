import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-border bg-muted text-foreground [&>svg]:text-muted-foreground",
        info: "border-primary/20 bg-accent text-accent-foreground [&>svg]:text-primary",
        success:
          "border-success/20 bg-success-muted text-success! [&>svg]:text-success",
        warning:
          "border-warning/30 bg-warning-muted text-warning! [&>svg]:text-warning",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-0.5 font-semibold leading-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
