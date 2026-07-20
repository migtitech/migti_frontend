import React, { useMemo, useState } from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import {
  History,
  CheckCircle2,
  TrendingDown,
  Store,
  Search,
} from "lucide-react";
import {
  PageHeader,
  DataTable,
  RowActions,
  StatusBadge,
} from "../../components";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Select,
} from "../../components/ui";
import {
  SmartKpiCard,
  InsightStrip,
  DrilldownSheet,
  DrillRow,
  buildInsights,
  formatINR,
  formatNumber,
} from "../reports/components/smart";
import { statusVariant, stageLabel } from "./components/statusFormatters";
import { procurementHistory } from "../../data/procurementMasterDummyData";
import { dateFormatter } from "../../utils/dateFormatter";

// ─── config / helpers ────────────────────────────────────────────────────────

const STAGE_META = {
  query: { label: "Query", chart: "#94a3b8" },
  hod_rate_pending: { label: "Sent for HOD Rate", chart: "#f59e0b" },
  verification: { label: "Sent for Verification", chart: "#06b6d4" },
  fulfilled: { label: "Fulfilled", chart: "#22c55e" },
};

const STAGE_ORDER = ["query", "hod_rate_pending", "verification", "fulfilled"];

/** Signed variance (submitted − target); negative = under target = saving. */
const rateVariance = (row) => {
  if (row.submittedRate == null || row.targetRate == null) return null;
  return Number(row.submittedRate) - Number(row.targetRate);
};
const rateVariancePct = (row) => {
  const v = rateVariance(row);
  if (v == null || !row.targetRate) return null;
  return (v / Number(row.targetRate)) * 100;
};

const RateVariance = ({ row }) => {
  const v = rateVariance(row);
  if (v == null) return <span className="text-muted-foreground">Awaiting</span>;
  const pct = rateVariancePct(row);
  const cls =
    v > 0
      ? "text-destructive"
      : v < 0
        ? "text-success!"
        : "text-muted-foreground";
  const label = v === 0 ? "On target" : `${v > 0 ? "+" : ""}${pct.toFixed(1)}%`;
  return <span className={`font-medium ${cls}`}>{label}</span>;
};

const BucketBadge = ({ bucketType }) => (
  <Badge variant={bucketType === "brand" ? "info" : "secondary"}>
    {bucketType === "brand" ? "Brand" : "Local"}
  </Badge>
);

const CATEGORY_OPTIONS = ["Raw Material", "Machinery Spares", "Consumables"];

// ─── component ───────────────────────────────────────────────────────────────

