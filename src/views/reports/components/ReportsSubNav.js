import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  ShoppingCart,
  ShoppingBasket,
  Boxes,
  Landmark,
  Users,
  Target,
} from "lucide-react";
import { cn } from "../../../lib/utils";

const REPORT_TABS = [
  { to: "/reports", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/reports/sales", label: "Sales", icon: ShoppingCart },
  { to: "/reports/purchase", label: "Purchase", icon: ShoppingBasket },
  { to: "/reports/inventory", label: "Inventory", icon: Boxes },
  { to: "/reports/finance", label: "Finance", icon: Landmark },
  { to: "/reports/hr", label: "HR", icon: Users },
  { to: "/reports/targets", label: "Targets", icon: Target },
];

/**
 * Pill sub-navigation shared across every Reports page so users can jump
 * between report modules without going back to the sidebar.
 * Presentational only — plain client-side route links.
 */
const ReportsSubNav = () => (
  <nav
    aria-label="Report sections"
    className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-border bg-muted/40 p-1.5"
  >
    {REPORT_TABS.map(({ to, label, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary! text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
          )
        }
      >
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    ))}
  </nav>
);

export default ReportsSubNav;
