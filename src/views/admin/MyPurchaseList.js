import React, { useCallback, useEffect, useRef, useState } from "react";
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
  CFormTextarea,
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCart, cilCloudUpload, cilLocationPin, cilX } from "@coreui/icons";
import localPurchaseService from "../../services/localPurchaseService";
import areaService from "../../services/areaService";
import documentService from "../../services/documentService";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const MY_PURCHASE_FILTER_DEFAULTS = { status: "", zoneId: "" };

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
];

const statusBadge = (status) => {
  switch (status) {
    case "pending":
      return <CBadge color="warning">Pending</CBadge>;
    case "submitted":
      return <CBadge color="success">Submitted</CBadge>;
    default:
      return <CBadge color="secondary">{status || "—"}</CBadge>;
  }
};

const imgSrc = (path) => {
  if (!path) return "";
  if (
    typeof path === "string" &&
    (path.startsWith("http://") || path.startsWith("https://"))
  ) {
    return path;
  }
  return getAssetsUrl(path);
};

const resolveImagePath = (img) => {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.path || img.url || "";
};

const isImageDoc = (doc) => {
  const mime = String(doc?.mimeType || doc?.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const path = resolveImagePath(doc).toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(path);
};

const toGalleryItems = (docs) =>
  (Array.isArray(docs) ? docs : [])
    .map((doc, idx) => ({
      doc,
      url: imgSrc(resolveImagePath(doc)),
      key: doc?._id || doc?.documentId || idx,
    }))
    .filter((item) => item.url);

const ImageGallery = ({ items, alt = "Image", emptyLabel }) => {
  const images = items.filter((item) => isImageDoc(item.doc));
  if (!images.length) {
    return (
      <div
        className="rounded-3 d-flex align-items-center justify-content-center text-body-secondary small"
        style={{
          minHeight: 120,
          background: "#f8fafc",
          border: "1px dashed #cbd5e1",
        }}
      >
        {emptyLabel || "No image available"}
      </div>
    );
  }
  return (
    <div
      className="d-flex gap-2 overflow-auto pb-1"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {images.map((img) => (
        <a
          key={img.key}
          href={img.url}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0"
          style={{ scrollSnapAlign: "start" }}
        >
          <img
            src={img.url}
            alt={alt}
            style={{
              width: "min(100%, 320px)",
              height: "clamp(160px, 38vw, 260px)",
              objectFit: "contain",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          />
        </a>
      ))}
    </div>
  );
};

const extractUploadedDocuments = (res) => {
  const block = res?.data ?? res;
  if (Array.isArray(block?.documents)) return block.documents;
  if (Array.isArray(block?.data?.documents)) return block.data.documents;
  if (Array.isArray(block)) return block;
  return [];
};

const extractApiErrorMessage = (err, fallback) => {
  const fromData = err?.data?.error ?? err?.data?.errors ?? err?.errors;
  if (Array.isArray(fromData) && fromData.length) return fromData.join(", ");
  if (typeof fromData === "string" && fromData.trim()) return fromData.trim();
  if (err?.message) return err.message;
  return fallback;
};

const resolveAssignmentId = (row) => {
  if (!row || typeof row !== "object") return "";
  const raw = row._id ?? row.id;
  if (raw == null || raw === "") return "";
  if (typeof raw === "object" && raw.$oid) return String(raw.$oid);
  return String(raw);
};

const formatPurchaseZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const unwrapPayload = (res) => res?.data?.data ?? res?.data;

const unwrapLocalPurchase = (res) => {
  const block = res?.data ?? res;
  if (block && typeof block === "object") {
    if (resolveAssignmentId(block)) return block;
    if (
      block.data &&
      typeof block.data === "object" &&
      resolveAssignmentId(block.data)
    ) {
      return block.data;
    }
  }
  return null;
};

const DetailRow = ({ label, value, mono = false }) => {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="py-2 border-bottom">
      <div
        className="text-body-secondary mb-1"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4 }}
      >
        {label}
      </div>
      <div
        className={mono ? "font-monospace" : ""}
        style={{ fontSize: 14, wordBreak: "break-word" }}
      >
        {value}
      </div>
    </div>
  );
};

