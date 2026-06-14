import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CBadge,
  CListGroup,
  CListGroupItem,
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableDataCell,
  CTableRow,
  CImage,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilArrowLeft,
  cilArrowRight,
  cilCloudDownload,
  cilList,
} from "@coreui/icons";
import quotationService from "../../services/quotationService";
import purchaseOrderService from "../../services/purchaseOrderService";
import usePermissions, {
  canConvertQuotationToPo,
  normalizeRole as normalizeUserRole,
} from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import employeeService from "../../services/employeeService";
import purchaseTaskService from "../../services/purchaseTaskService";
import areaService from "../../services/areaService";
import documentService from "../../services/documentService";
import queryNewProductService from "../../services/queryNewProductService";
import groupService from "../../services/groupService";
import categoryService from "../../services/categoryService";
import queryService from "../../services/queryService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
import AuthImage from "../../components/AuthImage/AuthImage";
import { toastError, toastSuccess } from "../../utils/toast";
import { formatIstDisplayDate, formatIstDateKey } from "../../utils/istDate";
import { ROLES, ROLE_LABELS } from "../../context/AuthContext";
import QuoteLogsSidebar from "./QuoteLogsSidebar";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";

const PURCHASE_ROLES = [
  ROLES.PURCHASE_EXICUTIVE,
  ROLES.PROCUREMENT,
  "purchase_executive",
];

/** Static gate for converting quotation → PO (replace with configurable auth later). */
const PO_FROM_QUOTATION_SECRET_CODE = "2003";

const getCurrentUserRole = () => {
  try {
    const raw = localStorage.getItem("migticrm_user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.role || "";
  } catch {
    return "";
  }
};

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "string")
    return img.startsWith("http") ? img : getAssetsUrl(img);
  if (typeof img === "object" && img?.path)
    return img.path.startsWith("http") ? img.path : getAssetsUrl(img.path);
  if (typeof img === "object" && img?.url) return img.url;
  return "";
};

const getDocumentId = (img) => {
  if (!img) return null;
  if (typeof img === "object") return img._id ?? img.documentId ?? null;
  return typeof img === "string" ? img : null;
};

const formatVariants = (variants) => {
  if (!variants?.length) return "–";
  return variants
    .map((v) => v.variantName || v || "–")
    .filter(Boolean)
    .join(", ");
};

const proBucketStatusBadge = (status) => {
  switch (status) {
    case "pending":
      return <CBadge color="warning">Pending</CBadge>;
    case "rate_submitted":
      return <CBadge color="info">Rate submitted</CBadge>;
    case "fulfilled":
      return <CBadge color="success">Fulfilled</CBadge>;
    case "approval_pending":
      return <CBadge color="secondary">Approval Pending</CBadge>;
    default:
      return status ? (
        <CBadge color="light" textColor="dark">
          {status}
        </CBadge>
      ) : (
        <span className="text-muted">—</span>
      );
  }
};

const FREIGHT_AS_PER_ACTUAL_LABEL = "As per actual";

const isNumericFreightValue = (v) => {
  if (v == null || v === "") return false;
  const compact = String(v).replace(/,/g, "").replace(/\s/g, "");
  return /^\d*\.?\d+$/.test(compact);
};

