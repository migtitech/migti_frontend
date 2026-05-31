import React, { useCallback, useEffect, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilClipboard, cilCloudDownload, cilX } from "@coreui/icons";
import localPurchaseService from "../../services/localPurchaseService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";

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

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const formatEmployee = (emp) => {
  if (!emp || typeof emp !== "object") return "—";
  return (
    emp.email?.trim() ||
    emp.companyEmail?.trim() ||
    emp.name?.trim() ||
    "—"
  );
};

const fileUrl = (path) => {
  if (!path) return "";
  if (
    typeof path === "string" &&
    (path.startsWith("http://") || path.startsWith("https://"))
  ) {
    return path;
  }
  return getAssetsUrl(path);
};

const resolveDocPath = (doc) => {
  if (!doc) return "";
  if (typeof doc === "string") return doc;
  return doc.path || doc.url || "";
};

const docFileName = (doc, fallback) => {
  if (!doc || typeof doc !== "object") return fallback;
  return doc.name || doc.originalName || fallback;
};

const isImageDoc = (doc) => {
  const mime = String(doc?.mimeType || doc?.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const path = resolveDocPath(doc).toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(path);
};

const triggerDownload = async (url, filename) => {
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename || "download";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const DownloadButton = ({ url, filename, label = "Download" }) => {
  if (!url) return null;
  return (
    <CButton
      type="button"
      color="primary"
      variant="ghost"
      size="sm"
      title={label}
      aria-label={label}
      onClick={() => triggerDownload(url, filename)}
    >
      <CIcon icon={cilCloudDownload} />
    </CButton>
  );
};

const LocalPurchaseList = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        localPurchaseService.list({
          page,
          pageSize,
          status: status.trim() || undefined,
        }),
      );
      const block = res?.data;
      setRows(Array.isArray(block?.data) ? block.data : []);
      setTotal(Number(block?.total) || 0);
    } catch (e) {
      toastError(e?.message || "Failed to load local purchase assignments");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const openDetail = (row) => {
    setActiveRow(row);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setActiveRow(null);
  };

  const snap = activeRow?.productSnapshot || {};
  const billUrl = activeRow?.bill?.path ? fileUrl(activeRow.bill.path) : "";
  const billName = docFileName(activeRow?.bill, "bill");
  const submissionRemark =
    activeRow?.submissionRemark ||
    (String(activeRow?.status || "").toLowerCase() === "submitted"
      ? activeRow?.remark
      : "") ||
    "";
  const productImages = (Array.isArray(activeRow?.productImages)
    ? activeRow.productImages
    : []
  ).map((doc, idx) => ({
    doc,
    url: fileUrl(resolveDocPath(doc)),
    name: docFileName(doc, `product-image-${idx + 1}`),
    key: doc?._id || doc?.documentId || idx,
  }));

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilClipboard} className="text-primary" />
                <strong>Local Purchase</strong>
              </div>
              <CBadge color="secondary">{total} total</CBadge>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-2 mb-3">
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
                <CCol xs={12} sm="auto" className="d-flex align-items-end">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => {
                      setStatus("");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </CButton>
                </CCol>
              </CRow>

              {loading ? (
                <Loader message="Loading assignments…" />
              ) : (
                <>
                  <div className="table-responsive">
                    <CTable hover bordered className="mb-0" align="middle">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell style={{ width: 50 }}>
                            S.No
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 180 }}>
                            Product
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 110 }}>
                            Query Code
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 110 }}>
                            PO Code
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 90 }}>
                            Qty
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 180 }}>
                            Assigned Employee
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 160 }}>
                            Submission
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 110 }}>
                            Status
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 120 }}>
                            Assigned On
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 120 }}>
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
                              No local purchase assignments found.
                            </CTableDataCell>
                          </CTableRow>
                        ) : (
                          rows.map((row, idx) => {
                            const rowSnap = row.productSnapshot || {};
                            const emp =
                              row.employeeId &&
                              typeof row.employeeId === "object"
                                ? row.employeeId
                                : null;
                            const rowRemark =
                              row.submissionRemark ||
                              (String(row.status || "").toLowerCase() ===
                              "submitted"
                                ? row.remark
                                : "") ||
                              "";
                            const imageCount = Array.isArray(row.productImages)
                              ? row.productImages.length
                              : 0;
                            const hasBill = Boolean(row.bill?.path);

                            return (
                              <CTableRow key={row._id}>
                                <CTableDataCell className="text-center fw-semibold text-body-secondary">
                                  {(page - 1) * pageSize + idx + 1}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <div className="fw-semibold">
                                    {rowSnap.productName || "—"}
                                  </div>
                                  {rowSnap.rawProductCode && (
                                    <div className="small font-monospace text-body-secondary">
                                      {rowSnap.rawProductCode}
                                    </div>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <span className="font-monospace">
                                    {row.queryCode || rowSnap.queryCode || "—"}
                                  </span>
                                </CTableDataCell>
                                <CTableDataCell>
                                  <span className="badge bg-dark font-monospace">
                                    {row.poCode || rowSnap.poCode || "—"}
                                  </span>
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  {rowSnap.quantity ?? "—"}
                                  {rowSnap.unit ? ` ${rowSnap.unit}` : ""}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {formatEmployee(emp)}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {String(row.status || "").toLowerCase() ===
                                  "submitted" ? (
                                    <div className="small">
                                      {rowRemark ? (
                                        <div
                                          className="text-truncate mb-1"
                                          style={{ maxWidth: 180 }}
                                          title={rowRemark}
                                        >
                                          {rowRemark}
                                        </div>
                                      ) : (
                                        <div className="text-body-secondary mb-1">
                                          No remark
                                        </div>
                                      )}
                                      <div className="text-body-secondary">
                                        {hasBill ? "Bill" : "No bill"}
                                        {imageCount
                                          ? ` · ${imageCount} image(s)`
                                          : " · No images"}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-body-secondary small">
                                      —
                                    </span>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {statusBadge(row.status)}
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  {formatDate(row.createdAt)}
                                </CTableDataCell>
                                <CTableDataCell className="text-center">
                                  <CButton
                                    type="button"
                                    color="info"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDetail(row)}
                                  >
                                    View
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
                    <div className="d-flex flex-column align-items-center mt-3 gap-2">
                      <span className="small text-body-secondary">
                        Showing {Math.min((page - 1) * pageSize + 1, total)}–
                        {Math.min(page * pageSize, total)} of {total}
                      </span>
                      <CPagination
                        align="center"
                        className="mb-0"
                        aria-label="Local purchase pages"
                      >
                        <CPaginationItem
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </CPaginationItem>
                        {Array.from(
                          { length: Math.min(totalPages, 7) },
                          (_, i) => {
                            let p;
                            if (totalPages <= 7) p = i + 1;
                            else if (page <= 4) p = i + 1;
                            else if (page >= totalPages - 3)
                              p = totalPages - 6 + i;
                            else p = page - 3 + i;
                            return (
                              <CPaginationItem
                                key={p}
                                active={p === page}
                                onClick={() => setPage(p)}
                              >
                                {p}
                              </CPaginationItem>
                            );
                          },
                        )}
                        <CPaginationItem
                          disabled={page >= totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
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
        </CCol>
      </CRow>

      {detailOpen && activeRow && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ zIndex: 1040, background: "rgba(15, 23, 42, 0.45)" }}
            onClick={closeDetail}
            role="button"
            tabIndex={-1}
            aria-label="Close"
          />
          <div
            className="position-fixed top-0 end-0 d-flex flex-column bg-body shadow-lg h-100"
            style={{ zIndex: 1050, width: "min(28rem, 100%)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Local purchase submission"
          >
            <div className="d-flex align-items-center justify-content-between gap-2 border-bottom px-3 py-2 flex-shrink-0">
              <div style={{ minWidth: 0 }}>
                <h2 className="h6 mb-0">Submission details</h2>
                <div
                  className="text-body-secondary text-truncate small"
                  title={snap.productName}
                >
                  {snap.productName || "Product"}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                {statusBadge(activeRow.status)}
                <CButton
                  type="button"
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  onClick={closeDetail}
                  aria-label="Close"
                >
                  <CIcon icon={cilX} size="lg" />
                </CButton>
              </div>
            </div>

            <div className="flex-grow-1 overflow-auto px-3 py-3">
              <div className="small mb-3">
                <div className="text-body-secondary">Assigned employee</div>
                <div className="fw-semibold">
                  {formatEmployee(
                    activeRow.employeeId &&
                      typeof activeRow.employeeId === "object"
                      ? activeRow.employeeId
                      : null,
                  )}
                </div>
              </div>

              {String(activeRow.status || "").toLowerCase() !== "submitted" ? (
                <p className="text-body-secondary small mb-0">
                  Not submitted yet.
                </p>
              ) : (
                <>
                  <div
                    className="rounded-3 p-3 mb-3"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      className="text-body-secondary mb-2 small fw-semibold text-uppercase"
                      style={{ letterSpacing: 0.4 }}
                    >
                      Remark
                    </div>
                    <div className="small text-break">
                      {submissionRemark || "—"}
                    </div>
                    <div className="small text-body-secondary mt-2">
                      Submitted on {formatDateTime(activeRow.submittedAt)}
                    </div>
                  </div>

                  <div
                    className="rounded-3 p-3 mb-3"
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                      <div
                        className="text-body-secondary small fw-semibold text-uppercase"
                        style={{ letterSpacing: 0.4 }}
                      >
                        Bill
                      </div>
                      {billUrl ? (
                        <DownloadButton
                          url={billUrl}
                          filename={billName}
                          label="Download bill"
                        />
                      ) : null}
                    </div>
                    {billUrl ? (
                      isImageDoc(activeRow.bill) ? (
                        <div className="d-flex align-items-start gap-2">
                          <img
                            src={billUrl}
                            alt={billName}
                            style={{
                              maxWidth: 120,
                              maxHeight: 120,
                              objectFit: "contain",
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                            }}
                          />
                          <span className="small text-break">{billName}</span>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center gap-2">
                          <span className="small text-break flex-grow-1">
                            {billName}
                          </span>
                          <CButton
                            type="button"
                            color="primary"
                            variant="outline"
                            size="sm"
                            onClick={() => triggerDownload(billUrl, billName)}
                          >
                            <CIcon icon={cilCloudDownload} className="me-1" />
                            Download
                          </CButton>
                        </div>
                      )
                    ) : (
                      <span className="text-body-secondary small">No bill uploaded</span>
                    )}
                  </div>

                  <div
                    className="rounded-3 p-3"
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      className="text-body-secondary mb-2 small fw-semibold text-uppercase"
                      style={{ letterSpacing: 0.4 }}
                    >
                      Product images
                    </div>
                    {productImages.length === 0 ? (
                      <span className="text-body-secondary small">
                        No product images uploaded
                      </span>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {productImages.map((img) => (
                          <div
                            key={img.key}
                            className="d-flex align-items-start gap-2 border rounded-2 p-2"
                          >
                            {isImageDoc(img.doc) ? (
                              <img
                                src={img.url}
                                alt={img.name}
                                style={{
                                  width: 72,
                                  height: 72,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid #e2e8f0",
                                  flexShrink: 0,
                                }}
                              />
                            ) : (
                              <div
                                className="d-flex align-items-center justify-content-center text-body-secondary small"
                                style={{
                                  width: 72,
                                  height: 72,
                                  borderRadius: 8,
                                  border: "1px dashed #cbd5e1",
                                  flexShrink: 0,
                                }}
                              >
                                File
                              </div>
                            )}
                            <div className="flex-grow-1 min-w-0">
                              <div className="small text-break">{img.name}</div>
                              <DownloadButton
                                url={img.url}
                                filename={img.name}
                                label={`Download ${img.name}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="d-flex gap-2 px-3 py-2 border-top flex-shrink-0 justify-content-end">
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                onClick={closeDetail}
              >
                Close
              </CButton>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default LocalPurchaseList;
