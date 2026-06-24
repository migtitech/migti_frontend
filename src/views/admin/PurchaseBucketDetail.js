import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
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
import {
  cilArrowLeft,
  cilCheckCircle,
  cilPlus,
  cilWarning,
  cilFile,
  cilUser,
  cilX,
} from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBucketService from "../../services/purchaseBucketService";
import localPurchaseService from "../../services/localPurchaseService";
import areaService from "../../services/areaService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader } from "../../components";
import usePermissions from "../../hooks/usePermissions";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const supplierLabel = (s) => {
  if (!s || typeof s !== "object") return "—";
  return s.name || s.shopname || s.shop_location || "—";
};

const supplierExtra = (s) => {
  if (!s || typeof s !== "object") return [];
  const parts = [];
  if (s.phone_1) parts.push(s.phone_1);
  if (s.email) parts.push(s.email);
  if (s.address) parts.push(String(s.address).slice(0, 60));
  return parts;
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "#2563eb", bg: "#eff6ff" },
  pending: { label: "Open", color: "#2563eb", bg: "#eff6ff" },
  hod_approval_pending: {
    label: "HOD Pending",
    color: "#d97706",
    bg: "#fffbeb",
  },
  billing_request_raised: {
    label: "BR Raised",
    color: "#0891b2",
    bg: "#ecfeff",
  },
  payment_request_raised: {
    label: "Payment Requested",
    color: "#0891b2",
    bg: "#ecfeff",
  },
  finance_approved: {
    label: "Finance Approved",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  billing_request_rejected: {
    label: "Rejected",
    color: "#dc2626",
    bg: "#fef2f2",
  },
  purchased: { label: "Purchased", color: "#16a34a", bg: "#f0fdf4" },
  inventory_received: {
    label: "Inventory Received",
    color: "#0369a1",
    bg: "#e0f2fe",
  },
  ready_for_dispatchment: {
    label: "Ready to Dispatch",
    color: "#15803d",
    bg: "#dcfce7",
  },
  delivered: { label: "Delivered", color: "#15803d", bg: "#f0fdf4" },
  po_closed: { label: "Sales Order Closed", color: "#64748b", bg: "#f1f5f9" },
};

