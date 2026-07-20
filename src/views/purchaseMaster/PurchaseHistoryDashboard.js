import React, { useMemo, useState } from "react";
import { CChartBar } from "@coreui/react-chartjs";
import {
  History,
  TrendingUp,
  TrendingDown,
  Store,
  Search,
  Info,
} from "lucide-react";
import { PageHeader, DataTable, RowActions } from "../../components";
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
  Sparkline,
  InsightStrip,
  DrilldownSheet,
  DrillRow,
  buildInsights,
  formatINR,
  formatNumber,
} from "../reports/components/smart";
import {
  purchaseHistory,
  purchaseHistoryPaymentMeta,
} from "../../data/purchaseMasterDummyData";
import { dateFormatter } from "../../utils/dateFormatter";

// ─── helpers ─────────────────────────────────────────────────────────────────

const pctChange = (oldPrice, currentPrice) => {
  const o = Number(oldPrice) || 0;
  const c = Number(currentPrice) || 0;
  if (!o) return 0;
  return ((c - o) / o) * 100;
};

const PriceChange = ({ oldPrice, currentPrice }) => {
  const diff = (Number(currentPrice) || 0) - (Number(oldPrice) || 0);
  const pct = pctChange(oldPrice, currentPrice).toFixed(1);
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : null;
  const cls =
    diff > 0
      ? "text-destructive"
      : diff < 0
        ? "text-success!"
        : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${cls}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {diff > 0 ? "+" : ""}
      {pct}%
    </span>
  );
};

const ModeBadge = ({ mode }) =>
  mode === "local" ? (
    <Badge variant="secondary">Local</Badge>
  ) : (
    <Badge variant="default">Brand</Badge>
  );

const PaymentBadge = ({ status }) => {
  const meta = purchaseHistoryPaymentMeta[status] || {
    label: status,
    variant: "secondary",
  };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
};

const CATEGORY_OPTIONS = ["Electronics", "Packaging Material"];

// ─── component ───────────────────────────────────────────────────────────────

