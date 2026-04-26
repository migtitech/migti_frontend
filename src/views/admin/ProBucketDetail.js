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
import { getAssetsUrl } from "../../api/endpoints";

/** Below Bootstrap `md` (768px) — treat as phone for add-rate panel layout */
const useIsPhoneView = () => {
  const query = "(max-width: 767.98px)";
  const [isPhone, setIsPhone] = useState(
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
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
  if (typeof path === "string" && (path.startsWith("http://") || path.startsWith("https://")))
    return path;
  return getAssetsUrl(path);
};

const RefName = ({ refVal }) => {
  if (refVal == null || refVal === "") return "—";
  if (typeof refVal === "object") {
    if (refVal.name != null && String(refVal.name).trim() !== "") return String(refVal.name);
    if (refVal.productName != null && String(refVal.productName).trim() !== "")
      return String(refVal.productName);
    return "—";
  }
  return String(refVal);
};

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <div className="text-body-secondary small text-uppercase" style={{ fontSize: "0.7rem" }}>
      {label}
    </div>
    <div className="text-break">{children != null && children !== "" ? children : "—"}</div>
  </div>
);

const ItemInfoSections = ({ item }) => {
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const imageList = Array.isArray(item.images) ? item.images : [];

  return (
    <div className="pro-bucket-item-info">
      <CCard className="mb-3 border-0 bg-light">
        <CCardBody>
          <h4 className="h5 mb-1">{dash(item.productName) || "Product line"}</h4>
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
                <div className="text-body-secondary small text-uppercase mb-1" style={{ fontSize: "0.7rem" }}>
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
            <CCol md={4}>
              <Field label="Linked catalog product">
                <RefName refVal={item.product_id} />
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
                    <a href={src} target="_blank" rel="noreferrer" className="d-block">
                      <img
                        src={src}
                        alt={img.name || "Product"}
                        className="img-fluid rounded border w-100"
                        style={{ maxHeight: 180, objectFit: "contain" }}
                      />
                    </a>
                    {img.name && (
                      <div className="small text-body-secondary text-truncate mt-1" title={img.name}>
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

  const loadSuppliers = useCallback(async (search, saveAsCache) => {
    try {
      const q = search && String(search).trim() ? String(search).trim() : undefined;
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
          <CCardBody className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
            <CBreadcrumb className="mb-0">
              <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
              <CBreadcrumbItem href="#/pro-bucket">Pro Bucket</CBreadcrumbItem>
              <CBreadcrumbItem active>Item</CBreadcrumbItem>
            </CBreadcrumb>
            <CButton
              color="secondary"
              variant="ghost"
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
                <CNav variant="tabs" className="mb-3" role="tablist">
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 0}
                      onClick={() => setActiveTab(0)}
                      style={{ cursor: "pointer" }}
                    >
                      Item info
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 1}
                      onClick={() => setActiveTab(1)}
                      style={{ cursor: "pointer" }}
                    >
                      Rate
                    </CNavLink>
                  </CNavItem>
                </CNav>
                <CTabContent>
                  <CTabPane role="tabpanel" visible={activeTab === 0}>
                    <ItemInfoSections item={item} />
                  </CTabPane>
                  <CTabPane role="tabpanel" visible={activeTab === 1}>
                    {canAddRate && (
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
                    <CRow>
                      {(!item.rates || !item.rates.length) && (
                        <CCol xs={12}>
                          <p className="text-body-secondary">No rates submitted yet.</p>
                        </CCol>
                      )}
                      {(item.rates || []).map((r) => (
                        <CCol key={r._id || `${r.submittedAt}-${r.rate}`} md={6} className="mb-3">
                          <CCard>
                            <CCardHeader className="py-2 d-flex justify-content-between">
                              <span className="text-truncate">
                                {r.supplier?.name ||
                                  r.supplier?.shopname ||
                                  (r.supplier ? "Supplier" : "No supplier")}
                              </span>
                              <CBadge color="dark">₹ {r.rate}</CBadge>
                            </CCardHeader>
                            <CCardBody className="py-2 small">
                              <div>Unit: {r.unit || "—"}</div>
                              {r.remark && <div>Remark: {r.remark}</div>}
                              {r.supplier?.phone_1 && (
                                <div className="text-body-secondary">Phone: {r.supplier.phone_1}</div>
                              )}
                              {r.submittedAt && (
                                <div className="text-body-secondary mt-1">
                                  {new Date(r.submittedAt).toLocaleString()}
                                </div>
                              )}
                            </CCardBody>
                          </CCard>
                        </CCol>
                      ))}
                    </CRow>
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
          style={{ zIndex: 1040, background: "rgba(0,0,0,0.45)" }}
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
              ? "position-fixed bottom-0 start-0 end-0 d-flex flex-column border-top border-2 bg-body shadow-lg"
              : "position-fixed top-0 end-0 d-flex flex-column border-start border-2 bg-body shadow-lg h-100"
          }
          style={
            isPhoneView
              ? { zIndex: 1050, maxHeight: "min(85vh, 100%)" }
              : { zIndex: 1050, width: "min(28rem, 100%)" }
          }
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Add rates"
        >
          <div className="d-flex align-items-center justify-content-between gap-2 px-3 py-2 border-bottom flex-shrink-0">
            <div>
              <h2 className="h6 mb-0">Add rate(s)</h2>
              <p className="text-body-secondary small mb-0">
                {isPhoneView
                  ? "Add lines with a rate. Supplier is optional. Search narrows the supplier list."
                  : "Rate is required. Supplier, unit, and remark are optional. Use search to filter suppliers."}
              </p>
            </div>
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={closeRateBar}
              disabled={saving}
              className="rounded-pill"
              aria-label="Close"
            >
              <CIcon icon={cilX} size="lg" />
            </CButton>
          </div>

          <div className="px-3 py-2 border-bottom flex-shrink-0">
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
                {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} match this search (up to
                100). Clear the field to load the full list.
              </p>
            )}
          </div>

          <div
            className="flex-grow-1 overflow-auto px-3 py-2"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {rateRows.map((row, idx) => {
              const options = supplierOptionsForRow(row);
              return (
                <CRow className="g-2 align-items-end mb-3" key={idx}>
                  <CCol {...(isPhoneView ? { md: 4, sm: 6 } : { xs: 12 })}>
                    <CFormLabel className="mb-0">Supplier (optional)</CFormLabel>
                    <CFormSelect
                      value={row.supplierId}
                      onChange={(e) => updateRateRow(idx, "supplierId", e.target.value)}
                    >
                      <option value="">{options.length ? "No supplier" : "No matches — change search"}</option>
                      {options.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                          {s.shopname ? ` — ${s.shopname}` : ""}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol {...(isPhoneView ? { md: 2, sm: 3 } : { xs: 6 })}>
                    <CFormLabel className="mb-0">Rate</CFormLabel>
                    <CFormInput
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="0.00"
                      value={row.rate}
                      onChange={(e) =>
                        updateRateRow(idx, "rate", sanitizeRateInput(e.target.value))
                      }
                    />
                  </CCol>
                  <CCol {...(isPhoneView ? { md: 2, sm: 3 } : { xs: 6 })}>
                    <CFormLabel className="mb-0">Unit</CFormLabel>
                    <CFormInput
                      value={row.unit}
                      onChange={(e) => updateRateRow(idx, "unit", e.target.value)}
                    />
                  </CCol>
                  <CCol {...(isPhoneView ? { md: 3, sm: 6 } : { xs: 12 })}>
                    <CFormLabel className="mb-0">Remark</CFormLabel>
                    <CFormInput
                      value={row.remark}
                      onChange={(e) => updateRateRow(idx, "remark", e.target.value)}
                    />
                  </CCol>
                  <CCol
                    {...(isPhoneView ? { md: 1, sm: "auto" } : { xs: 12 })}
                    className="d-flex justify-content-end"
                  >
                    {rateRows.length > 1 && (
                      <CButton
                        color="danger"
                        variant="ghost"
                        className={isPhoneView ? "mt-4" : "mt-0 mb-1"}
                        type="button"
                        onClick={() => removeRateRow(idx)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    )}
                  </CCol>
                </CRow>
              );
            })}
            <CButton
              type="button"
              color="secondary"
              size="sm"
              variant="outline"
              onClick={addRateRow}
              className="mb-1"
            >
              <CIcon icon={cilPlus} className="me-1" size="sm" />
              Add line
            </CButton>
          </div>

          <div
            className="d-flex justify-content-end flex-wrap gap-2 px-3 py-2 border-top bg-body-secondary flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <CButton type="button" color="secondary" variant="ghost" onClick={closeRateBar} disabled={saving}>
              Cancel
            </CButton>
            <CButton type="button" color="primary" onClick={submitRates} disabled={saving}>
              {saving ? "Saving…" : "Save rates"}
            </CButton>
          </div>
        </div>
      )}
    </CRow>
  );
};

export default ProBucketDetail;
