import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CButton,
  CCol,
  CFormInput,
  CFormSelect,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilBasket,
  cilMagnifyingGlass,
  cilPlus,
  cilArrowRight,
} from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBucketService from "../../services/purchaseBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const STATUS_CONFIG = {
  open:                     { label: "Open",                  color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  pending:                  { label: "Open",                  color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  hod_approval_pending:     { label: "HOD Pending",           color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  payment_request_raised:   { label: "Payment Requested",     color: "#0891b2", bg: "#ecfeff", dot: "#06b6d4" },
  finance_approved:         { label: "Finance Approved",      color: "#7c3aed", bg: "#f5f3ff", dot: "#8b5cf6" },
  billing_request_rejected: { label: "Rejected",              color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
  purchased:                { label: "Purchased",             color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
  inventory_received:       { label: "Inventory Received",    color: "#0369a1", bg: "#e0f2fe", dot: "#0ea5e9" },
  ready_for_dispatchment:   { label: "Ready to Dispatch",     color: "#15803d", bg: "#dcfce7", dot: "#22c55e" },
  delivered:                { label: "Delivered",             color: "#15803d", bg: "#f0fdf4", dot: "#22c55e" },
  po_closed:                { label: "PO Closed",             color: "#64748b", bg: "#f1f5f9", dot: "#94a3b8" },
};

const StatusPill = ({ status }) => {
  const raw = status != null && String(status).trim() !== "" ? String(status).trim() : "pending";
  const cfg = STATUS_CONFIG[raw] || { label: raw, color: "#64748b", bg: "#f1f5f9", dot: "#94a3b8" };
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

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "hod_approval_pending", label: "HOD Pending" },
  { value: "payment_request_raised", label: "Payment Requested" },
  { value: "finance_approved", label: "Finance Approved" },
  { value: "purchased", label: "Purchased" },
  { value: "billing_request_rejected", label: "Rejected" },
];

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object") return { list: [], total: 0, pendingCount: 0 };
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    pendingCount: block.pendingCount ?? 0,
  };
};

// ─── component ────────────────────────────────────────────────────────────────

const PurchaseBucketList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [searchDebounced, status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: status.trim() || undefined,
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

  useEffect(() => { load(); }, [page, pageSize, searchDebounced, status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <CBreadcrumb className="mb-3" style={{ fontSize: 13 }}>
        <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
        <CBreadcrumbItem active>Purchase Bucket</CBreadcrumbItem>
      </CBreadcrumb>

      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: "#1e293b" }}>
            <CIcon icon={cilBasket} style={{ color: "#2563eb" }} />
            Purchase Bucket
          </h5>
          {pendingCount > 0 && !loading && (
            <div className="mt-1" style={{ fontSize: 13, color: "#64748b" }}>
              <span style={{ fontWeight: 600, color: "#2563eb" }}>{pendingCount}</span> open items
            </div>
          )}
        </div>
        <CButton
          color="primary"
          onClick={() => navigate("/purchase-bucket/raise-billing-request")}
          style={{ borderRadius: 8, fontWeight: 600, fontSize: 13 }}
        >
          <CIcon icon={cilPlus} className="me-2" />
          Raise Billing Request
        </CButton>
      </div>

      {/* Filter bar */}
      <div
        className="d-flex gap-2 mb-4 flex-wrap"
        style={{
          padding: "12px 14px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
        }}
      >
        <div style={{ flex: "1 1 180px", position: "relative" }}>
          <CIcon
            icon={cilMagnifyingGlass}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
              fontSize: 15,
              pointerEvents: "none",
            }}
          />
          <CFormInput
            size="sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or PO code…"
            style={{ paddingLeft: 32, borderRadius: 7, fontSize: 13 }}
          />
        </div>
        <CFormSelect
          size="sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ flex: "0 0 170px", borderRadius: 7, fontSize: 13 }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>{o.label}</option>
          ))}
        </CFormSelect>
        {(search || status) && (
          <CButton
            size="sm"
            color="secondary"
            variant="ghost"
            onClick={() => { setSearch(""); setStatus(""); }}
            style={{ fontSize: 12, borderRadius: 7 }}
          >
            Clear
          </CButton>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-5" style={{ color: "#94a3b8" }}>
          <CSpinner size="sm" className="me-2" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div
          className="text-center py-5 rounded-3"
          style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#94a3b8" }}
        >
          <CIcon icon={cilBasket} style={{ fontSize: 32, marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
          <div style={{ fontWeight: 600, fontSize: 14 }}>No items found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try changing filters or search</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
            {total} item{total !== 1 ? "s" : ""} · page {page} of {totalPages}
          </div>

          <CRow className="g-2">
            {rows.map((row, idx) => {
              const dispDate = fmtDate(row.dispatchmentDate);
              return (
                <CCol key={row._id || idx} xs={12} sm={6} lg={4}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/purchase-bucket/${row._id}`)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/purchase-bucket/${row._id}`)}
                    style={{
                      background: "#fff",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "14px 14px 12px",
                      cursor: "pointer",
                      transition: "box-shadow 0.15s, border-color 0.15s",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      height: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.10)";
                      e.currentTarget.style.borderColor = "#93c5fd";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "#e2e8f0";
                    }}
                  >
                    {/* Top: product name + arrow */}
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                        {fmt(row.productName)}
                      </div>
                      <CIcon icon={cilArrowRight} style={{ color: "#cbd5e1", fontSize: 14, flexShrink: 0, marginTop: 2 }} />
                    </div>

                    {/* PO code */}
                    {row.poCode && (
                      <div
                        style={{
                          display: "inline-block",
                          fontFamily: "monospace",
                          fontSize: 11,
                          padding: "2px 7px",
                          background: "#f1f5f9",
                          color: "#2563eb",
                          borderRadius: 5,
                          alignSelf: "flex-start",
                        }}
                      >
                        {row.poCode}
                      </div>
                    )}

                    {/* Meta chips */}
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      {row.quantity != null && (
                        <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
                          Qty: <strong>{row.quantity}{row.unit ? ` ${row.unit}` : ""}</strong>
                        </span>
                      )}
                      {dispDate && (
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          📅 {dispDate}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="mt-auto">
                      <StatusPill status={row.status} />
                    </div>
                  </div>
                </CCol>
              );
            })}
          </CRow>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex align-items-center justify-content-center gap-2 mt-4">
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                disabled={page <= 1}
                onClick={() => page > 1 && setPage(page - 1)}
                style={{ borderRadius: 7, minWidth: 72 }}
              >
                ← Prev
              </CButton>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                {page} / {totalPages}
              </span>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => page < totalPages && setPage(page + 1)}
                style={{ borderRadius: 7, minWidth: 72 }}
              >
                Next →
              </CButton>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PurchaseBucketList;
