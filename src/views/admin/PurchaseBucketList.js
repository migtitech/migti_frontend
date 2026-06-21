import React, { useEffect, useState } from "react";
import {
  EyeIcon,
  Loader,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { useNavigate } from "react-router-dom";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBasket, cilPlus, cilSearch } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBucketService from "../../services/purchaseBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const queryCodeLast4 = (code) => {
  const s = code != null ? String(code).trim() : "";
  if (!s) return null;
  return s.length <= 4 ? s : s.slice(-4);
};

const getPriorityRowBg = (priority) => {
  const p = String(priority || "medium").toLowerCase();
  switch (p) {
    case "low":
      return "#d4edda";
    case "medium":
      return "#ffe8cc";
    case "high":
      return "#f8d7da";
    default:
      return null;
  }
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  pending: { label: "Open", color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  hod_approval_pending: {
    label: "HOD Pending",
    color: "#d97706",
    bg: "#fffbeb",
    dot: "#f59e0b",
  },
  billing_request_raised: {
    label: "BR Raised",
    color: "#0891b2",
    bg: "#ecfeff",
    dot: "#06b6d4",
  },
  payment_request_raised: {
    label: "Payment Requested",
    color: "#0891b2",
    bg: "#ecfeff",
    dot: "#06b6d4",
  },
  finance_approved: {
    label: "Finance Approved",
    color: "#7c3aed",
    bg: "#f5f3ff",
    dot: "#8b5cf6",
  },
  billing_request_rejected: {
    label: "Rejected",
    color: "#dc2626",
    bg: "#fef2f2",
    dot: "#ef4444",
  },
  purchased: {
    label: "Purchased",
    color: "#16a34a",
    bg: "#f0fdf4",
    dot: "#22c55e",
  },
  inventory_received: {
    label: "Inventory Received",
    color: "#0369a1",
    bg: "#e0f2fe",
    dot: "#0ea5e9",
  },
  ready_for_dispatchment: {
    label: "Ready to Dispatch",
    color: "#15803d",
    bg: "#dcfce7",
    dot: "#22c55e",
  },
  delivered: {
    label: "Delivered",
    color: "#15803d",
    bg: "#f0fdf4",
    dot: "#22c55e",
  },
  po_closed: {
    label: "Sales Order Closed",
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  },
};

const PRIORITY_CONFIG = {
  high: { label: "High", color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
  medium: { label: "Medium", color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  low: { label: "Low", color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
};

const StatusPill = ({ status }) => {
  const raw =
    status != null && String(status).trim() !== ""
      ? String(status).trim()
      : "pending";
  const cfg = STATUS_CONFIG[raw] || {
    label: raw,
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}25`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
};

const PriorityPill = ({ priority }) => {
  const raw =
    priority != null && String(priority).trim() !== ""
      ? String(priority).trim().toLowerCase()
      : "medium";
  const cfg = PRIORITY_CONFIG[raw] || {
    label: raw.charAt(0).toUpperCase() + raw.slice(1),
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}25`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
};

const PURCHASE_BUCKET_FILTER_DEFAULTS = { priority: "" };

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object")
    return { list: [], total: 0, pendingCount: 0 };
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    pendingCount: block.pendingCount ?? 0,
  };
};

// ─── component ────────────────────────────────────────────────────────────────

const PurchaseBucketList = () => {
  const navigate = useNavigate();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "purchase_bucket",
    PURCHASE_BUCKET_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [priority, setPriority] = useState(initialValues.priority);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, priority]);

  useFilterLockPersist("purchase_bucket", filtersLocked, {
    priority,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ priority });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          priority: priority.trim() || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
      setPendingCount(p.pendingCount);
    } catch (e) {
      toastError(e?.message || "Failed to load Purchase Bucket");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, searchDebounced, priority]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const handleClearFilters = () => {
    setSearch("");
    setPriority("");
    setPage(1);
  };

  return (
    <>
      <CBreadcrumb className="mb-3">
        <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
        <CBreadcrumbItem active>Purchase Bucket</CBreadcrumbItem>
      </CBreadcrumb>

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilBasket} className="text-primary" />
                <strong>Purchase Bucket</strong>
                {pendingCount > 0 && !loading && (
                  <CBadge color="primary" shape="rounded-pill">
                    {pendingCount} open
                  </CBadge>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="small text-body-secondary">
                  Total: <strong>{total}</strong>
                </span>
                <CButton
                  color="primary"
                  size="sm"
                  onClick={() =>
                    navigate("/purchase-bucket/raise-billing-request")
                  }
                >
                  <CIcon icon={cilPlus} className="me-1" />
                  Raise Billing Request
                </CButton>
              </div>
            </CCardHeader>

            <CCardBody>
              <CRow className="g-3 mb-3">
                <CCol xs={12} md={5} lg={4}>
                  <CFormLabel className="mb-1">Search</CFormLabel>
                  <div className="position-relative">
                    <CFormInput
                      placeholder="Product name or Sales Order code…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <CIcon
                      icon={cilSearch}
                      className="position-absolute"
                      style={{ right: 10, top: 10, opacity: 0.4 }}
                      size="sm"
                    />
                  </div>
                </CCol>
                <CCol xs={12} sm={6} md={3} lg={2}>
                  <CFormLabel className="mb-1">Priority</CFormLabel>
                  <CFormSelect
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} sm="auto" className="d-flex align-items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="Purchase Bucket"
                  />
                </CCol>
                <CCol xs={12} sm="auto" className="d-flex align-items-end">
                  {(search || priority) && (
                    <CButton
                      color="secondary"
                      variant="outline"
                      onClick={handleClearFilters}
                    >
                      Clear filters
                    </CButton>
                  )}
                </CCol>
              </CRow>

              {loading ? (
                <Loader message="Loading purchase bucket…" />
              ) : (
                <>
                  <div className="table-responsive">
                    <CTable hover bordered className="mb-0" align="middle">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell style={{ width: 50 }}>
                            S.No
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 200 }}>
                            Product Name
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 120 }}>
                            Sales Order Code
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 90 }}>
                            Query Code
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 70 }}>
                            Unit
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 70 }}>
                            Qty
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 120 }}>
                            Dispatch Date
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 140 }}>
                            Status
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 100 }}>
                            Priority
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 60 }}>
                            Action
                          </CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {rows.length === 0 ? (
                          <CTableRow>
                            <CTableDataCell
                              colSpan={10}
                              className="text-center text-body-secondary py-4"
                            >
                              No items found. Try changing filters or search.
                            </CTableDataCell>
                          </CTableRow>
                        ) : (
                          rows.map((row, idx) => {
                            const rowBg = getPriorityRowBg(row.priority);
                            const salesOrderCodeDisplay = queryCodeLast4(
                              row.poCode,
                            );
                            const queryCodeDisplay = queryCodeLast4(
                              row.queryCode,
                            );
                            return (
                              <CTableRow
                                key={row._id || idx}
                                style={
                                  rowBg
                                    ? {
                                        "--cui-table-bg": rowBg,
                                        backgroundColor: rowBg,
                                      }
                                    : undefined
                                }
                              >
                                <CTableDataCell className="text-center fw-semibold text-body-secondary">
                                  {(page - 1) * pageSize + idx + 1}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <div className="fw-semibold">
                                    {fmt(row.productName)}
                                  </div>
                                  {row.rawProductCode && (
                                    <div className="small font-monospace text-body-secondary">
                                      {row.rawProductCode}
                                    </div>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {salesOrderCodeDisplay ? (
                                    <span
                                      className="badge bg-dark font-monospace"
                                      title={
                                        row.poCode
                                          ? String(row.poCode).trim()
                                          : undefined
                                      }
                                    >
                                      {salesOrderCodeDisplay}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {queryCodeDisplay ? (
                                    <span
                                      className="badge bg-secondary font-monospace"
                                      title={
                                        row.queryCode
                                          ? String(row.queryCode).trim()
                                          : undefined
                                      }
                                    >
                                      {queryCodeDisplay}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  {row.unit || "—"}
                                </CTableDataCell>
                                <CTableDataCell className="text-center fw-semibold">
                                  {row.quantity ?? "—"}
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  {dateFormatter(row.dispatchmentDate, "—")}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <StatusPill status={row.status} />
                                </CTableDataCell>
                                <CTableDataCell>
                                  <PriorityPill priority={row.priority} />
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <CButton
                                    color="info"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      navigate(`/purchase-bucket/${row._id}`)
                                    }
                                    title="View details"
                                  >
                                    <EyeIcon />
                                  </CButton>
                                </CTableDataCell>
                              </CTableRow>
                            );
                          })
                        )}
                      </CTableBody>
                    </CTable>
                  </div>

                  {total > pageSize && (
                    <TablePagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      showRange
                      totalItems={total}
                      itemsPerPage={pageSize}
                      align="center"
                      ariaLabel="Purchase Bucket pages"
                      wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
                    />
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default PurchaseBucketList;
