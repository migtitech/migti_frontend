import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CFormSelect,
  CFormInput,
  CFormLabel,
  CButton,
  CWidgetStatsF,
  CProgress,
  CNav,
  CNavItem,
  CNavLink,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CPagination,
  CPaginationItem,
  CSpinner,
} from "@coreui/react";
import { CChartBar, CChartDoughnut, CChartLine } from "@coreui/react-chartjs";
import CIcon from "@coreui/icons-react";
import {
  cilBasket,
  cilLayers,
  cilDescription,
  cilCart,
  cilMoney,
  cilTruck,
  cilClock,
} from "@coreui/icons";
import hodDashboardService from "../../services/hodDashboardService";
import branchService from "../../services/branchService";
import { Loader } from "../../components";
import { toastError } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";

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
  `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

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

const extractList = (response, key) => {
  const body = response?.data ?? response;
  const nested = body?.data ?? body;
  if (Array.isArray(nested?.[key])) return nested[key];
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(nested)) return nested;
  return [];
};

const HodDashboard = () => {
  const { user } = useAuth();

  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
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
    const loadBranches = async () => {
      try {
        const res = await branchService.getAll({
          pageNumber: 1,
          pageSize: 100,
        });
        setBranches(
          extractList(res, "branches").map((b) => ({
            id: b._id || b.id,
            name: b.name || b.branchcode || b._id || b.id,
          })),
        );
      } catch (err) {
        toastError(err?.message || "Failed to load branches");
      }
    };
    loadBranches();
  }, []);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await hodDashboardService.getOverview({
        branchId: branchId || undefined,
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
  }, [branchId, period, dateFrom, dateTo]);

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
  }, [statusFilter, branchId, dateFrom, dateTo, period]);

  useEffect(() => {
    const loadPending = async () => {
      setLoadingPending(true);
      try {
        const res = await hodDashboardService.getPendingItems({
          type: activeType,
          status: statusFilter || undefined,
          search: search || undefined,
          branchId: branchId || undefined,
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
    branchId,
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
        icon: cilDescription,
        tab: "quotations",
      },
      {
        title: "Sales Orders to Approve",
        value: kpis.posAwaitingApproval ?? 0,
        color: "primary",
        icon: cilCart,
        tab: "purchase_orders",
      },
      {
        title: "Pro Bucket Rates",
        value: kpis.proBucketPendingApproval ?? 0,
        color: "warning",
        icon: cilBasket,
        tab: "pro_bucket",
      },
      {
        title: "HOD Rate Approvals",
        value: kpis.pendingHodRates ?? 0,
        color: "secondary",
        icon: cilLayers,
        tab: "pro_bucket",
      },
      {
        title: "Billing Requests",
        value: kpis.billingRequestsPending ?? 0,
        color: "success",
        icon: cilMoney,
        tab: "billing_requests",
      },
      {
        title: "Delivery Approvals",
        value: kpis.deliveryApprovalsPending ?? 0,
        color: "danger",
        icon: cilTruck,
        tab: "deliveries",
      },
      {
        title: "Payment Backlog",
        value: kpis.paymentBacklogCount ?? 0,
        color: "dark",
        icon: cilClock,
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
          <CTableRow key={key}>
            <CTableDataCell>{sn}</CTableDataCell>
            <CTableDataCell>{row.code || "-"}</CTableDataCell>
            <CTableDataCell>{row.company || "-"}</CTableDataCell>
            <CTableDataCell>{formatAmount(row.amount)}</CTableDataCell>
            <CTableDataCell>
              <CBadge color="info">{row.status || "-"}</CBadge>
            </CTableDataCell>
            <CTableDataCell>{formatDate(row.createdAt)}</CTableDataCell>
          </CTableRow>
        );
      case "pro_bucket":
        return (
          <CTableRow key={key}>
            <CTableDataCell>{sn}</CTableDataCell>
            <CTableDataCell>{row.code || "-"}</CTableDataCell>
            <CTableDataCell>{row.productName || "-"}</CTableDataCell>
            <CTableDataCell>
              {row.quantity ?? "-"} {row.unit || ""}
            </CTableDataCell>
            <CTableDataCell>{row.ratesCount ?? 0} rates</CTableDataCell>
            <CTableDataCell>
              <CBadge color="warning">{row.status || "-"}</CBadge>
            </CTableDataCell>
            <CTableDataCell>{formatDate(row.createdAt)}</CTableDataCell>
          </CTableRow>
        );
      case "billing_requests":
        return (
          <CTableRow key={key}>
            <CTableDataCell>{sn}</CTableDataCell>
            <CTableDataCell>{row.code || "-"}</CTableDataCell>
            <CTableDataCell>{row.poCode || "-"}</CTableDataCell>
            <CTableDataCell>{row.productCount ?? 0}</CTableDataCell>
            <CTableDataCell>{formatAmount(row.amount)}</CTableDataCell>
            <CTableDataCell>
              <CBadge color="success">{row.status || "-"}</CBadge>
            </CTableDataCell>
            <CTableDataCell>{formatDate(row.createdAt)}</CTableDataCell>
          </CTableRow>
        );
      case "deliveries":
        return (
          <CTableRow key={key}>
            <CTableDataCell>{sn}</CTableDataCell>
            <CTableDataCell>{row.code || "-"}</CTableDataCell>
            <CTableDataCell>{row.productName || "-"}</CTableDataCell>
            <CTableDataCell>{row.company || "-"}</CTableDataCell>
            <CTableDataCell>
              {row.quantity ?? "-"} {row.unit || ""}
            </CTableDataCell>
            <CTableDataCell>
              <CBadge color="danger">{row.status || "-"}</CBadge>
            </CTableDataCell>
            <CTableDataCell>{formatDate(row.createdAt)}</CTableDataCell>
          </CTableRow>
        );
      default:
        return null;
    }
  };

  const tableHeaders = {
    quotations: ["S No", "Quotation", "Company", "Amount", "Status", "Date"],
    purchase_orders: ["S No", "Sales Order Code", "Company", "Amount", "Status", "Date"],
    pro_bucket: ["S No", "Query", "Product", "Qty", "Rates", "Status", "Date"],
    billing_requests: [
      "S No",
      "Request",
      "Sales Order Code",
      "Products",
      "Amount",
      "Status",
      "Date",
    ],
    deliveries: [
      "S No",
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
    <CRow>
      <CCol xs={12}>
        {/* Header + filters */}
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <strong>HOD Dashboard</strong>
              <div className="small text-body-secondary">
                Welcome{user?.name ? `, ${user.name}` : ""} — pending approvals
                &amp; department analytics
              </div>
            </div>
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              onClick={loadOverview}
              disabled={loadingOverview}
            >
              {loadingOverview ? <CSpinner size="sm" /> : "Refresh"}
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 align-items-end">
              <CCol md={3}>
                <CFormLabel className="small text-muted mb-1">
                  Branch
                </CFormLabel>
                <CFormSelect
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel className="small text-muted mb-1">
                  Period
                </CFormLabel>
                <CFormSelect
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
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel className="small text-muted mb-1">From</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel className="small text-muted mb-1">To</CFormLabel>
                <CFormInput
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {loadingOverview && !overview ? (
          <div className="text-center py-5">
            <Loader message="Loading HOD dashboard..." />
          </div>
        ) : (
          <>
            {/* Pending action KPIs */}
            <CRow className="g-3 mb-2">
              {kpiCards.map((card) => (
                <CCol key={card.title} sm={6} lg={3} xl={3}>
                  <div
                    role={card.tab ? "button" : undefined}
                    onClick={
                      card.tab ? () => setActiveType(card.tab) : undefined
                    }
                    style={card.tab ? { cursor: "pointer" } : undefined}
                  >
                    <CWidgetStatsF
                      className="mb-3"
                      color={card.color}
                      icon={<CIcon icon={card.icon} height={24} />}
                      title={card.title}
                      value={String(card.value)}
                      footer={card.subtitle}
                    />
                  </div>
                </CCol>
              ))}
            </CRow>

            {/* Targets vs achievement */}
            <CRow className="g-3 mb-4">
              <CCol md={6}>
                <CCard className="h-100 border-0 shadow-sm">
                  <CCardHeader className="bg-light">
                    <strong>Weekly Target vs Billing</strong>
                  </CCardHeader>
                  <CCardBody>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-body-secondary">
                        {formatAmount(financials.weeklyBilling)} achieved
                      </span>
                      <span className="fw-semibold">
                        {formatAmount(financials.weeklyTarget)} target
                      </span>
                    </div>
                    <CProgress
                      className="mb-3"
                      value={progressPct(
                        financials.weeklyBilling,
                        financials.weeklyTarget,
                      )}
                      color="info"
                    />
                    <div className="d-flex justify-content-between">
                      <span className="text-body-secondary">
                        {formatAmount(financials.monthlyBilling)} achieved
                      </span>
                      <span className="fw-semibold">
                        {formatAmount(financials.monthlyTarget)} monthly target
                      </span>
                    </div>
                    <CProgress
                      className="mt-1"
                      value={progressPct(
                        financials.monthlyBilling,
                        financials.monthlyTarget,
                      )}
                      color="success"
                    />
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={6}>
                <CCard className="h-100 border-0 shadow-sm">
                  <CCardHeader className="bg-light">
                    <strong>Amounts (selected range)</strong>
                  </CCardHeader>
                  <CCardBody>
                    <CRow className="text-center g-3">
                      <CCol xs={6} md={3}>
                        <div className="small text-body-secondary">Quoted</div>
                        <div className="fs-6 fw-semibold">
                          {formatAmount(financials.quotedAmount)}
                        </div>
                      </CCol>
                      <CCol xs={6} md={3}>
                        <div className="small text-body-secondary">
                          Sales Order Value
                        </div>
                        <div className="fs-6 fw-semibold">
                          {formatAmount(financials.poAmount)}
                        </div>
                      </CCol>
                      <CCol xs={6} md={3}>
                        <div className="small text-body-secondary">Billed</div>
                        <div className="fs-6 fw-semibold">
                          {formatAmount(financials.billingAmount)}
                        </div>
                      </CCol>
                      <CCol xs={6} md={3}>
                        <div className="small text-body-secondary">Backlog</div>
                        <div className="fs-6 fw-semibold text-danger">
                          {formatAmount(financials.paymentBacklogAmount)}
                        </div>
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            {/* Charts */}
            <CRow className="g-3 mb-4">
              <CCol md={8}>
                <CCard className="h-100 border-0 shadow-sm">
                  <CCardHeader className="bg-light">
                    <strong>Pipeline Funnel</strong>
                  </CCardHeader>
                  <CCardBody>
                    <CChartBar
                      data={pipelineChart}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                      }}
                    />
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={4}>
                <CCard className="h-100 border-0 shadow-sm">
                  <CCardHeader className="bg-light">
                    <strong>Quotation Status</strong>
                  </CCardHeader>
                  <CCardBody>
                    {(charts.quotationStatus || []).length ? (
                      <CChartDoughnut
                        data={statusDoughnut(charts.quotationStatus)}
                        options={{
                          responsive: true,
                          plugins: { legend: { position: "bottom" } },
                        }}
                      />
                    ) : (
                      <p className="text-center text-body-secondary mb-0">
                        No data
                      </p>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            <CRow className="g-3 mb-4">
              <CCol md={8}>
                <CCard className="h-100 border-0 shadow-sm">
                  <CCardHeader className="bg-light">
                    <strong>Billing Trend</strong>
                  </CCardHeader>
                  <CCardBody>
                    {(charts.billingTrend || []).length ? (
                      <CChartLine
                        data={billingTrendChart}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true } },
                        }}
                      />
                    ) : (
                      <p className="text-center text-body-secondary mb-0">
                        No billing in selected range
                      </p>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={4}>
                <CCard className="h-100 border-0 shadow-sm">
                  <CCardHeader className="bg-light">
                    <strong>Sales Order Status</strong>
                  </CCardHeader>
                  <CCardBody>
                    {(charts.poStatus || []).length ? (
                      <CChartDoughnut
                        data={statusDoughnut(charts.poStatus)}
                        options={{
                          responsive: true,
                          plugins: { legend: { position: "bottom" } },
                        }}
                      />
                    ) : (
                      <p className="text-center text-body-secondary mb-0">
                        No data
                      </p>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            {/* Pending action queues */}
            <CCard className="mb-4 border-0 shadow-sm">
              <CCardHeader className="bg-light">
                <strong>Pending Actions</strong>
              </CCardHeader>
              <CCardBody>
                <CNav variant="tabs" className="mb-3">
                  {PENDING_TABS.map((tab) => (
                    <CNavItem key={tab.key}>
                      <CNavLink
                        active={activeType === tab.key}
                        onClick={() => setActiveType(tab.key)}
                        style={{ cursor: "pointer" }}
                      >
                        {tab.label}
                      </CNavLink>
                    </CNavItem>
                  ))}
                </CNav>

                <CRow className="g-3 mb-3 align-items-end">
                  <CCol md={4}>
                    <CFormLabel className="small text-muted mb-1">
                      Status
                    </CFormLabel>
                    <CFormSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      {(STATUS_OPTIONS[activeType] || []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel className="small text-muted mb-1">
                      Search
                    </CFormLabel>
                    <CFormInput
                      placeholder="Code / product..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </CCol>
                </CRow>

                {loadingPending ? (
                  <div className="text-center py-4">
                    <Loader message="Loading..." />
                  </div>
                ) : (
                  <>
                    <CTable hover responsive bordered align="middle">
                      <CTableHead>
                        <CTableRow>
                          {(tableHeaders[activeType] || []).map((h) => (
                            <CTableHeaderCell key={h}>{h}</CTableHeaderCell>
                          ))}
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {pending.rows.length ? (
                          pending.rows.map((row, idx) => renderRow(row, idx))
                        ) : (
                          <CTableRow>
                            <CTableDataCell
                              colSpan={(tableHeaders[activeType] || []).length}
                              className="text-center text-body-secondary"
                            >
                              No pending items found.
                            </CTableDataCell>
                          </CTableRow>
                        )}
                      </CTableBody>
                    </CTable>

                    {totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div className="small text-medium-emphasis">
                          {pending.pagination?.totalItems ?? 0} total
                        </div>
                        <CPagination className="mb-0">
                          <CPaginationItem
                            disabled={safePage <= 1}
                            onClick={() => setPage(Math.max(1, safePage - 1))}
                          >
                            Previous
                          </CPaginationItem>
                          <CPaginationItem active>
                            {safePage} / {totalPages}
                          </CPaginationItem>
                          <CPaginationItem
                            disabled={safePage >= totalPages}
                            onClick={() =>
                              setPage(Math.min(totalPages, safePage + 1))
                            }
                          >
                            Next
                          </CPaginationItem>
                        </CPagination>
                      </div>
                    )}
                  </>
                )}
              </CCardBody>
            </CCard>
          </>
        )}
      </CCol>
    </CRow>
  );
};

export default HodDashboard;
