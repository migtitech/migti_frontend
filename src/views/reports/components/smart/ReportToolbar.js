import React from "react";
import { RefreshCw, Download, Printer, GitCompareArrows } from "lucide-react";
import { Button, Select, Label } from "../../../../components/ui";
import { cn } from "../../../../lib/utils";
import { PERIODS } from "./reportUtils";

/**
 * Shared interactive toolbar for every smart report: period selector,
 * period-over-period compare toggle, an optional extra filter slot, plus
 * Refresh / Export / Print actions. All state is lifted to the page so the
 * KPIs, charts and tables recompute from it. Frontend-only.
 */
const ReportToolbar = ({
  period,
  onPeriodChange,
  compare,
  onCompareChange,
  onRefresh,
  refreshing,
  onExport,
  filters, // optional array of { id, label, value, onChange, options:[{value,label}] }
  className,
}) => (
  <div
    className={cn(
      "flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:flex-row md:flex-wrap md:items-end print:hidden",
      className,
    )}
  >
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Period</Label>
      <Select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="md:w-44"
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </Select>
    </div>

    {(filters || []).map((f) => (
      <div key={f.id} className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{f.label}</Label>
        <Select
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="md:w-44"
        >
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    ))}

    <div className="flex flex-1 flex-wrap items-end justify-end gap-2">
      <Button
        type="button"
        variant={compare ? "default" : "outline"}
        size="sm"
        onClick={() => onCompareChange(!compare)}
        aria-pressed={compare}
        title="Compare with previous period"
      >
        <GitCompareArrows className="mr-1.5 h-4 w-4" />
        Compare
      </Button>
      {onRefresh && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn("mr-1.5 h-4 w-4", refreshing && "animate-spin")}
          />
          Refresh
        </Button>
      )}
      {onExport && (
        <Button type="button" variant="outline" size="sm" onClick={onExport}>
          <Download className="mr-1.5 h-4 w-4" />
          Export
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => window.print()}
      >
        <Printer className="mr-1.5 h-4 w-4" />
        Print
      </Button>
    </div>
  </div>
);

export default ReportToolbar;
