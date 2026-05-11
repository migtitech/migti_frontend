import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CAlert,
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
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilCamera, cilCloudUpload } from "@coreui/icons";
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

/** Date only as DD-MM-YYYY (no time). */
const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
};

const formatVal = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") {
    if (
      v instanceof Date ||
      (typeof v === "string" && !Number.isNaN(Date.parse(v)))
    )
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
    case "billing_request_rejected":
      return <CBadge color="danger">Billing request rejected</CBadge>;
    case "inventory_received":
      return <CBadge color="primary">Inventory received</CBadge>;
    case "ready_for_dispatchment":
      return <CBadge color="success">Ready for dispatch</CBadge>;
    case "po_closed":
      return <CBadge color="secondary">PO closed</CBadge>;
    case "pending":
    default:
      return (
        <CBadge color="warning">{s && s !== "pending" ? s : "Pending"}</CBadge>
      );
  }
};

const isImageMime = (mime) => !!mime && /^image\//i.test(String(mime));

/** Preview URL for line `attachmentDocumentId` when it is an image. */
const lineProductImageUrl = (att) => {
  if (!att || typeof att !== "object") return null;
  const path = att.path;
  if (!path) return null;
  if (
    isImageMime(att.mimeType) ||
    /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(path))
  ) {
    return path.startsWith("http://") || path.startsWith("https://")
      ? path
      : getAssetsUrl(path);
  }
  return null;
};

/** Billing request requires an image on the line (upload / camera). */
const hasMandatoryLineProductImage = (lineItem) =>
  !!lineProductImageUrl(lineItem?.attachmentDocumentId);

/**
 * `queryProductMatch.images` comes from `query_products` (match: rawProductCode + queryId).
 */
const partitionQueryProductImages = (item) => {
  const imgs = item?.queryProductMatch?.images;
  if (!Array.isArray(imgs) || imgs.length === 0) {
    return { imagePreviews: [], nonImageDocs: [] };
  }
  const imagePreviews = [];
  const nonImageDocs = [];
  for (const doc of imgs) {
    if (!doc || typeof doc !== "object") continue;
    const url = lineProductImageUrl(doc);
    if (url) imagePreviews.push({ doc, url });
    else if (doc.path) nonImageDocs.push(doc);
  }
  return { imagePreviews, nonImageDocs };
};


