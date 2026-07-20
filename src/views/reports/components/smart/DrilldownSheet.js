import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from "../../../../components/ui";

/**
 * Generic right-hand drill-down panel for the smart Reports section. Pages
 * pass an active record + a render function; clicking a KPI / chart segment
 * / table row opens a focused breakdown without leaving the report.
 */
const DrilldownSheet = ({
  open,
  onOpenChange,
  title,
  description,
  children,
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-[460px]">
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        {description && <SheetDescription>{description}</SheetDescription>}
      </SheetHeader>
      <SheetBody className="space-y-4">{children}</SheetBody>
    </SheetContent>
  </Sheet>
);

/** Simple label/value row helper used inside drill-downs. */
export const DrillRow = ({ label, value, strong }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span
      className={
        strong
          ? "text-sm font-semibold text-foreground"
          : "text-sm text-foreground"
      }
    >
      {value}
    </span>
  </div>
);

export default DrilldownSheet;
