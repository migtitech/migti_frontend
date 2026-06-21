import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCloseButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilArrowLeft,
  cilCheckCircle,
  cilCloudUpload,
  cilTag,
  cilWarning,
  cilXCircle,
} from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import documentService from "../../services/documentService";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader } from "../../components";
import { dateFormatter } from "../../utils/dateFormatter";

const fmtAmount = (n) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

const formatSupplierSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    return { title: "", lines: [] };
  }
  const title =
    snapshot.name || snapshot.shopname || snapshot.companyName || "";
  const lines = [
    snapshot.shopname &&
      snapshot.name &&
      snapshot.shopname !== snapshot.name &&
      snapshot.shopname,
    snapshot.phone_1 && `Phone: ${snapshot.phone_1}`,
    snapshot.gst && `GST: ${snapshot.gst}`,
    snapshot.address && `Address: ${snapshot.address}`,
  ].filter(Boolean);
  return { title, lines };
};

const unwrap = (res) => {
  const inner = res?.data ?? res;
  return inner?.data ?? inner;
};

const BATCH_STATUS_MAP = {
  hod_approval_pending: {
    label: "Pending Approval",
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  hod_approved: { label: "HOD Approved", color: "#16a34a", bg: "#f0fdf4" },
  hod_rejected: { label: "HOD Rejected", color: "#dc2626", bg: "#fef2f2" },
  finance_approved: {
    label: "Finance Approved",
    color: "#2563eb",
    bg: "#eff6ff",
  },
};

const HOD_STATUS_CONFIG = {
  approved: {
    label: "HOD Approved",
    color: "#16a34a",
    bg: "#f0fdf4",
    icon: cilCheckCircle,
  },
  rejected: {
    label: "HOD Rejected",
    color: "#dc2626",
    bg: "#fef2f2",
    icon: cilXCircle,
  },
};

const BatchStatusPill = ({ status }) => {
  const s = BATCH_STATUS_MAP[String(status || "").toLowerCase()];
  if (!s) return <CBadge color="secondary">{status || "—"}</CBadge>;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        border: `1.5px solid ${s.color}30`,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};

const HodStatusPill = ({ status }) => {
  if (!status) {
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
          color: "#92400e",
          background: "#fffbeb",
          border: "1.5px solid #f59e0b40",
        }}
      >
        Pending Review
      </span>
    );
  }
  const s = HOD_STATUS_CONFIG[status];
  if (!s) return <CBadge color="secondary">{status}</CBadge>;
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
        color: s.color,
        background: s.bg,
        border: `1.5px solid ${s.color}30`,
      }}
    >
      <CIcon icon={s.icon} style={{ fontSize: 13 }} />
      {s.label}
    </span>
  );
};

const openDocWithAuth = async (docId, setLoadingId) => {
  if (!docId) return;
  setLoadingId(String(docId));
  try {
    const response = await axiosClient.get(DOCUMENTS.SERVE(docId), {
      responseType: "blob",
    });
    const blob = response.data ?? response;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch {
    toastError("Could not load document. Please try again.");
  } finally {
    setLoadingId(null);
  }
};

const StatBox = ({ label, value, accent }) => (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      padding: "12px 14px",
      borderRadius: 10,
      background: accent ? "#eff6ff" : "#f8fafc",
      border: "1px solid #e2e8f0",
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#64748b",
        fontWeight: 500,
        marginBottom: 2,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: accent ? "#2563eb" : "#1e293b",
      }}
    >
      {value}
    </div>
  </div>
);

const BatchBillingRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [docLoadingId, setDocLoadingId] = useState(null);
  const [purchasingId, setPurchasingId] = useState(null);

  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitProduct, setResubmitProduct] = useState(null);
  const [resubmitBillFile, setResubmitBillFile] = useState(null);
  const [resubmitBillName, setResubmitBillName] = useState("");
  const [resubmitPhotoFile, setResubmitPhotoFile] = useState(null);
  const [resubmitPhotoName, setResubmitPhotoName] = useState("");
  const [resubmitAmount, setResubmitAmount] = useState("");
  const [resubmitRemark, setResubmitRemark] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  const billInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    billingRequestBatchService
      .getById(id)
      .then((res) => setDetail(unwrap(res)))
      .catch((e) => toastError(e?.message || "Failed to load billing request"))
      .finally(() => setLoading(false));
  }, [id]);

  const onMarkPurchased = async (productId) => {
    setPurchasingId(productId);
    try {
      const res = await billingRequestBatchService.markProductPurchased(
        id,
        productId,
      );
      const updated = unwrap(res);
      if (updated) setDetail(updated);
      toastSuccess("Product marked as purchased.");
    } catch (e) {
      toastError(e?.message || "Failed to mark product as purchased.");
    } finally {
      setPurchasingId(null);
    }
  };

  const openResubmit = (product) => {
    setResubmitProduct(product);
    setResubmitBillFile(null);
    setResubmitBillName("");
    setResubmitPhotoFile(null);
    setResubmitPhotoName("");
    setResubmitAmount(
      typeof product.amount === "number" ? String(product.amount) : "",
    );
    setResubmitRemark(product.remark || "");
    setResubmitOpen(true);
  };

  const closeResubmit = () => {
    if (resubmitting) return;
    setResubmitOpen(false);
    setResubmitProduct(null);
  };

  const onBillFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResubmitBillFile(file);
    setResubmitBillName(file.name);
  };

  const onPhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResubmitPhotoFile(file);
    setResubmitPhotoName(file.name);
  };

  const onSubmitResubmit = async () => {
    const hasPrevBill = !!resubmitProduct?.billDocId;
    const hasPrevPhoto = !!resubmitProduct?.productImageDocId;

    if (!resubmitBillFile && !hasPrevBill) {
      toastError("Please upload the bill document.");
      return;
    }
    if (!resubmitPhotoFile && !hasPrevPhoto) {
      toastError("Please upload the product photo.");
      return;
    }
    if (
      !resubmitAmount ||
      Number.isNaN(Number(resubmitAmount)) ||
      Number(resubmitAmount) <= 0
    ) {
      toastError("Please enter a valid amount.");
      return;
    }
    setResubmitting(true);
    try {
      let billDocId = String(resubmitProduct.billDocId);
      if (resubmitBillFile) {
        const billUp = await documentService.uploadAttachments([
          resubmitBillFile,
        ]);
        const billDocs =
          billUp?.data?.documents ||
          billUp?.documents ||
          billUp?.data?.data?.documents ||
          [];
        const billDoc = billDocs[0];
        if (!billDoc?._id) {
          toastError("Bill upload failed — no document ID returned.");
          return;
        }
        billDocId = String(billDoc._id);
      }

      let productImageDocId = resubmitProduct.productImageDocId
        ? String(resubmitProduct.productImageDocId)
        : null;
      if (resubmitPhotoFile) {
        const photoUp = await documentService.uploadAttachments([
          resubmitPhotoFile,
        ]);
        const photoDocs =
          photoUp?.data?.documents ||
          photoUp?.documents ||
          photoUp?.data?.data?.documents ||
          [];
        const photoDoc = photoDocs[0];
        if (photoDoc?._id) productImageDocId = String(photoDoc._id);
      }

      const res = await billingRequestBatchService.resubmitProduct(
        id,
        String(resubmitProduct._id),
        {
          billDocId,
          productImageDocId,
          amount: Number(resubmitAmount),
          remark: resubmitRemark.trim(),
        },
      );
      const updated = unwrap(res);
      if (updated) setDetail(updated);
      toastSuccess("Product resubmitted successfully.");
      closeResubmit();
    } catch (e) {
      toastError(e?.message || "Failed to resubmit product.");
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader />
      </div>
    );
  }

  if (!detail) {
    return (
      <CRow>
        <CCol xs={12}>
          <p className="text-body-secondary">Billing request not found.</p>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Back
          </CButton>
        </CCol>
      </CRow>
    );
  }

  const products = Array.isArray(detail.products) ? detail.products : [];
  const grandTotal = products.reduce(
    (s, p) => s + (typeof p.amount === "number" ? p.amount : 0),
    0,
  );
  return (
    <CRow>
      <CCol xs={12}>
        {/* Breadcrumb */}
        <CBreadcrumb className="mb-3" style={{ fontSize: 13 }}>
          <CBreadcrumbItem href="#/dashboard">Home</CBreadcrumbItem>
          <CBreadcrumbItem href="#/batch-billing-requests">
            Billing Requests
          </CBreadcrumbItem>
          <CBreadcrumbItem active>
            {detail.billingRequestCode || "Detail"}
          </CBreadcrumbItem>
        </CBreadcrumb>

        {/* Page header */}
        <div
          className="mb-3 rounded-3 p-3"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <div className="d-flex align-items-center gap-2 mb-2">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              style={{ flexShrink: 0 }}
            >
              <CIcon icon={cilArrowLeft} className="me-1" />
              Back
            </CButton>
            <div style={{ minWidth: 0, flex: 1 }} />
            <BatchStatusPill status={detail.status} />
          </div>

          {/* Stats row */}
          <div className="d-flex gap-2 mt-3 flex-wrap">
            <StatBox
              label={
                <>
                  <CIcon icon={cilTag} className="me-1" />
                  Products
                </>
              }
              value={products.length}
            />
            <StatBox
              label="Total Amount"
              value={fmtAmount(grandTotal)}
              accent
            />
          </div>

          {detail.statusRemark && (
            <div
              className="mt-3 rounded-2 p-2 d-flex gap-2 align-items-start"
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                fontSize: 13,
              }}
            >
              <CIcon
                icon={cilWarning}
                style={{
                  color: "#d97706",
                  fontSize: 15,
                  marginTop: 1,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#92400e" }}>
                <strong>Overall Remark:</strong> {detail.statusRemark}
              </span>
            </div>
          )}

          {/* Payment proof — shown when finance approved */}
          {detail.status === "finance_approved" && (
            <div
              className="mt-3 rounded-2 p-3 d-flex flex-column gap-2"
              style={{ background: "#f0fdf4", border: "1.5px solid #86efac" }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>
                <CIcon icon={cilCheckCircle} className="me-2" />
                Payment Approved
              </div>
              <div className="d-flex flex-wrap gap-3" style={{ fontSize: 13 }}>
                {detail.paidAmount != null && (
                  <div>
                    <span style={{ color: "#64748b" }}>Paid Amount: </span>
                    <span style={{ fontWeight: 700, color: "#15803d" }}>
                      {fmtAmount(detail.paidAmount)}
                    </span>
                  </div>
                )}
                {detail.financeApprovedBySnapshot && (
                  <div>
                    <span style={{ color: "#64748b" }}>Approved by: </span>
                    <span style={{ fontWeight: 600 }}>
                      {detail.financeApprovedBySnapshot.name ||
                        detail.financeApprovedBySnapshot.fullName ||
                        "—"}
                    </span>
                  </div>
                )}
                {detail.financeApprovedAt && (
                  <div>
                    <span style={{ color: "#64748b" }}>On: </span>
                    <span style={{ fontWeight: 600 }}>
                      {dateFormatter(detail.financeApprovedAt, "—")}
                    </span>
                  </div>
                )}
              </div>
              {detail.financeRemark && (
                <div style={{ fontSize: 12, color: "#166534" }}>
                  <span style={{ fontWeight: 600 }}>Finance remark: </span>
                  {detail.financeRemark}
                </div>
              )}
              {detail.paymentProofDocId && (
                <CButton
                  size="sm"
                  color="success"
                  variant="outline"
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                  disabled={!!docLoadingId}
                  onClick={() =>
                    openDocWithAuth(
                      String(detail.paymentProofDocId),
                      setDocLoadingId,
                    )
                  }
                >
                  {docLoadingId === String(detail.paymentProofDocId) ? (
                    <>
                      <CSpinner size="sm" className="me-1" />
                      Opening…
                    </>
                  ) : (
                    "View Payment Proof"
                  )}
                </CButton>
              )}
            </div>
          )}
        </div>

        {/* Products */}
        <div
          className="d-flex align-items-center justify-content-between mb-2 px-1"
          style={{ fontSize: 14 }}
        >
          <span className="fw-semibold" style={{ color: "#1e293b" }}>
            <CIcon icon={cilTag} className="me-1" />
            Products ({products.length})
          </span>
          <span style={{ color: "#64748b", fontWeight: 600 }}>
            {fmtAmount(grandTotal)}
          </span>
        </div>

        {products.length === 0 ? (
          <div
            className="text-center py-5 rounded-3"
            style={{
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              color: "#94a3b8",
            }}
          >
            No products found.
          </div>
        ) : (
          <CRow className="g-3">
            {products.map((p, idx) => {
              const isRejected = p.hodStatus === "rejected";
              const isApproved = p.hodStatus === "approved";
              const supplierDetails = formatSupplierSnapshot(
                p.supplierSnapshot,
              );
              const isDocLoading = docLoadingId === String(p.billDocId);

              return (
                <CCol key={p._id || idx} xs={12} md={6} xl={4}>
                  <CCard
                    className="h-100 mb-0"
                    style={{
                      border: isRejected
                        ? "1.5px solid #fca5a5"
                        : isApproved
                          ? "1.5px solid #86efac"
                          : "1.5px solid #e2e8f0",
                      borderRadius: 12,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Colored top bar */}
                    <div
                      style={{
                        height: 4,
                        background: isRejected
                          ? "#ef4444"
                          : isApproved
                            ? "#22c55e"
                            : "#f59e0b",
                      }}
                    />

                    <CCardBody className="p-3 d-flex flex-column gap-2">
                      {/* Name + amount */}
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            className="fw-bold"
                            style={{
                              fontSize: 15,
                              color: "#1e293b",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.productName || `Product ${idx + 1}`}
                          </div>
                          {p.rawProductCode && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#2563eb",
                                fontFamily: "monospace",
                                marginTop: 1,
                              }}
                            >
                              {p.rawProductCode}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#1e293b",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {fmtAmount(p.amount)}
                        </div>
                      </div>

                      {/* Qty + Supplier chips */}
                      <div className="d-flex flex-wrap gap-2">
                        {p.quantity != null && (
                          <span
                            style={{
                              fontSize: 12,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: "#f1f5f9",
                              color: "#475569",
                              fontWeight: 500,
                            }}
                          >
                            Qty: {p.quantity}
                            {p.unit ? ` ${p.unit}` : ""}
                          </span>
                        )}
                        {supplierDetails.title && (
                          <div
                            style={{
                              fontSize: 12,
                              padding: "6px 8px",
                              borderRadius: 6,
                              background: "#f8fafc",
                              color: "#475569",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div className="fw-semibold">
                              {supplierDetails.title}
                            </div>
                            {supplierDetails.lines.map((line) => (
                              <div key={line} style={{ marginTop: 2 }}>
                                {line}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Product remark */}
                      {p.remark && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          <span
                            className="fw-medium"
                            style={{ color: "#475569" }}
                          >
                            Note:{" "}
                          </span>
                          {p.remark}
                        </div>
                      )}

                      {/* View bill button */}
                      {p.billDocId && (
                        <CButton
                          size="sm"
                          color="secondary"
                          variant="outline"
                          disabled={!!docLoadingId}
                          onClick={() =>
                            openDocWithAuth(
                              String(p.billDocId),
                              setDocLoadingId,
                            )
                          }
                          style={{
                            alignSelf: "flex-start",
                            fontSize: 12,
                            borderRadius: 6,
                          }}
                        >
                          {isDocLoading ? (
                            <>
                              <CSpinner size="sm" className="me-1" />
                              Loading…
                            </>
                          ) : (
                            "View Bill"
                          )}
                        </CButton>
                      )}

                      {/* HOD status */}
                      <div
                        className="d-flex align-items-center justify-content-between mt-auto pt-2"
                        style={{ borderTop: "1px solid #f1f5f9" }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#94a3b8",
                            fontWeight: 500,
                          }}
                        >
                          HOD Status
                        </span>
                        <HodStatusPill status={p.hodStatus} />
                      </div>

                      {/* Mark Purchased — only when finance approved */}
                      {detail.status === "finance_approved" &&
                        (p.isPurchased ? (
                          <div
                            className="d-flex align-items-center gap-2 rounded-2 p-2"
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #86efac",
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#15803d",
                            }}
                          >
                            <CIcon
                              icon={cilCheckCircle}
                              style={{ fontSize: 15 }}
                            />
                            Purchased
                            {p.purchasedAt && (
                              <span
                                style={{
                                  fontWeight: 400,
                                  color: "#64748b",
                                  marginLeft: "auto",
                                }}
                              >
                                {dateFormatter(p.purchasedAt, "—")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <CButton
                            color="primary"
                            size="sm"
                            className="w-100"
                            style={{ borderRadius: 8, fontWeight: 600 }}
                            disabled={purchasingId === String(p._id)}
                            onClick={() => onMarkPurchased(String(p._id))}
                          >
                            {purchasingId === String(p._id) ? (
                              <>
                                <CSpinner size="sm" className="me-1" />
                                Marking…
                              </>
                            ) : (
                              "Mark as Purchased"
                            )}
                          </CButton>
                        ))}

                      {/* Rejected panel */}
                      {isRejected && (
                        <div
                          className="rounded-2 p-3 d-flex flex-column gap-2"
                          style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                          }}
                        >
                          <div
                            className="d-flex align-items-center gap-2"
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#dc2626",
                            }}
                          >
                            <CIcon icon={cilWarning} style={{ fontSize: 15 }} />
                            Rejection Reason
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#7f1d1d",
                              lineHeight: 1.5,
                            }}
                          >
                            {p.hodRemark || "No reason provided."}
                          </div>
                          {p.hodReviewedBySnapshot && (
                            <div style={{ fontSize: 11, color: "#b91c1c" }}>
                              —{" "}
                              {p.hodReviewedBySnapshot.name ||
                                p.hodReviewedBySnapshot.fullName ||
                                ""}
                              {p.hodReviewedAt
                                ? `, ${dateFormatter(p.hodReviewedAt, "—")}`
                                : ""}
                            </div>
                          )}
                          <CButton
                            color="danger"
                            size="sm"
                            className="w-100 mt-1"
                            style={{ borderRadius: 8, fontWeight: 600 }}
                            onClick={() => openResubmit(p)}
                          >
                            <CIcon icon={cilCloudUpload} className="me-2" />
                            Upload Again
                          </CButton>
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              );
            })}
          </CRow>
        )}
      </CCol>

      {/* Resubmit drawer */}
      <COffcanvas
        placement="end"
        visible={resubmitOpen}
        onHide={closeResubmit}
        scroll
        style={{ width: "min(460px, 100vw)" }}
      >
        <COffcanvasHeader
          className="d-flex align-items-center justify-content-between"
          style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 20px" }}
        >
          <COffcanvasTitle
            style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}
          >
            Upload Information Again
          </COffcanvasTitle>
          <CCloseButton onClick={closeResubmit} disabled={resubmitting} />
        </COffcanvasHeader>

        <COffcanvasBody
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {resubmitProduct && (
            <>
              {/* Product summary */}
              <div
                className="rounded-2 p-3"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
              >
                <div
                  style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}
                >
                  {resubmitProduct.productName || "Product"}
                </div>
                {resubmitProduct.rawProductCode && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#2563eb",
                      fontFamily: "monospace",
                      marginTop: 2,
                    }}
                  >
                    {resubmitProduct.rawProductCode}
                  </div>
                )}
                {resubmitProduct.hodRemark && (
                  <div
                    className="mt-2 rounded-2 p-2 d-flex gap-2 align-items-start"
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <CIcon
                      icon={cilWarning}
                      style={{
                        color: "#dc2626",
                        fontSize: 14,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 12,
                        color: "#7f1d1d",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Rejected:</strong> {resubmitProduct.hodRemark}
                    </div>
                  </div>
                )}
              </div>

              {/* Bill upload */}
              <div>
                <CFormLabel
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Bill / Invoice <span style={{ color: "#ef4444" }}>*</span>
                </CFormLabel>
                {resubmitProduct.billDocId && (
                  <button
                    type="button"
                    onClick={() =>
                      openDocWithAuth(
                        String(resubmitProduct.billDocId),
                        setDocLoadingId,
                      )
                    }
                    disabled={!!docLoadingId}
                    style={{
                      width: "100%",
                      marginBottom: 8,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #bfdbfe",
                      background: "#eff6ff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#1d4ed8",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    <CIcon
                      icon={cilCloudUpload}
                      style={{ fontSize: 15, flexShrink: 0 }}
                    />
                    {docLoadingId === String(resubmitProduct.billDocId)
                      ? "Opening…"
                      : "View previously uploaded bill"}
                  </button>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  ref={billInputRef}
                  className="d-none"
                  onChange={onBillFileChange}
                />
                <button
                  type="button"
                  onClick={() => billInputRef.current?.click()}
                  disabled={resubmitting}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: resubmitBillFile
                      ? "2px solid #22c55e"
                      : "2px dashed #cbd5e1",
                    background: resubmitBillFile ? "#f0fdf4" : "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: resubmitBillFile ? "#16a34a" : "#64748b",
                    fontSize: 13,
                    fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                >
                  <CIcon
                    icon={resubmitBillFile ? cilCheckCircle : cilCloudUpload}
                    style={{ fontSize: 20, flexShrink: 0 }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {resubmitBillFile
                      ? resubmitBillName
                      : "Upload new bill / invoice"}
                  </span>
                </button>
              </div>

              {/* Photo upload */}
              <div>
                <CFormLabel
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Product Photo <span style={{ color: "#ef4444" }}>*</span>
                </CFormLabel>
                {resubmitProduct.productImageDocId && (
                  <button
                    type="button"
                    onClick={() =>
                      openDocWithAuth(
                        String(resubmitProduct.productImageDocId),
                        setDocLoadingId,
                      )
                    }
                    disabled={!!docLoadingId}
                    style={{
                      width: "100%",
                      marginBottom: 8,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #bfdbfe",
                      background: "#eff6ff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#1d4ed8",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    <CIcon
                      icon={cilCloudUpload}
                      style={{ fontSize: 15, flexShrink: 0 }}
                    />
                    {docLoadingId === String(resubmitProduct.productImageDocId)
                      ? "Opening…"
                      : "View previously uploaded photo"}
                  </button>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={photoInputRef}
                  className="d-none"
                  onChange={onPhotoFileChange}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={resubmitting}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: resubmitPhotoFile
                      ? "2px solid #22c55e"
                      : "2px dashed #cbd5e1",
                    background: resubmitPhotoFile ? "#f0fdf4" : "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: resubmitPhotoFile ? "#16a34a" : "#64748b",
                    fontSize: 13,
                    fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                >
                  <CIcon
                    icon={resubmitPhotoFile ? cilCheckCircle : cilCloudUpload}
                    style={{ fontSize: 20, flexShrink: 0 }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {resubmitPhotoFile
                      ? resubmitPhotoName
                      : "Upload new product photo"}
                  </span>
                </button>
              </div>

              {/* Amount */}
              <div>
                <CFormLabel
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Amount (₹) <span style={{ color: "#ef4444" }}>*</span>
                </CFormLabel>
                <CFormInput
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={resubmitAmount}
                  onChange={(e) => setResubmitAmount(e.target.value)}
                  disabled={resubmitting}
                  style={{ borderRadius: 8, fontSize: 14 }}
                />
              </div>

              {/* Remark */}
              <div>
                <CFormLabel
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  Remark{" "}
                  <span
                    style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}
                  >
                    (optional)
                  </span>
                </CFormLabel>
                <CFormTextarea
                  rows={3}
                  placeholder="Add a note for the reviewer…"
                  value={resubmitRemark}
                  onChange={(e) => setResubmitRemark(e.target.value)}
                  disabled={resubmitting}
                  style={{ borderRadius: 8, fontSize: 14 }}
                />
              </div>

              {/* Actions */}
              <div className="d-flex gap-2 pt-2" style={{ marginTop: "auto" }}>
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={closeResubmit}
                  disabled={resubmitting}
                  style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
                >
                  Cancel
                </CButton>
                <CButton
                  color="primary"
                  onClick={onSubmitResubmit}
                  disabled={resubmitting}
                  style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
                >
                  {resubmitting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Submitting…
                    </>
                  ) : (
                    "Resubmit"
                  )}
                </CButton>
              </div>
            </>
          )}
        </COffcanvasBody>
      </COffcanvas>
    </CRow>
  );
};

export default BatchBillingRequestDetail;
