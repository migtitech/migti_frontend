import React, { useCallback, useEffect, useMemo, useState } from "react";
import targetAnalyticsService from "../../services/targetAnalyticsService";
import { Loader, FilterLockButton, PageHeader } from "../../components";
import {
  Badge,
  Card,
  CardContent,
  Label,
  Select,
  Progress,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const MY_TARGETS_FILTER_DEFAULTS = { status: "", period: "" };

const PERIOD_OPTIONS = [
  { value: "", label: "All Periods" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const formatAmount = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

const getProgressMeta = (target, achieved) => {
  const t = Number(target || 0);
  const a = Number(achieved || 0);
  if (t <= 0) return { pct: 0, display: 0, color: "secondary" };
  const pct = (a / t) * 100;
  const display = clamp(pct);
  if (pct < 50) return { pct, display, color: "danger" };
  if (pct < 80) return { pct, display, color: "warning" };
  return { pct, display, color: "success" };
};

const PROGRESS_COLOR_MAP = {
  danger: "destructive",
  warning: "warning",
  success: "success",
  secondary: "primary",
};

const statusBadge = (status) => {
  if (status === "closed") return <Badge variant="secondary">Closed</Badge>;
  return <Badge variant="success">Active</Badge>;
};

const MyTargets = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "my_targets",
    MY_TARGETS_FILTER_DEFAULTS,
  );
  const [loading, setLoading] = useState(false);
  const [targets, setTargets] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState(initialValues.period);
  const [filterStatus, setFilterStatus] = useState(initialValues.status);

  const loadTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await targetAnalyticsService.getMyZoneTargets();
      const data = res?.data?.data || res?.data || res;
      setTargets(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err?.message || "Failed to load targets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const displayed = useMemo(() => {
    let list = targets;
    if (filterPeriod) list = list.filter((t) => t.period === filterPeriod);
    if (filterStatus)
      list = list.filter((t) => (t.status || "active") === filterStatus);
    return list;
  }, [targets, filterPeriod, filterStatus]);

  useFilterLockPersist("my_targets", filtersLocked, {
    status: filterStatus,
    period: filterPeriod,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status: filterStatus, period: filterPeriod });
  };

  const summary = useMemo(() => {
    const active = targets.filter((t) => (t.status || "active") === "active");
    const totalTarget = active.reduce(
      (s, t) => s + Number(t.targetAmount || 0),
      0,
    );
    return { totalTarget, activeCount: active.length };
  }, [targets]);

  return (
    <div>
      <PageHeader title="My Targets" />

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="py-8 text-center">
              <Loader message="Loading your targets..." />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-muted p-4">
                  <div className="mb-1 text-sm text-muted-foreground">
                    Active Targets
                  </div>
                  <div className="text-lg font-semibold">
                    {summary.activeCount}
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="mb-1 text-sm text-muted-foreground">
                    Total Active Amount
                  </div>
                  <div className="text-lg font-semibold">
                    {formatAmount(summary.totalTarget)}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:items-end">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Period</Label>
                  <Select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground">Status</Label>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="My Targets"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Target Amount</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayed.length ? (
                      displayed.map((row) => {
                        const meta = getProgressMeta(
                          row.targetAmount,
                          row.achievedAmount,
                        );
                        return (
                          <TableRow key={row._id}>
                            <TableCell>{row.zoneId?.name || "-"}</TableCell>
                            <TableCell className="capitalize">
                              {row.period || "-"}
                            </TableCell>
                            <TableCell>
                              {dateFormatter(row.dateFrom, "-")}
                            </TableCell>
                            <TableCell>
                              {dateFormatter(row.dateTo, "-")}
                            </TableCell>
                            <TableCell>
                              {formatAmount(row.targetAmount)}
                            </TableCell>
                            <TableCell style={{ minWidth: 120 }}>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={meta.display}
                                  color={
                                    PROGRESS_COLOR_MAP[meta.color] || "primary"
                                  }
                                  className="h-2 flex-grow"
                                  style={{ minWidth: 80 }}
                                />
                                <small className="text-muted-foreground">
                                  {meta.pct.toFixed(0)}%
                                </small>
                              </div>
                            </TableCell>
                            <TableCell>{statusBadge(row.status)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No targets found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyTargets;
