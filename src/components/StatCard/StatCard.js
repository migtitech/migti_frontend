import React from "react";
import { Card, CardContent } from "../ui";
import { cn } from "../../lib/utils";

/**
 * Shared enterprise stat/KPI card used across dashboards.
 *
 * Presentational only. Props:
 * - title: label (rendered uppercase, muted)
 * - value: primary metric (large, bold)
 * - subtitle: optional secondary line (e.g. amount / helper text)
 * - icon: lucide icon component
 * - color: semantic accent — primary | info | success | warning | danger | secondary | dark
 * - tint: optional raw className override for the icon chip (legacy)
 * - onClick: when provided the card becomes an accessible button (hover/focus affordance)
 * - valueClassName / className: style hooks
 */
const STAT_TINTS = {
  primary: "bg-primary/10 text-primary!",
  info: "bg-accent text-accent-foreground",
  success: "bg-success-muted text-success!",
  warning: "bg-warning-muted text-warning!",
  danger: "bg-destructive/10 text-destructive",
  secondary: "bg-secondary! text-secondary-foreground",
  dark: "bg-foreground/10 text-foreground",
};

const STAT_ACCENTS = {
  primary: "before:bg-primary",
  info: "before:bg-primary",
  success: "before:bg-success",
  warning: "before:bg-warning",
  danger: "before:bg-destructive",
  secondary: "before:bg-muted-foreground/40",
  dark: "before:bg-foreground",
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
  tint,
  onClick,
  valueClassName,
  className,
}) => {
  const clickable = typeof onClick === "function";
  const chip = tint || STAT_TINTS[color] || STAT_TINTS.primary;

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
        STAT_ACCENTS[color] || STAT_ACCENTS.primary,
        clickable &&
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <CardContent className="p-4 pl-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {Icon && (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                chip,
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-2 text-3xl font-bold leading-none tabular-nums",
            valueClassName,
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className="mt-1.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
