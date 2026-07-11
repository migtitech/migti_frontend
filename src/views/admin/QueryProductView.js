import React, { useCallback, useEffect, useRef, useState } from "react";
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
  CFormSelect,
  CFormTextarea,
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
  cilArrowLeft,
  cilSave,
  cilCheckCircle,
  cilTrash,
  cilCloudUpload,
} from "@coreui/icons";
import proBucketService from "../../services/proBucketService";
import documentService from "../../services/documentService";
import groupService from "../../services/groupService";
import categoryService from "../../services/categoryService";
import { useAuth } from "../../context/AuthContext";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { sortAlphabetically } from "../../utils/sort";
import { Loader, TablePagination } from "../../components";
import { dateTimeFormatter, dateFormatter } from "../../utils/dateFormatter";
import {
  formatProBucketRateAmount,
  resolveProBucketEffectiveRate,
} from "../../utils/proBucketRate";

const isHodRole = (role) => {
  const r = String(role || "").toLowerCase();
  return r === "head_of_department" || r === "hod";
};

const MAX_HOD_RATE = 1_000_000;
const MAX_QUANTITY = 100_000;
const MAX_GST_PERCENTAGE = 100;
const GST_HIGH_RATE_THRESHOLD = 18;

const normalizeRateComparison = (value, { isDiscount = false } = {}) => {
  if (value === "" || value == null) return isDiscount ? 0 : null;
  const n = Number(value);
  if (!Number.isFinite(n)) return isDiscount ? 0 : null;
  return n;
};

const formatRateValue = (value) =>
  value != null && !Number.isNaN(Number(value)) ? Number(value) : "—";

const formatCurrencyRate = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

const supplierDisplayName = (supplier) => {
  if (!supplier || typeof supplier !== "object") return "—";
  return supplier.name?.trim() || supplier.shopname?.trim() || "Supplier";
};

const submitterDisplayName = (submittedBy) => {
  if (!submittedBy) return "—";
  if (typeof submittedBy === "object") {
    return submittedBy.name?.trim() || submittedBy.email?.trim() || "—";
  }
  return String(submittedBy);
};

const resolveUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (img.signedUrl) return img.signedUrl;
  if (img.url) return img.url;
  if (img.path) return img.path;
  return null;
};

const statusBadge = (s) => {
  switch (s) {
    case "pending":
      return <CBadge color="warning">Pending</CBadge>;
    case "rate_submitted":
      return <CBadge color="info">Rate Submitted</CBadge>;
    case "fulfilled":
      return <CBadge color="success">Fulfilled</CBadge>;
    case "approval_pending":
      return <CBadge color="danger">HOD Pending</CBadge>;
    default:
      return (
        <CBadge color="light" textColor="dark">
          {s || "—"}
        </CBadge>
      );
  }
};

