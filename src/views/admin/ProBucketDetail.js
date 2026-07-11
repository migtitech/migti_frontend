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
  CFormTextarea,
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
import { cilArrowLeft, cilPlus, cilTrash, cilUser, cilX } from "@coreui/icons";
import proBucketService from "../../services/proBucketService";
import supplierService from "../../services/supplierService";
import localProcurementService from "../../services/localProcurementService";
import areaService from "../../services/areaService";
import usePermissions from "../../hooks/usePermissions";
import { EyeIcon, Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter } from "../../utils/dateFormatter";
import {
  computeProBucketFinalAmount,
  formatProBucketRateAmount,
  resolveProBucketEffectiveRate,
} from "../../utils/proBucketRate";

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

const TAB_ITEM = 0;
const TAB_SUPPLIERS = 1;
const TAB_RATES = 2;

const refId = (refVal) => {
  if (refVal == null || refVal === "") return null;
  if (typeof refVal === "object") {
    const id = refVal._id ?? refVal.id;
    return id ? String(id) : null;
  }
  return String(refVal);
};

const fetchAllSuppliersByCategory = async (categoryId) => {
  const all = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const res = await supplierService.getAll({
      pageNumber: page,
      pageSize: 100,
      category: categoryId,
    });
    const block = res?.data;
    const list = Array.isArray(block?.suppliers) ? block.suppliers : [];
    all.push(...list);
    hasNext = block?.pagination?.hasNextPage === true;
    page += 1;
    if (page > 50) break;
  }
  return all;
};

