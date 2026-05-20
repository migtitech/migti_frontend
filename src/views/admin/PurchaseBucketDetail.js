import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CButton, CCol, CRow, CSpinner } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilArrowLeft,
  cilCheckCircle,
  cilWarning,
  cilFile,
} from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBucketService from "../../services/purchaseBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader } from "../../components";
import usePermissions from "../../hooks/usePermissions";
import { getAssetsUrl } from "../../api/endpoints";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const fmt = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const supplierLabel = (s) => {
  if (!s || typeof s !== "object") return "—";
  return s.name || s.shopname || s.shop_location || "—";
};

const supplierExtra = (s) => {
  if (!s || typeof s !== "object") return [];
  const parts = [];
  if (s.phone_1) parts.push(s.phone_1);
  if (s.email) parts.push(s.email);
  if (s.address) parts.push(String(s.address).slice(0, 60));
  return parts;
};

const STATUS_CONFIG = {
  open:                     { label: "Open",               color: "#2563eb", bg: "#eff6ff" },
  pending:                  { label: "Open",               color: "#2563eb", bg: "#eff6ff" },
  hod_approval_pending:     { label: "HOD Pending",        color: "#d97706", bg: "#fffbeb" },
  payment_request_raised:   { label: "Payment Requested",  color: "#0891b2", bg: "#ecfeff" },
  finance_approved:         { label: "Finance Approved",   color: "#7c3aed", bg: "#f5f3ff" },
  billing_request_rejected: { label: "Rejected",           color: "#dc2626", bg: "#fef2f2" },
  purchased:                { label: "Purchased",          color: "#16a34a", bg: "#f0fdf4" },
  inventory_received:       { label: "Inventory Received", color: "#0369a1", bg: "#e0f2fe" },
  ready_for_dispatchment:   { label: "Ready to Dispatch",  color: "#15803d", bg: "#dcfce7" },
  delivered:                { label: "Delivered",          color: "#15803d", bg: "#f0fdf4" },
  po_closed:                { label: "PO Closed",          color: "#64748b", bg: "#f1f5f9" },
};

