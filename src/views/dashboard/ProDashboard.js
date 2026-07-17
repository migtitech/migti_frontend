import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import usePermissions from "../../hooks/usePermissions";
import proBucketService from "../../services/proBucketService";
import { toastError } from "../../utils/toast";
import { Loader, PageHeader } from "../../components";
import {
  Card,
  CardContent,
  Alert,
  AlertDescription,
} from "../../components/ui";
import { cn } from "../../lib/utils";

const emptySummary = () => ({
  pending: 0,
  rateSubmitted: 0,
  fulfilled: 0,
});

/** Derive dashboard counts from the same rows as Pro Bucket list (`status` field). */
const summarizeStatuses = (rows) => {
  const out = emptySummary();
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    const s = row?.status;
    if (s === "pending") out.pending += 1;
    else if (s === "rate_submitted") out.rateSubmitted += 1;
    else if (s === "fulfilled") out.fulfilled += 1;
  }
  return out;
};

const SummaryCard = ({ label, value, accent, valueClass, loading }) => (
  <Card className={cn("border-l-4", accent)}>
    <CardContent className="py-6 text-center">
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader />
        </div>
      ) : (
        <div className={cn("text-4xl font-bold", valueClass)}>{value}</div>
      )}
    </CardContent>
  </Card>
);

const ProDashboard = () => {
  const { user } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const canProBucket = hasAnyPermission("pro_bucket");
  const [summary, setSummary] = useState(emptySummary);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    if (!canProBucket) {
      setSummary(emptySummary());
      setStatsError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const rows = await proBucketService.listAllForCounts();
        if (cancelled) return;
        setSummary(summarizeStatuses(rows));
      } catch (e) {
        if (!cancelled) {
          const msg = e?.message || "Could not load Pro Bucket counts";
          setStatsError(msg);
          toastError(msg);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canProBucket]);

  return (
    <div>
      <PageHeader
        title="Pro workspace"
        description={`Welcome${
          user?.name ? `, ${user.name}` : ""
        }. Quick links reflect your permissions.`}
      />

      {canProBucket && (
        <>
          {statsError ? (
            <Alert variant="destructive">
              <AlertDescription>{statsError}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard
                label="Pending"
                value={summary.pending}
                accent="border-warning!"
                valueClass="text-warning!"
                loading={statsLoading}
              />
              <SummaryCard
                label="Rate submitted"
                value={summary.rateSubmitted}
                accent="border-primary!"
                valueClass="text-primary!"
                loading={statsLoading}
              />
              <SummaryCard
                label="Fulfilled"
                value={summary.fulfilled}
                accent="border-success!"
                valueClass="text-success!"
                loading={statsLoading}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProDashboard;