const CategorySuppliersTable = ({
  suppliers,
  loading,
  categoryName,
  navigate,
}) => {
  if (loading) {
    return <Loader message="Loading category suppliers…" />;
  }
  if (!suppliers.length) {
    return (
      <p className="text-body-secondary mb-0">
        No suppliers are linked to
        {categoryName ? ` "${categoryName}"` : " this category"}.
      </p>
    );
  }
  return (
    <div className="table-responsive">
      <CTable hover responsive bordered className="mb-0 align-middle">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>#</CTableHeaderCell>
            <CTableHeaderCell>Name</CTableHeaderCell>
            <CTableHeaderCell>Shop</CTableHeaderCell>
            <CTableHeaderCell>Phone 1</CTableHeaderCell>
            <CTableHeaderCell>Phone 2</CTableHeaderCell>
            <CTableHeaderCell>Email</CTableHeaderCell>
            <CTableHeaderCell>Other contact</CTableHeaderCell>
            <CTableHeaderCell>Label</CTableHeaderCell>
            <CTableHeaderCell>Location</CTableHeaderCell>
            <CTableHeaderCell>GST</CTableHeaderCell>
            <CTableHeaderCell>Address</CTableHeaderCell>
            <CTableHeaderCell>Remark</CTableHeaderCell>
            <CTableHeaderCell>View</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {suppliers.map((s, index) => (
            <CTableRow
              key={s._id}
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/suppliers/${s._id}`)}
            >
              <CTableDataCell>{index + 1}</CTableDataCell>
              <CTableDataCell>
                <strong>{dash(s.name)}</strong>
              </CTableDataCell>
              <CTableDataCell>{dash(s.shopname)}</CTableDataCell>
              <CTableDataCell>{dash(s.phone_1)}</CTableDataCell>
              <CTableDataCell>{dash(s.phone_2)}</CTableDataCell>
              <CTableDataCell>{dash(s.email)}</CTableDataCell>
              <CTableDataCell>{dash(s.other_contact)}</CTableDataCell>
              <CTableDataCell>{dash(s.label)}</CTableDataCell>
              <CTableDataCell>{dash(s.shop_location)}</CTableDataCell>
              <CTableDataCell>{dash(s.gst)}</CTableDataCell>
              <CTableDataCell
                className="text-break"
                style={{ maxWidth: "14rem" }}
              >
                {dash(s.address)}
              </CTableDataCell>
              <CTableDataCell
                className="text-break"
                style={{ maxWidth: "12rem" }}
              >
                {dash(s.remark)}
              </CTableDataCell>
              <CTableDataCell onClick={(e) => e.stopPropagation()}>
                <CButton
                  color="info"
                  variant="ghost"
                  size="sm"
                  title="View supplier"
                  onClick={() => navigate(`/suppliers/${s._id}`)}
                >
                  <EyeIcon />
                </CButton>
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    </div>
  );
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
  gstPercentage: "",
  discountPercentage: "",
  remark: "",
});

const formatProcurementZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const unwrapPayload = (res) => res?.data?.data ?? res?.data;

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
  const canAssignLocalPro = canUpdate("pro_bucket");
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
  const [categorySuppliers, setCategorySuppliers] = useState([]);
  const [categorySuppliersLoading, setCategorySuppliersLoading] =
    useState(false);
  const [localProBarOpen, setLocalProBarOpen] = useState(false);
  const [localProEmployees, setLocalProEmployees] = useState([]);
  const [localProEmployeesLoading, setLocalProEmployeesLoading] =
    useState(false);
  const [selectedLocalProEmployee, setSelectedLocalProEmployee] = useState("");
  const [selectedLocalProZone, setSelectedLocalProZone] = useState("");
  const [localProAssignRemark, setLocalProAssignRemark] = useState("");
  const [marketZones, setMarketZones] = useState([]);
  const [marketZonesLoading, setMarketZonesLoading] = useState(false);
  const [assigningLocalPro, setAssigningLocalPro] = useState(false);

  const productCategoryId = useMemo(
    () => refId(item?.categoryId),
    [item?.categoryId],
  );
  const productCategoryName = useMemo(
    () => <RefName refVal={item?.categoryId} />,
    [item?.categoryId],
  );

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

  useEffect(() => {
    if (!productCategoryId) {
      setCategorySuppliers([]);
      setCategorySuppliersLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setCategorySuppliersLoading(true);
      try {
        const list = await fetchAllSuppliersByCategory(productCategoryId);
        if (!cancelled) setCategorySuppliers(list);
      } catch (e) {
        if (!cancelled) {
          toastError(e?.message || "Failed to load category suppliers");
          setCategorySuppliers([]);
        }
      } finally {
        if (!cancelled) setCategorySuppliersLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [productCategoryId]);

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

  useEffect(() => {
    if (!localProBarOpen) return;
    let cancelled = false;
    const run = async () => {
      setLocalProEmployeesLoading(true);
      setMarketZonesLoading(true);
      try {
        const [employeesRes, zonesRes] = await Promise.all([
          localProcurementService.listEmployees(),
          areaService.getAll({
            pageNumber: 1,
            pageSize: 100,
            areaType: "market",
          }),
        ]);
        if (cancelled) return;

        const employeeList = Array.isArray(employeesRes?.data)
          ? employeesRes.data
          : [];
        setLocalProEmployees(employeeList);

        const zonesPayload = unwrapPayload(zonesRes);
        const zoneRows = zonesPayload?.areas || [];
        setMarketZones(
          (zoneRows || []).map((zone) => ({
            ...zone,
            id: zone._id || zone.id,
          })),
        );
      } catch (e) {
        if (!cancelled) {
          toastError(e?.message || "Failed to load assign local pro form");
          setLocalProEmployees([]);
          setMarketZones([]);
        }
      } finally {
        if (!cancelled) {
          setLocalProEmployeesLoading(false);
          setMarketZonesLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [localProBarOpen]);

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

  const closeLocalProBar = () => {
    if (assigningLocalPro) return;
    setLocalProBarOpen(false);
    setSelectedLocalProEmployee("");
    setSelectedLocalProZone("");
    setLocalProAssignRemark("");
  };

  const submitLocalProAssignment = async () => {
    if (!selectedLocalProEmployee) {
      toastError("Select a local procurement employee.");
      return;
    }
    setAssigningLocalPro(true);
    try {
      await localProcurementService.assign({
        queryProductId: id,
        employeeId: selectedLocalProEmployee,
        zoneId: selectedLocalProZone,
        remark: localProAssignRemark,
      });
      toastSuccess("Assigned to local procurement");
      closeLocalProBar();
    } catch (e) {
      toastError(e?.message || "Failed to assign local procurement");
    } finally {
      setAssigningLocalPro(false);
    }
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
        const gstPercentage =
          r.gstPercentage === "" || r.gstPercentage == null
            ? 0
            : Number(r.gstPercentage);
        const discountPercentage =
          r.discountPercentage === "" || r.discountPercentage == null
            ? 0
            : Number(r.discountPercentage);
        return {
          supplierId: r.supplierId,
          rate: Number(r.rate),
          unit: r.unit || "",
          gstPercentage,
          discountPercentage,
          remark: r.remark || "",
        };
      });
    if (!valid.length) {
      toastError("Add at least one line with a rate amount.");
      return;
    }
    for (const r of valid) {
      if (!r.supplierId) {
        toastError("Select a supplier for each rate entry.");
        return;
      }
      if (Number.isNaN(r.rate) || r.rate < 0) {
        toastError("Each rate must be a valid number ≥ 0.");
        return;
      }
      if (
        Number.isNaN(r.gstPercentage) ||
        r.gstPercentage < 0 ||
        r.gstPercentage > 100
      ) {
        toastError("GST % must be between 0 and 100.");
        return;
      }
      if (
        Number.isNaN(r.discountPercentage) ||
        r.discountPercentage < 0 ||
        r.discountPercentage > 100
      ) {
        toastError("Discount % must be between 0 and 100.");
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
            <CBreadcrumb
              className="mb-0 flex-shrink-1"
              style={{ minWidth: 0, overflow: "hidden" }}
            >
              <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
              <CBreadcrumbItem href="#/pro-bucket">Pro Bucket</CBreadcrumbItem>
              <CBreadcrumbItem
                active
                className="text-truncate d-inline-block"
                style={{ maxWidth: "10rem" }}
              >
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
                {canAssignLocalPro && (
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    className="ms-auto"
                    onClick={() => {
                      setSelectedLocalProEmployee("");
                      setSelectedLocalProZone("");
                      setLocalProAssignRemark("");
                      setLocalProBarOpen(true);
                    }}
                  >
                    <CIcon icon={cilUser} className="me-1" size="sm" />
                    Assign Local Pro
                  </CButton>
                )}
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
                          active={activeTab === TAB_ITEM}
                          onClick={() => setActiveTab(TAB_ITEM)}
                          style={{ cursor: "pointer" }}
                        >
                          Item info
                        </CNavLink>
                      </CNavItem>
                      <CNavItem className="flex-shrink-0">
                        <CNavLink
                          active={activeTab === TAB_SUPPLIERS}
                          onClick={() => setActiveTab(TAB_SUPPLIERS)}
                          style={{ cursor: "pointer" }}
                          className="d-flex align-items-center gap-2"
                        >
                          Suppliers
                          {productCategoryId &&
                            categorySuppliers.length > 0 && (
                              <CBadge
                                color={
                                  activeTab === TAB_SUPPLIERS
                                    ? "primary"
                                    : "secondary"
                                }
                                shape="rounded-pill"
                                style={{ fontSize: "0.65rem" }}
                              >
                                {categorySuppliers.length}
                              </CBadge>
                            )}
                        </CNavLink>
                      </CNavItem>
                      <CNavItem className="flex-shrink-0">
                        <CNavLink
                          active={activeTab === TAB_RATES}
                          onClick={() => setActiveTab(TAB_RATES)}
                          style={{ cursor: "pointer" }}
                          className="d-flex align-items-center gap-2"
                        >
                          Rates
                          {item?.rates?.length > 0 && (
                            <CBadge
                              color={
                                activeTab === TAB_RATES
                                  ? "primary"
                                  : "secondary"
                              }
                              shape="rounded-pill"
                              style={{ fontSize: "0.65rem" }}
                            >
                              {item.rates.length}
                            </CBadge>
                          )}
                        </CNavLink>
                      </CNavItem>
                    </CNav>
                    {isPhoneView && canAddRate && activeTab === TAB_RATES ? (
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
                  <CTabPane role="tabpanel" visible={activeTab === TAB_ITEM}>
                    <ItemInfoSections item={item} />
                  </CTabPane>
                  <CTabPane
                    role="tabpanel"
                    visible={activeTab === TAB_SUPPLIERS}
                  >
                    {!productCategoryId ? (
                      <p className="text-body-secondary mb-0">
                        No category is assigned to this product, so suppliers
                        cannot be listed by category.
                      </p>
                    ) : (
                      <>
                        <p className="text-body-secondary small mb-3">
                          Suppliers linked to category{" "}
                          <strong>{productCategoryName}</strong> (matched via
                          supplier <code>categories</code>).
                        </p>
                        <CategorySuppliersTable
                          suppliers={categorySuppliers}
                          loading={categorySuppliersLoading}
                          categoryName={
                            typeof item?.categoryId === "object" &&
                            item.categoryId?.name
                              ? String(item.categoryId.name)
                              : ""
                          }
                          navigate={navigate}
                        />
                      </>
                    )}
                  </CTabPane>
                  <CTabPane role="tabpanel" visible={activeTab === TAB_RATES}>
                    {canAddRate && !isPhoneView && item.rates?.length > 0 && (
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
                            Tap <strong>Add rate</strong> above to submit a
                            rate.
                          </p>
                        )}
                      </div>
                    )}

                    {item.rates?.length > 0 && (
                      <CRow>
                        {(item.rates || []).map((r) => {
                          const finalAmount = resolveProBucketEffectiveRate(r);
                          return (
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
                                          "Supplier"}
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
                                      ₹ {formatProBucketRateAmount(finalAmount)}
                                    </div>
                                  </div>
                                  <div className="d-flex flex-wrap gap-3 small text-body-secondary border-top pt-2 mt-1">
                                    <span>
                                      <span className="me-1">Base rate:</span>
                                      <span className="text-body">
                                        ₹ {formatProBucketRateAmount(r.rate)}
                                      </span>
                                    </span>
                                    <span>
                                      <span className="me-1">GST %:</span>
                                      <span className="text-body">
                                        {r.gstPercentage != null
                                          ? r.gstPercentage
                                          : 0}
                                      </span>
                                    </span>
                                    <span>
                                      <span className="me-1">Discount %:</span>
                                      <span className="text-body">
                                        {r.discountPercentage != null
                                          ? r.discountPercentage
                                          : 0}
                                      </span>
                                    </span>
                                    <span>
                                      <span className="me-1">Unit:</span>
                                      <span className="text-body">
                                        {r.unit || "—"}
                                      </span>
                                    </span>
                                    {r.remark && (
                                      <span>
                                        <span className="me-1">Remark:</span>
                                        <span className="text-body">
                                          {r.remark}
                                        </span>
                                      </span>
                                    )}
                                    {r.submittedAt && (
                                      <span className="ms-auto text-nowrap">
                                        {dateFormatter(r.submittedAt, "—")}
                                      </span>
                                    )}
                                  </div>
                                </CCardBody>
                              </CCard>
                            </CCol>
                          );
                        })}
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
                  borderTop:
                    "1px solid var(--cui-border-color-translucent, rgba(0,0,0,0.08))",
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
                style={isPhoneView ? { letterSpacing: "-0.02em" } : undefined}
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
              const gstValue =
                row.gstPercentage === "" || row.gstPercentage == null
                  ? 0
                  : Number(row.gstPercentage);
              const discountValue =
                row.discountPercentage === "" || row.discountPercentage == null
                  ? 0
                  : Number(row.discountPercentage);
              const finalAmountPreview =
                row.rate !== "" &&
                row.rate != null &&
                !Number.isNaN(Number(row.rate))
                  ? computeProBucketFinalAmount(
                      row.rate,
                      gstValue,
                      discountValue,
                    )
                  : null;
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
                    style={{
                      background: "var(--cui-secondary-bg, #e9ecef)",
                      borderRadius:
                        "calc(0.375rem - 1px) calc(0.375rem - 1px) 0 0",
                    }}
                  >
                    <span
                      className="fw-semibold small text-body-secondary"
                      style={{
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: "0.05em",
                      }}
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
                          Supplier <span className="text-danger">*</span>
                        </CFormLabel>
                        <CFormSelect
                          value={row.supplierId}
                          onChange={(e) =>
                            updateRateRow(idx, "supplierId", e.target.value)
                          }
                        >
                          <option value="">
                            {options.length
                              ? "— Select supplier —"
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
                      <CCol xs={6}>
                        <CFormLabel className="mb-1">GST %</CFormLabel>
                        <CFormInput
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="0"
                          value={row.gstPercentage}
                          onChange={(e) =>
                            updateRateRow(
                              idx,
                              "gstPercentage",
                              sanitizeRateInput(e.target.value),
                            )
                          }
                        />
                      </CCol>
                      <CCol xs={6}>
                        <CFormLabel className="mb-1">Discount %</CFormLabel>
                        <CFormInput
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          spellCheck={false}
                          placeholder="0"
                          value={row.discountPercentage}
                          onChange={(e) =>
                            updateRateRow(
                              idx,
                              "discountPercentage",
                              sanitizeRateInput(e.target.value),
                            )
                          }
                        />
                      </CCol>
                      <CCol xs={6}>
                        <CFormLabel className="mb-1">Final amount</CFormLabel>
                        <CFormInput
                          type="text"
                          readOnly
                          tabIndex={-1}
                          value={
                            finalAmountPreview != null
                              ? formatProBucketRateAmount(finalAmountPreview)
                              : ""
                          }
                          placeholder="—"
                          className="bg-body-secondary"
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
              boxShadow: isPhoneView
                ? "0 -4px 20px rgba(0,0,0,0.06)"
                : undefined,
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

      {localProBarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            zIndex: 1040,
            background: "rgba(15, 23, 42, 0.42)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
          onClick={closeLocalProBar}
          role="button"
          tabIndex={-1}
          aria-label="Close"
        />
      )}

      {localProBarOpen && (
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
                  borderTop:
                    "1px solid var(--cui-border-color-translucent, rgba(0,0,0,0.08))",
                }
              : { zIndex: 1050, width: "min(24rem, 100%)" }
          }
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Assign local procurement"
        >
          <div className="d-flex align-items-center justify-content-between gap-2 border-bottom px-3 py-2 flex-shrink-0">
            <div style={{ minWidth: 0 }}>
              <h2 className="h6 mb-0">Assign Local Pro</h2>
              {item?.productName && (
                <div
                  className="text-body-secondary text-truncate small"
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
              onClick={closeLocalProBar}
              disabled={assigningLocalPro}
              aria-label="Close"
            >
              <CIcon icon={cilX} size="lg" />
            </CButton>
          </div>

          <div className="flex-grow-1 overflow-auto px-3 py-3">
            {localProEmployeesLoading || marketZonesLoading ? (
              <Loader message="Loading form…" />
            ) : localProEmployees.length === 0 ? (
              <p className="text-body-secondary mb-0">
                No employees with the local procurement role were found.
              </p>
            ) : (
              <>
                <CFormLabel htmlFor="local-pro-employee">
                  Local procurement employee
                </CFormLabel>
                <CFormSelect
                  id="local-pro-employee"
                  value={selectedLocalProEmployee}
                  onChange={(e) => setSelectedLocalProEmployee(e.target.value)}
                  className="mb-3"
                >
                  <option value="">— Select employee —</option>
                  {localProEmployees.map((emp) => {
                    const empId = emp.employeeId || emp._id;
                    const label = emp.email || emp.companyEmail || "—";
                    return (
                      <option key={empId} value={String(empId)}>
                        {label}
                      </option>
                    );
                  })}
                </CFormSelect>

                <CFormLabel htmlFor="local-pro-zone">
                  Zone (optional)
                </CFormLabel>
                <CFormSelect
                  id="local-pro-zone"
                  value={selectedLocalProZone}
                  onChange={(e) => setSelectedLocalProZone(e.target.value)}
                  className="mb-3"
                >
                  <option value="">— Select zone —</option>
                  {marketZones.map((zone) => (
                    <option key={zone.id} value={String(zone.id)}>
                      {formatProcurementZone(zone)}
                    </option>
                  ))}
                </CFormSelect>

                <CFormLabel htmlFor="local-pro-remark" className="mt-2">
                  Remark
                </CFormLabel>
                <CFormTextarea
                  id="local-pro-remark"
                  rows={3}
                  placeholder="Optional note for the assignee…"
                  value={localProAssignRemark}
                  onChange={(e) => setLocalProAssignRemark(e.target.value)}
                />
              </>
            )}
          </div>

          <div className="d-flex gap-2 px-3 py-2 border-top flex-shrink-0 justify-content-end">
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              onClick={closeLocalProBar}
              disabled={assigningLocalPro}
            >
              Cancel
            </CButton>
            <CButton
              type="button"
              color="primary"
              onClick={submitLocalProAssignment}
              disabled={
                assigningLocalPro ||
                localProEmployeesLoading ||
                marketZonesLoading ||
                !selectedLocalProEmployee
              }
            >
              {assigningLocalPro ? "Assigning…" : "Assign"}
            </CButton>
          </div>
        </div>
      )}
    </CRow>
  );
};

export default ProBucketDetail;
