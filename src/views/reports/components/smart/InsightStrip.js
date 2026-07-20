import React from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "../../../../lib/utils";

/**
 * Auto-generated "Smart Insights" strip. Takes a list of
 * { tone, text } items (built by reportUtils helpers) and renders them as
 * colour-coded chips so each report opens with plain-English takeaways.
 */
const TONE = {
  positive: {
    icon: TrendingUp,
    cls: "border-success/30 bg-success-muted/50 text-foreground",
    dot: "text-success!",
  },
  negative: {
    icon: TrendingDown,
    cls: "border-destructive/30 bg-destructive/5 text-foreground",
    dot: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    cls: "border-warning/30 bg-warning-muted/50 text-foreground",
    dot: "text-warning!",
  },
  neutral: {
    icon: Info,
    cls: "border-border bg-muted/40 text-foreground",
    dot: "text-muted-foreground",
  },
};

const InsightStrip = ({ insights = [], className }) => {
  if (!insights.length) return null;
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary!" />
        <h3 className="text-sm font-semibold text-foreground">
          Smart Insights
        </h3>
        <span className="text-xs text-muted-foreground">
          auto-generated from current view
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((it, i) => {
          const tone = TONE[it.tone] || TONE.neutral;
          const Icon = tone.icon;
          return (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                tone.cls,
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone.dot)} />
              <span className="leading-snug">{it.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InsightStrip;