const ProcurementHistoryDashboard = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [bucket, setBucket] = useState("");
  const [stage, setStage] = useState("");
  const [drill, setDrill] = useState(null);

  const rows = procurementHistory;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (category && r.category !== category) return false;
      if (bucket && r.bucketType !== bucket) return false;
      if (stage && r.stage !== stage) return false;
      if (!q) return true;
      return [r.product, r.queryCode, r.supplier, r.buyer, r.id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, category, bucket, stage]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const fulfilled = rows.filter((r) => r.stage === "fulfilled").length;
    const inProgress = rows.filter(
      (r) => r.stage !== "fulfilled" && r.stage !== "query",
    ).length;
    const rated = rows.filter((r) => r.submittedRate != null);
    const underTarget = rated.filter((r) => rateVariance(r) < 0).length;
    const overTarget = rated.filter((r) => rateVariance(r) > 0).length;
    const suppliers = new Set(rows.map((r) => r.supplier).filter(Boolean)).size;
    const avgVariancePct =
      rated.length > 0
        ? rated.reduce((s, r) => s + (rateVariancePct(r) || 0), 0) /
          rated.length
        : 0;
    return {
      total,
      fulfilled,
      inProgress,
      underTarget,
      overTarget,
      suppliers,
      avgVariancePct,
    };
  }, [rows]);

  const byStage = useMemo(
    () =>
      STAGE_ORDER.map((k) => ({
        key: k,
        label: STAGE_META[k].label,
        color: STAGE_META[k].chart,
        value: rows.filter((r) => r.stage === k).length,
      })),
    [rows],
  );

  // Target vs submitted rate for rows that have a submitted rate.
  const rateChart = useMemo(() => {
    const rated = rows.filter((r) => r.submittedRate != null);
    return {
      labels: rated.map((r) => r.product),
      target: rated.map((r) => Number(r.targetRate) || 0),
      submitted: rated.map((r) => Number(r.submittedRate) || 0),
    };
  }, [rows]);

  const insights = useMemo(() => {
    const rated = rows
      .filter((r) => r.submittedRate != null)
      .map((r) => ({ ...r, v: rateVariancePct(r) }));
    const best = [...rated].sort((a, b) => a.v - b.v)[0];
    const worst = [...rated].sort((a, b) => b.v - a.v)[0];
    return buildInsights([
      {
        tone: "neutral",
        text: `${kpis.fulfilled} of ${kpis.total} items fulfilled; ${kpis.inProgress} in progress.`,
      },
      best &&
        best.v < 0 && {
          tone: "positive",
          text: `Best rate: ${best.product} sourced ${best.v.toFixed(1)}% under target.`,
        },
      worst &&
        worst.v > 0 && {
          tone: "warning",
          text: `${worst.product} came in +${worst.v.toFixed(1)}% over target.`,
        },
      {
        tone: kpis.avgVariancePct <= 0 ? "positive" : "negative",
        text: `Average rate variance: ${kpis.avgVariancePct > 0 ? "+" : ""}${kpis.avgVariancePct.toFixed(1)}% vs target.`,
      },
    ]);
  }, [rows, kpis]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setBucket("");
    setStage("");
  };
  const hasFilters = search || category || bucket || stage;

  const columns = useMemo(
    () => [
      {
        key: "product",
        label: "Product",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-semibold">{r.product}</div>
            {r.queryCode && (
              <div className="font-mono text-xs text-muted-foreground">
                {r.queryCode}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "category",
        label: "Category",
        sortable: true,
        render: (r) => (
          <div>
            <div>{r.category}</div>
            <div className="text-xs text-muted-foreground">
              {r.supplier || "—"}
            </div>
          </div>
        ),
      },
      {
        key: "bucketType",
        label: "Bucket",
        width: 90,
        align: "center",
        sortValue: (r) => r.bucketType,
        exportValue: (r) => (r.bucketType === "brand" ? "Brand" : "Local"),
        render: (r) => <BucketBadge bucketType={r.bucketType} />,
      },
      {
        key: "stage",
        label: "Stage",
        sortValue: (r) => r.stage,
        exportValue: (r) => stageLabel(r.stage),
        render: (r) => (
          <StatusBadge
            status={stageLabel(r.stage)}
            variant={statusVariant(r.stage)}
          />
        ),
      },
      {
        key: "targetRate",
        label: "Target Rate",
        align: "right",
        sortable: true,
        sortValue: (r) => r.targetRate ?? -1,
        render: (r) => (
          <span className="text-muted-foreground">
            {r.targetRate == null ? "—" : formatINR(r.targetRate)}
          </span>
        ),
      },
      {
        key: "submittedRate",
        label: "Submitted Rate",
        align: "right",
        sortable: true,
        sortValue: (r) => r.submittedRate ?? -1,
        render: (r) => (
          <span className="font-semibold">
            {r.submittedRate == null ? "—" : formatINR(r.submittedRate)}
          </span>
        ),
      },
      {
        key: "variance",
        label: "Variance",
        align: "right",
        sortValue: (r) => rateVariancePct(r) ?? 9999,
        exportValue: (r) => {
          const p = rateVariancePct(r);
          return p == null ? "Awaiting" : `${p.toFixed(1)}%`;
        },
        render: (r) => <RateVariance row={r} />,
      },
      {
        key: "date",
        label: "Date",
        align: "center",
        sortable: true,
        render: (r) => dateFormatter(r.date, "—"),
      },
      {
        key: "actions",
        label: "Action",
        width: 60,
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (r) => (
          <RowActions onView={() => setDrill(r)} viewLabel="View details" />
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement History"
        description="Every procurement item across all stages — target vs submitted rate, supplier, and bucket."
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmartKpiCard
          title="Total Items"
          value={formatNumber(kpis.total)}
          icon={History}
          color="primary"
          footnote={`${kpis.inProgress} in progress`}
        />
        <SmartKpiCard
          title="Fulfilled"
          value={formatNumber(kpis.fulfilled)}
          icon={CheckCircle2}
          color="success"
          footnote={`${kpis.total - kpis.fulfilled} open`}
        />
        <SmartKpiCard
          title="Under Target"
          value={formatNumber(kpis.underTarget)}
          icon={TrendingDown}
          color="success"
          footnote={`${kpis.overTarget} over target`}
        />
        <SmartKpiCard
          title="Suppliers Used"
          value={formatNumber(kpis.suppliers)}
          icon={Store}
          color="info"
          footnote={`avg ${kpis.avgVariancePct > 0 ? "+" : ""}${kpis.avgVariancePct.toFixed(1)}% vs target`}
        />
      </div>

      <InsightStrip insights={insights} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Target vs Submitted Rate</CardTitle>
            <CardDescription>Rated items only · sample data</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "300px" }}
              data={{
                labels: rateChart.labels,
                datasets: [
                  {
                    label: "Target",
                    backgroundColor: "#94a3b8",
                    borderRadius: 4,
                    data: rateChart.target,
                  },
                  {
                    label: "Submitted",
                    backgroundColor: "#2563eb",
                    borderRadius: 4,
                    data: rateChart.submitted,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "bottom" } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => `₹${v}` },
                  },
                },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Items by Stage</CardTitle>
            <CardDescription>Pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartDoughnut
              style={{ height: "300px" }}
              data={{
                labels: byStage.map((s) => s.label),
                datasets: [
                  {
                    data: byStage.map((s) => s.value),
                    backgroundColor: byStage.map((s) => s.color),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "bottom" } },
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Filters + table */}
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>Procurement Records</CardTitle>
            <CardDescription>
              Showing {filtered.length} of {rows.length}
            </CardDescription>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="space-y-1.5 lg:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Product, query code, supplier, buyer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bucket</Label>
              <Select
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
              >
                <option value="">All buckets</option>
                <option value="brand">Brand</option>
                <option value="local">Local</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="">All stages</option>
                {STAGE_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {STAGE_META[k].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.id}
            showSearch={false}
            maxHeight="none"
            exportFileName="procurement-history"
            onRowClick={(r) => setDrill(r)}
            emptyTitle="No procurement records found"
            emptyMessage="Try changing the filters."
          />
        </CardContent>
      </Card>

      {/* Detail drilldown */}
      <DrilldownSheet
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drill ? drill.product : ""}
        description={drill ? drill.queryCode : ""}
      >
        {drill && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={stageLabel(drill.stage)}
                variant={statusVariant(drill.stage)}
              />
              <BucketBadge bucketType={drill.bucketType} />
              <Badge variant="secondary">{drill.category}</Badge>
            </div>

            {/* Rate block */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rate
                </span>
                <RateVariance row={drill} />
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="text-lg font-semibold text-muted-foreground">
                    {drill.targetRate == null
                      ? "—"
                      : formatINR(drill.targetRate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Submitted</div>
                  <div className="text-lg font-bold text-foreground">
                    {drill.submittedRate == null
                      ? "Awaiting"
                      : formatINR(drill.submittedRate)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border px-3">
              <DrillRow label="Supplier" value={drill.supplier || "—"} strong />
              <DrillRow label="Category" value={drill.category} />
              <DrillRow
                label="Quantity"
                value={`${drill.qty ?? "—"}${drill.unit ? ` ${drill.unit}` : ""}`}
              />
              <DrillRow label="Query Code" value={drill.queryCode || "—"} />
              <DrillRow label="Handled By" value={drill.buyer || "—"} />
              <DrillRow label="Stage" value={stageLabel(drill.stage)} />
              <DrillRow label="Date" value={dateFormatter(drill.date, "—")} />
            </div>

            {drill.remark && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Remark
                </div>
                <div className="mt-0.5 whitespace-pre-wrap break-words text-sm">
                  {drill.remark}
                </div>
              </div>
            )}
          </>
        )}
      </DrilldownSheet>
    </div>
  );
};

export default ProcurementHistoryDashboard;