const lineStatusText = (s) => {
  switch (s) {
    case "purchased":
      return "Purchased";
    case "finance_approved":
      return "Finance approved";
    case "payment_request_raised":
      return "Payment request raised";
    case "billing_request_rejected":
      return "Billing request rejected";
    case "inventory_received":
      return "Inventory received";
    case "ready_for_dispatchment":
      return "Ready for dispatch";
    case "po_closed":
      return "PO closed";
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
  const [billFileName, setBillFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingLineImage, setUploadingLineImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [markingPurchased, setMarkingPurchased] = useState(false);

  const unwrapPayload = (res) => res?.data?.data ?? res?.data;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseBucketService.getById(id),
      );
      const doc = unwrapPayload(res);
      setItem(
        doc && typeof doc === "object" && !Array.isArray(doc) ? doc : null,
      );
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

  const itemId = item?._id != null ? String(item._id) : "";
  const lineStatusKey = item ? lineStatusFromItem(item) : "";
  const lineActionsLocked = lineStatusKey === "po_closed";
  const paymentAmtForPrefill = item?.paymentRequestAmount;
  const billingRequestAmtForPrefill =
    item?.purchaseBillingRequestId &&
    typeof item.purchaseBillingRequestId === "object"
      ? item.purchaseBillingRequestId.amount
      : undefined;

  useEffect(() => {
    if (!id || !itemId || itemId !== String(id)) return;
    if (
      lineStatusKey === "finance_approved" ||
      lineStatusKey === "payment_request_raised"
    ) {
      setAmount("");
      return;
    }
    const raw =
      paymentAmtForPrefill != null && paymentAmtForPrefill !== ""
        ? paymentAmtForPrefill
        : billingRequestAmtForPrefill != null && billingRequestAmtForPrefill !== ""
          ? billingRequestAmtForPrefill
          : null;
    if (raw == null) {
      setAmount("");
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n) || n <= 0) {
      setAmount("");
      return;
    }
    setAmount(String(n));
  }, [
    id,
    itemId,
    lineStatusKey,
    paymentAmtForPrefill,
    billingRequestAmtForPrefill,
  ]);

  const onLineProductImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!id) return;
    setUploadingLineImage(true);
    try {
      const up = await documentService.uploadAttachments([file]);
      const docs = up?.data?.documents || up?.documents || [];
      const first = docs[0];
      if (!first?._id) {
        toastError("Upload did not return a document id");
        return;
      }
      const res = await purchaseBucketService.setLineAttachment(id, {
        attachmentDocumentId: String(first._id),
      });
      const doc = unwrapPayload(res);
      if (doc && typeof doc === "object") setItem(doc);
      else await load();
      toastSuccess("Product image saved on this line");
    } catch (err) {
      toastError(err?.message || "Failed to save product image");
    } finally {
      setUploadingLineImage(false);
    }
  };

  const uploadBillFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await documentService.uploadAttachments([file]);
      const docs = res?.data?.documents || res?.documents || [];
      const first = docs[0];
      if (first?._id) {
        setBillDocId(String(first._id));
        setBillFileName(file.name || "Document");
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

  const onUploadBill = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadBillFile(file);
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
    if (!hasMandatoryLineProductImage(item)) {
      toastError(
        "Upload a product image or take a photo before raising the billing request.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await purchaseBucketService.raisePaymentRequest(id, {
        amount: amt,
        attachmentDocumentId: billDocId,
      });
      const doc = unwrapPayload(res);
      if (doc) setItem(doc);
      toastSuccess("Payment request raised");
      setAmount("");
      setBillDocId("");
      setBillFileName("");
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
        [
          "Group (effective)",
          item.effectiveGroupName || formatVal(item.effectiveGroupId),
        ],
        ["Description", item.description],
        ["Quantity", item.quantity],
        ["Unit", item.unit],
        ["HSN", item.hsnNumber],
        ["Model", item.modelNumber],
        ["Raw product code", item.rawProductCode],
        ["Dispatchment date", formatDateDdMmYyyy(item.dispatchmentDate)],
        ["GST %", item.gstPercentage],
        ["Priority", item.priority],
        ["Remark", item.remark],
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
              <CBreadcrumbItem href="#/purchase-bucket">
                Purchase Bucket
              </CBreadcrumbItem>
              <CBreadcrumbItem active>Line item</CBreadcrumbItem>
            </CBreadcrumb>
            <CButton
              color="secondary"
              variant="ghost"
              onClick={() => navigate("/purchase-bucket")}
            >
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
                <strong className="me-1">
                  {item.productName || "Line item"}
                </strong>
                {lineStatusBadge(lineStatusFromItem(item))}
                {canRaise &&
                  lineStatusFromItem(item) === "finance_approved" && (
                    <CButton
                      color="success"
                      size="sm"
                      className="ms-1"
                      disabled={markingPurchased || lineActionsLocked}
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
              <div className="text-body-secondary">
                Item not found or you do not have access.
              </div>
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
                      <CCol xs={12} md={5} lg={4}>
                        <CCard className="border-0 shadow-sm h-100">
                          <CCardHeader className="bg-light py-2">
                            <strong className="small">Product images</strong>
                          </CCardHeader>
                          <CCardBody>
                            {(() => {
                              const { imagePreviews, nonImageDocs } =
                                partitionQueryProductImages(item);
                              const lineUrl = lineProductImageUrl(
                                item?.attachmentDocumentId,
                              );
                              const lineNonImg =
                                item?.attachmentDocumentId?.path && !lineUrl
                                  ? item.attachmentDocumentId
                                  : null;

                              if (imagePreviews.length > 0) {
                                return (
                                  <>
                                    <div className="d-flex flex-wrap gap-2 justify-content-center">
                                      {imagePreviews.map(({ doc, url }, i) => (
                                        <a
                                          key={
                                            doc._id != null
                                              ? String(doc._id)
                                              : `qp-img-${i}`
                                          }
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="d-inline-block"
                                        >
                                          <img
                                            src={url}
                                            alt={
                                              doc.originalName ||
                                              item.productName ||
                                              "Product"
                                            }
                                            className="rounded border"
                                            style={{
                                              maxHeight: 200,
                                              maxWidth: "100%",
                                              objectFit: "contain",
                                            }}
                                          />
                                        </a>
                                      ))}
                                    </div>
                                    {nonImageDocs.length > 0 ? (
                                      <ul className="small mb-0 mt-2 ps-3">
                                        {nonImageDocs.map((doc, i) => (
                                          <li key={doc._id ?? i}>
                                            <a
                                              href={
                                                doc.path?.startsWith("http")
                                                  ? doc.path
                                                  : getAssetsUrl(doc.path)
                                              }
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              {doc.originalName ||
                                                "Attachment"}
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                    {lineUrl ? (
                                      <div className="mt-3 pt-3 border-top">
                                        <div className="small text-body-secondary mb-2">
                                          Photo on this PO line (billing)
                                        </div>
                                        <div className="text-center">
                                          <img
                                            src={lineUrl}
                                            alt="Line attachment"
                                            className="rounded border img-fluid"
                                            style={{
                                              maxHeight: 160,
                                              maxWidth: "100%",
                                              objectFit: "contain",
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : lineNonImg ? (
                                      <div className="mt-3 pt-3 border-top small">
                                        <span className="text-body-secondary d-block mb-1">
                                          Line attachment
                                        </span>
                                        <a
                                          href={getAssetsUrl(lineNonImg.path)}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {lineNonImg.originalName || "Open file"}
                                        </a>
                                      </div>
                                    ) : null}
                                  </>
                                );
                              }

                              if (lineUrl) {
                                return (
                                  <div className="text-center">
                                    <p className="small text-body-secondary text-start mb-2">
                                      No catalog images on the matched query
                                      product. Showing the photo attached to this
                                      PO line.
                                    </p>
                                    <img
                                      src={lineUrl}
                                      alt={item.productName || "Product"}
                                      className="rounded border img-fluid"
                                      style={{
                                        maxHeight: 280,
                                        maxWidth: "100%",
                                        objectFit: "contain",
                                      }}
                                    />
                                  </div>
                                );
                              }

                              if (nonImageDocs.length > 0) {
                                return (
                                  <ul className="small mb-0 ps-3">
                                    {nonImageDocs.map((doc, i) => (
                                      <li key={doc._id ?? i}>
                                        <a
                                          href={
                                            doc.path?.startsWith("http")
                                              ? doc.path
                                              : getAssetsUrl(doc.path)
                                          }
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {doc.originalName || "Attachment"}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                );
                              }

                              if (lineNonImg) {
                                return (
                                  <p className="small mb-0">
                                    <a
                                      href={getAssetsUrl(lineNonImg.path)}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open line attachment (
                                      {lineNonImg.originalName || "file"})
                                    </a>
                                  </p>
                                );
                              }

                              return (
                                <p className="small text-body-secondary mb-0">
                                  No Image Found
                                </p>
                              );
                            })()}
                          </CCardBody>
                        </CCard>
                      </CCol>
                      <CCol xs={12} md={7} lg={8}>
                        <CTable
                          responsive
                          bordered
                          align="middle"
                          className="mb-0"
                        >
                          <CTableHead>
                            <CTableRow>
                              <CTableHeaderCell style={{ width: "28%" }}>
                                Field
                              </CTableHeaderCell>
                              <CTableHeaderCell>Value</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {detailRows.map(([k, v]) => (
                              <CTableRow key={k}>
                                <CTableDataCell className="text-body-secondary">
                                  {k}
                                </CTableDataCell>
                                <CTableDataCell>{formatVal(v)}</CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      </CCol>
                    </CRow>

                    {item.paymentRequestBillDocumentId?.path && (
                      <div className="mt-3">
                        <div className="small text-body-secondary mb-1">
                          Payment request bill
                        </div>
                        <a
                          href={getAssetsUrl(
                            item.paymentRequestBillDocumentId.path,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.paymentRequestBillDocumentId.originalName ||
                            "Open bill"}
                        </a>
                      </div>
                    )}

                    {item.purchaseBillingRequestId &&
                      typeof item.purchaseBillingRequestId === "object" && (
                        <div className="mt-4">
                          <h6 className="mb-2">
                            Purchase billing request (record)
                          </h6>
                          <p className="text-body-secondary small">
                            Stored in <code>purchase_billing_requests</code>{" "}
                            with submitter snapshot, product context, and
                            approval fields.
                          </p>
                          {(() => {
                            const br = item.purchaseBillingRequestId;
                            const snap = br.createdBySnapshot || {};
                            const ps = br.productSnapshot || {};
                            const appr = br.approvedBySnapshot || {};
                            const sub = br.createdBy || {};
                            return (
                              <CTable
                                responsive
                                bordered
                                size="sm"
                                className="mb-0"
                              >
                                <CTableBody>
                                  <CTableRow>
                                    <CTableDataCell
                                      className="text-body-secondary"
                                      style={{ width: "32%" }}
                                    >
                                      Request ID
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {br.uniqueId || formatVal(br._id)}
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">
                                      Status
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      <strong>
                                        {String(br.status || "pending")}
                                      </strong>
                                    </CTableDataCell>
                                  </CTableRow>
                                  {br.statusRemark ? (
                                    <CTableRow>
                                      <CTableDataCell className="text-body-secondary">
                                        Financier remark
                                      </CTableDataCell>
                                      <CTableDataCell className="text-break">
                                        {String(br.statusRemark)}
                                      </CTableDataCell>
                                    </CTableRow>
                                  ) : null}
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">
                                      Amount
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {formatVal(br.amount)}
                                    </CTableDataCell>
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
                                            {snap.designation ||
                                              sub.designation ||
                                              ""}
                                          </div>
                                        )}
                                      </div>
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">
                                      Product (snapshot)
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {ps.productName || "—"}
                                      {ps.rawProductCode != null &&
                                        ps.rawProductCode !== "" && (
                                          <div className="small text-body-secondary">
                                            Code: {ps.rawProductCode} · Qty:{" "}
                                            {formatVal(ps.quantity)}{" "}
                                            {ps.unit || ""}
                                          </div>
                                        )}
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">
                                      Bill (attachment)
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {br.billDocumentId?.path ? (
                                        <a
                                          href={getAssetsUrl(
                                            br.billDocumentId.path,
                                          )}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {br.billDocumentId.originalName ||
                                            "Open bill"}
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">
                                      Payment proof
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {br.proofDocumentId?.path ? (
                                        <a
                                          href={getAssetsUrl(
                                            br.proofDocumentId.path,
                                          )}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {br.proofDocumentId.originalName ||
                                            "Open proof"}
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </CTableDataCell>
                                  </CTableRow>
                                  <CTableRow>
                                    <CTableDataCell className="text-body-secondary">
                                      Approved by
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {br.approvedBy ||
                                      appr._id ||
                                      br.approvedAt ? (
                                        <>
                                          {appr.name ||
                                            (br.approvedBy &&
                                              br.approvedBy.name) ||
                                            "—"}
                                          {(appr.email ||
                                            br.approvedBy?.email) && (
                                            <div className="small text-body-secondary">
                                              {appr.email ||
                                                br.approvedBy?.email}
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
                    {item.queryRatesMatchNote === "missing_rawProductCode" && (
                      <p className="text-body-secondary">
                        This PO line has no raw product code set.
                      </p>
                    )}

                    {item.queryRatesMatchNote === "no_query_product" &&
                      item.rawProductCode && (
                        <p className="text-body-secondary">
                          No row in <code>query_products</code> with{" "}
                          <code>rawProductCode = {item.rawProductCode}</code>.
                        </p>
                      )}

                    {item.queryProductMatch && (
                      <p className="text-body-secondary small mb-3">
                        Matched query line:{" "}
                        <strong>#{item.queryProductMatch.lineIndex}</strong>
                        {item.queryProductMatch.queryCode
                          ? ` · ${item.queryProductMatch.queryCode}`
                          : ""}
                        {item.queryProductMatch.proBucketStatus != null &&
                        item.queryProductMatch.proBucketStatus !== "" ? (
                          <>
                            {" "}
                            · Pro Bucket:{" "}
                            <strong>
                              {proBucketStatusLabel(
                                item.queryProductMatch.proBucketStatus,
                              )}
                            </strong>
                          </>
                        ) : null}
                      </p>
                    )}

                    {item.queryProductMatch &&
                      ratesToShow.length === 0 &&
                      item.queryRatesMatchNote === "ok" && (
                        <p className="text-body-secondary">
                          No supplier rates on this query line yet.
                        </p>
                      )}

                    {ratesToShow.length > 0 && (
                      <CTable
                        responsive
                        bordered
                        size="sm"
                        align="top"
                        className="mb-0"
                      >
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
                            <CTableRow
                              key={r._id != null ? String(r._id) : idx}
                            >
                              <CTableDataCell>
                                <div className="fw-semibold">
                                  {formatSupplierLabel(r.supplier)}
                                </div>
                                {formatSupplierExtra(r.supplier) && (
                                  <div className="small text-body-secondary mt-1">
                                    {formatSupplierExtra(r.supplier)}
                                  </div>
                                )}
                              </CTableDataCell>
                              <CTableDataCell>
                                {formatVal(r.rate)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {formatVal(r.unit)}
                              </CTableDataCell>
                              <CTableDataCell className="text-break">
                                {formatVal(r.remark)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {formatDateTime(r.submittedAt)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {r.submittedBy?.name ? (
                                  <>
                                    {r.submittedBy.name}
                                    {r.submittedBy.email ? (
                                      <div className="small text-body-secondary">
                                        {r.submittedBy.email}
                                      </div>
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
                    <CCard className="mb-4 border-0 shadow-sm">
                      <CCardHeader className="bg-light">
                        <strong>Product image</strong>
                        <span className="text-danger ms-1" aria-hidden>
                          *
                        </span>
                        <span className="visually-hidden">
                          {" "}
                          required to raise billing request
                        </span>
                      </CCardHeader>
                      <CCardBody>
                        {lineProductImageUrl(item?.attachmentDocumentId) ? (
                          <div className="mb-3">
                            <img
                              src={lineProductImageUrl(
                                item.attachmentDocumentId,
                              )}
                              alt="Product"
                              className="rounded border"
                              style={{ maxHeight: 200, maxWidth: "100%" }}
                            />
                          </div>
                        ) : item?.attachmentDocumentId?.path ? (
                          <p className="small text-body-secondary mb-3">
                            <a
                              href={getAssetsUrl(
                                item.attachmentDocumentId.path,
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open attached file (
                              {item.attachmentDocumentId.originalName ||
                                "document"}
                              )
                            </a>
                          </p>
                        ) : null}
                        {canRaise ? (
                          <>
                            <CFormInput
                              type="file"
                              id="pb-line-img-gallery"
                              className="d-none"
                              accept="image/*"
                              disabled={uploadingLineImage || lineActionsLocked}
                              onChange={onLineProductImage}
                            />
                            <CFormInput
                              type="file"
                              id="pb-line-img-camera"
                              className="d-none"
                              accept="image/*"
                              capture="environment"
                              disabled={uploadingLineImage || lineActionsLocked}
                              onChange={onLineProductImage}
                            />
                            <CRow className="g-2 align-items-center">
                              <CCol xs={6}>
                                <CButton
                                  color="primary"
                                  variant="outline"
                                  className="w-100 d-flex justify-content-center align-items-center py-3 rounded"
                                  type="button"
                                  disabled={uploadingLineImage || lineActionsLocked}
                                  title="Upload image"
                                  aria-label="Upload image from gallery"
                                  onClick={() =>
                                    document
                                      .getElementById("pb-line-img-gallery")
                                      ?.click()
                                  }
                                >
                                  <CIcon icon={cilCloudUpload} size="xl" />
                                </CButton>
                              </CCol>
                              <CCol xs={6}>
                                <CButton
                                  color="info"
                                  variant="outline"
                                  className="w-100 d-flex justify-content-center align-items-center py-3 rounded"
                                  type="button"
                                  disabled={uploadingLineImage || lineActionsLocked}
                                  title="Take photo"
                                  aria-label="Take photo with camera"
                                  onClick={() =>
                                    document
                                      .getElementById("pb-line-img-camera")
                                      ?.click()
                                  }
                                >
                                  <CIcon icon={cilCamera} size="xl" />
                                </CButton>
                              </CCol>
                              {uploadingLineImage ? (
                                <CCol xs={12}>
                                  <span className="small text-body-secondary d-inline-flex align-items-center gap-1">
                                    <CSpinner size="sm" /> Saving…
                                  </span>
                                </CCol>
                              ) : null}
                            </CRow>
                          </>
                        ) : null}
                      </CCardBody>
                    </CCard>

                    {item.purchaseBillingRequestId &&
                      typeof item.purchaseBillingRequestId === "object" && (
                        <CCard className="mb-4 border-0 shadow-sm">
                          <CCardHeader className="bg-light">
                            <strong>Payment proof</strong>
                          </CCardHeader>
                          <CCardBody>
                            {lineProductImageUrl(
                              item.purchaseBillingRequestId.proofDocumentId,
                            ) ? (
                              <div className="mb-2">
                                <a
                                  href={getAssetsUrl(
                                    item.purchaseBillingRequestId
                                      .proofDocumentId.path,
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={lineProductImageUrl(
                                      item.purchaseBillingRequestId
                                        .proofDocumentId,
                                    )}
                                    alt={
                                      item.purchaseBillingRequestId
                                        .proofDocumentId.originalName ||
                                      "Payment proof"
                                    }
                                    className="rounded border"
                                    style={{
                                      maxHeight: 240,
                                      maxWidth: "100%",
                                      objectFit: "contain",
                                    }}
                                  />
                                </a>
                              </div>
                            ) : item.purchaseBillingRequestId.proofDocumentId
                                ?.path ? (
                              <p className="small mb-0">
                                <a
                                  href={getAssetsUrl(
                                    item.purchaseBillingRequestId
                                      .proofDocumentId.path,
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {item.purchaseBillingRequestId
                                    .proofDocumentId.originalName ||
                                    "Open proof"}
                                </a>
                              </p>
                            ) : (
                              <p className="small text-body-secondary mb-0">
                                No payment proof uploaded for this billing
                                request yet.
                              </p>
                            )}
                          </CCardBody>
                        </CCard>
                      )}

                    {lineStatusFromItem(item) === "po_closed" ? (
                      <p className="text-body-secondary mb-0">
                        This PO line is <strong>closed</strong>. Billing and
                        purchase actions are not available.
                      </p>
                    ) : lineStatusFromItem(item) === "finance_approved" ? (
                      <p className="text-body-secondary mb-0">
                        This line has been <strong>approved by finance</strong>.
                        The linked billing request is approved.
                      </p>
                    ) : lineStatusFromItem(item) ===
                      "payment_request_raised" ? (
                      <p className="text-body-secondary mb-0">
                        Payment request is already raised for this line. Amount:{" "}
                        <strong>{item.paymentRequestAmount}</strong>
                      </p>
                    ) : !canRaise ? (
                      <p className="text-body-secondary mb-0">
                        You do not have permission to raise billing requests.
                      </p>
                    ) : (
                      <>
                        {lineStatusFromItem(item) ===
                          "billing_request_rejected" &&
                          item.purchaseBillingRequestId &&
                          typeof item.purchaseBillingRequestId === "object" &&
                          String(
                            item.purchaseBillingRequestId.statusRemark || "",
                          ).trim() !== "" && (
                            <CAlert color="danger" className="mb-3">
                              <strong>Previous rejection note</strong>
                              <div className="small mt-2 mb-0 text-break">
                                {String(
                                  item.purchaseBillingRequestId.statusRemark,
                                )}
                              </div>
                            </CAlert>
                          )}
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
                            disabled={lineActionsLocked}
                          />
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel>Bill (PDF / image)</CFormLabel>
                          <CFormInput
                            type="file"
                            id="pb-bill-gallery"
                            className="d-none"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,application/pdf"
                            disabled={uploading || lineActionsLocked}
                            onChange={onUploadBill}
                          />
                          <CFormInput
                            type="file"
                            id="pb-bill-camera"
                            className="d-none"
                            accept="image/*"
                            capture="environment"
                            disabled={uploading || lineActionsLocked}
                            onChange={onUploadBill}
                          />
                          <CRow className="g-2 align-items-center">
                            <CCol xs={6}>
                              <CButton
                                color="primary"
                                variant="outline"
                                className="w-100 d-flex justify-content-center align-items-center py-3 rounded"
                                type="button"
                                disabled={uploading || lineActionsLocked}
                                title="Upload bill (PDF, image, Word, Excel)"
                                aria-label="Upload bill file from gallery"
                                onClick={() =>
                                  document
                                    .getElementById("pb-bill-gallery")
                                    ?.click()
                                }
                              >
                                <CIcon icon={cilCloudUpload} size="xl" />
                              </CButton>
                            </CCol>
                            <CCol xs={6}>
                              <CButton
                                color="info"
                                variant="outline"
                                className="w-100 d-flex justify-content-center align-items-center py-3 rounded"
                                type="button"
                                disabled={uploading || lineActionsLocked}
                                title="Capture bill as photo"
                                aria-label="Take photo of bill with camera"
                                onClick={() =>
                                  document
                                    .getElementById("pb-bill-camera")
                                    ?.click()
                                }
                              >
                                <CIcon icon={cilCamera} size="xl" />
                              </CButton>
                            </CCol>
                            {uploading ? (
                              <CCol xs={12}>
                                <span className="small text-body-secondary d-inline-flex align-items-center gap-1">
                                  <CSpinner size="sm" /> Uploading bill…
                                </span>
                              </CCol>
                            ) : null}
                            {billDocId && !uploading ? (
                              <CCol xs={12}>
                                <div className="small text-success fw-semibold">
                                  Bill ready
                                </div>
                                {billFileName ? (
                                  <div
                                    className="small text-body-secondary text-truncate"
                                    title={billFileName}
                                  >
                                    {billFileName}
                                  </div>
                                ) : null}
                                <div className="small text-body-secondary mt-1">
                                  Use upload or camera to replace
                                </div>
                              </CCol>
                            ) : null}
                          </CRow>
                        </CCol>
                        <CCol xs={12} className="d-flex justify-content-end">
                          <CButton
                            color="primary"
                            disabled={
                              lineActionsLocked ||
                              submitting ||
                              uploading ||
                              !hasMandatoryLineProductImage(item)
                            }
                            onClick={submitPaymentRequest}
                          >
                            {submitting
                              ? "Submitting…"
                              : lineStatusFromItem(item) ===
                                  "billing_request_rejected"
                                ? "Raise billing request again"
                                : "Raise request"}
                          </CButton>
                        </CCol>
                      </CRow>
                      </>
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
