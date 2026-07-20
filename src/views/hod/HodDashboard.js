import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CChartBar, CChartDoughnut, CChartLine } from "@coreui/react-chartjs";
import {
  ShoppingBasket,
  Layers,
  FileText,
  ShoppingCart,
  DollarSign,
  Truck,
  Clock,
  PieChart,
  LineChart as LineChartIcon,
  BarChart3,
} from "lucide-react";
import hodDashboardService from "../../services/hodDashboardService";
import areaService from "../../services/areaService";
import { Loader, TablePagination, StatCard } from "../../components";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Select,
  Input,
  Label,
  Progress,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { toastError } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import { dateFormatter } from "../../utils/dateFormatter";

const PERIOD_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "daily", label: "Today" },
  { value: "weekly", label: "Last 7 days" },
  { value: "monthly", label: "This month" },
  { value: "yearly", label: "This year" },
];

const PENDING_TABS = [
  { key: "quotations", label: "Quotations" },
  { key: "purchase_orders", label: "Sales Orders" },
  { key: "pro_bucket", label: "Pro Bucket" },
  { key: "billing_requests", label: "Billing Requests" },
  { key: "deliveries", label: "Deliveries" },
];

const STATUS_OPTIONS = {
  quotations: [
    { value: "", label: "Awaiting HOD (default)" },
    { value: "fulfilled", label: "Fulfilled" },
    { value: "ready", label: "Ready" },
    { value: "hod_approved", label: "HOD Approved" },
    { value: "sentToClient", label: "Sent to Client" },
    { value: "draft", label: "Draft" },
    { value: "closed", label: "Closed" },
  ],
  purchase_orders: [
    { value: "", label: "Awaiting HOD (default)" },
    { value: "draft", label: "Draft" },
    { value: "confirmed", label: "Confirmed" },
    { value: "fulfilled", label: "Fulfilled" },
    { value: "hod_approved", label: "HOD Approved" },
    { value: "closed", label: "Closed" },
    { value: "cancelled", label: "Cancelled" },
  ],
  pro_bucket: [
    { value: "", label: "Fulfilled, not approved (default)" },
    { value: "rate_submitted", label: "Rate Submitted" },
    { value: "fulfilled", label: "Fulfilled" },
    { value: "pending", label: "Pending" },
  ],
  billing_requests: [
    { value: "", label: "HOD approval pending (default)" },
    { value: "hod_approval_pending", label: "HOD Approval Pending" },
    { value: "hod_approved", label: "HOD Approved" },
    { value: "hod_rejected", label: "HOD Rejected" },
    { value: "finance_approved", label: "Finance Approved" },
  ],
  deliveries: [
    { value: "", label: "HOD approval pending (default)" },
    { value: "hod_approval_pending", label: "HOD Approval Pending" },
    { value: "delivery_approved_by_hod", label: "Approved by HOD" },
  ],
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const progressPct = (achieved, target) => {
  const t = Number(target || 0);
  if (t <= 0) return 0;
  return Math.min(100, Math.round((Number(achieved || 0) / t) * 100));
};

const CHART_COLORS = [
  "#321fdb",
  "#39f",
  "#2eb85c",
  "#f9b115",
  "#e55353",
  "#6f42c1",
  "#20c997",
  "#fd7e14",
  "#6c757d",
  "#0dcaf0",
];

const ChartEmpty = ({ icon: Icon = BarChart3, message = "No data" }) => (
  <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
    <Icon className="h-8 w-8 opacity-40" strokeWidth={1.5} />
    <p className="text-sm">{message}</p>
  </div>
);

const extractList = (response, key) => {
  const body = response?.data ?? response;
  const nested = body?.data ?? body;
  if (Array.isArray(nested?.[key])) return nested[key];
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(nested)) return nested;
  return [];
};

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const HodDashboard = () => {
  const { user } = useAuth();

  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [activeType, setActiveType] = useState("quotations");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState({ rows: [], pagination: null });
  const [loadingPending, setLoadingPending] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [zonesRes] = await Promise.all([
          areaService.getAll({ pageNumber: 1, pageSize: 100 }),
        ]);
        const zoneData = zonesRes?.data?.data || zonesRes?.data || zonesRes;
        setZones(
          (zoneData?.areas || zoneData || []).map((zone) => ({
            id: zone._id || zone.id,
            name: zone.name || zone._id || zone.id,
          })),
        );
      } catch (err) {
        toastError(err?.message || "Failed to load branches");
      }
    };
    loadMasterData();
  }, []);

  const zoneOptions = useMemo(() => zones, [zones]);

  useEffect(() => {
    if (!zoneId) return;
    const zoneStillValid = zoneOptions.some(
      (zone) => String(zone.id) === String(zoneId),
    );
    if (!zoneStillValid) setZoneId("");
  }, [zoneId, zoneOptions]);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await hodDashboardService.getOverview({
        zoneId: zoneId || undefined,
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setOverview(res?.data ?? null);
    } catch (err) {
      toastError(err?.message || "Failed to load HOD dashboard");
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }, [zoneId, period, dateFrom, dateTo]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    setPage(1);
    setStatusFilter("");
    setSearch("");
  }, [activeType]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, zoneId, dateFrom, dateTo, period]);

  useEffect(() => {
    const loadPending = async () => {
      setLoadingPending(true);
      try {
        const res = await hodDashboardService.getPendingItems({
          type: activeType,
          status: statusFilter || undefined,
          search: search || undefined,
          zoneId: zoneId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          pageNumber: page,
          pageSize,
        });
        const data = res?.data ?? {};
        setPending({
          rows: data.rows || [],
          pagination: data.pagination || null,
        });
      } catch (err) {
        setPending({ rows: [], pagination: null });
        toastError(err?.message || "Failed to load pending items");
      } finally {
        setLoadingPending(false);
      }
    };
    const t = setTimeout(loadPending, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [
    activeType,
    statusFilter,
    search,
    zoneId,
    dateFrom,
    dateTo,
    period,
    page,
  ]);

  const kpis = useMemo(() => overview?.kpis || {}, [overview]);
  const financials = useMemo(() => overview?.financials || {}, [overview]);
  const pipeline = useMemo(() => overview?.pipeline || {}, [overview]);
  const charts = useMemo(() => overview?.charts || {}, [overview]);

  const kpiCards = useMemo(
    () => [
      {
        title: "Quotations to Approve",
        value: kpis.quotationsAwaitingApproval ?? 0,
        color: "info",
        icon: FileText,
        tab: "quotations",
      },
      {
        title: "Sales Orders to Approve",
        value: kpis.posAwaitingApproval ?? 0,
        color: "primary",
        icon: ShoppingCart,
        tab: "purchase_orders",
      },
      {
        title: "Pro Bucket Rates",
        value: kpis.proBucketPendingApproval ?? 0,
        color: "warning",
        icon: ShoppingBasket,
        tab: "pro_bucket",
      },
      {
        title: "HOD Rate Approvals",
        value: kpis.pendingHodRates ?? 0,
        color: "secondary",
        icon: Layers,
        tab: "pro_bucket",
      },
      {
        title: "Billing Requests",
        value: kpis.billingRequestsPending ?? 0,
        color: "success",
        icon: DollarSign,
        tab: "billing_requests",
      },
      {
        title: "Delivery Approvals",
        value: kpis.deliveryApprovalsPending ?? 0,
        color: "danger",
        icon: Truck,
        tab: "deliveries",
      },
      {
        title: "Payment Backlog",
        value: kpis.paymentBacklogCount ?? 0,
        color: "dark",
        icon: Clock,
        subtitle: formatAmount(kpis.paymentBacklogAmount),
        tab: null,
      },
    ],
    [kpis],
  );

  const pipelineChart = useMemo(
    () => ({
      labels: ["Queries", "Quotations", "Sales Orders", "Billings"],
      datasets: [
        {
          label: "Count",
          backgroundColor: ["#321fdb", "#39f", "#2eb85c", "#f9b115"],
          borderRadius: 6,
          data: [
            Number(pipeline.queries || 0),
            Number(pipeline.quotations || 0),
            Number(pipeline.purchaseOrders || 0),
            Number(pipeline.billings || 0),
          ],
        },
      ],
    }),
    [pipeline],
  );

  const billingTrendChart = useMemo(() => {
    const trend = charts.billingTrend || [];
    return {
      labels: trend.map((t) => t.label),
      datasets: [
        {
          label: "Billing",
          backgroundColor: "rgba(50,31,219,0.1)",
          borderColor: "#321fdb",
          pointBackgroundColor: "#321fdb",
          fill: true,
          tension: 0.3,
          data: trend.map((t) => Number(t.amount || 0)),
        },
      ],
    };
  }, [charts.billingTrend]);

  const statusDoughnut = (rows = []) => ({
    labels: rows.map((r) => r.status),
    datasets: [
      {
        backgroundColor: rows.map(
          (_, i) => CHART_COLORS[i % CHART_COLORS.length],
        ),
        data: rows.map((r) => Number(r.count || 0)),
      },
    ],
  });

  const renderRow = (row, index) => {
    const safePage = pending.pagination?.currentPage || page;
    const sn = (safePage - 1) * pageSize + index + 1;
    const key = row.id || row._id || index;
    switch (activeType) {
      case "quotations":
      case "purchase_orders":
        return (
          <TableRow key={key}>
            <TableCell>{sn}</TableCell>
            <TableCell>{row.code || "-"}</TableCell>
            <TableCell>{row.company || "-"}</TableCell>
            <TableCell>{formatAmount(row.amount)}</TableCell>
            <TableCell>
              <Badge variant="info">{row.status || "-"}</Badge>
            </TableCell>
            <TableCell>{dateFormatter(row.createdAt, "-")}</TableCell>
          </TableRow>
        );
      case "pro_bucket":
        return (
          <TableRow key={key}>
            <TableCell>{sn}</TableCell>
            <TableCell>{row.code || "-"}</TableCell>
            <TableCell>{row.productName || "-"}</TableCell>
            <TableCell>
              {row.quantity ?? "-"} {row.unit || ""}
            </TableCell>
            <TableCell>{row.ratesCount ?? 0} rates</TableCell>
            <TableCell>
              <Badge variant="warning">{row.status || "-"}</Badge>
            </TableCell>
            <TableCell>{dateFormatter(row.createdAt, "-")}</TableCell>
          </TableRow>
        );
      case "billing_requests":
        return (
          <TableRow key={key}>
            <TableCell>{sn}</TableCell>
            <TableCell>{row.code || "-"}</TableCell>
            <TableCell>{row.poCode || "-"}</TableCell>
            <TableCell>{row.productCount ?? 0}</TableCell>
            <TableCell>{formatAmount(row.amount)}</TableCell>
            <TableCell>
              <Badge variant="success">{row.status || "-"}</Badge>
            </TableCell>
            <TableCell>{dateFormatter(row.createdAt, "-")}</TableCell>
          </TableRow>
        );
      case "deliveries":
        return (
          <TableRow key={key}>
            <TableCell>{sn}</TableCell>
            <TableCell>{row.code || "-"}</TableCell>
            <TableCell>{row.productName || "-"}</TableCell>
            <TableCell>{row.company || "-"}</TableCell>
            <TableCell>
              {row.quantity ?? "-"} {row.unit || ""}
            </TableCell>
            <TableCell>
              <Badge variant="destructive">{row.status || "-"}</Badge>
            </TableCell>
            <TableCell>{dateFormatter(row.createdAt, "-")}</TableCell>
          </TableRow>
        );
      default:
        return null;
    }
  };

  const tableHeaders = {
    quotations: ["#", "Quotation", "Company", "Amount", "Status", "Date"],
    purchase_orders: [
      "#",
      "Sales Order Code",
      "Company",
      "Amount",
      "Status",
      "Date",
    ],
    pro_bucket: ["#", "Query", "Product", "Qty", "Rates", "Status", "Date"],
    billing_requests: [
      "#",
      "Request",
      "Sales Order Code",
      "Products",
      "Amount",
      "Status",
      "Date",
    ],
    deliveries: [
      "#",
      "Sales Order Code",
      "Product",
      "Company",
      "Qty",
      "Status",
      "Date",
    ],
  };

  const totalPages = pending.pagination?.totalPages || 1;
  const safePage = pending.pagination?.currentPage || page;

  return (
    <div>
      {/* Header + filters */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>HOD Dashboard</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              Welcome{user?.name ? `, ${user.name}` : ""} — pending approvals
              &amp; department analytics
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadOverview}
            disabled={loadingOverview}
          >
            {loadingOverview ? <Spinner size="sm" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Zone</Label>
              <Select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
              >
                <option value="">All zones</option>
                {zoneOptions.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Period</Label>
              <Select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingOverview && !overview ? (
        <div className="py-5 text-center">
          <Loader message="Loading HOD dashboard..." />
        </div>
      ) : (
        <>
          {/* Pending action KPIs */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpiCards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={String(card.value)}
                subtitle={card.subtitle}
                icon={card.icon}
                color={card.color}
                onClick={card.tab ? () => setActiveType(card.tab) : undefined}
              />
            ))}
          </div>

          {/* Targets vs achievement */}
          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Target vs Billing</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-1 flex justify-between">
                  <span className="text-muted-foreground">
                    {formatAmount(financials.weeklyBilling)} achieved
                  </span>
                  <span className="font-semibold">
                    {formatAmount(financials.weeklyTarget)} target
                  </span>
                </div>
                <Progress
                  className="mb-3"
                  value={progressPct(
                    financials.weeklyBilling,
                    financials.weeklyTarget,
                  )}
                  color="info"
                />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {formatAmount(financials.monthlyBilling)} achieved
                  </span>
                  <span className="font-semibold">
                    {formatAmount(financials.monthlyTarget)} monthly target
                  </span>
                </div>
                <Progress
                  className="mt-1"
                  value={progressPct(
                    financials.monthlyBilling,
                    financials.monthlyTarget,
                  )}
                  color="success"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Amounts (selected range)</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Quoted</div>
                    <div className="font-semibold">
                      {formatAmount(financials.quotedAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Sales Order Value
                    </div>
                    <div className="font-semibold">
                      {formatAmount(financials.poAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Billed</div>
                    <div className="font-semibold">
                      {formatAmount(financials.billingAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Backlog</div>
                    <div className="font-semibold text-destructive">
                      {formatAmount(financials.paymentBacklogAmount)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Pipeline Funnel</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[260px]">
                  {pipelineChart.datasets[0].data.some((v) => Number(v) > 0) ? (
                    <CChartBar
                      style={{ height: "260px" }}
                      data={pipelineChart}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                      }}
                    />
                  ) : (
                    <ChartEmpty
                      icon={BarChart3}
                      message="No pipeline activity in this range"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quotation Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex h-[260px] items-center justify-center">
                  {(charts.quotationStatus || []).length ? (
                    <CChartDoughnut
                      style={{ height: "260px" }}
                      data={statusDoughnut(charts.quotationStatus)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: "bottom" } },
                      }}
                    />
                  ) : (
                    <ChartEmpty icon={PieChart} message="No quotation data" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Billing Trend</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[260px]">
                  {(charts.billingTrend || []).length ? (
                    <CChartLine
                      style={{ height: "260px" }}
                      data={billingTrendChart}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } },
                      }}
                    />
                  ) : (
                    <ChartEmpty
                      icon={LineChartIcon}
                      message="No billing in this range"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sales Order Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex h-[260px] items-center justify-center">
                  {(charts.poStatus || []).length ? (
                    <CChartDoughnut
                      style={{ height: "260px" }}
                      data={statusDoughnut(charts.poStatus)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: "bottom" } },
                      }}
                    />
                  ) : (
                    <ChartEmpty icon={PieChart} message="No sales-order data" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending action queues */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pending Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs
                value={activeType}
                onValueChange={setActiveType}
                className="mb-3"
              >
                <TabsList>
                  {PENDING_TABS.map((tab) => (
                    <TabsTrigger key={tab.key} value={tab.key}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="mb-3 grid grid-cols-1 items-end gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {(STATUS_OPTIONS[activeType] || []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">
                    Search
                  </Label>
                  <Input
                    placeholder="Code / product…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingPending ? (
                <div className="py-4 text-center">
                  <Loader message="Loading..." />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {(tableHeaders[activeType] || []).map((h) => (
                          <TableHead key={h}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pending.rows.length ? (
                        pending.rows.map((row, idx) => renderRow(row, idx))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={(tableHeaders[activeType] || []).length}
                            className="text-center text-muted-foreground"
                          >
                            No pending items found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    wrapperClassName="d-flex justify-content-center mt-4"
                    align="center"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default HodDashboard;
