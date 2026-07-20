import React, { useMemo, useState } from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Plus,
  Search,
  XCircle,
  Undo2,
  IndianRupee,
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
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Tooltip,
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
import {
  purchaseReturns as seedReturns,
  purchaseReturnReasons,
  purchaseReturnSuppliers,
} from "../../data/purchaseMasterDummyData";
import { toastSuccess } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

// ─── config ────────────────────────────────────────────────────────────────────

const STATUS_META = {
  pending: { label: "Pending", variant: "warning", chart: "#f59e0b" },
  approved: { label: "Approved", variant: "info", chart: "#06b6d4" },
  resolved: { label: "Resolved", variant: "success", chart: "#22c55e" },
  rejected: { label: "Rejected", variant: "destructive", chart: "#ef4444" },
};

const REASON_COLORS = [
  "#2563eb",
  "#f59e0b",
  "#8b5cf6",
  "#22c55e",
  "#ef4444",
  "#06b6d4",
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || { label: status, variant: "secondary" };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
};

const EMPTY_FORM = {
  po: "",
  supplier: "",
  product: "",
  category: "Electronics",
  qty: "",
  unitPrice: "",
  reason: purchaseReturnReasons[0],
  remark: "",
};

// ─── component ───────────────────────────────────────────────────────────────────

