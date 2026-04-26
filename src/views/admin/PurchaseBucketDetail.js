import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CTabContent,
  CTabPane,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBucketService from "../../services/purchaseBucketService";
import documentService from "../../services/documentService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader } from "../../components";
import usePermissions from "../../hooks/usePermissions";
import { getAssetsUrl } from "../../api/endpoints";

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const formatVal = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") {
    if (v instanceof Date || (typeof v === "string" && !Number.isNaN(Date.parse(v))))
      return formatDateTime(v);
    return JSON.stringify(v);
  }
  return String(v);
};

/** Supplier snapshot on query line rates (Pro Bucket) */
const formatSupplierLabel = (s) => {
  if (!s || typeof s !== "object") return "—";
  return (
    s.name ||
    s.shopname ||
    s.shop_location ||
    (s.label ? String(s.label) : "") ||
    "—"
  );
};

const formatSupplierExtra = (s) => {
  if (!s || typeof s !== "object") return "";
  const parts = [];
  if (s.phone_1) parts.push(`Phone: ${s.phone_1}`);
  if (s.phone_2) parts.push(`Alt: ${s.phone_2}`);
  if (s.email) parts.push(s.email);
  if (s.gst) parts.push(`GST: ${s.gst}`);
  if (s.address) parts.push(String(s.address).slice(0, 80));
  return parts.join(" · ");
};

const proBucketStatusLabel = (s) => {
  switch (s) {
    case "pending":
      return "Pending";
    case "rate_submitted":
      return "Rate submitted";
    case "fulfilled":
      return "Fulfilled";
    default:
      return s || "—";
  }
};

/** API returns canonical `status` (see resolvePoLineStatusKey on server). */
const lineStatusFromItem = (item) => {
  const s = item?.status;
  if (s != null && String(s).trim() !== "") return String(s).trim();
  return "pending";
};

const lineStatusBadge = (s) => {
  switch (s) {
    case "finance_approved":
      return <CBadge color="dark">Finance approved</CBadge>;
    case "payment_request_raised":
      return <CBadge color="info">Payment request raised</CBadge>;
    case "inventory_received":
      return <CBadge color="primary">Inventory received</CBadge>;
    case "ready_for_dispatchment":
      return <CBadge color="success">Ready for dispatch</CBadge>;
    case "pending":
    default:
      return (
        <CBadge color="warning">{s && s !== "pending" ? s : "Pending"}</CBadge>
      );
  }
};

const lineStatusText = (s) => {
  switch (s) {
    case "purchased":
      return "Purchased";
    case "finance_approved":
      return "Finance approved";
    case "payment_request_raised":
      return "Payment request raised";
    case "inventory_received":
      return "Inventory received";
    case "ready_for_dispatchment":
      return "Ready for dispatch";
    case "pending":
    default:
      return s && s !== "pending" ? s : "Pending";
  }
};

const PurchaseBucketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate } = usePermissions();
  const canRaise = canUpdate("purchase_bucket");

  const [activeTab, setActiveTab] = useState("details");
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [billDocId, setBillDocId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [markingPurchased, setMarkingPurchased] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await withMinimumDelay(() => purchaseBucketService.getById(id));
      const doc = res?.data;
      setItem(doc && typeof doc === "object" && !Array.isArray(doc) ? doc : null);
    } catch (e) {
      toastError(e?.message || "Failed to load item");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onUploadBill = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await documentService.uploadAttachments([file]);
      const docs = res?.data?.documents || res?.documents || [];
      const first = docs[0];
      if (first?._id) {
        setBillDocId(String(first._id));
        toastSuccess("Bill uploaded");
      } else {
        toastError("Upload did not return a document id");
      }
    } catch (err) {
      toastError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submitPaymentRequest = async () => {
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      toastError("Enter a valid amount greater than zero.");
      return;
    }
    if (!billDocId) {
      toastError("Upload the bill document first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await purchaseBucketService.raisePaymentRequest(id, {
        amount: amt,
        attachmentDocumentId: billDocId,
      });
      const doc = res?.data;
      if (doc) setItem(doc);
      toastSuccess("Payment request raised");
      setAmount("");
      setBillDocId("");
      setActiveTab("details");
      load();
    } catch (e) {
      toastError(e?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const markAsPurchased = async () => {
    if (!id) return;
    setMarkingPurchased(true);
    try {
      const res = await purchaseBucketService.markLinePurchased(id);
      const doc = res?.data;
      if (doc) setItem(doc);
      toastSuccess("Marked as purchased");
      await load();
    } catch (e) {
      toastError(e?.message || "Request failed");
    } finally {
      setMarkingPurchased(false);
    }
  };

  const detailRows = item
    ? [
        ["Product", item.productName],
        ["PO code", item.poCode],
        ["Line #", item.lineIndex],
        ["Purchase order", item.purchaseOrderId?.poCode || formatVal(item.purchaseOrderId)],
        ["PO status", item.purchaseOrderId?.status],
        ["Group (effective)", item.effectiveGroupName || formatVal(item.effectiveGroupId)],
        ["Description", item.description],
        ["Quantity", item.quantity],
        ["Unit", item.unit],
        ["HSN", item.hsnNumber],
        ["Model", item.modelNumber],
        ["Raw product code", item.rawProductCode],
        ["Status (line)", lineStatusText(lineStatusFromItem(item))],
        ["Dispatchment date", formatDateTime(item.dispatchmentDate)],
        ["GST %", item.gstPercentage],
        ["PO rate", item.poRate],
        ["Apply discount", item.applyDiscount],
        ["Discount %", item.discountPercentage],
        ["Discount amount", item.discountAmount],
        ["Not available", item.notAvailable],
        ["Not available remark", item.notAvailableRemark],
        ["Priority", item.priority],
        ["Remark", item.remark],
        ["Company", item.companyInfo?.name],
        ["Company area", item.companyInfo?.area],
        ["Company location", item.companyInfo?.location],
        ["Query code", item.queryId?.queryCode],
        ["Quotation code", item.quotationId?.quotationCode],
        ["Industry", item.industry_id?.name],
        ["Branch", item.branchId?.name],
        ["Linked product", item.product_id?.name],
        ["SKU", item.product_id?.sku],
        ["Procurement status (legacy)", item.procurementStatus],
        ["Payment request amount", item.paymentRequestAmount],
        ["Payment request raised at", formatDateTime(item.paymentRequestRaisedAt)],
        ["Raised by", item.paymentRequestRaisedBy?.name],
        ["Created", formatDateTime(item.createdAt)],
        ["Updated", formatDateTime(item.updatedAt)],
      ]
    : [];

  const ratesToShow = item
    ? item.queryLineRates?.length
      ? item.queryLineRates
      : Array.isArray(item.queryRate)
        ? item.queryRate
        : []
    : [];

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
            <CBreadcrumb className="mb-0">
              <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
              <CBreadcrumbItem href="#/purchase-bucket">Purchase Bucket</CBreadcrumbItem>
              <CBreadcrumbItem active>Line item</CBreadcrumbItem>
            </CBreadcrumb>
            <CButton color="secondary" variant="ghost" onClick={() => navigate("/purchase-bucket")}>
              <CIcon icon={cilArrowLeft} className="me-1" size="sm" />
              Back
            </CButton>
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader className="d-flex flex-wrap align-items-center gap-2">
            {loading && <span className="text-body-secondary">Loading…</span>}
            {!loading && item && (
              <>
                <strong className="me-1">{item.productName || "Line item"}</strong>
                {lineStatusBadge(lineStatusFromItem(item))}
                {canRaise &&
                  lineStatusFromItem(item) === "finance_approved" && (
                    <CButton
                      color="success"
                      size="sm"
                      className="ms-1"
                      disabled={markingPurchased}
                      onClick={markAsPurchased}
                    >
                      {markingPurchased ? "Updating…" : "Mark purchased"}
                    </CButton>
                  )}
              </>
            )}
          </CCardHeader>
          <CCardBody>
            {loading && <Loader />}
            {!loading && !item && (
              <div className="text-body-secondary">Item not found or you do not have access.</div>
            )}
            {!loading && item && (
              <>
                <CNav variant="tabs" className="mb-3">
                  <CNavItem>
                    <CNavLink
                      active={activeTab === "details"}
                      onClick={() => setActiveTab("details")}
                      style={{ cursor: "pointer" }}
                    >
                      Line details
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === "rates"}
                      onClick={() => setActiveTab("rates")}
                      style={{ cursor: "pointer" }}
                    >
                      Rates
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === "billing"}
                      onClick={() => setActiveTab("billing")}
                      style={{ cursor: "pointer" }}
                    >
                      Raise billing request
                    </CNavLink>
                  </CNavItem>
                </CNav>

                <CTabContent>
                  <CTabPane visible={activeTab === "details"}>
                    <CRow className="g-3 mb-4">
                      <CCol xs={12}>
                        <CTable responsive bordered align="middle" className="mb-0">
                          <CTableHead>
                            <CTableRow>
                              <CTableHeaderCell style={{ width: "28%" }}>Field</CTableHeaderCell>
                              <CTableHeaderCell>Value</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {detailRows.map(([k, v]) => (
                              <CTableRow key={k}>
                                <CTableDataCell className="text-body-secondary">{k}</CTableDataCell>
                                <CTableDataCell>{formatVal(v)}</CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      </CCol>
                    </CRow>

                    {item.attachmentDocumentId?.path && (
                      <div className="mb-3">
                        <div className="small text-body-secondary mb-1">Line attachment</div>
                        <a
                          href={getAssetsUrl(item.attachmentDocumentId.path)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.attachmentDocumentId.originalName || "Open attachment"}
                        </a>
                      </div>
                    )}

                    {item.paymentRequestBillDocumentId?.path && (
                      <div className="mt-3">
                        <div className="small text-body-secondary mb-1">Payment request bill</div>
                        <a
                          href={getAssetsUrl(item.paymentRequestBillDocumentId.path)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.paymentRequestBillDocumentId.originalName || "Open bill"}
                        </a>
                      </div>
                    )}

                    {item.purchaseBillingRequestId &&
                      typeof item.purchaseBillingRequestId === "object" && (
                        <div className="mt-4">
                          <h6 className="mb-2">Purchase billing request (record)</h6>
                          <p className="text-body-secondary small">
                            Stored in <code>purchase_billing_requests</code> with submitter snapshot,
                            product context, and approval fields.
                          </p>
                          {(() => {
                            const br = item.purchaseBillingRequestId;
                            const snap = br.createdBySnapshot || {};
                            const ps = br.productSnapshot || {};
                            const appr = br.approvedBySnapshot || {};
                            const sub = br.createdBy || {};
                            return (
                              <CTable responsive bordered size="sm" className="mb-0">
                                <CTableBody>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary" style={{ width: "32%" }}>
                                      Request ID
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {br.uniqueId || formatVal(br._id)}
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">Status</CTableDataCell>
                                    <CTableDataCell>
                                      <strong>{String(br.status || "pending")}</strong>
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">Amount</CTableDataCell>
                                    <CTableDataCell>{formatVal(br.amount)}</CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">
                                      Submitted by (record)
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      <div>
                                        {snap.name || sub.name || "—"}
                                        {(snap.email || sub.email) && (
                                          <div className="small text-body-secondary">
                                            {snap.email || sub.email}
                                          </div>
                                        )}
                                        {(snap.phone || sub.phone) && (
                                          <div className="small text-body-secondary">
                                            {snap.phone || sub.phone}
                                          </div>
                                        )}
                                        {(snap.role || sub.role) && (
                                          <div className="small text-body-secondary">
                                            Role: {snap.role || sub.role} ·{" "}
                                            {snap.designation || sub.designation || ""}
                                          </div>
                                        )}
                                      </div>
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">Product (snapshot)</CTableDataCell>
                                    <CTableDataCell>
                                      {ps.productName || "—"}
                                      {ps.rawProductCode != null && ps.rawProductCode !== "" && (
                                        <div className="small text-body-secondary">
                                          Code: {ps.rawProductCode} · Qty: {formatVal(ps.quantity)} {ps.unit || ""}
                                        </div>
                                      )}
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">Bill (attachment)</CTableDataCell>
                                    <CTableDataCell>
                                      {br.billDocumentId?.path ? (
                                        <a
                                          href={getAssetsUrl(br.billDocumentId.path)}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {br.billDocumentId.originalName || "Open bill"}
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">Approved by</CTableDataCell>
                                    <CTableDataCell>
                                      {br.approvedBy || appr._id || br.approvedAt ? (
                                        <>
                                          {appr.name || (br.approvedBy && br.approvedBy.name) || "—"}
                                          {(appr.email || br.approvedBy?.email) && (
                                            <div className="small text-body-secondary">
                                              {appr.email || br.approvedBy?.email}
                                            </div>
                                          )}
                                          {br.approvedAt && (
                                            <div className="small text-body-secondary mt-1">
                                              {formatDateTime(br.approvedAt)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        "— (pending approval)"
                                      )}
                                    </CTableDataCell>
                                  </CTableRow>
                                </CTableBody>
                              </CTable>
                            );
                          })()}
                        </div>
                      )}
                  </CTabPane>

                  <CTabPane visible={activeTab === "rates"}>
                    <p className="text-body-secondary small mb-3">
                      Rates are loaded from <strong>query_products</strong> by matching{" "}
                      <code>rawProductCode</code>
                      {item.rawProductCode ? ` (${item.rawProductCode})` : ""} to the PO line. When the
                      line has a query, the same query is used first; otherwise the first matching code
                      is used.
                    </p>

                    {item.queryRatesMatchNote === "missing_rawProductCode" && (
                      <p className="text-body-secondary">This PO line has no raw product code set.</p>
                    )}

                    {item.queryRatesMatchNote === "no_query_product" && item.rawProductCode && (
                      <p className="text-body-secondary">
                        No row in <code>query_products</code> with{" "}
                        <code>rawProductCode = {item.rawProductCode}</code>.
                      </p>
                    )}

                    {item.queryProductMatch && (
                      <p className="text-body-secondary small mb-3">
                        Matched query line: <strong>#{item.queryProductMatch.lineIndex}</strong>
                        {item.queryProductMatch.queryCode
                          ? ` · ${item.queryProductMatch.queryCode}`
                          : ""}
                        {item.queryProductMatch.proBucketStatus != null &&
                        item.queryProductMatch.proBucketStatus !== "" ? (
                          <>
                            {" "}
                            · Pro Bucket:{" "}
                            <strong>
                              {proBucketStatusLabel(item.queryProductMatch.proBucketStatus)}
                            </strong>
                          </>
                        ) : null}
                      </p>
                    )}

                    {item.queryProductMatch && ratesToShow.length === 0 && item.queryRatesMatchNote === "ok" && (
                      <p className="text-body-secondary">No supplier rates on this query line yet.</p>
                    )}

                    {ratesToShow.length > 0 && (
                      <CTable responsive bordered size="sm" align="top" className="mb-0">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>Supplier</CTableHeaderCell>
                            <CTableHeaderCell>Rate</CTableHeaderCell>
                            <CTableHeaderCell>Unit</CTableHeaderCell>
                            <CTableHeaderCell>Remark</CTableHeaderCell>
                            <CTableHeaderCell>Submitted at</CTableHeaderCell>
                            <CTableHeaderCell>Submitted by</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {ratesToShow.map((r, idx) => (
                            <CTableRow key={r._id != null ? String(r._id) : idx}>
                              <CTableDataCell>
                                <div className="fw-semibold">{formatSupplierLabel(r.supplier)}</div>
                                {formatSupplierExtra(r.supplier) && (
                                  <div className="small text-body-secondary mt-1">
                                    {formatSupplierExtra(r.supplier)}
                                  </div>
                                )}
                              </CTableDataCell>
                              <CTableDataCell>{formatVal(r.rate)}</CTableDataCell>
                              <CTableDataCell>{formatVal(r.unit)}</CTableDataCell>
                              <CTableDataCell className="text-break">{formatVal(r.remark)}</CTableDataCell>
                              <CTableDataCell>{formatDateTime(r.submittedAt)}</CTableDataCell>
                              <CTableDataCell>
                                {r.submittedBy?.name ? (
                                  <>
                                    {r.submittedBy.name}
                                    {r.submittedBy.email ? (
                                      <div className="small text-body-secondary">{r.submittedBy.email}</div>
                                    ) : null}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    )}
                  </CTabPane>

                  <CTabPane visible={activeTab === "billing"}>
                    {lineStatusFromItem(item) === "finance_approved" ? (
                      <p className="text-body-secondary mb-0">
                        This line has been <strong>approved by finance</strong>. The linked billing
                        request is approved.
                      </p>
                    ) : lineStatusFromItem(item) === "payment_request_raised" ? (
                      <p className="text-body-secondary mb-0">
                        Payment request is already raised for this line. Amount:{" "}
                        <strong>{item.paymentRequestAmount}</strong>
                      </p>
                    ) : !canRaise ? (
                      <p className="text-body-secondary mb-0">
                        You do not have permission to raise billing requests.
                      </p>
                    ) : (
                      <CRow className="g-3">
                        <CCol md={6}>
                          <CFormLabel>Amount</CFormLabel>
                          <CFormInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                          />
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel>Bill (PDF / image)</CFormLabel>
                          <CFormInput
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                            disabled={uploading}
                            onChange={onUploadBill}
                          />
                          {billDocId && (
                            <div className="small text-success mt-1">Document ready ({billDocId})</div>
                          )}
                        </CCol>
                        <CCol xs={12}>
                          <CButton
                            color="primary"
                            disabled={submitting || uploading}
                            onClick={submitPaymentRequest}
                          >
                            {submitting ? "Submitting…" : "Raise request"}
                          </CButton>
                        </CCol>
                      </CRow>
                    )}
                  </CTabPane>
                </CTabContent>
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default PurchaseBucketDetail;
