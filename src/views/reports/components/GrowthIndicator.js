import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "../../../lib/utils";

/**
 * Small +/- percentage chip used next to KPI values to show period-over-
 * period movement (e.g. "+12.4% vs last month"). Presentational only.
 */
const GrowthIndicator = ({ value, suffix = "vs last month", className }) => {
  const positive = Number(value) >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        positive ? "text-success!" : "text-destructive",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {positive ? "+" : ""}
      {value}%
      {suffix ? (
        <span className="ml-1 font-normal text-muted-foreground">{suffix}</span>
      ) : null}
    </span>
  );
};

export default GrowthIndicator;
