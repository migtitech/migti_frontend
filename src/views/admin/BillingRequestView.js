import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilMoney,
  cilArrowLeft,
  cilOptions,
  cilCheckCircle,
} from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import supplierService from "../../services/supplierService";
import documentService from "../../services/documentService";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const fmtAmount = (n) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

const fmtField = (value) => {
  const text = value != null ? String(value).trim() : "";
  return text || "—";
};

const SUPPLIER_BANK_DETAIL_FIELDS = [
  { key: "accountHolderName", label: "Account Holder Name" },
  { key: "accountNumber", label: "Account Number" },
  { key: "bankName", label: "Bank Name" },
  { key: "ifscCode", label: "IFSC Code" },
  { key: "upiDetails", label: "UPI Details" },
];

const normalizeSupplierBankDetails = (bankDetails) => {
  const src = bankDetails && typeof bankDetails === "object" ? bankDetails : {};
  return {
    accountHolderName: src.accountHolderName || "",
    accountNumber: src.accountNumber || "",
    bankName: src.bankName || "",
    ifscCode: src.ifscCode || "",
    upiDetails: src.upiDetails || "",
  };
};

const supplierSnapshotTitle = (snapshot) =>
  snapshot?.name || snapshot?.shopname || snapshot?.companyName || "Supplier";

const formatSupplierSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    return { title: "—", lines: [] };
  }
  const title =
    snapshot.name || snapshot.shopname || snapshot.companyName || "—";
  const lines = [
    snapshot.shopname &&
      snapshot.name &&
      snapshot.shopname !== snapshot.name &&
      snapshot.shopname,
    snapshot.phone_1 && `Phone: ${snapshot.phone_1}`,
    snapshot.gst && `GST: ${snapshot.gst}`,
    snapshot.address && `Address: ${snapshot.address}`,
    snapshot.email && `Email: ${snapshot.email}`,
  ].filter(Boolean);
  return { title, lines };
};

const SupplierDetailsCell = ({
  snapshot,
  showBankDetailsAction,
  onShowBankDetails,
}) => {
  const { title, lines } = formatSupplierSnapshot(snapshot);
  if (title === "—" && lines.length === 0) return "—";
  return (
    <div style={{ minWidth: 160 }}>
      <div className="fw-medium">{title}</div>
      {lines.map((line) => (
        <div
          key={line}
          className="text-body-secondary"
          style={{ fontSize: 12, lineHeight: 1.35 }}
        >
          {line}
        </div>
      ))}
      {showBankDetailsAction && (
        <CButton
          size="sm"
          color="link"
          className="p-0 mt-1 text-decoration-none"
          style={{ fontSize: 12 }}
          onClick={onShowBankDetails}
        >
          Show bank details
        </CButton>
      )}
    </div>
  );
};

const STATUS_MAP = {
  hod_approval_pending: { label: "Pending", color: "warning" },
  hod_approved: { label: "HOD Approved", color: "success" },
  hod_rejected: { label: "Rejected", color: "danger" },
  finance_approved: { label: "Finance Approved", color: "primary" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[String(status || "").toLowerCase()] || {
    label: status || "—",
    color: "secondary",
  };
  return <CBadge color={s.color}>{s.label}</CBadge>;
};

const unwrap = (res) => {
  const inner = res?.data ?? res;
  return inner?.data ?? inner;
};

const openDocWithAuth = async (docId, setLoadingKey) => {
  if (!docId) return;
  setLoadingKey(docId);
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
    setLoadingKey(null);
  }
};

const HOD_PRODUCT_STATUS_MAP = {
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "danger" },
};

const HodProductBadge = ({ status }) => {
  if (!status) return <CBadge color="secondary">Pending</CBadge>;
  const s = HOD_PRODUCT_STATUS_MAP[status] || {
    label: status,
    color: "secondary",
  };
  return <CBadge color={s.color}>{s.label}</CBadge>;
};

