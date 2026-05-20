import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CBadge,
  CBreadcrumb,
  CBreadcrumbItem,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CTabContent,
  CTabPane,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilPlus, cilTrash, cilX } from "@coreui/icons";
import proBucketService from "../../services/proBucketService";
import supplierService from "../../services/supplierService";
import usePermissions from "../../hooks/usePermissions";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import { getAssetsUrl } from "../../api/endpoints";

/** Below Bootstrap `md` (768px) — treat as phone for add-rate panel layout */
const useIsPhoneView = () => {
  const query = "(max-width: 767.98px)";
  const [isPhone, setIsPhone] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsPhone(mq.matches);
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isPhone;
};

const rateBadge = (s) => {
  switch (s) {
    case "pending":
      return <CBadge color="warning">Pending</CBadge>;
    case "rate_submitted":
      return <CBadge color="info">Rate submitted</CBadge>;
    case "fulfilled":
      return <CBadge color="success">Fulfilled</CBadge>;
    default:
      return <CBadge color="secondary">{s || "—"}</CBadge>;
  }
};

const dash = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  if (typeof v === "number" && Number.isNaN(v)) return "—";
  return v;
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

const RefName = ({ refVal }) => {
  if (refVal == null || refVal === "") return "—";
  if (typeof refVal === "object") {
    if (refVal.name != null && String(refVal.name).trim() !== "")
      return String(refVal.name);
    if (refVal.productName != null && String(refVal.productName).trim() !== "")
      return String(refVal.productName);
    return "—";
  }
  return String(refVal);
};

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <div
      className="text-body-secondary small text-uppercase"
      style={{ fontSize: "0.7rem" }}
    >
      {label}
    </div>
    <div className="text-break">
      {children != null && children !== "" ? children : "—"}
    </div>
  </div>
);

const ItemInfoSections = ({ item }) => {
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const imageList = Array.isArray(item.images) ? item.images : [];

  return (
    <div className="pro-bucket-item-info">
      <CCard className="mb-3 border-0 bg-light">
        <CCardBody>
          <h4 className="h5 mb-1">
            {dash(item.productName) || "Product line"}
          </h4>
          <p className="text-body-secondary small mb-0">
            Line {item.lineIndex != null ? item.lineIndex + 1 : "—"}
          </p>
        </CCardBody>
      </CCard>

      <CCard className="mb-3">
        <CCardHeader>Product and quantity</CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol sm={6} md={3}>
              <Field label="Quantity">{dash(item.quantity)}</Field>
            </CCol>
            <CCol sm={6} md={3}>
              <Field label="Unit">{dash(item.unit)}</Field>
            </CCol>
            <CCol sm={6} md={3}>
              <Field label="HSN">{dash(item.hsnNumber)}</Field>
            </CCol>
            <CCol sm={6} md={3}>
              <Field label="Model / part #">{dash(item.modelNumber)}</Field>
            </CCol>
            <CCol sm={6} md={3}>
              <Field label="GST %">
                {item.gstPercentage != null && item.gstPercentage !== ""
                  ? `${item.gstPercentage}`
                  : "—"}
              </Field>
            </CCol>
            <CCol xs={12}>
              <Field label="Remark">{dash(item.remark)}</Field>
            </CCol>
            <CCol xs={12}>
              <Field label="Description">{dash(item.description)}</Field>
            </CCol>
            {variants.length > 0 && (
              <CCol xs={12}>
                <div
                  className="text-body-secondary small text-uppercase mb-1"
                  style={{ fontSize: "0.7rem" }}
                >
                  Variants
                </div>
                <ul className="mb-0 small">
                  {variants.map((v, i) => (
                    <li key={v._id || i}>{dash(v.variantName)}</li>
                  ))}
                </ul>
              </CCol>
            )}
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-3">
        <CCardHeader>Classification and links</CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={4}>
              <Field label="Product group">
                <RefName refVal={item.groupId} />
              </Field>
            </CCol>
            <CCol md={4}>
              <Field label="Category">
                <RefName refVal={item.categoryId} />
              </Field>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {imageList.length > 0 && (
        <CCard className="mb-3">
          <CCardHeader>Images</CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              {imageList.map((img) => {
                const src = imgSrc(
                  typeof img === "object" && img != null
                    ? img.path || img.url
                    : img,
                );
                if (!src) return null;
                return (
                  <CCol key={img._id || src} xs={6} sm={4} md={3}>
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="d-block"
                    >
                      <img
                        src={src}
                        alt={img.name || "Product"}
                        className="img-fluid rounded border w-100"
                        style={{ maxHeight: 180, objectFit: "contain" }}
                      />
                    </a>
                    {img.name && (
                      <div
                        className="small text-body-secondary text-truncate mt-1"
                        title={img.name}
                      >
                        {img.name}
                      </div>
                    )}
                  </CCol>
                );
              })}
            </CRow>
          </CCardBody>
        </CCard>
      )}
    </div>
  );
};

