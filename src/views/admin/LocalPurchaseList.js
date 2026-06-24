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
import areaService from "../../services/areaService";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const LOCAL_PURCHASE_FILTER_DEFAULTS = { status: "", zoneId: "" };

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

const formatEmployee = (emp) => {
  if (!emp || typeof emp !== "object") return "—";
  return (
    emp.email?.trim() || emp.companyEmail?.trim() || emp.name?.trim() || "—"
  );
};

const salesOrderCodeLast4 = (code) => {
  const codeText = code != null ? String(code).trim() : "";
  if (!codeText) return null;
  return codeText.length <= 4 ? codeText : codeText.slice(-4);
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

const formatPurchaseZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const unwrapPayload = (res) => res?.data?.data ?? res?.data;

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
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "local_purchase",
    LOCAL_PURCHASE_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [status, setStatus] = useState(initialValues.status);
  const [zoneId, setZoneId] = useState(initialValues.zoneId);
  const [marketZones, setMarketZones] = useState([]);
  const [marketZonesLoading, setMarketZonesLoading] = useState(false);
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
          zoneId: zoneId.trim() || undefined,
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

  useFilterLockPersist("local_purchase", filtersLocked, {
    status,
    zoneId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status, zoneId });
  };

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
  const productImages = (
    Array.isArray(activeRow?.productImages) ? activeRow.productImages : []
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
                    pageLabel="Local Purchase"
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
                            Sales Order Code
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
                              colSpan={9}
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
                            const salesOrderCode = row.poCode || rowSnap.poCode;
                            const salesOrderCodeDisplay =
                              salesOrderCodeLast4(salesOrderCode);

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
                                  {salesOrderCodeDisplay ? (
                                    <span
                                      className="badge bg-dark font-monospace"
                                      title={
                                        salesOrderCode
                                          ? String(salesOrderCode).trim()
                                          : undefined
                                      }
                                    >
                                      {salesOrderCodeDisplay}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
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
                                  {dateFormatter(row.createdAt, "—")}
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

                  <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    showRange
                    totalItems={total}
                    itemsPerPage={pageSize}
                    align="center"
                    ariaLabel="Local purchase pages"
                    wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
                  />
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
                      Submitted on{" "}
                      {dateTimeFormatter(activeRow.submittedAt, "—")}
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
                      <span className="text-body-secondary small">
                        No bill uploaded
                      </span>
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