const BillingRequestView = ({
  basePath = "/billing-requests",
  pageTitle = "Billing Requests",
  showProductAction = false,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [docLoadingKey, setDocLoadingKey] = useState(null);

  // Finance approve offcanvas state
  const [actionOpen, setActionOpen] = useState(false);
  const [financeRemark, setFinanceRemark] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofFileName, setProofFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Per-product HOD action offcanvas state
  const [productActionOpen, setProductActionOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [hodRemark, setHodRemark] = useState("");
  const [hodSubmitting, setHodSubmitting] = useState(false);

  const [bankDetailsOpen, setBankDetailsOpen] = useState(false);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(false);
  const [bankDetailsSupplier, setBankDetailsSupplier] = useState(null);
  const [bankDetails, setBankDetails] = useState(() =>
    normalizeSupplierBankDetails(),
  );

  const showSupplierBankDetails = !showProductAction;

  const reload = () => {
    if (!id) return;
    billingRequestBatchService
      .getById(id)
      .then((res) => setDetail(unwrap(res)))
      .catch(() => {});
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    billingRequestBatchService
      .getById(id)
      .then((res) => setDetail(unwrap(res)))
      .catch((e) => toastError(e?.message || "Failed to load billing request"))
      .finally(() => setLoading(false));
  }, [id]);

  const openAction = () => {
    setFinanceRemark("");
    setPaidAmount("");
    setProofFile(null);
    setProofFileName("");
    setActionOpen(true);
  };

  const onProofFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProofFile(file);
    setProofFileName(file.name);
  };

  const openProductAction = (product) => {
    setSelectedProduct(product);
    setHodRemark("");
    setProductActionOpen(true);
  };

  const closeProductAction = () => {
    if (hodSubmitting) return;
    setProductActionOpen(false);
    setSelectedProduct(null);
    setHodRemark("");
  };

  const onHodProductAction = async (action) => {
    if (!selectedProduct?._id) return;
    setHodSubmitting(true);
    try {
      const res = await billingRequestBatchService.hodProductAction(
        id,
        String(selectedProduct._id),
        { action, remark: hodRemark.trim() },
      );
      const updated = unwrap(res);
      if (updated) setDetail(updated);
      toastSuccess(
        action === "approved" ? "Product approved." : "Product rejected.",
      );
      closeProductAction();
    } catch (e) {
      toastError(e?.message || "Failed to process action.");
    } finally {
      setHodSubmitting(false);
    }
  };

  const closeBankDetails = () => {
    if (bankDetailsLoading) return;
    setBankDetailsOpen(false);
    setBankDetailsSupplier(null);
    setBankDetails(normalizeSupplierBankDetails());
  };

  const openSupplierBankDetails = async (snapshot) => {
    if (!snapshot || typeof snapshot !== "object") {
      toastError("No supplier linked to this product.");
      return;
    }

    setBankDetailsSupplier(snapshot);
    setBankDetails(normalizeSupplierBankDetails(snapshot.bankDetails));
    setBankDetailsOpen(true);
    setBankDetailsLoading(true);

    try {
      const supplierId = snapshot._id ? String(snapshot._id) : "";
      if (supplierId) {
        const res = await supplierService.getById(supplierId);
        const data = res?.data || res;
        setBankDetails(normalizeSupplierBankDetails(data?.bankDetails));
        setBankDetailsSupplier((prev) => ({
          ...(prev || {}),
          name: data?.name || prev?.name,
          shopname: data?.shopname || prev?.shopname,
        }));
      }
    } catch (e) {
      toastError(e?.message || "Could not load latest supplier bank details.");
    } finally {
      setBankDetailsLoading(false);
    }
  };

  const onSubmitFinanceApprove = async () => {
    if (!isPaidAmountValid) return;

    setSubmitting(true);
    try {
      let paymentProofDocId = null;
      if (proofFile) {
        const up = await documentService.uploadAttachments([proofFile]);
        const docs =
          up?.data?.documents ||
          up?.documents ||
          up?.data?.data?.documents ||
          [];
        const first = docs[0];
        if (!first?._id) {
          toastError("Proof upload failed — no document ID returned.");
          return;
        }
        paymentProofDocId = String(first._id);
      }

      const res = await billingRequestBatchService.financeApprove(id, {
        financeRemark: financeRemark.trim(),
        paidAmount: paidAmount !== "" ? Number(paidAmount) : null,
        paymentProofDocId,
      });
      const updated = unwrap(res);
      if (updated) setDetail(updated);
      toastSuccess("Finance approval submitted successfully.");
      setActionOpen(false);
      reload();
    } catch (e) {
      toastError(e?.message || "Failed to submit finance approval.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner />
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
  const parsedPaidAmount = paidAmount.trim() !== "" ? Number(paidAmount) : null;
  const isPaidAmountValid =
    parsedPaidAmount != null &&
    Number.isFinite(parsedPaidAmount) &&
    Math.round(parsedPaidAmount * 100) === Math.round(grandTotal * 100);
  const createdByName =
    detail.createdBySnapshot?.name || detail.createdBySnapshot?.fullName || "—";
  const reviewedByName =
    detail.reviewedBySnapshot?.name ||
    detail.reviewedBySnapshot?.fullName ||
    null;

  return (
    <CRow>
      <CCol xs={12}>
        <CBreadcrumb className="mb-2">
          <CBreadcrumbItem href="#/dashboard">Home</CBreadcrumbItem>
          <CBreadcrumbItem href={`#${basePath}`}>{pageTitle}</CBreadcrumbItem>
          <CBreadcrumbItem active>
            {detail.billingRequestCode || "Detail"}
          </CBreadcrumbItem>
        </CBreadcrumb>

        <div className="mb-3 d-flex align-items-center justify-content-between">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <CIcon icon={cilArrowLeft} className="me-1" size="sm" />
            Back
          </CButton>
          <CButton color="primary" size="sm" onClick={openAction}>
            <CIcon icon={cilOptions} className="me-1" size="sm" />
            Action
          </CButton>
        </div>

        {/* Summary card */}
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between">
            <span>
              <CIcon icon={cilMoney} className="me-2" />
              {detail.billingRequestCode || "Billing Request"}
            </span>
            <StatusBadge status={detail.status} />
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol sm={6} md={3}>
                <div className="text-body-secondary small mb-1">
                  Sales Order Code
                </div>
                <div className="fw-medium">
                  <code>{detail.poCode || "—"}</code>
                </div>
              </CCol>
              <CCol sm={6} md={3}>
                <div className="text-body-secondary small mb-1">Raised by</div>
                <div className="fw-medium">{createdByName}</div>
              </CCol>
              <CCol sm={6} md={3}>
                <div className="text-body-secondary small mb-1">Raised on</div>
                <div className="fw-medium">
                  {dateFormatter(detail.createdAt, "—")}
                </div>
              </CCol>
              <CCol sm={6} md={3}>
                <div className="text-body-secondary small mb-1">
                  Total amount
                </div>
                <div className="fw-medium fw-bold">{fmtAmount(grandTotal)}</div>
              </CCol>
              {reviewedByName && (
                <>
                  <CCol sm={6} md={3}>
                    <div className="text-body-secondary small mb-1">
                      Reviewed by
                    </div>
                    <div className="fw-medium">{reviewedByName}</div>
                  </CCol>
                  <CCol sm={6} md={3}>
                    <div className="text-body-secondary small mb-1">
                      Reviewed at
                    </div>
                    <div className="fw-medium">
                      {dateFormatter(detail.reviewedAt, "—")}
                    </div>
                  </CCol>
                </>
              )}
              {detail.statusRemark && (
                <CCol xs={12}>
                  <div className="text-body-secondary small mb-1">Remark</div>
                  <div className="fw-medium">{detail.statusRemark}</div>
                </CCol>
              )}
            </CRow>
          </CCardBody>
        </CCard>

        {/* Payment proof — shown when finance approved */}
        {detail.status === "finance_approved" && (
          <CCard className="mb-4" style={{ border: "1.5px solid #86efac" }}>
            <CCardHeader
              className="d-flex align-items-center gap-2"
              style={{
                background: "#f0fdf4",
                borderBottom: "1px solid #86efac",
              }}
            >
              <CIcon icon={cilCheckCircle} style={{ color: "#15803d" }} />
              <span style={{ fontWeight: 700, color: "#15803d" }}>
                Payment Approved
              </span>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3 small">
                {detail.paidAmount != null && (
                  <CCol sm={6} md={3}>
                    <div className="text-body-secondary mb-1">Paid Amount</div>
                    <div className="fw-bold fs-6" style={{ color: "#15803d" }}>
                      {fmtAmount(detail.paidAmount)}
                    </div>
                  </CCol>
                )}
                {detail.financeApprovedBySnapshot && (
                  <CCol sm={6} md={3}>
                    <div className="text-body-secondary mb-1">Approved by</div>
                    <div className="fw-medium">
                      {detail.financeApprovedBySnapshot.name ||
                        detail.financeApprovedBySnapshot.fullName ||
                        "—"}
                    </div>
                  </CCol>
                )}
                {detail.financeApprovedAt && (
                  <CCol sm={6} md={3}>
                    <div className="text-body-secondary mb-1">Approved on</div>
                    <div className="fw-medium">
                      {dateFormatter(detail.financeApprovedAt, "—")}
                    </div>
                  </CCol>
                )}
                {detail.financeRemark && (
                  <CCol xs={12}>
                    <div className="text-body-secondary mb-1">
                      Finance Remark
                    </div>
                    <div className="fw-medium">{detail.financeRemark}</div>
                  </CCol>
                )}
                {detail.paymentProofDocId && (
                  <CCol xs={12}>
                    <CButton
                      size="sm"
                      color="success"
                      variant="outline"
                      disabled={!!docLoadingKey}
                      onClick={() =>
                        openDocWithAuth(String(detail.paymentProofDocId), (k) =>
                          setDocLoadingKey(
                            k ? `proof-${detail.paymentProofDocId}` : null,
                          ),
                        )
                      }
                    >
                      {docLoadingKey === `proof-${detail.paymentProofDocId}` ? (
                        <>
                          <CSpinner size="sm" className="me-1" />
                          Opening…
                        </>
                      ) : (
                        "View Payment Proof"
                      )}
                    </CButton>
                  </CCol>
                )}
              </CRow>
            </CCardBody>
          </CCard>
        )}

        {/* Products table */}
        <CCard>
          <CCardHeader className="fw-semibold">
            Products ({products.length})
          </CCardHeader>
          <CCardBody className="p-0">
            {products.length === 0 ? (
              <p className="text-body-secondary text-center py-4 mb-0">
                No products found.
              </p>
            ) : (
              <CTable align="middle" responsive hover className="mb-0">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell scope="col">#</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Product</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Code</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Qty / Unit</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Amount</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Supplier</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Remark</CTableHeaderCell>
                    <CTableHeaderCell scope="col" className="text-end">
                      Action
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {products.map((p, idx) => {
                    const imgDocId = p.productImageDocId
                      ? String(p.productImageDocId)
                      : null;
                    const billDocId = p.billDocId ? String(p.billDocId) : null;
                    const imgKey = imgDocId ? `img-${imgDocId}` : null;
                    const billKey = billDocId ? `bill-${billDocId}` : null;
                    return (
                      <CTableRow key={p._id || idx}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell className="fw-medium">
                          {p.productName || "—"}
                        </CTableDataCell>
                        <CTableDataCell>
                          <code className="small">
                            {p.rawProductCode || "—"}
                          </code>
                        </CTableDataCell>
                        <CTableDataCell>
                          {p.quantity != null
                            ? `${p.quantity}${p.unit ? ` ${p.unit}` : ""}`
                            : "—"}
                        </CTableDataCell>
                        <CTableDataCell>{fmtAmount(p.amount)}</CTableDataCell>
                        <CTableDataCell>
                          <SupplierDetailsCell
                            snapshot={p.supplierSnapshot}
                            showBankDetailsAction={
                              showSupplierBankDetails && !!p.supplierSnapshot
                            }
                            onShowBankDetails={() =>
                              openSupplierBankDetails(p.supplierSnapshot)
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell
                          style={{ maxWidth: 200 }}
                          className="text-truncate"
                          title={p.remark || undefined}
                        >
                          {p.remark || "—"}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <div className="d-flex gap-2 justify-content-end flex-wrap">
                            {showProductAction && (
                              <CButton
                                size="sm"
                                color="warning"
                                variant="outline"
                                onClick={() => openProductAction(p)}
                              >
                                Action
                              </CButton>
                            )}
                            {imgDocId && (
                              <CButton
                                size="sm"
                                color="info"
                                variant="outline"
                                disabled={docLoadingKey === imgKey}
                                onClick={() =>
                                  openDocWithAuth(imgDocId, (k) =>
                                    setDocLoadingKey(k ? imgKey : null),
                                  )
                                }
                              >
                                {docLoadingKey === imgKey ? (
                                  <CSpinner size="sm" />
                                ) : (
                                  "View Image"
                                )}
                              </CButton>
                            )}
                            {billDocId && (
                              <CButton
                                size="sm"
                                color="primary"
                                variant="outline"
                                disabled={docLoadingKey === billKey}
                                onClick={() =>
                                  openDocWithAuth(billDocId, (k) =>
                                    setDocLoadingKey(k ? billKey : null),
                                  )
                                }
                              >
                                {docLoadingKey === billKey ? (
                                  <CSpinner size="sm" />
                                ) : (
                                  "View Bill"
                                )}
                              </CButton>
                            )}
                            {!showProductAction && !imgDocId && !billDocId && (
                              <span className="text-body-secondary small">
                                —
                              </span>
                            )}
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    );
                  })}
                  <CTableRow className="fw-bold table-light">
                    <CTableDataCell colSpan={4} className="text-end">
                      Grand Total
                    </CTableDataCell>
                    <CTableDataCell>{fmtAmount(grandTotal)}</CTableDataCell>
                    <CTableDataCell colSpan={showProductAction ? 4 : 4} />
                  </CTableRow>
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* Supplier bank details offcanvas */}
      <COffcanvas
        placement="end"
        visible={bankDetailsOpen}
        onHide={closeBankDetails}
        scroll
        style={{ width: "min(420px, 95vw)" }}
      >
        <COffcanvasHeader className="d-flex align-items-center justify-content-between border-bottom">
          <COffcanvasTitle className="fw-semibold">
            Supplier Bank Details
          </COffcanvasTitle>
          <CCloseButton
            className="ms-2"
            disabled={bankDetailsLoading}
            onClick={closeBankDetails}
          />
        </COffcanvasHeader>
        <COffcanvasBody className="p-3">
          {bankDetailsSupplier && (
            <div className="border rounded p-3 bg-light mb-3">
              <div className="fw-medium">
                {supplierSnapshotTitle(bankDetailsSupplier)}
              </div>
              {bankDetailsSupplier.shopname &&
                bankDetailsSupplier.name &&
                bankDetailsSupplier.shopname !== bankDetailsSupplier.name && (
                  <div className="small text-body-secondary mt-1">
                    {bankDetailsSupplier.shopname}
                  </div>
                )}
            </div>
          )}

          {bankDetailsLoading ? (
            <div className="text-center py-4">
              <CSpinner />
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {SUPPLIER_BANK_DETAIL_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <div className="text-body-secondary small mb-1">{label}</div>
                  <div className="fw-medium">{fmtField(bankDetails[key])}</div>
                </div>
              ))}
            </div>
          )}
        </COffcanvasBody>
      </COffcanvas>

      {/* Per-product HOD Action Offcanvas */}
      <COffcanvas
        placement="end"
        visible={productActionOpen}
        onHide={closeProductAction}
        scroll
        style={{ width: "min(400px, 95vw)" }}
      >
        <COffcanvasHeader className="d-flex align-items-center justify-content-between border-bottom">
          <COffcanvasTitle className="fw-semibold">
            Product Action
          </COffcanvasTitle>
          <CCloseButton
            className="ms-2"
            disabled={hodSubmitting}
            onClick={closeProductAction}
          />
        </COffcanvasHeader>
        <COffcanvasBody className="p-3 d-flex flex-column gap-3">
          {selectedProduct && (
            <div className="border rounded p-3 bg-light">
              <div className="fw-medium">
                {selectedProduct.productName || "—"}
              </div>
              {selectedProduct.rawProductCode && (
                <div className="small text-body-secondary mt-1">
                  Code: <code>{selectedProduct.rawProductCode}</code>
                </div>
              )}
              <div className="small text-body-secondary mt-1">
                Amount: {fmtAmount(selectedProduct.amount)}
              </div>
              <div className="mt-2">
                <span className="small text-body-secondary me-2">
                  Current status:
                </span>
                <HodProductBadge status={selectedProduct.hodStatus} />
              </div>
            </div>
          )}

          <div>
            <CFormLabel className="fw-medium mb-1">Remark</CFormLabel>
            <CFormTextarea
              rows={4}
              placeholder="Add a remark (optional)"
              value={hodRemark}
              onChange={(e) => setHodRemark(e.target.value)}
              disabled={hodSubmitting}
            />
          </div>

          <div className="d-flex gap-2 mt-auto pt-3 border-top">
            <CButton
              color="success"
              className="flex-fill"
              disabled={hodSubmitting}
              onClick={() => onHodProductAction("approved")}
            >
              {hodSubmitting ? <CSpinner size="sm" /> : "Approve"}
            </CButton>
            <CButton
              color="danger"
              className="flex-fill"
              disabled={hodSubmitting}
              onClick={() => onHodProductAction("rejected")}
            >
              {hodSubmitting ? <CSpinner size="sm" /> : "Reject"}
            </CButton>
          </div>
        </COffcanvasBody>
      </COffcanvas>

      {/* Finance Approve Offcanvas */}
      <COffcanvas
        placement="end"
        visible={actionOpen}
        onHide={() => !submitting && setActionOpen(false)}
        scroll
        style={{ width: "min(420px, 95vw)" }}
      >
        <COffcanvasHeader className="d-flex align-items-center justify-content-between border-bottom">
          <COffcanvasTitle className="fw-semibold">
            Finance Approval
          </COffcanvasTitle>
          <CCloseButton
            className="ms-2"
            disabled={submitting}
            onClick={() => setActionOpen(false)}
          />
        </COffcanvasHeader>
        <COffcanvasBody className="p-3 d-flex flex-column gap-3">
          <div>
            <CFormLabel className="fw-medium mb-1">Remark</CFormLabel>
            <CFormTextarea
              rows={3}
              placeholder="Add a remark (optional)"
              value={financeRemark}
              onChange={(e) => setFinanceRemark(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <CFormLabel className="fw-medium mb-1">Paid Amount</CFormLabel>
            <CFormInput
              type="number"
              min={0}
              step="0.01"
              placeholder="Enter paid amount"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              disabled={submitting}
              invalid={parsedPaidAmount != null && !isPaidAmountValid}
            />
            <div className="small text-body-secondary mt-1">
              Total amount: {fmtAmount(grandTotal)}
            </div>
            {parsedPaidAmount != null && !isPaidAmountValid && (
              <div className="small text-danger mt-1">
                Paid amount must equal the total amount.
              </div>
            )}
          </div>

          <div>
            <CFormLabel className="fw-medium mb-1">Payment Proof</CFormLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="d-none"
              onChange={onProofFileChange}
              disabled={submitting}
            />
            <div className="d-flex align-items-center gap-2">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => fileInputRef.current?.click()}
              >
                {proofFileName ? "Change File" : "Upload Proof"}
              </CButton>
              {proofFileName && (
                <span
                  className="small text-body-secondary text-truncate"
                  style={{ maxWidth: 200 }}
                  title={proofFileName}
                >
                  {proofFileName}
                </span>
              )}
            </div>
          </div>

          {isPaidAmountValid && (
            <div className="mt-auto pt-3 border-top">
              <CButton
                color="primary"
                className="w-100"
                disabled={submitting}
                onClick={onSubmitFinanceApprove}
              >
                {submitting ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Submitting…
                  </>
                ) : (
                  "Submit"
                )}
              </CButton>
            </div>
          )}
        </COffcanvasBody>
      </COffcanvas>
    </CRow>
  );
};

export default BillingRequestView;
