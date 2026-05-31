import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilArrowLeft,
  cilCheckCircle,
  cilWarning,
  cilFile,
  cilUser,
  cilX,
} from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBucketService from "../../services/purchaseBucketService";
import localPurchaseService from "../../services/localPurchaseService";
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

// Stat box for quick header metrics
const StatBox = ({ label, children, valueStyle }) => (
  <div
    className="h-100"
    style={{
      padding: "8px 14px",
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      minWidth: 0,
    }}
  >
    <span style={{ color: "#94a3b8", fontSize: 11, display: "block" }}>{label}</span>
    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13, wordBreak: "break-word", ...valueStyle }}>
      {children}
    </div>
  </div>
);

// Custom Tab component
const Tabs = ({ tabs, active, onChange }) => (
  <div
    style={{
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      marginBottom: 20,
      borderBottom: "2px solid #e2e8f0",
    }}
  >
    <div style={{ display: "flex", gap: 4, minWidth: "min-content" }}>
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
            whiteSpace: "nowrap",
            flexShrink: 0,
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
  </div>
);

// Key-value detail row
const DetailRow = ({ label, value, mono }) => (
  <div
    className="d-flex flex-column flex-sm-row gap-1 gap-sm-3"
    style={{
      padding: "10px 0",
      borderBottom: "1px solid #f1f5f9",
      alignItems: "flex-start",
    }}
  >
    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, minWidth: 130, flexShrink: 0 }}>
      {label}
    </div>
    <div style={{
      fontSize: 13, color: "#1e293b", fontWeight: 500, wordBreak: "break-word",
      fontFamily: mono ? "monospace" : undefined,
      flex: 1,
      minWidth: 0,
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

const formatLocalPurchaseEmployee = (emp) =>
  emp?.email?.trim() || emp?.companyEmail?.trim() || "—";

const resolveLocalPurchaseEmployeeId = (row) => {
  const emp = row?.employeeId;
  if (!emp) return "";
  if (typeof emp === "object") {
    return String(emp._id || emp.employeeId || "");
  }
  return String(emp);
};

const getLatestLocalPurchaseAssignment = (rows) =>
  Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

// ─── component ────────────────────────────────────────────────────────────────

const PurchaseBucketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate } = usePermissions();
  const canRaise = canUpdate("purchase_bucket");
  const canAssignPurchase = canUpdate("purchase_bucket");

  const [activeTab, setActiveTab] = useState("details");
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingPurchased, setMarkingPurchased] = useState(false);
  const [assignBarOpen, setAssignBarOpen] = useState(false);
  const [localPurchaseEmployees, setLocalPurchaseEmployees] = useState([]);
  const [localPurchaseEmployeesLoading, setLocalPurchaseEmployeesLoading] =
    useState(false);
  const [selectedLocalPurchaseEmployee, setSelectedLocalPurchaseEmployee] =
    useState("");
  const [assignRemark, setAssignRemark] = useState("");
  const [assignLocationLink, setAssignLocationLink] = useState("");
  const [assigningPurchase, setAssigningPurchase] = useState(false);
  const [localPurchases, setLocalPurchases] = useState([]);
  const [localPurchasesLoading, setLocalPurchasesLoading] = useState(false);

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

  const loadLocalPurchases = useCallback(async () => {
    if (!id) return;
    setLocalPurchasesLoading(true);
    try {
      const res = await localPurchaseService.list({
        poProductId: id,
        pageSize: 20,
      });
      const block = res?.data;
      setLocalPurchases(Array.isArray(block?.data) ? block.data : []);
    } catch {
      setLocalPurchases([]);
    } finally {
      setLocalPurchasesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLocalPurchases();
  }, [loadLocalPurchases]);

  useEffect(() => {
    if (!assignBarOpen) return;
    let cancelled = false;
    const run = async () => {
      setLocalPurchaseEmployeesLoading(true);
      try {
        const res = await localPurchaseService.listEmployees();
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) setLocalPurchaseEmployees(list);
      } catch (e) {
        if (!cancelled) {
          toastError(e?.message || "Failed to load local purchase employees");
          setLocalPurchaseEmployees([]);
        }
      } finally {
        if (!cancelled) setLocalPurchaseEmployeesLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [assignBarOpen]);

  const closeAssignBar = () => {
    if (assigningPurchase) return;
    setAssignBarOpen(false);
  };

  const openAssignBar = () => {
    const latest = getLatestLocalPurchaseAssignment(localPurchases);
    setSelectedLocalPurchaseEmployee(
      latest ? resolveLocalPurchaseEmployeeId(latest) : "",
    );
    setAssignRemark(
      latest ? String(latest.remark || latest.assignmentRemark || "").trim() : "",
    );
    setAssignLocationLink(latest ? String(latest.locationLink || "").trim() : "");
    setAssignBarOpen(true);
  };

  const localPurchaseEmployeeOptions = useMemo(() => {
    const list = [...localPurchaseEmployees];
    const latest = getLatestLocalPurchaseAssignment(localPurchases);
    const assigned =
      latest?.employeeId && typeof latest.employeeId === "object"
        ? latest.employeeId
        : null;
    if (!assigned?._id) return list;

    const assignedId = String(assigned._id);
    if (list.some((emp) => String(emp.employeeId || emp._id) === assignedId)) {
      return list;
    }

    return [{ ...assigned, employeeId: assigned._id }, ...list];
  }, [localPurchaseEmployees, localPurchases]);

  const handleAssignPurchase = async () => {
    if (!id) return;
    if (!selectedLocalPurchaseEmployee) {
      toastError("Select a local purchase employee.");
      return;
    }
    setAssigningPurchase(true);
    try {
      await localPurchaseService.assign({
        poProductId: id,
        employeeId: selectedLocalPurchaseEmployee,
        remark: assignRemark,
        locationLink: assignLocationLink,
      });
      toastSuccess("Assigned to local purchase");
      setAssignBarOpen(false);
      await loadLocalPurchases();
    } catch (e) {
      toastError(e?.message || "Failed to assign local purchase");
    } finally {
      setAssigningPurchase(false);
    }
  };

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
  const hasMedia = imagePreviews.length > 0 || lineUrl || nonImageDocs.length > 0 || lineNonImg;
  const imageStyle = {
    maxHeight: "clamp(160px, 28vh, 320px)",
    maxWidth: "100%",
    width: "auto",
    objectFit: "contain",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
  };

  return (
    <div className="w-100 mx-auto" style={{ maxWidth: "min(100%, 1280px)" }}>
      {/* Breadcrumb */}
      <CBreadcrumb className="mb-3 flex-nowrap overflow-auto" style={{ fontSize: 13 }}>
        <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
        <CBreadcrumbItem href="#/purchase-bucket">Purchase Bucket</CBreadcrumbItem>
        <CBreadcrumbItem active className="text-truncate" style={{ maxWidth: "min(50vw, 420px)" }}>
          {item.productName || "Line item"}
        </CBreadcrumbItem>
      </CBreadcrumb>

      {/* Page header */}
      <div
        className="mb-4 rounded-3 p-3 p-md-4"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-start gap-3">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate("/purchase-bucket")}
            className="align-self-start flex-shrink-0"
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>

          <div className="flex-grow-1 min-w-0">
            <div style={{
              fontWeight: 800,
              fontSize: "clamp(1rem, 1.6vw, 1.35rem)",
              color: "#1e293b",
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}>
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

          <div className="d-flex flex-row flex-lg-column align-items-center align-items-lg-end justify-content-between justify-content-lg-start gap-2 ms-lg-auto flex-shrink-0 flex-wrap">
            <StatusPill status={lineStatus} />
            {canAssignPurchase && (
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                onClick={openAssignBar}
                style={{ borderRadius: 8, fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}
              >
                <CIcon icon={cilUser} className="me-1" />
                Assign Purchase
              </CButton>
            )}
            {canRaise && lineStatus === "finance_approved" && (
              <CButton
                color="success"
                size="sm"
                disabled={markingPurchased}
                onClick={markAsPurchased}
                style={{ borderRadius: 8, fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}
              >
                {markingPurchased
                  ? <><CSpinner size="sm" className="me-1" />Updating…</>
                  : <><CIcon icon={cilCheckCircle} className="me-1" />Mark Purchased</>}
              </CButton>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <CRow className="g-2 g-md-3 mt-3">
          {item.quantity != null && (
            <CCol xs={6} sm={4} md={3} lg={2} xl="auto">
              <StatBox label="Qty">
                {item.quantity}{item.unit ? ` ${item.unit}` : ""}
              </StatBox>
            </CCol>
          )}
          {item.dispatchmentDate && (
            <CCol xs={6} sm={4} md={3} lg={2} xl="auto">
              <StatBox label="Dispatch">{fmtDate(item.dispatchmentDate)}</StatBox>
            </CCol>
          )}
          {item.priority && (
            <CCol xs={6} sm={4} md={3} lg={2} xl="auto">
              <StatBox
                label="Priority"
                valueStyle={{
                  color: item.priority === "high" ? "#dc2626" : item.priority === "medium" ? "#d97706" : "#16a34a",
                }}
              >
                {String(item.priority).charAt(0).toUpperCase() + String(item.priority).slice(1)}
              </StatBox>
            </CCol>
          )}
          {item.targetRate != null && (
            <CCol xs={6} sm={4} md={3} lg={2} xl="auto">
              <StatBox label="Target Rate">
                ₹{Number(item.targetRate).toLocaleString("en-IN")}
              </StatBox>
            </CCol>
          )}
          {item.rawProductCode && (
            <CCol xs={12} sm={8} md={6} lg={4} xl="auto">
              <StatBox
                label="Product code"
                valueStyle={{ color: "#2563eb", fontFamily: "monospace", fontSize: 12 }}
              >
                {item.rawProductCode}
              </StatBox>
            </CCol>
          )}
        </CRow>
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
        <CRow className="g-3 g-lg-4">
          {/* Images */}
          {hasMedia && (
            <CCol xs={12} lg={5} xl={4}>
              <div className="h-100" style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                  Product Images
                </div>

                {imagePreviews.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-lg-start mb-2">
                    {imagePreviews.map(({ doc, url }, i) => (
                      <a key={doc._id != null ? String(doc._id) : `img-${i}`} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt={doc.originalName || item.productName || "Product"}
                          style={imageStyle}
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
                    <div className="text-center text-lg-start">
                      <img
                        src={lineUrl}
                        alt="Line attachment"
                        style={imageStyle}
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
                    style={{ fontSize: 13, color: "#2563eb", textDecoration: "none", wordBreak: "break-word" }}
                  >
                    <CIcon icon={cilFile} style={{ flexShrink: 0 }} />
                    {doc.originalName || "Open attachment"}
                  </a>
                ))}
              </div>
            </CCol>
          )}

          {/* Field details */}
          <CCol xs={12} lg={hasMedia ? 7 : 12} xl={hasMedia ? 8 : 12}>
            <div className="h-100" style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "4px 16px 8px" }}>
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

                <CRow className="g-2 g-md-3" style={{ fontSize: 13 }}>
                  {br.amount != null && (
                    <CCol xs={12} sm={6} md={4} lg={3}>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>Amount</div>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>₹{Number(br.amount).toLocaleString("en-IN")}</div>
                    </CCol>
                  )}
                  {(br.createdBySnapshot?.name || br.createdBy?.name) && (
                    <CCol xs={12} sm={6} md={4} lg={3}>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>Submitted by</div>
                      <div style={{ fontWeight: 600 }}>{br.createdBySnapshot?.name || br.createdBy?.name}</div>
                    </CCol>
                  )}
                  {(br.approvedBySnapshot?.name || br.approvedBy?.name) && (
                    <CCol xs={12} sm={6} md={4} lg={3}>
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

          {/* Local purchase assignments */}
          <CCol xs={12}>
            <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                Local Purchase Assignments
              </div>
              {localPurchasesLoading ? (
                <div className="text-body-secondary small py-2">
                  <CSpinner size="sm" className="me-2" />
                  Loading assignments…
                </div>
              ) : localPurchases.length === 0 ? (
                <p className="text-body-secondary small mb-0">
                  No local purchase assignments yet.
                </p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {localPurchases.map((row) => {
                    const emp =
                      row.employeeId && typeof row.employeeId === "object"
                        ? row.employeeId
                        : null;
                    return (
                      <div
                        key={row._id}
                        className="rounded-2 p-3"
                        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                      >
                        <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>
                            {emp?.name || emp?.email || "Assigned employee"}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                            {String(row.status || "pending")}
                          </span>
                        </div>
                        {(emp?.designation || emp?.role) && (
                          <div className="small text-body-secondary mb-2">
                            {[emp?.designation, emp?.role].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {(row.remark || row.assignmentRemark) && (
                          <div className="small mb-1">
                            <span className="text-body-secondary">Remark: </span>
                            {row.remark || row.assignmentRemark}
                          </div>
                        )}
                        {row.locationLink && (
                          <a
                            href={row.locationLink}
                            target="_blank"
                            rel="noreferrer"
                            className="small d-inline-block"
                            style={{ wordBreak: "break-all" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.locationLink}
                          </a>
                        )}
                        <div className="small text-body-secondary mt-2">
                          {fmtDateTime(row.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CCol>
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
            <CRow className="g-3">
              {ratesToShow.map((r, idx) => {
                const extras = supplierExtra(r.supplier);
                return (
                  <CCol key={r._id != null ? String(r._id) : idx} xs={12} lg={6} xl={4}>
                    <div
                      className="h-100"
                      style={{
                        background: "#fff",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "14px 16px",
                      }}
                    >
                      <div className="d-flex align-items-start justify-content-between gap-3 flex-column flex-sm-row">
                        <div className="min-w-0">
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", wordBreak: "break-word" }}>
                            {supplierLabel(r.supplier)}
                          </div>
                          {extras.map((e, i) => (
                            <div key={i} style={{ fontSize: 12, color: "#64748b", marginTop: 1, wordBreak: "break-word" }}>{e}</div>
                          ))}
                        </div>
                        {r.rate != null && (
                          <div className="text-start text-sm-end flex-shrink-0">
                            <div style={{ fontWeight: 800, fontSize: 16, color: "#2563eb" }}>
                              ₹{Number(r.rate).toLocaleString("en-IN")}
                            </div>
                            {r.unit && <div style={{ fontSize: 12, color: "#94a3b8" }}>per {r.unit}</div>}
                          </div>
                        )}
                      </div>

                      {(r.remark || r.submittedAt || r.submittedBy?.name) && (
                        <div
                          className="d-flex flex-wrap gap-2 gap-md-3 mt-2 pt-2"
                          style={{ borderTop: "1px solid #f1f5f9", fontSize: 12, color: "#64748b" }}
                        >
                          {r.remark && <span><strong style={{ color: "#475569" }}>Note:</strong> {r.remark}</span>}
                          {r.submittedBy?.name && <span>By <strong style={{ color: "#475569" }}>{r.submittedBy.name}</strong></span>}
                          {r.submittedAt && <span>{fmtDateTime(r.submittedAt)}</span>}
                        </div>
                      )}
                    </div>
                  </CCol>
                );
              })}
            </CRow>
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

      {assignBarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            zIndex: 1040,
            background: "rgba(15, 23, 42, 0.42)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
          onClick={closeAssignBar}
          role="button"
          tabIndex={-1}
          aria-label="Close"
        />
      )}

      {assignBarOpen && (
        <div
          className="position-fixed top-0 end-0 d-flex flex-column border-start border-2 bg-body shadow-lg h-100"
          style={{ zIndex: 1050, width: "min(28rem, 100%)" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Assign local purchase"
        >
          <div className="d-flex align-items-center justify-content-between gap-2 border-bottom px-3 py-2 flex-shrink-0">
            <div style={{ minWidth: 0 }}>
              <h2 className="h6 mb-0">Assign Purchase</h2>
              {item?.productName && (
                <div
                  className="text-body-secondary text-truncate small"
                  title={item.productName}
                >
                  {item.productName}
                </div>
              )}
            </div>
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={closeAssignBar}
              disabled={assigningPurchase}
              aria-label="Close"
            >
              <CIcon icon={cilX} size="lg" />
            </CButton>
          </div>

          <div className="flex-grow-1 overflow-auto px-3 py-3">
            {localPurchaseEmployeesLoading ? (
              <Loader message="Loading employees…" />
            ) : localPurchaseEmployeeOptions.length === 0 ? (
              <p className="text-body-secondary mb-0">
                No employees with the local purchase role were found.
              </p>
            ) : (
              <>
                <CFormLabel htmlFor="local-purchase-employee">
                  Local purchase employee
                </CFormLabel>
                <CFormSelect
                  id="local-purchase-employee"
                  value={selectedLocalPurchaseEmployee}
                  onChange={(e) => setSelectedLocalPurchaseEmployee(e.target.value)}
                  className="mb-3"
                >
                  <option value="">— Select employee —</option>
                  {localPurchaseEmployeeOptions.map((emp) => {
                    const empId = emp.employeeId || emp._id;
                    return (
                      <option key={empId} value={String(empId)}>
                        {formatLocalPurchaseEmployee(emp)}
                      </option>
                    );
                  })}
                </CFormSelect>

                <CFormLabel htmlFor="local-purchase-remark">Remark</CFormLabel>
                <CFormTextarea
                  id="local-purchase-remark"
                  rows={3}
                  placeholder="Optional note for the assignee…"
                  value={assignRemark}
                  onChange={(e) => setAssignRemark(e.target.value)}
                  className="mb-3"
                />

                <CFormLabel htmlFor="local-purchase-location">
                  Location link
                </CFormLabel>
                <CFormInput
                  id="local-purchase-location"
                  type="url"
                  value={assignLocationLink}
                  onChange={(e) => setAssignLocationLink(e.target.value)}
                  placeholder="https://maps.google.com/…"
                />
              </>
            )}
          </div>

          <div className="d-flex gap-2 px-3 py-2 border-top flex-shrink-0 justify-content-end">
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              onClick={closeAssignBar}
              disabled={assigningPurchase}
            >
              Cancel
            </CButton>
            <CButton
              type="button"
              color="primary"
              onClick={handleAssignPurchase}
              disabled={
                assigningPurchase ||
                localPurchaseEmployeesLoading ||
                localPurchaseEmployees.length === 0
              }
            >
              {assigningPurchase ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Assigning…
                </>
              ) : (
                "Assign Purchase"
              )}
            </CButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseBucketDetail;
