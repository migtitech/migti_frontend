import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  Trash2,
  Check,
  Download,
  Ban,
  MapPin,
  List,
  Building2,
  Users,
  FileText,
  FileBadge,
  Image as ImageIcon,
  Hash,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Checkbox,
  Label,
  Textarea,
  Spinner,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import { getAssetsUrl } from "../../api/endpoints";
import queryService from "../../services/queryService";
import bpDummy from "../../data/businessPartnerDummy";
import industryService from "../../services/industryService";
import industryContactPersonService from "../../services/industryContactPersonService";
import employeeService from "../../services/employeeService";
import userService from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import usePermissions, {
  normalizeRole,
  canEditQuery,
  isHodRole,
} from "../../hooks/usePermissions";
import { BackButton, ConfirmDialog, Loader } from "../../components";
import AuthImage from "../../components/AuthImage/AuthImage";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  QUERY_PRODUCT_QUOTATION_STATUS,
  filterProductsReadyForQuotation,
  isProductReadyForQuotation,
  getProductSubStatusLabel,
  isProductConvertedToQuotation,
} from "../../utils/queryProductQuotationStatus";

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

const getCurrentMonthLabel = () =>
  new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

const createEmptyCompanyAnalytics = (companyName = "—") => ({
  companyName: companyName || "—",
  pendingQueries: 0,
  totalQueries: 0,
  convertedToQuotationThisMonth: 0,
  monthLabel: getCurrentMonthLabel(),
  hasCompanyLink: false,
});

const normalizeCompanyAnalytics = (raw, fallbackCompanyName = "—") => ({
  companyName:
    String(raw?.companyName || fallbackCompanyName || "—").trim() || "—",
  pendingQueries: Number(raw?.pendingQueries) || 0,
  totalQueries: Number(raw?.totalQueries) || 0,
  convertedToQuotationThisMonth:
    Number(raw?.convertedToQuotationThisMonth) || 0,
  monthLabel: raw?.monthLabel || getCurrentMonthLabel(),
  hasCompanyLink: Boolean(raw?.hasCompanyLink),
});

const extractAnalyticsFromResponse = (response) => {
  const payload = response?.data ?? response;
  if (!payload || typeof payload !== "object") return null;
  if (
    typeof payload.pendingQueries === "number" ||
    typeof payload.totalQueries === "number" ||
    typeof payload.convertedToQuotationThisMonth === "number"
  ) {
    return payload;
  }
  if (payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return null;
};

const proBucketStatusBadge = (status) => {
  switch (status) {
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "rate_submitted":
      return <Badge variant="info">Rate Submitted</Badge>;
    case "fulfilled":
      return <Badge variant="success">Fulfilled</Badge>;
    case "approval_pending":
      return <Badge variant="secondary">Approval Pending</Badge>;
    default:
      return status ? (
        <Badge variant="outline">{status}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
  }
};

const parseLineProcurementRatesResponse = (res) => {
  const block = res?.data?.data ?? res?.data ?? res;
  const rates = Array.isArray(block?.rates) ? block.rates : [];
  return {
    rates,
    status: block?.status ?? null,
    productName: block?.productName?.trim() || "",
  };
};

const ProcurementRateAvailabilityBadge = ({
  loading,
  available,
  hasProductCode,
}) => {
  if (!hasProductCode) {
    return (
      <Badge variant="destructive" className="whitespace-nowrap">
        Rate not available
      </Badge>
    );
  }
  if (loading) {
    return <Spinner className="h-4 w-4" />;
  }
  if (available) {
    return (
      <Badge variant="success" className="whitespace-nowrap">
        Rate available
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="whitespace-nowrap">
      Rate not available
    </Badge>
  );
};

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem("migticrm_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getUserDisplayName = (userObj) => {
  if (!userObj) return null;
  return (
    userObj.name ||
    userObj.username ||
    (userObj.firstName
      ? [userObj.firstName, userObj.lastName].filter(Boolean).join(" ")
      : null) ||
    userObj.email ||
    null
  );
};

const fetchUserById = async (userId) => {
  try {
    const res = await employeeService.getById(userId);
    const emp = res?.data?.employee || res?.data?.data || res?.data || null;
    if (emp && (emp.name || emp.email || emp.firstName)) return emp;
  } catch {}
  try {
    const res = await userService.getById(userId);
    const usr =
      res?.data?.user ||
      res?.data?.admin ||
      res?.data?.data ||
      res?.data ||
      null;
    if (usr && (usr.name || usr.email || usr.firstName))
      return { ...usr, role: usr.role || "admin" };
  } catch {}
  return null;
};

const isLocationUrl = (value) => {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^https?:\/\//i.test(s) || /^www\./i.test(s);
};

const toOpenableLocationUrl = (value) => {
  const s = String(value || "").trim();
  if (!s) return "";
  if (/^www\./i.test(s)) return `https://${s}`;
  return s;
};

const openLocationInNewTab = (value) => {
  const url = toOpenableLocationUrl(value);
  if (!url) return;
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    toastError("Pop-up blocked. Allow pop-ups to open this location.");
  }
};

const resolveProductImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "string") {
    if (OBJECT_ID_PATTERN.test(img)) return "";
    return img.startsWith("http") ? img : getAssetsUrl(img);
  }
  if (typeof img === "object" && img?.path) {
    return img.path.startsWith("http") ? img.path : getAssetsUrl(img.path);
  }
  if (typeof img === "object" && img?.url) return img.url;
  return "";
};

