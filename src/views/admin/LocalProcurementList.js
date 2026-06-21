import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBasket, cilClipboard, cilPeople, cilX } from "@coreui/icons";
import localProcurementService from "../../services/localProcurementService";
import documentService from "../../services/documentService";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter } from "../../utils/dateFormatter";
import { useAuth, ROLES } from "../../context/AuthContext";

const LOCAL_PROCUREMENT_FILTER_DEFAULTS = {
  status: "",
  dateFrom: "",
  dateTo: "",
};

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
  )
    return path;
  return getAssetsUrl(path);
};

const resolveImagePath = (img) => {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.path || img.url || "";
};

const sanitizeRateInput = (raw) => {
  if (raw === "" || raw == null) return "";
  const t = String(raw).replace(/[^\d.]/g, "");
  if (t === "") return "";
  const dot = t.indexOf(".");
  if (dot === -1) return t;
  return t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, "");
};

const latestRate = (row) => {
  const rates = Array.isArray(row?.rates) ? row.rates : [];
  if (rates.length) return rates[rates.length - 1];
  if (row?.status === "submitted") {
    return {
      supplier: row.supplier,
      price: row.rate,
      rate: row.rate,
      unit: row.unit,
      remark: row.remark,
    };
  }
  return null;
};

const LocalProcurementList = () => {
  const { user } = useAuth();
  const isLocalPro =
    String(user?.role || "").toLowerCase() === ROLES.LOCAL_PROCUREMENT;

  const pageTitle = isLocalPro ? "My Pro Bucket" : "Local Pro";
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "local_procurement",
    LOCAL_PROCUREMENT_FILTER_DEFAULTS,
  );

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [status, setStatus] = useState(initialValues.status);
  const [fromDate, setFromDate] = useState(initialValues.dateFrom);
  const [toDate, setToDate] = useState(initialValues.dateTo);
  const [loading, setLoading] = useState(false);

  const [submitPanelOpen, setSubmitPanelOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [supplier, setSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState("");
  const [remark, setRemark] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        localProcurementService.list({
          page,
          pageSize,
          status: status.trim() || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
      );
      const block = res?.data;
      setRows(Array.isArray(block?.data) ? block.data : []);
      setTotal(Number(block?.total) || 0);
    } catch (e) {
      toastError(e?.message || "Failed to load local procurement items");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status, fromDate, toDate]);

  useFilterLockPersist("local_procurement", filtersLocked, {
    status,
    dateFrom: fromDate,
    dateTo: toDate,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status, dateFrom: fromDate, dateTo: toDate });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const canSubmitRow = useMemo(
    () => (row) => {
      if (row?.status !== "pending") return false;
      if (
        user?.role === ROLES.SUPER_ADMIN ||
        user?.role === ROLES.ADMIN ||
        user?.role === ROLES.HEAD_OF_DEPARTMENT
      ) {
        return true;
      }
      if (isLocalPro) {
        const uid = user?.id || user?._id;
        return (
          uid && String(row?.employeeId?._id || row?.employeeId) === String(uid)
        );
      }
      return false;
    },
    [user, isLocalPro],
  );

  const openSubmitPanel = (row) => {
    setActiveRow(row);
    setSupplier("");
    setPrice("");
    setRate("");
    setUnit(row?.productSnapshot?.unit || "");
    setRemark("");
    setImageFiles([]);
    setSubmitPanelOpen(true);
  };

  const closeSubmitPanel = () => {
    if (submitting || uploadingImages) return;
    setSubmitPanelOpen(false);
    setActiveRow(null);
    setImageFiles([]);
  };

  const handleSubmit = async () => {
    if (!activeRow?._id) return;
    if (!supplier.trim()) {
      toastError("Supplier is required");
      return;
    }
    if (rate === "" || Number.isNaN(Number(rate)) || Number(rate) < 0) {
      toastError("Enter a valid rate ≥ 0");
      return;
    }
    if (price !== "" && (Number.isNaN(Number(price)) || Number(price) < 0)) {
      toastError("Enter a valid price ≥ 0");
      return;
    }

    setSubmitting(true);
    try {
      let images = [];
      if (imageFiles.length) {
        setUploadingImages(true);
        const uploadRes = await documentService.uploadImages(imageFiles);
        const docs =
          uploadRes?.data?.documents ||
          uploadRes?.documents ||
          uploadRes?.data ||
          [];
        images = (Array.isArray(docs) ? docs : [])
          .filter((d) => d?._id)
          .map((d) => ({ documentId: d._id }));
        setUploadingImages(false);
      }

      await localProcurementService.submit(activeRow._id, {
        supplier: supplier.trim(),
        price: price !== "" ? Number(price) : undefined,
        rate: Number(rate),
        unit: unit || "",
        remark: remark || "",
        images,
      });
      toastSuccess("Submitted successfully");
      closeSubmitPanel();
      load();
    } catch (e) {
      toastError(e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                <CIcon
                  icon={isLocalPro ? cilBasket : cilClipboard}
                  className="text-primary"
                />
                <strong>{pageTitle}</strong>
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
                <CCol xs={6} sm={3} md={2}>
                  <CFormLabel className="mb-1">From date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </CCol>
                <CCol xs={6} sm={3} md={2}>
                  <CFormLabel className="mb-1">To date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </CCol>
                <CCol xs={12} sm="auto" className="d-flex align-items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel={pageTitle}
                  />
                </CCol>
                <CCol xs={12} sm="auto" className="d-flex align-items-end">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => {
                      setStatus("");
                      setFromDate("");
                      setToDate("");
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
                  {isLocalPro
                    ? "No assignments in your bucket yet."
                    : "No local procurement assignments found."}
                </p>
              ) : (
                <CRow className="g-3">
                  {rows.map((row) => {
                    const snap = row.productSnapshot || {};
                    const firstImage = Array.isArray(snap.images)
                      ? snap.images[0]
                      : null;
                    const src = imgSrc(resolveImagePath(firstImage));
                    const submitted = latestRate(row);
                    const submissionImages = Array.isArray(row.images)
                      ? row.images
                      : [];

                    return (
                      <CCol key={row._id} xs={12} md={6} lg={4}>
                        <CCard className="h-100 shadow-sm">
                          {src ? (
                            <div
                              className="border-bottom bg-light d-flex align-items-center justify-content-center"
                              style={{ height: 140 }}
                            >
                              <img
                                src={src}
                                alt={snap.productName || "Product"}
                                style={{
                                  maxHeight: 130,
                                  maxWidth: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            </div>
                          ) : null}
                          <CCardBody className="d-flex flex-column">
                            <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                              <div style={{ minWidth: 0 }}>
                                <h6
                                  className="mb-1 text-truncate"
                                  title={snap.productName}
                                >
                                  {snap.productName || "Product"}
                                </h6>
                                <div className="small text-body-secondary">
                                  {row.queryCode || snap.queryCode || "—"}
                                </div>
                              </div>
                              {statusBadge(row.status)}
                            </div>

                            <div className="small mb-2">
                              <div>
                                <span className="text-body-secondary">
                                  Qty:
                                </span>{" "}
                                {snap.quantity ?? "—"} {snap.unit || ""}
                              </div>
                              {snap.categoryName && (
                                <div>
                                  <span className="text-body-secondary">
                                    Category:
                                  </span>{" "}
                                  {snap.categoryName}
                                </div>
                              )}
                            </div>

                            {!isLocalPro && (
                              <div className="d-flex align-items-center gap-2 small text-body-secondary mb-2">
                                <CIcon icon={cilPeople} size="sm" />
                                <span>
                                  {row.employeeId?.name || "Unassigned"}
                                </span>
                              </div>
                            )}

                            {row.assignmentRemark && (
                              <div className="small text-break mb-2">
                                <span className="text-body-secondary">
                                  Assignment note:
                                </span>{" "}
                                {row.assignmentRemark}
                              </div>
                            )}

                            {submitted && (
                              <div className="small border-top pt-2 mb-2">
                                <div>
                                  <span className="text-body-secondary">
                                    Supplier:
                                  </span>{" "}
                                  {submitted.supplier || "—"}
                                </div>
                                <div>
                                  <span className="text-body-secondary">
                                    Price:
                                  </span>{" "}
                                  ₹ {submitted.price ?? submitted.rate ?? "—"}
                                </div>
                                <div>
                                  <span className="text-body-secondary">
                                    Rate:
                                  </span>{" "}
                                  ₹ {submitted.rate ?? "—"} /{" "}
                                  {submitted.unit || "—"}
                                </div>
                                {submitted.remark && (
                                  <div className="text-break">
                                    <span className="text-body-secondary">
                                      Remark:
                                    </span>{" "}
                                    {submitted.remark}
                                  </div>
                                )}
                                {submissionImages.length > 0 && (
                                  <div className="d-flex flex-wrap gap-1 mt-2">
                                    {submissionImages.map((img) => {
                                      const thumb = imgSrc(
                                        resolveImagePath(img),
                                      );
                                      if (!thumb) return null;
                                      return (
                                        <a
                                          key={
                                            img._id || img.documentId || thumb
                                          }
                                          href={thumb}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <img
                                            src={thumb}
                                            alt={img.name || "Upload"}
                                            style={{
                                              width: 48,
                                              height: 48,
                                              objectFit: "cover",
                                              borderRadius: 4,
                                              border:
                                                "1px solid var(--cui-border-color)",
                                            }}
                                          />
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="small text-body-secondary mt-auto">
                              Assigned {dateFormatter(row.createdAt, "—")}
                            </div>

                            {canSubmitRow(row) && (
                              <CButton
                                color="primary"
                                size="sm"
                                className="mt-2"
                                onClick={() => openSubmitPanel(row)}
                              >
                                Submit rate
                              </CButton>
                            )}
                          </CCardBody>
                        </CCard>
                      </CCol>
                    );
                  })}
                </CRow>
              )}

              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                wrapperClassName="d-flex justify-content-center mt-4"
                align="center"
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {submitPanelOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            zIndex: 1040,
            background: "rgba(15, 23, 42, 0.42)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
          onClick={closeSubmitPanel}
          role="button"
          tabIndex={-1}
          aria-label="Close"
        />
      )}

      {submitPanelOpen && (
        <div
          className="position-fixed top-0 end-0 d-flex flex-column border-start border-2 bg-body shadow-lg h-100"
          style={{ zIndex: 1050, width: "min(24rem, 100%)" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Submit local procurement"
        >
          <div className="d-flex align-items-center justify-content-between gap-2 border-bottom px-3 py-2 flex-shrink-0">
            <div style={{ minWidth: 0 }}>
              <h2 className="h6 mb-0">Submit rate</h2>
              {activeRow?.productSnapshot?.productName && (
                <div
                  className="text-body-secondary text-truncate small"
                  title={activeRow.productSnapshot.productName}
                >
                  {activeRow.productSnapshot.productName}
                </div>
              )}
            </div>
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={closeSubmitPanel}
              disabled={submitting || uploadingImages}
              aria-label="Close"
            >
              <CIcon icon={cilX} size="lg" />
            </CButton>
          </div>

          <div className="flex-grow-1 overflow-auto px-3 py-3">
            <CRow className="g-3">
              <CCol xs={12}>
                <CFormLabel>
                  Supplier <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier name"
                />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Price</CFormLabel>
                <CFormInput
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(sanitizeRateInput(e.target.value))}
                  placeholder="Optional"
                />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>
                  Rate <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  type="text"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(sanitizeRateInput(e.target.value))}
                  placeholder="0.00"
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Unit</CFormLabel>
                <ProductUnitSelect
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Remark</CFormLabel>
                <CFormInput
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Optional note"
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Images</CFormLabel>
                <CFormInput
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setImageFiles(Array.from(e?.target?.files || []))
                  }
                />
                {imageFiles.length > 0 && (
                  <div className="small text-body-secondary mt-1">
                    {imageFiles.length} file(s) selected
                  </div>
                )}
              </CCol>
            </CRow>
          </div>

          <div className="d-flex gap-2 px-3 py-2 border-top flex-shrink-0 justify-content-end">
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              onClick={closeSubmitPanel}
              disabled={submitting || uploadingImages}
            >
              Cancel
            </CButton>
            <CButton
              type="button"
              color="primary"
              onClick={handleSubmit}
              disabled={submitting || uploadingImages}
            >
              {submitting || uploadingImages ? "Submitting…" : "Submit"}
            </CButton>
          </div>
        </div>
      )}
    </>
  );
};

export default LocalProcurementList;
