import React from "react";
import { Loader2 } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        default: "bg-primary! text-primary-foreground hover:bg-primary-hover!",
        secondary: "bg-secondary! text-secondary-foreground hover:bg-border!",
        outline:
          "border border-input bg-transparent hover:bg-muted! text-foreground",
        ghost: "hover:bg-muted! text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        success: "bg-success! text-success-foreground hover:opacity-90",
        warning: "bg-warning! text-warning-foreground hover:opacity-90",
        link: "text-primary! underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      onClick,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    // Double-submission guard: while an async onClick is in flight the button
    // is disabled and shows a spinner, so a second click can't fire the action.
    const [busy, setBusy] = React.useState(false);
    const mountedRef = React.useRef(true);
    React.useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={onClick}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    const handleClick = onClick
      ? (event) => {
          if (busy) {
            event.preventDefault();
            return;
          }
          const result = onClick(event);
          if (result && typeof result.then === "function") {
            setBusy(true);
            Promise.resolve(result)
              .catch(() => {})
              .finally(() => {
                if (mountedRef.current) setBusy(false);
              });
          }
        }
      : undefined;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        disabled={disabled || busy}
        {...props}
      >
        {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