const PurchaseHistoryDashboard = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("");
  const [payment, setPayment] = useState("");
  const [drill, setDrill] = useState(null);

  const rows = purchaseHistory;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (category && r.category !== category) return false;
      if (mode && r.mode !== mode) return false;
      if (payment && r.paymentStatus !== payment) return false;
      if (!q) return true;
      return [r.product, r.rawProductCode, r.supplier, r.poCode, r.buyer]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, category, mode, payment]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const totalQty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const increased = rows.filter((r) => r.currentPrice > r.oldPrice).length;
    const decreased = rows.filter((r) => r.currentPrice < r.oldPrice).length;
    const suppliers = new Set(rows.map((r) => r.supplier)).size;
    const avgChange =
      total > 0
        ? rows.reduce((s, r) => s + pctChange(r.oldPrice, r.currentPrice), 0) /
          total
        : 0;
    // Average current price series (product order) — a light sparkline signal.
    const priceSpark = rows.map((r) => Number(r.currentPrice) || 0);
    return {
      total,
      totalQty,
      increased,
      decreased,
      suppliers,
      avgChange,
      priceSpark,
    };
  }, [rows]);

  // Price movement chart — old vs current price per product.
  const chart = useMemo(
    () => ({
      labels: rows.map((r) => r.product),
      old: rows.map((r) => Number(r.oldPrice) || 0),
      current: rows.map((r) => Number(r.currentPrice) || 0),
    }),
    [rows],
  );

  const insights = useMemo(() => {
    const topRise = [...rows]
      .map((r) => ({ ...r, pct: pctChange(r.oldPrice, r.currentPrice) }))
      .sort((a, b) => b.pct - a.pct)[0];
    const topDrop = [...rows]
      .map((r) => ({ ...r, pct: pctChange(r.oldPrice, r.currentPrice) }))
      .sort((a, b) => a.pct - b.pct)[0];
    return buildInsights([
      kpis.increased > 0 && {
        tone: "warning",
        text: `${kpis.increased} product${kpis.increased > 1 ? "s" : ""} costlier than last purchase — review before reordering.`,
      },
      topRise &&
        topRise.pct > 0 && {
          tone: "negative",
          text: `Biggest price rise: ${topRise.product} (+${topRise.pct.toFixed(1)}%).`,
        },
      topDrop &&
        topDrop.pct < 0 && {
          tone: "positive",
          text: `Best saving: ${topDrop.product} (${topDrop.pct.toFixed(1)}%).`,
        },
      {
        tone: "neutral",
        text: `Purchased from ${kpis.suppliers} supplier${kpis.suppliers > 1 ? "s" : ""} across ${kpis.total} products.`,
      },
    ]);
  }, [rows, kpis]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setMode("");
    setPayment("");
  };
  const hasFilters = search || category || mode || payment;

  const columns = useMemo(
    () => [
      {
        key: "product",
        label: "Product",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-semibold">{r.product}</div>
            {r.rawProductCode && (
              <div className="font-mono text-xs text-muted-foreground">
                {r.rawProductCode}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "supplier",
        label: "Supplier",
        sortable: true,
        render: (r) => (
          <div>
            <div>{r.supplier}</div>
            <div className="text-xs text-muted-foreground">{r.category}</div>
          </div>
        ),
      },
      {
        key: "mode",
        label: "Mode",
        width: 90,
        align: "center",
        sortValue: (r) => r.mode,
        exportValue: (r) => (r.mode === "local" ? "Local" : "Brand"),
        render: (r) => <ModeBadge mode={r.mode} />,
      },
      {
        key: "qty",
        label: "Qty",
        align: "center",
        sortable: true,
        exportValue: (r) => `${r.qty}${r.unit ? ` ${r.unit}` : ""}`,
        render: (r) => (
          <span className="font-semibold">
            {r.qty}
            {r.unit ? (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {r.unit}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "oldPrice",
        label: "Old Price",
        align: "right",
        sortable: true,
        sortValue: (r) => r.oldPrice,
        render: (r) => (
          <span className="text-muted-foreground">{formatINR(r.oldPrice)}</span>
        ),
      },
      {
        key: "currentPrice",
        label: "Current Price",
        align: "right",
        sortable: true,
        sortValue: (r) => r.currentPrice,
        render: (r) => (
          <span className="font-semibold">{formatINR(r.currentPrice)}</span>
        ),
      },
      {
        key: "change",
        label: "Change",
        align: "right",
        sortValue: (r) => pctChange(r.oldPrice, r.currentPrice),
        exportValue: (r) =>
          `${pctChange(r.oldPrice, r.currentPrice).toFixed(1)}%`,
        render: (r) => (
          <PriceChange oldPrice={r.oldPrice} currentPrice={r.currentPrice} />
        ),
      },
      {
        key: "trend",
        label: "Trend",
        width: 90,
        align: "center",
        toggleable: true,
        exportable: false,
        render: (r) =>
          Array.isArray(r.priceHistory) && r.priceHistory.length > 1 ? (
            <span
              className={
                r.currentPrice > r.oldPrice
                  ? "text-destructive"
                  : r.currentPrice < r.oldPrice
                    ? "text-success!"
                    : "text-muted-foreground"
              }
            >
              <Sparkline data={r.priceHistory} width={70} height={26} />
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "payment",
        label: "Payment",
        width: 100,
        align: "center",
        sortValue: (r) => r.paymentStatus,
        exportValue: (r) =>
          purchaseHistoryPaymentMeta[r.paymentStatus]?.label || r.paymentStatus,
        render: (r) => <PaymentBadge status={r.paymentStatus} />,
      },
      {
        key: "purchasedOn",
        label: "Purchased On",
        align: "center",
        sortable: true,
        render: (r) => dateFormatter(r.purchasedOn, "—"),
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
        title="Purchase History"
        description="Product-wise record of everything purchased — supplier, price trend, mode, and payment status."
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmartKpiCard
          title="Products Purchased"
          value={formatNumber(kpis.total)}
          icon={History}
          color="primary"
          spark={kpis.priceSpark}
          footnote={`${formatNumber(kpis.totalQty)} units total`}
        />
        <SmartKpiCard
          title="Price Increased"
          value={formatNumber(kpis.increased)}
          icon={TrendingUp}
          color="danger"
          footnote="costlier than last time"
        />
        <SmartKpiCard
          title="Price Dropped"
          value={formatNumber(kpis.decreased)}
          icon={TrendingDown}
          color="success"
          footnote="cheaper than last time"
        />
        <SmartKpiCard
          title="Suppliers Used"
          value={formatNumber(kpis.suppliers)}
          icon={Store}
          color="info"
          footnote={`avg change ${kpis.avgChange > 0 ? "+" : ""}${kpis.avgChange.toFixed(1)}%`}
        />
      </div>

      <InsightStrip insights={insights} />

      {/* Price movement chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price Movement — Old vs Current</CardTitle>
          <CardDescription>
            Per-product price comparison · sample data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CChartBar
            style={{ height: "300px" }}
            data={{
              labels: chart.labels,
              datasets: [
                {
                  label: "Old Price",
                  backgroundColor: "#94a3b8",
                  borderRadius: 4,
                  data: chart.old,
                },
                {
                  label: "Current Price",
                  backgroundColor: "#2563eb",
                  borderRadius: 4,
                  data: chart.current,
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

      {/* Policy note */}
      <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>
          Total purchase amount is not shown on this screen — only per-product
          old vs current price, per policy.
        </p>
      </div>

      {/* Filters + table */}
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>Purchase Records</CardTitle>
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
                  placeholder="Product, code, supplier, PO, buyer…"
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
              <Label>Mode</Label>
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="">All modes</option>
                <option value="brand">Brand</option>
                <option value="local">Local</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment</Label>
              <Select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              >
                <option value="">All payments</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
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
            exportFileName="purchase-history"
            onRowClick={(r) => setDrill(r)}
            emptyTitle="No purchases found"
            emptyMessage="Try changing the filters."
          />
        </CardContent>
      </Card>

      {/* Detail drilldown */}
      <DrilldownSheet
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drill ? drill.product : ""}
        description={drill ? drill.rawProductCode : ""}
      >
        {drill && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <ModeBadge mode={drill.mode} />
              <PaymentBadge status={drill.paymentStatus} />
              <Badge variant="secondary">{drill.category}</Badge>
            </div>

            {/* Price trend block */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Price Trend
                </span>
                <PriceChange
                  oldPrice={drill.oldPrice}
                  currentPrice={drill.currentPrice}
                />
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Old</div>
                  <div className="text-lg font-semibold text-muted-foreground">
                    {formatINR(drill.oldPrice)}
                  </div>
                </div>
                {Array.isArray(drill.priceHistory) &&
                  drill.priceHistory.length > 1 && (
                    <span
                      className={
                        drill.currentPrice > drill.oldPrice
                          ? "text-destructive"
                          : drill.currentPrice < drill.oldPrice
                            ? "text-success!"
                            : "text-muted-foreground"
                      }
                    >
                      <Sparkline
                        data={drill.priceHistory}
                        width={120}
                        height={40}
                      />
                    </span>
                  )}
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Current</div>
                  <div className="text-lg font-bold text-foreground">
                    {formatINR(drill.currentPrice)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border px-3">
              <DrillRow label="Supplier" value={drill.supplier} strong />
              <DrillRow label="Category" value={drill.category} />
              <DrillRow
                label="Quantity"
                value={`${drill.qty}${drill.unit ? ` ${drill.unit}` : ""}`}
              />
              <DrillRow label="PO #" value={drill.poCode || "—"} />
              <DrillRow label="Query Code" value={drill.queryCode || "—"} />
              <DrillRow label="Purchased By" value={drill.buyer || "—"} />
              <DrillRow
                label="Purchased On"
                value={dateFormatter(drill.purchasedOn, "—")}
              />
              <DrillRow
                label="Payment"
                value={
                  purchaseHistoryPaymentMeta[drill.paymentStatus]?.label ||
                  drill.paymentStatus
                }
              />
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

export default PurchaseHistoryDashboard;
