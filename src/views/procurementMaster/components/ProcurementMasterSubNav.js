import React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../../../lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/procurement-master/dashboard", label: "Dashboard", end: true },
    ],
  },
  {
    label: "Suppliers",
    items: [{ to: "/procurement-master/suppliers", label: "Suppliers" }],
  },
  {
    label: "Procurement",
    items: [
      {
        to: "/procurement-master/procurement-requests",
        label: "Procurement Requests",
      },
      {
        to: "/procurement-master/local-procurement",
        label: "Local Procurement",
      },
      {
        to: "/procurement-master/brand-procurement",
        label: "Brand Procurement",
      },
    ],
  },
  {
    label: "History",
    items: [
      {
        to: "/procurement-master/procurement-history",
        label: "Procurement History",
      },
    ],
  },
  {
    label: "Report",
    items: [
      {
        to: "/procurement-master/reports/my-performance",
        label: "My Performance Report",
      },
    ],
  },
];

/**
 * Shared pill sub-navigation for the Procurement Master section, mirrors
 * PurchaseMasterSubNav. Presentational only — plain client-side route links.
 */
const ProcurementMasterSubNav = () => (
  <nav
    aria-label="Procurement Master sections"
    className="mb-6 flex flex-wrap gap-x-5 gap-y-3 rounded-xl border border-border bg-muted/40 p-3"
  >
    {NAV_GROUPS.map((group) => (
      <div key={group.label} className="flex flex-col gap-1">
        <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {group.label}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {group.items.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary! text-primary-foreground shadow-xs"
                    : "bg-background text-muted-foreground hover:text-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    ))}
  </nav>
);

export default ProcurementMasterSubNav;