const StatusPill = ({ status }) => {
  const raw = status != null && String(status).trim() !== "" ? String(status).trim() : "pending";
  const cfg = STATUS_CONFIG[raw] || { label: raw, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1.5px solid ${cfg.color}30`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

// Custom Tab component
const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
    {tabs.map((t) => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        style={{
          padding: "8px 18px",
          fontSize: 13,
          fontWeight: active === t.key ? 700 : 500,
          color: active === t.key ? "#2563eb" : "#64748b",
          background: "none",
          border: "none",
          borderBottom: active === t.key ? "2px solid #2563eb" : "2px solid transparent",
          marginBottom: -2,
          cursor: "pointer",
          transition: "color 0.15s",
        }}
      >
        {t.label}
        {t.count != null && (
          <span style={{
            marginLeft: 6, fontSize: 11, fontWeight: 700,
            padding: "1px 6px", borderRadius: 10,
            background: active === t.key ? "#dbeafe" : "#f1f5f9",
            color: active === t.key ? "#1d4ed8" : "#64748b",
          }}>
            {t.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// Key-value detail row
const DetailRow = ({ label, value, mono }) => (
  <div style={{
    display: "flex", gap: 12, padding: "10px 0",
    borderBottom: "1px solid #f1f5f9", alignItems: "flex-start",
  }}>
    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, minWidth: 130, flexShrink: 0 }}>
      {label}
    </div>
    <div style={{
      fontSize: 13, color: "#1e293b", fontWeight: 500, wordBreak: "break-word",
      fontFamily: mono ? "monospace" : undefined,
    }}>
      {value || "—"}
    </div>
  </div>
);

const isImagePath = (att) => {
  if (!att || typeof att !== "object" || !att.path) return false;
  return (att.mimeType && /^image\//i.test(String(att.mimeType))) ||
    /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(att.path));
};

const resolveUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : getAssetsUrl(path);
};

// ─── component ────────────────────────────────────────────────────────────────

const PurchaseBucketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate } = usePermissions();
  const canRaise = canUpdate("purchase_bucket");

  const [activeTab, setActiveTab] = useState("details");
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingPurchased, setMarkingPurchased] = useState(false);

  const unwrapPayload = (res) => res?.data?.data ?? res?.data;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await withMinimumDelay(() => purchaseBucketService.getById(id));
      const doc = unwrapPayload(res);
      setItem(doc && typeof doc === "object" && !Array.isArray(doc) ? doc : null);
    } catch (e) {
      toastError(e?.message || "Failed to load item");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const markAsPurchased = async () => {
    if (!id) return;
    setMarkingPurchased(true);
    try {
      await purchaseBucketService.markLinePurchased(id);
      toastSuccess("Marked as purchased");
      await load();
    } catch (e) {
      toastError(e?.message || "Request failed");
    } finally {
      setMarkingPurchased(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader />
      </div>
    );
  }

  if (!item) {
    return (
      <CRow>
        <CCol xs={12}>
          <p className="text-body-secondary">Item not found or you do not have access.</p>
          <CButton color="secondary" variant="outline" size="sm" onClick={() => navigate("/purchase-bucket")}>
            Back
          </CButton>
        </CCol>
      </CRow>
    );
  }

  const lineStatus = item?.status != null && String(item.status).trim() !== "" ? String(item.status).trim() : "pending";
  const ratesToShow = item.queryLineRates?.length ? item.queryLineRates : Array.isArray(item.queryRate) ? item.queryRate : [];

  // Images
  const queryImgs = Array.isArray(item.queryProductMatch?.images) ? item.queryProductMatch.images : [];
  const imagePreviews = queryImgs.filter(isImagePath).map((d) => ({ doc: d, url: resolveUrl(d.path) }));
  const nonImageDocs = queryImgs.filter((d) => !isImagePath(d) && d.path);
  const lineUrl = isImagePath(item.attachmentDocumentId) ? resolveUrl(item.attachmentDocumentId?.path) : null;
  const lineNonImg = item.attachmentDocumentId?.path && !lineUrl ? item.attachmentDocumentId : null;

  const br = item.purchaseBillingRequestId && typeof item.purchaseBillingRequestId === "object"
    ? item.purchaseBillingRequestId : null;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <CBreadcrumb className="mb-3" style={{ fontSize: 13 }}>
        <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
        <CBreadcrumbItem href="#/purchase-bucket">Purchase Bucket</CBreadcrumbItem>
        <CBreadcrumbItem active>{item.productName || "Line item"}</CBreadcrumbItem>
      </CBreadcrumb>

      {/* Page header */}
      <div
        className="mb-4 rounded-3 p-3"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <div className="d-flex align-items-start gap-3 flex-wrap">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate("/purchase-bucket")}
            style={{ flexShrink: 0 }}
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#1e293b", lineHeight: 1.3 }}>
              {item.productName || "Line item"}
            </div>
            {item.poCode && (
              <span style={{
                fontFamily: "monospace", fontSize: 11, padding: "2px 7px",
                background: "#e2e8f0", color: "#2563eb", borderRadius: 5, marginTop: 4, display: "inline-block",
              }}>
                {item.poCode}
              </span>
            )}
          </div>

          <div className="d-flex flex-column align-items-end gap-2">
            <StatusPill status={lineStatus} />
            {canRaise && lineStatus === "finance_approved" && (
              <CButton
                color="success"
                size="sm"
                disabled={markingPurchased}
                onClick={markAsPurchased}
                style={{ borderRadius: 8, fontWeight: 600, fontSize: 12 }}
              >
                {markingPurchased
                  ? <><CSpinner size="sm" className="me-1" />Updating…</>
                  : <><CIcon icon={cilCheckCircle} className="me-1" />Mark Purchased</>}
              </CButton>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="d-flex flex-wrap gap-3 mt-3" style={{ fontSize: 13 }}>
          {item.quantity != null && (
            <div style={{ padding: "6px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <span style={{ color: "#94a3b8", fontSize: 11 }}>Qty</span>
              <div style={{ fontWeight: 700, color: "#1e293b" }}>
                {item.quantity}{item.unit ? ` ${item.unit}` : ""}
              </div>
            </div>
          )}
          {item.dispatchmentDate && (
            <div style={{ padding: "6px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <span style={{ color: "#94a3b8", fontSize: 11 }}>Dispatch</span>
              <div style={{ fontWeight: 700, color: "#1e293b" }}>{fmtDate(item.dispatchmentDate)}</div>
            </div>
          )}
          {item.priority && (
            <div style={{ padding: "6px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <span style={{ color: "#94a3b8", fontSize: 11 }}>Priority</span>
              <div style={{
                fontWeight: 700,
                color: item.priority === "high" ? "#dc2626" : item.priority === "medium" ? "#d97706" : "#16a34a",
              }}>
                {String(item.priority).charAt(0).toUpperCase() + String(item.priority).slice(1)}
              </div>
            </div>
          )}
          {item.rawProductCode && (
            <div style={{ padding: "6px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <span style={{ color: "#94a3b8", fontSize: 11 }}>Product code</span>
              <div style={{ fontWeight: 700, color: "#2563eb", fontFamily: "monospace", fontSize: 12 }}>
                {item.rawProductCode}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: "details", label: "Details" },
          { key: "rates", label: "Supplier Rates", count: ratesToShow.length || undefined },
        ]}
      />

      {/* ── Details tab ── */}
      {activeTab === "details" && (
        <CRow className="g-3">
          {/* Images */}
          {(imagePreviews.length > 0 || lineUrl || nonImageDocs.length > 0 || lineNonImg) && (
            <CCol xs={12} md={5}>
              <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                  Product Images
                </div>

                {imagePreviews.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 justify-content-center mb-2">
                    {imagePreviews.map(({ doc, url }, i) => (
                      <a key={doc._id != null ? String(doc._id) : `img-${i}`} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt={doc.originalName || item.productName || "Product"}
                          style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain", borderRadius: 8, border: "1px solid #e2e8f0" }}
                        />
                      </a>
                    ))}
                  </div>
                )}

                {lineUrl && (
                  <div className={imagePreviews.length > 0 ? "pt-2 border-top mt-2" : ""}>
                    {imagePreviews.length > 0 && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>PO line photo</div>
                    )}
                    <div className="text-center">
                      <img
                        src={lineUrl}
                        alt="Line attachment"
                        style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain", borderRadius: 8, border: "1px solid #e2e8f0" }}
                      />
                    </div>
                  </div>
                )}

                {[...nonImageDocs, ...(lineNonImg ? [lineNonImg] : [])].map((doc, i) => (
                  <a
                    key={doc._id ?? `ndoc-${i}`}
                    href={resolveUrl(doc.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="d-flex align-items-center gap-2 mt-2"
                    style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}
                  >
                    <CIcon icon={cilFile} style={{ flexShrink: 0 }} />
                    {doc.originalName || "Open attachment"}
                  </a>
                ))}
              </div>
            </CCol>
          )}

          {/* Field details */}
          <CCol xs={12} md={(imagePreviews.length > 0 || lineUrl || nonImageDocs.length > 0 || lineNonImg) ? 7 : 12}>
            <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "4px 16px 8px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, padding: "12px 0 4px" }}>
                Line Details
              </div>
              {[
                ["Description", item.description],
                ["Group", item.effectiveGroupName || fmt(item.effectiveGroupId)],
                ["HSN", item.hsnNumber],
                ["Model", item.modelNumber],
                ["GST %", item.gstPercentage],
                ["Remark", item.remark],
              ].map(([label, val]) => (
                val != null && val !== "" && val !== "—" ? (
                  <DetailRow key={label} label={label} value={fmt(val)} />
                ) : null
              ))}
            </div>
          </CCol>

          {/* Payment request bill */}
          {item.paymentRequestBillDocumentId?.path && (
            <CCol xs={12}>
              <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 6 }}>
                  Payment Request Bill
                </div>
                <a
                  href={resolveUrl(item.paymentRequestBillDocumentId.path)}
                  target="_blank"
                  rel="noreferrer"
                  className="d-flex align-items-center gap-2"
                  style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}
                >
                  <CIcon icon={cilFile} />
                  {item.paymentRequestBillDocumentId.originalName || "Open bill"}
                </a>
              </div>
            </CCol>
          )}

          {/* Billing request record */}
          {br && (
            <CCol xs={12}>
              <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                  Purchase Billing Request
                </div>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: br.status === "finance_approved" ? "#f0fdf4" : br.status === "rejected" ? "#fef2f2" : "#fffbeb",
                    color: br.status === "finance_approved" ? "#15803d" : br.status === "rejected" ? "#dc2626" : "#92400e",
                    border: `1.5px solid ${br.status === "finance_approved" ? "#86efac" : br.status === "rejected" ? "#fca5a5" : "#fde68a"}`,
                  }}>
                    {String(br.status || "pending")}
                  </span>
                  {br.uniqueId && (
                    <code style={{ fontSize: 12, padding: "3px 8px", background: "#f1f5f9", borderRadius: 6, color: "#475569" }}>
                      {br.uniqueId}
                    </code>
                  )}
                </div>

                <CRow className="g-2" style={{ fontSize: 13 }}>
                  {br.amount != null && (
                    <CCol xs={6} sm={4}>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>Amount</div>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>₹{Number(br.amount).toLocaleString("en-IN")}</div>
                    </CCol>
                  )}
                  {(br.createdBySnapshot?.name || br.createdBy?.name) && (
                    <CCol xs={6} sm={4}>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>Submitted by</div>
                      <div style={{ fontWeight: 600 }}>{br.createdBySnapshot?.name || br.createdBy?.name}</div>
                    </CCol>
                  )}
                  {(br.approvedBySnapshot?.name || br.approvedBy?.name) && (
                    <CCol xs={6} sm={4}>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>Approved by</div>
                      <div style={{ fontWeight: 600 }}>{br.approvedBySnapshot?.name || br.approvedBy?.name}</div>
                      {br.approvedAt && <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDateTime(br.approvedAt)}</div>}
                    </CCol>
                  )}
                  {br.statusRemark && (
                    <CCol xs={12}>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>Financier remark</div>
                      <div style={{ color: "#475569" }}>{br.statusRemark}</div>
                    </CCol>
                  )}
                </CRow>

                <div className="d-flex flex-wrap gap-2 mt-3">
                  {br.billDocumentId?.path && (
                    <a
                      href={resolveUrl(br.billDocumentId.path)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: "#eff6ff", color: "#2563eb", textDecoration: "none",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <CIcon icon={cilFile} style={{ fontSize: 14 }} />
                      {br.billDocumentId.originalName || "View Bill"}
                    </a>
                  )}
                  {br.proofDocumentId?.path && (
                    <a
                      href={resolveUrl(br.proofDocumentId.path)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: "#f0fdf4", color: "#16a34a", textDecoration: "none",
                        border: "1px solid #86efac",
                      }}
                    >
                      <CIcon icon={cilCheckCircle} style={{ fontSize: 14 }} />
                      {br.proofDocumentId.originalName || "View Payment Proof"}
                    </a>
                  )}
                </div>
              </div>
            </CCol>
          )}
        </CRow>
      )}

      {/* ── Rates tab ── */}
      {activeTab === "rates" && (
        <div>
          {item.queryRatesMatchNote === "missing_rawProductCode" && (
            <div className="text-center py-4" style={{ color: "#94a3b8", fontSize: 13 }}>
              This PO line has no raw product code — rates cannot be matched.
            </div>
          )}
          {item.queryRatesMatchNote === "no_query_product" && item.rawProductCode && (
            <div className="text-center py-4" style={{ color: "#94a3b8", fontSize: 13 }}>
              No query product found for code <code>{item.rawProductCode}</code>.
            </div>
          )}

          {item.queryProductMatch && (
            <div
              className="mb-3 d-flex flex-wrap gap-2 align-items-center"
              style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
            >
              <span style={{ color: "#64748b" }}>Matched query line</span>
              <strong style={{ color: "#1e293b" }}>#{item.queryProductMatch.lineIndex}</strong>
              {item.queryProductMatch.queryCode && (
                <code style={{ fontSize: 11, background: "#e2e8f0", padding: "2px 6px", borderRadius: 4 }}>
                  {item.queryProductMatch.queryCode}
                </code>
              )}
              {item.queryProductMatch.proBucketStatus && (
                <span style={{ color: "#7c3aed", fontWeight: 600 }}>
                  Pro: {item.queryProductMatch.proBucketStatus}
                </span>
              )}
            </div>
          )}

          {ratesToShow.length === 0 ? (
            <div
              className="text-center py-5 rounded-3"
              style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#94a3b8" }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>No supplier rates yet</div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {ratesToShow.map((r, idx) => {
                const extras = supplierExtra(r.supplier);
                return (
                  <div
                    key={r._id != null ? String(r._id) : idx}
                    style={{
                      background: "#fff",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "14px 16px",
                    }}
                  >
                    <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                          {supplierLabel(r.supplier)}
                        </div>
                        {extras.map((e, i) => (
                          <div key={i} style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{e}</div>
                        ))}
                      </div>
                      {r.rate != null && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: "#2563eb" }}>
                            ₹{Number(r.rate).toLocaleString("en-IN")}
                          </div>
                          {r.unit && <div style={{ fontSize: 12, color: "#94a3b8" }}>per {r.unit}</div>}
                        </div>
                      )}
                    </div>

                    {(r.remark || r.submittedAt || r.submittedBy?.name) && (
                      <div
                        className="d-flex flex-wrap gap-3 mt-2 pt-2"
                        style={{ borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#64748b" }}
                      >
                        {r.remark && <span><strong style={{ color: "#475569" }}>Note:</strong> {r.remark}</span>}
                        {r.submittedBy?.name && <span>By <strong style={{ color: "#475569" }}>{r.submittedBy.name}</strong></span>}
                        {r.submittedAt && <span>{fmtDateTime(r.submittedAt)}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Warning if rejected */}
          {lineStatus === "billing_request_rejected" && (
            <div
              className="mt-3 d-flex gap-2 align-items-start rounded-2 p-3"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13 }}
            >
              <CIcon icon={cilWarning} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: "#7f1d1d" }}>
                This line's billing request was rejected. Please resubmit via the Purchase Bucket.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchaseBucketDetail;