const emptyRow = () => ({
  supplierId: "",
  rate: "",
  unit: "",
  remark: "",
});

/** Digits and at most one decimal point; strips all other characters (paste-safe). */
const sanitizeRateInput = (raw) => {
  if (raw === "" || raw == null) return "";
  const t = String(raw).replace(/[^\d.]/g, "");
  if (t === "") return "";
  const dot = t.indexOf(".");
  if (dot === -1) return t;
  return t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, "");
};

const ProBucketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate } = usePermissions();
  const canAddRate = canUpdate("pro_bucket");
  const isPhoneView = useIsPhoneView();

  const [activeTab, setActiveTab] = useState(0);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [rateBarOpen, setRateBarOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [allSuppliersCache, setAllSuppliersCache] = useState([]);
  const [rateRows, setRateRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await withMinimumDelay(() => proBucketService.getById(id));
      const doc = res?.data;
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

  const loadSuppliers = useCallback(async (search, saveAsCache) => {
    try {
      const q =
        search && String(search).trim() ? String(search).trim() : undefined;
      const res = await supplierService.getAll({
        pageNumber: 1,
        pageSize: 100,
        search: q,
      });
      const block = res?.data;
      const list = Array.isArray(block?.suppliers) ? block.suppliers : [];
      setSuppliers(list);
      if (saveAsCache) {
        setAllSuppliersCache(list);
      }
      return list;
    } catch (e) {
      toastError(e?.message || "Failed to load suppliers");
      setSuppliers([]);
      if (saveAsCache) {
        setAllSuppliersCache([]);
      }
      return [];
    }
  }, []);

  useEffect(() => {
    if (!rateBarOpen) {
      return;
    }
    if (!supplierSearch.trim()) {
      loadSuppliers(undefined, true);
      return;
    }
    const t = setTimeout(() => {
      loadSuppliers(supplierSearch.trim(), false);
    }, 350);
    return () => clearTimeout(t);
  }, [rateBarOpen, supplierSearch, loadSuppliers]);

  const byId = useMemo(() => {
    const m = new Map();
    (allSuppliersCache || []).forEach((s) => m.set(String(s._id), s));
    (suppliers || []).forEach((s) => m.set(String(s._id), s));
    return m;
  }, [allSuppliersCache, suppliers]);

  const supplierOptionsForRow = (row) => {
    const list = suppliers || [];
    if (!row?.supplierId) {
      return list;
    }
    const inList = list.some((s) => String(s._id) === String(row.supplierId));
    if (inList) {
      return list;
    }
    const cached = byId.get(String(row.supplierId));
    if (cached) {
      return [cached, ...list];
    }
    return list;
  };

  const closeRateBar = () => {
    if (saving) return;
    setRateBarOpen(false);
    setSupplierSearch("");
  };

  const addRateRow = () => setRateRows((r) => [...r, emptyRow()]);

  const updateRateRow = (index, field, value) => {
    setRateRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const removeRateRow = (index) => {
    setRateRows((rows) => rows.filter((_, i) => i !== index));
  };

  const submitRates = async () => {
    const valid = rateRows
      .filter((r) => r.rate !== "" && r.rate !== null)
      .map((r) => {
        const row = {
          rate: Number(r.rate),
          unit: r.unit || "",
          remark: r.remark || "",
        };
        if (r.supplierId) {
          row.supplierId = r.supplierId;
        }
        return row;
      });
    if (!valid.length) {
      toastError("Add at least one line with a rate amount.");
      return;
    }
    for (const r of valid) {
      if (Number.isNaN(r.rate) || r.rate < 0) {
        toastError("Each rate must be a valid number ≥ 0.");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await proBucketService.appendRates(id, valid);
      const doc = res?.data;
      if (doc) setItem(doc);
      toastSuccess("Rates saved");
      setRateBarOpen(false);
      setSupplierSearch("");
      setRateRows([emptyRow()]);
      load();
    } catch (e) {
      toastError(e?.message || "Failed to save rates");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="d-flex align-items-center justify-content-between gap-2 py-2">
            <CBreadcrumb className="mb-0 flex-shrink-1" style={{ minWidth: 0, overflow: "hidden" }}>
              <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
              <CBreadcrumbItem href="#/pro-bucket">Pro Bucket</CBreadcrumbItem>
              <CBreadcrumbItem active className="text-truncate d-inline-block" style={{ maxWidth: "10rem" }}>
                {item?.productName || "Item"}
              </CBreadcrumbItem>
            </CBreadcrumb>
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              onClick={() => navigate("/pro-bucket")}
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
                {item.productName && (
                  <strong className="me-1">{item.productName}</strong>
                )}
                {rateBadge(item.status)}
              </>
            )}
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <Loader />
            ) : !item ? (
              <p className="text-body-secondary">Item not found.</p>
            ) : (
              <>
                <div
                  className={
                    isPhoneView
                      ? "sticky-top mb-3 border-bottom pb-2"
                      : undefined
                  }
                  style={
                    isPhoneView
                      ? {
                          zIndex: 6,
                          marginLeft: "-1rem",
                          marginRight: "-1rem",
                          paddingLeft: "1rem",
                          paddingRight: "1rem",
                          marginTop: "-0.5rem",
                          paddingTop: "0.75rem",
                          background: "var(--cui-body-bg)",
                          boxShadow: "0 6px 16px rgba(0, 0, 0, 0.06)",
                        }
                      : undefined
                  }
                >
                  <div
                    className={
                      isPhoneView
                        ? "d-flex align-items-end gap-2 flex-nowrap"
                        : undefined
                    }
                  >
                    <CNav
                      variant="tabs"
                      className={
                        isPhoneView
                          ? "mb-0 flex-grow-1 min-w-0 flex-nowrap border-bottom-0"
                          : "mb-3"
                      }
                      style={
                        isPhoneView
                          ? { flexWrap: "nowrap", overflowX: "auto" }
                          : undefined
                      }
                      role="tablist"
                    >
                      <CNavItem className="flex-shrink-0">
                        <CNavLink
                          active={activeTab === 0}
                          onClick={() => setActiveTab(0)}
                          style={{ cursor: "pointer" }}
                        >
                          Item info
                        </CNavLink>
                      </CNavItem>
                      <CNavItem className="flex-shrink-0">
                        <CNavLink
                          active={activeTab === 1}
                          onClick={() => setActiveTab(1)}
                          style={{ cursor: "pointer" }}
                          className="d-flex align-items-center gap-2"
                        >
                          Rates
                          {item?.rates?.length > 0 && (
                            <CBadge
                              color={activeTab === 1 ? "primary" : "secondary"}
                              shape="rounded-pill"
                              style={{ fontSize: "0.65rem" }}
                            >
                              {item.rates.length}
                            </CBadge>
                          )}
                        </CNavLink>
                      </CNavItem>
                    </CNav>
                    {isPhoneView && canAddRate && activeTab === 1 ? (
                      <button
                        type="button"
                        className="btn btn-primary d-inline-flex align-items-center gap-1 flex-shrink-0 border-0 rounded-pill shadow-sm"
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          lineHeight: 1.2,
                          padding: "0.4rem 0.75rem",
                          boxShadow:
                            "0 2px 10px rgba(var(--cui-primary-rgb, 50, 31, 219), 0.35)",
                        }}
                        onClick={() => {
                          setRateRows([emptyRow()]);
                          setSupplierSearch("");
                          setRateBarOpen(true);
                        }}
                      >
                        <CIcon icon={cilPlus} size="sm" />
                        <span>Add rate</span>
                      </button>
                    ) : null}
                  </div>
                </div>
                <CTabContent>
                  <CTabPane role="tabpanel" visible={activeTab === 0}>
                    <ItemInfoSections item={item} />
                  </CTabPane>
                  <CTabPane role="tabpanel" visible={activeTab === 1}>
                    {canAddRate && !isPhoneView && (item.rates?.length > 0) && (
                      <CButton
                        color="primary"
                        className="mb-3"
                        onClick={() => {
                          setRateRows([emptyRow()]);
                          setSupplierSearch("");
                          setRateBarOpen(true);
                        }}
                      >
                        <CIcon icon={cilPlus} className="me-1" />
                        Add rate
                      </CButton>
                    )}

                    {(!item.rates || !item.rates.length) && (
                      <div
                        className="d-flex flex-column align-items-center justify-content-center text-center py-5 px-3 rounded border"
                        style={{
                          background: "var(--cui-tertiary-bg, #f8f9fa)",
                          minHeight: "12rem",
                        }}
                      >
                        <p className="text-body-secondary mb-3 fs-6">
                          No rates have been submitted yet for this item.
                        </p>
                        {canAddRate && !isPhoneView && (
                          <CButton
                            color="primary"
                            onClick={() => {
                              setRateRows([emptyRow()]);
                              setSupplierSearch("");
                              setRateBarOpen(true);
                            }}
                          >
                            <CIcon icon={cilPlus} className="me-1" />
                            Add first rate
                          </CButton>
                        )}
                        {canAddRate && isPhoneView && (
                          <p className="text-body-secondary small mb-0">
                            Tap <strong>Add rate</strong> above to submit a rate.
                          </p>
                        )}
                      </div>
                    )}

                    {(item.rates?.length > 0) && (
                      <CRow>
                        {(item.rates || []).map((r) => (
                          <CCol
                            key={r._id || `${r.submittedAt}-${r.rate}`}
                            xs={12}
                            md={6}
                            className="mb-3"
                          >
                            <CCard>
                              <CCardBody className="py-3">
                                <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      className="fw-semibold text-truncate"
                                      title={
                                        r.supplier?.name ||
                                        r.supplier?.shopname ||
                                        undefined
                                      }
                                    >
                                      {r.supplier?.name ||
                                        r.supplier?.shopname ||
                                        (r.supplier
                                          ? "Supplier"
                                          : "No supplier")}
                                    </div>
                                    {r.supplier?.phone_1 && (
                                      <div className="text-body-secondary small">
                                        {r.supplier.phone_1}
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    className="fw-bold text-nowrap"
                                    style={{
                                      fontSize: "1.15rem",
                                      color: "var(--cui-primary)",
                                    }}
                                  >
                                    ₹ {r.rate}
                                  </div>
                                </div>
                                <div className="d-flex flex-wrap gap-3 small text-body-secondary border-top pt-2 mt-1">
                                  <span>
                                    <span className="me-1">Unit:</span>
                                    <span className="text-body">{r.unit || "—"}</span>
                                  </span>
                                  {r.remark && (
                                    <span>
                                      <span className="me-1">Remark:</span>
                                      <span className="text-body">{r.remark}</span>
                                    </span>
                                  )}
                                  {r.submittedAt && (
                                    <span className="ms-auto text-nowrap">
                                      {new Date(r.submittedAt).toLocaleDateString(
                                        undefined,
                                        { day: "numeric", month: "short", year: "numeric" },
                                      )}
                                    </span>
                                  )}
                                </div>
                              </CCardBody>
                            </CCard>
                          </CCol>
                        ))}
                      </CRow>
                    )}
                  </CTabPane>
                </CTabContent>
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {rateBarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            zIndex: 1040,
            background: "rgba(15, 23, 42, 0.42)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
          onClick={closeRateBar}
          role="button"
          tabIndex={-1}
          aria-label="Close"
        />
      )}

      {rateBarOpen && (
        <div
          className={
            isPhoneView
              ? "position-fixed bottom-0 start-0 end-0 d-flex flex-column bg-body"
              : "position-fixed top-0 end-0 d-flex flex-column border-start border-2 bg-body shadow-lg h-100"
          }
          style={
            isPhoneView
              ? {
                  zIndex: 1050,
                  maxHeight: "min(90vh, 100%)",
                  borderTopLeftRadius: "1rem",
                  borderTopRightRadius: "1rem",
                  boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.2)",
                  borderTop: "1px solid var(--cui-border-color-translucent, rgba(0,0,0,0.08))",
                }
              : { zIndex: 1050, width: "min(28rem, 100%)" }
          }
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Add rates"
        >
          {isPhoneView ? (
            <div
              className="d-flex justify-content-center pt-2 pb-1 flex-shrink-0"
              aria-hidden
            >
              <span
                className="rounded-pill"
                style={{
                  width: "2.25rem",
                  height: "0.28rem",
                  background: "var(--cui-secondary-color, #adb5bd)",
                  opacity: 0.45,
                }}
              />
            </div>
          ) : null}
          <div
            className={`d-flex align-items-center justify-content-between gap-2 border-bottom flex-shrink-0 ${
              isPhoneView ? "px-3 pt-1 pb-3" : "px-3 py-2"
            }`}
          >
            <div style={{ minWidth: 0 }}>
              <h2
                className={`mb-0 ${isPhoneView ? "fs-5 fw-semibold" : "h6"}`}
                style={
                  isPhoneView ? { letterSpacing: "-0.02em" } : undefined
                }
              >
                Add rate
              </h2>
              {item?.productName && (
                <div
                  className="text-body-secondary text-truncate"
                  style={{ fontSize: "0.78rem" }}
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
              onClick={closeRateBar}
              disabled={saving}
              className="rounded-pill flex-shrink-0"
              aria-label="Close"
            >
              <CIcon icon={cilX} size="lg" />
            </CButton>
          </div>

          <div
            className={`border-bottom flex-shrink-0 ${
              isPhoneView ? "px-3 py-3" : "px-3 py-2"
            }`}
          >
            <CFormLabel className="mb-1" htmlFor="pro-bucket-supplier-search">
              Search suppliers
            </CFormLabel>
            <CFormInput
              id="pro-bucket-supplier-search"
              placeholder="Name, shop, phone, email, GST…"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              className="mb-0"
            />
            {supplierSearch.trim() && (
              <p className="text-body-secondary small mt-1 mb-0">
                {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}{" "}
                match this search (up to 100). Clear the field to load the full
                list.
              </p>
            )}
          </div>

          <div
            className={`flex-grow-1 overflow-auto px-3 ${
              isPhoneView ? "py-3" : "py-2"
            }`}
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {rateRows.map((row, idx) => {
              const options = supplierOptionsForRow(row);
              return (
                <div
                  key={idx}
                  className="mb-3 rounded border"
                  style={{
                    background: "var(--cui-tertiary-bg, #f8f9fa)",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
                    style={{ background: "var(--cui-secondary-bg, #e9ecef)", borderRadius: "calc(0.375rem - 1px) calc(0.375rem - 1px) 0 0" }}
                  >
                    <span
                      className="fw-semibold small text-body-secondary"
                      style={{ textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}
                    >
                      Rate entry {rateRows.length > 1 ? idx + 1 : ""}
                    </span>
                    {rateRows.length > 1 && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="p-1"
                        style={{ lineHeight: 1 }}
                        onClick={() => removeRateRow(idx)}
                        aria-label="Remove this entry"
                      >
                        <CIcon icon={cilTrash} size="sm" />
                      </CButton>
                    )}
                  </div>
                  <div className="p-3">
                    <CRow className="g-3">
                      <CCol xs={12}>
                        <CFormLabel className="mb-1">
                          Supplier{" "}
                          <span className="text-body-secondary fw-normal" style={{ fontSize: "0.8em" }}>(optional)</span>
                        </CFormLabel>
                        <CFormSelect
                          value={row.supplierId}
                          onChange={(e) =>
                            updateRateRow(idx, "supplierId", e.target.value)
                          }
                        >
                          <option value="">
                            {options.length
                              ? "— No supplier —"
                              : "No matches — change search"}
                          </option>
                          {options.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                              {s.shopname ? ` — ${s.shopname}` : ""}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol xs={6}>
                        <CFormLabel className="mb-1">
                          Rate <span className="text-danger">*</span>
                        </CFormLabel>
                        <CFormInput
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="0.00"
                          value={row.rate}
                          onChange={(e) =>
                            updateRateRow(
                              idx,
                              "rate",
                              sanitizeRateInput(e.target.value),
                            )
                          }
                        />
                      </CCol>
                      <CCol xs={6}>
                        <CFormLabel className="mb-1">Unit</CFormLabel>
                        <ProductUnitSelect
                          value={row.unit}
                          onChange={(e) =>
                            updateRateRow(idx, "unit", e.target.value)
                          }
                        />
                      </CCol>
                      <CCol xs={12}>
                        <CFormLabel className="mb-1">Remark</CFormLabel>
                        <CFormInput
                          placeholder="Optional note…"
                          value={row.remark}
                          onChange={(e) =>
                            updateRateRow(idx, "remark", e.target.value)
                          }
                        />
                      </CCol>
                    </CRow>
                  </div>
                </div>
              );
            })}
            <CButton
              type="button"
              color="primary"
              variant="outline"
              size="sm"
              onClick={addRateRow}
              className="mb-1"
            >
              <CIcon icon={cilPlus} className="me-1" size="sm" />
              Add another entry
            </CButton>
          </div>

          <div
            className={`d-flex gap-2 px-3 border-top flex-shrink-0 ${
              isPhoneView
                ? "py-3 bg-body flex-column"
                : "py-2 bg-body-secondary justify-content-end flex-wrap"
            }`}
            style={{
              paddingBottom: isPhoneView
                ? "max(0.75rem, env(safe-area-inset-bottom, 0px))"
                : undefined,
              boxShadow: isPhoneView ? "0 -4px 20px rgba(0,0,0,0.06)" : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <CButton
              type="button"
              color="primary"
              onClick={submitRates}
              disabled={saving}
              className={isPhoneView ? "w-100" : undefined}
            >
              {saving ? "Saving…" : "Save rates"}
            </CButton>
            <CButton
              type="button"
              color="secondary"
              variant={isPhoneView ? "outline" : "ghost"}
              onClick={closeRateBar}
              disabled={saving}
              className={isPhoneView ? "w-100" : undefined}
            >
              Cancel
            </CButton>
          </div>
        </div>
      )}
    </CRow>
  );
};

export default ProBucketDetail;