const PurchaseReturnDashboard = () => {
  const [returns, setReturns] = useState(() =>
    seedReturns.map((r) => ({ ...r })),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");

  const [drill, setDrill] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // ── derived: filtered rows ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (reasonFilter && r.reason !== reasonFilter) return false;
      if (!q) return true;
      return [r.id, r.po, r.supplier, r.product]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [returns, search, statusFilter, reasonFilter]);

  // ── derived: KPIs (over the full dataset, not the filter) ─────────────────
  const kpis = useMemo(() => {
    const total = returns.length;
    const pending = returns.filter((r) => r.status === "pending").length;
    const approved = returns.filter((r) => r.status === "approved").length;
    const resolved = returns.filter((r) => r.status === "resolved").length;
    const rejected = returns.filter((r) => r.status === "rejected").length;
    const totalQty = returns.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const totalValue = returns.reduce(
      (s, r) => s + (Number(r.returnValue) || 0),
      0,
    );
    const impact = returns.reduce(
      (s, r) => s + (Number(r.performanceImpact) || 0),
      0,
    );
    return {
      total,
      pending,
      approved,
      resolved,
      rejected,
      totalQty,
      totalValue,
      impact,
    };
  }, [returns]);

  // ── derived: charts ────────────────────────────────────────────────────────
  const byStatus = useMemo(
    () =>
      Object.keys(STATUS_META).map((k) => ({
        key: k,
        label: STATUS_META[k].label,
        color: STATUS_META[k].chart,
        value: returns.filter((r) => r.status === k).length,
      })),
    [returns],
  );

  const byReason = useMemo(() => {
    const map = new Map();
    returns.forEach((r) => {
      map.set(r.reason, (map.get(r.reason) || 0) + 1);
    });
    return [...map.entries()].map(([label, value], i) => ({
      label,
      value,
      color: REASON_COLORS[i % REASON_COLORS.length],
    }));
  }, [returns]);

  // ── derived: insights ──────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const topReason = [...byReason].sort((a, b) => b.value - a.value)[0];
    const openCount = kpis.pending + kpis.approved;
    return buildInsights([
      kpis.pending > 0 && {
        tone: "warning",
        text: `${kpis.pending} return${kpis.pending > 1 ? "s" : ""} still pending supplier action.`,
      },
      topReason && {
        tone: "neutral",
        text: `Most common reason: "${topReason.label}" (${topReason.value} of ${kpis.total}).`,
      },
      {
        tone: kpis.impact < 0 ? "negative" : "positive",
        text: `Performance impact this period: ${kpis.impact} pts.`,
      },
      openCount === 0 && {
        tone: "positive",
        text: "No open returns — all requests are closed.",
      },
    ]);
  }, [byReason, kpis]);

  // ── actions (frontend-only state mutations) ────────────────────────────────
  const applyStatus = (row, status) => ({
    ...row,
    status,
    resolvedOn:
      status === "resolved" || status === "rejected" ? todayIso() : null,
    refund:
      status === "resolved"
        ? "Refunded"
        : status === "rejected"
          ? "Denied"
          : status === "approved"
            ? "Credit note"
            : "Awaited",
  });

  const updateStatus = (id, status) => {
    setReturns((prev) =>
      prev.map((r) => (r.id === id ? applyStatus(r, status) : r)),
    );
    setDrill((d) => (d && d.id === id ? applyStatus(d, status) : d));
    toastSuccess(`Return ${id} marked ${STATUS_META[status]?.label || status}`);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const submitCreate = () => {
    if (!form.po.trim() || !form.supplier.trim() || !form.product.trim()) {
      setFormError("PO #, Supplier and Product are required.");
      return;
    }
    const qty = Number(form.qty) || 0;
    const unitPrice = Number(form.unitPrice) || 0;
    if (qty <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }
    const nextNum =
      returns.reduce((max, r) => {
        const n = Number(String(r.id).replace(/\D/g, "")) || 0;
        return Math.max(max, n);
      }, 0) + 1;
    const newRow = {
      id: `RET-${String(nextNum).padStart(3, "0")}`,
      po: form.po.trim(),
      supplier: form.supplier.trim(),
      product: form.product.trim(),
      category: form.category,
      qty,
      unitPrice,
      returnValue: qty * unitPrice,
      reason: form.reason,
      status: "pending",
      refund: "Awaited",
      raisedOn: todayIso(),
      resolvedOn: null,
      performanceImpact: -1,
      remark: form.remark.trim(),
    };
    setReturns((prev) => [newRow, ...prev]);
    toastSuccess(`Return ${newRow.id} created`);
    setCreateOpen(false);
    resetForm();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setReasonFilter("");
  };

  const hasFilters = search || statusFilter || reasonFilter;

  // ── table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "Return #",
        sortable: true,
        render: (r) => <span className="font-mono font-semibold">{r.id}</span>,
      },
      { key: "po", label: "PO #", sortable: true },
      {
        key: "supplier",
        label: "Supplier",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-medium">{r.supplier}</div>
            <div className="text-xs text-muted-foreground">{r.product}</div>
          </div>
        ),
      },
      {
        key: "qty",
        label: "Qty",
        align: "center",
        sortable: true,
        render: (r) => <span className="font-semibold">{r.qty}</span>,
      },
      {
        key: "returnValue",
        label: "Value",
        align: "right",
        sortable: true,
        exportValue: (r) => r.returnValue,
        render: (r) => formatINR(r.returnValue),
      },
      { key: "reason", label: "Reason" },
      {
        key: "raisedOn",
        label: "Raised On",
        sortable: true,
        align: "center",
        render: (r) => dateFormatter(r.raisedOn, "—"),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (r) => r.status,
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: "performanceImpact",
        label: "Impact",
        align: "right",
        sortable: true,
        render: (r) =>
          r.performanceImpact ? (
            <span className="font-medium text-destructive">
              {r.performanceImpact} pts
            </span>
          ) : (
            <span className="text-muted-foreground">0 pts</span>
          ),
      },
      {
        key: "actions",
        label: "Action",
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (r) => (
          <RowActions
            onView={() => setDrill(r)}
            viewLabel="View return"
            extra={
              <>
                {(r.status === "pending" || r.status === "approved") && (
                  <Tooltip content="Mark resolved">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-success!"
                      aria-label="Mark resolved"
                      onClick={() => updateStatus(r.id, "resolved")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}
                {r.status === "pending" && (
                  <Tooltip content="Reject return">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Reject return"
                      onClick={() => updateStatus(r.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}
                {(r.status === "resolved" || r.status === "rejected") && (
                  <Tooltip content="Reopen">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label="Reopen return"
                      onClick={() => updateStatus(r.id, "pending")}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}
              </>
            }
          />
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Return"
        description="Track goods returned to suppliers, their value, and performance impact."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Return
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SmartKpiCard
          title="Total Returns"
          value={formatNumber(kpis.total)}
          icon={RotateCcw}
          color="primary"
          footnote={`${kpis.totalQty} units`}
        />
        <SmartKpiCard
          title="Pending"
          value={formatNumber(kpis.pending)}
          icon={AlertTriangle}
          color="warning"
          footnote={`${kpis.approved} approved`}
        />
        <SmartKpiCard
          title="Resolved"
          value={formatNumber(kpis.resolved)}
          icon={CheckCircle2}
          color="success"
          footnote={`${kpis.rejected} rejected`}
        />
        <SmartKpiCard
          title="Return Value"
          value={formatINR(kpis.totalValue)}
          icon={IndianRupee}
          color="info"
          footnote="across all returns"
        />
        <SmartKpiCard
          title="Performance Impact"
          value={`${kpis.impact} pts`}
          icon={TrendingDown}
          color="danger"
          footnote="reduces your score"
        />
      </div>

      <InsightStrip insights={insights} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Returns by Status</CardTitle>
            <CardDescription>
              Current distribution · sample data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "280px" }}
              data={{
                labels: byStatus.map((s) => s.label),
                datasets: [
                  {
                    label: "Returns",
                    backgroundColor: byStatus.map((s) => s.color),
                    borderRadius: 6,
                    data: byStatus.map((s) => s.value),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Returns by Reason</CardTitle>
            <CardDescription>Why goods came back</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartDoughnut
              style={{ height: "280px" }}
              data={{
                labels: byReason.map((r) => r.label),
                datasets: [
                  {
                    data: byReason.map((r) => r.value),
                    backgroundColor: byReason.map((r) => r.color),
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
            <CardTitle>All Returns</CardTitle>
            <CardDescription>
              Showing {filtered.length} of {returns.length}
            </CardDescription>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="space-y-1.5">
              <Label>Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Return #, PO, supplier, product…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
              >
                <option value="">All reasons</option>
                {purchaseReturnReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.id}
            showSearch={false}
            maxHeight="none"
            exportFileName="purchase-returns"
            onRowClick={(r) => setDrill(r)}
            emptyTitle="No returns found"
            emptyMessage="Try changing filters or create a new return."
          />
        </CardContent>
      </Card>

      {/* Detail drilldown */}
      <DrilldownSheet
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drill ? `Return ${drill.id}` : ""}
        description={drill ? drill.product : ""}
      >
        {drill && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={drill.status} />
              <Badge variant="secondary">{drill.reason}</Badge>
              <Badge variant="secondary">{drill.category}</Badge>
            </div>

            <div className="rounded-lg border border-border">
              <div className="px-3">
                <DrillRow label="PO #" value={drill.po} />
                <DrillRow label="Supplier" value={drill.supplier} strong />
                <DrillRow label="Product" value={drill.product} />
                <DrillRow label="Quantity" value={`${drill.qty}`} />
                <DrillRow
                  label="Unit Price"
                  value={formatINR(drill.unitPrice)}
                />
                <DrillRow
                  label="Return Value"
                  value={formatINR(drill.returnValue)}
                  strong
                />
                <DrillRow label="Refund" value={drill.refund || "—"} />
                <DrillRow
                  label="Raised On"
                  value={dateFormatter(drill.raisedOn, "—")}
                />
                <DrillRow
                  label="Resolved On"
                  value={dateFormatter(drill.resolvedOn, "—")}
                />
                <DrillRow
                  label="Performance Impact"
                  value={`${drill.performanceImpact} pts`}
                />
              </div>
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

            <div className="flex flex-wrap gap-2 pt-1">
              {(drill.status === "pending" || drill.status === "approved") && (
                <Button
                  size="sm"
                  onClick={() => updateStatus(drill.id, "resolved")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Resolved
                </Button>
              )}
              {drill.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(drill.id, "approved")}
                >
                  Approve
                </Button>
              )}
              {drill.status === "pending" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateStatus(drill.id, "rejected")}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              )}
              {(drill.status === "resolved" || drill.status === "rejected") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus(drill.id, "pending")}
                >
                  <Undo2 className="h-4 w-4" />
                  Reopen
                </Button>
              )}
            </div>
          </>
        )}
      </DrilldownSheet>

      {/* Create return dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div>
              <DialogTitle>New Purchase Return</DialogTitle>
              <DialogDescription>
                Raise a return against a purchase order.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>PO #</Label>
                <Input
                  placeholder="PO-3341"
                  value={form.po}
                  onChange={(e) => setForm({ ...form, po: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select
                  value={form.supplier}
                  onChange={(e) =>
                    setForm({ ...form, supplier: e.target.value })
                  }
                >
                  <option value="">Select supplier…</option>
                  {purchaseReturnSuppliers.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Product</Label>
              <Input
                placeholder="Product name"
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Packaging Material">Packaging Material</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.unitPrice}
                  onChange={(e) =>
                    setForm({ ...form, unitPrice: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              >
                {purchaseReturnReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Remark</Label>
              <Textarea
                rows={2}
                placeholder="Optional note about this return…"
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
              />
            </div>

            {(Number(form.qty) > 0 || Number(form.unitPrice) > 0) && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Return value</span>
                <span className="font-semibold">
                  {formatINR(
                    (Number(form.qty) || 0) * (Number(form.unitPrice) || 0),
                  )}
                </span>
              </div>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitCreate}>
              <Plus className="h-4 w-4" />
              Create Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseReturnDashboard;