/* ── component ───────────────────────────────────── */
const QueryProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const userIsHod = isHodRole(user?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [doc, setDoc] = useState(null);

  const [groups, setGroups] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingPreviews, setPendingPreviews] = useState([]);

  const [form, setForm] = useState({
    productName: "",
    rawProductCode: "",
    quantity: "",
    unit: "",
    hsnNumber: "",
    modelNumber: "",
    gstPercentage: "",
    description: "",
    remark: "",
    groupId: "",
    categoryId: "",
  });

  const [rateForm, setRateForm] = useState({
    minRate: "",
    maxRate: "",
  });
  const [updatingRate, setUpdatingRate] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyFilters, setHistoryFilters] = useState({
    from: "",
    to: "",
    search: "",
  });
  const [historyFilterDraft, setHistoryFilterDraft] = useState({
    from: "",
    to: "",
    search: "",
  });

  const applyRateManagement = (rm) => {
    const toFormRate = (value) => {
      if (value == null || value === "") return "0";
      return String(value);
    };
    setRateForm({
      minRate: toFormRate(rm?.minRate),
      maxRate: toFormRate(rm?.maxRate),
    });
  };

  /* categories filtered by selected group — must be after form useState */
  const filteredCategories = form.groupId
    ? allCategories.filter((c) => {
        const gId =
          c.group && typeof c.group === "object"
            ? c.group._id || c.group.id
            : c.group;
        return String(gId || "") === String(form.groupId);
      })
    : allCategories;

  /* ── load groups / categories ── */
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [grpRes, catRes] = await Promise.all([
          groupService.getAll({ pageSize: 100 }),
          categoryService.getAllCategories(),
        ]);
        setGroups(
          sortAlphabetically(
            Array.isArray(grpRes?.data?.groups)
              ? grpRes.data.groups
              : Array.isArray(grpRes?.data)
                ? grpRes.data
                : [],
          ),
        );
        setAllCategories(
          sortAlphabetically(
            Array.isArray(catRes?.data?.categories)
              ? catRes.data.categories
              : Array.isArray(catRes?.data)
                ? catRes.data
                : [],
          ),
        );
      } catch {
        /* non-critical */
      }
    };
    loadMeta();
  }, []);

  /* ── load document ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() => proBucketService.getById(id));
        const data = res?.data?.data || res?.data;
        setDoc(data);
        applyRateManagement(data?.rateManagement);
        setForm({
          productName: data?.productName || "",
          rawProductCode: data?.rawProductCode || "",
          quantity: data?.quantity ?? "",
          unit: data?.unit || "",
          hsnNumber: data?.hsnNumber || "",
          modelNumber: data?.modelNumber || "",
          gstPercentage: data?.gstPercentage ?? "",
          description: data?.description || "",
          remark: data?.remark || "",
          groupId:
            data?.groupId && typeof data.groupId === "object"
              ? data.groupId._id || ""
              : data?.groupId || "",
          categoryId:
            data?.categoryId && typeof data.categoryId === "object"
              ? data.categoryId._id || ""
              : data?.categoryId || "",
        });
      } catch (e) {
        toastError(e?.message || "Failed to load query product");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  /* cleanup object URLs */
  useEffect(() => {
    return () => pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingPreviews]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setRateField = (key, val) => setRateForm((f) => ({ ...f, [key]: val }));

  const loadRateHistories = useCallback(
    async (page = 1, filters = historyFilters) => {
      if (!userIsHod || !id) return;
      setHistoryLoading(true);
      try {
        const params = {
          page,
          pageSize: historyPageSize,
        };
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        if (filters.search?.trim()) params.search = filters.search.trim();

        const res = await proBucketService.listHodRateHistories(id, params);
        const payload = res?.data || res;
        setHistoryRows(Array.isArray(payload?.data) ? payload.data : []);
        setHistoryTotal(Number(payload?.total) || 0);
        setHistoryPage(Number(payload?.page) || page);
        setHistoryTotalPages(Number(payload?.totalPages) || 1);
      } catch (e) {
        toastError(e?.message || "Failed to load rate history");
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyFilters, historyPageSize, id, userIsHod],
  );

  const applyHistoryFilters = () => {
    setHistoryFilters({
      from: historyFilterDraft.from || "",
      to: historyFilterDraft.to || "",
      search: historyFilterDraft.search || "",
    });
    setHistoryPage(1);
  };

  const clearHistoryFilters = () => {
    const empty = { from: "", to: "", search: "" };
    setHistoryFilterDraft(empty);
    setHistoryFilters(empty);
    setHistoryPage(1);
  };

  useEffect(() => {
    if (!userIsHod || !id || !form.rawProductCode?.trim()) {
      setHistoryRows([]);
      setHistoryTotal(0);
      setHistoryPage(1);
      setHistoryTotalPages(1);
      return;
    }
    loadRateHistories(historyPage);
  }, [
    form.rawProductCode,
    historyPage,
    historyFilters,
    id,
    loadRateHistories,
    userIsHod,
  ]);

  /* ── image helpers ── */
  const handleFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingFiles((p) => [...p, ...files]);
    setPendingPreviews((p) => [
      ...p,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
    e.target.value = "";
  };

  const removePending = (idx) => {
    URL.revokeObjectURL(pendingPreviews[idx]);
    setPendingFiles((p) => p.filter((_, i) => i !== idx));
    setPendingPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const removeSaved = (imgId) => {
    setDoc((prev) => ({
      ...prev,
      images: (prev?.images || []).filter((img) => (img?._id || img) !== imgId),
    }));
  };

  const buildImageIds = (uploadedDocs) => {
    const saved = (doc?.images || [])
      .map((img) => (typeof img === "object" ? img._id || img.id : img))
      .filter(Boolean);
    const fresh = uploadedDocs.map((d) => d._id || d.id).filter(Boolean);
    return [...saved, ...fresh];
  };

  /* ── update ── */
  const handleUpdate = async () => {
    const quantity = form.quantity !== "" ? Number(form.quantity) : undefined;
    if (quantity !== undefined) {
      if (!Number.isFinite(quantity) || quantity < 0) {
        toastError("Enter a valid quantity");
        return;
      }
      if (quantity > MAX_QUANTITY) {
        toastError("Quantity cannot exceed 1,00,000");
        return;
      }
    }

    const gstPercentage =
      form.gstPercentage !== "" ? Number(form.gstPercentage) : null;
    if (gstPercentage !== null) {
      if (!Number.isFinite(gstPercentage) || gstPercentage < 0) {
        toastError("Enter a valid GST percentage");
        return;
      }
      if (gstPercentage > MAX_GST_PERCENTAGE) {
        toastError("GST percentage cannot exceed 100");
        return;
      }
    }

    setSaving(true);
    try {
      let uploadedDocs = [];
      if (pendingFiles.length > 0) {
        const res = await documentService.uploadImages(pendingFiles);
        const raw = res?.data || res;
        uploadedDocs = raw?.data?.documents || raw?.documents || [];
      }

      const payload = {
        productName: form.productName,
        quantity: form.quantity !== "" ? Number(form.quantity) : undefined,
        modelNumber: form.modelNumber,
        gstPercentage:
          form.gstPercentage !== "" ? Number(form.gstPercentage) : null,
        remark: form.remark,
        images: buildImageIds(uploadedDocs),
      };

      const res = await proBucketService.updateQueryProduct(id, payload);
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);

      setPendingFiles([]);
      setPendingPreviews([]);
      toastSuccess("Query product updated successfully");
    } catch (e) {
      toastError(e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  /* ── HOD rate management ── */
  const handleUpdateRate = async () => {
    if (!userIsHod) {
      toastError("Only Head of Department can update rates");
      return;
    }
    const minRate = Number(rateForm.minRate);
    const maxRate = Number(rateForm.maxRate);

    if (!Number.isFinite(minRate) || minRate < 0) {
      toastError("Enter a valid minimum rate");
      return;
    }
    if (!Number.isFinite(maxRate) || maxRate < 0) {
      toastError("Enter a valid maximum rate");
      return;
    }
    if (minRate > maxRate) {
      toastError("Minimum rate cannot exceed maximum rate");
      return;
    }
    if (minRate > MAX_HOD_RATE) {
      toastError("Minimum rate cannot exceed 1,000,000");
      return;
    }
    if (maxRate > MAX_HOD_RATE) {
      toastError("Maximum rate cannot exceed 1,000,000");
      return;
    }

    setUpdatingRate(true);
    try {
      const res = await proBucketService.updateHodRates(id, {
        minRate,
        maxRate,
        discount: 0,
      });
      const updated = res?.data?.data || res?.data;
      if (updated) {
        setDoc(updated);
        applyRateManagement(updated?.rateManagement);
        if (historyPage === 1) {
          loadRateHistories(1);
        } else {
          setHistoryPage(1);
        }
      }
      const approved = updated?.rateManagement?.isHodRateApproved;
      toastSuccess(
        approved
          ? "Rates approved and updated successfully"
          : "Rates updated successfully",
      );
    } catch (e) {
      toastError(e?.message || "Failed to update rates");
    } finally {
      setUpdatingRate(false);
    }
  };

  /* ── HOD approve ── */
  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await proBucketService.updateQueryProduct(id, {
        status: "pending",
        hodApproved: true,
      });
      const updated = res?.data?.data || res?.data;
      if (updated) setDoc(updated);
      toastSuccess("HOD approved — status set to Pending");
    } catch (e) {
      toastError(e?.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  /* ── derived flags ── */
  const hodApproved = !!doc?.hodApproved;
  const canUpdate = userIsHod || !hodApproved; // non-HOD locked out after approval
  const savedImages = Array.isArray(doc?.images) ? doc.images : [];
  const queryCode =
    doc?.queryCode ||
    (doc?.queryId && typeof doc.queryId === "object"
      ? doc.queryId.queryCode
      : "") ||
    "—";

  const submittedRateUnit =
    doc?.rateManagement?.submittedRateUnit?.trim() || form.unit?.trim() || "—";

  const hasRateData =
    doc?.rateManagement?.hasSubmittedRates ||
    doc?.rateManagement?.hasHodRates ||
    (Array.isArray(doc?.rates) && doc.rates.length > 0);

  const ratesAwaitingHodApproval =
    hasRateData && !doc?.rateManagement?.isHodRateApproved;

  const ratesUnchanged =
    normalizeRateComparison(rateForm.minRate) ===
      normalizeRateComparison(doc?.rateManagement?.minRate) &&
    normalizeRateComparison(rateForm.maxRate) ===
      normalizeRateComparison(doc?.rateManagement?.maxRate);

  const minRateValue = normalizeRateComparison(rateForm.minRate);
  const maxRateValue = normalizeRateComparison(rateForm.maxRate);
  const rateMargin =
    minRateValue != null && maxRateValue != null && maxRateValue >= minRateValue
      ? maxRateValue - minRateValue
      : null;
  const ratesMinExceedsMax =
    minRateValue != null && maxRateValue != null && minRateValue > maxRateValue;

  const minRateExceedsLimit =
    minRateValue != null && minRateValue > MAX_HOD_RATE;
  const maxRateExceedsLimit =
    maxRateValue != null && maxRateValue > MAX_HOD_RATE;
  const ratesExceedLimit = minRateExceedsLimit || maxRateExceedsLimit;

  const ratesHaveZero = minRateValue === 0 || maxRateValue === 0;

  const historyStartItem =
    historyTotal === 0 ? 0 : (historyPage - 1) * historyPageSize + 1;
  const historyEndItem = Math.min(historyPage * historyPageSize, historyTotal);
  const hasHistoryFilters = !!(
    historyFilters.from ||
    historyFilters.to ||
    historyFilters.search?.trim()
  );

  const procurementRates = Array.isArray(doc?.rates) ? doc.rates : [];

  const quantityValue = normalizeRateComparison(form.quantity);
  const quantityExceedsLimit =
    quantityValue != null && quantityValue > MAX_QUANTITY;

  const gstPercentageValue =
    form.gstPercentage === "" || form.gstPercentage == null
      ? null
      : Number(form.gstPercentage);
  const gstExceedsMax =
    gstPercentageValue != null &&
    Number.isFinite(gstPercentageValue) &&
    gstPercentageValue > MAX_GST_PERCENTAGE;
  const gstAboveStandardRate =
    gstPercentageValue != null &&
    Number.isFinite(gstPercentageValue) &&
    gstPercentageValue > GST_HIGH_RATE_THRESHOLD &&
    !gstExceedsMax;

  if (loading) return <Loader />;

  return (
    <CRow>
      <CCol xs={12}>
        {/* ── Top bar ── */}
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => navigate("/query-products")}
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>

          <h5 className="mb-0 fw-semibold flex-grow-1 text-truncate">
            {doc?.productName || "Query Product"}
          </h5>

          <div className="d-flex align-items-center gap-2">
            {statusBadge(doc?.status)}

            {hodApproved && (
              <CBadge color="success" className="px-2 py-1">
                <CIcon
                  icon={cilCheckCircle}
                  className="me-1"
                  style={{ width: 12 }}
                />
                HOD Approved
              </CBadge>
            )}

            {/* HOD Approve — visible to HOD only, disabled after approval */}
            {userIsHod && (
              <CButton
                color="success"
                size="sm"
                disabled={hodApproved || approving}
                onClick={handleApprove}
                className="px-3"
              >
                {approving ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Approving…
                  </>
                ) : hodApproved ? (
                  <>
                    <CIcon icon={cilCheckCircle} className="me-1" />
                    HOD Approved
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCheckCircle} className="me-1" />
                    HOD Approve
                  </>
                )}
              </CButton>
            )}
          </div>
        </div>

        {/* locked banner for non-HOD after approval */}
        {hodApproved && !userIsHod && (
          <div className="alert alert-success d-flex align-items-center gap-2 mb-3 py-2">
            <CIcon icon={cilCheckCircle} />
            <span>
              This product has been <strong>HOD approved</strong>. Editing is
              restricted to Head of Department only.
            </span>
          </div>
        )}

        <CRow className="g-4">
          {/* ── Images panel ── */}
          <CCol xs={12} lg={4}>
            <CCard className="h-100">
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Images</strong>
                <CBadge color="secondary">
                  {savedImages.length + pendingFiles.length}
                </CBadge>
              </CCardHeader>
              <CCardBody>
                {savedImages.length > 0 && (
                  <div className="mb-3">
                    <p className="small text-body-secondary mb-2">Saved</p>
                    <div className="d-flex flex-wrap gap-2">
                      {savedImages.map((img, i) => {
                        const url = resolveUrl(img);
                        const imgId =
                          typeof img === "object" ? img._id || img.id : img;
                        const name =
                          typeof img === "object"
                            ? img.name || `Image ${i + 1}`
                            : `Image ${i + 1}`;
                        return (
                          <div
                            key={i}
                            className="position-relative border rounded overflow-hidden"
                            style={{ width: 100, flexShrink: 0 }}
                          >
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={url}
                                  alt={name}
                                  style={{
                                    width: "100%",
                                    height: 90,
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              </a>
                            ) : (
                              <div
                                className="d-flex align-items-center justify-content-center bg-light text-body-secondary small"
                                style={{ height: 90 }}
                              >
                                No preview
                              </div>
                            )}
                            <div
                              className="px-1 py-1 small text-truncate border-top bg-white"
                              style={{ fontSize: "0.65rem" }}
                              title={name}
                            >
                              {name}
                            </div>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => removeSaved(imgId)}
                                title="Remove"
                                style={{
                                  position: "absolute",
                                  top: 3,
                                  right: 3,
                                  background: "rgba(220,53,69,0.85)",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: 20,
                                  height: 20,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  padding: 0,
                                  color: "#fff",
                                }}
                              >
                                <CIcon
                                  icon={cilTrash}
                                  style={{ width: 10, height: 10 }}
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pendingFiles.length > 0 && (
                  <div className="mb-3">
                    <p className="small text-body-secondary mb-2">
                      Pending upload ({pendingFiles.length})
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      {pendingPreviews.map((src, i) => (
                        <div
                          key={i}
                          className="position-relative border rounded overflow-hidden"
                          style={{ width: 100, flexShrink: 0 }}
                        >
                          <img
                            src={src}
                            alt={pendingFiles[i]?.name}
                            style={{
                              width: "100%",
                              height: 90,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          <div
                            className="px-1 py-1 small text-truncate border-top bg-white"
                            style={{ fontSize: "0.65rem" }}
                            title={pendingFiles[i]?.name}
                          >
                            {pendingFiles[i]?.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => removePending(i)}
                            title="Remove"
                            style={{
                              position: "absolute",
                              top: 3,
                              right: 3,
                              background: "rgba(220,53,69,0.85)",
                              border: "none",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: 0,
                              color: "#fff",
                            }}
                          >
                            <CIcon
                              icon={cilTrash}
                              style={{ width: 10, height: 10 }}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canUpdate && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFilePick}
                    />
                    <CButton
                      color="primary"
                      variant="outline"
                      size="sm"
                      className="w-100"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <CIcon icon={cilCloudUpload} className="me-2" />
                      Add Images
                    </CButton>
                    {pendingFiles.length > 0 && (
                      <p className="small text-warning mt-2 mb-0">
                        ⚠ {pendingFiles.length} image
                        {pendingFiles.length !== 1 ? "s" : ""} waiting — click{" "}
                        <strong>Update</strong> to save.
                      </p>
                    )}
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          {/* ── Details / edit form ── */}
          <CCol xs={12} lg={8}>
            <CCard>
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Product Details</strong>
                <span className="small text-body-secondary">
                  Query:{" "}
                  <span className="badge bg-dark font-monospace">
                    {queryCode}
                  </span>
                </span>
              </CCardHeader>

              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    <CFormLabel>
                      Product Name <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      value={form.productName}
                      onChange={(e) => setField("productName", e.target.value)}
                      placeholder="Product name"
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={12} md={6}>
                    <CFormLabel>Raw Product Code</CFormLabel>
                    <CFormInput
                      value={form.rawProductCode}
                      placeholder="Raw product code"
                      className="font-monospace bg-light"
                      disabled
                    />
                  </CCol>

                  <CCol xs={12} md={6}>
                    <CFormLabel>Query Code</CFormLabel>
                    <CFormInput
                      value={queryCode}
                      readOnly
                      className="bg-light font-monospace"
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>Unit</CFormLabel>
                    <CFormInput
                      value={form.unit}
                      placeholder="e.g. pcs"
                      className="bg-light"
                      disabled
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>Quantity</CFormLabel>
                    <CFormInput
                      type="number"
                      min={0}
                      max={MAX_QUANTITY}
                      value={form.quantity}
                      onChange={(e) => setField("quantity", e.target.value)}
                      placeholder="0"
                      disabled={!canUpdate}
                      invalid={quantityExceedsLimit}
                    />
                    {quantityExceedsLimit && (
                      <p className="small text-danger mb-0 mt-1">
                        Quantity must not exceed 1,00,000.
                      </p>
                    )}
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>HSN Number</CFormLabel>
                    <CFormInput
                      value={form.hsnNumber}
                      placeholder="HSN code"
                      className="bg-light"
                      disabled
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel>Model Number</CFormLabel>
                    <CFormInput
                      value={form.modelNumber}
                      onChange={(e) => setField("modelNumber", e.target.value)}
                      placeholder="Model no."
                      disabled={!canUpdate}
                    />
                  </CCol>

                  <CCol xs={6} md={3}>
                    <CFormLabel
                      className={
                        gstAboveStandardRate
                          ? "text-warning fw-semibold"
                          : undefined
                      }
                    >
                      GST %
                    </CFormLabel>
                    <CFormInput
                      type="number"
                      min={0}
                      max={MAX_GST_PERCENTAGE}
                      value={form.gstPercentage}
                      onChange={(e) =>
                        setField("gstPercentage", e.target.value)
                      }
                      placeholder="0"
                      disabled={!canUpdate}
                      invalid={gstExceedsMax}
                      className={
                        gstAboveStandardRate
                          ? "border-warning text-warning fw-semibold"
                          : undefined
                      }
                    />
                    {gstAboveStandardRate && (
                      <p className="small text-warning mb-0 mt-1">
                        GST is more than 18%.
                      </p>
                    )}
                    {gstExceedsMax && (
                      <p className="small text-danger mb-0 mt-1">
                        GST percentage must not exceed 100.
                      </p>
                    )}
                  </CCol>

                  <CCol xs={12} md={4}>
                    <CFormLabel>Group</CFormLabel>
                    <CFormSelect
                      value={form.groupId}
                      className="bg-light"
                      disabled
                    >
                      <option value="">— No Group —</option>
                      {groups.map((g) => (
                        <option key={g._id || g.id} value={g._id || g.id}>
                          {g.name}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12} md={5}>
                    <CFormLabel>Category</CFormLabel>
                    <CFormSelect
                      value={form.categoryId}
                      className="bg-light"
                      disabled
                    >
                      <option value="">— No Category —</option>
                      {filteredCategories.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.name}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>

                  <CCol xs={12}>
                    <CFormLabel>Description</CFormLabel>
                    <CFormTextarea
                      rows={3}
                      value={form.description}
                      placeholder="Product description…"
                      className="bg-light"
                      disabled
                    />
                  </CCol>

                  <CCol xs={12}>
                    <CFormLabel>Remark</CFormLabel>
                    <CFormTextarea
                      rows={2}
                      value={form.remark}
                      onChange={(e) => setField("remark", e.target.value)}
                      placeholder="Any remarks…"
                      disabled={!canUpdate}
                    />
                  </CCol>
                </CRow>

                {/* ── Action row ── */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => navigate("/query-products")}
                    disabled={saving}
                  >
                    Cancel
                  </CButton>

                  {canUpdate && (
                    <CButton
                      color="primary"
                      onClick={handleUpdate}
                      disabled={saving || quantityExceedsLimit || gstExceedsMax}
                    >
                      {saving ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Updating…
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilSave} className="me-2" />
                          Update
                        </>
                      )}
                    </CButton>
                  )}
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          {/* ── Rate Management ── */}
          <CCol xs={12}>
            <CCard>
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Rate Management</strong>
                {doc?.rateManagement?.isHodRateApproved && (
                  <CBadge color="success">HOD rate approved</CBadge>
                )}
                {ratesAwaitingHodApproval && (
                  <CBadge color="warning">Awaiting HOD approval</CBadge>
                )}
              </CCardHeader>
              <CCardBody>
                {!hasRateData && !form.rawProductCode?.trim() ? (
                  <p className="text-body-secondary mb-0">
                    No supplier rates have been submitted yet. Rates can be
                    managed here after procurement submits rates for this
                    product.
                  </p>
                ) : (
                  <>
                    <CRow className="g-3">
                      <CCol xs={12} md={3}>
                        <CFormLabel>Submitted rate unit</CFormLabel>
                        <CFormInput
                          value={submittedRateUnit}
                          readOnly
                          className="bg-light"
                        />
                      </CCol>

                      <CCol xs={12} md={3}>
                        <CFormLabel>Minimum rate</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          max={MAX_HOD_RATE}
                          value={rateForm.minRate}
                          onChange={(e) =>
                            setRateField("minRate", e.target.value)
                          }
                          placeholder="0"
                          disabled={!userIsHod}
                          invalid={ratesMinExceedsMax || minRateExceedsLimit}
                        />
                      </CCol>

                      <CCol xs={12} md={3}>
                        <CFormLabel>Maximum rate</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          max={MAX_HOD_RATE}
                          value={rateForm.maxRate}
                          onChange={(e) =>
                            setRateField("maxRate", e.target.value)
                          }
                          placeholder="0"
                          disabled={!userIsHod}
                          invalid={ratesMinExceedsMax || maxRateExceedsLimit}
                        />
                      </CCol>

                      <CCol xs={12} md={3}>
                        <CFormLabel className="text-info fw-semibold">
                          Margin
                        </CFormLabel>
                        <CFormInput
                          value={formatRateValue(rateMargin)}
                          readOnly
                          className="bg-light text-info fw-semibold"
                        />
                      </CCol>
                    </CRow>

                    {ratesMinExceedsMax && (
                      <p className="small text-danger mt-3 mb-0">
                        Minimum rate cannot be greater than maximum rate.
                      </p>
                    )}

                    {ratesExceedLimit && (
                      <p className="small text-danger mt-3 mb-0">
                        Minimum and maximum rates must not exceed 1,000,000.
                      </p>
                    )}

                    {ratesHaveZero && userIsHod && (
                      <p className="small text-warning mt-3 mb-0">
                        Minimum and maximum rates must both be greater than 0 to
                        update.
                      </p>
                    )}

                    {!form.rawProductCode?.trim() && (
                      <p className="small text-warning mt-3 mb-0">
                        Raw product code is missing — rates cannot be updated
                        until it is set on the source query.
                      </p>
                    )}

                    {userIsHod && (
                      <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                        <CButton
                          color="primary"
                          onClick={handleUpdateRate}
                          disabled={
                            updatingRate ||
                            !form.rawProductCode?.trim() ||
                            ratesMinExceedsMax ||
                            ratesExceedLimit ||
                            ratesHaveZero ||
                            (ratesUnchanged && !ratesAwaitingHodApproval)
                          }
                        >
                          {updatingRate ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              {ratesAwaitingHodApproval
                                ? "Approving…"
                                : "Updating rate…"}
                            </>
                          ) : ratesAwaitingHodApproval ? (
                            <>
                              <CIcon icon={cilCheckCircle} className="me-2" />
                              Approve & Update Rate
                            </>
                          ) : (
                            <>
                              <CIcon icon={cilSave} className="me-2" />
                              Update Rate
                            </>
                          )}
                        </CButton>
                      </div>
                    )}

                    {!userIsHod && (
                      <p className="small text-body-secondary mt-3 mb-0">
                        Rate updates are available to Head of Department only.
                      </p>
                    )}
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12}>
            <CCard>
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>Procurement Rates</strong>
                {procurementRates.length > 0 && (
                  <CBadge color="info">
                    {procurementRates.length} rate
                    {procurementRates.length === 1 ? "" : "s"}
                  </CBadge>
                )}
              </CCardHeader>
              <CCardBody>
                {procurementRates.length === 0 ? (
                  <p className="text-body-secondary mb-0">
                    No procurement rates have been submitted for this product
                    yet.
                  </p>
                ) : (
                  <CTable responsive hover className="mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell style={{ width: 48 }}>
                          #
                        </CTableHeaderCell>
                        <CTableHeaderCell>Supplier</CTableHeaderCell>
                        <CTableHeaderCell>Phone</CTableHeaderCell>
                        <CTableHeaderCell>Base rate</CTableHeaderCell>
                        <CTableHeaderCell>GST %</CTableHeaderCell>
                        <CTableHeaderCell>Discount %</CTableHeaderCell>
                        <CTableHeaderCell>Final amount</CTableHeaderCell>
                        <CTableHeaderCell>Unit</CTableHeaderCell>
                        <CTableHeaderCell>Remark</CTableHeaderCell>
                        <CTableHeaderCell>Submitted By</CTableHeaderCell>
                        <CTableHeaderCell>Submitted At</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {procurementRates.map((row, idx) => (
                        <CTableRow
                          key={
                            row._id || `${row.submittedAt}-${row.rate}-${idx}`
                          }
                        >
                          <CTableDataCell>{idx + 1}</CTableDataCell>
                          <CTableDataCell>
                            <span className="fw-semibold">
                              {supplierDisplayName(row.supplier)}
                            </span>
                            {row.supplier?.uniqueId ? (
                              <div className="small text-body-secondary font-monospace">
                                {row.supplier.uniqueId}
                              </div>
                            ) : null}
                          </CTableDataCell>
                          <CTableDataCell>
                            {row.supplier?.phone_1?.trim() || "—"}
                          </CTableDataCell>
                          <CTableDataCell className="fw-semibold text-primary">
                            {formatCurrencyRate(row.rate)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {row.gstPercentage != null ? row.gstPercentage : 0}
                          </CTableDataCell>
                          <CTableDataCell>
                            {row.discountPercentage != null
                              ? row.discountPercentage
                              : 0}
                          </CTableDataCell>
                          <CTableDataCell className="fw-semibold text-success">
                            ₹
                            {formatProBucketRateAmount(
                              resolveProBucketEffectiveRate(row),
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {row.unit?.trim() || "—"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {row.remark?.trim() || "—"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {submitterDisplayName(row.submittedBy)}
                          </CTableDataCell>
                          <CTableDataCell className="text-nowrap">
                            {dateTimeFormatter(row.submittedAt, "—")}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          {userIsHod && (
            <CCol xs={12}>
              <CCard>
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <strong>Product Rate History</strong>
                  {historyTotal > 0 && (
                    <CBadge color="info">
                      {historyTotal} record{historyTotal === 1 ? "" : "s"}
                    </CBadge>
                  )}
                </CCardHeader>
                <CCardBody>
                  {!form.rawProductCode?.trim() ? (
                    <p className="text-body-secondary mb-0">
                      Rate history is available once this product has a raw
                      product code.
                    </p>
                  ) : (
                    <>
                      <CRow className="g-3 mb-3 align-items-end">
                        <CCol xs={12} md={6} lg={3}>
                          <CFormLabel className="small text-muted mb-1">
                            Search query code
                          </CFormLabel>
                          <CFormInput
                            value={historyFilterDraft.search}
                            placeholder="Query code"
                            onChange={(e) =>
                              setHistoryFilterDraft((prev) => ({
                                ...prev,
                                search: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") applyHistoryFilters();
                            }}
                          />
                        </CCol>
                        <CCol xs={12} md={6} lg={2}>
                          <CFormLabel className="small text-muted mb-1">
                            From date
                          </CFormLabel>
                          <CFormInput
                            type="date"
                            value={historyFilterDraft.from}
                            max={historyFilterDraft.to || undefined}
                            onChange={(e) =>
                              setHistoryFilterDraft((prev) => ({
                                ...prev,
                                from: e.target.value,
                              }))
                            }
                          />
                        </CCol>
                        <CCol xs={12} md={6} lg={2}>
                          <CFormLabel className="small text-muted mb-1">
                            To date
                          </CFormLabel>
                          <CFormInput
                            type="date"
                            value={historyFilterDraft.to}
                            min={historyFilterDraft.from || undefined}
                            onChange={(e) =>
                              setHistoryFilterDraft((prev) => ({
                                ...prev,
                                to: e.target.value,
                              }))
                            }
                          />
                        </CCol>
                        <CCol
                          xs={12}
                          md={6}
                          lg={5}
                          className="d-flex flex-wrap gap-2"
                        >
                          <CButton
                            color="primary"
                            onClick={applyHistoryFilters}
                            disabled={historyLoading}
                          >
                            Apply Filters
                          </CButton>
                          <CButton
                            color="secondary"
                            variant="outline"
                            onClick={clearHistoryFilters}
                            disabled={historyLoading || !hasHistoryFilters}
                          >
                            Clear
                          </CButton>
                        </CCol>
                      </CRow>

                      {historyLoading && historyRows.length === 0 ? (
                        <div className="text-center py-4">
                          <CSpinner size="sm" className="me-2" />
                          Loading rate history…
                        </div>
                      ) : historyRows.length === 0 ? (
                        <p className="text-body-secondary mb-0">
                          {hasHistoryFilters
                            ? "No rate history matches your filters."
                            : "No rate history recorded for this product yet."}
                        </p>
                      ) : (
                        <>
                          <CTable responsive hover className="mb-0">
                            <CTableHead>
                              <CTableRow>
                                <CTableHeaderCell>
                                  Date &amp; Time
                                </CTableHeaderCell>
                                <CTableHeaderCell>Unit</CTableHeaderCell>
                                <CTableHeaderCell>
                                  Minimum Rate
                                </CTableHeaderCell>
                                <CTableHeaderCell>
                                  Maximum Rate
                                </CTableHeaderCell>
                                <CTableHeaderCell>Query Info</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {historyRows.map((row) => (
                                <CTableRow key={row.id || row._id}>
                                  <CTableDataCell>
                                    {dateTimeFormatter(row.createdAt, "—")}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {row.unit?.trim() || "—"}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {formatRateValue(row.minRate)}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {formatRateValue(row.maxRate)}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    <div className="fw-semibold">
                                      {row.companyName?.trim() || "—"}
                                    </div>
                                    <div className="small font-monospace text-body-secondary">
                                      {row.queryCode?.trim() || "—"}
                                    </div>
                                    <div className="small text-body-secondary">
                                      Received:{" "}
                                      {dateFormatter(row.queryReceivedAt, "—")}
                                    </div>
                                  </CTableDataCell>
                                </CTableRow>
                              ))}
                            </CTableBody>
                          </CTable>

                          <TablePagination
                            currentPage={historyPage}
                            totalPages={historyTotalPages}
                            onPageChange={setHistoryPage}
                            showRange
                            totalItems={historyTotal}
                            itemsPerPage={historyPageSize}
                            disabled={historyLoading}
                          />
                        </>
                      )}
                    </>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          )}
        </CRow>
      </CCol>
    </CRow>
  );
};

export default QueryProductView;