const parseQuotationFreightNumeric = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number" && !Number.isNaN(v) && v >= 0) return v;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const formatQuotationFreightDisplay = (v) => {
  if (v == null || v === "") return "—";
  const str = String(v).trim();
  if (str === "") return "—";
  const compact = str.replace(/,/g, "").replace(/\s/g, "");
  if (/^\d*\.?\d+$/.test(compact)) {
    const num = parseFloat(compact);
    const n = Number.isFinite(num) && num >= 0 ? num : 0;
    return `₹${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return str;
};

/** Merge snapshot payload onto live quotation for read-only preview (keeps ids, query link, branch signature). */
const buildViewQuotationFromSnapshot = (live, preview) => {
  const p = preview.payload;
  if (!p || !live) return live;
  const liveIndustry = live.industry_id;
  const payloadIndustryId = p.industry_id;
  const sameIndustry =
    payloadIndustryId != null &&
    liveIndustry != null &&
    String(payloadIndustryId) === String(liveIndustry?._id ?? liveIndustry);
  return {
    ...live,
    companyInfo: p.companyInfo ?? live.companyInfo ?? {},
    products: Array.isArray(p.products) ? p.products : live.products || [],
    remark: p.remark ?? live.remark,
    freightCharge: p.freightCharge ?? live.freightCharge,
    packingCharge: p.packingCharge ?? live.packingCharge,
    expectedDeliveryDate: p.expectedDeliveryDate ?? live.expectedDeliveryDate,
    expectedDeliveryWithinDays:
      p.expectedDeliveryWithinDays ?? live.expectedDeliveryWithinDays,
    industry_id: sameIndustry
      ? liveIndustry
      : (payloadIndustryId ?? liveIndustry),
    status: p.status ?? live.status,
  };
};

/** Merge PUT /quotation/update response into local quotation state. */
const mergeQuotationUpdateIntoPrev = (prev, data, patch = {}) => {
  if (!prev) return null;
  const d = data && typeof data === "object" ? data : {};
  const next = { ...prev, ...patch };
  if (d.status != null) next.status = d.status;
  if (d.products != null) next.products = d.products;
  if (d.companyInfo != null) next.companyInfo = d.companyInfo;
  if (d.freightCharge !== undefined) next.freightCharge = d.freightCharge;
  if (d.packingCharge !== undefined) next.packingCharge = d.packingCharge;
  if (d.expectedDeliveryWithinDays !== undefined)
    next.expectedDeliveryWithinDays = d.expectedDeliveryWithinDays;
  if (d.expectedDeliveryDate !== undefined)
    next.expectedDeliveryDate = d.expectedDeliveryDate;
  if (d.industry_id !== undefined) next.industry_id = d.industry_id;
  return next;
};

const DELIVERY_WITHIN_OPTIONS = [
  "1-2 days",
  "2-4 days",
  "4-6 days",
  "6-8 days",
  "8-12 days",
  "12-15 days",
];
const DELIVERY_WITHIN_OTHERS = "others";
const DEFAULT_GST_PERCENTAGE = 18;

const normalizeDeliveryWithinForApi = (value) => {
  if (value == null || value === "") return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const parseDeliveryWithinValue = (value) => {
  const str = value == null ? "" : String(value).trim();
  if (!str) return { select: "", other: "" };
  const match = DELIVERY_WITHIN_OPTIONS.find(
    (opt) => opt.toLowerCase() === str.toLowerCase(),
  );
  if (match) return { select: match, other: "" };
  return { select: DELIVERY_WITHIN_OTHERS, other: str };
};

const formatDeliveryWithinDisplay = (value) => {
  const str = value == null ? "" : String(value).trim();
  if (!str) return "–";
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return formatIstDisplayDate(str) || str;
  }
  const d = new Date(str);
  if (!Number.isNaN(d.getTime()) && str.includes("T")) {
    return formatIstDisplayDate(str) || str;
  }
  return str;
};

const getDeliveryWithinApiValue = (deliveryWithin) => {
  if (deliveryWithin == null || deliveryWithin === "") return null;
  if (typeof deliveryWithin === "string") {
    return normalizeDeliveryWithinForApi(deliveryWithin);
  }
  if (typeof deliveryWithin !== "object") return null;
  const { select, other } = deliveryWithin;
  if (!select) return null;
  if (select === DELIVERY_WITHIN_OTHERS) {
    const trimmed = String(other || "").trim();
    return trimmed || null;
  }
  return select;
};

const buildQuotationProductPayload = (prod, override = {}) => {
  const toImgIds = (imgs) =>
    (imgs || [])
      .map((img) => (typeof img === "object" && img?._id ? img._id : img))
      .filter(Boolean);
  const merged = {
    productName: prod.productName || "",
    description: prod.description || "",
    quantity: Number(prod.quantity) ?? 1,
    unit: prod.unit || "",
    hsnNumber: prod.hsnNumber || "",
    modelNumber: prod.modelNumber || "",
    rawProductCode:
      (prod.rawProductCode && String(prod.rawProductCode).trim()) || "",
    gstPercentage: prod.gstPercentage ?? null,
    remark: prod.remark || "",
    product_id:
      typeof prod.product_id === "object" && prod.product_id?._id
        ? prod.product_id._id
        : prod.product_id || null,
    rate: prod.rate ?? null,
    variants: prod.variants || [],
    images: toImgIds(prod.images),
    applyDiscount: prod.applyDiscount ?? false,
    discountPercentage: prod.discountPercentage ?? null,
    discountAmount: prod.discountAmount ?? null,
    notAvailable: prod.notAvailable ?? false,
    notAvailableRemark: prod.notAvailableRemark || "",
    deliveryDate: prod.deliveryDate ?? null,
    ...override,
  };
  if (Object.prototype.hasOwnProperty.call(override, "deliveryDate")) {
    merged.deliveryDate = normalizeDeliveryWithinForApi(override.deliveryDate);
  } else {
    merged.deliveryDate = normalizeDeliveryWithinForApi(merged.deliveryDate);
  }
  return merged;
};

const toRefIdString = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const mapQueryProductLineForApi = (p) => {
  const idFromImg = (img) => {
    if (typeof img === "string" && /^[a-fA-F0-9]{24}$/.test(img)) return img;
    if (img && typeof img === "object" && img._id) return img._id;
    return null;
  };
  return {
    productName: p.productName || "",
    quantity: p.quantity ?? 1,
    unit: p.unit || "",
    hsnNumber: p.hsnNumber || "",
    modelNumber: p.modelNumber || "",
    gstPercentage: typeof p.gstPercentage === "number" ? p.gstPercentage : null,
    variants: (p.variants || []).map((v) => ({
      variantName: v?.variantName || "",
    })),
    remark: p.remark || "",
    description: p.description || "",
    product_id: toRefIdString(p.product_id),
    groupId: toRefIdString(p.groupId),
    categoryId: toRefIdString(p.categoryId),
    rawProductCode: (p.rawProductCode && String(p.rawProductCode).trim()) || "",
    query_tracking_code:
      (p.query_tracking_code && String(p.query_tracking_code).trim()) || "",
    images: (Array.isArray(p.images) ? p.images : [])
      .map(idFromImg)
      .filter(Boolean),
  };
};

/** Draft reason for "Not available" modal (per quotation line); survives navigation until saved or revoked. */
const notAvailableReasonDraftKey = (quotationId, productIndex) =>
  quotationId != null && productIndex != null
    ? `migticrm_quotation_na_reason_${String(quotationId)}_${String(productIndex)}`
    : null;

const readNotAvailableReasonDraft = (quotationId, productIndex) => {
  const key = notAvailableReasonDraftKey(quotationId, productIndex);
  if (!key) return "";
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

const persistNotAvailableReasonDraft = (quotationId, productIndex, text) => {
  const key = notAvailableReasonDraftKey(quotationId, productIndex);
  if (!key) return;
  try {
    localStorage.setItem(key, text);
  } catch {
    /* ignore */
  }
};

const clearNotAvailableReasonDraft = (quotationId, productIndex) => {
  const key = notAvailableReasonDraftKey(quotationId, productIndex);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const QuotationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [approvingHod, setApprovingHod] = useState(false);
  const [convertingPo, setConvertingPo] = useState(false);
  /** Single modal, two steps — avoids CoreUI modal swap timing (second modal not opening). */
  const [convertPoModalVisible, setConvertPoModalVisible] = useState(false);
  const [convertPoModalStep, setConvertPoModalStep] = useState("confirm");
  const [convertPoSecretInput, setConvertPoSecretInput] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const [productIndex, setProductIndex] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleteProductModalVisible, setDeleteProductModalVisible] =
    useState(false);
  const [deleteProductIndex, setDeleteProductIndex] = useState(null);
  const [productListRateEdits, setProductListRateEdits] = useState({});
  const [productListGstEdits, setProductListGstEdits] = useState({});
  const [productListApplyDiscount, setProductListApplyDiscount] = useState({});
  const [productListDiscountPct, setProductListDiscountPct] = useState({});
  const [productListDeliveryDateEdits, setProductListDeliveryDateEdits] =
    useState({});
  const [notAvailableModalVisible, setNotAvailableModalVisible] =
    useState(false);
  const [notAvailableModalIndex, setNotAvailableModalIndex] = useState(null);
  const [notAvailableRemark, setNotAvailableRemark] = useState("");
  const [purchaseEmployees, setPurchaseEmployees] = useState([]);
  const [assignTaskSelected, setAssignTaskSelected] = useState({});
  const [assigningTask, setAssigningTask] = useState(false);
  const [assignTaskModalVisible, setAssignTaskModalVisible] = useState(false);
  const [assignTaskTargetRate, setAssignTaskTargetRate] = useState("");
  const [assignTaskDueDate, setAssignTaskDueDate] = useState("");
  const [newProductForm, setNewProductForm] = useState({
    productName: "",
    description: "",
    quantity: 1,
    unit: "",
    hsnNumber: "",
    modelNumber: "",
    gstPercentage: "",
    remark: "",
    groupId: "",
    categoryId: "",
  });
  const [newProductImageFiles, setNewProductImageFiles] = useState([]);
  const [newProductImagePreviews, setNewProductImagePreviews] = useState([]);
  const [newProductGroups, setNewProductGroups] = useState([]);
  const [newProductCategories, setNewProductCategories] = useState([]);
  const [createNewQueryProduct, setCreateNewQueryProduct] = useState(true);
  const [addingNewProduct, setAddingNewProduct] = useState(false);
  const [productListSelected, setProductListSelected] = useState({});
  const [productListAssignModalVisible, setProductListAssignModalVisible] =
    useState(false);
  const [productListAssignEmployeeId, setProductListAssignEmployeeId] =
    useState("");
  const [productListAssignDueDate, setProductListAssignDueDate] = useState("");
  const [productListAssigningTask, setProductListAssigningTask] =
    useState(false);
  const [imageGalleryImages, setImageGalleryImages] = useState([]);
  const [imageGalleryIndex, setImageGalleryIndex] = useState(0);
  const [imageGalleryVisible, setImageGalleryVisible] = useState(false);
  const [uploadingProductImages, setUploadingProductImages] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    location: "",
    area: "",
    address: "",
    purchaseManagerName: "",
    purchaseManagerPhone: "",
    purchaseManagerEmail: "",
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [freightForm, setFreightForm] = useState({
    freightMode: "actual",
    freightValue: "",
    packingCharge: "",
  });
  const [savingFreight, setSavingFreight] = useState(false);
  const [zoneNameDisplay, setZoneNameDisplay] = useState(null);
  const [quoteLogsRefreshKey, setQuoteLogsRefreshKey] = useState(0);
  const [quoteLogsOpen, setQuoteLogsOpen] = useState(false);
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  const [procurementRatesModal, setProcurementRatesModal] = useState({
    visible: false,
    loading: false,
    error: "",
    productLabel: "",
    rawProductCode: "",
    lineIndex: null,
    status: null,
    rates: [],
    imageUrls: [],
  });
  const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

  const displayQuotation = useMemo(() => {
    if (!quotation) return null;
    if (!snapshotPreview?.payload) return quotation;
    return buildViewQuotationFromSnapshot(quotation, snapshotPreview);
  }, [quotation, snapshotPreview]);

  const isSnapshotPreview = !!snapshotPreview;

  useEffect(() => {
    if (!id || !OBJECT_ID_REGEX.test(id)) {
      setLoading(false);
      setError("Invalid quotation id");
      setQuotation(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    quotationService
      .getById(id)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data ?? res?.data ?? res;
        const q = data ? { ...data, id: data._id ?? data.id } : null;
        setQuotation(q);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load quotation");
        toastError(err?.message || "Failed to load quotation");
        setQuotation(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const companyInfo = displayQuotation?.companyInfo || null;
  const products = Array.isArray(displayQuotation?.products)
    ? displayQuotation.products
    : [];
  const branchSignature = quotation?.branchSignature || null;
  const branchSignatureId =
    branchSignature && typeof branchSignature === "object"
      ? branchSignature._id || branchSignature.id || null
      : null;
  const branchSignaturePath =
    branchSignature &&
    typeof branchSignature === "object" &&
    branchSignature.path
      ? branchSignature.path.startsWith("http")
        ? branchSignature.path
        : getAssetsUrl(branchSignature.path)
      : "";
  const queryId = quotation?.queryId?._id ?? quotation?.queryId;
  const relatedQueryCode =
    quotation?.queryId &&
    typeof quotation.queryId === "object" &&
    quotation.queryId.queryCode
      ? String(quotation.queryId.queryCode).trim()
      : "";
  const relatedQueryLinkLabel = relatedQueryCode || "View Query";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await groupService.getAll({ pageNumber: 1, pageSize: 100 });
        const data = res?.data || res;
        if (!cancelled) setNewProductGroups(data?.groups || []);
      } catch {
        if (!cancelled) setNewProductGroups([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const gid = newProductForm.groupId;
      const params = { pageNumber: 1, pageSize: 100, parent: "null" };
      if (gid) params.group = gid;
      try {
        const res = await categoryService.getAll(params);
        const data = res?.data || res;
        if (!cancelled) setNewProductCategories(data?.categories || []);
      } catch {
        if (!cancelled) setNewProductCategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [newProductForm.groupId]);

  const hasRate = (p) =>
    !p.notAvailable &&
    p.rate != null &&
    !Number.isNaN(Number(p.rate)) &&
    Number(p.rate) >= 0;
  const productsWithRate = products.filter(hasRate);
  const productsWithoutRate = products.filter((p) => !hasRate(p));

  useEffect(() => {
    const ci = displayQuotation?.companyInfo;
    if (ci) {
      const pm =
        Array.isArray(ci.purchaseManagers) && ci.purchaseManagers.length > 0
          ? ci.purchaseManagers[0]
          : {};
      setCompanyForm({
        name: ci.name || "",
        location: ci.location || "",
        area: ci.area || "",
        address: ci.address || "",
        purchaseManagerName: pm.name || "",
        purchaseManagerPhone: pm.phone || "",
        purchaseManagerEmail: pm.email || "",
      });
    } else if (displayQuotation) {
      setCompanyForm({
        name: displayQuotation.customerName || "",
        location: "",
        area: "",
        address: "",
        purchaseManagerName: "",
        purchaseManagerPhone: "",
        purchaseManagerEmail: "",
      });
    }
  }, [displayQuotation]);

  // Sync freight & packing form from quotation
  useEffect(() => {
    if (!displayQuotation) return;
    const rawFreight = displayQuotation.freightCharge;
    const isNumeric = isNumericFreightValue(rawFreight);
    setFreightForm({
      freightMode: isNumeric ? "other" : "actual",
      freightValue: isNumeric
        ? String(rawFreight).replace(/,/g, "").trim()
        : "",
      packingCharge:
        displayQuotation.packingCharge != null &&
        Number(displayQuotation.packingCharge) > 0
          ? String(displayQuotation.packingCharge)
          : "",
    });
  }, [displayQuotation]);

  // Resolve zone ID to name for display in Company Information
  useEffect(() => {
    const areaVal = companyForm.area?.trim?.() || "";
    if (!areaVal) {
      setZoneNameDisplay(null);
      return;
    }
    if (!OBJECT_ID_REGEX.test(areaVal)) {
      setZoneNameDisplay(null);
      return;
    }
    let cancelled = false;
    areaService
      .getById(areaVal)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data ?? res?.data ?? res;
        const name = data?.name ?? null;
        setZoneNameDisplay(name || areaVal);
      })
      .catch(() => {
        if (!cancelled) setZoneNameDisplay(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyForm.area]);

  const updateCompanyForm = (field, value) => {
    if (field === "area") setZoneNameDisplay(null);
    setCompanyForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCompanyInfo = async () => {
    if (!quotation?.id) return;
    setSavingCompany(true);
    try {
      const purchaseManagers =
        companyForm.purchaseManagerName ||
        companyForm.purchaseManagerPhone ||
        companyForm.purchaseManagerEmail
          ? [
              {
                name: companyForm.purchaseManagerName || "",
                phone: companyForm.purchaseManagerPhone || "",
                email: companyForm.purchaseManagerEmail || "",
              },
            ]
          : [];
      const res = await quotationService.update(quotation.id, {
        companyInfo: {
          name: companyForm.name || "",
          location: companyForm.location || "",
          area: companyForm.area || "",
          address: companyForm.address || "",
          purchaseManagers,
        },
      });
      const data = res?.data?.data ?? res?.data ?? res;
      if (data?.companyInfo) {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, {
            companyInfo: data.companyInfo,
          }),
        );
      } else {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, {
            companyInfo: {
              name: companyForm.name,
              location: companyForm.location,
              area: companyForm.area,
              address: companyForm.address,
              purchaseManagers,
            },
          }),
        );
      }
      toastSuccess("Company information updated");
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update company information",
      );
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveFreightPacking = async () => {
    if (!quotation?.id) return;
    if (
      freightForm.freightMode === "other" &&
      (freightForm.freightValue === "" ||
        Number(freightForm.freightValue) < 0 ||
        Number.isNaN(Number(freightForm.freightValue)))
    ) {
      toastError("Enter a valid freight amount");
      return;
    }
    setSavingFreight(true);
    try {
      const freightCharge =
        freightForm.freightMode === "other"
          ? String(Number(freightForm.freightValue))
          : FREIGHT_AS_PER_ACTUAL_LABEL;
      const packingCharge =
        freightForm.packingCharge === "" ||
        Number.isNaN(Number(freightForm.packingCharge))
          ? 0
          : Math.max(0, Number(freightForm.packingCharge));
      const res = await quotationService.update(quotation.id, {
        freightCharge,
        packingCharge,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      setQuotation((prev) =>
        mergeQuotationUpdateIntoPrev(prev, data, {
          freightCharge,
          packingCharge,
        }),
      );
      toastSuccess("Freight & packing charge updated");
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update freight & packing charge",
      );
    } finally {
      setSavingFreight(false);
    }
  };

  // Sync editing product when productIndex or products change
  useEffect(() => {
    if (products.length > 0) {
      const idx = Math.min(productIndex, products.length - 1);
      const p = products[idx];
      const productRef = typeof p.product_id === "object" ? p.product_id : null;
      setEditingProduct({
        productName: p.productName || "",
        description:
          productRef?.shortDescription || p.description || p.remark || "",
        quantity: p.quantity ?? "",
        unit: p.unit || "",
        hsnNumber: productRef?.hsnNumber || p.hsnNumber || "",
        modelNumber:
          productRef?.modelNumber ||
          productRef?.defaultModelNumber ||
          p.modelNumber ||
          "",
        gstPercentage: p.gstPercentage != null ? p.gstPercentage : "",
        remark: p.remark || "",
        rate: p.rate != null ? p.rate : "",
        deliveryDate: parseDeliveryWithinValue(p.deliveryDate),
        variants: p.variants || [],
        product_id: p.product_id,
        images:
          Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : Array.isArray(productRef?.images)
              ? productRef.images
              : [],
      });
    } else {
      setEditingProduct(null);
    }
  }, [productIndex, products]);

  useEffect(() => {
    if (activeTab !== "productList") return;
    let cancelled = false;
    employeeService
      .getAll({ pageNumber: 1, pageSize: 100 })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || res;
        const result = data?.data ?? data;
        const list = result?.employees || result?.items || result || [];
        const purchase = list.filter((e) => PURCHASE_ROLES.includes(e.role));
        setPurchaseEmployees(purchase);
      })
      .catch(() => {
        if (!cancelled) setPurchaseEmployees([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const toggleAssignEmployee = (empId, checked) => {
    setAssignTaskSelected((prev) => ({ ...prev, [empId]: !!checked }));
  };

  const openAssignTaskModal = () => {
    const selectedIds = Object.entries(assignTaskSelected)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    if (!quotation?.id || selectedIds.length === 0) {
      toastError("Please select at least one employee");
      return;
    }
    const p = products[Math.min(productIndex, products.length - 1)];
    const rateVal =
      editingProduct?.rate !== "" && !Number.isNaN(Number(editingProduct?.rate))
        ? Number(editingProduct.rate)
        : "";
    setAssignTaskTargetRate(rateVal !== "" ? String(rateVal) : "");
    setAssignTaskDueDate("");
    setAssignTaskModalVisible(true);
  };

  const handleAssignTask = async () => {
    const selectedIds = Object.entries(assignTaskSelected)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    if (!quotation?.id || selectedIds.length === 0) return;
    const p = products[Math.min(productIndex, products.length - 1)];
    const productRef = typeof p?.product_id === "object" ? p.product_id : null;
    const productObj = {
      productName: p?.productName || editingProduct?.productName || "",
      description:
        productRef?.shortDescription ||
        p?.description ||
        editingProduct?.description ||
        "",
      quantity: p?.quantity ?? editingProduct?.quantity ?? 1,
      unit: p?.unit || editingProduct?.unit || "",
      hsnNumber:
        productRef?.hsnNumber ||
        p?.hsnNumber ||
        editingProduct?.hsnNumber ||
        "",
      modelNumber:
        productRef?.modelNumber ||
        productRef?.defaultModelNumber ||
        p?.modelNumber ||
        editingProduct?.modelNumber ||
        "",
      gstPercentage:
        productRef?.gstPercentage ??
        p?.gstPercentage ??
        editingProduct?.gstPercentage ??
        null,
      remark: p?.remark || editingProduct?.remark || "",
      rate: editingProduct?.rate ?? p?.rate ?? null,
      variants: p?.variants || editingProduct?.variants || [],
      product_id: productRef?._id || p?.product_id || null,
    };
    const targetRate =
      assignTaskTargetRate !== "" && !Number.isNaN(Number(assignTaskTargetRate))
        ? Number(assignTaskTargetRate)
        : 0;
    const dueDate = assignTaskDueDate
      ? new Date(assignTaskDueDate).toISOString()
      : null;
    const quotationNumber =
      quotation?.quotationCode ||
      `QT-${String(quotation?.id || "").slice(-6)}` ||
      "";
    setAssigningTask(true);
    try {
      for (const empId of selectedIds) {
        await purchaseTaskService.assign({
          quotationId: quotation.id,
          assignedTo: empId,
          type: "quotation",
          priority: "highest",
          quotationNumber,
          product: productObj,
          productCategory:
            productRef?.productCategory || productRef?.category?.name || "",
          productGroup:
            productRef?.productGroup || productRef?.group?.name || "",
          subCategory:
            productRef?.subCategory || productRef?.subCategory?.name || "",
          targetRate,
          dueDate,
        });
      }
      toastSuccess(`Task assigned to ${selectedIds.length} employee(s)`);
      setAssignTaskSelected({});
      setAssignTaskModalVisible(false);
      setAssignTaskTargetRate("");
      setAssignTaskDueDate("");
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to assign task",
      );
    } finally {
      setAssigningTask(false);
    }
  };

  const updateFormField = (field, value) => {
    setEditingProduct((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const getProductImagesForEdit = (product) => {
    if (!product) return [];
    const imagesFromProduct = Array.isArray(product.images)
      ? product.images
      : [];
    if (imagesFromProduct.length > 0) return imagesFromProduct;
    const productRef =
      typeof product.product_id === "object" ? product.product_id : null;
    return Array.isArray(productRef?.images) ? productRef.images : [];
  };

  const uploadEditingProductImages = async (files) => {
    if (!files?.length) return;
    setUploadingProductImages(true);
    try {
      const res = await documentService.uploadImages(files);
      const data = res?.data?.data ?? res?.data ?? res;
      const docs = data?.documents || [];
      const uploaded = docs
        .map((d) => ({ _id: d?._id || d?.id, path: d?.path || d?.url || "" }))
        .filter((d) => !!d._id || !!d.path);
      if (uploaded.length === 0) {
        toastError("No images uploaded");
        return;
      }
      setEditingProduct((prev) => {
        if (!prev) return prev;
        const existing = Array.isArray(prev.images) ? prev.images : [];
        return { ...prev, images: [...existing, ...uploaded] };
      });
      toastSuccess(`${uploaded.length} image(s) uploaded`);
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to upload images",
      );
    } finally {
      setUploadingProductImages(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!quotation?.id || !editingProduct) return false;
    const idx = Math.min(productIndex, products.length - 1);
    const qty = Number(editingProduct.quantity);
    const rateVal =
      editingProduct.rate !== "" && !Number.isNaN(Number(editingProduct.rate))
        ? Number(editingProduct.rate)
        : null;
    const productId = products[idx]?.product_id;
    const pid =
      typeof productId === "object" && productId?._id
        ? productId._id
        : productId;
    const updatedProducts = products.map((p, i) => {
      if (i !== idx) return buildQuotationProductPayload(p);
      return buildQuotationProductPayload(p, {
        productName: editingProduct.productName || p.productName,
        description: editingProduct.description ?? p.description ?? "",
        quantity: !Number.isNaN(qty) && qty >= 0 ? qty : p.quantity,
        unit: editingProduct.unit ?? p.unit ?? "",
        hsnNumber: editingProduct.hsnNumber ?? p.hsnNumber ?? "",
        modelNumber: editingProduct.modelNumber ?? p.modelNumber ?? "",
        gstPercentage:
          editingProduct.gstPercentage !== "" &&
          !Number.isNaN(Number(editingProduct.gstPercentage))
            ? Number(editingProduct.gstPercentage)
            : (p.gstPercentage ?? null),
        remark: editingProduct.remark ?? p.remark ?? "",
        product_id: pid ?? p.product_id,
        rate: rateVal,
        variants: editingProduct.variants || p.variants || [],
        images: Array.isArray(editingProduct.images)
          ? editingProduct.images
          : getProductImagesForEdit(p),
        deliveryDate: getDeliveryWithinApiValue(editingProduct.deliveryDate),
      });
    });
    setUpdating(true);
    try {
      const res = await quotationService.update(quotation.id, {
        products: updatedProducts,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      if (data?.products) {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, { products: data.products }),
        );
      } else {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, {
            products: updatedProducts,
          }),
        );
      }
      setQuoteLogsRefreshKey((prev) => prev + 1);
      toastSuccess("Product updated");
      return true;
    } catch (err) {
      toastError(err?.message || "Failed to update product");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const handleNextProduct = async () => {
    const saved = await handleUpdateProduct();
    if (saved) {
      setProductIndex((i) => Math.min(products.length - 1, i + 1));
    }
  };

  const getListRate = (idx) =>
    productListRateEdits[idx] !== undefined
      ? productListRateEdits[idx]
      : (products[idx]?.rate ?? "");
  const getListGst = (idx) => {
    if (
      productListGstEdits[idx] !== undefined &&
      productListGstEdits[idx] !== ""
    )
      return productListGstEdits[idx];
    const p = products[idx];
    const productRef = typeof p?.product_id === "object" ? p.product_id : null;
    const val = p?.gstPercentage ?? productRef?.gstPercentage;
    return val != null ? String(val) : String(DEFAULT_GST_PERCENTAGE);
  };
  const setListGst = (idx, val) =>
    setProductListGstEdits((prev) => ({ ...prev, [idx]: val }));
  const setListRate = (idx, val) =>
    setProductListRateEdits((prev) => ({ ...prev, [idx]: val }));

  const getListApplyDiscount = (idx) =>
    productListApplyDiscount[idx] !== undefined
      ? productListApplyDiscount[idx]
      : !!products[idx]?.applyDiscount;
  const getListDiscountPct = (idx) =>
    productListDiscountPct[idx] !== undefined
      ? productListDiscountPct[idx]
      : (products[idx]?.discountPercentage ?? "");
  const setListApplyDiscount = (idx, val) =>
    setProductListApplyDiscount((prev) => ({ ...prev, [idx]: !!val }));
  const setListDiscountPct = (idx, val) =>
    setProductListDiscountPct((prev) => ({ ...prev, [idx]: val }));
  const getListDeliveryWithin = (idx) =>
    productListDeliveryDateEdits[idx] !== undefined
      ? productListDeliveryDateEdits[idx]
      : parseDeliveryWithinValue(products[idx]?.deliveryDate);
  const setListDeliveryWithinSelect = (idx, select) => {
    setProductListDeliveryDateEdits((prev) => {
      const current =
        prev[idx] !== undefined
          ? prev[idx]
          : parseDeliveryWithinValue(products[idx]?.deliveryDate);
      return {
        ...prev,
        [idx]: {
          select,
          other: select === DELIVERY_WITHIN_OTHERS ? current.other || "" : "",
        },
      };
    });
  };
  const setListDeliveryWithinOther = (idx, other) => {
    setProductListDeliveryDateEdits((prev) => ({
      ...prev,
      [idx]: {
        select: DELIVERY_WITHIN_OTHERS,
        other,
      },
    }));
  };
  const getListDeliveryWithinApiValue = (idx) =>
    getDeliveryWithinApiValue(getListDeliveryWithin(idx));
  const getListTotalBeforeDiscount = (idx) => {
    const p = products[idx];
    const qty = Number(p?.quantity) ?? 0;
    const rate = getListRate(idx);
    const r =
      rate === "" || rate == null
        ? 0
        : Number.isNaN(Number(rate))
          ? 0
          : Number(rate);
    return qty > 0 ? qty * r : 0;
  };
  const getListDiscountAmount = (idx) => {
    const before = getListTotalBeforeDiscount(idx);
    const apply = getListApplyDiscount(idx);
    const pctVal = getListDiscountPct(idx);
    const pct =
      (pctVal !== "" && pctVal != null && !Number.isNaN(Number(pctVal))
        ? Number(pctVal)
        : 0) / 100;
    return apply && before > 0 ? before * pct : 0;
  };
  const getListTotal = (idx) => {
    const before = getListTotalBeforeDiscount(idx);
    const discount = getListDiscountAmount(idx);
    return Math.max(0, before - discount);
  };

  const calculatedTotalTaxable = products.reduce(
    (sum, p, idx) => sum + getListTotal(idx),
    0,
  );
  const calculatedTotalGst = products.reduce((sum, p, idx) => {
    const lineTotal = getListTotal(idx);
    const gstVal = getListGst(idx);
    const gstPct =
      gstVal !== "" && !Number.isNaN(Number(gstVal))
        ? Number(gstVal)
        : (p?.gstPercentage ??
          (typeof p.product_id === "object"
            ? p.product_id?.gstPercentage
            : null) ??
          DEFAULT_GST_PERCENTAGE);
    return sum + lineTotal * (gstPct / 100);
  }, 0);
  const calculatedTotalAmount = calculatedTotalTaxable + calculatedTotalGst;

  // Whether to show Discount column in preview (mirror PDF logic)
  const hasDiscountColumn = products.some(
    (p) =>
      !p.notAvailable &&
      p.applyDiscount &&
      (p.discountPercentage != null || p.discountAmount != null),
  );
  const setListTotal = (idx, totalVal) => {
    const p = products[idx];
    const qty = Number(p?.quantity) ?? 0;
    if (qty <= 0) return;
    const t = Number(totalVal);
    if (Number.isNaN(t) || totalVal === "") return;
    const applyDiscount = getListApplyDiscount(idx);
    const discountAmt = applyDiscount ? getListDiscountAmount(idx) : 0;
    const amountBeforeDiscount = t + discountAmt;
    setListRate(idx, amountBeforeDiscount / qty);
  };

  const handleUpdateProductFromList = async (idx) => {
    if (!quotation?.id || !products[idx]) return;
    const p = products[idx];
    const isNotAvailable = !!p.notAvailable;
    const rateVal = getListRate(idx);
    const gstVal = getListGst(idx);
    const gstNum =
      gstVal !== "" && !Number.isNaN(Number(gstVal)) ? Number(gstVal) : null;
    if (!isNotAvailable) {
      if (gstVal === "" || gstNum === null) {
        toastError("GST % is required. Enter a value between 0 and 100.");
        return;
      }
      if (gstNum < 0 || gstNum > 100) {
        toastError("GST % must be between 0 and 100.");
        return;
      }
    }
    const r = isNotAvailable
      ? null
      : rateVal !== "" && !Number.isNaN(Number(rateVal))
        ? Number(rateVal)
        : (p?.rate ?? null);
    const applyDiscount = getListApplyDiscount(idx);
    const discountPctVal = getListDiscountPct(idx);
    const discountPct =
      discountPctVal !== "" &&
      discountPctVal != null &&
      !Number.isNaN(Number(discountPctVal))
        ? Number(discountPctVal)
        : null;
    const beforeDiscount = getListTotalBeforeDiscount(idx);
    const discountAmount =
      applyDiscount && discountPct != null && beforeDiscount > 0
        ? beforeDiscount * (discountPct / 100)
        : 0;
    const updatedProducts = products.map((prod, i) =>
      i === idx
        ? buildQuotationProductPayload(prod, {
            rate: r,
            gstPercentage: isNotAvailable
              ? (prod.gstPercentage ?? null)
              : gstNum,
            applyDiscount: !!applyDiscount,
            discountPercentage: applyDiscount ? discountPct : null,
            discountAmount: applyDiscount ? discountAmount : null,
            notAvailable: !!prod.notAvailable,
            notAvailableRemark: prod.notAvailableRemark || "",
            deliveryDate: getListDeliveryWithinApiValue(idx),
          })
        : buildQuotationProductPayload(prod),
    );
    setUpdating(true);
    try {
      const res = await quotationService.update(quotation.id, {
        products: updatedProducts,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      if (data?.products) {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, { products: data.products }),
        );
        setProductListRateEdits((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
        setProductListGstEdits((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
        setProductListApplyDiscount((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
        setProductListDiscountPct((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
        setProductListDeliveryDateEdits((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      } else {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, {
            products: updatedProducts,
          }),
        );
      }
      setQuoteLogsRefreshKey((prev) => prev + 1);
      toastSuccess("Rate and GST updated");
    } catch (err) {
      toastError(err?.message || "Failed to update rate");
    } finally {
      setUpdating(false);
    }
  };

  const openDeleteProductModal = (idx) => {
    if (!products[idx]) return;
    setDeleteProductIndex(idx);
    setDeleteProductModalVisible(true);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!quotation?.id || deleteProductIndex == null) return;
    const idx = deleteProductIndex;
    if (!products[idx]) return;
    const updatedProducts = products
      .filter((_, i) => i !== idx)
      .map((prod) => buildQuotationProductPayload(prod));

    setUpdating(true);
    try {
      const res = await quotationService.update(quotation.id, {
        products: updatedProducts,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      const nextProducts = data?.products || updatedProducts;
      setQuotation((prev) =>
        mergeQuotationUpdateIntoPrev(prev, data, { products: nextProducts }),
      );
      setDeleteProductModalVisible(false);
      setDeleteProductIndex(null);
      toastSuccess("Product deleted from quotation");
      setProductIndex((pi) =>
        Math.max(0, Math.min(pi, Math.max(0, nextProducts.length - 1))),
      );
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete product",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotAvailable = async () => {
    const idx = notAvailableModalIndex;
    if (idx == null || !quotation?.id || !products[idx]) return;
    const updatedProducts = products.map((p, i) =>
      i === idx
        ? buildQuotationProductPayload(p, {
            notAvailable: true,
            notAvailableRemark: notAvailableRemark.trim() || "",
            rate: null,
          })
        : buildQuotationProductPayload(p),
    );
    setUpdating(true);
    try {
      const res = await quotationService.update(quotation.id, {
        products: updatedProducts,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      if (data?.products) {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, { products: data.products }),
        );
      } else {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, {
            products: updatedProducts,
          }),
        );
      }
      clearNotAvailableReasonDraft(quotation.id, idx);
      toastSuccess("Product marked as not available");
      setNotAvailableModalVisible(false);
      setNotAvailableModalIndex(null);
      setNotAvailableRemark("");
      setProductListRateEdits((prev) => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    } catch (err) {
      toastError(err?.message || "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  const handleRevokeNotAvailable = async (idx) => {
    if (idx == null || !quotation?.id || !products[idx]) return;
    const p = products[idx];
    if (!p.notAvailable) return;
    const updatedProducts = products.map((prod, i) =>
      i === idx
        ? buildQuotationProductPayload(prod, {
            notAvailable: false,
            notAvailableRemark: "",
          })
        : buildQuotationProductPayload(prod),
    );
    setUpdating(true);
    try {
      const res = await quotationService.update(quotation.id, {
        products: updatedProducts,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      if (data?.products) {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, { products: data.products }),
        );
      } else {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, {
            products: updatedProducts,
          }),
        );
      }
      clearNotAvailableReasonDraft(quotation.id, idx);
      toastSuccess("Product marked as available again");
    } catch (err) {
      toastError(err?.message || "Failed to revoke");
    } finally {
      setUpdating(false);
    }
  };

  const toggleProductListSelect = (idx, checked) => {
    setProductListSelected((prev) => ({ ...prev, [idx]: !!checked }));
  };
  const toggleProductListSelectAll = () => {
    const allSelected =
      Object.keys(productListSelected).length === products.length &&
      products.every((_, i) => productListSelected[i]);
    if (allSelected) {
      setProductListSelected({});
    } else {
      const next = {};
      products.forEach((_, i) => {
        next[i] = true;
      });
      setProductListSelected(next);
    }
  };
  const productListSelectedIndices = () =>
    Object.entries(productListSelected)
      .filter(([, v]) => v)
      .map(([k]) => parseInt(k, 10));

  const openProductListAssignModal = () => {
    const selected = productListSelectedIndices();
    if (selected.length === 0) {
      toastError("Please select at least one product");
      return;
    }
    setProductListAssignEmployeeId("");
    setProductListAssignDueDate("");
    setProductListAssignModalVisible(true);
  };

  const handleProductListAssignTask = async () => {
    const selectedIndices = productListSelectedIndices();
    if (
      !quotation?.id ||
      selectedIndices.length === 0 ||
      !productListAssignEmployeeId
    ) {
      toastError("Please select at least one product and one employee");
      return;
    }
    const quotationNumber =
      quotation?.quotationCode ||
      `QT-${String(quotation?.id || "").slice(-6)}` ||
      "";
    const dueDate = productListAssignDueDate
      ? new Date(productListAssignDueDate).toISOString()
      : null;
    setProductListAssigningTask(true);
    try {
      for (const idx of selectedIndices) {
        const p = products[idx];
        const productRef =
          typeof p?.product_id === "object" ? p.product_id : null;
        const rateVal = getListRate(idx);
        const targetRate =
          rateVal !== "" && !Number.isNaN(Number(rateVal))
            ? Number(rateVal)
            : 0;
        const productObj = {
          productName: p?.productName || "",
          description:
            productRef?.shortDescription || p?.description || p?.remark || "",
          quantity: p?.quantity ?? 1,
          unit: p?.unit || "",
          hsnNumber: productRef?.hsnNumber || p?.hsnNumber || "",
          modelNumber:
            productRef?.modelNumber ||
            productRef?.defaultModelNumber ||
            p?.modelNumber ||
            "",
          gstPercentage: productRef?.gstPercentage ?? p?.gstPercentage ?? null,
          remark: p?.remark || "",
          rate: rateVal !== "" ? Number(rateVal) : (p?.rate ?? null),
          variants: p?.variants || [],
          product_id: productRef?._id || p?.product_id || null,
        };
        await purchaseTaskService.assign({
          quotationId: quotation.id,
          assignedTo: productListAssignEmployeeId,
          type: "quotation",
          priority: "highest",
          quotationNumber,
          product: productObj,
          productCategory:
            productRef?.productCategory || productRef?.category?.name || "",
          productGroup:
            productRef?.productGroup || productRef?.group?.name || "",
          subCategory:
            productRef?.subCategory || productRef?.subCategory?.name || "",
          targetRate,
          dueDate,
        });
      }
      toastSuccess(`${selectedIndices.length} task(s) assigned`);
      setProductListSelected({});
      setProductListAssignModalVisible(false);
      setProductListAssignEmployeeId("");
      setProductListAssignDueDate("");
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to assign task",
      );
    } finally {
      setProductListAssigningTask(false);
    }
  };

  const updateNewProductForm = (field, value) => {
    setNewProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearNewProductForm = () => {
    setNewProductForm({
      productName: "",
      description: "",
      quantity: 1,
      unit: "",
      hsnNumber: "",
      modelNumber: "",
      gstPercentage: "",
      remark: "",
      groupId: "",
      categoryId: "",
    });
    setNewProductImageFiles([]);
    setNewProductImagePreviews([]);
  };

  const handleAddNewProduct = async () => {
    if (!quotation?.id) return;
    if (!newProductForm.productName?.trim()) {
      toastError("Product name is required");
      return;
    }
    const qty = Number(newProductForm.quantity);
    if (!qty || qty <= 0 || Number.isNaN(qty)) {
      toastError("Quantity must be greater than 0");
      return;
    }
    const needsGroupCategory = !!createNewQueryProduct || !!queryId;
    if (needsGroupCategory) {
      if (!String(newProductForm.groupId || "").trim()) {
        toastError("Group is required");
        return;
      }
      if (!String(newProductForm.categoryId || "").trim()) {
        toastError("Category is required");
        return;
      }
    }
    setAddingNewProduct(true);
    try {
      let uploadedDocs = [];
      if (newProductImageFiles.length > 0) {
        const res = await documentService.uploadImages(newProductImageFiles);
        const payload = res?.data || res;
        const docs = payload?.data?.documents || payload?.documents || [];
        uploadedDocs = docs.map((d) => ({
          _id: d._id || d.id,
          path: d.path || d.url || "",
        }));
      }

      let createdQueryNewProduct = null;

      if (createNewQueryProduct) {
        const newPayload = {
          name: (newProductForm.productName || "").trim(),
          description: (newProductForm.description || "").trim(),
          unit: (newProductForm.unit || "").trim(),
          hsnNumber: (newProductForm.hsnNumber || "").trim(),
          modelNumber: (newProductForm.modelNumber || "").trim(),
          groupId: newProductForm.groupId || null,
          categoryId: newProductForm.categoryId || null,
          qty,
          variants: [],
          images: uploadedDocs.map((d) => d._id),
        };
        if (newPayload.name) {
          const res = await queryNewProductService.create(newPayload);
          createdQueryNewProduct = res?.data?.data ?? res?.data ?? res ?? null;
        }
      }

      const codeFromNew =
        createdQueryNewProduct && createdQueryNewProduct._id
          ? {
              rawProductCode: createdQueryNewProduct.rawProductCode || "",
              query_tracking_code:
                createdQueryNewProduct.query_tracking_code || "",
            }
          : {};
      const newProd = {
        productName: newProductForm.productName.trim(),
        description: newProductForm.description || "",
        quantity: qty,
        unit: newProductForm.unit || "",
        hsnNumber: newProductForm.hsnNumber || "",
        modelNumber: newProductForm.modelNumber || "",
        gstPercentage:
          newProductForm.gstPercentage !== "" &&
          !Number.isNaN(Number(newProductForm.gstPercentage))
            ? Number(newProductForm.gstPercentage)
            : null,
        remark: newProductForm.remark || "",
        product_id: null,
        groupId: newProductForm.groupId || "",
        categoryId: newProductForm.categoryId || "",
        ...codeFromNew,
        rate: null,
        variants: [],
        images: uploadedDocs.length ? uploadedDocs : [],
      };

      const updatedProducts = [
        ...products.map((p) => buildQuotationProductPayload(p)),
        buildQuotationProductPayload(newProd),
      ];

      if (queryId) {
        const queryRes = await queryService.getById(queryId);
        const queryData = queryRes?.data?.data ?? queryRes?.data ?? queryRes;
        const existingQueryProducts = Array.isArray(queryData?.products)
          ? queryData.products
          : [];
        const queryLine = mapQueryProductLineForApi(newProd);
        await queryService.update(queryId, {
          products: [
            ...existingQueryProducts.map(mapQueryProductLineForApi),
            queryLine,
          ],
        });
      }

      const res = await quotationService.update(quotation.id, {
        products: updatedProducts,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      if (data?.products) {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, { products: data.products }),
        );
      } else {
        setQuotation((prev) =>
          mergeQuotationUpdateIntoPrev(prev, data, {
            products: updatedProducts,
          }),
        );
      }

      clearNewProductForm();
      toastSuccess(
        queryId
          ? "Product added to quotation and linked query"
          : "Product added to quotation",
      );
      setActiveTab("products");
      setProductIndex(products.length);
    } catch (err) {
      toastError(err?.message || "Failed to add product");
    } finally {
      setAddingNewProduct(false);
    }
  };

  const currentUserRoleForPdf = normalizeRole(
    user?.role || getCurrentUserRole(),
  );
  const isSalesRole = currentUserRoleForPdf.startsWith("sales");
  const canDownloadPdf =
    isSalesRole ||
    displayQuotation?.status === "hod_approved" ||
    !!displayQuotation?.allProductsHodRatesApproved;
  const pdfDownloadBlockedMessage =
    "PDF export requires HOD quotation approval or all product HOD rates approved";
  const pdfDownloadDisabledTitle =
    "Download disabled until HOD approval or all product rates are HOD approved";

  const openProcurementRatesModal = async (
    productRow,
    lineIndex,
    imageUrls = [],
  ) => {
    if (!quotation?.id) return;
    const rawCode = String(productRow?.rawProductCode ?? "").trim();
    if (!rawCode) {
      toastError(
        "This line has no product code; procurement rates are unavailable.",
      );
      return;
    }
    const productLabel =
      productRow?.productName?.trim() || rawCode || `Line ${lineIndex + 1}`;
    setProcurementRatesModal({
      visible: true,
      loading: true,
      error: "",
      productLabel,
      rawProductCode: rawCode,
      lineIndex,
      status: null,
      rates: [],
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
    });
    try {
      const res = await quotationService.getLineProcurementRates(quotation.id, {
        rawProductCode: rawCode,
        lineIndex,
      });
      const block = res?.data?.data ?? res?.data ?? res;
      const rates = Array.isArray(block?.rates) ? block.rates : [];
      setProcurementRatesModal((prev) => ({
        ...prev,
        loading: false,
        error: "",
        status: block?.status ?? null,
        rates,
        productLabel: block?.productName?.trim() || productLabel,
      }));
    } catch (err) {
      const msg = err?.message || "Failed to load procurement rates";
      toastError(msg);
      setProcurementRatesModal((prev) => ({
        ...prev,
        loading: false,
        error: msg,
        rates: [],
      }));
    }
  };

  const closeProcurementRatesModal = () => {
    setProcurementRatesModal({
      visible: false,
      loading: false,
      error: "",
      productLabel: "",
      rawProductCode: "",
      lineIndex: null,
      status: null,
      rates: [],
      imageUrls: [],
    });
  };

  const handleDownloadProductsPdf = async () => {
    if (!quotation?.id) return;
    if (!canDownloadPdf) {
      toastError(pdfDownloadBlockedMessage);
      return;
    }
    setExportingPdf(true);
    try {
      const response = await quotationService.exportPdf(quotation.id);
      const blob = response?.data;
      if (!blob || !(blob instanceof Blob)) {
        toastError("Invalid PDF response");
        return;
      }
      const contentType =
        response?.headers?.["content-type"] || blob.type || "";
      if (blob.size < 100 || contentType.includes("json")) {
        const text = await blob.text();
        const err = text
          ? (() => {
              try {
                const j = JSON.parse(text);
                return j?.message || j?.error?.detail || text;
              } catch {
                return text;
              }
            })()
          : "Invalid PDF response";
        toastError(err);
        return;
      }
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation-${quotation.quotationCode || quotation.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toastSuccess("PDF downloaded");
    } catch (err) {
      toastError(err?.message || "Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const userRole = user?.role || getCurrentUserRole();
  const currentUserRole = normalizeUserRole(userRole);
  const isHodUser =
    currentUserRole === normalizeRole(ROLES.HEAD_OF_DEPARTMENT) ||
    currentUserRole === "hod";
  const canCreateQuotation =
    hasPermission("quotations", "create") || isSalesRole;
  const canUpdateQuotation =
    hasPermission("quotations", "update") || isSalesRole;
  const canDeleteQuotation =
    hasPermission("quotations", "delete") || isSalesRole;
  const canDeleteQuotationProduct = canDeleteQuotation;
  const canApproveAsHod = isHodUser && hasPermission("quotations", "update");
  const canCreatePurchaseOrder =
    hasPermission("purchase_orders", "create") ||
    canConvertQuotationToPo(userRole);
  const isHodApprovedStatus = displayQuotation?.status === "hod_approved";
  const canBypassPoHodApproval = isSalesRole || isHodUser;
  const canConvertToPo = isHodApprovedStatus || canBypassPoHodApproval;
  const currentProduct =
    products.length > 0
      ? products[Math.min(productIndex, products.length - 1)]
      : null;
  const isCurrentProductNotAvailable = !!currentProduct?.notAvailable;

  const handleHodApproveQuotation = async () => {
    if (!quotation?.id || !canApproveAsHod || isHodApprovedStatus) return;
    setApprovingHod(true);
    try {
      const res = await quotationService.updateStatus(
        quotation.id,
        "hod_approved",
      );
      const data = res?.data?.data ?? res?.data ?? res;
      setQuotation((prev) =>
        mergeQuotationUpdateIntoPrev(prev, data, { status: "hod_approved" }),
      );
      toastSuccess("Quotation approved by HOD");
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to approve quotation",
      );
    } finally {
      setApprovingHod(false);
    }
  };

  const performConvertToPo = async () => {
    if (!quotation?.id) return;
    setConvertingPo(true);
    try {
      const res = await purchaseOrderService.createFromQuotation(quotation.id, {
        reuseExisting: true,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      const poId = data?._id || data?.id;
      if (!poId) {
        throw new Error("Sales order id not found in response");
      }
      toastSuccess("Sales order ready");
      navigate(`/po-bucket/${poId}`);
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to convert quotation to sales order",
      );
    } finally {
      setConvertingPo(false);
    }
  };

  const handleConvertToPoClick = () => {
    if (
      !quotation?.id ||
      !canCreatePurchaseOrder ||
      isSnapshotPreview ||
      !canConvertToPo
    ) {
      if (quotation?.id && canCreatePurchaseOrder && !canConvertToPo) {
        toastError(
          "Convert to Sales Order is available only after HOD approval",
        );
      }
      return;
    }
    setConvertPoModalStep("confirm");
    setConvertPoSecretInput("");
    setConvertPoModalVisible(true);
  };

  const closeConvertPoModals = () => {
    setConvertPoModalVisible(false);
    setConvertPoModalStep("confirm");
    setConvertPoSecretInput("");
  };

  const onConvertPoConfirmYes = () => {
    setConvertPoSecretInput("");
    setConvertPoModalStep("secret");
  };

  const submitConvertPoSecret = () => {
    if (convertingPo) return;
    const entered = String(convertPoSecretInput ?? "").trim();
    if (entered !== PO_FROM_QUOTATION_SECRET_CODE) {
      toastError("Invalid code. Sales order was not created.");
      return;
    }
    closeConvertPoModals();
    performConvertToPo();
  };

  const openImageGallery = (images, startIndex = 0) => {
    if (!images?.length) return;
    setImageGalleryImages(images);
    setImageGalleryIndex(Math.min(startIndex, images.length - 1));
    setImageGalleryVisible(true);
  };

  const closeImageGallery = () => {
    setImageGalleryVisible(false);
    setImageGalleryImages([]);
    setImageGalleryIndex(0);
  };

  const imageGalleryPrev = () => {
    setImageGalleryIndex((i) =>
      i <= 0 ? imageGalleryImages.length - 1 : i - 1,
    );
  };

  const imageGalleryNext = () => {
    setImageGalleryIndex((i) =>
      i >= imageGalleryImages.length - 1 ? 0 : i + 1,
    );
  };

  useEffect(() => {
    if (!imageGalleryVisible || imageGalleryImages.length === 0) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        imageGalleryPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        imageGalleryNext();
      } else if (e.key === "Escape") closeImageGallery();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageGalleryVisible, imageGalleryImages.length]);

  const [expandedImages, setExpandedImages] = useState([]);
  const [expandedImageIndex, setExpandedImageIndex] = useState(0);

  const getImageUrl = (img) => {
    if (!img) return "";
    if (typeof img === "object" && img?.path) return getAssetsUrl(img.path);
    return typeof img === "string" ? img : "";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "partial":
        return (
          <CBadge
            color="warning"
            className="text-uppercase fw-semibold px-3 py-2"
          >
            Partial
          </CBadge>
        );
      case "approved":
        return (
          <CBadge
            color="success"
            className="text-uppercase fw-semibold px-3 py-2"
          >
            Approved
          </CBadge>
        );
      case "draft":
        return (
          <CBadge
            color="secondary"
            className="text-uppercase fw-semibold px-3 py-2"
          >
            Draft
          </CBadge>
        );
      case "hod_approved":
        return (
          <CBadge
            color="success"
            className="text-uppercase fw-semibold px-3 py-2"
          >
            Approved
          </CBadge>
        );
      case "sent":
      case "sentToClient":
        return (
          <CBadge color="info" className="text-uppercase fw-semibold px-3 py-2">
            Sent
          </CBadge>
        );
      case "accepted":
        return (
          <CBadge
            color="success"
            className="text-uppercase fw-semibold px-3 py-2"
          >
            Accepted
          </CBadge>
        );
      case "rejected":
        return (
          <CBadge
            color="danger"
            className="text-uppercase fw-semibold px-3 py-2"
          >
            Rejected
          </CBadge>
        );
      case "expired":
        return (
          <CBadge
            color="warning"
            className="text-uppercase fw-semibold px-3 py-2"
          >
            Expired
          </CBadge>
        );
      default:
        return (
          <CBadge
            color="secondary"
            className="text-uppercase fw-semibold px-3 py-2"
          >
            {status}
          </CBadge>
        );
    }
  };

  if (!quotation) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Quotation not found</h4>
          <CButton color="primary" onClick={() => navigate("/quotations")}>
            Back to Quotations
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <>
      <CCard
        className="mb-4 border-0 shadow-sm"
        style={{ borderRadius: 12, backgroundColor: "#f8f9fb" }}
      >
        <CCardBody className="p-3 p-md-4">
          {/* Row 1: quotation id / status + summary */}
          <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3 mb-3">
            <div
              className="fw-bold text-primary px-3 py-2 rounded-pill border"
              style={{
                fontSize: "1rem",
                letterSpacing: "0.3px",
                backgroundColor: "#eef4ff",
              }}
            >
              {quotation.quotationCode ||
                `QT-${String(quotation.id).slice(-6)}`}
              {snapshotPreview?.snapshotCode ? (
                <span className="ms-2 small text-secondary fw-normal">
                  ({snapshotPreview.snapshotCode})
                </span>
              ) : null}
            </div>
            <div
              className="d-flex flex-wrap align-items-center justify-content-lg-end gap-2 gap-md-3"
              style={{ minWidth: 0 }}
            >
              {getStatusBadge(displayQuotation?.status)}
              <span
                className="text-nowrap fw-semibold text-secondary px-2 py-1 rounded border"
                style={{ backgroundColor: "#ffffff" }}
              >
                Total: {products.length}
              </span>
              <span
                className="text-nowrap fw-semibold text-success px-2 py-1 rounded border"
                style={{ backgroundColor: "#ffffff" }}
              >
                With Rate: {productsWithRate.length}
              </span>
              <span
                className="text-nowrap fw-semibold px-2 py-1 rounded border"
                style={{ color: "#fd7e14", backgroundColor: "#ffffff" }}
              >
                Without Rate: {productsWithoutRate.length}
              </span>
            </div>
          </div>

          {/* Row 2: back + actions */}
          <div
            className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 gap-md-3 pt-3"
            style={{ borderTop: "1px solid #e9ecef" }}
          >
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => navigate("/quotations")}
              className="d-inline-flex align-items-center px-3"
              style={{ height: 40 }}
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back to Quotations
            </CButton>

            <div className="d-flex flex-wrap justify-content-md-end align-items-center gap-2">
              <CButton
                color="dark"
                variant="outline"
                onClick={() => setQuoteLogsOpen((prev) => !prev)}
                className="d-inline-flex align-items-center px-3"
                style={{ height: 40 }}
              >
                {quoteLogsOpen ? "Hide Quote Logs" : "Show Quote Logs"}
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                onClick={handleDownloadProductsPdf}
                disabled={exportingPdf || isSnapshotPreview || !canDownloadPdf}
                title={
                  canDownloadPdf ? "Download PDF" : pdfDownloadDisabledTitle
                }
                className="d-inline-flex align-items-center px-3"
                style={{ height: 40 }}
              >
                {exportingPdf && <CSpinner size="sm" className="me-2" />}
                {!exportingPdf && (
                  <CIcon icon={cilCloudDownload} className="me-2" />
                )}
                {exportingPdf ? "Generating PDF..." : "Download PDF"}
              </CButton>
              {canCreatePurchaseOrder ? (
                <CButton
                  color="success"
                  variant="outline"
                  disabled={
                    convertingPo || isSnapshotPreview || !canConvertToPo
                  }
                  onClick={handleConvertToPoClick}
                  className="d-inline-flex align-items-center px-3"
                  style={{ height: 40 }}
                  title={
                    canConvertToPo
                      ? "Convert quotation to sales order"
                      : "Convert to Sales Order is available after HOD approval"
                  }
                >
                  {convertingPo ? "Converting..." : "Convert to Sales Order"}
                </CButton>
              ) : null}
              {canApproveAsHod ? (
                <CButton
                  color={isHodApprovedStatus ? "success" : "warning"}
                  variant={isHodApprovedStatus ? "outline" : undefined}
                  disabled={
                    approvingHod || isSnapshotPreview || isHodApprovedStatus
                  }
                  onClick={handleHodApproveQuotation}
                  className="d-inline-flex align-items-center px-3"
                  style={{ height: 40 }}
                  title={
                    isHodApprovedStatus
                      ? "Already HOD approved"
                      : "Approve quotation as HOD"
                  }
                >
                  {approvingHod && <CSpinner size="sm" className="me-2" />}
                  {isHodApprovedStatus
                    ? "HOD Approved"
                    : approvingHod
                      ? "Approving..."
                      : "Approve (HOD)"}
                </CButton>
              ) : null}
            </div>
          </div>
        </CCardBody>
      </CCard>

      {isSnapshotPreview ? (
        <CAlert
          color="info"
          className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 mb-4"
        >
          <span>
            Viewing saved snapshot{" "}
            <strong>{snapshotPreview.snapshotCode}</strong>
            {snapshotPreview.capturedAt ? (
              <span className="text-muted ms-md-2 d-block d-md-inline">
                ({formatIstDisplayDate(snapshotPreview.capturedAt)})
              </span>
            ) : null}
            . Other tabs show this snapshot data (read-only).
          </span>
          <CButton
            color="dark"
            variant="outline"
            size="sm"
            className="text-nowrap"
            onClick={() => setSnapshotPreview(null)}
          >
            Back to current quotation
          </CButton>
        </CAlert>
      ) : null}

      <CCard className="mb-4">
        <CCardHeader
          className="border-bottom"
          style={{ backgroundColor: "#fbfcfe" }}
        >
          <CNav variant="tabs" role="tablist" className="gap-2">
            <CNavItem>
              <CNavLink
                active={activeTab === "preview"}
                onClick={() => setActiveTab("preview")}
                style={{
                  cursor: "pointer",
                  border: "none",
                  borderBottom:
                    activeTab === "preview"
                      ? "2px solid #321fdb"
                      : "2px solid transparent",
                  color: activeTab === "preview" ? "#321fdb" : "#6c757d",
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Preview
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === "company"}
                onClick={() => setActiveTab("company")}
                style={{
                  cursor: "pointer",
                  border: "none",
                  borderBottom:
                    activeTab === "company"
                      ? "2px solid #321fdb"
                      : "2px solid transparent",
                  color: activeTab === "company" ? "#321fdb" : "#6c757d",
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Company Information
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === "freightPacking"}
                onClick={() => setActiveTab("freightPacking")}
                style={{
                  cursor: "pointer",
                  border: "none",
                  borderBottom:
                    activeTab === "freightPacking"
                      ? "2px solid #321fdb"
                      : "2px solid transparent",
                  color: activeTab === "freightPacking" ? "#321fdb" : "#6c757d",
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Freight &amp; Packing Charge
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === "products"}
                onClick={() => setActiveTab("products")}
                style={{
                  cursor: "pointer",
                  border: "none",
                  borderBottom:
                    activeTab === "products"
                      ? "2px solid #321fdb"
                      : "2px solid transparent",
                  color: activeTab === "products" ? "#321fdb" : "#6c757d",
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Product
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === "addNewProduct"}
                onClick={() => setActiveTab("addNewProduct")}
                style={{
                  cursor: "pointer",
                  border: "none",
                  borderBottom:
                    activeTab === "addNewProduct"
                      ? "2px solid #321fdb"
                      : "2px solid transparent",
                  color: activeTab === "addNewProduct" ? "#321fdb" : "#6c757d",
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Add New Product
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === "productList"}
                onClick={() => setActiveTab("productList")}
                style={{
                  cursor: "pointer",
                  border: "none",
                  borderBottom:
                    activeTab === "productList"
                      ? "2px solid #321fdb"
                      : "2px solid transparent",
                  color: activeTab === "productList" ? "#321fdb" : "#6c757d",
                  fontWeight: 600,
                  paddingInline: 10,
                }}
              >
                Product List ({products.length})
              </CNavLink>
            </CNavItem>
          </CNav>
        </CCardHeader>
        <CCardBody>
          <CTabContent>
            {/* Tab 0: Preview - read-only full quotation */}
            <CTabPane visible={activeTab === "preview"}>
              <CCard className="mb-4">
                <CCardHeader className="bg-light">
                  <strong>Quotation Preview</strong> — matches PDF layout
                  (read-only)
                </CCardHeader>
                <CCardBody>
                  {/* Fixed Migti header (same as PDF) */}
                  <div className="mb-4 pb-3 border-bottom">
                    <CRow className="align-items-center">
                      <CCol md={3} className="mb-3 mb-md-0">
                        <img
                          src="https://migti.co.in/assets/images/logo.png"
                          alt=""
                          style={{
                            width: 100,
                            maxHeight: 50,
                            objectFit: "contain",
                          }}
                          onError={(e) => {
                            if (e?.target) e.target.style.display = "none";
                          }}
                        />
                      </CCol>
                      <CCol md={9} className="text-center">
                        <h5 className="mb-1 fw-bold">
                          Migti Industrial Pvt Ltd
                        </h5>
                        <div className="small">
                          <span className="fw-semibold">GST No.</span>{" "}
                          23AARCM4143L1Z6 &nbsp;|&nbsp; 3rd Floor, M.S.-1,
                          B-304, New Siyaganj, Indore, Madhya Pradesh 452003
                        </div>
                        <div className="small">
                          <span className="fw-semibold">Contact:</span> +91
                          7898611052 &nbsp;|&nbsp; sale.migtiindore@gmail.com
                        </div>
                      </CCol>
                    </CRow>
                  </div>

                  {/* Customer & shipping details (same structure as PDF) */}
                  <div className="mb-4">
                    <h6 className="text-muted text-uppercase small mb-2">
                      Customer &amp; Shipping Details
                    </h6>
                    <CRow>
                      <CCol md={7} className="mb-3 mb-md-0">
                        <h6 className="fw-semibold mb-2">Customer Details</h6>
                        <CTable bordered responsive small className="mb-0">
                          <CTableBody>
                            <CTableRow>
                              <CTableHeaderCell
                                scope="row"
                                className="bg-light"
                                style={{ width: "32%" }}
                              >
                                Customer Name
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.name ||
                                  displayQuotation?.customerName ||
                                  "–"}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell
                                scope="row"
                                className="bg-light"
                              >
                                Address
                              </CTableHeaderCell>
                              <CTableDataCell
                                style={{ whiteSpace: "pre-wrap" }}
                              >
                                {companyForm.address ||
                                  displayQuotation?.companyInfo?.address ||
                                  "–"}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell
                                scope="row"
                                className="bg-light"
                              >
                                Contact Person
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.purchaseManagerName ||
                                  displayQuotation?.companyInfo
                                    ?.purchaseManagers?.[0]?.name ||
                                  displayQuotation?.industry_id
                                    ?.purchase_manager_name ||
                                  "–"}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell
                                scope="row"
                                className="bg-light"
                              >
                                Phone
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.purchaseManagerPhone ||
                                  displayQuotation?.companyInfo
                                    ?.purchaseManagers?.[0]?.phone ||
                                  displayQuotation?.industry_id
                                    ?.purchase_manager_phone ||
                                  "–"}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell
                                scope="row"
                                className="bg-light"
                              >
                                Email
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.purchaseManagerEmail ||
                                  displayQuotation?.companyInfo
                                    ?.purchaseManagers?.[0]?.email ||
                                  displayQuotation?.companyInfo?.email ||
                                  displayQuotation?.industry_id?.email ||
                                  displayQuotation?.customerEmail ||
                                  "–"}
                              </CTableDataCell>
                            </CTableRow>
                            <CTableRow>
                              <CTableHeaderCell
                                scope="row"
                                className="bg-light"
                              >
                                GST Number
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {displayQuotation?.companyInfo?.gstNumber ||
                                  displayQuotation?.industry_id?.gstNumber ||
                                  "–"}
                              </CTableDataCell>
                            </CTableRow>
                          </CTableBody>
                        </CTable>
                      </CCol>
                      <CCol md={5}>
                        <h6 className="fw-semibold mb-2">Shipping Details</h6>
                        <CTable bordered responsive small className="mb-2">
                          <CTableBody>
                            <CTableRow>
                              <CTableHeaderCell
                                scope="row"
                                className="bg-light"
                              >
                                Contact Person
                              </CTableHeaderCell>
                              <CTableDataCell>
                                {companyForm.purchaseManagerName ||
                                  displayQuotation?.companyInfo
                                    ?.purchaseManagers?.[0]?.name ||
                                  displayQuotation?.industry_id
                                    ?.purchase_manager_name ||
                                  "–"}
                              </CTableDataCell>
                            </CTableRow>
                          </CTableBody>
                        </CTable>
                        <div className="mt-2 pt-2 border-top small">
                          <div>
                            <span className="fw-semibold">Quotation Code:</span>{" "}
                            {quotation?.quotationCode ||
                              `QT-${String(quotation?.id || "").slice(-6)}` ||
                              "–"}
                          </div>
                          {(snapshotPreview?.capturedAt ||
                            quotation?.createdAt) && (
                            <div className="mt-1">
                              <span className="fw-semibold">
                                Quotation Date:
                              </span>{" "}
                              {snapshotPreview?.capturedAt
                                ? formatIstDisplayDate(
                                    snapshotPreview.capturedAt,
                                  )
                                : formatIstDisplayDate(quotation.createdAt)}
                            </div>
                          )}
                          {queryId && (
                            <div className="mt-1">
                              <span className="fw-semibold">
                                Related Query:
                              </span>{" "}
                              <CButton
                                color="link"
                                className="p-0 align-baseline"
                                onClick={() => navigate(`/queries/${queryId}`)}
                              >
                                View Query
                              </CButton>
                            </div>
                          )}
                        </div>
                      </CCol>
                    </CRow>
                  </div>

                  {/* Quotation details table (mirror PDF columns) */}
                  <div className="mb-4" style={{ fontSize: "0.8rem" }}>
                    <h6 className="text-muted text-uppercase small mb-2">
                      Quotation Details
                    </h6>
                    {products.length > 0 ? (
                      <CTable responsive bordered size="sm">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell className="text-center">
                              S.N.
                            </CTableHeaderCell>
                            <CTableHeaderCell>
                              Item Name &amp; Description
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              Variants
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              HSN Code
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-end">
                              Unit Price
                            </CTableHeaderCell>
                            {hasDiscountColumn && (
                              <CTableHeaderCell className="text-end">
                                Discount
                              </CTableHeaderCell>
                            )}
                            <CTableHeaderCell className="text-center">
                              Qty.
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              Unit
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              Delivery Within
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              GST %
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-end">
                              Total
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-center">
                              Photo
                            </CTableHeaderCell>
                            <CTableHeaderCell>Reason</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {products.map((p, index) => {
                            const productRef =
                              typeof p.product_id === "object"
                                ? p.product_id
                                : null;
                            const imagesFromProd = Array.isArray(p.images)
                              ? p.images
                              : [];
                            const imagesFromRef = Array.isArray(
                              productRef?.images,
                            )
                              ? productRef.images
                              : [];
                            const allImages =
                              imagesFromProd.length > 0
                                ? imagesFromProd
                                : imagesFromRef;
                            const firstImg = allImages[0] || null;
                            const qty = Number(p.quantity) || 0;
                            const rate = Number(p.rate) || 0;
                            const beforeDiscount = qty * rate;

                            let discountAmount = 0;
                            if (
                              !p.notAvailable &&
                              p.applyDiscount &&
                              (p.discountPercentage != null ||
                                p.discountAmount != null)
                            ) {
                              if (p.discountPercentage != null) {
                                discountAmount =
                                  beforeDiscount *
                                  (Number(p.discountPercentage) / 100);
                              } else if (p.discountAmount != null) {
                                discountAmount = Number(p.discountAmount) || 0;
                              }
                            }

                            const taxable = Math.max(
                              0,
                              beforeDiscount - discountAmount,
                            );
                            const gstPercent =
                              typeof p.gstPercentage === "number" &&
                              !Number.isNaN(p.gstPercentage)
                                ? p.gstPercentage
                                : typeof productRef?.gstPercentage ===
                                      "number" &&
                                    !Number.isNaN(productRef.gstPercentage)
                                  ? productRef.gstPercentage
                                  : DEFAULT_GST_PERCENTAGE;
                            const hsn =
                              p.hsnNumber || productRef?.hsnNumber || "–";
                            const variantsText = formatVariants(
                              p.variants || [],
                            );
                            const descriptionText = (
                              p.description ||
                              productRef?.shortDescription ||
                              ""
                            ).trim();
                            const isNotAvailable = !!p.notAvailable;
                            const reasonText = isNotAvailable
                              ? p.notAvailableRemark || "Not available"
                              : "–";

                            const rowTotal = isNotAvailable ? 0 : taxable;

                            return (
                              <CTableRow key={index}>
                                <CTableDataCell className="text-center align-middle">
                                  {index + 1}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <div className="fw-semibold">
                                    {p.productName || "–"}
                                  </div>
                                  {descriptionText && (
                                    <div
                                      className="small text-muted"
                                      style={{ whiteSpace: "pre-wrap" }}
                                    >
                                      {descriptionText}
                                    </div>
                                  )}
                                  {p.remark && (
                                    <div className="small text-muted">
                                      {p.remark}
                                    </div>
                                  )}
                                  {isNotAvailable && (
                                    <div className="small text-danger">
                                      Not available
                                      {p.notAvailableRemark
                                        ? `: ${p.notAvailableRemark}`
                                        : ""}
                                    </div>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {variantsText}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {hsn}
                                </CTableDataCell>
                                <CTableDataCell className="text-end align-middle">
                                  {rate
                                    ? `₹${rate.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}`
                                    : ""}
                                </CTableDataCell>
                                {hasDiscountColumn && (
                                  <CTableDataCell className="text-end align-middle">
                                    {p.applyDiscount &&
                                    p.discountPercentage != null
                                      ? `${Number(p.discountPercentage).toFixed(2)}%`
                                      : "–"}
                                  </CTableDataCell>
                                )}
                                <CTableDataCell className="text-center align-middle">
                                  {qty || ""}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {p.unit || ""}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {formatDeliveryWithinDisplay(p.deliveryDate)}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {gstPercent
                                    ? `${gstPercent.toFixed(2)}%`
                                    : "–"}
                                </CTableDataCell>
                                <CTableDataCell className="text-end align-middle">
                                  {rowTotal
                                    ? `₹${rowTotal.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}`
                                    : "–"}
                                </CTableDataCell>
                                <CTableDataCell className="text-center align-middle">
                                  {firstImg ? (
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      className="d-inline-block rounded overflow-hidden border"
                                      style={{
                                        width: 60,
                                        height: 60,
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        openImageGallery(allImages, 0)
                                      }
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          e.preventDefault();
                                          openImageGallery(allImages, 0);
                                        }
                                      }}
                                    >
                                      {getDocumentId(firstImg) ? (
                                        <AuthImage
                                          documentId={getDocumentId(firstImg)}
                                          fallbackUrl={getImageUrl(firstImg)}
                                          alt=""
                                          className="w-100 h-100"
                                          style={{ objectFit: "cover" }}
                                        />
                                      ) : (
                                        <CImage
                                          src={getImageUrl(firstImg)}
                                          alt=""
                                          className="w-100 h-100"
                                          style={{ objectFit: "cover" }}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted small">–</span>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell className="align-middle">
                                  {reasonText}
                                </CTableDataCell>
                              </CTableRow>
                            );
                          })}
                        </CTableBody>
                      </CTable>
                    ) : (
                      <p className="text-muted mb-0">
                        No products in this quotation.
                      </p>
                    )}
                  </div>

                  {/* Terms & summary (same as PDF footer area) */}
                  <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-4">
                    <div style={{ flex: "0 0 55%" }}>
                      <h6 className="fw-semibold mb-2">Terms And Conditions</h6>
                      <ul className="mb-0 small ps-3">
                        <li>
                          Validity – Offer valid for 2 days from quotation date.
                        </li>
                        <li>
                          Once delivered material will not be returned or
                          exchanged.
                        </li>
                        <li>Warranty as per company policy.</li>
                        <li>Payment terms – 100% advance with sales order.</li>
                        <li>Freight charges as actual.</li>
                        <li>Order once placed cannot be cancelled.</li>
                      </ul>
                    </div>
                    <div style={{ flex: "0 0 40%" }} className="ms-lg-auto">
                      <CTable bordered size="sm" className="mb-3">
                        <CTableBody>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Amount
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              ₹
                              {calculatedTotalTaxable.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Freight Charge
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              {formatQuotationFreightDisplay(
                                displayQuotation?.freightCharge,
                              )}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Packing Charge
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              ₹
                              {(
                                Number(displayQuotation?.packingCharge) || 0
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Expected Delivery Within
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              {displayQuotation?.expectedDeliveryWithinDays !=
                                null &&
                              !Number.isNaN(
                                Number(
                                  displayQuotation.expectedDeliveryWithinDays,
                                ),
                              )
                                ? `${Number(displayQuotation.expectedDeliveryWithinDays)} Days`
                                : "NA"}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              Total Taxable Amount
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              {(() => {
                                const freight = parseQuotationFreightNumeric(
                                  displayQuotation?.freightCharge,
                                );
                                const packing =
                                  Number(displayQuotation?.packingCharge) || 0;
                                const taxableAfterCharges =
                                  calculatedTotalTaxable + freight + packing;
                                return `₹${taxableAfterCharges.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}`;
                              })()}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end">
                              GST Amount
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end">
                              ₹
                              {calculatedTotalGst.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </CTableDataCell>
                          </CTableRow>
                          <CTableRow>
                            <CTableHeaderCell className="bg-light text-end fw-semibold">
                              Total Amount
                            </CTableHeaderCell>
                            <CTableDataCell className="text-end fw-semibold">
                              {(() => {
                                const freight = parseQuotationFreightNumeric(
                                  displayQuotation?.freightCharge,
                                );
                                const packing =
                                  Number(displayQuotation?.packingCharge) || 0;
                                const taxableAfterCharges =
                                  calculatedTotalTaxable + freight + packing;
                                const totalAmount =
                                  taxableAfterCharges + calculatedTotalGst;
                                return `₹${totalAmount.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}`;
                              })()}
                            </CTableDataCell>
                          </CTableRow>
                        </CTableBody>
                      </CTable>
                      <div className="text-end small">
                        {branchSignatureId || branchSignaturePath ? (
                          <div className="mb-1">
                            <AuthImage
                              documentId={branchSignatureId}
                              fallbackUrl={branchSignaturePath}
                              alt="Authorised signature"
                              style={{
                                maxHeight: 70,
                                maxWidth: 170,
                                objectFit: "contain",
                              }}
                            />
                          </div>
                        ) : null}
                        <div className="fw-semibold">
                          For Migti Industrial Pvt Ltd
                        </div>
                        <div>Authorised Signatory</div>
                      </div>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab 1: Company Information */}
            <CTabPane visible={activeTab === "company"}>
              <CCard className="mb-4">
                <CCardHeader>
                  <strong>Company Information</strong>
                </CCardHeader>
                <CCardBody>
                  <CRow>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Company name</CFormLabel>
                        <CFormInput
                          disabled
                          className="bg-light"
                          value={companyForm.name}
                          placeholder="Company name"
                        />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Location</CFormLabel>
                        <CFormInput
                          disabled
                          className="bg-light"
                          value={companyForm.location}
                          placeholder="Location"
                        />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Zone</CFormLabel>
                        <CFormInput
                          disabled
                          className="bg-light"
                          value={zoneNameDisplay ?? companyForm.area}
                          placeholder="Zone"
                        />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Address</CFormLabel>
                        <CFormTextarea
                          disabled
                          className="bg-light"
                          rows={3}
                          value={companyForm.address}
                          placeholder="Address"
                        />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Purchase manager name</CFormLabel>
                        <CFormInput
                          disabled
                          className="bg-light"
                          value={companyForm.purchaseManagerName}
                          placeholder="Name"
                        />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Purchase manager phone</CFormLabel>
                        <CFormInput
                          disabled
                          className="bg-light"
                          value={companyForm.purchaseManagerPhone}
                          placeholder="Phone"
                        />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Purchase manager email</CFormLabel>
                        <CFormInput
                          disabled
                          className="bg-light"
                          type="email"
                          value={companyForm.purchaseManagerEmail}
                          placeholder="Email"
                        />
                      </div>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>

              <CCard className="mb-0">
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <strong>Related Query</strong>
                  {queryId ? (
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => navigate(`/queries/${queryId}`)}
                    >
                      {relatedQueryLinkLabel}
                    </CButton>
                  ) : null}
                </CCardHeader>
                <CCardBody>
                  {queryId ? (
                    <p className="mb-0 text-muted">
                      {relatedQueryCode
                        ? `This quotation is linked to query ${relatedQueryCode}. Click the query number above to open it.`
                        : "This quotation is linked to a query. Click the link above to open it."}
                    </p>
                  ) : (
                    <p className="mb-0 text-muted">No related query.</p>
                  )}
                  {displayQuotation?.remark ? (
                    <div className="mt-3 pt-3 border-top">
                      <strong>Remark</strong>
                      <div className="mt-1">{displayQuotation.remark}</div>
                    </div>
                  ) : null}
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab: Freight & Packing Charge */}
            <CTabPane visible={activeTab === "freightPacking"}>
              <CCard className="mb-4">
                <CCardHeader>
                  <strong>Freight &amp; Packing Charge</strong>
                </CCardHeader>
                <CCardBody>
                  <CRow>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Freight</CFormLabel>
                        <CFormSelect
                          value={freightForm.freightMode}
                          disabled={isSnapshotPreview}
                          onChange={(e) =>
                            setFreightForm((prev) => ({
                              ...prev,
                              freightMode: e.target.value,
                              freightValue:
                                e.target.value === "other"
                                  ? prev.freightValue
                                  : "",
                            }))
                          }
                        >
                          <option value="actual">As per actual</option>
                          <option value="other">Other</option>
                        </CFormSelect>
                      </div>
                      {freightForm.freightMode === "other" && (
                        <div className="mb-3">
                          <CFormLabel>Freight amount</CFormLabel>
                          <CFormInput
                            type="number"
                            min={0}
                            value={freightForm.freightValue}
                            disabled={isSnapshotPreview}
                            onChange={(e) =>
                              setFreightForm((prev) => ({
                                ...prev,
                                freightValue: e.target.value,
                              }))
                            }
                            placeholder="Enter freight amount"
                          />
                        </div>
                      )}
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Packing charge</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          value={freightForm.packingCharge}
                          disabled={isSnapshotPreview}
                          onChange={(e) =>
                            setFreightForm((prev) => ({
                              ...prev,
                              packingCharge: e.target.value,
                            }))
                          }
                          placeholder="Enter packing charge"
                        />
                      </div>
                    </CCol>
                  </CRow>
                  <div className="mt-2">
                    <CButton
                      color="primary"
                      onClick={handleSaveFreightPacking}
                      disabled={savingFreight || isSnapshotPreview}
                    >
                      {savingFreight ? "Saving..." : "Save"}
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab: Single Product Edit */}
            <CTabPane visible={activeTab === "products"}>
              <CCard className="mb-4">
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <strong>Product Details</strong>
                  {products.length > 0 && (
                    <span className="text-muted small">
                      Product {Math.min(productIndex + 1, products.length)} of{" "}
                      {products.length}
                    </span>
                  )}
                </CCardHeader>
                <CCardBody>
                  {products.length === 0 || !editingProduct ? (
                    <p className="text-muted mb-0">
                      No products in this quotation.
                    </p>
                  ) : (
                    <>
                      {isCurrentProductNotAvailable && (
                        <div className="alert alert-warning py-2 px-3 mb-3">
                          This product is marked as not available in Product
                          List. Revoke it there to edit this product again.
                        </div>
                      )}
                      <CRow className="g-3 align-items-start">
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>Product Name</CFormLabel>
                            <CFormInput
                              disabled
                              className="bg-light"
                              value={editingProduct.productName || ""}
                              placeholder="Product name"
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Description</CFormLabel>
                            <CFormTextarea
                              rows={3}
                              value={editingProduct.description || ""}
                              onChange={(e) =>
                                updateFormField("description", e.target.value)
                              }
                              placeholder="Description"
                              disabled={
                                isSnapshotPreview ||
                                isCurrentProductNotAvailable
                              }
                            />
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>Quantity</CFormLabel>
                            <CFormInput
                              type="number"
                              min={0}
                              value={editingProduct.quantity ?? ""}
                              onChange={(e) =>
                                updateFormField("quantity", e.target.value)
                              }
                              placeholder="Quantity"
                              disabled={
                                isSnapshotPreview ||
                                isCurrentProductNotAvailable
                              }
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Unit</CFormLabel>
                            <ProductUnitSelect
                              disabled
                              className="bg-light"
                              value={editingProduct.unit || ""}
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>GST %</CFormLabel>
                            <CFormInput
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={editingProduct.gstPercentage ?? ""}
                              onChange={(e) =>
                                updateFormField("gstPercentage", e.target.value)
                              }
                              placeholder="GST %"
                              disabled={
                                isSnapshotPreview ||
                                isCurrentProductNotAvailable
                              }
                            />
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>HSN Number</CFormLabel>
                            <CFormInput
                              disabled
                              className="bg-light"
                              value={editingProduct.hsnNumber || ""}
                              placeholder="HSN Number"
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Model Number</CFormLabel>
                            <CFormInput
                              disabled
                              className="bg-light"
                              value={editingProduct.modelNumber || ""}
                              placeholder="Model Number"
                            />
                          </div>
                          <div className="mb-3">
                            <CFormLabel>Remark</CFormLabel>
                            <CFormInput
                              value={editingProduct.remark || ""}
                              onChange={(e) =>
                                updateFormField("remark", e.target.value)
                              }
                              placeholder="Remark"
                              disabled={
                                isSnapshotPreview ||
                                isCurrentProductNotAvailable
                              }
                            />
                          </div>
                        </CCol>
                      </CRow>
                      <CRow className="mt-1">
                        <CCol md={12}>
                          <CFormLabel>Uploaded Images</CFormLabel>
                          {Array.isArray(editingProduct.images) &&
                          editingProduct.images.length > 0 ? (
                            <div className="d-flex flex-wrap gap-2 mb-3">
                              {editingProduct.images.map((img, index) => (
                                <div
                                  key={`edit-img-${index}`}
                                  className="border rounded overflow-hidden"
                                  style={{ width: 72, height: 72 }}
                                >
                                  {getDocumentId(img) ? (
                                    <AuthImage
                                      documentId={getDocumentId(img)}
                                      fallbackUrl={getImageUrl(img)}
                                      alt=""
                                      className="w-100 h-100"
                                      style={{ objectFit: "cover" }}
                                    />
                                  ) : (
                                    <CImage
                                      src={getImageUrl(img)}
                                      alt=""
                                      className="w-100 h-100"
                                      style={{ objectFit: "cover" }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="small text-muted mb-3">
                              No uploaded image for this product.
                            </div>
                          )}
                          <CFormInput
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={
                              isSnapshotPreview ||
                              uploadingProductImages ||
                              isCurrentProductNotAvailable
                            }
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              if (!files.length) return;
                              await uploadEditingProductImages(files);
                              e.target.value = "";
                            }}
                          />
                          <div className="small text-muted mt-1">
                            Upload additional image(s). Existing images cannot
                            be removed.
                          </div>
                        </CCol>
                      </CRow>
                      <div className="mt-4 d-flex flex-wrap gap-2">
                        <CButton
                          color="secondary"
                          variant="outline"
                          disabled={
                            updating ||
                            isSnapshotPreview ||
                            uploadingProductImages ||
                            productIndex <= 0
                          }
                          onClick={() =>
                            setProductIndex((i) => Math.max(0, i - 1))
                          }
                        >
                          <CIcon icon={cilArrowLeft} className="me-1" />
                          Previous
                        </CButton>
                        <CButton
                          color="primary"
                          disabled={
                            updating ||
                            isSnapshotPreview ||
                            uploadingProductImages ||
                            isCurrentProductNotAvailable ||
                            !canUpdateQuotation
                          }
                          onClick={handleUpdateProduct}
                        >
                          {updating ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Updating...
                            </>
                          ) : (
                            "Update"
                          )}
                        </CButton>
                        <CButton
                          color="info"
                          variant="outline"
                          disabled={
                            updating ||
                            isSnapshotPreview ||
                            uploadingProductImages ||
                            productIndex >= products.length - 1
                          }
                          onClick={handleNextProduct}
                        >
                          Next
                          <CIcon icon={cilArrowRight} className="ms-1" />
                        </CButton>
                      </div>
                    </>
                  )}
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab: Add New Product */}
            <CTabPane visible={activeTab === "addNewProduct"}>
              <CCard>
                <CCardHeader>
                  <strong>Add New Product</strong>
                </CCardHeader>
                <CCardBody>
                  <div className="mb-3">
                    <CFormLabel className="fw-semibold">
                      Product name{" "}
                      <span className="text-danger" aria-hidden="true">
                        *
                      </span>
                    </CFormLabel>
                    <CFormInput
                      value={newProductForm.productName}
                      onChange={(e) =>
                        updateNewProductForm("productName", e.target.value)
                      }
                      placeholder="Product name"
                    />
                  </div>

                  <h6 className="text-body-secondary text-uppercase small fw-semibold mb-3">
                    Classification
                  </h6>
                  <CRow className="g-3 align-items-end">
                    <CCol md={6}>
                      <div className="mb-3">
                        <CFormLabel>
                          Group
                          {createNewQueryProduct || queryId ? (
                            <span className="text-danger"> *</span>
                          ) : null}
                        </CFormLabel>
                        <CFormSelect
                          value={newProductForm.groupId || ""}
                          onChange={(e) =>
                            setNewProductForm((prev) => ({
                              ...prev,
                              groupId: e.target.value,
                              categoryId: "",
                            }))
                          }
                        >
                          <option value="">Choose group…</option>
                          {newProductGroups.map((g) => (
                            <option key={g._id} value={g._id}>
                              {g.name}
                            </option>
                          ))}
                        </CFormSelect>
                      </div>
                    </CCol>
                    <CCol md={6}>
                      <div className="mb-3">
                        <CFormLabel>
                          Category
                          {createNewQueryProduct || queryId ? (
                            <span className="text-danger"> *</span>
                          ) : null}
                        </CFormLabel>
                        <CFormSelect
                          value={newProductForm.categoryId || ""}
                          onChange={(e) =>
                            updateNewProductForm("categoryId", e.target.value)
                          }
                          disabled={
                            (createNewQueryProduct || queryId) &&
                            !newProductForm.groupId
                          }
                        >
                          <option value="">
                            {(createNewQueryProduct || queryId) &&
                            !newProductForm.groupId
                              ? "Pick a group first"
                              : "Choose category…"}
                          </option>
                          {newProductCategories.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </CFormSelect>
                      </div>
                    </CCol>
                  </CRow>

                  {queryId ? (
                    <div className="small text-muted mb-3">
                      Product will also be added to query{" "}
                      {relatedQueryCode || "products"} in the Pro Bucket.
                    </div>
                  ) : null}

                  <div className="mb-3">
                    <CFormLabel>Description</CFormLabel>
                    <CFormTextarea
                      rows={3}
                      value={newProductForm.description}
                      onChange={(e) =>
                        updateNewProductForm("description", e.target.value)
                      }
                      placeholder="Description"
                    />
                  </div>

                  <h6 className="text-body-secondary text-uppercase small fw-semibold mb-3">
                    Quantity
                  </h6>
                  <CRow className="g-3 align-items-end">
                    <CCol sm={6} md={4}>
                      <div className="mb-3">
                        <CFormLabel>
                          Qty{" "}
                          <span className="text-danger" aria-hidden="true">
                            *
                          </span>
                        </CFormLabel>
                        <CFormInput
                          type="number"
                          min={1}
                          value={newProductForm.quantity}
                          onChange={(e) =>
                            updateNewProductForm("quantity", e.target.value)
                          }
                          placeholder="Quantity"
                        />
                      </div>
                    </CCol>
                    <CCol sm={6} md={4}>
                      <div className="mb-3">
                        <CFormLabel>Unit</CFormLabel>
                        <ProductUnitSelect
                          value={newProductForm.unit}
                          onChange={(e) =>
                            updateNewProductForm("unit", e.target.value)
                          }
                        />
                      </div>
                    </CCol>
                  </CRow>

                  <h6 className="text-body-secondary text-uppercase small fw-semibold mb-3">
                    Product details
                  </h6>
                  <CRow className="g-3 align-items-end">
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>HSN Number</CFormLabel>
                        <CFormInput
                          value={newProductForm.hsnNumber}
                          onChange={(e) =>
                            updateNewProductForm("hsnNumber", e.target.value)
                          }
                          placeholder="HSN"
                        />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>Model Number</CFormLabel>
                        <CFormInput
                          value={newProductForm.modelNumber}
                          onChange={(e) =>
                            updateNewProductForm("modelNumber", e.target.value)
                          }
                          placeholder="Model"
                        />
                      </div>
                    </CCol>
                    <CCol md={4}>
                      <div className="mb-3">
                        <CFormLabel>GST %</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          max={100}
                          value={newProductForm.gstPercentage}
                          onChange={(e) =>
                            updateNewProductForm(
                              "gstPercentage",
                              e.target.value,
                            )
                          }
                          placeholder="GST %"
                        />
                      </div>
                    </CCol>
                  </CRow>

                  <div className="mb-3">
                    <CFormLabel>Remark</CFormLabel>
                    <CFormInput
                      value={newProductForm.remark}
                      onChange={(e) =>
                        updateNewProductForm("remark", e.target.value)
                      }
                      placeholder="Remark"
                    />
                  </div>

                  <h6 className="text-body-secondary text-uppercase small fw-semibold mb-3">
                    Images
                  </h6>
                  <CRow className="g-3 align-items-start">
                    <CCol md={6}>
                      <div className="mb-3">
                        <CFormLabel>Upload Images</CFormLabel>
                        <CFormInput
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setNewProductImageFiles((prev) => [
                              ...prev,
                              ...files,
                            ]);
                            setNewProductImagePreviews((prev) => [
                              ...prev,
                              ...files.map((f) => URL.createObjectURL(f)),
                            ]);
                          }}
                        />
                        {newProductImagePreviews.length > 0 && (
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {newProductImagePreviews.map((src, idx) => (
                              <CImage
                                key={idx}
                                src={src}
                                alt=""
                                width={48}
                                height={48}
                                className="border rounded"
                                style={{ objectFit: "cover" }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </CCol>
                    <CCol md={6} className="d-flex align-items-end">
                      <div className="mb-3">
                        <CFormCheck
                          id="create-new-query-product"
                          label="Create New Query Product (same as in Query)"
                          checked={!!createNewQueryProduct}
                          onChange={(e) =>
                            setCreateNewQueryProduct(e.target.checked)
                          }
                        />
                      </div>
                    </CCol>
                  </CRow>
                  <div className="mt-3">
                    {canCreateQuotation ? (
                      <CButton
                        color="primary"
                        onClick={handleAddNewProduct}
                        disabled={addingNewProduct || isSnapshotPreview}
                      >
                        {addingNewProduct ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Adding...
                          </>
                        ) : (
                          "Add Product"
                        )}
                      </CButton>
                    ) : null}
                  </div>
                </CCardBody>
              </CCard>
            </CTabPane>

            {/* Tab 3: Product List - bordered table */}
            <CTabPane visible={activeTab === "productList"}>
              <div style={{ fontSize: "0.9rem" }}>
                {products.length > 0 ? (
                  <>
                    <CTable responsive hover bordered className="table-fixed">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 40 }}
                          >
                            #
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            style={{ width: 140, maxWidth: 180 }}
                          >
                            Product name / Description
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 52 }}
                          >
                            Qty
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 56 }}
                          >
                            Unit
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 120 }}
                          >
                            Delivery within
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 72 }}
                          >
                            HSN
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 72 }}
                          >
                            Model
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 82 }}
                          >
                            GST %
                          </CTableHeaderCell>
                          {queryId ? (
                            <CTableHeaderCell
                              className="text-center"
                              style={{ width: 140 }}
                            >
                              Procurement rate
                            </CTableHeaderCell>
                          ) : null}
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 160 }}
                          >
                            Images
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 101 }}
                          >
                            Rate (₹)
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 85 }}
                          >
                            Discount
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 112 }}
                          >
                            Total (₹)
                          </CTableHeaderCell>
                          <CTableHeaderCell
                            className="text-center"
                            style={{ width: 100 }}
                          >
                            Actions
                          </CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {products.map((p, idx) => {
                          const productRef =
                            typeof p.product_id === "object"
                              ? p.product_id
                              : null;
                          const allImages = Array.isArray(p.images)
                            ? p.images
                            : productRef?.images || [];
                          const imageUrls = allImages
                            .map((img) => getImageUrl(img))
                            .filter((src) => !!src);
                          const desc = (
                            p.description ||
                            productRef?.shortDescription ||
                            p.remark ||
                            ""
                          ).trim();
                          const rateVal = getListRate(idx);
                          const totalVal = getListTotal(idx);
                          const hasRate =
                            !p.notAvailable &&
                            rateVal !== "" &&
                            rateVal != null &&
                            !Number.isNaN(Number(rateVal));
                          const rowBg = p.notAvailable
                            ? { backgroundColor: "#e9ecef" }
                            : hasRate
                              ? { backgroundColor: "#d4edda" }
                              : { backgroundColor: "#ffe8cc" };
                          const applyDiscount = getListApplyDiscount(idx);
                          const discountPctVal = getListDiscountPct(idx);
                          return (
                            <CTableRow key={idx} style={rowBg}>
                              <CTableDataCell className="text-center">
                                {idx + 1}
                              </CTableDataCell>
                              <CTableDataCell
                                style={{
                                  width: 140,
                                  maxWidth: 180,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                <div
                                  className="text-truncate"
                                  title={p.productName || ""}
                                >
                                  {p.productName || "–"}
                                </div>
                                {desc ? (
                                  <div
                                    className="small text-muted text-truncate"
                                    style={{
                                      fontSize: "0.8em",
                                      whiteSpace: "pre-wrap",
                                    }}
                                    title={String(desc)}
                                  >
                                    {String(desc).slice(0, 120)}
                                    {desc.length > 120 ? "…" : ""}
                                  </div>
                                ) : null}
                                {p.notAvailable &&
                                  (p.notAvailableRemark ? (
                                    <div
                                      className="small text-danger mt-1"
                                      title={p.notAvailableRemark}
                                    >
                                      Not available:{" "}
                                      {String(p.notAvailableRemark).slice(
                                        0,
                                        60,
                                      )}
                                      {p.notAvailableRemark.length > 60
                                        ? "…"
                                        : ""}
                                    </div>
                                  ) : (
                                    <div className="small text-danger mt-1">
                                      Not available
                                    </div>
                                  ))}
                              </CTableDataCell>
                              <CTableDataCell
                                className="text-center py-1 small"
                                style={{ width: 52 }}
                              >
                                {p.quantity ?? "–"}
                              </CTableDataCell>
                              <CTableDataCell
                                className="text-center py-1 small"
                                style={{ width: 56 }}
                              >
                                {p.unit || "–"}
                              </CTableDataCell>
                              <CTableDataCell className="text-center py-1">
                                <CFormSelect
                                  size="sm"
                                  className="form-control-sm"
                                  style={{
                                    width: 130,
                                    minHeight: 28,
                                    fontSize: "0.75rem",
                                  }}
                                  value={getListDeliveryWithin(idx).select}
                                  onChange={(e) =>
                                    setListDeliveryWithinSelect(
                                      idx,
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    !!p.notAvailable || isSnapshotPreview
                                  }
                                >
                                  <option value="">Select</option>
                                  {DELIVERY_WITHIN_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                  <option value={DELIVERY_WITHIN_OTHERS}>
                                    Others
                                  </option>
                                </CFormSelect>
                                {getListDeliveryWithin(idx).select ===
                                  DELIVERY_WITHIN_OTHERS && (
                                  <CFormInput
                                    type="text"
                                    size="sm"
                                    className="form-control-sm mt-1"
                                    style={{
                                      width: 130,
                                      minHeight: 28,
                                      fontSize: "0.75rem",
                                    }}
                                    value={getListDeliveryWithin(idx).other}
                                    onChange={(e) =>
                                      setListDeliveryWithinOther(
                                        idx,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Enter delivery time"
                                    disabled={
                                      !!p.notAvailable || isSnapshotPreview
                                    }
                                  />
                                )}
                              </CTableDataCell>
                              <CTableDataCell className="small text-center py-1">
                                {productRef?.hsnNumber || p.hsnNumber || "–"}
                              </CTableDataCell>
                              <CTableDataCell className="small text-center">
                                {productRef?.modelNumber ||
                                  productRef?.defaultModelNumber ||
                                  p.modelNumber ||
                                  "–"}
                              </CTableDataCell>
                              <CTableDataCell className="text-center py-1">
                                <CFormInput
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="0.01"
                                  size="sm"
                                  className="form-control-sm"
                                  style={{
                                    width: 109,
                                    minHeight: 28,
                                    fontSize: "0.75rem",
                                  }}
                                  value={getListGst(idx)}
                                  onChange={(e) =>
                                    setListGst(idx, e.target.value)
                                  }
                                  placeholder="%"
                                  title="GST % (required, 0–100)"
                                  disabled={
                                    !!p.notAvailable || isSnapshotPreview
                                  }
                                />
                              </CTableDataCell>
                              {queryId ? (
                                <CTableDataCell className="text-center align-middle py-1">
                                  {String(p.rawProductCode ?? "").trim() ? (
                                    <CButton
                                      type="button"
                                      color="secondary"
                                      variant="ghost"
                                      size="sm"
                                      className="p-1"
                                      title="View procurement rates"
                                      aria-label="View procurement rates"
                                      onClick={() =>
                                        openProcurementRatesModal(
                                          p,
                                          idx,
                                          imageUrls,
                                        )
                                      }
                                    >
                                      <CIcon icon={cilList} size="lg" />
                                    </CButton>
                                  ) : (
                                    <span className="text-muted small">—</span>
                                  )}
                                </CTableDataCell>
                              ) : null}
                              <CTableDataCell className="text-center py-1">
                                {allImages.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center">
                                    {allImages.slice(0, 2).map((img, i) => (
                                      <div
                                        key={i}
                                        role="button"
                                        tabIndex={0}
                                        className="rounded overflow-hidden border"
                                        style={{
                                          width: 64,
                                          height: 64,
                                          cursor: "pointer",
                                        }}
                                        onClick={() =>
                                          openImageGallery(allImages, i)
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            e.preventDefault();
                                            openImageGallery(allImages, i);
                                          }
                                        }}
                                      >
                                        {getDocumentId(img) ? (
                                          <AuthImage
                                            documentId={getDocumentId(img)}
                                            fallbackUrl={getImageUrl(img)}
                                            alt=""
                                            className="w-100 h-100"
                                            style={{ objectFit: "cover" }}
                                          />
                                        ) : (
                                          <CImage
                                            src={getImageUrl(img)}
                                            alt=""
                                            className="w-100 h-100"
                                            style={{ objectFit: "cover" }}
                                          />
                                        )}
                                      </div>
                                    ))}
                                    {allImages.length > 2 && (
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        className="d-flex align-items-center justify-content-center rounded border bg-light text-primary fw-bold"
                                        style={{
                                          width: 64,
                                          height: 64,
                                          fontSize: "1.25rem",
                                          cursor: "pointer",
                                        }}
                                        onClick={() =>
                                          openImageGallery(allImages, 2)
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            e.preventDefault();
                                            openImageGallery(allImages, 2);
                                          }
                                        }}
                                        title={`${allImages.length - 2} more`}
                                      >
                                        +
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted small">–</span>
                                )}
                              </CTableDataCell>
                              <CTableDataCell className="text-center py-1">
                                <CFormInput
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  size="sm"
                                  className="form-control-sm"
                                  style={{
                                    width: 140,
                                    minHeight: 28,
                                    fontSize: "0.75rem",
                                  }}
                                  value={rateVal}
                                  onChange={(e) =>
                                    setListRate(idx, e.target.value)
                                  }
                                  placeholder="Rate"
                                  disabled={
                                    !!p.notAvailable || isSnapshotPreview
                                  }
                                />
                              </CTableDataCell>
                              <CTableDataCell className="text-center py-1">
                                <div className="d-flex align-items-center gap-1 justify-content-center flex-wrap">
                                  <CFormCheck
                                    id={`discount-cb-${idx}`}
                                    checked={!!applyDiscount}
                                    onChange={(e) =>
                                      setListApplyDiscount(
                                        idx,
                                        e.target.checked,
                                      )
                                    }
                                    disabled={
                                      !!p.notAvailable || isSnapshotPreview
                                    }
                                    style={{ cursor: "pointer" }}
                                  />
                                  <CFormLabel
                                    htmlFor={`discount-cb-${idx}`}
                                    className="mb-0 small"
                                    style={{
                                      fontSize: "0.75rem",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Apply
                                  </CFormLabel>
                                  {applyDiscount && (
                                    <CFormInput
                                      type="number"
                                      min={0}
                                      max={100}
                                      step="0.01"
                                      size="sm"
                                      className="form-control-sm"
                                      style={{ width: 72, fontSize: "0.75rem" }}
                                      value={discountPctVal}
                                      onChange={(e) =>
                                        setListDiscountPct(idx, e.target.value)
                                      }
                                      placeholder="%"
                                    />
                                  )}
                                </div>
                              </CTableDataCell>
                              <CTableDataCell className="text-center py-1">
                                <CFormInput
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  size="sm"
                                  className="form-control-sm"
                                  style={{
                                    width: 110,
                                    minHeight: 28,
                                    fontSize: "0.75rem",
                                  }}
                                  value={totalVal}
                                  onChange={(e) =>
                                    setListTotal(idx, e.target.value)
                                  }
                                  placeholder="Total"
                                  disabled={
                                    !!p.notAvailable || isSnapshotPreview
                                  }
                                />
                              </CTableDataCell>
                              <CTableDataCell className="text-center py-1">
                                <div className="d-flex flex-column gap-1 align-items-center">
                                  {!p.notAvailable ? (
                                    <>
                                      {canUpdateQuotation ? (
                                        <CButton
                                          color="warning"
                                          size="sm"
                                          className="w-100"
                                          style={{
                                            minWidth: 90,
                                            fontSize: "0.75rem",
                                          }}
                                          onClick={() => {
                                            setNotAvailableModalIndex(idx);
                                            const qid = quotation?.id;
                                            const fromSaved =
                                              products[idx]
                                                ?.notAvailableRemark || "";
                                            const draft =
                                              readNotAvailableReasonDraft(
                                                qid,
                                                idx,
                                              );
                                            setNotAvailableRemark(
                                              fromSaved || draft || "",
                                            );
                                            setNotAvailableModalVisible(true);
                                          }}
                                        >
                                          Not available
                                        </CButton>
                                      ) : null}
                                      {canUpdateQuotation ? (
                                        <CButton
                                          color="primary"
                                          size="sm"
                                          className="w-100"
                                          style={{
                                            minWidth: 90,
                                            fontSize: "0.75rem",
                                          }}
                                          onClick={() =>
                                            handleUpdateProductFromList(idx)
                                          }
                                          disabled={
                                            updating || isSnapshotPreview
                                          }
                                        >
                                          Update
                                        </CButton>
                                      ) : null}
                                      {canDeleteQuotationProduct ? (
                                        <CButton
                                          color="danger"
                                          size="sm"
                                          className="w-100"
                                          style={{
                                            minWidth: 90,
                                            fontSize: "0.75rem",
                                          }}
                                          onClick={() =>
                                            openDeleteProductModal(idx)
                                          }
                                          disabled={
                                            updating || isSnapshotPreview
                                          }
                                        >
                                          Delete
                                        </CButton>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      {canUpdateQuotation ? (
                                        <CButton
                                          color="success"
                                          size="sm"
                                          className="w-100"
                                          style={{
                                            minWidth: 90,
                                            fontSize: "0.75rem",
                                          }}
                                          onClick={() =>
                                            handleRevokeNotAvailable(idx)
                                          }
                                          disabled={
                                            updating || isSnapshotPreview
                                          }
                                        >
                                          Revoke
                                        </CButton>
                                      ) : null}
                                      {canUpdateQuotation ? (
                                        <CButton
                                          color="primary"
                                          size="sm"
                                          className="w-100"
                                          style={{
                                            minWidth: 90,
                                            fontSize: "0.75rem",
                                          }}
                                          onClick={() =>
                                            handleUpdateProductFromList(idx)
                                          }
                                          disabled={
                                            updating || isSnapshotPreview
                                          }
                                        >
                                          Update
                                        </CButton>
                                      ) : null}
                                      {canDeleteQuotationProduct ? (
                                        <CButton
                                          color="danger"
                                          size="sm"
                                          className="w-100"
                                          style={{
                                            minWidth: 90,
                                            fontSize: "0.75rem",
                                          }}
                                          onClick={() =>
                                            openDeleteProductModal(idx)
                                          }
                                          disabled={
                                            updating || isSnapshotPreview
                                          }
                                        >
                                          Delete
                                        </CButton>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </CTableDataCell>
                            </CTableRow>
                          );
                        })}
                      </CTableBody>
                    </CTable>
                    {products.length > 0 && (
                      <div className="mt-3 text-end border-top pt-3">
                        <p className="mb-1">
                          <strong>Total (Taxable):</strong> ₹
                          {calculatedTotalTaxable.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="mb-1">
                          <strong>GST Amount:</strong> ₹
                          {calculatedTotalGst.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="mb-0 fs-5">
                          <strong>Total Amount:</strong> ₹
                          {calculatedTotalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted mb-0">
                    No products in this quotation.
                  </p>
                )}
              </div>
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>
      <QuoteLogsSidebar
        refreshKey={quoteLogsRefreshKey}
        isOpen={quoteLogsOpen}
        onToggle={() => setQuoteLogsOpen((prev) => !prev)}
        showFloatingToggle={false}
      />

      <CModal
        visible={convertPoModalVisible}
        onClose={closeConvertPoModals}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>
            {convertPoModalStep === "confirm"
              ? "Create sales order?"
              : "Authorization"}
          </CModalTitle>
        </CModalHeader>
        {convertPoModalStep === "confirm" ? (
          <>
            <CModalBody>
              Do you want to create a sales order from this quotation?
            </CModalBody>
            <CModalFooter>
              <CButton
                type="button"
                color="secondary"
                onClick={closeConvertPoModals}
              >
                No
              </CButton>
              <CButton
                type="button"
                color="success"
                onClick={onConvertPoConfirmYes}
              >
                Yes
              </CButton>
            </CModalFooter>
          </>
        ) : (
          <>
            <CModalBody>
              <p className="text-muted small mb-2">
                Enter the secret code to create the sales order.
              </p>
              <CFormLabel htmlFor="convert-po-secret">Secret code</CFormLabel>
              <CFormInput
                id="convert-po-secret"
                type="password"
                autoComplete="off"
                autoFocus
                value={convertPoSecretInput}
                onChange={(e) => setConvertPoSecretInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitConvertPoSecret();
                }}
              />
            </CModalBody>
            <CModalFooter>
              <CButton
                type="button"
                color="secondary"
                onClick={() => {
                  setConvertPoModalStep("confirm");
                  setConvertPoSecretInput("");
                }}
              >
                Back
              </CButton>
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                onClick={closeConvertPoModals}
              >
                Cancel
              </CButton>
              <CButton
                type="button"
                color="primary"
                onClick={submitConvertPoSecret}
                disabled={convertingPo}
              >
                {convertingPo ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  "Create Sales Order"
                )}
              </CButton>
            </CModalFooter>
          </>
        )}
      </CModal>

      <CModal
        visible={assignTaskModalVisible}
        onClose={() => setAssignTaskModalVisible(false)}
      >
        <CModalHeader>
          <CModalTitle>Assign Task</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Target Rate (₹)</CFormLabel>
            <CFormInput
              type="number"
              min={0}
              step="0.01"
              placeholder="Optional"
              value={assignTaskTargetRate}
              onChange={(e) => setAssignTaskTargetRate(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Due Date</CFormLabel>
            <CFormInput
              type="date"
              placeholder="Optional"
              value={assignTaskDueDate}
              onChange={(e) => setAssignTaskDueDate(e.target.value)}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setAssignTaskModalVisible(false)}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleAssignTask}
            disabled={assigningTask || !canUpdateQuotation}
          >
            {assigningTask ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Assigning...
              </>
            ) : (
              "Assign"
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={imageGalleryVisible}
        onClose={closeImageGallery}
        alignment="center"
        size="xl"
      >
        <CModalHeader>
          <CModalTitle>Images</CModalTitle>
        </CModalHeader>
        <CModalBody
          className="d-flex align-items-center justify-content-center position-relative"
          style={{ minHeight: 320 }}
        >
          {imageGalleryImages.length > 0 && (
            <>
              <CButton
                color="light"
                className="position-absolute start-0 top-50 translate-middle-y rounded-circle shadow-sm"
                style={{ zIndex: 2, width: 48, height: 48 }}
                onClick={imageGalleryPrev}
                aria-label="Previous"
              >
                <CIcon icon={cilArrowLeft} />
              </CButton>
              <div
                className="flex-grow-1 d-flex justify-content-center align-items-center mx-5"
                style={{ maxHeight: "70vh" }}
              >
                <AuthImage
                  key={imageGalleryIndex}
                  documentId={getDocumentId(
                    imageGalleryImages[imageGalleryIndex],
                  )}
                  fallbackUrl={getImageUrl(
                    imageGalleryImages[imageGalleryIndex],
                  )}
                  alt=""
                  className="img-fluid"
                  style={{ maxHeight: "70vh", objectFit: "contain" }}
                />
              </div>
              <CButton
                color="light"
                className="position-absolute end-0 top-50 translate-middle-y rounded-circle shadow-sm"
                style={{ zIndex: 2, width: 48, height: 48 }}
                onClick={imageGalleryNext}
                aria-label="Next"
              >
                <CIcon icon={cilArrowRight} />
              </CButton>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <span className="me-auto text-muted small">
            {imageGalleryImages.length > 0
              ? `${imageGalleryIndex + 1} / ${imageGalleryImages.length}`
              : ""}
          </span>
          <CButton color="secondary" onClick={closeImageGallery}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={productListAssignModalVisible}
        onClose={() => setProductListAssignModalVisible(false)}
      >
        <CModalHeader>
          <CModalTitle>Assign Task to Selected Products</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Select Purchase Employee *</CFormLabel>
            <CFormSelect
              value={productListAssignEmployeeId}
              onChange={(e) => setProductListAssignEmployeeId(e.target.value)}
            >
              <option value="">-- Select Employee --</option>
              {purchaseEmployees.map((emp) => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name || emp.email || "–"}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="mb-3">
            <CFormLabel>Due Date</CFormLabel>
            <CFormInput
              type="date"
              value={productListAssignDueDate}
              onChange={(e) => setProductListAssignDueDate(e.target.value)}
            />
          </div>
          <p className="small text-muted mb-0">
            {productListSelectedIndices().length} product(s) selected. One task
            will be created per product.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setProductListAssignModalVisible(false)}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleProductListAssignTask}
            disabled={
              productListAssigningTask ||
              !productListAssignEmployeeId ||
              !canUpdateQuotation
            }
          >
            {productListAssigningTask ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Assigning...
              </>
            ) : (
              "Assign"
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={deleteProductModalVisible}
        onClose={() => {
          setDeleteProductModalVisible(false);
          setDeleteProductIndex(null);
        }}
      >
        <CModalHeader>
          <CModalTitle>Delete product</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this product from the quotation?
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setDeleteProductModalVisible(false);
              setDeleteProductIndex(null);
            }}
            disabled={updating || isSnapshotPreview}
          >
            Cancel
          </CButton>
          <CButton
            color="danger"
            onClick={handleConfirmDeleteProduct}
            disabled={
              updating || isSnapshotPreview || !canDeleteQuotationProduct
            }
          >
            {updating ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={procurementRatesModal.visible}
        onClose={() =>
          !procurementRatesModal.loading && closeProcurementRatesModal()
        }
        alignment="center"
        size="lg"
        scrollable
      >
        <CModalHeader closeButton>
          <CModalTitle>Procurement rates</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {procurementRatesModal.loading ? (
            <div className="text-center py-4">
              <CSpinner />
              <div className="small text-muted mt-2">Loading rates…</div>
            </div>
          ) : procurementRatesModal.error ? (
            <CAlert color="danger" className="mb-0">
              {procurementRatesModal.error}
            </CAlert>
          ) : (
            <>
              <div className="small text-muted mb-3">
                <strong>{procurementRatesModal.productLabel}</strong>
                {procurementRatesModal.rawProductCode ? (
                  <>
                    {" "}
                    · Code{" "}
                    <span className="text-body">
                      {procurementRatesModal.rawProductCode}
                    </span>
                  </>
                ) : null}{" "}
                · Line status{" "}
                {proBucketStatusBadge(procurementRatesModal.status)}
              </div>
              {procurementRatesModal.imageUrls?.length > 0 ? (
                <div className="mb-3">
                  <div className="small fw-semibold mb-2">Product images</div>
                  <div className="d-flex flex-wrap gap-2">
                    {procurementRatesModal.imageUrls.map((src, i) => (
                      <div
                        key={src || i}
                        role="button"
                        tabIndex={0}
                        className="rounded border overflow-hidden flex-shrink-0"
                        style={{ width: 72, height: 72, cursor: "pointer" }}
                        onClick={() =>
                          openImageGallery(procurementRatesModal.imageUrls, i)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openImageGallery(
                              procurementRatesModal.imageUrls,
                              i,
                            );
                          }
                        }}
                      >
                        <CImage
                          src={src}
                          width={72}
                          height={72}
                          className="object-fit-cover w-100 h-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {procurementRatesModal.rates.length === 0 ? (
                <p className="text-muted mb-0">
                  No Rates Available For This Product
                </p>
              ) : (
                <CTable responsive bordered hover className="mb-0 small">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">#</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Min rate</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Max rate</CTableHeaderCell>
                      <CTableHeaderCell scope="col">
                        Discount (%)
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col">Unit</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {procurementRatesModal.rates.map((r, i) => (
                      <CTableRow key={r._id || i}>
                        <CTableDataCell>{i + 1}</CTableDataCell>
                        <CTableDataCell>
                          {r.minRate != null && !Number.isNaN(Number(r.minRate))
                            ? Number(r.minRate)
                            : "—"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {r.maxRate != null && !Number.isNaN(Number(r.maxRate))
                            ? Number(r.maxRate)
                            : "—"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {r.discount != null &&
                          !Number.isNaN(Number(r.discount))
                            ? Number(r.discount)
                            : "—"}
                        </CTableDataCell>
                        <CTableDataCell>{r.unit || "—"}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={closeProcurementRatesModal}
            disabled={procurementRatesModal.loading}
          >
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={notAvailableModalVisible}
        onClose={() => {
          setNotAvailableModalVisible(false);
          setNotAvailableModalIndex(null);
          setNotAvailableRemark("");
        }}
      >
        <CModalHeader>
          <CModalTitle>Mark product as Not Available</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="text-muted small mb-2">
            Add a remark for why this product is not available. The product will
            be saved without a rate and you can still create the quotation.
          </p>
          <CFormLabel>Remark *</CFormLabel>
          <CFormTextarea
            rows={3}
            value={notAvailableRemark}
            onChange={(e) => {
              const v = e.target.value;
              setNotAvailableRemark(v);
              if (quotation?.id != null && notAvailableModalIndex != null) {
                persistNotAvailableReasonDraft(
                  quotation.id,
                  notAvailableModalIndex,
                  v,
                );
              }
            }}
            placeholder="e.g. Out of stock, discontinued, etc."
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              setNotAvailableModalVisible(false);
              setNotAvailableModalIndex(null);
              setNotAvailableRemark("");
            }}
          >
            Cancel
          </CButton>
          <CButton
            color="warning"
            onClick={handleSaveNotAvailable}
            disabled={
              updating ||
              isSnapshotPreview ||
              !notAvailableRemark.trim() ||
              !canUpdateQuotation
            }
          >
            {updating ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              "Save & mark Not available"
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default QuotationView;
