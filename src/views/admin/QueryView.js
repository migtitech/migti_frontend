import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CListGroup,
  CListGroupItem,
  CBadge,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormTextarea,
  CSpinner,
  CImage,
  CAlert,
  CCollapse,
  CFormCheck,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilArrowLeft,
  cilArrowRight,
  cilPencil,
  cilTrash,
  cilCheckAlt,
  cilX,
  cilCloudDownload,
  cilBan,
  cilLocationPin,
  cilList,
} from "@coreui/icons";
import { getAssetsUrl } from "../../api/endpoints";
import queryService from "../../services/queryService";
import employeeService from "../../services/employeeService";
import userService from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import usePermissions, {
  normalizeRole,
  canEditQuery,
  isHodRole,
} from "../../hooks/usePermissions";
import { Loader, ConfirmDialog } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  QUERY_PRODUCT_QUOTATION_STATUS,
  filterProductsReadyForQuotation,
  isProductReadyForQuotation,
  getProductSubStatusLabel,
  isProductConvertedToQuotation,
} from "../../utils/queryProductQuotationStatus";
import { formatQueryReferenceByDisplay } from "../../utils/queryReferenceBy";

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
      return <CBadge color="warning">Pending</CBadge>;
    case "rate_submitted":
      return <CBadge color="info">Rate Submitted</CBadge>;
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
      <CBadge color="danger" className="small text-nowrap">
        Rate not available
      </CBadge>
    );
  }
  if (loading) {
    return <CSpinner size="sm" />;
  }
  if (available) {
    return (
      <CBadge color="success" className="small text-nowrap">
        Rate available
      </CBadge>
    );
  }
  return (
    <CBadge color="danger" className="small text-nowrap">
      Rate not available
    </CBadge>
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
  if (typeof img === "object" && img?.path) return getAssetsUrl(img.path);
  return typeof img === "string" ? img : "";
};

const getProductImageUrls = (product) => {
  const productRef =
    typeof product?.product_id === "object" ? product.product_id : null;
  const snapshotImages = Array.isArray(product?.images) ? product.images : [];
  const productRefImages = Array.isArray(productRef?.images)
    ? productRef.images
    : [];
  const allImages =
    (snapshotImages.length ? snapshotImages : productRefImages) || [];
  return allImages.map(resolveProductImageUrl).filter((src) => !!src);
};

const productHasPhoto = (product) => getProductImageUrls(product).length > 0;