const getDocumentId = (img) => {
  if (!img) return null;
  if (typeof img === "object") {
    const id = img._id ?? img.documentId ?? null;
    return id != null && id !== "" ? String(id) : null;
  }
  if (typeof img === "string" && OBJECT_ID_PATTERN.test(img)) return img;
  return null;
};

const getProductImages = (product) => {
  const productRef =
    typeof product?.product_id === "object" ? product.product_id : null;
  const snapshotImages = Array.isArray(product?.images) ? product.images : [];
  const productRefImages = Array.isArray(productRef?.images)
    ? productRef.images
    : [];
  return (snapshotImages.length ? snapshotImages : productRefImages) || [];
};

const getProductImageUrls = (product) =>
  getProductImages(product)
    .map((img) => resolveProductImageUrl(img))
    .filter((src) => !!src);

const productHasPhoto = (product) =>
  getProductImages(product).some(
    (img) => getDocumentId(img) || resolveProductImageUrl(img),
  );

const getProductsMissingPhotos = (products = []) =>
  products.filter((product) => !productHasPhoto(product));

// Fallback sample values shown when a field has no real data yet, so the
// redesigned Query Details page always demonstrates its full layout.
const DUMMY_COMPANY_INFO = {
  queryReferenceBy: "Website Inquiry",
  gstNumber: "27AABCU9603R1ZM",
  contactPerson: {
    name: "Amit Verma",
    phone: "9876543210",
    email: "amit.verma@example.com",
  },
  address: "Plot 22, Industrial Estate, Pune - 411019",
  billingAddress: "Plot 22, Industrial Estate, Pune - 411019",
  shippingAddress: "Warehouse 4, MIDC Bhosari, Pune - 411026",
};

const DUMMY_PRODUCT_ROW = {
  description: "Standard industrial grade component as per specification.",
  unit: "PCS",
  gstPercentage: 18,
  remark: "Urgent requirement",
};

const QueryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUpdate, canDelete } = usePermissions();
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
  const canConvertToQuotation = canUpdate("quotations") || isSalesRole;
  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({ visible: false });
  const [confirmConvert, setConfirmConvert] = useState({ visible: false });
  const [activities, setActivities] = useState([]);
  const [activitiesPagination, setActivitiesPagination] = useState(null);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const viewRecordedRef = useRef(false);
  const [userCache, setUserCache] = useState({});
  const [expandedImages, setExpandedImages] = useState([]); // image docs/refs for slider
  const [expandedImageIndex, setExpandedImageIndex] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [closeRemark, setCloseRemark] = useState("");
  const [closing, setClosing] = useState(false);
  const [procurementRatesModal, setProcurementRatesModal] = useState({
    visible: false,
    loading: false,
    error: "",
    productLabel: "",
    rawProductCode: "",
    lineIndex: null,
    status: null,
    rates: [],
  });
  /** Per line index: { loading, available } from query-line-procurement-rates API */
  const [lineRateAvailability, setLineRateAvailability] = useState({});
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const [companyAnalytics, setCompanyAnalytics] = useState(null);
  const [companyAnalyticsLoaded, setCompanyAnalyticsLoaded] = useState(false);
  const [companyAnalyticsLoading, setCompanyAnalyticsLoading] = useState(false);
  const [companyAnalyticsError, setCompanyAnalyticsError] = useState("");
  const [togglingQuotationStatusIndex, setTogglingQuotationStatusIndex] =
    useState(null);
  const [togglingAllQuotationStatus, setTogglingAllQuotationStatus] =
    useState(false);
  const [clientGstNumber, setClientGstNumber] = useState("");
  const [clientContactPersons, setClientContactPersons] = useState([]);

  const getImageUrl = resolveProductImageUrl;

  const fetchActivities = async (page = 1) => {
    if (!id) return;
    try {
      setActivitiesLoading(true);
      const res = await queryService.getActivities(id, {
        pageNumber: page,
        pageSize: 10,
      });
      const data = res?.data?.data ?? res?.data;
      const arr = Array.isArray(data?.activities)
        ? data.activities
        : Array.isArray(data)
          ? data
          : [];
      setActivities(arr);
      setActivitiesPagination(data?.pagination ?? null);
      setActivitiesPage(page);
    } catch {
      setActivities([]);
      setActivitiesPagination(null);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadActivitiesPage = (page) => fetchActivities(page);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => queryService.getById(id));
        const data = res?.data || res;
        const q = data?.data ?? data;
        setQuery(q);
        if (q) await fetchActivities(1);
      } catch (err) {
        toastError(err?.message || "Failed to load query");
        setError(err?.message || "Failed to load query");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const linkedClientId =
      query?.industry_id && typeof query.industry_id === "object"
        ? query.industry_id._id
        : query?.industry_id || null;
    if (!linkedClientId) {
      setClientGstNumber("");
      setClientContactPersons([]);
      return;
    }
    let cancelled = false;
    industryContactPersonService
      .getAll({
        pageNumber: 1,
        pageSize: 1000,
        industryId: linkedClientId,
        status: "active",
      })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        const list = data?.contactPersons ?? data?.data?.contactPersons ?? [];
        setClientContactPersons(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setClientContactPersons([]);
      });
    industryService
      .getById(linkedClientId)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || res;
        setClientGstNumber(data?.gstNumber || "");
      })
      .catch(() => {
        if (!cancelled) setClientGstNumber("");
      });
    return () => {
      cancelled = true;
    };
  }, [query?.industry_id]);

  useEffect(() => {
    if (!id || !query?.products?.length) {
      setLineRateAvailability({});
      return;
    }

    let cancelled = false;
    const products = query.products;

    const loadLineRates = async () => {
      const loadingState = {};
      products.forEach((product, index) => {
        loadingState[index] = {
          loading: Boolean(String(product?.rawProductCode ?? "").trim()),
          available: null,
        };
      });
      setLineRateAvailability(loadingState);

      const results = await Promise.all(
        products.map(async (product, index) => {
          const rawCode = String(product?.rawProductCode ?? "").trim();
          if (!rawCode) {
            return { index, loading: false, available: false };
          }
          try {
            const res = await queryService.getLineProcurementRates(id, {
              rawProductCode: rawCode,
              lineIndex: index,
            });
            const { rates } = parseLineProcurementRatesResponse(res);
            return { index, loading: false, available: rates.length > 0 };
          } catch {
            return { index, loading: false, available: false };
          }
        }),
      );

      if (cancelled) return;

      const next = {};
      results.forEach(({ index, loading, available }) => {
        next[index] = { loading, available };
      });
      setLineRateAvailability(next);
    };

    loadLineRates();
    return () => {
      cancelled = true;
    };
  }, [id, query?.products]);

  const loadCompanyAnalytics = async (fallbackCompanyName = "—") => {
    if (!id || companyAnalyticsLoading) return;
    setCompanyAnalyticsLoading(true);
    setCompanyAnalyticsError("");
    try {
      const response = await queryService.getCompanyQueryAnalytics(id);
      const analyticsPayload = extractAnalyticsFromResponse(response);
      setCompanyAnalytics(
        normalizeCompanyAnalytics(analyticsPayload, fallbackCompanyName),
      );
    } catch (err) {
      setCompanyAnalytics(createEmptyCompanyAnalytics(fallbackCompanyName));
      setCompanyAnalyticsError(
        err?.message || "Failed to load company analytics",
      );
    } finally {
      setCompanyAnalyticsLoading(false);
      setCompanyAnalyticsLoaded(true);
    }
  };

  const toggleAnalyticsPanel = (fallbackCompanyName = "—") => {
    const nextExpanded = !analyticsExpanded;
    setAnalyticsExpanded(nextExpanded);
    if (nextExpanded && !companyAnalyticsLoaded && !companyAnalyticsLoading) {
      loadCompanyAnalytics(fallbackCompanyName);
    }
  };

  useEffect(() => {
    setAnalyticsExpanded(false);
    setCompanyAnalytics(null);
    setCompanyAnalyticsLoaded(false);
    setCompanyAnalyticsError("");
  }, [id]);

  useEffect(() => {
    if (!query || !user || viewRecordedRef.current) return;
    const performedBy = user?.id || user?._id;
    if (!performedBy) return;
    viewRecordedRef.current = true;
    queryService
      .recordActivity(id, "viewed", performedBy, {})
      .then(() => fetchActivities())
      .catch(() => {});
  }, [query, user, id]);

  useEffect(() => {
    if (!query && activities.length === 0) return;
    const storedUser = getStoredUser();
    const idsToResolve = new Set();
    if (query?.created_by && typeof query.created_by === "string") {
      const cid = query.created_by;
      if (
        !userCache[cid] &&
        !(storedUser && (storedUser._id === cid || storedUser.id === cid))
      )
        idsToResolve.add(cid);
    }
    activities.forEach((act) => {
      const pid =
        typeof act.performedBy === "string"
          ? act.performedBy
          : typeof act.performed_by === "string"
            ? act.performed_by
            : null;
      if (
        pid &&
        !userCache[pid] &&
        !(storedUser && (storedUser._id === pid || storedUser.id === pid)) &&
        !(act.performedBy && typeof act.performedBy === "object") &&
        !(act.performed_by && typeof act.performed_by === "object")
      ) {
        idsToResolve.add(pid);
      }
    });
    if (idsToResolve.size === 0) return;
    const resolveUsers = async () => {
      const newCache = { ...userCache };
      for (const uid of idsToResolve) {
        if (newCache[uid]) continue;
        const userData = await fetchUserById(uid);
        if (userData) newCache[uid] = userData;
      }
      setUserCache(newCache);
    };
    resolveUsers();
  }, [query, activities]);

  const handleDeleteClick = () => setConfirmDelete({ visible: true });

  const handleDeleteConfirm = async () => {
    setConfirmDelete({ visible: false });
    try {
      await queryService.delete(id);
      toastSuccess("Query deleted successfully");
      navigate("/queries");
    } catch (err) {
      toastError(err?.message || "Failed to delete query");
    }
  };

  const openCloseQueryModal = () => {
    setCloseRemark((query && query.close_remark) || "");
    setCloseModalVisible(true);
  };

  const handleCloseQuerySave = async () => {
    if (!id) return;
    setClosing(true);
    try {
      await queryService.update(id, {
        status: "closed",
        close_remark: closeRemark.trim(),
      });
      toastSuccess("Query closed successfully");
      setCloseModalVisible(false);
      const res = await queryService.getById(id);
      const data = res?.data || res;
      const q = data?.data ?? data;
      setQuery(q);
      fetchActivities(activitiesPage);
    } catch (err) {
      toastError(err?.message || "Failed to close query");
    } finally {
      setClosing(false);
    }
  };

  const handleConvertClick = () => {
    const readyProducts = filterProductsReadyForQuotation(
      query?.products || [],
    );
    if (readyProducts.length === 0) {
      toastError(
        "Select at least one product as ready for quotation before converting.",
      );
      return;
    }

    const missingPhotoProducts = getProductsMissingPhotos(readyProducts);
    if (missingPhotoProducts.length > 0) {
      const labels = missingPhotoProducts
        .map(
          (product, index) =>
            product.productName?.trim() || `Product ${index + 1}`,
        )
        .join(", ");
      toastError(
        missingPhotoProducts.length === 1
          ? `Cannot convert to quotation: "${labels}" has no photo. Add a product image before converting.`
          : `Cannot convert to quotation: the following products have no photo: ${labels}. Add images before converting.`,
      );
      return;
    }

    setConfirmConvert({ visible: true });
  };

  const handleQuotationStatusToggle = async (productIndex, checked) => {
    if (!id || !query?.products?.length) return;
    if (query.status === "closed") return;

    const nextStatus = checked
      ? QUERY_PRODUCT_QUOTATION_STATUS.READY_FOR_QUOTATION
      : QUERY_PRODUCT_QUOTATION_STATUS.PENDING;
    const updatedProducts = query.products.map((product, index) =>
      index === productIndex
        ? { ...product, quotation_status: nextStatus }
        : product,
    );

    setTogglingQuotationStatusIndex(productIndex);
    try {
      const res = await queryService.update(id, { products: updatedProducts });
      const data = res?.data || res;
      const updatedQuery = data?.data ?? data;
      setQuery(updatedQuery);
      toastSuccess(
        checked
          ? "Product marked ready for quotation"
          : "Product marked as pending",
      );
    } catch (err) {
      toastError(err?.message || "Failed to update product status");
    } finally {
      setTogglingQuotationStatusIndex(null);
    }
  };

  const handleQuotationStatusToggleAll = async (checked) => {
    if (!id || !query?.products?.length) return;
    if (query.status === "closed") return;

    const nextStatus = checked
      ? QUERY_PRODUCT_QUOTATION_STATUS.READY_FOR_QUOTATION
      : QUERY_PRODUCT_QUOTATION_STATUS.PENDING;
    const updatedProducts = query.products.map((product) => ({
      ...product,
      quotation_status: nextStatus,
    }));

    setTogglingAllQuotationStatus(true);
    try {
      const res = await queryService.update(id, { products: updatedProducts });
      const data = res?.data || res;
      const updatedQuery = data?.data ?? data;
      setQuery(updatedQuery);
      toastSuccess(
        checked
          ? "All products marked ready for quotation"
          : "All products marked as pending",
      );
    } catch (err) {
      toastError(err?.message || "Failed to update product status");
    } finally {
      setTogglingAllQuotationStatus(false);
    }
  };

  const handleConvertConfirm = () => {
    if (!query?.queryCode) {
      toastError("Query code is missing, cannot convert to quotation.");
      setConfirmConvert({ visible: false });
      return;
    }
    setConfirmConvert({ visible: false });
    navigate(`/quotations/generate/${id}`, {
      state: { query },
    });
  };

  const handleCreateReQuotation = () => {
    if (!query?.queryCode) {
      toastError("Query code is missing, cannot create re-quotation.");
      return;
    }
    const readyProducts = filterProductsReadyForQuotation(
      query?.products || [],
    );
    if (readyProducts.length === 0) {
      toastError(
        "Select at least one product as ready for quotation before creating a re-quotation.",
      );
      return;
    }
    navigate(`/quotations/generate/${id}`, {
      state: { query, forceNewQuotation: true },
    });
  };

  /** Populated group/category on query line items from get-by-id, or unpopulated id */
  const refDisplayName = (ref) => {
    if (ref == null) return "—";
    if (typeof ref === "object" && ref != null) return ref.name || "—";
    return "—";
  };

  /** Product name plus variant values, e.g. "Asis blue medium". */
  const getProductDisplayName = (product) => {
    const name = String(product?.productName || "").trim();
    const variantText = (product?.variants || [])
      .map((v) => String(v?.variantName || "").trim())
      .filter(Boolean)
      .map((vn) => vn.replace(/,\s*/g, " ").replace(/\s+/g, " ").trim())
      .join(" ");
    const full = [name, variantText].filter(Boolean).join(" ");
    return full || "—";
  };

  const formatProductHierarchy = (product) => {
    const parts = [
      refDisplayName(product?.groupId) !== "—"
        ? `Group: ${refDisplayName(product.groupId)}`
        : null,
      refDisplayName(product?.categoryId) !== "—"
        ? `Category: ${refDisplayName(product.categoryId)}`
        : null,
      refDisplayName(product?.subcategoryId) !== "—"
        ? `Subcategory: ${refDisplayName(product.subcategoryId)}`
        : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  };

  const getProductSubStatusBadgeColor = (product) =>
    isProductConvertedToQuotation(product) ? "success" : "secondary";

  const openProcurementRatesModal = async (productRow, lineIndex) => {
    const rawCode = String(productRow?.rawProductCode ?? "").trim();
    if (!id || !rawCode) {
      toastError(
        "This line has no product code; procurement rates are unavailable.",
      );
      return;
    }
    const displayName = getProductDisplayName(productRow);
    const productLabel =
      displayName !== "—" ? displayName : rawCode || `Line ${lineIndex + 1}`;
    setProcurementRatesModal({
      visible: true,
      loading: true,
      error: "",
      productLabel,
      rawProductCode: rawCode,
      lineIndex,
      status: null,
      rates: [],
    });
    try {
      const res = await queryService.getLineProcurementRates(id, {
        rawProductCode: rawCode,
        lineIndex,
      });
      const block = parseLineProcurementRatesResponse(res);
      setProcurementRatesModal((prev) => ({
        ...prev,
        loading: false,
        error: "",
        status: block.status,
        rates: block.rates,
        productLabel: block.productName || productLabel,
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
    });
  };

  const handleExportPDF = async () => {
    if (!id) return;
    setExportingPdf(true);
    try {
      const response = await queryService.exportPdf(id);
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
      a.download = `query-${query?.queryCode || id}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toastSuccess("PDF exported successfully");
    } catch (err) {
      toastError(err?.message || "Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const getPerformerInfo = (act) => {
    const performer =
      act.performedBy && typeof act.performedBy === "object"
        ? act.performedBy
        : act.performed_by && typeof act.performed_by === "object"
          ? act.performed_by
          : null;
    if (performer) {
      return {
        name:
          getUserDisplayName(performer) || act.performByName || performer.name,
        email: performer.email || null,
        phone: performer.phone || performer.phone_1 || null,
        role: performer.role || performer.designation || null,
      };
    }
    const performerId =
      typeof act.performedBy === "string"
        ? act.performedBy
        : typeof act.performed_by === "string"
          ? act.performed_by
          : null;
    if (performerId) {
      const cached = userCache[performerId];
      if (cached)
        return {
          name: getUserDisplayName(cached),
          email: cached.email || null,
          phone: cached.phone || cached.phone_1 || null,
          role: cached.role || cached.designation || null,
        };
      const storedUser = getStoredUser();
      if (
        storedUser &&
        (storedUser._id === performerId || storedUser.id === performerId)
      ) {
        return {
          name: getUserDisplayName(storedUser),
          email: storedUser.email || null,
          phone: storedUser.phone || storedUser.phone_1 || null,
          role: storedUser.role || storedUser.designation || null,
        };
      }
    }
    return {
      name: act.performByName || null,
      email: null,
      phone: null,
      role: null,
    };
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "closed":
        return "secondary";
      case "convertedToQuotation":
        return "success";
      case "progress":
        return "default";
      case "followup01pending":
      case "followup02pending":
      case "followup03pending":
        return "warning";
      default:
        return "info";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader message="Loading query..." />
      </div>
    );
  }

  if (error || !query) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">{error || "Query not found"}</p>
          <BackButton fallback="/queries" />
        </CardContent>
      </Card>
    );
  }

  const ci = query.companyInfo || {};
  const prods = query.products || [];
  const canToggleQuotationStatus =
    canConvertToQuotation && query.status !== "closed";
  const companyName = ci.name || ci.companyName || "-";
  const companyLocation = ci.location || "-";
  const clientId =
    query.industry_id && typeof query.industry_id === "object"
      ? query.industry_id._id
      : query.industry_id || null;
  const clientCode = clientId
    ? bpDummy.getOrCreateCode("industry", clientId)
    : "CL-0000";

  let creator =
    query.created_by && typeof query.created_by === "object"
      ? query.created_by
      : null;
  if (!creator && query.created_by) {
    const creatorId =
      typeof query.created_by === "string" ? query.created_by : null;
    if (creatorId) {
      if (userCache[creatorId]) creator = userCache[creatorId];
      else {
        const storedUser = getStoredUser();
        if (
          storedUser &&
          (storedUser._id === creatorId || storedUser.id === creatorId)
        )
          creator = storedUser;
      }
    }
  }

  return (
    <div>
      {/* ── Summary / actions header ── */}
      <Card className="mb-6">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="text-sm text-muted-foreground">
              Home&nbsp;/&nbsp;Queries
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <span className="mr-2 text-sm text-muted-foreground">
                  Company
                </span>
                <span className="font-semibold">{companyName}</span>
              </div>
              <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                <span className="text-sm text-muted-foreground">Location</span>
                {isLocationUrl(companyLocation) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openLocationInNewTab(companyLocation)}
                    title="Open location in new tab"
                  >
                    <MapPin className="h-4 w-4" />
                    Open location
                  </Button>
                ) : (
                  <span className="font-semibold">{companyLocation}</span>
                )}
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={getStatusBadgeColor(query.status)}>
                  {query.status || "—"}
                </Badge>
              </div>
            </div>
            {query.status === "closed" && query.close_remark ? (
              <div className="w-full rounded-md border border-border bg-background px-3 py-2">
                <span className="mb-1 block text-sm text-muted-foreground">
                  Close remark
                </span>
                <span className="break-words">{query.close_remark}</span>
              </div>
            ) : null}

            <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <BackButton fallback="/queries" />
                {query.queryCode && (
                  <div className="rounded-full border border-border bg-accent px-3 py-2 text-sm font-bold tracking-wide text-primary!">
                    {query.queryCode}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {canConvertToQuotation &&
                  query.status !== "closed" &&
                  query.status !== "convertedToQuotation" && (
                    <Button
                      type="button"
                      disabled={!query?.queryCode}
                      onClick={handleConvertClick}
                      className="bg-success! text-success-foreground hover:opacity-90"
                    >
                      <Check className="h-4 w-4" />
                      Convert to Quotation
                    </Button>
                  )}
                {canConvertToQuotation &&
                  query.status !== "closed" &&
                  query.status === "convertedToQuotation" && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!query?.queryCode}
                      onClick={handleCreateReQuotation}
                      className="border-success! text-success! hover:bg-success-muted"
                    >
                      <Check className="h-4 w-4" />
                      Create Re-Quotation
                    </Button>
                  )}
                {canEditQuery(
                  user?.role,
                  query.status,
                  canUpdate("queries"),
                ) && (
                  <Button
                    type="button"
                    onClick={() => navigate(`/queries/edit/${id}`)}
                    className="bg-warning! text-warning-foreground hover:opacity-90"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                {canDelete("queries") && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
                {canDelete("queries") && query.status !== "closed" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openCloseQueryModal}
                  >
                    <Ban className="h-4 w-4" />
                    Close
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={exportingPdf}
                >
                  <Download className="h-4 w-4" />
                  {exportingPdf ? "Exporting..." : "Export PDF"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Client Information */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary!" />
            <CardTitle>1. Client Information</CardTitle>
          </div>
          {clientId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate(`/industries/${clientId}`)}
              title="Open client details"
            >
              <Hash className="h-4 w-4" />
              {clientCode}
            </Button>
          ) : (
            <Badge variant="secondary" title="No linked client record yet">
              <Hash className="h-3.5 w-3.5" />
              {clientCode}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Client name</div>
              <div className="mt-1 text-sm font-medium">{companyName}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileBadge className="h-3.5 w-3.5" />
                GST details
              </div>
              <div className="mt-1 text-sm font-medium">
                {clientGstNumber || DUMMY_COMPANY_INFO.gstNumber}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Address
              </div>
              <div
                className="mt-1 break-words text-sm font-medium"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {(
                  ci.billingAddress ||
                  ci.shippingAddress ||
                  ci.address ||
                  ""
                ).trim() || DUMMY_COMPANY_INFO.address}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Contact person
              </div>
              <div className="mt-1 text-sm font-medium">
                {clientContactPersons.length > 0 ? (
                  clientContactPersons.map((cp) => (
                    <div key={cp.id}>
                      {`${cp.firstName || ""} ${cp.lastName || ""}`.trim() ||
                        "–"}
                      {cp.mobileNumber ? ` • ${cp.mobileNumber}` : ""}
                      {cp.email ? ` • ${cp.email}` : ""}
                    </div>
                  ))
                ) : (ci.purchaseManagers || []).length > 0 ? (
                  (ci.purchaseManagers || []).map((m, i) => (
                    <div key={i}>
                      {m.name || "–"}
                      {m.phone ? ` • ${m.phone}` : ""}
                      {m.email ? ` • ${m.email}` : ""}
                    </div>
                  ))
                ) : (
                  <span>
                    {DUMMY_COMPANY_INFO.contactPerson.name} •{" "}
                    {DUMMY_COMPANY_INFO.contactPerson.phone} •{" "}
                    {DUMMY_COMPANY_INFO.contactPerson.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Products */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            2. Products{" "}
            {prods.length > 0 && (
              <span className="font-normal text-muted-foreground">
                ({prods.length} item{prods.length !== 1 ? "s" : ""})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prods.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 60 }}>#</TableHead>
                    <TableHead style={{ width: 280 }}>Product name</TableHead>
                    <TableHead style={{ width: 130 }}>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead style={{ width: 100 }}>Quantity</TableHead>
                    <TableHead style={{ width: 80 }}>Unit</TableHead>
                    <TableHead>GST %</TableHead>
                    <TableHead>Remark</TableHead>
                    {canToggleQuotationStatus ? (
                      <TableHead className="text-center" style={{ width: 160 }}>
                        <div className="flex flex-col items-center gap-1">
                          <span>Ready for quotation</span>
                          {togglingAllQuotationStatus ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-normal text-muted-foreground">
                              <Checkbox
                                checked={
                                  prods.length > 0 &&
                                  prods.every((p) =>
                                    isProductReadyForQuotation(p),
                                  )
                                }
                                onCheckedChange={(checked) =>
                                  handleQuotationStatusToggleAll(
                                    checked === true,
                                  )
                                }
                                aria-label="Mark all products ready for quotation"
                              />
                              Select all
                            </label>
                          )}
                        </div>
                      </TableHead>
                    ) : null}
                    <TableHead className="text-center" style={{ width: 160 }}>
                      Procurement rate
                    </TableHead>
                    <TableHead style={{ width: 120 }}>Images</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prods.map((p, index) => {
                    const productRef =
                      typeof p.product_id === "object" ? p.product_id : null;
                    const displayableImages = getProductImages(p).filter(
                      (img) => getDocumentId(img) || getImageUrl(img),
                    );
                    const rawCode = String(p.rawProductCode ?? "").trim();
                    const ratesAvailable =
                      lineRateAvailability[index]?.available === true;

                    return (
                      <TableRow key={p._id || index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell style={{ minWidth: 280 }}>
                          <div className="font-semibold break-words">
                            {getProductDisplayName(p)}
                          </div>
                          {formatProductHierarchy(p) ? (
                            <div className="mt-1 break-words text-sm text-muted-foreground">
                              {formatProductHierarchy(p)}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getProductSubStatusBadgeColor(p)}
                            className="whitespace-nowrap"
                          >
                            {getProductSubStatusLabel(p)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {productRef?.shortDescription ||
                            p.description ||
                            DUMMY_PRODUCT_ROW.description}
                        </TableCell>
                        <TableCell>
                          {p.quantity != null ? p.quantity : "—"}
                        </TableCell>
                        <TableCell>
                          {p.unit || DUMMY_PRODUCT_ROW.unit}
                        </TableCell>
                        <TableCell className="text-sm">
                          {productRef?.gstPercentage != null
                            ? `${productRef.gstPercentage}%`
                            : p.gstPercentage != null
                              ? `${p.gstPercentage}%`
                              : `${DUMMY_PRODUCT_ROW.gstPercentage}%`}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.remark || DUMMY_PRODUCT_ROW.remark}
                        </TableCell>
                        {canToggleQuotationStatus ? (
                          <TableCell className="text-center align-middle">
                            {togglingQuotationStatusIndex === index ? (
                              <Spinner className="mx-auto h-4 w-4" />
                            ) : (
                              <Checkbox
                                id={`query-product-ready-${index}`}
                                className="mx-auto"
                                checked={isProductReadyForQuotation(p)}
                                onCheckedChange={(checked) =>
                                  handleQuotationStatusToggle(
                                    index,
                                    checked === true,
                                  )
                                }
                                aria-label={`Mark ${p.productName || "product"} ready for quotation`}
                              />
                            )}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-center align-middle">
                          <div className="flex flex-col items-center gap-1">
                            <ProcurementRateAvailabilityBadge
                              loading={lineRateAvailability[index]?.loading}
                              available={lineRateAvailability[index]?.available}
                              hasProductCode={Boolean(rawCode)}
                            />
                            {rawCode && ratesAvailable ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="View procurement rates"
                                aria-label="View procurement rates"
                                onClick={() =>
                                  openProcurementRatesModal(p, index)
                                }
                              >
                                <List className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {displayableImages.length > 0 ? (
                            <div
                              role="button"
                              tabIndex={0}
                              className="inline-flex cursor-pointer flex-wrap items-center gap-1"
                              onClick={() => {
                                setExpandedImages(displayableImages);
                                setExpandedImageIndex(0);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setExpandedImages(displayableImages);
                                  setExpandedImageIndex(0);
                                }
                              }}
                            >
                              {displayableImages.slice(0, 2).map((img, i) => {
                                const documentId = getDocumentId(img);
                                const fallbackUrl = getImageUrl(img);
                                return (
                                  <div
                                    key={documentId || fallbackUrl || i}
                                    className="shrink-0 overflow-hidden rounded-md border border-border"
                                    style={{ width: 48, height: 48 }}
                                  >
                                    {documentId ? (
                                      <AuthImage
                                        documentId={documentId}
                                        fallbackUrl={fallbackUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        style={{
                                          width: 48,
                                          height: 48,
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src={fallbackUrl}
                                        width={48}
                                        height={48}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                              {displayableImages.length > 2 && (
                                <div
                                  className="flex shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs font-bold text-primary!"
                                  style={{ width: 40, height: 40 }}
                                >
                                  +{displayableImages.length - 2}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center rounded-md border border-dashed border-border bg-muted text-muted-foreground"
                              style={{ width: 48, height: 48 }}
                              title="No image uploaded"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mb-0 text-muted-foreground">No products added.</p>
          )}
        </CardContent>
      </Card>

      {isHodRole(user?.role) ? (
        <Card className="mb-6 overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between border-0 bg-transparent px-4 py-3 text-left"
            aria-expanded={analyticsExpanded}
            onClick={() => toggleAnalyticsPanel(companyName)}
          >
            <span>
              <strong>3. Analytics</strong>
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {companyName !== "-" ? companyName : "Company insights"}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              {analyticsExpanded ? "Hide" : "Show"}
            </span>
          </button>
          {analyticsExpanded && (
            <CardContent className="border-t border-border pt-4">
              {companyAnalyticsLoading ? (
                <div className="py-4 text-center">
                  <Spinner className="mx-auto h-4 w-4" />
                  <div className="mt-2 text-sm text-muted-foreground">
                    Loading company analytics…
                  </div>
                </div>
              ) : companyAnalyticsLoaded ? (
                <>
                  {companyAnalyticsError ? (
                    <Alert variant="destructive" className="mb-3">
                      <AlertDescription>
                        {companyAnalyticsError}
                        <div className="mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => loadCompanyAnalytics(companyName)}
                          >
                            Retry
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {(() => {
                    const analytics = normalizeCompanyAnalytics(
                      companyAnalytics,
                      companyName,
                    );
                    return (
                      <>
                        {!analytics.hasCompanyLink ? (
                          <p className="mb-3 text-sm text-muted-foreground">
                            Link this query to a company to view analytics.
                          </p>
                        ) : null}
                        <p className="mb-3 text-sm text-muted-foreground">
                          Summary for <strong>{analytics.companyName}</strong>
                          {analytics.monthLabel
                            ? ` · ${analytics.monthLabel}`
                            : ""}
                        </p>
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-12 sm:col-span-6 md:col-span-4">
                            <div className="h-full rounded-lg border border-border bg-muted p-3">
                              <div className="text-sm text-muted-foreground">
                                Pending queries
                              </div>
                              <div className="mb-0 text-2xl font-semibold">
                                {analytics.pendingQueries}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                Draft queries not yet converted
                              </div>
                            </div>
                          </div>
                          <div className="col-span-12 sm:col-span-6 md:col-span-4">
                            <div className="h-full rounded-lg border border-border bg-muted p-3">
                              <div className="text-sm text-muted-foreground">
                                Total queries
                              </div>
                              <div className="mb-0 text-2xl font-semibold">
                                {analytics.totalQueries}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                All queries for this company
                              </div>
                            </div>
                          </div>
                          <div className="col-span-12 md:col-span-4">
                            <div className="h-full rounded-lg border border-border bg-muted p-3">
                              <div className="text-sm text-muted-foreground">
                                Converted to quotation (this month)
                              </div>
                              <div className="mb-0 text-2xl font-semibold">
                                {analytics.convertedToQuotationThisMonth}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                Queries with a quotation created in{" "}
                                {analytics.monthLabel || "this month"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : null}
            </CardContent>
          )}
        </Card>
      ) : null}

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false })}
        onConfirm={handleDeleteConfirm}
        title="Delete Query?"
        message="Are you sure you want to delete this query? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
      <ConfirmDialog
        visible={confirmConvert.visible}
        onClose={() => setConfirmConvert({ visible: false })}
        onConfirm={handleConvertConfirm}
        title="Convert to Quotation?"
        message={`Convert ${filterProductsReadyForQuotation(prods).length} product(s) marked ready for quotation?`}
        confirmText="Yes, convert"
        cancelText="Cancel"
      />

      {/* Procurement rates modal */}
      <Dialog
        open={procurementRatesModal.visible}
        onOpenChange={(open) =>
          !open &&
          !procurementRatesModal.loading &&
          closeProcurementRatesModal()
        }
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Procurement Rates</DialogTitle>
          </DialogHeader>
          {procurementRatesModal.loading ? (
            <div className="py-4 text-center">
              <Spinner className="mx-auto" />
              <div className="mt-2 text-sm text-muted-foreground">
                Loading rates…
              </div>
            </div>
          ) : procurementRatesModal.error ? (
            <Alert variant="destructive" className="mb-0">
              <AlertDescription>{procurementRatesModal.error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="mb-2 text-sm text-muted-foreground">
                <strong>{procurementRatesModal.productLabel}</strong>
                {procurementRatesModal.rawProductCode ? (
                  <>
                    {" "}
                    · Code{" "}
                    <span className="text-foreground">
                      {procurementRatesModal.rawProductCode}
                    </span>
                  </>
                ) : null}{" "}
                · Line status{" "}
                {proBucketStatusBadge(procurementRatesModal.status)}
              </div>
              {procurementRatesModal.rates.length === 0 ? (
                <p className="mb-0 text-muted-foreground">
                  No Rates Available For This Product
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">#</TableHead>
                        <TableHead scope="col">Min rate</TableHead>
                        <TableHead scope="col">Max rate</TableHead>
                        <TableHead scope="col">Discount (%)</TableHead>
                        <TableHead scope="col">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procurementRatesModal.rates.map((r, i) => (
                        <TableRow key={r._id || i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>
                            {r.minRate != null &&
                            !Number.isNaN(Number(r.minRate))
                              ? Number(r.minRate)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {r.maxRate != null &&
                            !Number.isNaN(Number(r.maxRate))
                              ? Number(r.maxRate)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {r.discount != null &&
                            !Number.isNaN(Number(r.discount))
                              ? Number(r.discount)
                              : "—"}
                          </TableCell>
                          <TableCell>{r.unit || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeProcurementRatesModal}
              disabled={procurementRatesModal.loading}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close query modal */}
      <Dialog
        open={closeModalVisible}
        onOpenChange={(open) =>
          !open && !closing && setCloseModalVisible(false)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="query-close-remark">Remark (optional)</Label>
            <Textarea
              id="query-close-remark"
              rows={4}
              value={closeRemark}
              onChange={(e) => setCloseRemark(e.target.value)}
              placeholder="Add a remark for closing this query"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloseModalVisible(false)}
              disabled={closing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCloseQuerySave}
              disabled={closing}
            >
              {closing ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image slider modal */}
      <Dialog
        open={expandedImages.length > 0}
        onOpenChange={(open) => !open && setExpandedImages([])}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Image{" "}
              {expandedImages.length > 1
                ? `${expandedImageIndex + 1} / ${expandedImages.length}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="relative p-3 text-center">
            {expandedImages.length > 0 && (
              <>
                {expandedImages.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute left-0 top-1/2 z-10 h-12 w-12 -translate-y-1/2 rounded-full"
                      onClick={() =>
                        setExpandedImageIndex((idx) =>
                          idx <= 0 ? expandedImages.length - 1 : idx - 1,
                        )
                      }
                      aria-label="Previous"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute right-0 top-1/2 z-10 h-12 w-12 -translate-y-1/2 rounded-full"
                      onClick={() =>
                        setExpandedImageIndex((idx) =>
                          idx >= expandedImages.length - 1 ? 0 : idx + 1,
                        )
                      }
                      aria-label="Next"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
                {getDocumentId(expandedImages[expandedImageIndex]) ? (
                  <AuthImage
                    documentId={getDocumentId(
                      expandedImages[expandedImageIndex],
                    )}
                    fallbackUrl={getImageUrl(
                      expandedImages[expandedImageIndex],
                    )}
                    alt={`Product ${expandedImageIndex + 1}`}
                    className="mx-auto max-w-full rounded"
                    style={{ maxHeight: "80vh", objectFit: "contain" }}
                  />
                ) : (
                  <img
                    src={getImageUrl(expandedImages[expandedImageIndex])}
                    alt={`Product ${expandedImageIndex + 1}`}
                    className="mx-auto max-w-full rounded"
                    style={{ maxHeight: "80vh", objectFit: "contain" }}
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QueryView;
