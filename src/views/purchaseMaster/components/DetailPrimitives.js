import React from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui";
import { cn } from "../../../lib/utils";

/**
 * Shared presentational primitives for the Purchase Master "detailed view"
 * pages. These keep every detail page consistent — a titled section card, a
 * label/value row grid, and a simple vertical timeline — so any screen a user
 * opens explains the full record end-to-end. Frontend-only, no data logic.
 */

/** A titled section wrapped in a Card. */
export const DetailSection = ({ title, description, icon: Icon, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        {title}
      </CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
DetailSection.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  icon: PropTypes.elementType,
  children: PropTypes.node,
};

/**
 * Responsive label/value grid. Pass `items` as [{ label, value, full }] where
 * `full` makes a row span the whole width (for long text like remarks).
 */
export const DetailGrid = ({ items, columns = 2 }) => (
  <dl
    className={cn(
      "grid grid-cols-1 gap-x-8 gap-y-4",
      columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
    )}
  >
    {items.filter(Boolean).map((item, i) => (
      <div key={i} className={cn("min-w-0", item.full && "sm:col-span-full")}>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {item.label}
        </dt>
        <dd className="mt-1 text-sm text-foreground break-words">
          {item.value === undefined || item.value === null || item.value === ""
            ? "—"
            : item.value}
        </dd>
      </div>
    ))}
  </dl>
);
DetailGrid.propTypes = {
  items: PropTypes.array.isRequired,
  columns: PropTypes.oneOf([2, 3]),
};

/** Vertical timeline for record history. `items` = [{ label, on, by }]. */
export const DetailTimeline = ({ items = [] }) => (
  <ol className="relative space-y-5 border-l border-border pl-6">
    {items.map((step, i) => (
      <li key={i} className="relative">
        <span
          className={cn(
            "absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-background",
            i === items.length - 1 ? "bg-primary" : "bg-muted-foreground/50",
          )}
        />
        <p className="text-sm font-medium text-foreground">{step.label}</p>
        <p className="text-xs text-muted-foreground">
          {step.on}
          {step.by ? ` · ${step.by}` : ""}
        </p>
      </li>
    ))}
  </ol>
);
DetailTimeline.propTypes = {
  items: PropTypes.array,
};

/** Small helper to render ₹ amounts consistently across detail pages. */
export const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** "Record not found" panel used when a detail :id has no sample data. */
export const DetailNotFound = ({ label = "Record", id }) => (
  <Card>
    <CardContent className="py-12 text-center text-muted-foreground">
      {label} <span className="font-medium">{id}</span> was not found in the
      sample data.
    </CardContent>
  </Card>
);
DetailNotFound.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
};