const getProductsMissingPhotos = (products = []) =>
  products.filter((product) => !productHasPhoto(product));

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
  const [expandedImages, setExpandedImages] = useState([]); // array of image URLs for slider
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
        return "primary";
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
      <div className="text-center p-5">
        <Loader message="Loading query..." />
      </div>
    );
  }

  if (error || !query) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger mb-3">{error || "Query not found"}</p>
          <CButton color="primary" onClick={() => navigate("/queries")}>
            Back to Queries
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  const ci = query.companyInfo || {};
  const prods = query.products || [];
  const canToggleQuotationStatus =
    canConvertToQuotation && query.status !== "closed";
  const companyName = ci.name || ci.companyName || "-";
  const companyLocation = ci.location || "-";

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
    <>
      <CCard
        className="mb-4 border-0 shadow-sm"
        style={{ borderRadius: 12, backgroundColor: "#f8f9fb" }}
      >
        <CCardBody className="p-3 p-md-4">
          <div className="d-flex flex-column gap-3">
            <div className="small text-muted" style={{ fontSize: "0.82rem" }}>
              Home&nbsp;/&nbsp;Queries
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="px-3 py-2 rounded border bg-white">
                <span className="small text-muted me-2">Company</span>
                <span className="fw-semibold">{companyName}</span>
              </div>
              <div className="px-3 py-2 rounded border bg-white d-inline-flex align-items-center flex-wrap gap-2">
                <span className="small text-muted">Location</span>
                {isLocationUrl(companyLocation) ? (
                  <CButton
                    type="button"
                    size="sm"
                    color="primary"
                    variant="outline"
                    className="d-inline-flex align-items-center"
                    onClick={() => openLocationInNewTab(companyLocation)}
                    title="Open location in new tab"
                  >
                    <CIcon icon={cilLocationPin} className="me-1" />
                    Open location
                  </CButton>
                ) : (
                  <span className="fw-semibold">{companyLocation}</span>
                )}
              </div>
              <div className="px-3 py-2 rounded border bg-white d-inline-flex align-items-center gap-2">
                <span className="small text-muted">Status</span>
                <CBadge color={getStatusBadgeColor(query.status)}>
                  {query.status || "—"}
                </CBadge>
              </div>
            </div>
            {query.status === "closed" && query.close_remark ? (
              <div className="px-3 py-2 rounded border bg-white w-100">
                <span className="small text-muted d-block mb-1">
                  Close remark
                </span>
                <span className="text-break">{query.close_remark}</span>
              </div>
            ) : null}

            <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate("/queries")}
                  className="d-inline-flex align-items-center px-3"
                  style={{ height: 40 }}
                >
                  <CIcon icon={cilArrowLeft} className="me-2" />
                  Back to Queries
                </CButton>
                {query.queryCode && (
                  <div
                    className="fw-bold text-primary px-3 py-2 rounded-pill border"
                    style={{
                      fontSize: "0.95rem",
                      letterSpacing: "0.3px",
                      backgroundColor: "#eef4ff",
                    }}
                  >
                    {query.queryCode}
                  </div>
                )}
              </div>

              <div className="d-flex flex-wrap justify-content-lg-end align-items-center gap-2">
                {canConvertToQuotation &&
                  query.status !== "closed" &&
                  query.status !== "convertedToQuotation" && (
                    <CButton
                      color="success"
                      disabled={!query?.queryCode}
                      onClick={handleConvertClick}
                      className="d-inline-flex align-items-center px-3"
                      style={{ height: 40 }}
                    >
                      <CIcon icon={cilCheckAlt} className="me-1" />
                      Convert to Quotation
                    </CButton>
                  )}
                {canConvertToQuotation &&
                  query.status !== "closed" &&
                  query.status === "convertedToQuotation" && (
                    <CButton
                      color="success"
                      variant="outline"
                      disabled={!query?.queryCode}
                      onClick={handleCreateReQuotation}
                      className="d-inline-flex align-items-center px-3"
                      style={{ height: 40 }}
                    >
                      <CIcon icon={cilCheckAlt} className="me-1" />
                      Create Re-Quotation
                    </CButton>
                  )}
                {canEditQuery(
                  user?.role,
                  query.status,
                  canUpdate("queries"),
                ) && (
                  <CButton
                    color="warning"
                    onClick={() => navigate(`/queries/edit/${id}`)}
                    className="d-inline-flex align-items-center px-3"
                    style={{ height: 40 }}
                  >
                    <CIcon icon={cilPencil} className="me-1" />
                    Edit
                  </CButton>
                )}
                {canDelete("queries") && (
                  <CButton
                    color="danger"
                    onClick={handleDeleteClick}
                    className="d-inline-flex align-items-center px-3"
                    style={{ height: 40 }}
                  >
                    <CIcon icon={cilTrash} className="me-1" />
                    Delete
                  </CButton>
                )}
                {canDelete("queries") && query.status !== "closed" && (
                  <CButton
                    color="dark"
                    variant="outline"
                    onClick={openCloseQueryModal}
                    className="d-inline-flex align-items-center px-3"
                    style={{ height: 40 }}
                  >
                    <CIcon icon={cilBan} className="me-1" />
                    Close
                  </CButton>
                )}
                <CButton
                  color="primary"
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={exportingPdf}
                  className="d-inline-flex align-items-center px-3"
                  style={{ height: 40 }}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  {exportingPdf ? "Exporting..." : "Export PDF"}
                </CButton>
              </div>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CRow>
        <CCol xs={12}>
          {/* 1. Company Information */}
          <CCard
            className="mb-4 border-0 shadow-sm"
            style={{ borderRadius: 10 }}
          >
            <CCardHeader
              className="border-bottom"
              style={{ backgroundColor: "#fbfcfe" }}
            >
              <strong>1. Company Information</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex flex-column flex-md-row justify-content-between gap-1">
                  <strong>Company name</strong>
                  <span>{companyName}</span>
                </CListGroupItem>
                <CListGroupItem className="d-flex flex-column flex-md-row justify-content-between gap-1">
                  <strong>Query reference by</strong>
                  <span>
                    {formatQueryReferenceByDisplay(query.queryReferenceBy)}
                  </span>
                </CListGroupItem>
                <CListGroupItem className="d-flex flex-column flex-md-row justify-content-between gap-2 align-items-md-center">
                  <strong>Location</strong>
                  {isLocationUrl(companyLocation) ? (
                    <CButton
                      type="button"
                      size="sm"
                      color="primary"
                      variant="outline"
                      className="d-inline-flex align-items-center align-self-start align-self-md-end"
                      onClick={() => openLocationInNewTab(companyLocation)}
                      title="Open location in new tab"
                    >
                      <CIcon icon={cilLocationPin} className="me-1" />
                      Open location
                    </CButton>
                  ) : (
                    <span>{companyLocation}</span>
                  )}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Purchase managers</strong>
                  <div className="mt-1">
                    {(ci.purchaseManagers || []).length > 0
                      ? (ci.purchaseManagers || []).map((m, i) => (
                          <div key={i}>
                            {m.name || "–"}
                            {m.phone ? ` • ${m.phone}` : ""}
                            {m.email ? ` • ${m.email}` : ""}
                          </div>
                        ))
                      : ci.purchase_manager_name || ci.purchase_manager_phone
                        ? `${ci.purchase_manager_name || "–"} • ${ci.purchase_manager_phone || ""}`
                        : "–"}
                  </div>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Billing address</strong>
                  <div
                    className="mt-1 text-break"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {(ci.billingAddress || ci.address || "").trim() || "-"}
                  </div>
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Shipping address</strong>
                  <div
                    className="mt-1 text-break"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {(ci.shippingAddress || ci.address || "").trim() || "-"}
                  </div>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>

          {/* 2. Products */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>2. Products</strong>{" "}
              {prods.length > 0 && (
                <span className="text-muted fw-normal">
                  ({prods.length} item{prods.length !== 1 ? "s" : ""})
                </span>
              )}
            </CCardHeader>
            <CCardBody>
              {prods.length > 0 ? (
                <CTable responsive hover bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell style={{ width: 60 }}>
                        #
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 280 }}>
                        Product name
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 130 }}>
                        Status
                      </CTableHeaderCell>
                      <CTableHeaderCell>Description</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 100 }}>
                        Quantity
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 80 }}>
                        Unit
                      </CTableHeaderCell>
                      <CTableHeaderCell>GST %</CTableHeaderCell>
                      <CTableHeaderCell>Remark</CTableHeaderCell>
                      {canToggleQuotationStatus ? (
                        <CTableHeaderCell
                          className="text-center"
                          style={{ width: 160 }}
                        >
                          Ready for quotation
                        </CTableHeaderCell>
                      ) : null}
                      <CTableHeaderCell
                        className="text-center"
                        style={{ width: 160 }}
                      >
                        Procurement rate
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ width: 120 }}>
                        Images
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {prods.map((p, index) => {
                      const productRef =
                        typeof p.product_id === "object" ? p.product_id : null;
                      const snapshotImages = Array.isArray(p.images)
                        ? p.images
                        : [];
                      const productRefImages = Array.isArray(productRef?.images)
                        ? productRef.images
                        : [];
                      const allImages =
                        (snapshotImages.length
                          ? snapshotImages
                          : productRefImages) || [];
                      const imageUrls = allImages
                        .map((img) => getImageUrl(img))
                        .filter((src) => !!src);
                      const rawCode = String(p.rawProductCode ?? "").trim();

                      return (
                        <CTableRow key={p._id || index}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell style={{ minWidth: 280 }}>
                            <div className="fw-semibold">
                              {p.productName || "—"}
                            </div>
                            {formatProductHierarchy(p) ? (
                              <div className="small text-muted mt-1 text-break">
                                {formatProductHierarchy(p)}
                              </div>
                            ) : null}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge
                              color={getProductSubStatusBadgeColor(p)}
                              className="text-nowrap"
                            >
                              {getProductSubStatusLabel(p)}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="small">
                            {productRef?.shortDescription ||
                              p.description ||
                              "—"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {p.quantity != null ? p.quantity : "—"}
                          </CTableDataCell>
                          <CTableDataCell>{p.unit || "—"}</CTableDataCell>
                          <CTableDataCell className="small">
                            {productRef?.gstPercentage != null
                              ? `${productRef.gstPercentage}%`
                              : p.gstPercentage != null
                                ? `${p.gstPercentage}%`
                                : "—"}
                          </CTableDataCell>
                          <CTableDataCell className="small">
                            {p.remark || "—"}
                          </CTableDataCell>
                          {canToggleQuotationStatus ? (
                            <CTableDataCell className="text-center align-middle">
                              {togglingQuotationStatusIndex === index ? (
                                <CSpinner size="sm" />
                              ) : (
                                <CFormCheck
                                  id={`query-product-ready-${index}`}
                                  checked={isProductReadyForQuotation(p)}
                                  onChange={(event) =>
                                    handleQuotationStatusToggle(
                                      index,
                                      event.target.checked,
                                    )
                                  }
                                  aria-label={`Mark ${p.productName || "product"} ready for quotation`}
                                />
                              )}
                            </CTableDataCell>
                          ) : null}
                          <CTableDataCell className="text-center align-middle">
                            <div className="d-flex flex-column align-items-center gap-1">
                              <ProcurementRateAvailabilityBadge
                                loading={lineRateAvailability[index]?.loading}
                                available={
                                  lineRateAvailability[index]?.available
                                }
                                hasProductCode={Boolean(rawCode)}
                              />
                              {rawCode ? (
                                <CButton
                                  type="button"
                                  color="secondary"
                                  variant="ghost"
                                  size="sm"
                                  className="p-1"
                                  title="View procurement rates"
                                  aria-label="View procurement rates"
                                  onClick={() =>
                                    openProcurementRatesModal(p, index)
                                  }
                                >
                                  <CIcon icon={cilList} size="lg" />
                                </CButton>
                              ) : null}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            {imageUrls.length > 0 ? (
                              <div
                                role="button"
                                tabIndex={0}
                                className="d-inline-flex align-items-center gap-1 flex-wrap"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  setExpandedImages(imageUrls);
                                  setExpandedImageIndex(0);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    setExpandedImages(imageUrls);
                                    setExpandedImageIndex(0);
                                  }
                                }}
                              >
                                {imageUrls.slice(0, 2).map((src, i) => (
                                  <div
                                    key={src || i}
                                    className="rounded border overflow-hidden flex-shrink-0"
                                    style={{ width: 48, height: 48 }}
                                  >
                                    <CImage
                                      src={src}
                                      width={48}
                                      height={48}
                                      className="object-fit-cover w-100 h-100"
                                    />
                                  </div>
                                ))}
                                {imageUrls.length > 2 && (
                                  <div
                                    className="d-flex align-items-center justify-content-center rounded border bg-light flex-shrink-0 text-primary small fw-bold"
                                    style={{
                                      width: 40,
                                      height: 40,
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    +{imageUrls.length - 2}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      );
                    })}
                  </CTableBody>
                </CTable>
              ) : (
                <p className="text-muted mb-0">No products added.</p>
              )}
            </CCardBody>
          </CCard>

          {isHodRole(user?.role) ? (
            <CCard className="mb-4 overflow-hidden">
              <button
                type="button"
                className={`w-100 border-0 bg-transparent px-3 py-3 d-flex align-items-center justify-content-between text-start ${
                  analyticsExpanded ? "" : "collapsed"
                }`}
                aria-expanded={analyticsExpanded}
                onClick={() => toggleAnalyticsPanel(companyName)}
              >
                <span>
                  <strong>3. Analytics</strong>
                  <span className="text-muted small ms-2 fw-normal">
                    {companyName !== "-" ? companyName : "Company insights"}
                  </span>
                </span>
                <span className="text-muted small">
                  {analyticsExpanded ? "Hide" : "Show"}
                </span>
              </button>
              <CCollapse visible={analyticsExpanded}>
                <CCardBody className="border-top pt-3">
                  {companyAnalyticsLoading ? (
                    <div className="text-center py-4">
                      <CSpinner size="sm" />
                      <div className="small text-muted mt-2">
                        Loading company analytics…
                      </div>
                    </div>
                  ) : companyAnalyticsLoaded ? (
                    <>
                      {companyAnalyticsError ? (
                        <CAlert color="danger" className="mb-3">
                          {companyAnalyticsError}
                          <div className="mt-2">
                            <CButton
                              color="primary"
                              size="sm"
                              variant="outline"
                              onClick={() => loadCompanyAnalytics(companyName)}
                            >
                              Retry
                            </CButton>
                          </div>
                        </CAlert>
                      ) : null}
                      {(() => {
                        const analytics = normalizeCompanyAnalytics(
                          companyAnalytics,
                          companyName,
                        );
                        return (
                          <>
                            {!analytics.hasCompanyLink ? (
                              <p className="text-muted small mb-3">
                                Link this query to a company to view analytics.
                              </p>
                            ) : null}
                            <p className="text-muted small mb-3">
                              Summary for{" "}
                              <strong>{analytics.companyName}</strong>
                              {analytics.monthLabel
                                ? ` · ${analytics.monthLabel}`
                                : ""}
                            </p>
                            <CRow className="g-3">
                              <CCol sm={6} md={4}>
                                <div className="border rounded p-3 h-100 bg-light">
                                  <div className="text-muted small">
                                    Pending queries
                                  </div>
                                  <div className="fs-4 fw-semibold mb-0">
                                    {analytics.pendingQueries}
                                  </div>
                                  <div className="text-muted small mt-1">
                                    Draft queries not yet converted
                                  </div>
                                </div>
                              </CCol>
                              <CCol sm={6} md={4}>
                                <div className="border rounded p-3 h-100 bg-light">
                                  <div className="text-muted small">
                                    Total queries
                                  </div>
                                  <div className="fs-4 fw-semibold mb-0">
                                    {analytics.totalQueries}
                                  </div>
                                  <div className="text-muted small mt-1">
                                    All queries for this company
                                  </div>
                                </div>
                              </CCol>
                              <CCol sm={12} md={4}>
                                <div className="border rounded p-3 h-100 bg-light">
                                  <div className="text-muted small">
                                    Converted to quotation (this month)
                                  </div>
                                  <div className="fs-4 fw-semibold mb-0">
                                    {analytics.convertedToQuotationThisMonth}
                                  </div>
                                  <div className="text-muted small mt-1">
                                    Queries with a quotation created in{" "}
                                    {analytics.monthLabel || "this month"}
                                  </div>
                                </div>
                              </CCol>
                            </CRow>
                          </>
                        );
                      })()}
                    </>
                  ) : null}
                </CCardBody>
              </CCollapse>
            </CCard>
          ) : null}
        </CCol>
      </CRow>

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
        title="Convert to quotation?"
        message={`Convert ${filterProductsReadyForQuotation(prods).length} product(s) marked ready for quotation?`}
        confirmText="Yes, convert"
        cancelText="Cancel"
      />
      <CModal
        visible={procurementRatesModal.visible}
        onClose={() =>
          !procurementRatesModal.loading && closeProcurementRatesModal()
        }
        alignment="center"
        size="lg"
      >
        <CModalHeader>
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
              <div className="small text-muted mb-2">
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
        visible={closeModalVisible}
        onClose={() => !closing && setCloseModalVisible(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Close query</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel htmlFor="query-close-remark">
            Remark (optional)
          </CFormLabel>
          <CFormTextarea
            id="query-close-remark"
            rows={4}
            value={closeRemark}
            onChange={(e) => setCloseRemark(e.target.value)}
            placeholder="Add a remark for closing this query"
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => setCloseModalVisible(false)}
            disabled={closing}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleCloseQuerySave}
            disabled={closing}
          >
            {closing ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </CButton>
        </CModalFooter>
      </CModal>
      {/* Image slider modal */}
      <CModal
        alignment="center"
        visible={expandedImages.length > 0}
        onClose={() => setExpandedImages([])}
        className="p-0"
      >
        <CModalHeader className="border-0 pb-0 d-flex justify-content-between align-items-center">
          <CModalTitle className="mb-0">
            Image{" "}
            {expandedImages.length > 1
              ? `${expandedImageIndex + 1} / ${expandedImages.length}`
              : ""}
          </CModalTitle>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            className="rounded-circle"
            onClick={() => setExpandedImages([])}
            aria-label="Close"
          >
            <CIcon icon={cilX} size="lg" />
          </CButton>
        </CModalHeader>
        <CModalBody className="text-center p-3 position-relative">
          {expandedImages.length > 0 && (
            <>
              {expandedImages.length > 1 && (
                <>
                  <CButton
                    color="light"
                    variant="outline"
                    className="position-absolute top-50 translate-middle-y rounded-circle ms-2"
                    style={{ zIndex: 10, width: 48, height: 48, left: 0 }}
                    onClick={() =>
                      setExpandedImageIndex((idx) =>
                        idx <= 0 ? expandedImages.length - 1 : idx - 1,
                      )
                    }
                    aria-label="Previous"
                  >
                    <CIcon icon={cilArrowLeft} size="lg" />
                  </CButton>
                  <CButton
                    color="light"
                    variant="outline"
                    className="position-absolute top-50 translate-middle-y rounded-circle me-2"
                    style={{ zIndex: 10, width: 48, height: 48, right: 0 }}
                    onClick={() =>
                      setExpandedImageIndex((idx) =>
                        idx >= expandedImages.length - 1 ? 0 : idx + 1,
                      )
                    }
                    aria-label="Next"
                  >
                    <CIcon icon={cilArrowRight} size="lg" />
                  </CButton>
                </>
              )}
              <img
                src={expandedImages[expandedImageIndex]}
                alt={`Product ${expandedImageIndex + 1}`}
                className="img-fluid rounded"
                style={{ maxHeight: "80vh", objectFit: "contain" }}
              />
            </>
          )}
        </CModalBody>
      </CModal>
    </>
  );
};

export default QueryView;
