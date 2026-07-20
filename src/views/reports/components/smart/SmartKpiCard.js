import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui";
import { cn } from "../../../../lib/utils";
import Sparkline from "./Sparkline";

/**
 * Elevated KPI tile for the smart Reports section.
 *
 * Props:
 * - title, value, icon (lucide), color (semantic accent)
 * - delta: signed number (period-over-period %). Renders coloured chip.
 * - deltaSuffix: text after the % (default "vs prev")
 * - invertDelta: when true a *negative* delta is "good" (e.g. lead time, attrition)
 * - spark: numeric series for the mini sparkline
 * - onClick: makes the whole tile an accessible button (drill-down)
 * - footnote: small muted line under the value
 */
const ACCENT = {
  primary: {
    chip: "bg-primary/10 text-primary!",
    bar: "before:bg-primary",
    spark: "text-primary",
  },
  info: {
    chip: "bg-accent text-accent-foreground",
    bar: "before:bg-primary",
    spark: "text-primary",
  },
  success: {
    chip: "bg-success-muted text-success!",
    bar: "before:bg-success",
    spark: "text-success",
  },
  warning: {
    chip: "bg-warning-muted text-warning!",
    bar: "before:bg-warning",
    spark: "text-warning",
  },
  danger: {
    chip: "bg-destructive/10 text-destructive",
    bar: "before:bg-destructive",
    spark: "text-destructive",
  },
  secondary: {
    chip: "bg-secondary! text-secondary-foreground",
    bar: "before:bg-muted-foreground/40",
    spark: "text-muted-foreground",
  },
};

const DeltaChip = ({ delta, invertDelta, suffix }) => {
  if (delta == null || !Number.isFinite(Number(delta))) return null;
  const n = Number(delta);
  const neutral = n === 0;
  const good = invertDelta ? n < 0 : n > 0;
  const Icon = neutral ? Minus : n > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
        neutral
          ? "bg-muted text-muted-foreground"
          : good
            ? "bg-success-muted text-success!"
            : "bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="h-3 w-3" />
      {n > 0 ? "+" : ""}
      {n}%
      {suffix ? (
        <span className="ml-0.5 font-normal opacity-70">{suffix}</span>
      ) : null}
    </span>
  );
};

const SmartKpiCard = ({
  title,
  value,
  icon: Icon,
  color = "primary",
  delta,
  deltaSuffix = "vs prev",
  invertDelta = false,
  spark,
  onClick,
  footnote,
  className,
}) => {
  const accent = ACCENT[color] || ACCENT.primary;
  const clickable = typeof onClick === "function";

  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        accent.bar,
        clickable &&
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {Icon && (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                accent.chip,
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
        </div>

        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
            {value}
          </p>
          {spark && spark.length > 1 && (
            <div className={cn("shrink-0", accent.spark)}>
              <Sparkline data={spark} width={84} height={30} />
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <DeltaChip
            delta={delta}
            invertDelta={invertDelta}
            suffix={deltaSuffix}
          />
          {footnote && (
            <span className="truncate text-xs text-muted-foreground">
              {footnote}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartKpiCard;