const StatusPill = ({ status }) => {
  const raw =
    status != null && String(status).trim() !== ""
      ? String(status).trim()
      : "pending";
  const cfg = STATUS_CONFIG[raw] || {
    label: raw,
    color: "#64748b",
    bg: "#f1f5f9",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}30`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
};

const PRIORITY_CONFIG = {
  high: { label: "High", color: "danger" },
  medium: { label: "Medium", color: "warning" },
  low: { label: "Low", color: "success" },
};

const PriorityBadge = ({ priority }) => {
  const raw =
    priority != null && String(priority).trim() !== ""
      ? String(priority).trim().toLowerCase()
      : "medium";
  const cfg = PRIORITY_CONFIG[raw] || {
    label: raw.charAt(0).toUpperCase() + raw.slice(1),
    color: "secondary",
  };
  return (
    <CBadge color={cfg.color} shape="rounded-pill">
      {cfg.label}
    </CBadge>
  );
};

const DetailRow = ({ label, value, mono, fullWidth }) => (
  <CCol
    xs={12}
    sm={fullWidth ? 12 : 6}
    lg={fullWidth ? 12 : 4}
    className="mb-3"
  >
    <div className="text-body-secondary small mb-1">{label}</div>
    <div
      className={`fw-semibold ${mono ? "font-monospace" : ""}`}
      style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
    >
      {value || "—"}
    </div>
  </CCol>
);

const RefName = ({ refVal }) => {
  if (refVal == null || refVal === "") return "—";
  if (typeof refVal === "object") {
    if (refVal.name != null && String(refVal.name).trim() !== "") {
      return String(refVal.name);
    }
    if (
      refVal.productName != null &&
      String(refVal.productName).trim() !== ""
    ) {
      return String(refVal.productName);
    }
    if (refVal.sku != null && String(refVal.sku).trim() !== "") {
      return String(refVal.sku);
    }
    return "—";
  }
  return String(refVal);
};

const refDisplayName = (refVal) => {
  if (refVal == null || refVal === "") return "—";
  if (typeof refVal === "object") {
    if (refVal.name != null && String(refVal.name).trim() !== "") {
      return String(refVal.name);
    }
    if (
      refVal.productName != null &&
      String(refVal.productName).trim() !== ""
    ) {
      return String(refVal.productName);
    }
    if (refVal.shopname != null && String(refVal.shopname).trim() !== "") {
      return String(refVal.shopname);
    }
    if (refVal.sku != null && String(refVal.sku).trim() !== "") {
      return String(refVal.sku);
    }
    return "—";
  }
  return String(refVal);
};

const hasDisplayValue = (val) =>
  val != null &&
  val !== "" &&
  val !== "—" &&
  !(typeof val === "number" && Number.isNaN(val));

const refHasValue = (refVal) => {
  if (refVal == null || refVal === "") return false;
  if (typeof refVal === "object") {
    return !!(
      (refVal.name != null && String(refVal.name).trim() !== "") ||
      (refVal.productName != null &&
        String(refVal.productName).trim() !== "") ||
      (refVal.sku != null && String(refVal.sku).trim() !== "")
    );
  }
  return true;
};

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

const formatDimensions = (dimensions, unit) => {
  if (!dimensions || typeof dimensions !== "object") return null;
  const length = dimensions.length ?? 0;
  const width = dimensions.width ?? 0;
  const height = dimensions.height ?? 0;
  if (!length && !width && !height) return null;
  const suffix = unit ? ` ${unit}` : "";
  return `${length} × ${width} × ${height}${suffix}`;
};

const formatVariantOptionValues = (optionValues) => {
  if (!Array.isArray(optionValues) || optionValues.length === 0) return "—";
  return optionValues
    .map((row) => {
      const name = row?.variantName || row?.name || "";
      const value = row?.variantValue || row?.value || "";
      if (name && value) return `${name}: ${value}`;
      return name || value || "";
    })
    .filter(Boolean)
    .join(", ");
};

const isImagePath = (att) => {
  if (!att || typeof att !== "object" || !att.path) return false;
  return (
    (att.mimeType && /^image\//i.test(String(att.mimeType))) ||
    /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(att.path))
  );
};

const resolveUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : getAssetsUrl(path);
};

const formatLocalPurchaseEmployee = (emp) =>
  emp?.email?.trim() || emp?.companyEmail?.trim() || "—";

const resolveLocalPurchaseEmployeeId = (row) => {
  const emp = row?.employeeId;
  if (!emp) return "";
  if (typeof emp === "object") {
    return String(emp._id || emp.employeeId || "");
  }
  return String(emp);
};

const resolveLocalPurchaseZoneId = (row) => {
  const zone = row?.zoneId;
  if (!zone) return "";
  if (typeof zone === "object") {
    return String(zone._id || zone.id || "");
  }
  return String(zone);
};

const formatLocalPurchaseZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const getLatestLocalPurchaseAssignment = (rows) =>
  Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

const RAISE_BILLING_BLOCKED_STATUSES = new Set([
  "hod_approval_pending",
  "billing_request_raised",
  "payment_request_raised",
  "finance_approved",
  "purchased",
  "inventory_received",
  "ready_for_dispatchment",
  "delivered",
  "po_closed",
]);

// ─── component ────────────────────────────────────────────────────────────────

const PurchaseBucketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canUpdate } = usePermissions();
  const canRaise = canUpdate("purchase_bucket");
  const canAssignPurchase = canUpdate("purchase_bucket");

  const [activeTab, setActiveTab] = useState("details");
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [markingPurchased, setMarkingPurchased] = useState(false);
  const [assignBarOpen, setAssignBarOpen] = useState(false);
  const [localPurchaseEmployees, setLocalPurchaseEmployees] = useState([]);
  const [localPurchaseEmployeesLoading, setLocalPurchaseEmployeesLoading] =
    useState(false);
  const [marketZones, setMarketZones] = useState([]);
  const [marketZonesLoading, setMarketZonesLoading] = useState(false);
  const [selectedLocalPurchaseEmployee, setSelectedLocalPurchaseEmployee] =
    useState("");
  const [selectedMarketZone, setSelectedMarketZone] = useState("");
  const [assignRemark, setAssignRemark] = useState("");
  const [assignLocationLink, setAssignLocationLink] = useState("");
  const [assigningPurchase, setAssigningPurchase] = useState(false);
  const [localPurchases, setLocalPurchases] = useState([]);
  const [localPurchasesLoading, setLocalPurchasesLoading] = useState(false);

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

  const loadLocalPurchases = useCallback(async () => {
    if (!id) return;
    setLocalPurchasesLoading(true);
    try {
      const res = await localPurchaseService.list({
        poProductId: id,
        pageSize: 20,
      });
      const block = res?.data;
      setLocalPurchases(Array.isArray(block?.data) ? block.data : []);
    } catch {
      setLocalPurchases([]);
    } finally {
      setLocalPurchasesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLocalPurchases();
  }, [loadLocalPurchases]);

  useEffect(() => {
    if (!assignBarOpen) return;
    let cancelled = false;
    const run = async () => {
      setLocalPurchaseEmployeesLoading(true);
      setMarketZonesLoading(true);
      try {
        const [employeesRes, zonesRes] = await Promise.all([
          localPurchaseService.listEmployees(),
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
        setLocalPurchaseEmployees(employeeList);

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
          toastError(e?.message || "Failed to load assign purchase form");
          setLocalPurchaseEmployees([]);
          setMarketZones([]);
        }
      } finally {
        if (!cancelled) {
          setLocalPurchaseEmployeesLoading(false);
          setMarketZonesLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [assignBarOpen]);

  const closeAssignBar = () => {
    if (assigningPurchase) return;
    setAssignBarOpen(false);
  };

  const openAssignBar = () => {
    const latest = getLatestLocalPurchaseAssignment(localPurchases);
    setSelectedLocalPurchaseEmployee(
      latest ? resolveLocalPurchaseEmployeeId(latest) : "",
    );
    setSelectedMarketZone(latest ? resolveLocalPurchaseZoneId(latest) : "");
    setAssignRemark(
      latest
        ? String(latest.remark || latest.assignmentRemark || "").trim()
        : "",
    );
    setAssignLocationLink(
      latest ? String(latest.locationLink || "").trim() : "",
    );
    setAssignBarOpen(true);
  };

  const marketZoneOptions = useMemo(() => {
    const list = [...marketZones];
    const latest = getLatestLocalPurchaseAssignment(localPurchases);
    const assignedZone =
      latest?.zoneId && typeof latest.zoneId === "object"
        ? latest.zoneId
        : null;
    if (!assignedZone?._id) return list;

    const assignedZoneId = String(assignedZone._id);
    if (list.some((zone) => String(zone.id || zone._id) === assignedZoneId)) {
      return list;
    }

    return [
      { ...assignedZone, id: assignedZone._id || assignedZone.id },
      ...list,
    ];
  }, [marketZones, localPurchases]);

  const localPurchaseEmployeeOptions = useMemo(() => {
    const list = [...localPurchaseEmployees];
    const latest = getLatestLocalPurchaseAssignment(localPurchases);
    const assigned =
      latest?.employeeId && typeof latest.employeeId === "object"
        ? latest.employeeId
        : null;
    if (!assigned?._id) return list;

    const assignedId = String(assigned._id);
    if (list.some((emp) => String(emp.employeeId || emp._id) === assignedId)) {
      return list;
    }

    return [{ ...assigned, employeeId: assigned._id }, ...list];
  }, [localPurchaseEmployees, localPurchases]);

  const handleAssignPurchase = async () => {
    if (!id) return;
    if (!selectedLocalPurchaseEmployee) {
      toastError("Select a local purchase employee.");
      return;
    }
    if (!selectedMarketZone) {
      toastError("Select a zone.");
      return;
    }
    setAssigningPurchase(true);
    try {
      await localPurchaseService.assign({
        poProductId: id,
        employeeId: selectedLocalPurchaseEmployee,
        zoneId: selectedMarketZone,
        remark: assignRemark,
        locationLink: assignLocationLink,
      });
      toastSuccess("Assigned to local purchase");
      setAssignBarOpen(false);
      await loadLocalPurchases();
    } catch (e) {
      toastError(e?.message || "Failed to assign local purchase");
    } finally {
      setAssigningPurchase(false);
    }
  };

  const markAsPurchased = async () => {
    if (!id) return;
    setMarkingPurchased(true);
    try {
      await purchaseBucketService.markLinePurchased(id);
      toastSuccess("Marked as purchased");
      await load();
    } catch (e) {
      toastError(e?.message || "Request failed");
    } finally {
      setMarkingPurchased(false);
    }
  };

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <Loader />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    );
  }

  if (!item) {
    return (
      <CRow>
        <CCol xs={12}>
          <p className="text-body-secondary">
            Item not found or you do not have access.
          </p>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate("/purchase-bucket")}
          >
            Back
          </CButton>
        </CCol>
      </CRow>
    );
  }

  const lineStatus =
    item?.status != null && String(item.status).trim() !== ""
      ? String(item.status).trim()
      : "pending";
  const showRaiseBillingRequest =
    canRaise && !RAISE_BILLING_BLOCKED_STATUSES.has(lineStatus);
  const ratesToShow = item.queryLineRates?.length
    ? item.queryLineRates
    : Array.isArray(item.queryRate)
      ? item.queryRate
      : [];

  const queryProduct =
    item.queryProductMatch && typeof item.queryProductMatch === "object"
      ? item.queryProductMatch
      : null;

  const catalogProduct =
    item.productDetail && typeof item.productDetail === "object"
      ? item.productDetail
      : null;

  const displayProductName =
    catalogProduct?.name || queryProduct?.productName || item.productName;
  const displayProductCode =
    catalogProduct?.productCode ||
    catalogProduct?.sku ||
    queryProduct?.rawProductCode ||
    item.rawProductCode;
  const displayQuantity =
    queryProduct?.quantity != null
      ? queryProduct.quantity
      : catalogProduct?.quantity != null
        ? catalogProduct.quantity
        : item.quantity;
  const displayUnit = queryProduct?.unit || catalogProduct?.unit || item.unit;

  // Images — query product only
  const queryImgs = Array.isArray(queryProduct?.images)
    ? queryProduct.images
    : [];
  const queryImagePreviews = queryImgs
    .filter(isImagePath)
    .map((d) => ({ doc: d, url: resolveUrl(d.path) }));
  const queryNonImageDocs = queryImgs.filter((d) => !isImagePath(d) && d.path);
  const hasQueryMedia =
    queryImagePreviews.length > 0 || queryNonImageDocs.length > 0;

  const catalogImgs = Array.isArray(catalogProduct?.images)
    ? catalogProduct.images
    : [];
  const catalogImagePreviews = catalogImgs
    .filter(isImagePath)
    .map((d) => ({ doc: d, url: resolveUrl(d.path) }));
  const catalogNonImageDocs = catalogImgs.filter(
    (d) => !isImagePath(d) && d.path,
  );
  const hasCatalogMedia =
    catalogImagePreviews.length > 0 || catalogNonImageDocs.length > 0;
  const imageStyle = {
    maxHeight: 240,
    maxWidth: "100%",
    width: "auto",
    objectFit: "contain",
    borderRadius: 8,
    border: "1px solid var(--cui-border-color)",
  };

  const br =
    item.purchaseBillingRequestId &&
    typeof item.purchaseBillingRequestId === "object"
      ? item.purchaseBillingRequestId
      : null;

  const queryVariants = Array.isArray(queryProduct?.variants)
    ? queryProduct.variants.filter((v) =>
        hasDisplayValue(v?.variantName ?? v?.name),
      )
    : [];

  const queryProductDetailFields = queryProduct
    ? [
        { label: "Product name", value: queryProduct.productName },
        {
          label: "Product code",
          value: queryProduct.rawProductCode,
          mono: true,
        },
        { label: "Quantity", value: queryProduct.quantity },
        { label: "Unit", value: queryProduct.unit },
        { label: "HSN", value: queryProduct.hsnNumber, mono: true },
        { label: "Model / part #", value: queryProduct.modelNumber },
        {
          label: "GST %",
          value:
            queryProduct.gstPercentage != null
              ? `${queryProduct.gstPercentage}`
              : null,
        },
        { label: "Query code", value: queryProduct.queryCode, mono: true },
        { label: "Line index", value: queryProduct.lineIndex },
        {
          label: "Tracking code",
          value: queryProduct.query_tracking_code,
          mono: true,
        },
        {
          label: "Linked product",
          value: <RefName refVal={queryProduct.product_id} />,
          show: refHasValue(queryProduct.product_id),
        },
        {
          label: "Group",
          value: <RefName refVal={queryProduct.groupId} />,
          show: refHasValue(queryProduct.groupId),
        },
        {
          label: "Category",
          value: <RefName refVal={queryProduct.categoryId} />,
          show: refHasValue(queryProduct.categoryId),
        },
        {
          label: "Sub-category",
          value: <RefName refVal={queryProduct.subcategoryId} />,
          show: refHasValue(queryProduct.subcategoryId),
        },
        {
          label: "Pro bucket status",
          value: queryProduct.proBucketStatus
            ? String(queryProduct.proBucketStatus).replace(/_/g, " ")
            : null,
        },
        {
          label: "HOD approved",
          value:
            queryProduct.hodApproved === true
              ? "Yes"
              : queryProduct.hodApproved === false
                ? "No"
                : null,
        },
        {
          label: "Created",
          value: queryProduct.createdAt
            ? dateTimeFormatter(queryProduct.createdAt, "—")
            : null,
        },
        {
          label: "Updated",
          value: queryProduct.updatedAt
            ? dateTimeFormatter(queryProduct.updatedAt, "—")
            : null,
        },
        {
          label: "Remark",
          value: queryProduct.remark,
          fullWidth: true,
        },
        {
          label: "Description",
          value: queryProduct.description,
          fullWidth: true,
        },
      ].filter(({ value, show }) =>
        show != null ? show : hasDisplayValue(value),
      )
    : [];

  const catalogVariantTypes = Array.isArray(catalogProduct?.variants)
    ? catalogProduct.variants.filter(
        (variant) =>
          hasDisplayValue(variant?.name) ||
          (Array.isArray(variant?.options) && variant.options.length > 0),
      )
    : [];

  const catalogVariantCombinations = Array.isArray(
    catalogProduct?.variantCombinations,
  )
    ? catalogProduct.variantCombinations
    : [];

  const companyProductCodeLines = Array.isArray(
    catalogProduct?.companyProductCodes,
  )
    ? catalogProduct.companyProductCodes
        .map((row) => {
          const industryName = refDisplayName(row?.industry);
          const code = row?.code ? String(row.code).trim() : "";
          if (!code) return null;
          return industryName !== "—" ? `${industryName}: ${code}` : code;
        })
        .filter(Boolean)
    : [];

  const supplierProductCodeLines = Array.isArray(
    catalogProduct?.supplierProductCodes,
  )
    ? catalogProduct.supplierProductCodes
        .map((row) => {
          const supplierName = refDisplayName(row?.supplier);
          const code = row?.code ? String(row.code).trim() : "";
          if (!code) return null;
          return supplierName !== "—" ? `${supplierName}: ${code}` : code;
        })
        .filter(Boolean)
    : [];

  const catalogProductDetailFields = catalogProduct
    ? [
        { label: "Name", value: catalogProduct.name },
        { label: "Unique ID", value: catalogProduct.uniqueId, mono: true },
        {
          label: "Product code",
          value: catalogProduct.productCode,
          mono: true,
        },
        { label: "SKU", value: catalogProduct.sku, mono: true },
        {
          label: "Short description",
          value: catalogProduct.shortDescription,
          fullWidth: true,
        },
        {
          label: "Group",
          value: <RefName refVal={catalogProduct.group} />,
          show: refHasValue(catalogProduct.group),
        },
        {
          label: "Category",
          value: <RefName refVal={catalogProduct.category} />,
          show: refHasValue(catalogProduct.category),
        },
        {
          label: "Sub-category",
          value: <RefName refVal={catalogProduct.subcategory} />,
          show: refHasValue(catalogProduct.subcategory),
        },
        {
          label: "Brand",
          value: <RefName refVal={catalogProduct.brand} />,
          show: refHasValue(catalogProduct.brand),
        },
        { label: "HSN", value: catalogProduct.hsnNumber, mono: true },
        {
          label: "Default model #",
          value: catalogProduct.defaultModelNumber,
        },
        {
          label: "GST %",
          value:
            catalogProduct.gstPercentage != null
              ? `${catalogProduct.gstPercentage}`
              : null,
        },
        { label: "Unit", value: catalogProduct.unit },
        { label: "Stock quantity", value: catalogProduct.quantity },
        { label: "Price", value: formatCurrency(catalogProduct.price) },
        { label: "MRP", value: formatCurrency(catalogProduct.mrp) },
        {
          label: "Cost price",
          value: formatCurrency(catalogProduct.costPrice),
        },
        {
          label: "Weight",
          value:
            catalogProduct.weight != null && catalogProduct.weight !== ""
              ? `${catalogProduct.weight}${catalogProduct.weightUnit ? ` ${catalogProduct.weightUnit}` : ""}`
              : null,
        },
        {
          label: "Dimensions",
          value: formatDimensions(
            catalogProduct.dimensions,
            catalogProduct.dimensionUnit,
          ),
        },
        {
          label: "Status",
          value: catalogProduct.status
            ? String(catalogProduct.status).replace(/_/g, " ")
            : null,
        },
        {
          label: "Has variants",
          value:
            catalogProduct.hasVariants === true
              ? "Yes"
              : catalogProduct.hasVariants === false
                ? "No"
                : null,
        },
        {
          label: "Tags",
          value:
            Array.isArray(catalogProduct.tags) && catalogProduct.tags.length
              ? catalogProduct.tags.join(", ")
              : null,
        },
        {
          label: "Timeline (days)",
          value: catalogProduct.timeline,
        },
        {
          label: "Next timeline date",
          value: catalogProduct.nextTimelineDate
            ? dateFormatter(catalogProduct.nextTimelineDate, "—")
            : null,
        },
        {
          label: "Procurement review",
          value: catalogProduct.procurementReviewStatus
            ? String(catalogProduct.procurementReviewStatus).replace(/_/g, " ")
            : null,
        },
        {
          label: "Company product codes",
          value: companyProductCodeLines.length
            ? companyProductCodeLines.join("; ")
            : null,
          fullWidth: true,
        },
        {
          label: "Supplier product codes",
          value: supplierProductCodeLines.length
            ? supplierProductCodeLines.join("; ")
            : null,
          fullWidth: true,
        },
        {
          label: "Created",
          value: catalogProduct.createdAt
            ? dateTimeFormatter(catalogProduct.createdAt, "—")
            : null,
        },
        {
          label: "Updated",
          value: catalogProduct.updatedAt
            ? dateTimeFormatter(catalogProduct.updatedAt, "—")
            : null,
        },
      ].filter(({ value, show }) =>
        show != null ? show : hasDisplayValue(value),
      )
    : [];

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="d-flex align-items-center justify-content-between gap-2 py-2">
            <CBreadcrumb className="mb-0 flex-shrink-1" style={{ minWidth: 0 }}>
              <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
              <CBreadcrumbItem href="#/purchase-bucket">
                Purchase Bucket
              </CBreadcrumbItem>
              <CBreadcrumbItem active className="text-truncate">
                {displayProductName || "Line item"}
              </CBreadcrumbItem>
            </CBreadcrumb>
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              onClick={() => navigate("/purchase-bucket")}
            >
              <CIcon icon={cilArrowLeft} className="me-1" size="sm" />
              Back
            </CButton>
          </CCardBody>
        </CCard>

        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap align-items-center gap-2">
            <div className="me-auto" style={{ minWidth: 0 }}>
              <strong className="d-block text-truncate">
                {displayProductName || "Line item"}
              </strong>
              {item.poCode && (
                <span className="badge bg-dark font-monospace mt-1">
                  {item.poCode}
                </span>
              )}
            </div>
            <StatusPill status={lineStatus} />
            {item.priority && <PriorityBadge priority={item.priority} />}
            {showRaiseBillingRequest && (
              <CButton
                color="primary"
                size="sm"
                onClick={() =>
                  navigate(
                    `/purchase-bucket/raise-billing-request?poProductId=${id}`,
                  )
                }
              >
                <CIcon icon={cilPlus} className="me-1" />
                Raise Billing Request
              </CButton>
            )}
            {canAssignPurchase && (
              <CButton
                color="primary"
                variant="outline"
                size="sm"
                onClick={openAssignBar}
              >
                <CIcon icon={cilUser} className="me-1" />
                Assign Purchase
              </CButton>
            )}
            {canRaise && lineStatus === "finance_approved" && (
              <CButton
                color="success"
                size="sm"
                disabled={markingPurchased}
                onClick={markAsPurchased}
              >
                {markingPurchased ? (
                  <>
                    <CSpinner size="sm" className="me-1" />
                    Updating…
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCheckCircle} className="me-1" />
                    Mark Purchased
                  </>
                )}
              </CButton>
            )}
          </CCardHeader>

          <CCardBody>
            <CRow className="g-3 mb-4">
              {displayQuantity != null && (
                <CCol xs={6} sm={4} md={3} lg={2}>
                  <div className="text-body-secondary small">Qty</div>
                  <div className="fw-semibold">
                    {displayQuantity}
                    {displayUnit ? ` ${displayUnit}` : ""}
                  </div>
                </CCol>
              )}
              {item.dispatchmentDate && (
                <CCol xs={6} sm={4} md={3} lg={2}>
                  <div className="text-body-secondary small">Dispatch</div>
                  <div className="fw-semibold">
                    {dateFormatter(item.dispatchmentDate, "—")}
                  </div>
                </CCol>
              )}
              {item.targetRate != null && (
                <CCol xs={6} sm={4} md={3} lg={2}>
                  <div className="text-body-secondary small">Target Rate</div>
                  <div className="fw-semibold">
                    ₹{Number(item.targetRate).toLocaleString("en-IN")}
                  </div>
                </CCol>
              )}
              {displayProductCode && (
                <CCol xs={12} sm={8} md={6} lg={4}>
                  <div className="text-body-secondary small">Product code</div>
                  <div className="fw-semibold font-monospace text-primary">
                    {displayProductCode}
                  </div>
                </CCol>
              )}
            </CRow>

            <CNav variant="tabs" className="mb-3" role="tablist">
              <CNavItem>
                <CNavLink
                  active={activeTab === "details"}
                  onClick={() => setActiveTab("details")}
                  style={{ cursor: "pointer" }}
                >
                  Details
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === "rates"}
                  onClick={() => setActiveTab("rates")}
                  style={{ cursor: "pointer" }}
                  className="d-flex align-items-center gap-2"
                >
                  Supplier Rates
                  {ratesToShow.length > 0 && (
                    <CBadge
                      color={activeTab === "rates" ? "primary" : "secondary"}
                      shape="rounded-pill"
                      style={{ fontSize: "0.65rem" }}
                    >
                      {ratesToShow.length}
                    </CBadge>
                  )}
                </CNavLink>
              </CNavItem>
            </CNav>

            <CTabContent>
              <CTabPane role="tabpanel" visible={activeTab === "details"}>
                {item.queryRatesMatchNote === "missing_rawProductCode" && (
                  <div className="alert alert-warning py-2 small mb-3">
                    This Sales Order line has no raw product code — query
                    product details cannot be matched.
                  </div>
                )}
                {item.queryRatesMatchNote === "no_query_product" &&
                  displayProductCode && (
                    <div className="alert alert-warning py-2 small mb-3">
                      No query product found for code{" "}
                      <code>{displayProductCode}</code>.
                    </div>
                  )}

                <CRow className="g-3">
                  {hasQueryMedia && (
                    <CCol xs={12} lg={4}>
                      <CCard className="h-100 mb-0">
                        <CCardHeader className="py-2">
                          <strong className="small text-body-secondary">
                            Query Product Images
                          </strong>
                        </CCardHeader>
                        <CCardBody>
                          {queryImagePreviews.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mb-2">
                              {queryImagePreviews.map(({ doc, url }, i) => (
                                <a
                                  key={
                                    doc._id != null
                                      ? String(doc._id)
                                      : `img-${i}`
                                  }
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={url}
                                    alt={
                                      doc.originalName ||
                                      displayProductName ||
                                      "Product"
                                    }
                                    style={imageStyle}
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                          {queryNonImageDocs.map((doc, i) => (
                            <a
                              key={doc._id ?? `ndoc-${i}`}
                              href={resolveUrl(doc.path)}
                              target="_blank"
                              rel="noreferrer"
                              className="d-flex align-items-center gap-2 mt-2 text-decoration-none"
                            >
                              <CIcon icon={cilFile} />
                              {doc.originalName ||
                                doc.name ||
                                "Open attachment"}
                            </a>
                          ))}
                        </CCardBody>
                      </CCard>
                    </CCol>
                  )}

                  <CCol xs={12} lg={hasQueryMedia ? 8 : 12}>
                    <CCard className="h-100 mb-0">
                      <CCardHeader className="py-2 d-flex flex-wrap align-items-center gap-2">
                        <strong className="small text-body-secondary">
                          Query Product Details
                        </strong>
                        {queryProduct?.proBucketStatus && (
                          <CBadge color="info">
                            {String(queryProduct.proBucketStatus).replace(
                              /_/g,
                              " ",
                            )}
                          </CBadge>
                        )}
                        {queryProduct?.queryCode && (
                          <code className="small">
                            {queryProduct.queryCode}
                          </code>
                        )}
                      </CCardHeader>
                      <CCardBody>
                        {!queryProduct ? (
                          <p className="text-body-secondary mb-0">
                            No matched query product data available.
                          </p>
                        ) : queryProductDetailFields.length === 0 &&
                          queryVariants.length === 0 ? (
                          <p className="text-body-secondary mb-0">
                            Query product matched but no detail fields are
                            stored.
                          </p>
                        ) : (
                          <>
                            <CRow>
                              {queryProductDetailFields.map(
                                ({ label, value, mono, fullWidth }) => (
                                  <DetailRow
                                    key={label}
                                    label={label}
                                    value={
                                      typeof value === "string" ||
                                      typeof value === "number"
                                        ? fmt(value)
                                        : value
                                    }
                                    mono={mono}
                                    fullWidth={fullWidth}
                                  />
                                ),
                              )}
                            </CRow>
                            {queryVariants.length > 0 && (
                              <div className="mt-2 pt-2 border-top">
                                <div className="text-body-secondary small mb-2">
                                  Variants
                                </div>
                                <ul className="mb-0 small">
                                  {queryVariants.map((v, i) => (
                                    <li key={v._id || i}>
                                      {v.variantName || v.name || "—"}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </CCardBody>
                    </CCard>
                  </CCol>

                  {!catalogProduct && (
                    <CCol xs={12}>
                      <div className="alert alert-secondary py-2 small mb-0">
                        {item.product_id
                          ? "Linked catalog product could not be loaded."
                          : "No linked catalog product on this Sales Order line."}
                      </div>
                    </CCol>
                  )}

                  {catalogProduct && (
                    <>
                      {hasCatalogMedia && (
                        <CCol xs={12} lg={4}>
                          <CCard className="h-100 mb-0">
                            <CCardHeader className="py-2">
                              <strong className="small text-body-secondary">
                                Catalog Product Images
                              </strong>
                            </CCardHeader>
                            <CCardBody>
                              {catalogImagePreviews.length > 0 && (
                                <div className="d-flex flex-wrap gap-2 mb-2">
                                  {catalogImagePreviews.map(
                                    ({ doc, url }, i) => (
                                      <a
                                        key={
                                          doc._id != null
                                            ? String(doc._id)
                                            : `cat-img-${i}`
                                        }
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <img
                                          src={url}
                                          alt={
                                            doc.originalName ||
                                            catalogProduct.name ||
                                            "Product"
                                          }
                                          style={imageStyle}
                                        />
                                      </a>
                                    ),
                                  )}
                                </div>
                              )}
                              {catalogNonImageDocs.map((doc, i) => (
                                <a
                                  key={doc._id ?? `cat-ndoc-${i}`}
                                  href={resolveUrl(doc.path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="d-flex align-items-center gap-2 mt-2 text-decoration-none"
                                >
                                  <CIcon icon={cilFile} />
                                  {doc.originalName ||
                                    doc.name ||
                                    "Open attachment"}
                                </a>
                              ))}
                            </CCardBody>
                          </CCard>
                        </CCol>
                      )}

                      <CCol xs={12} lg={hasCatalogMedia ? 8 : 12}>
                        <CCard className="h-100 mb-0">
                          <CCardHeader className="py-2 d-flex flex-wrap align-items-center gap-2">
                            <strong className="small text-body-secondary">
                              Catalog Product Details
                            </strong>
                            {catalogProduct.status && (
                              <CBadge color="secondary">
                                {String(catalogProduct.status).replace(
                                  /_/g,
                                  " ",
                                )}
                              </CBadge>
                            )}
                            {catalogProduct.sku && (
                              <code className="small">
                                {catalogProduct.sku}
                              </code>
                            )}
                          </CCardHeader>
                          <CCardBody>
                            {catalogProductDetailFields.length === 0 &&
                            catalogVariantTypes.length === 0 &&
                            catalogVariantCombinations.length === 0 ? (
                              <p className="text-body-secondary mb-0">
                                Linked catalog product has no stored detail
                                fields.
                              </p>
                            ) : (
                              <>
                                <CRow>
                                  {catalogProductDetailFields.map(
                                    ({ label, value, mono, fullWidth }) => (
                                      <DetailRow
                                        key={label}
                                        label={label}
                                        value={
                                          typeof value === "string" ||
                                          typeof value === "number"
                                            ? fmt(value)
                                            : value
                                        }
                                        mono={mono}
                                        fullWidth={fullWidth}
                                      />
                                    ),
                                  )}
                                </CRow>

                                {catalogVariantTypes.length > 0 && (
                                  <div className="mt-2 pt-2 border-top">
                                    <div className="text-body-secondary small mb-2">
                                      Variant types
                                    </div>
                                    <div className="table-responsive">
                                      <CTable
                                        bordered
                                        hover
                                        align="middle"
                                        className="mb-0 small"
                                      >
                                        <CTableBody>
                                          {catalogVariantTypes.map(
                                            (variant, index) => (
                                              <CTableRow
                                                key={variant.name || index}
                                              >
                                                <CTableHeaderCell
                                                  style={{ width: "30%" }}
                                                >
                                                  {variant.name || "—"}
                                                </CTableHeaderCell>
                                                <CTableDataCell>
                                                  {(variant.options || []).map(
                                                    (option, optionIndex) => (
                                                      <CBadge
                                                        key={`${option}-${optionIndex}`}
                                                        color="primary"
                                                        className="me-1 mb-1"
                                                      >
                                                        {option}
                                                      </CBadge>
                                                    ),
                                                  )}
                                                </CTableDataCell>
                                              </CTableRow>
                                            ),
                                          )}
                                        </CTableBody>
                                      </CTable>
                                    </div>
                                  </div>
                                )}

                                {catalogVariantCombinations.length > 0 && (
                                  <div className="mt-3 pt-2 border-top">
                                    <div className="text-body-secondary small mb-2">
                                      Variant combinations
                                    </div>
                                    <div className="table-responsive">
                                      <CTable
                                        bordered
                                        hover
                                        align="middle"
                                        className="mb-0 small"
                                      >
                                        <CTableHead color="light">
                                          <CTableRow>
                                            <CTableHeaderCell>
                                              Variant
                                            </CTableHeaderCell>
                                            <CTableHeaderCell>
                                              SKU
                                            </CTableHeaderCell>
                                            <CTableHeaderCell>
                                              Code
                                            </CTableHeaderCell>
                                            <CTableHeaderCell>
                                              HSN
                                            </CTableHeaderCell>
                                            <CTableHeaderCell>
                                              Model
                                            </CTableHeaderCell>
                                            <CTableHeaderCell>
                                              Price
                                            </CTableHeaderCell>
                                            <CTableHeaderCell>
                                              Images
                                            </CTableHeaderCell>
                                          </CTableRow>
                                        </CTableHead>
                                        <CTableBody>
                                          {catalogVariantCombinations.map(
                                            (variantRow, index) => {
                                              const variantImages = (
                                                variantRow.images || []
                                              ).filter(isImagePath);
                                              return (
                                                <CTableRow
                                                  key={
                                                    variantRow._id ||
                                                    variantRow.uniqueId ||
                                                    index
                                                  }
                                                >
                                                  <CTableDataCell>
                                                    {formatVariantOptionValues(
                                                      variantRow.optionValues,
                                                    )}
                                                  </CTableDataCell>
                                                  <CTableDataCell className="font-monospace">
                                                    {variantRow.sku || "—"}
                                                  </CTableDataCell>
                                                  <CTableDataCell className="font-monospace">
                                                    {variantRow.variantCode ||
                                                      "—"}
                                                  </CTableDataCell>
                                                  <CTableDataCell className="font-monospace">
                                                    {variantRow.hsnNumber ||
                                                      "—"}
                                                  </CTableDataCell>
                                                  <CTableDataCell>
                                                    {variantRow.modelNumber ||
                                                      "—"}
                                                  </CTableDataCell>
                                                  <CTableDataCell>
                                                    {formatCurrency(
                                                      variantRow.price,
                                                    ) || "—"}
                                                  </CTableDataCell>
                                                  <CTableDataCell>
                                                    {variantImages.length >
                                                    0 ? (
                                                      <div className="d-flex flex-wrap gap-1">
                                                        {variantImages.map(
                                                          (doc, imageIndex) => (
                                                            <a
                                                              key={
                                                                doc._id ||
                                                                `vc-img-${imageIndex}`
                                                              }
                                                              href={resolveUrl(
                                                                doc.path,
                                                              )}
                                                              target="_blank"
                                                              rel="noreferrer"
                                                            >
                                                              <img
                                                                src={resolveUrl(
                                                                  doc.path,
                                                                )}
                                                                alt="Variant"
                                                                style={{
                                                                  ...imageStyle,
                                                                  maxHeight: 56,
                                                                  maxWidth: 56,
                                                                }}
                                                              />
                                                            </a>
                                                          ),
                                                        )}
                                                      </div>
                                                    ) : (
                                                      "—"
                                                    )}
                                                  </CTableDataCell>
                                                </CTableRow>
                                              );
                                            },
                                          )}
                                        </CTableBody>
                                      </CTable>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </CCardBody>
                        </CCard>
                      </CCol>
                    </>
                  )}

                  {item.paymentRequestBillDocumentId?.path && (
                    <CCol xs={12}>
                      <CCard className="mb-0 border-primary-subtle bg-primary-subtle">
                        <CCardBody className="py-3">
                          <div className="fw-semibold text-primary mb-2">
                            Payment Request Bill
                          </div>
                          <a
                            href={resolveUrl(
                              item.paymentRequestBillDocumentId.path,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="d-inline-flex align-items-center gap-2 text-decoration-none"
                          >
                            <CIcon icon={cilFile} />
                            {item.paymentRequestBillDocumentId.originalName ||
                              "Open bill"}
                          </a>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  )}

                  {br && (
                    <CCol xs={12}>
                      <CCard className="mb-0">
                        <CCardHeader className="py-2 d-flex flex-wrap align-items-center gap-2">
                          <strong className="small text-body-secondary">
                            Purchase Billing Request
                          </strong>
                          <CBadge
                            color={
                              br.status === "finance_approved"
                                ? "success"
                                : br.status === "rejected"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {String(br.status || "pending")}
                          </CBadge>
                          {br.uniqueId && (
                            <code className="small">{br.uniqueId}</code>
                          )}
                        </CCardHeader>
                        <CCardBody>
                          <CRow className="g-3 mb-3">
                            {br.amount != null && (
                              <CCol xs={12} sm={6} md={4} lg={3}>
                                <div className="text-body-secondary small">
                                  Amount
                                </div>
                                <div className="fw-bold">
                                  ₹{Number(br.amount).toLocaleString("en-IN")}
                                </div>
                              </CCol>
                            )}
                            {(br.createdBySnapshot?.name ||
                              br.createdBy?.name) && (
                              <CCol xs={12} sm={6} md={4} lg={3}>
                                <div className="text-body-secondary small">
                                  Submitted by
                                </div>
                                <div className="fw-semibold">
                                  {br.createdBySnapshot?.name ||
                                    br.createdBy?.name}
                                </div>
                              </CCol>
                            )}
                            {(br.approvedBySnapshot?.name ||
                              br.approvedBy?.name) && (
                              <CCol xs={12} sm={6} md={4} lg={3}>
                                <div className="text-body-secondary small">
                                  Approved by
                                </div>
                                <div className="fw-semibold">
                                  {br.approvedBySnapshot?.name ||
                                    br.approvedBy?.name}
                                </div>
                                {br.approvedAt && (
                                  <div className="text-body-secondary small">
                                    {dateTimeFormatter(br.approvedAt, "—")}
                                  </div>
                                )}
                              </CCol>
                            )}
                            {br.statusRemark && (
                              <CCol xs={12}>
                                <div className="text-body-secondary small">
                                  Financier remark
                                </div>
                                <div>{br.statusRemark}</div>
                              </CCol>
                            )}
                          </CRow>
                          <div className="d-flex flex-wrap gap-2">
                            {br.billDocumentId?.path && (
                              <CButton
                                color="primary"
                                variant="outline"
                                size="sm"
                                href={resolveUrl(br.billDocumentId.path)}
                                target="_blank"
                                rel="noreferrer"
                                component="a"
                              >
                                <CIcon icon={cilFile} className="me-1" />
                                {br.billDocumentId.originalName || "View Bill"}
                              </CButton>
                            )}
                            {br.proofDocumentId?.path && (
                              <CButton
                                color="success"
                                variant="outline"
                                size="sm"
                                href={resolveUrl(br.proofDocumentId.path)}
                                target="_blank"
                                rel="noreferrer"
                                component="a"
                              >
                                <CIcon icon={cilCheckCircle} className="me-1" />
                                {br.proofDocumentId.originalName ||
                                  "View Payment Proof"}
                              </CButton>
                            )}
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  )}

                  <CCol xs={12}>
                    <CCard className="mb-0">
                      <CCardHeader className="py-2">
                        <strong className="small text-body-secondary">
                          Local Purchase Assignments
                        </strong>
                      </CCardHeader>
                      <CCardBody>
                        {localPurchasesLoading ? (
                          <Loader message="Loading assignments…" />
                        ) : localPurchases.length === 0 ? (
                          <p className="text-body-secondary mb-0">
                            No local purchase assignments yet.
                          </p>
                        ) : (
                          <div className="table-responsive">
                            <CTable
                              hover
                              bordered
                              align="middle"
                              className="mb-0"
                            >
                              <CTableHead color="light">
                                <CTableRow>
                                  <CTableHeaderCell>Employee</CTableHeaderCell>
                                  <CTableHeaderCell>
                                    Designation
                                  </CTableHeaderCell>
                                  <CTableHeaderCell>Zone</CTableHeaderCell>
                                  <CTableHeaderCell>Status</CTableHeaderCell>
                                  <CTableHeaderCell>Remark</CTableHeaderCell>
                                  <CTableHeaderCell>Location</CTableHeaderCell>
                                  <CTableHeaderCell>
                                    Assigned on
                                  </CTableHeaderCell>
                                </CTableRow>
                              </CTableHead>
                              <CTableBody>
                                {localPurchases.map((row) => {
                                  const emp =
                                    row.employeeId &&
                                    typeof row.employeeId === "object"
                                      ? row.employeeId
                                      : null;
                                  return (
                                    <CTableRow key={row._id}>
                                      <CTableDataCell>
                                        {emp?.name || emp?.email || "—"}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {[emp?.designation, emp?.role]
                                          .filter(Boolean)
                                          .join(" · ") || "—"}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {formatLocalPurchaseZone(row.zoneId)}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {String(row.status || "pending")}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {row.remark ||
                                          row.assignmentRemark ||
                                          "—"}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {row.locationLink ? (
                                          <a
                                            href={row.locationLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-truncate d-inline-block"
                                            style={{ maxWidth: 180 }}
                                          >
                                            Link
                                          </a>
                                        ) : (
                                          "—"
                                        )}
                                      </CTableDataCell>
                                      <CTableDataCell className="text-nowrap">
                                        {dateTimeFormatter(row.createdAt, "—")}
                                      </CTableDataCell>
                                    </CTableRow>
                                  );
                                })}
                              </CTableBody>
                            </CTable>
                          </div>
                        )}
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>
              </CTabPane>

              <CTabPane role="tabpanel" visible={activeTab === "rates"}>
                {item.queryRatesMatchNote === "missing_rawProductCode" && (
                  <p className="text-body-secondary text-center py-4 mb-0">
                    This Sales Order line has no raw product code — rates cannot
                    be matched.
                  </p>
                )}
                {item.queryRatesMatchNote === "no_query_product" &&
                  item.rawProductCode && (
                    <p className="text-body-secondary text-center py-4 mb-0">
                      No query product found for code{" "}
                      <code>{item.rawProductCode}</code>.
                    </p>
                  )}

                {item.queryProductMatch && (
                  <div className="mb-3 p-2 rounded border bg-body-secondary-subtle d-flex flex-wrap gap-2 align-items-center small">
                    <span className="text-body-secondary">
                      Matched query line
                    </span>
                    <strong>#{item.queryProductMatch.lineIndex}</strong>
                    {item.queryProductMatch.queryCode && (
                      <code className="small">
                        {item.queryProductMatch.queryCode}
                      </code>
                    )}
                    {item.queryProductMatch.proBucketStatus && (
                      <CBadge color="info">
                        Pro: {item.queryProductMatch.proBucketStatus}
                      </CBadge>
                    )}
                  </div>
                )}

                {ratesToShow.length === 0 ? (
                  <div className="text-center py-5 rounded border border-dashed text-body-secondary">
                    No supplier rates yet
                  </div>
                ) : (
                  <div className="table-responsive">
                    <CTable hover bordered align="middle" className="mb-0">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell style={{ minWidth: 160 }}>
                            Supplier
                          </CTableHeaderCell>
                          <CTableHeaderCell>Contact</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 120 }}>
                            Rate
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 80 }}>
                            Unit
                          </CTableHeaderCell>
                          <CTableHeaderCell>Remark</CTableHeaderCell>
                          <CTableHeaderCell>Submitted by</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 140 }}>
                            Date
                          </CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {ratesToShow.map((r, idx) => {
                          const extras = supplierExtra(r.supplier);
                          return (
                            <CTableRow
                              key={r._id != null ? String(r._id) : idx}
                            >
                              <CTableDataCell className="fw-semibold">
                                {supplierLabel(r.supplier)}
                              </CTableDataCell>
                              <CTableDataCell className="small text-body-secondary">
                                {extras.length > 0 ? extras.join(" · ") : "—"}
                              </CTableDataCell>
                              <CTableDataCell className="fw-bold text-primary">
                                {r.rate != null
                                  ? `₹${Number(r.rate).toLocaleString("en-IN")}`
                                  : "—"}
                              </CTableDataCell>
                              <CTableDataCell>{r.unit || "—"}</CTableDataCell>
                              <CTableDataCell>{r.remark || "—"}</CTableDataCell>
                              <CTableDataCell>
                                {r.submittedBy?.name || "—"}
                              </CTableDataCell>
                              <CTableDataCell className="text-nowrap small">
                                {r.submittedAt
                                  ? dateTimeFormatter(r.submittedAt, "—")
                                  : "—"}
                              </CTableDataCell>
                            </CTableRow>
                          );
                        })}
                      </CTableBody>
                    </CTable>
                  </div>
                )}

                {lineStatus === "billing_request_rejected" && (
                  <div className="mt-3 d-flex gap-2 align-items-start rounded border border-danger-subtle bg-danger-subtle p-3">
                    <CIcon
                      icon={cilWarning}
                      className="text-danger flex-shrink-0 mt-1"
                    />
                    <span className="text-danger-emphasis">
                      This line&apos;s billing request was rejected. Please
                      resubmit using Raise Billing Request.
                    </span>
                    {showRaiseBillingRequest && (
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        className="ms-auto flex-shrink-0"
                        onClick={() =>
                          navigate(
                            `/purchase-bucket/raise-billing-request?poProductId=${id}`,
                          )
                        }
                      >
                        <CIcon icon={cilPlus} className="me-1" />
                        Resubmit
                      </CButton>
                    )}
                  </div>
                )}
              </CTabPane>
            </CTabContent>
          </CCardBody>
        </CCard>
      </CCol>

      {assignBarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            zIndex: 1040,
            background: "rgba(15, 23, 42, 0.42)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
          onClick={closeAssignBar}
          role="button"
          tabIndex={-1}
          aria-label="Close"
        />
      )}

      {assignBarOpen && (
        <div
          className="position-fixed top-0 end-0 d-flex flex-column border-start border-2 bg-body shadow-lg h-100"
          style={{ zIndex: 1050, width: "min(28rem, 100%)" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Assign local purchase"
        >
          <div className="d-flex align-items-center justify-content-between gap-2 border-bottom px-3 py-2 flex-shrink-0">
            <div style={{ minWidth: 0 }}>
              <h2 className="h6 mb-0">Assign Purchase</h2>
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
              onClick={closeAssignBar}
              disabled={assigningPurchase}
              aria-label="Close"
            >
              <CIcon icon={cilX} size="lg" />
            </CButton>
          </div>

          <div className="flex-grow-1 overflow-auto px-3 py-3">
            {localPurchaseEmployeesLoading || marketZonesLoading ? (
              <Loader message="Loading form…" />
            ) : localPurchaseEmployeeOptions.length === 0 ? (
              <p className="text-body-secondary mb-0">
                No employees with the local purchase role were found.
              </p>
            ) : marketZoneOptions.length === 0 ? (
              <p className="text-body-secondary mb-0">
                No market zones were found.
              </p>
            ) : (
              <>
                <CFormLabel htmlFor="local-purchase-employee">
                  Local purchase employee
                </CFormLabel>
                <CFormSelect
                  id="local-purchase-employee"
                  value={selectedLocalPurchaseEmployee}
                  onChange={(e) =>
                    setSelectedLocalPurchaseEmployee(e.target.value)
                  }
                  className="mb-3"
                >
                  <option value="">— Select employee —</option>
                  {localPurchaseEmployeeOptions.map((emp) => {
                    const empId = emp.employeeId || emp._id;
                    return (
                      <option key={empId} value={String(empId)}>
                        {formatLocalPurchaseEmployee(emp)}
                      </option>
                    );
                  })}
                </CFormSelect>

                <CFormLabel htmlFor="local-purchase-zone">Zone</CFormLabel>
                <CFormSelect
                  id="local-purchase-zone"
                  value={selectedMarketZone}
                  onChange={(e) => setSelectedMarketZone(e.target.value)}
                  className="mb-3"
                >
                  <option value="">— Select zone —</option>
                  {marketZoneOptions.map((zone) => {
                    const zoneId = zone.id || zone._id;
                    return (
                      <option key={zoneId} value={String(zoneId)}>
                        {formatLocalPurchaseZone(zone)}
                      </option>
                    );
                  })}
                </CFormSelect>

                <CFormLabel htmlFor="local-purchase-remark">Remark</CFormLabel>
                <CFormTextarea
                  id="local-purchase-remark"
                  rows={3}
                  placeholder="Optional note for the assignee…"
                  value={assignRemark}
                  onChange={(e) => setAssignRemark(e.target.value)}
                  className="mb-3"
                />

                <CFormLabel htmlFor="local-purchase-location">
                  Location link
                </CFormLabel>
                <CFormInput
                  id="local-purchase-location"
                  type="url"
                  value={assignLocationLink}
                  onChange={(e) => setAssignLocationLink(e.target.value)}
                  placeholder="https://maps.google.com/…"
                />
              </>
            )}
          </div>

          <div className="d-flex gap-2 px-3 py-2 border-top flex-shrink-0 justify-content-end">
            <CButton
              type="button"
              color="secondary"
              variant="ghost"
              onClick={closeAssignBar}
              disabled={assigningPurchase}
            >
              Cancel
            </CButton>
            <CButton
              type="button"
              color="primary"
              onClick={handleAssignPurchase}
              disabled={
                assigningPurchase ||
                localPurchaseEmployeesLoading ||
                marketZonesLoading ||
                localPurchaseEmployees.length === 0 ||
                marketZoneOptions.length === 0 ||
                !selectedLocalPurchaseEmployee ||
                !selectedMarketZone
              }
            >
              {assigningPurchase ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Assigning…
                </>
              ) : (
                "Assign Purchase"
              )}
            </CButton>
          </div>
        </div>
      )}
    </CRow>
  );
};

export default PurchaseBucketDetail;