const MyPurchaseList = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "my_purchase",
    MY_PURCHASE_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [status, setStatus] = useState(initialValues.status);
  const [zoneId, setZoneId] = useState(initialValues.zoneId);
  const [marketZones, setMarketZones] = useState([]);
  const [marketZonesLoading, setMarketZonesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [billFile, setBillFile] = useState(null);
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [submissionRemark, setSubmissionRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const activeAssignmentIdRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        localPurchaseService.list({
          page,
          pageSize,
          status: status.trim() || undefined,
          zoneId: zoneId.trim() || undefined,
        }),
      );
      const block = res?.data;
      setRows(Array.isArray(block?.data) ? block.data : []);
      setTotal(Number(block?.total) || 0);
    } catch (e) {
      toastError(e?.message || "Failed to load purchase assignments");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, zoneId]);

  useEffect(() => {
    let cancelled = false;
    const loadMarketZones = async () => {
      setMarketZonesLoading(true);
      try {
        const res = await areaService.getAll({
          pageNumber: 1,
          pageSize: 100,
          areaType: "market",
        });
        if (cancelled) return;
        const zonesPayload = unwrapPayload(res);
        const zoneRows = zonesPayload?.areas || [];
        setMarketZones(
          (zoneRows || []).map((zone) => ({
            ...zone,
            id: zone._id || zone.id,
          })),
        );
      } catch (e) {
        if (!cancelled) {
          toastError(e?.message || "Failed to load zones");
          setMarketZones([]);
        }
      } finally {
        if (!cancelled) setMarketZonesLoading(false);
      }
    };
    loadMarketZones();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status, zoneId]);

  useFilterLockPersist("my_purchase", filtersLocked, {
    status,
    zoneId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status, zoneId });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const closeDetail = () => {
    if (detailLoading || submitting || uploading) return;
    setDetailOpen(false);
    setDetail(null);
    setBillFile(null);
    setProductImageFiles([]);
    setSubmissionRemark("");
    setSubmitError("");
    activeAssignmentIdRef.current = "";
  };

  const openDetail = async (row) => {
    const assignmentId = resolveAssignmentId(row);
    if (!assignmentId) return;

    activeAssignmentIdRef.current = assignmentId;
    setDetailOpen(true);
    setDetail({ ...row, _id: assignmentId });
    setBillFile(null);
    setProductImageFiles([]);
    setSubmissionRemark("");
    setSubmitError("");
    setDetailLoading(true);
    try {
      const res = await localPurchaseService.getById(assignmentId);
      const doc = unwrapLocalPurchase(res);
      if (doc) {
        setDetail((prev) => ({
          ...(prev || {}),
          ...doc,
          _id: resolveAssignmentId(doc) || assignmentId,
        }));
      }
    } catch (e) {
      toastError(e?.message || "Failed to load product details");
    } finally {
      setDetailLoading(false);
    }
  };

  const uploadAttachmentPayload = async () => {
    let billDocumentId;
    if (billFile) {
      const billUploadRes = await documentService.uploadAttachments([billFile]);
      const billDoc = extractUploadedDocuments(billUploadRes).find(
        (d) => d?._id,
      );
      if (!billDoc?._id) {
        throw new Error("Failed to upload bill");
      }
      billDocumentId = String(billDoc._id);
    }

    let productImages = [];
    if (productImageFiles.length) {
      const imageUploadRes =
        await documentService.uploadImages(productImageFiles);
      productImages = extractUploadedDocuments(imageUploadRes)
        .filter((d) => d?._id)
        .map((d) => ({ documentId: String(d._id) }));
      if (!productImages.length) {
        throw new Error("Failed to upload product images");
      }
    }

    return { billDocumentId, productImages };
  };

  const handleSubmitPurchase = async () => {
    setSubmitError("");
    const assignmentId =
      resolveAssignmentId(detail) || activeAssignmentIdRef.current;
    if (!assignmentId) {
      setSubmitError("Assignment not found. Close and reopen this item.");
      return;
    }
    if (String(detail?.status || "").toLowerCase() === "submitted") {
      setSubmitError("This assignment is already submitted.");
      return;
    }

    setSubmitting(true);
    setUploading(true);
    try {
      const { billDocumentId, productImages } = await uploadAttachmentPayload();
      const payload = {
        productImages,
        remark: submissionRemark.trim(),
      };
      if (billDocumentId) payload.billDocumentId = billDocumentId;

      const res = await localPurchaseService.submit(assignmentId, payload);
      const submitted = unwrapLocalPurchase(res);
      if (submitted) {
        setDetail((prev) => ({
          ...(prev || {}),
          ...submitted,
          _id: resolveAssignmentId(submitted) || assignmentId,
        }));
      }
      toastSuccess("Marked as submitted");
      setBillFile(null);
      setProductImageFiles([]);
      setSubmissionRemark("");
      setSubmitError("");
      load();
    } catch (e) {
      const message = extractApiErrorMessage(e, "Failed to submit purchase");
      setSubmitError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleUpdateAttachments = async () => {
    setSubmitError("");
    const assignmentId =
      resolveAssignmentId(detail) || activeAssignmentIdRef.current;
    if (!assignmentId) {
      setSubmitError("Assignment not found. Close and reopen this item.");
      return;
    }
    if (!billFile && productImageFiles.length === 0) {
      setSubmitError("Select a new bill and/or product image(s) to upload.");
      return;
    }

    setSubmitting(true);
    setUploading(true);
    try {
      const { billDocumentId, productImages } = await uploadAttachmentPayload();
      const payload = {};
      if (billDocumentId) payload.billDocumentId = billDocumentId;
      if (productImages.length) payload.productImages = productImages;

      const res = await localPurchaseService.updateAttachments(
        assignmentId,
        payload,
      );
      const updated = unwrapLocalPurchase(res);
      if (updated) {
        setDetail((prev) => ({
          ...(prev || {}),
          ...updated,
          _id: resolveAssignmentId(updated) || assignmentId,
        }));
      }
      toastSuccess("Bill and images updated");
      setBillFile(null);
      setProductImageFiles([]);
      setSubmitError("");
      load();
    } catch (e) {
      const message = extractApiErrorMessage(
        e,
        "Failed to update bill or images",
      );
      setSubmitError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const snap = detail?.productSnapshot || {};
  const isPending =
    String(detail?.status || "pending").toLowerCase() !== "submitted";
  const referenceImages = toGalleryItems(detail?.productImagesFromQuery);
  const submittedProductImages = toGalleryItems(detail?.productImages);
  const billUrl = detail?.bill?.path ? imgSrc(detail.bill.path) : "";

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilCart} className="text-primary" />
                <strong>My Purchase</strong>
              </div>
              <CBadge color="secondary">{total} total</CBadge>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-2 mb-3 align-items-end">
                <CCol xs={12} sm={6} md={3}>
                  <CFormLabel className="mb-1">Status</CFormLabel>
                  <CFormSelect
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} sm={6} md={3}>
                  <CFormLabel className="mb-1">Zone</CFormLabel>
                  <CFormSelect
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    disabled={marketZonesLoading}
                  >
                    <option value="">All zones</option>
                    {marketZones.map((zone) => (
                      <option key={zone.id} value={String(zone.id)}>
                        {formatPurchaseZone(zone)}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} sm="auto" className="d-flex align-items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="My Purchase"
                  />
                </CCol>
                <CCol xs={12} sm="auto" className="d-flex align-items-end">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => {
                      setStatus("");
                      setZoneId("");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </CButton>
                </CCol>
              </CRow>

              {loading ? (
                <Loader message="Loading assignments…" />
              ) : rows.length === 0 ? (
                <p className="text-body-secondary mb-0">
                  No purchase assignments yet.
                </p>
              ) : (
                <>
                  <CRow className="g-3">
                    {rows.map((row) => {
                      const cardSnap = row.productSnapshot || {};

                      return (
                        <CCol
                          key={resolveAssignmentId(row) || row._id}
                          xs={12}
                          sm={6}
                          lg={4}
                        >
                          <CCard
                            className="h-100 shadow-sm"
                            role="button"
                            tabIndex={0}
                            style={{ cursor: "pointer" }}
                            onClick={() => openDetail(row)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openDetail(row);
                              }
                            }}
                          >
                            <CCardBody className="d-flex flex-column">
                              <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                                <div style={{ minWidth: 0 }}>
                                  <h6
                                    className="mb-1 text-truncate"
                                    title={cardSnap.productName}
                                  >
                                    {cardSnap.productName || "Product"}
                                  </h6>
                                  <div className="small text-body-secondary font-monospace">
                                    {row.queryCode || cardSnap.queryCode || "—"}
                                  </div>
                                </div>
                                {statusBadge(row.status)}
                              </div>

                              <div className="small mb-2">
                                <div>
                                  <span className="text-body-secondary">
                                    Sales Order Code:
                                  </span>{" "}
                                  <span className="font-monospace fw-semibold">
                                    {row.poCode || cardSnap.poCode || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-body-secondary">
                                    Qty:
                                  </span>{" "}
                                  {cardSnap.quantity ?? "—"}{" "}
                                  {cardSnap.unit || ""}
                                </div>
                                {cardSnap.rawProductCode && (
                                  <div>
                                    <span className="text-body-secondary">
                                      Code:
                                    </span>{" "}
                                    <span className="font-monospace">
                                      {cardSnap.rawProductCode}
                                    </span>
                                  </div>
                                )}
                                {row.zoneId && (
                                  <div>
                                    <span className="text-body-secondary">
                                      Zone:
                                    </span>{" "}
                                    {formatPurchaseZone(row.zoneId)}
                                  </div>
                                )}
                              </div>

                              {(row.assignmentRemark || row.remark) && (
                                <div className="small text-break mb-2 text-truncate">
                                  <span className="text-body-secondary">
                                    Note:
                                  </span>{" "}
                                  {row.assignmentRemark || row.remark}
                                </div>
                              )}

                              <div className="small text-primary mt-auto pt-2 border-top">
                                Tap for full details
                              </div>
                            </CCardBody>
                          </CCard>
                        </CCol>
                      );
                    })}
                  </CRow>

                  <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    showRange
                    totalItems={total}
                    itemsPerPage={pageSize}
                    align="center"
                    ariaLabel="My purchase pages"
                    wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
                  />
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {detailOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            zIndex: 1040,
            background: "rgba(15, 23, 42, 0.45)",
          }}
          onClick={closeDetail}
          role="button"
          tabIndex={-1}
          aria-label="Close"
        />
      )}

      {detailOpen && detail && (
        <div
          className="position-fixed top-0 start-0 d-flex flex-column bg-body shadow-lg h-100"
          style={{ zIndex: 1050, width: "100%", maxWidth: "100%" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Product details"
        >
          <div className="d-flex align-items-center justify-content-between gap-2 border-bottom px-3 py-2 flex-shrink-0">
            <div style={{ minWidth: 0 }}>
              <h2 className="h6 mb-0">Product details</h2>
              <div
                className="text-body-secondary text-truncate small"
                title={snap.productName}
              >
                {snap.productName || "Product"}
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
              {statusBadge(detail.status)}
              <CButton
                type="button"
                color="secondary"
                variant="ghost"
                size="sm"
                onClick={closeDetail}
                disabled={detailLoading}
                aria-label="Close"
              >
                <CIcon icon={cilX} size="lg" />
              </CButton>
            </div>
          </div>

          <div className="flex-grow-1 overflow-auto px-3 py-3">
            {detailLoading ? (
              <Loader message="Loading product…" />
            ) : (
              <>
                {referenceImages.length > 0 ? (
                  <div className="mb-3">
                    <div
                      className="text-body-secondary mb-2 small fw-semibold text-uppercase"
                      style={{ letterSpacing: 0.4 }}
                    >
                      Product reference
                    </div>
                    <ImageGallery
                      items={referenceImages}
                      alt={snap.productName || "Product"}
                    />
                  </div>
                ) : (
                  <div
                    className="mb-3 rounded-3 d-flex align-items-center justify-content-center text-body-secondary"
                    style={{
                      minHeight: 160,
                      background: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    No reference product image
                  </div>
                )}

                <div
                  className="rounded-3 p-3 mb-3"
                  style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                >
                  <DetailRow label="Product name" value={snap.productName} />
                  <DetailRow
                    label="Product code"
                    value={snap.rawProductCode}
                    mono
                  />
                  <DetailRow
                    label="Query code"
                    value={detail.queryCode || snap.queryCode}
                    mono
                  />
                  <DetailRow
                    label="Sales Order code"
                    value={detail.poCode || snap.poCode}
                    mono
                  />
                  <DetailRow
                    label="Quantity"
                    value={
                      snap.quantity != null
                        ? `${snap.quantity}${snap.unit ? ` ${snap.unit}` : ""}`
                        : null
                    }
                  />
                  <DetailRow label="Unit" value={snap.unit} />
                  <DetailRow label="HSN" value={snap.hsnNumber} mono />
                  <DetailRow label="Model" value={snap.modelNumber} />
                  <DetailRow
                    label="GST %"
                    value={
                      snap.gstPercentage != null
                        ? `${snap.gstPercentage}%`
                        : null
                    }
                  />
                  <DetailRow
                    label="Dispatch date"
                    value={dateFormatter(snap.dispatchmentDate, "—")}
                  />
                  <DetailRow label="Description" value={snap.description} />
                  <DetailRow label="Product remark" value={snap.remark} />
                </div>

                <div
                  className="rounded-3 p-3"
                  style={{ background: "#fff", border: "1px solid #e2e8f0" }}
                >
                  <div
                    className="text-body-secondary mb-2"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                    }}
                  >
                    ASSIGNMENT
                  </div>
                  <DetailRow
                    label="Assignment remark"
                    value={detail.assignmentRemark || detail.remark}
                  />
                  <DetailRow
                    label="Zone"
                    value={formatPurchaseZone(detail.zoneId)}
                  />
                  <DetailRow
                    label="Assigned on"
                    value={dateTimeFormatter(detail.createdAt, "—")}
                  />
                  {detail.locationLink && (
                    <div className="py-2">
                      <div
                        className="text-body-secondary mb-1"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                        }}
                      >
                        Location link
                      </div>
                      <a
                        href={detail.locationLink}
                        target="_blank"
                        rel="noreferrer"
                        className="small text-break"
                      >
                        {detail.locationLink}
                      </a>
                    </div>
                  )}
                </div>

                {!isPending && (
                  <div
                    className="rounded-3 p-3 mb-3"
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <div
                      className="text-body-secondary mb-2"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                      }}
                    >
                      SUBMISSION
                    </div>
                    <DetailRow
                      label="Submitted on"
                      value={dateTimeFormatter(detail.submittedAt, "—")}
                    />
                    <DetailRow
                      label="Submission remark"
                      value={detail.submissionRemark}
                    />
                    <div className="py-2 border-bottom">
                      <div
                        className="text-body-secondary mb-2"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                        }}
                      >
                        Bill
                      </div>
                      {billUrl ? (
                        <a
                          href={billUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          View bill
                        </a>
                      ) : (
                        <span className="text-body-secondary">—</span>
                      )}
                    </div>
                    <div className="pt-2">
                      <div
                        className="text-body-secondary mb-2"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                        }}
                      >
                        Submitted product images
                      </div>
                      <ImageGallery
                        items={submittedProductImages}
                        alt="Submitted product"
                        emptyLabel="No submitted product images"
                      />
                    </div>
                  </div>
                )}

                {!isPending && (
                  <div
                    className="rounded-3 p-3 mb-3"
                    style={{ background: "#fff", border: "1px solid #e2e8f0" }}
                  >
                    <div
                      className="text-body-secondary mb-3"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                      }}
                    >
                      RE-UPLOAD BILL / IMAGES
                    </div>
                    <p className="small text-body-secondary mb-3">
                      Choose a new bill and/or product images. Only the files
                      you select will be replaced.
                    </p>
                    <CFormLabel htmlFor="local-purchase-bill-reupload">
                      Bill
                    </CFormLabel>
                    <CFormInput
                      id="local-purchase-bill-reupload"
                      type="file"
                      accept="image/*,.pdf"
                      className="mb-3"
                      disabled={submitting || uploading}
                      onChange={(e) => {
                        setBillFile(e.target.files?.[0] || null);
                        setSubmitError("");
                      }}
                    />
                    {billFile && (
                      <div className="small text-body-secondary mb-3">
                        Selected: {billFile.name}
                      </div>
                    )}

                    <CFormLabel htmlFor="local-purchase-product-images-reupload">
                      Product images
                    </CFormLabel>
                    <CFormInput
                      id="local-purchase-product-images-reupload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="mb-2"
                      disabled={submitting || uploading}
                      onChange={(e) => {
                        setProductImageFiles(Array.from(e.target.files || []));
                        setSubmitError("");
                      }}
                    />
                    {productImageFiles.length > 0 && (
                      <div className="small text-body-secondary mb-3">
                        {productImageFiles.length} image(s) selected
                      </div>
                    )}

                    {submitError ? (
                      <div className="alert alert-danger py-2 px-3 small mb-3">
                        {submitError}
                      </div>
                    ) : null}

                    <CButton
                      type="button"
                      color="primary"
                      className="w-100"
                      onClick={handleUpdateAttachments}
                      disabled={submitting || uploading}
                    >
                      <CIcon icon={cilCloudUpload} className="me-2" />
                      {submitting || uploading
                        ? "Uploading…"
                        : "Update bill / images"}
                    </CButton>
                  </div>
                )}

                {isPending && (
                  <div
                    className="rounded-3 p-3 mb-3"
                    style={{ background: "#fff", border: "1px solid #e2e8f0" }}
                  >
                    <div
                      className="text-body-secondary mb-3"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                      }}
                    >
                      SUBMIT PURCHASE
                    </div>
                    <CFormLabel htmlFor="local-purchase-bill">Bill</CFormLabel>
                    <CFormInput
                      id="local-purchase-bill"
                      type="file"
                      accept="image/*,.pdf"
                      className="mb-3"
                      onChange={(e) => {
                        setBillFile(e.target.files?.[0] || null);
                        setSubmitError("");
                      }}
                    />
                    {billFile && (
                      <div className="small text-body-secondary mb-3">
                        Selected: {billFile.name}
                      </div>
                    )}

                    <CFormLabel htmlFor="local-purchase-product-images">
                      Product images
                    </CFormLabel>
                    <CFormInput
                      id="local-purchase-product-images"
                      type="file"
                      accept="image/*"
                      multiple
                      className="mb-2"
                      onChange={(e) => {
                        setProductImageFiles(Array.from(e.target.files || []));
                        setSubmitError("");
                      }}
                    />
                    {productImageFiles.length > 0 && (
                      <div className="small text-body-secondary mb-3">
                        {productImageFiles.length} image(s) selected
                      </div>
                    )}

                    <CFormLabel htmlFor="local-purchase-submission-remark">
                      Remark
                    </CFormLabel>
                    <CFormTextarea
                      id="local-purchase-submission-remark"
                      rows={2}
                      value={submissionRemark}
                      onChange={(e) => setSubmissionRemark(e.target.value)}
                      placeholder="Optional note about this purchase…"
                      className="mb-3"
                    />

                    {submitError ? (
                      <div className="alert alert-danger py-2 px-3 small mb-3">
                        {submitError}
                      </div>
                    ) : null}

                    <CButton
                      type="button"
                      color="success"
                      className="w-100"
                      onClick={handleSubmitPurchase}
                      disabled={submitting || uploading}
                    >
                      <CIcon icon={cilCloudUpload} className="me-2" />
                      {submitting || uploading
                        ? "Submitting…"
                        : "Mark submitted"}
                    </CButton>
                  </div>
                )}
              </>
            )}
          </div>

          {!detailLoading && (
            <div
              className="d-flex flex-column gap-2 px-3 py-3 border-top flex-shrink-0"
              style={{
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              {detail.locationLink ? (
                <CButton
                  type="button"
                  color="primary"
                  variant={isPending ? "outline" : undefined}
                  className="w-100"
                  href={detail.locationLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <CIcon icon={cilLocationPin} className="me-2" />
                  Open location
                </CButton>
              ) : null}
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                className="w-100"
                onClick={closeDetail}
                disabled={submitting || uploading}
              >
                Close
              </CButton>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default MyPurchaseList;
