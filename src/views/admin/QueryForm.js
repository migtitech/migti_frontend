import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  X,
  Hash,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Landmark,
  Briefcase,
  FileBadge,
  StickyNote,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Alert,
  AlertDescription,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Progress,
  Badge,
  Checkbox,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui";
import queryService from "../../services/queryService";
import industryService from "../../services/industryService";
import bpDummy from "../../data/businessPartnerDummy";
import areaService from "../../services/areaService";
import {
  buildAreaNameLookup,
  formatAreaDisplay,
  getAreaId,
} from "../../utils/areaDisplay";
import subZoneService from "../../services/subZoneService";
import queryNewProductService from "../../services/queryNewProductService";
import groupService from "../../services/groupService";
import categoryService from "../../services/categoryService";
import subcategoryService from "../../services/subcategoryService";
import productService from "../../services/productService";
import documentService from "../../services/documentService";
import { useAuth } from "../../context/AuthContext";
import usePermissions, { canEditQuery } from "../../hooks/usePermissions";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { getAssetsUrl, getAssetsBaseUrl, DOCUMENTS } from "../../api/endpoints";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";

const INITIAL_COMPANY = {
  name: "",
  area: "",
  subZoneId: "",
  location: "",
  billingAddress: "",
  shippingAddress: "",
  purchaseManagers: [],
};

// Fallback sample values shown when a client field has no real/overlay data
// yet, so the client details panel always demonstrates its full layout.
const CLIENT_DUMMY_FALLBACK = {
  clientType: "Customer",
  industrySector: "Manufacturing",
  registrationNumber: "REG-2024-00123",
  pan: "ABCPL4321F",
  gstNumber: "27AABCU9603R1ZM",
  category: "A",
  website: "https://www.acmeindustries.com",
  companyEmail: "contact@acmeindustries.com",
  companyPhone: "+91 98765 43210",
  numberOfEmployees: 250,
  annualRevenue: 50000000,
  registeredAddress: "Plot 45, Industrial Area, Phase II, MIDC",
  country: "India",
  state: "Maharashtra",
  city: "Mumbai",
  pincode: "400001",
  currency: "INR",
  paymentTerms: "Net 30",
  creditLimit: 500000,
  remarks: "Key account with steady quarterly orders.",
  internalComments: "Prefers email communication over phone calls.",
};

const clientOverlayOr = (overlay, key) => {
  const value = overlay?.[key];
  if (value === "" || value === null || value === undefined) {
    return CLIENT_DUMMY_FALLBACK[key];
  }
  return value;
};

const formatClientCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "-";
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
};

const getPurchaseManagerKey = (purchaseManager) =>
  `${(purchaseManager?.name || "").trim().toLowerCase()}|${(purchaseManager?.phone || "").trim()}|${(purchaseManager?.email || "").trim()}`;

const mapPurchaseManagers = (list, selectedKeys = null) =>
  (list || []).map((purchaseManager) => ({
    name: purchaseManager?.name || "",
    phone: purchaseManager?.phone || "",
    email: purchaseManager?.email || "",
    department: purchaseManager?.department || "",
    selected: selectedKeys
      ? selectedKeys.has(getPurchaseManagerKey(purchaseManager))
      : true,
  }));

const isPurchaseManagerSelected = (purchaseManager) =>
  purchaseManager?.selected !== false;

const getSelectedPurchaseManagersForApi = (list) =>
  (list || [])
    .filter(isPurchaseManagerSelected)
    .map(({ name, phone, email, department }) => ({
      name: (name || "").trim(),
      phone: (phone || "").trim(),
      email: (email || "").trim(),
      department: (department || "").trim(),
    }))
    .filter((purchaseManager) => purchaseManager.name || purchaseManager.phone);

const QueryFormDetailField = ({ label, children, className = "" }) => (
  <div className={className}>
    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="break-words text-sm font-medium text-foreground">
      {children ?? "—"}
    </div>
  </div>
);

const getVariantComboDisplay = (combo) => {
  const parts = (combo?.optionValues || [])
    .map((option) => option?.variantValue || "")
    .filter(Boolean);
  return parts.join(", ");
};

const getCatalogProductAttributes = (product) =>
  (product?.variants || []).filter((attribute) =>
    String(attribute?.name || "").trim(),
  );

const combinationMatchesSelections = (combo, selections = {}) => {
  const activeSelections = Object.entries(selections).filter(([, value]) =>
    String(value || "").trim(),
  );
  if (activeSelections.length === 0) return true;
  return activeSelections.every(([attributeName, attributeValue]) =>
    (combo?.optionValues || []).some(
      (option) =>
        option.variantName === attributeName &&
        option.variantValue === attributeValue,
    ),
  );
};

const getVariantCombinationLabel = (combo) =>
  [getVariantComboDisplay(combo), combo?.variantCode]
    .filter(Boolean)
    .join(" · ");

const rankVariantCombinationMatch = (combo, term) => {
  if (!term) return 0;
  const label = getVariantCombinationLabel(combo).toLowerCase();
  const display = getVariantComboDisplay(combo).toLowerCase();
  const code = String(combo?.variantCode || "").toLowerCase();
  if (label === term || code === term) return 100;
  if (label.startsWith(term) || code.startsWith(term)) return 85;
  if (display.startsWith(term)) return 75;
  if (label.includes(term)) return 60;
  const words = term.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.every((word) => label.includes(word))) {
    return 45;
  }
  return 0;
};

const getTopVariantCombinationMatches = (
  combinations,
  searchTerm,
  limit = 3,
) => {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];
  return combinations
    .map((combo) => ({
      combo,
      score: rankVariantCombinationMatch(combo, term),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.combo);
};

const mapProductImageDocs = (images = []) =>
  (images || [])
    .map((img) => {
      if (typeof img === "object" && img?._id) {
        return { _id: img._id, path: img.path || "" };
      }
      if (typeof img === "string" && /^[a-fA-F0-9]{24}$/.test(img)) {
        return { _id: img, path: "" };
      }
      return null;
    })
    .filter(Boolean);

const INITIAL_VARIANT = { variantName: "" };

const INITIAL_PRODUCT = {
  productName: "",
  quantity: "",
  unit: "",
  hsnNumber: "",
  modelNumber: "",
  gstPercentage: null,
  variants: [],
  remark: "",
  description: "",
  product_id: null,
  productCode: "",
  /** From shared product sequence (e.g. mig1000); set when new product is saved to `query_new_product` or from server. */
  rawProductCode: "",
  /** Ritems sequence (QTRK1000) from `query_new_product` on mark-as-new; shown on the line. */
  query_tracking_code: "",
  groupId: "",
  categoryId: "",
  subcategoryId: "",
  isNewProduct: true,
  images: [],
  /** Set when the row was prefilled from an existing `query_new_product` (skip re-create on save). */
  sourceQueryNewProductId: null,
};

const STEPS = [
  { id: 1, label: "Company Information" },
  { id: 2, label: "Products" },
  { id: 3, label: "Preview" },
];

const DRAFT_STORAGE_KEY = "migticrm_query_draft";
const MAX_PRODUCT_IMAGES = 3;
const MAX_PRODUCT_QUANTITY = 100000;

const productQuantitySchema = yup.object({
  quantity: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null ? NaN : value,
    )
    .typeError("Quantity is required")
    .required("Quantity is required")
    .integer("Quantity must be a whole number")
    .min(0, "Quantity must be 0 or more")
    .max(MAX_PRODUCT_QUANTITY, "Quantity cannot exceed 1,00,000"),
});

const QueryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { canUpdate } = usePermissions();
  const isEdit = Boolean(id);
  /** New query only: each line must have group + category (edit keeps them optional). */
  const requireGroupCategory = !isEdit;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  // Company section – industry search & snapshot (stored in query, editable)
  const [industrySearch, setIndustrySearch] = useState("");
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [industrySearchResults, setIndustrySearchResults] = useState([]);
  const [industrySearchLoading, setIndustrySearchLoading] = useState(false);
  const [industryId, setIndustryId] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(INITIAL_COMPANY);
  const [contactPersons, setContactPersons] = useState([]);
  const [clientCode, setClientCode] = useState("");
  const [clientOverlay, setClientOverlay] = useState(null);
  const [clientRealFields, setClientRealFields] = useState({
    gstNumber: "",
    category: "",
  });
  const [queryReferenceBy, setQueryReferenceBy] = useState("");
  const [areas, setAreas] = useState([]);
  const [querySubZones, setQuerySubZones] = useState([]);
  const [allSubZones, setAllSubZones] = useState([]);
  const companyDropdownRef = useRef(null);

  // Products – form for add/edit one, then table of all added
  const [products, setProducts] = useState([]);
  const [formProduct, setFormProduct] = useState({ ...INITIAL_PRODUCT });
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [catalogProductSearch, setCatalogProductSearch] = useState("");
  const [catalogProductDropdownOpen, setCatalogProductDropdownOpen] =
    useState(false);
  const [catalogProductSearchResults, setCatalogProductSearchResults] =
    useState([]);
  const [catalogProductSearchLoading, setCatalogProductSearchLoading] =
    useState(false);
  const catalogProductDropdownRef = useRef(null);

  const quantityInputRef = useRef(null);
  const [imagesModal, setImagesModal] = useState({
    visible: false,
    images: [],
  });
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [productImagePreviews, setProductImagePreviews] = useState([]);
  const [addingProductToQuery, setAddingProductToQuery] = useState(false);
  const [catalogProductDetail, setCatalogProductDetail] = useState(null);
  const [catalogVariantSelections, setCatalogVariantSelections] = useState({});
  const [selectedVariantCombinationId, setSelectedVariantCombinationId] =
    useState("");
  const [variantCombinationSearch, setVariantCombinationSearch] = useState("");
  const [variantCombinationDropdownOpen, setVariantCombinationDropdownOpen] =
    useState(false);
  const [productGroups, setProductGroups] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productSubcategories, setProductSubcategories] = useState([]);
  /** For table labels: top-level (parent null) categories; loaded with pagination (API caps 100 per page) */
  const [allTableCategories, setAllTableCategories] = useState([]);
  /** categoryId (string) -> name for rows not in allTableCategories / productCategories (e.g. subcategories) */
  const [categoryNameById, setCategoryNameById] = useState({});

  const {
    register: registerProductQuantityField,
    reset: resetProductQuantityForm,
    trigger: triggerProductQuantityField,
    getValues: getProductQuantityFormValues,
    formState: { errors: productQuantityFormErrors },
  } = useForm({
    resolver: yupResolver(productQuantitySchema),
    defaultValues: { quantity: "" },
    mode: "onChange",
  });

  const syncProductQuantityField = useCallback(
    (quantity) => {
      resetProductQuantityForm({ quantity: quantity ?? "" });
    },
    [resetProductQuantityForm],
  );

  const getSubZoneId = (sz) => (typeof sz === "object" ? sz?._id : sz) || "";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const aid = companyInfo.area;
      if (!aid) {
        setQuerySubZones([]);
        return;
      }
      try {
        const res = await subZoneService.listByZone(aid);
        const data = res?.data?.data || res?.data || res;
        const list = data?.subZones || [];
        if (!cancelled) setQuerySubZones(list || []);
      } catch {
        if (!cancelled) setQuerySubZones([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [companyInfo.area]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await subZoneService.listGrouped();
        const data = res?.data?.data || res?.data || res;
        const zones = data?.zones || [];
        const flattened = zones.flatMap((zone) => zone?.subZones || []);
        if (!cancelled) setAllSubZones(flattened);
      } catch {
        if (!cancelled) setAllSubZones([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const goToStep = (step) => {
    if (step < 1 || step > STEPS.length) return;
    setCurrentStep(step);
  };

  // Load draft from localStorage for new query (not edit)
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.companyInfo) setCompanyInfo(draft.companyInfo);
      if (typeof draft.queryReferenceBy === "string") {
        setQueryReferenceBy(draft.queryReferenceBy);
      }
      if (draft.industryId) setIndustryId(draft.industryId);
      if (typeof draft.currentStep === "number")
        setCurrentStep(draft.currentStep);
      if (typeof draft.industrySearch === "string")
        setIndustrySearch(draft.industrySearch);
      if (Array.isArray(draft.products)) setProducts(draft.products);
    } catch {
      // ignore corrupt draft
    }
  }, [isEdit]);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await areaService.getAll({ pageSize: 100 });
        const data = res?.data || res;
        setAreas(data?.areas || []);
      } catch {
        setAreas([]);
      }
    };
    fetchAreas();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await groupService.getAll({ pageNumber: 1, pageSize: 100 });
        const data = res?.data || res;
        if (!cancelled) setProductGroups(data?.groups || []);
      } catch {
        if (!cancelled) setProductGroups([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const merged = [];
      const pageSize = 100;
      try {
        let page = 1;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const res = await categoryService.getAll({
            pageNumber: page,
            pageSize,
            parent: "null",
          });
          const data = res?.data || res;
          const list = data?.categories || [];
          merged.push(...list);
          if (list.length < pageSize) hasMore = false;
          else page += 1;
        }
        if (!cancelled) setAllTableCategories(merged);
      } catch {
        if (!cancelled) setAllTableCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Resolve category labels for added products when id is not in the paginated list (e.g. subcategory or new root past old cache). */
  useEffect(() => {
    const inLists = (sid) =>
      allTableCategories.some((x) => String(x._id || x.id) === sid) ||
      productCategories.some((x) => String(x._id || x.id) === sid) ||
      Boolean(categoryNameById[sid]);

    const ids = new Set();
    for (const p of products) {
      const c = p?.categoryId;
      if (c == null || c === "") continue;
      if (typeof c === "object" && c?.name) continue;
      const sid = String(typeof c === "object" && c?._id ? c._id : c).trim();
      if (!/^[a-f0-9]{24}$/i.test(sid)) continue;
      if (inLists(sid)) continue;
      ids.add(sid);
      const sc = p?.subcategoryId;
      if (sc == null || sc === "") continue;
      if (typeof sc === "object" && sc?.name) continue;
      const ssid = String(
        typeof sc === "object" && sc?._id ? sc._id : sc,
      ).trim();
      if (!/^[a-f0-9]{24}$/i.test(ssid)) continue;
      if (inLists(ssid)) continue;
      ids.add(ssid);
    }
    if (ids.size === 0) return;
    let cancelled = false;
    (async () => {
      const updates = {};
      await Promise.all(
        [...ids].map(async (sid) => {
          try {
            const res = await categoryService.getById(sid);
            const data = res?.data || res;
            const cat = data?.data ?? data;
            if (cat?.name) updates[sid] = cat.name;
            return;
          } catch {
            // try subcategory
          }
          try {
            const res = await subcategoryService.getById(sid);
            const data = res?.data || res;
            const sub = data?.data ?? data;
            if (sub?.name) updates[sid] = sub.name;
          } catch {
            // ignore
          }
        }),
      );
      if (!cancelled && Object.keys(updates).length > 0) {
        setCategoryNameById((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [products, allTableCategories, productCategories, categoryNameById]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const gid = formProduct.groupId;
      const params = { pageNumber: 1, pageSize: 100, parent: "null" };
      if (gid) params.group = gid;
      try {
        const res = await categoryService.getAll(params);
        const data = res?.data || res;
        if (!cancelled) setProductCategories(data?.categories || []);
      } catch {
        if (!cancelled) setProductCategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [formProduct.groupId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const cid = formProduct.categoryId;
      if (!cid) {
        if (!cancelled) setProductSubcategories([]);
        return;
      }
      try {
        const res = await subcategoryService.getAllSubcategories({
          category: cid,
        });
        const data = res?.data || res;
        const inner = data?.data ?? data;
        if (!cancelled) setProductSubcategories(inner?.subcategories || []);
      } catch {
        if (!cancelled) setProductSubcategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [formProduct.categoryId]);

  // Auto-save draft to localStorage whenever relevant state changes (for new query only)
  useEffect(() => {
    if (isEdit) return;
    try {
      const draft = {
        companyInfo,
        queryReferenceBy,
        industryId,
        industrySearch,
        products,
        currentStep,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
  }, [
    companyInfo,
    queryReferenceBy,
    industryId,
    industrySearch,
    products,
    currentStep,
    isEdit,
  ]);

  // Industry search – top 5 matches
  const fetchIndustrySearch = useCallback(async (term) => {
    if (!term?.trim()) {
      setIndustrySearchResults([]);
      return;
    }
    setIndustrySearchLoading(true);
    try {
      const res = await industryService.getAll({
        search: term.trim(),
        pageSize: 5,
      });
      const data = res?.data || res;
      setIndustrySearchResults(data?.industries || []);
    } catch {
      setIndustrySearchResults([]);
    } finally {
      setIndustrySearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchIndustrySearch(industrySearch), 300);
    return () => clearTimeout(t);
  }, [industrySearch, fetchIndustrySearch]);

  const fetchCatalogProductSearch = useCallback(async (term) => {
    if (!term?.trim()) {
      setCatalogProductSearchResults([]);
      return;
    }
    setCatalogProductSearchLoading(true);
    try {
      const res = await productService.getAll({
        search: term.trim(),
        pageNumber: 1,
        pageSize: 8,
        status: "hod_approved",
      });
      const inner = res?.data ?? res;
      setCatalogProductSearchResults(
        inner?.data?.products || inner?.products || [],
      );
    } catch {
      setCatalogProductSearchResults([]);
    } finally {
      setCatalogProductSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => fetchCatalogProductSearch(catalogProductSearch),
      300,
    );
    return () => clearTimeout(t);
  }, [catalogProductSearch, fetchCatalogProductSearch]);

  const loadContactPersonsForIndustry = (indId) => {
    const linked = bpDummy
      .listContactPersons({ parentType: "industry" })
      .filter((cp) => cp.mappedId === indId && cp.status !== "inactive");
    setContactPersons(linked.map((cp) => ({ ...cp, selected: true })));
  };

  const handleSelectIndustry = async (industry) => {
    const indId = industry._id || industry.id;
    setIndustryId(indId);
    setIndustrySearch(
      (industry.name || "") +
        (industry.location ? ` (${industry.location})` : ""),
    );
    setIndustryDropdownOpen(false);
    loadContactPersonsForIndustry(indId);
    setClientCode(bpDummy.getOrCreateCode("industry", indId));
    setClientOverlay(bpDummy.getOverlay("industry", indId));
    try {
      const res = await industryService.getById(indId);
      const data = res?.data || res;
      const areaVal = data?.area;
      setClientRealFields({
        gstNumber: data?.gstNumber || "",
        category: data?.category || "",
      });
      setCompanyInfo({
        name: data?.name || "",
        area: getAreaId(areaVal) || "",
        subZoneId: getSubZoneId(data?.subZoneId) || "",
        location: data?.location || "",
        billingAddress: data?.billingAddress || data?.address || "",
        shippingAddress: data?.shippingAddress || data?.address || "",
        purchaseManagers: mapPurchaseManagers(data?.purchaseManagers),
      });
    } catch {
      setClientRealFields({
        gstNumber: industry?.gstNumber || "",
        category: industry?.category || "",
      });
      setCompanyInfo({
        name: industry?.name || "",
        area: getAreaId(industry?.area) || "",
        subZoneId: getSubZoneId(industry?.subZoneId) || "",
        location: industry?.location || "",
        billingAddress: industry?.billingAddress || industry?.address || "",
        shippingAddress: industry?.shippingAddress || industry?.address || "",
        purchaseManagers: mapPurchaseManagers(industry?.purchaseManagers),
      });
    }
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 200);
  };

  const toggleContactPersonSelected = (contactId, checked) => {
    setContactPersons((prev) =>
      prev.map((cp) =>
        cp.id === contactId ? { ...cp, selected: checked === true } : cp,
      ),
    );
  };

  const handleClearIndustry = () => {
    setIndustryId(null);
    setIndustrySearch("");
    setCompanyInfo(INITIAL_COMPANY);
    setContactPersons([]);
    setClientCode("");
    setClientOverlay(null);
    setClientRealFields({ gstNumber: "", category: "" });
    setQueryReferenceBy("");
  };

  const resetCatalogVariantState = () => {
    setCatalogProductDetail(null);
    setCatalogVariantSelections({});
    setSelectedVariantCombinationId("");
    setVariantCombinationSearch("");
    setVariantCombinationDropdownOpen(false);
  };

  const loadCatalogProductDetail = async (productId) => {
    if (!productId) {
      setCatalogProductDetail(null);
      return;
    }
    try {
      const res = await productService.getById(productId);
      const detail = res?.data?.data ?? res?.data ?? res;
      setCatalogProductDetail(detail || null);
    } catch {
      setCatalogProductDetail(null);
    }
  };

  const applyVariantCombinationToForm = useCallback((combo) => {
    if (!combo) return;
    const imageDocs = mapProductImageDocs(combo.images);
    const selections = {};
    (combo.optionValues || []).forEach((option) => {
      if (option?.variantName) {
        selections[option.variantName] = option.variantValue || "";
      }
    });
    setCatalogVariantSelections(selections);
    setSelectedVariantCombinationId(String(combo._id || ""));
    setVariantCombinationSearch(getVariantCombinationLabel(combo));
    setVariantCombinationDropdownOpen(false);
    setFormProduct((prev) => ({
      ...prev,
      variants: [{ variantName: getVariantComboDisplay(combo) }],
      rawProductCode: combo.variantCode || prev.rawProductCode,
      hsnNumber: combo.hsnNumber || prev.hsnNumber,
      modelNumber: combo.modelNumber || prev.modelNumber,
      gstPercentage:
        combo.gstPercentage != null && combo.gstPercentage !== ""
          ? Number(combo.gstPercentage)
          : prev.gstPercentage,
      images: imageDocs.length > 0 ? imageDocs : prev.images,
    }));
  }, []);

  const applyProductFromCatalog = (product) => {
    if (!product) return;
    const imageDocs = mapProductImageDocs(product.images);
    const productId = product._id || product.id;

    resetCatalogVariantState();

    setFormProduct({
      productName: product.name || "",
      quantity: 1,
      unit:
        (product.salesUnit && String(product.salesUnit).trim()) ||
        (product.unit && String(product.unit).trim()) ||
        "PCS",
      hsnNumber: product.hsnNumber || "",
      modelNumber: product.defaultModelNumber || "",
      gstPercentage:
        typeof product.gstPercentage === "number" &&
        !Number.isNaN(product.gstPercentage)
          ? product.gstPercentage
          : null,
      variants: [],
      remark: "",
      description: product.shortDescription || "",
      product_id: product._id || null,
      productCode: product.productCode || "",
      rawProductCode: product.productCode || "",
      query_tracking_code: "",
      groupId: (product.group && (product.group._id || product.group)) || "",
      categoryId:
        (product.category && (product.category._id || product.category)) || "",
      subcategoryId:
        (product.subcategory &&
          (product.subcategory._id || product.subcategory)) ||
        "",
      isNewProduct: false,
      images: imageDocs,
      sourceQueryNewProductId: null,
    });
    setEditingProductIndex(null);
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    setProductImagePreviews([]);
    setProductImageFiles([]);
    syncProductQuantityField(1);
    setProductFormVisible(true);
    setCatalogProductSearch(product.name || "");
    setCatalogProductDropdownOpen(false);
    loadCatalogProductDetail(productId);
    setTimeout(() => {
      if (quantityInputRef.current) {
        quantityInputRef.current.focus();
      }
    }, 0);
    toastSuccess("Product details loaded. Review and save to add to the list.");
  };

  const handleSelectCatalogProduct = (product) => {
    applyProductFromCatalog(product);
  };

  const handleCatalogVariantAttributeChange = (
    attributeName,
    attributeValue,
  ) => {
    setCatalogVariantSelections((previousSelections) => ({
      ...previousSelections,
      [attributeName]: attributeValue,
    }));
    setSelectedVariantCombinationId("");
    setVariantCombinationSearch("");
    setVariantCombinationDropdownOpen(false);
    setFormProduct((prev) => ({
      ...prev,
      variants: [],
      rawProductCode: prev.productCode || prev.rawProductCode,
    }));
  };

  const handleSelectVariantCombination = (combinationId) => {
    if (!combinationId) {
      setSelectedVariantCombinationId("");
      setVariantCombinationSearch("");
      setFormProduct((prev) => ({
        ...prev,
        variants: [],
        rawProductCode: prev.productCode || prev.rawProductCode,
      }));
      return;
    }
    const combo = (catalogProductDetail?.variantCombinations || []).find(
      (item) => String(item._id) === String(combinationId),
    );
    if (combo) {
      applyVariantCombinationToForm(combo);
    }
  };

  const handleStartCreateProduct = () => {
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    setProductImagePreviews([]);
    setProductImageFiles([]);
    setFormProduct({ ...INITIAL_PRODUCT, isNewProduct: true });
    setEditingProductIndex(null);
    resetCatalogVariantState();
    syncProductQuantityField("");
    setProductFormVisible(true);
    setCatalogProductSearch("");
    setCatalogProductDropdownOpen(false);
  };

  const handleBackToProductSearch = () => {
    clearProductForm();
  };

  const clearProductForm = () => {
    setFormProduct({ ...INITIAL_PRODUCT });
    setEditingProductIndex(null);
    setProductFormVisible(false);
    setCatalogProductSearch("");
    setCatalogProductDropdownOpen(false);
    resetCatalogVariantState();
    syncProductQuantityField("");
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    setProductImagePreviews([]);
    setProductImageFiles([]);
  };

  const saveProduct = async () => {
    if (!formProduct.productName?.trim()) {
      toastError("Product name is required");
      return;
    }
    const catalogAttributes = getCatalogProductAttributes(catalogProductDetail);
    const catalogCombinations = (
      catalogProductDetail?.variantCombinations || []
    ).filter((combo) => combo?.isActive !== false);
    if (
      !formProduct.isNewProduct &&
      catalogAttributes.length > 0 &&
      catalogCombinations.length > 0 &&
      !selectedVariantCombinationId
    ) {
      toastError("Please select a variant combination");
      return;
    }
    const isQuantityValid = await triggerProductQuantityField("quantity");
    if (!isQuantityValid) {
      return;
    }
    const validatedQuantity = getProductQuantityFormValues("quantity");
    const productLine = { ...formProduct, quantity: validatedQuantity };
    if (requireGroupCategory) {
      if (!String(formProduct.groupId || "").trim()) {
        toastError("Group is required");
        return;
      }
      if (!String(formProduct.categoryId || "").trim()) {
        toastError("Category is required");
        return;
      }
    }

    setAddingProductToQuery(true);
    try {
      let uploadedDocs = [];
      if (productImageFiles.length > 0) {
        try {
          const res = await documentService.uploadImages(productImageFiles);
          const payload = res?.data || res;
          const docs = payload?.data?.documents || payload?.documents || [];
          uploadedDocs = docs.map((d) => ({
            _id: d._id || d.id,
            path: d.path || d.url || "",
          }));
        } catch (err) {
          toastError(err?.message || "Failed to upload images");
          return;
        }
      }

      let createdQueryNewProduct = null;
      if (
        formProduct.isNewProduct &&
        !formProduct.productCode &&
        !formProduct.sourceQueryNewProductId
      ) {
        try {
          const newPayload = {
            name: (formProduct.productName || "").trim(),
            description: (formProduct.description || "").trim(),
            unit: (formProduct.unit || "").trim(),
            hsnNumber: (formProduct.hsnNumber || "").trim(),
            modelNumber: (formProduct.modelNumber || "").trim(),
            groupId: formProduct.groupId || null,
            categoryId: formProduct.categoryId || null,
            subcategoryId: formProduct.subcategoryId || null,
            qty: (() => {
              const quantityValue = Number(validatedQuantity);
              if (Number.isFinite(quantityValue) && quantityValue >= 0)
                return Number.isInteger(quantityValue)
                  ? quantityValue
                  : Math.max(0, Math.floor(quantityValue));
              return 1;
            })(),
            variants: (formProduct.variants || [])
              .map((v) => (v.variantName || "").trim())
              .filter(Boolean),
            images: uploadedDocs.map((d) => d._id),
          };
          if (newPayload.name) {
            const res = await queryNewProductService.create(newPayload);
            createdQueryNewProduct = res?.data;
          }
        } catch (err) {
          toastError(err?.message || "Failed to save new product");
          return;
        }
      }

      const codeAndRefFromNew =
        createdQueryNewProduct && createdQueryNewProduct._id
          ? {
              rawProductCode: createdQueryNewProduct.rawProductCode || "",
              query_tracking_code:
                createdQueryNewProduct.query_tracking_code || "",
              sourceQueryNewProductId: createdQueryNewProduct._id,
              groupId: formProduct.groupId || "",
              categoryId: formProduct.categoryId || "",
              subcategoryId: formProduct.subcategoryId || "",
            }
          : {};

      const mergedImages = (formProduct.images || [])
        .concat(uploadedDocs)
        .slice(0, MAX_PRODUCT_IMAGES);
      const cleanedVariants = (formProduct.variants || [])
        .map((v) => ({ variantName: (v?.variantName || "").trim() }))
        .filter((v) => v.variantName);

      const productsToAdd =
        cleanedVariants.length > 0
          ? cleanedVariants.map((variant) => ({
              ...productLine,
              ...codeAndRefFromNew,
              variants: [{ ...variant }],
              images: mergedImages,
            }))
          : [
              {
                ...productLine,
                ...codeAndRefFromNew,
                images: mergedImages,
              },
            ];

      setProducts((prev) => [...prev, ...productsToAdd]);
      clearProductForm();
      toastSuccess(
        productsToAdd.length > 1
          ? `${productsToAdd.length} products added to list (one per variant)`
          : "Product added to list",
      );
    } finally {
      setAddingProductToQuery(false);
    }
  };

  const updateProductInList = async () => {
    if (editingProductIndex == null || !formProduct.productName?.trim()) {
      if (!formProduct.productName?.trim())
        toastError("Product name is required");
      return;
    }
    const catalogAttributes = getCatalogProductAttributes(catalogProductDetail);
    const catalogCombinations = (
      catalogProductDetail?.variantCombinations || []
    ).filter((combo) => combo?.isActive !== false);
    if (
      !formProduct.isNewProduct &&
      catalogAttributes.length > 0 &&
      catalogCombinations.length > 0 &&
      !selectedVariantCombinationId
    ) {
      toastError("Please select a variant combination");
      return;
    }
    const isQuantityValid = await triggerProductQuantityField("quantity");
    if (!isQuantityValid) {
      return;
    }
    const validatedQuantity = getProductQuantityFormValues("quantity");
    if (requireGroupCategory) {
      if (!String(formProduct.groupId || "").trim()) {
        toastError("Group is required");
        return;
      }
      if (!String(formProduct.categoryId || "").trim()) {
        toastError("Category is required");
        return;
      }
    }
    let uploadedDocs = [];
    if (productImageFiles.length > 0) {
      try {
        const res = await documentService.uploadImages(productImageFiles);
        const payload = res?.data || res;
        const docs = payload?.data?.documents || payload?.documents || [];
        uploadedDocs = docs.map((d) => ({
          _id: d._id || d.id,
          path: d.path || d.url || "",
        }));
      } catch (err) {
        toastError(err?.message || "Failed to upload images");
      }
    }

    const updatedProduct = {
      ...formProduct,
      quantity: validatedQuantity,
      images: (formProduct.images || [])
        .concat(uploadedDocs)
        .slice(0, MAX_PRODUCT_IMAGES),
    };

    setProducts((prev) => {
      const next = [...prev];
      next[editingProductIndex] = updatedProduct;
      return next;
    });
    clearProductForm();
    toastSuccess("Product updated");
  };

  const editProductFromTable = (index) => {
    const p = products[index];
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    setProductImagePreviews([]);
    setProductImageFiles([]);
    setFormProduct({
      productName: p.productName || "",
      quantity: p.quantity ?? 1,
      unit: p.unit || "",
      hsnNumber: p.hsnNumber || "",
      modelNumber: p.modelNumber || "",
      gstPercentage: p.gstPercentage ?? null,
      variants: (p.variants || []).map((v) => ({
        variantName: v.variantName || "",
      })),
      remark: p.remark || "",
      description: p.description || "",
      product_id: p.product_id || null,
      productCode: p.productCode || "",
      rawProductCode: p.rawProductCode || "",
      query_tracking_code: p.query_tracking_code || "",
      groupId: (p.groupId && (p.groupId._id || p.groupId)) || "",
      categoryId: (p.categoryId && (p.categoryId._id || p.categoryId)) || "",
      subcategoryId:
        (p.subcategoryId && (p.subcategoryId._id || p.subcategoryId)) || "",
      isNewProduct: p.isNewProduct ?? !p.productCode,
      images: p.images || [],
      sourceQueryNewProductId: p.sourceQueryNewProductId || null,
    });
    setEditingProductIndex(index);
    setProductFormVisible(true);
    resetCatalogVariantState();
    if (p.product_id) {
      productService
        .getById(p.product_id)
        .then((res) => {
          const detail = res?.data?.data ?? res?.data ?? res;
          setCatalogProductDetail(detail || null);
          const variantCode = String(p.rawProductCode || "").trim();
          const combo = (detail?.variantCombinations || []).find(
            (item) => String(item.variantCode || "").trim() === variantCode,
          );
          if (combo) {
            applyVariantCombinationToForm(combo);
          }
        })
        .catch(() => setCatalogProductDetail(null));
    }
    syncProductQuantityField(p.quantity ?? 1);
  };

  const deleteProductFromTable = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
    if (editingProductIndex === index) {
      clearProductForm();
    } else if (editingProductIndex != null && editingProductIndex > index) {
      setEditingProductIndex((prev) => prev - 1);
    }
    toastSuccess("Product removed from list");
  };

  const updateFormProduct = (field, value) => {
    setFormProduct((prev) => ({ ...prev, [field]: value }));
  };

  const addVariant = () => {
    setFormProduct((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), { ...INITIAL_VARIANT }],
    }));
  };

  const removeVariant = (variantIndex) => {
    setFormProduct((prev) => {
      const v = prev.variants || [];
      return { ...prev, variants: v.filter((_, i) => i !== variantIndex) };
    });
  };

  const updateVariant = (variantIndex, field, value) => {
    setFormProduct((prev) => {
      const variants = [...(prev.variants || [])];
      variants[variantIndex] = { ...variants[variantIndex], [field]: value };
      return { ...prev, variants };
    });
  };

  const removeSelectedUploadImage = (index) => {
    setProductImageFiles((prev) => prev.filter((_, i) => i !== index));
    setProductImagePreviews((prev) => {
      const urlToRemove = prev[index];
      if (urlToRemove) {
        try {
          URL.revokeObjectURL(urlToRemove);
        } catch {
          // ignore revoke errors
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingProductImage = (index) => {
    setFormProduct((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const getImageDisplayUrl = (img) => {
    if (!img) return "";
    if (typeof img === "string") {
      if (/^[a-fA-F0-9]{24}$/.test(img))
        return `${getAssetsBaseUrl()}${DOCUMENTS.SERVE(img)}`;
      return getAssetsUrl(img);
    }
    if (img.path || img.url) return getAssetsUrl(img.path || img.url);
    if (img._id && /^[a-fA-F0-9]{24}$/.test(String(img._id))) {
      return `${getAssetsBaseUrl()}${DOCUMENTS.SERVE(String(img._id))}`;
    }
    return "";
  };

  // Load for edit
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => queryService.getById(id));
        const data = res?.data || res;
        const q = data?.data ?? data;
        if (!q) throw new Error("Query not found");
        if (q.status === "closed") {
          toastError("This query is closed and cannot be edited");
          navigate(`/queries/${id}`);
          return;
        }
        if (!canEditQuery(user?.role, q.status, canUpdate("queries"))) {
          toastError(
            q.status === "drafted"
              ? "You do not have permission to edit this query"
              : "Only Head of Department can edit this query once it is no longer in draft status",
          );
          navigate(`/queries/${id}`);
          return;
        }

        const ci = q.companyInfo || {};
        let savedManagers = (ci.purchaseManagers || []).map(
          (purchaseManager) => ({
            name: purchaseManager?.name || "",
            phone: purchaseManager?.phone || "",
            email: purchaseManager?.email || "",
            department: purchaseManager?.department || "",
          }),
        );
        if (
          savedManagers.length === 0 &&
          (ci.purchase_manager_name || ci.purchase_manager_phone)
        ) {
          savedManagers = [
            {
              name: ci.purchase_manager_name || "",
              phone: ci.purchase_manager_phone || "",
              email: ci.email || "",
              department: "",
            },
          ];
        }
        const savedManagerKeys = new Set(
          savedManagers.map(getPurchaseManagerKey),
        );
        const queryIndustryId = q.industry_id?._id || q.industry_id || null;
        let purchaseManagers = mapPurchaseManagers(
          savedManagers,
          savedManagerKeys,
        );
        if (queryIndustryId) {
          try {
            const industryRes = await industryService.getById(queryIndustryId);
            const industryData = industryRes?.data || industryRes;
            purchaseManagers = mapPurchaseManagers(
              industryData?.purchaseManagers,
              savedManagerKeys,
            );
          } catch {
            purchaseManagers = mapPurchaseManagers(
              savedManagers,
              savedManagerKeys,
            );
          }
        }
        setCompanyInfo({
          name: ci.name || "",
          area: getAreaId(ci.area) || ci.area || "",
          subZoneId: (ci.subZoneId && String(ci.subZoneId).trim()) || "",
          location: ci.location || "",
          billingAddress: ci.billingAddress || ci.address || "",
          shippingAddress: ci.shippingAddress || ci.address || "",
          purchaseManagers,
        });
        setQueryReferenceBy(q.queryReferenceBy || "");
        setIndustryId(queryIndustryId);
        setIndustrySearch(q.industry_id?.name || ci.name || "");

        const prods = q.products?.length
          ? q.products.map((p) => ({
              productName: p.productName || "",
              quantity: p.quantity ?? 1,
              unit: p.unit || "",
              hsnNumber: p.hsnNumber || "",
              modelNumber: p.modelNumber || "",
              gstPercentage: p.gstPercentage ?? null,
              variants: (p.variants || []).map((v) => ({
                variantName: v.variantName || "",
              })),
              remark: p.remark || "",
              description: p.description || "",
              product_id: p.product_id?._id || p.product_id || null,
              productCode:
                (p.product_id &&
                  typeof p.product_id === "object" &&
                  p.product_id.productCode) ||
                p.productCode ||
                "",
              rawProductCode: p.rawProductCode || "",
              query_tracking_code: p.query_tracking_code || "",
              groupId: (p.groupId && (p.groupId._id || p.groupId)) || "",
              categoryId:
                (p.categoryId && (p.categoryId._id || p.categoryId)) || "",
              subcategoryId:
                (p.subcategoryId && (p.subcategoryId._id || p.subcategoryId)) ||
                "",
              isNewProduct: p.isNewProduct ?? !p.productCode,
              images: Array.isArray(p.images) ? p.images : [],
              sourceQueryNewProductId: p.sourceQueryNewProductId || null,
              quotation_status: p.quotation_status || "pending",
              sub_status: p.sub_status || "draft",
            }))
          : [];
        setProducts(prods);
      } catch (err) {
        toastError(err?.message || "Failed to load query");
        setError(err?.message || "Failed to load query");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, navigate]);

  const getCreatedBy = () => {
    try {
      const stored = localStorage.getItem("migticrm_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?._id || parsed?.id;
      }
    } catch {}
    return user?._id || user?.id;
  };

  const handleNextFromCompany = () => {
    if (!companyInfo?.name?.trim()) {
      toastError("Company / Client name is required");
      return;
    }
    if ((companyInfo.name || "").length > 100) {
      toastError("Company name must be at most 100 characters");
      return;
    }
    const managers = getSelectedPurchaseManagersForApi(
      companyInfo?.purchaseManagers,
    );
    if (managers.length === 0) {
      toastError("Select at least one purchase manager");
      return;
    }
    for (const purchaseManager of managers) {
      if ((purchaseManager?.name || "").length > 100) {
        toastError("Purchase manager name must be at most 100 characters");
        return;
      }
      const phoneNumber = (purchaseManager?.phone || "").trim();
      if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
        toastError(
          `Purchase manager "${purchaseManager?.name || "Unknown"}" phone must be exactly 10 digits`,
        );
        return;
      }
    }
    if ((companyInfo.billingAddress || "").length > 500) {
      toastError("Billing address must be at most 500 characters");
      return;
    }
    if ((companyInfo.shippingAddress || "").length > 500) {
      toastError("Shipping address must be at most 500 characters");
      return;
    }
    goToStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextFromProducts = () => {
    const validProducts = products.filter((p) => (p.productName || "").trim());
    if (validProducts.length === 0) {
      toastError(
        "Add at least one product using the form above, then use Add to query.",
      );
      return;
    }
    goToStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openImagesModal = (product) => {
    const urls = (product?.images || [])
      .map((img) => (typeof img === "string" ? img : img?.path || ""))
      .filter(Boolean);
    if (!urls.length) return;
    setImagesModal({ visible: true, images: urls });
  };

  const renderProductImagesCell = (p) => {
    const imgs = Array.isArray(p?.images) ? p.images : [];
    if (imgs.length === 0) return "–";
    const displayUrl = (img) =>
      getAssetsUrl(typeof img === "string" ? img : img?.path || "");
    return (
      <div
        role="button"
        tabIndex={0}
        className="inline-flex flex-wrap items-center gap-1"
        style={{ cursor: "pointer", maxWidth: 140 }}
        onClick={() => openImagesModal(p)}
        onKeyDown={(e) => e.key === "Enter" && openImagesModal(p)}
        aria-label={`View ${imgs.length} image(s)`}
      >
        {imgs.slice(0, 2).map((img, idx) => (
          <div
            key={idx}
            className="shrink-0 overflow-hidden rounded border border-border"
            style={{ width: 36, height: 36 }}
          >
            <img
              src={displayUrl(img)}
              alt=""
              className="h-full w-full"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
        {imgs.length > 2 && (
          <div
            className="flex shrink-0 items-center justify-center rounded border border-border bg-muted text-xs font-bold text-primary!"
            style={{ width: 36, height: 36 }}
          >
            +{imgs.length - 2}
          </div>
        )}
      </div>
    );
  };

  const areaNameLookup = buildAreaNameLookup(areas);

  const getAreaLabel = () => {
    const areaName = formatAreaDisplay(companyInfo.area, areaNameLookup);
    if (!areaName) return "";
    const match = areas.find(
      (area) =>
        getAreaId(area) === getAreaId(companyInfo.area) ||
        area.name === areaName,
    );
    return match?.city ? `${areaName} - ${match.city}` : areaName;
  };

  const getSubZoneLabel = () => {
    const sid = companyInfo.subZoneId;
    if (!sid) return "";
    const match =
      querySubZones.find((s) => String(s._id || s.id) === String(sid)) ||
      allSubZones.find((s) => String(s._id || s.id) === String(sid));
    if (!match) return sid;
    return `${match.subZoneCode ? `${match.subZoneCode} — ` : ""}${match.name || ""}`;
  };

  const resolveGroupName = (id) => {
    if (id != null && typeof id === "object" && id?.name) return id.name;
    if (id == null || id === "") return "–";
    const sid = String(typeof id === "object" && id?._id ? id._id : id);
    const g = productGroups.find((x) => String(x._id || x.id) === sid);
    return g?.name || "–";
  };
  const resolveCategoryName = (id) => {
    if (id != null && typeof id === "object" && id?.name) return id.name;
    if (id == null || id === "") return "–";
    const sid = String(typeof id === "object" && id?._id ? id._id : id);
    if (!sid) return "–";
    const c =
      allTableCategories.find((x) => String(x._id || x.id) === sid) ||
      productCategories.find((x) => String(x._id || x.id) === sid);
    if (c?.name) return c.name;
    if (categoryNameById[sid]) return categoryNameById[sid];
    return "–";
  };
  const resolveSubcategoryName = (id) => {
    if (id != null && typeof id === "object" && id?.name) return id.name;
    if (id == null || id === "") return "–";
    const sid = String(typeof id === "object" && id?._id ? id._id : id);
    if (!sid) return "–";
    const s = productSubcategories.find((x) => String(x._id || x.id) === sid);
    if (s?.name) return s.name;
    if (categoryNameById[sid]) return categoryNameById[sid];
    return "–";
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "active";
    return "upcoming";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyInfo?.name?.trim()) {
      toastError("Company / Client name is required");
      return;
    }
    if ((companyInfo.name || "").length > 100) {
      toastError("Company name must be at most 100 characters");
      return;
    }
    const managers = getSelectedPurchaseManagersForApi(
      companyInfo?.purchaseManagers,
    );
    if (managers.length === 0) {
      toastError("Select at least one purchase manager");
      return;
    }
    for (const purchaseManager of managers) {
      if ((purchaseManager?.name || "").length > 100) {
        toastError("Purchase manager name must be at most 100 characters");
        return;
      }
      const phoneNumber = (purchaseManager?.phone || "").trim();
      if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
        toastError(
          `Purchase manager "${purchaseManager?.name || "Unknown"}" phone must be exactly 10 digits`,
        );
        return;
      }
    }
    if ((companyInfo.billingAddress || "").length > 500) {
      toastError("Billing address must be at most 500 characters");
      return;
    }
    if ((companyInfo.shippingAddress || "").length > 500) {
      toastError("Shipping address must be at most 500 characters");
      return;
    }
    const validProducts = products.filter((p) => (p.productName || "").trim());
    if (validProducts.length === 0) {
      toastError(
        "Add at least one product using the form above, then use Add to query.",
      );
      return;
    }
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const gst = p.gstPercentage;
      if (gst != null && (typeof gst !== "number" || gst < 0 || gst > 100)) {
        toastError(
          `Product "${(p.productName || "").trim() || i + 1}": GST % must be between 0 and 100`,
        );
        return;
      }
      if (requireGroupCategory) {
        const gid = p.groupId
          ? String(
              typeof p.groupId === "object"
                ? p.groupId._id || p.groupId
                : p.groupId,
            ).trim()
          : "";
        const cid = p.categoryId
          ? String(
              typeof p.categoryId === "object"
                ? p.categoryId._id || p.categoryId
                : p.categoryId,
            ).trim()
          : "";
        if (!gid) {
          toastError(
            `Product "${(p.productName || "").trim() || i + 1}": group is required`,
          );
          return;
        }
        if (!cid) {
          toastError(
            `Product "${(p.productName || "").trim() || i + 1}": category is required`,
          );
          return;
        }
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        companyInfo: {
          ...companyInfo,
          area: companyInfo.area || "",
          subZoneId: companyInfo.subZoneId || "",
          purchaseManagers: getSelectedPurchaseManagersForApi(
            companyInfo.purchaseManagers,
          ),
        },
        industry_id: industryId || null,
        queryReferenceBy: String(queryReferenceBy || "")
          .trim()
          .toLowerCase(),
        products: products
          .map((p) => ({
            productName: p.productName?.trim() || "",
            quantity: Number(p.quantity) ?? 1,
            unit: (p.unit && String(p.unit).trim()) || "",
            hsnNumber: (p.hsnNumber && String(p.hsnNumber).trim()) || "",
            modelNumber: (p.modelNumber && String(p.modelNumber).trim()) || "",
            gstPercentage:
              typeof p.gstPercentage === "number" ? p.gstPercentage : null,
            variants: (p.variants || [])
              .map((v) => ({
                variantName:
                  (v.variantName && String(v.variantName).trim()) || "",
              }))
              .filter((v) => v.variantName),
            remark: p.remark?.trim() || "",
            description: p.description?.trim() || "",
            product_id: p.product_id || null,
            groupId: p.groupId || null,
            categoryId: p.categoryId || null,
            subcategoryId: p.subcategoryId || null,
            rawProductCode:
              (p.rawProductCode && String(p.rawProductCode).trim()) || "",
            query_tracking_code:
              (p.query_tracking_code && String(p.query_tracking_code).trim()) ||
              "",
            images: (p.images || [])
              .map((img) => {
                if (typeof img === "object" && img?._id) return img._id;
                if (typeof img === "string" && /^[a-fA-F0-9]{24}$/.test(img))
                  return img;
                return null;
              })
              .filter(Boolean),
            quotation_status: p.quotation_status || "pending",
            sub_status: p.sub_status || "draft",
          }))
          .filter((p) => p.productName),
        created_by: isEdit ? undefined : getCreatedBy(),
      };
      if (isEdit) {
        await queryService.update(id, payload);
        toastSuccess("Query updated successfully");
      } else {
        await queryService.create(payload);
        toastSuccess("Query created successfully");
      }
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      navigate("/queries");
    } catch (err) {
      toastError(err?.message || "Failed to save query");
      setError(err?.message || "Failed to save query");
    } finally {
      setSubmitting(false);
    }
  };

  const { ref: productQuantityInputRef, ...productQuantityInputProps } =
    registerProductQuantityField("quantity");

  const showProductForm = productFormVisible || editingProductIndex != null;

  const isCatalogProductForm = !formProduct.isNewProduct;

  const catalogProductAttributes =
    getCatalogProductAttributes(catalogProductDetail);
  const activeCatalogCombinations = (
    catalogProductDetail?.variantCombinations || []
  ).filter((combo) => combo?.isActive !== false);
  const filteredCatalogCombinations = activeCatalogCombinations.filter(
    (combo) => combinationMatchesSelections(combo, catalogVariantSelections),
  );
  const variantCombinationSearchResults = getTopVariantCombinationMatches(
    filteredCatalogCombinations,
    variantCombinationSearch,
    3,
  );
  const catalogHasVariantCombinations =
    isCatalogProductForm &&
    catalogProductAttributes.length > 0 &&
    activeCatalogCombinations.length > 0;

  useEffect(() => {
    if (!catalogHasVariantCombinations || !catalogProductDetail) return;
    const allAttributesSelected = catalogProductAttributes.every((attribute) =>
      String(catalogVariantSelections[attribute.name] || "").trim(),
    );
    if (!allAttributesSelected || selectedVariantCombinationId) return;
    const matches = activeCatalogCombinations.filter((combo) =>
      combinationMatchesSelections(combo, catalogVariantSelections),
    );
    if (matches.length === 1) {
      applyVariantCombinationToForm(matches[0]);
    }
  }, [
    activeCatalogCombinations,
    applyVariantCombinationToForm,
    catalogHasVariantCombinations,
    catalogProductAttributes,
    catalogProductDetail,
    catalogVariantSelections,
    selectedVariantCombinationId,
  ]);

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading query..." />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/queries")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Queries
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-current opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="sticky top-0 mb-4" style={{ zIndex: 1040 }}>
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              {STEPS.map((step) => {
                const status = getStepStatus(step.id);
                const isCompleted = status === "completed";
                const isActive = status === "active";
                const isProductsStep = step.id === 2;
                return (
                  <div key={step.id} className="flex-1 text-center">
                    <div
                      className={`inline-flex items-center justify-center rounded-full border ${
                        isCompleted
                          ? "border-success! bg-success! text-success-foreground"
                          : isActive
                            ? "border-primary! bg-primary! text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground"
                      }`}
                      style={{ width: 36, height: 36 }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold">
                      <span>{step.label}</span>
                      {isProductsStep && (
                        <Badge className="ml-1">{products.length}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Progress
              value={((currentStep - 1) / (STEPS.length - 1 || 1)) * 100}
            />
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <>
            {/* 1. Company Information */}
            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>1. Company Information</CardTitle>
                  {industryId && clientCode && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `/#/industries/${industryId}`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      title="Open client details"
                    >
                      <Hash className="h-4 w-4" />
                      {clientCode}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => navigate("/industries/new")}
                  >
                    Create client
                  </Button>
                  {!isEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => {
                        try {
                          localStorage.removeItem(DRAFT_STORAGE_KEY);
                        } catch {
                          // ignore
                        }
                        setCompanyInfo({ ...INITIAL_COMPANY });
                        setQueryReferenceBy("");
                        setIndustryId(null);
                        setIndustrySearch("");
                        setContactPersons([]);
                        setClientCode("");
                        setClientOverlay(null);
                        setClientRealFields({ gstNumber: "", category: "" });
                        setProducts([]);
                        setCurrentStep(1);
                        toastSuccess("Saved query form data cleared");
                      }}
                    >
                      Clear saved data
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="mb-3">
                  <div className="relative" ref={companyDropdownRef}>
                    <Label className="mb-1.5 block">
                      Client / Company name
                    </Label>
                    <Input
                      type="text"
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      onFocus={() => setIndustryDropdownOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setIndustryDropdownOpen(false), 200)
                      }
                      placeholder="Type to see best 5 matches..."
                      autoComplete="off"
                    />
                    {industryId && (
                      <div className="mt-2">
                        <Button
                          variant="link"
                          size="sm"
                          type="button"
                          className="h-auto p-0"
                          onClick={handleClearIndustry}
                        >
                          Clear selection
                        </Button>
                      </div>
                    )}
                    {industryDropdownOpen && (
                      <div
                        className="absolute mt-1 w-full rounded-md border border-border bg-background shadow-md"
                        style={{
                          zIndex: 10,
                          maxHeight: 280,
                          overflowY: "auto",
                        }}
                      >
                        <div className="divide-y divide-border">
                          {industrySearchLoading && (
                            <div className="px-4 py-3 text-sm text-muted-foreground">
                              Searching...
                            </div>
                          )}
                          {!industrySearchLoading &&
                            industrySearchResults.length === 0 &&
                            industrySearch.trim() && (
                              <div className="px-4 py-3 text-sm text-muted-foreground">
                                No matches. Enter details manually below.
                              </div>
                            )}
                          {!industrySearchLoading &&
                            industrySearchResults.map((ind) => (
                              <button
                                key={ind._id || ind.id}
                                type="button"
                                className="block w-full px-4 py-3 text-left hover:bg-muted"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectIndustry(ind);
                                }}
                              >
                                <div className="font-semibold">{ind.name}</div>
                                {ind.location && (
                                  <div className="text-sm text-muted-foreground">
                                    {ind.location}
                                  </div>
                                )}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {industryId && (
                  <>
                    <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary!" />
                        <span className="text-sm font-semibold">
                          Client Details
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <FileBadge className="h-3.5 w-3.5" />
                            GST Number
                          </div>
                          <div className="mt-0.5 text-sm font-medium">
                            {clientRealFields.gstNumber ||
                              CLIENT_DUMMY_FALLBACK.gstNumber}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            Address
                          </div>
                          <div className="mt-0.5 text-sm font-medium">
                            {clientOverlayOr(
                              clientOverlay,
                              "registeredAddress",
                            )}
                            , {clientOverlayOr(clientOverlay, "city")},{" "}
                            {clientOverlayOr(clientOverlay, "state")},{" "}
                            {clientOverlayOr(clientOverlay, "country")} -{" "}
                            {clientOverlayOr(clientOverlay, "pincode")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Zone</Label>
                        <Input
                          value={formatAreaDisplay(
                            companyInfo.area,
                            areaNameLookup,
                          )}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Sub-zone</Label>
                        <Input
                          value={getSubZoneLabel()}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Location Link</Label>
                        <Input
                          value={companyInfo.location}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label className="mb-2 block">Purchase managers</Label>
                      {(companyInfo.purchaseManagers || []).length > 0 ? (
                        <div className="rounded-lg border border-border p-3">
                          {(companyInfo.purchaseManagers || []).map(
                            (purchaseManager, managerIndex) => (
                              <React.Fragment
                                key={
                                  getPurchaseManagerKey(purchaseManager) ||
                                  managerIndex
                                }
                              >
                                <div className="mb-2 grid grid-cols-1 items-center gap-4 md:grid-cols-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`query-purchase-manager-${managerIndex}`}
                                        className="shrink-0"
                                        checked={isPurchaseManagerSelected(
                                          purchaseManager,
                                        )}
                                        onCheckedChange={(checked) =>
                                          setCompanyInfo(
                                            (currentCompanyInfo) => {
                                              const nextPurchaseManagers = [
                                                ...(currentCompanyInfo.purchaseManagers ||
                                                  []),
                                              ];
                                              nextPurchaseManagers[
                                                managerIndex
                                              ] = {
                                                ...nextPurchaseManagers[
                                                  managerIndex
                                                ],
                                                selected: checked === true,
                                              };
                                              return {
                                                ...currentCompanyInfo,
                                                purchaseManagers:
                                                  nextPurchaseManagers,
                                              };
                                            },
                                          )
                                        }
                                        aria-label={`Include purchase manager ${purchaseManager.name || managerIndex + 1}`}
                                      />
                                      <Input
                                        value={purchaseManager.name || ""}
                                        readOnly
                                        className="grow bg-muted"
                                        placeholder="Name"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <Input
                                      value={purchaseManager.department || ""}
                                      readOnly
                                      className="bg-muted"
                                      placeholder="Department"
                                    />
                                  </div>
                                  <div>
                                    <Input
                                      value={purchaseManager.phone || ""}
                                      readOnly
                                      className="bg-muted"
                                      placeholder="Phone"
                                    />
                                  </div>
                                </div>
                                <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                                  <div>
                                    <Input
                                      type="email"
                                      value={purchaseManager.email || ""}
                                      readOnly
                                      className="bg-muted"
                                      placeholder="Email"
                                    />
                                  </div>
                                </div>
                              </React.Fragment>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="mb-0 text-sm text-muted-foreground">
                          No purchase managers found for this client.
                        </p>
                      )}
                    </div>

                    <div className="mb-3">
                      <Label className="mb-2 block">
                        Contact persons{" "}
                        <span className="font-normal text-muted-foreground">
                          ({contactPersons.length} linked)
                        </span>
                      </Label>
                      {contactPersons.length > 0 ? (
                        <div className="divide-y divide-border rounded-lg border border-border">
                          {contactPersons.map((cp) => (
                            <label
                              key={cp.id}
                              htmlFor={`query-contact-person-${cp.id}`}
                              className="flex cursor-pointer items-start gap-3 p-3"
                            >
                              <Checkbox
                                id={`query-contact-person-${cp.id}`}
                                className="mt-0.5 shrink-0"
                                checked={cp.selected !== false}
                                onCheckedChange={(checked) =>
                                  toggleContactPersonSelected(cp.id, checked)
                                }
                                aria-label={`Include contact person ${cp.firstName} ${cp.lastName}`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">
                                    {`${cp.firstName || ""} ${cp.lastName || ""}`.trim() ||
                                      "Unnamed contact"}
                                  </span>
                                  {cp.isPrimary && (
                                    <Badge variant="info">Primary</Badge>
                                  )}
                                  {cp.designation && (
                                    <span className="text-sm text-muted-foreground">
                                      {cp.designation}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 text-sm text-muted-foreground">
                                  {[cp.email, cp.mobileNumber]
                                    .filter(Boolean)
                                    .join(" • ") || "No contact details"}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="mb-0 text-sm text-muted-foreground">
                          No contact persons linked to this client.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Billing address (max 500 characters)</Label>
                        <Textarea
                          rows={2}
                          value={companyInfo.billingAddress}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Shipping address (max 500 characters)</Label>
                        <Textarea
                          rows={2}
                          value={companyInfo.shippingAddress}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <div className="mb-4 flex justify-end">
              <Button type="button" onClick={handleNextFromCompany}>
                Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            {/* 2. Products – add/edit form + table */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>2. Products</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <Card className="relative mb-4 border-primary/25">
                  {addingProductToQuery && (
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/75"
                      style={{ zIndex: 10 }}
                      aria-hidden="true"
                    />
                  )}
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-border bg-muted px-4 py-2">
                    <strong className="mr-2">
                      {editingProductIndex != null
                        ? "Edit product"
                        : "Add products"}
                    </strong>
                    <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                      {!showProductForm ? (
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          className="shrink-0"
                          onClick={handleStartCreateProduct}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Create new product
                        </Button>
                      ) : editingProductIndex == null ? (
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={handleBackToProductSearch}
                        >
                          Back to search
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {!showProductForm ? (
                      <div className="relative" ref={catalogProductDropdownRef}>
                        <Label className="mb-1.5 block">Search products</Label>
                        <Input
                          type="text"
                          value={catalogProductSearch}
                          onChange={(e) =>
                            setCatalogProductSearch(e.target.value)
                          }
                          onFocus={() => setCatalogProductDropdownOpen(true)}
                          onBlur={() =>
                            setTimeout(
                              () => setCatalogProductDropdownOpen(false),
                              200,
                            )
                          }
                          placeholder="Type to search products..."
                          autoComplete="off"
                        />
                        {catalogProductDropdownOpen && (
                          <div
                            className="absolute mt-1 w-full rounded-md border border-border bg-background shadow-md"
                            style={{
                              zIndex: 10,
                              maxHeight: 320,
                              overflowY: "auto",
                            }}
                          >
                            <div className="divide-y divide-border">
                              {catalogProductSearchLoading && (
                                <div className="px-4 py-3 text-sm text-muted-foreground">
                                  Searching...
                                </div>
                              )}
                              {!catalogProductSearchLoading &&
                                catalogProductSearchResults.length === 0 &&
                                catalogProductSearch.trim() && (
                                  <div className="px-4 py-3 text-sm text-muted-foreground">
                                    No products found.
                                  </div>
                                )}
                              {!catalogProductSearchLoading &&
                                catalogProductSearchResults.map((product) => (
                                  <button
                                    key={product._id || product.uniqueId}
                                    type="button"
                                    className="block w-full px-4 py-3 text-left hover:bg-muted"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelectCatalogProduct(product);
                                    }}
                                  >
                                    <div className="font-semibold">
                                      {product.name || "—"}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {[
                                        product.productCode
                                          ? `Code: ${product.productCode}`
                                          : "",
                                        product.hsnNumber
                                          ? `HSN: ${product.hsnNumber}`
                                          : "",
                                        product.salesUnit || product.unit
                                          ? `Sales unit: ${product.salesUnit || product.unit}`
                                          : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label className="font-semibold">
                              Product name{" "}
                              <span
                                className="text-destructive"
                                aria-hidden="true"
                              >
                                *
                              </span>
                            </Label>
                            {isCatalogProductForm ? (
                              <Input
                                value={formProduct.productName}
                                readOnly
                                className="bg-muted"
                              />
                            ) : (
                              <Input
                                value={formProduct.productName}
                                onChange={(e) =>
                                  updateFormProduct(
                                    "productName",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Copper wire 2.5 sq mm"
                                autoComplete="off"
                              />
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label>
                              Group
                              {requireGroupCategory ? (
                                <span className="text-destructive"> *</span>
                              ) : null}
                            </Label>
                            {isCatalogProductForm ? (
                              <Input
                                value={resolveGroupName(formProduct.groupId)}
                                readOnly
                                className="bg-muted"
                              />
                            ) : (
                              <Select
                                value={formProduct.groupId || ""}
                                onChange={(e) =>
                                  setFormProduct((prev) => ({
                                    ...prev,
                                    groupId: e.target.value,
                                    categoryId: "",
                                    subcategoryId: "",
                                  }))
                                }
                                aria-label="Group"
                                aria-required={requireGroupCategory}
                              >
                                <option value="">
                                  {requireGroupCategory
                                    ? "Choose group…"
                                    : "Select group"}
                                </option>
                                {productGroups.map((g) => (
                                  <option key={g._id} value={g._id}>
                                    {g.name}
                                  </option>
                                ))}
                              </Select>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label>
                              Category
                              {requireGroupCategory ? (
                                <span className="text-destructive"> *</span>
                              ) : null}
                            </Label>
                            {isCatalogProductForm ? (
                              <Input
                                value={resolveCategoryName(
                                  formProduct.categoryId,
                                )}
                                readOnly
                                className="bg-muted"
                              />
                            ) : (
                              <Select
                                value={formProduct.categoryId || ""}
                                onChange={(e) =>
                                  setFormProduct((prev) => ({
                                    ...prev,
                                    categoryId: e.target.value,
                                    subcategoryId: "",
                                  }))
                                }
                                aria-label="Category"
                                aria-required={requireGroupCategory}
                                disabled={
                                  requireGroupCategory && !formProduct.groupId
                                }
                              >
                                <option value="">
                                  {requireGroupCategory && !formProduct.groupId
                                    ? "Pick a group first"
                                    : requireGroupCategory
                                      ? "Choose category…"
                                      : "Select category"}
                                </option>
                                {productCategories.map((c) => (
                                  <option key={c._id} value={c._id}>
                                    {c.name}
                                  </option>
                                ))}
                              </Select>
                            )}
                          </div>
                        </div>

                        <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label>Subcategory</Label>
                            {isCatalogProductForm ? (
                              <Input
                                value={resolveSubcategoryName(
                                  formProduct.subcategoryId,
                                )}
                                readOnly
                                className="bg-muted"
                              />
                            ) : (
                              <Select
                                value={formProduct.subcategoryId || ""}
                                onChange={(e) =>
                                  updateFormProduct(
                                    "subcategoryId",
                                    e.target.value,
                                  )
                                }
                                aria-label="Subcategory"
                                disabled={!formProduct.categoryId}
                              >
                                <option value="">
                                  {!formProduct.categoryId
                                    ? "Pick a category first"
                                    : productSubcategories.length === 0
                                      ? "No subcategories"
                                      : "Select subcategory"}
                                </option>
                                {productSubcategories.map((s) => (
                                  <option key={s._id} value={s._id}>
                                    {s.name}
                                  </option>
                                ))}
                              </Select>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label>Sales unit</Label>
                            {isCatalogProductForm ? (
                              <Input
                                value={formProduct.unit || ""}
                                readOnly
                                className="bg-muted"
                              />
                            ) : (
                              <ProductUnitSelect
                                value={formProduct.unit || ""}
                                onChange={(e) =>
                                  updateFormProduct("unit", e.target.value)
                                }
                              />
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label>
                              Qty{" "}
                              <span
                                className="text-destructive"
                                aria-hidden="true"
                              >
                                *
                              </span>
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={MAX_PRODUCT_QUANTITY}
                              step={1}
                              inputMode="numeric"
                              placeholder="0"
                              aria-invalid={
                                !!productQuantityFormErrors.quantity
                              }
                              {...productQuantityInputProps}
                              ref={(element) => {
                                productQuantityInputRef(element);
                                quantityInputRef.current = element;
                              }}
                            />
                            {productQuantityFormErrors.quantity && (
                              <p className="text-sm text-destructive">
                                {productQuantityFormErrors.quantity.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {isCatalogProductForm ? (
                          <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label>Product code (catalog)</Label>
                              <Input
                                value={formProduct.productCode || ""}
                                readOnly
                                className="bg-muted"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>SN code</Label>
                              <Input
                                value={formProduct.hsnNumber || ""}
                                readOnly
                                className="bg-muted"
                              />
                            </div>
                            {formProduct.query_tracking_code ? (
                              <div className="space-y-1.5">
                                <Label>Query tracking code</Label>
                                <Input
                                  value={formProduct.query_tracking_code}
                                  readOnly
                                  className="bg-muted"
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : formProduct.productCode ||
                          formProduct.hsnNumber ||
                          formProduct.query_tracking_code ? (
                          <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                            {formProduct.productCode ? (
                              <div className="space-y-1.5">
                                <Label>Product code (catalog)</Label>
                                <Input
                                  value={formProduct.productCode}
                                  disabled
                                  readOnly
                                  className="bg-muted"
                                />
                              </div>
                            ) : null}
                            {formProduct.hsnNumber ? (
                              <div className="space-y-1.5">
                                <Label>SN code</Label>
                                <Input
                                  value={formProduct.hsnNumber}
                                  onChange={(e) =>
                                    updateFormProduct(
                                      "hsnNumber",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            ) : null}
                            {formProduct.query_tracking_code ? (
                              <div className="space-y-1.5">
                                <Label>Query tracking code</Label>
                                <Input
                                  value={formProduct.query_tracking_code}
                                  disabled
                                  readOnly
                                  className="bg-muted"
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {isCatalogProductForm ? (
                          <div className="mb-3">
                            <div className="space-y-1.5">
                              <Label>Description</Label>
                              <Textarea
                                value={formProduct.description || ""}
                                readOnly
                                className="bg-muted"
                                rows={2}
                              />
                            </div>
                          </div>
                        ) : null}

                        {catalogHasVariantCombinations ? (
                          <div className="mb-3">
                            <h6 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
                              Select variant combination
                            </h6>
                            <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                              {catalogProductAttributes.map((attribute) => (
                                <div
                                  className="space-y-1.5"
                                  key={attribute.name}
                                >
                                  <Label>{attribute.name}</Label>
                                  <Select
                                    value={
                                      catalogVariantSelections[
                                        attribute.name
                                      ] || ""
                                    }
                                    onChange={(event) =>
                                      handleCatalogVariantAttributeChange(
                                        attribute.name,
                                        event.target.value,
                                      )
                                    }
                                  >
                                    <option value="">
                                      Select {attribute.name}
                                    </option>
                                    {(attribute.options || []).map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              <div className="relative space-y-1.5">
                                <Label>Variant combination</Label>
                                <Input
                                  type="text"
                                  value={variantCombinationSearch}
                                  onChange={(event) => {
                                    setVariantCombinationSearch(
                                      event.target.value,
                                    );
                                    setVariantCombinationDropdownOpen(true);
                                    setSelectedVariantCombinationId("");
                                    setFormProduct((prev) => ({
                                      ...prev,
                                      variants: [],
                                      rawProductCode:
                                        prev.productCode || prev.rawProductCode,
                                    }));
                                  }}
                                  onFocus={() =>
                                    setVariantCombinationDropdownOpen(true)
                                  }
                                  onBlur={() =>
                                    setTimeout(
                                      () =>
                                        setVariantCombinationDropdownOpen(
                                          false,
                                        ),
                                      200,
                                    )
                                  }
                                  placeholder="Search variant combination..."
                                  autoComplete="off"
                                />
                                {variantCombinationDropdownOpen &&
                                  variantCombinationSearch.trim() && (
                                    <div
                                      className="absolute mt-1 w-full rounded-md border border-border bg-background shadow-md"
                                      style={{
                                        zIndex: 10,
                                        maxHeight: 220,
                                        overflowY: "auto",
                                      }}
                                    >
                                      <div className="divide-y divide-border">
                                        {variantCombinationSearchResults.length ===
                                        0 ? (
                                          <div className="px-4 py-3 text-sm text-muted-foreground">
                                            No matching combinations.
                                          </div>
                                        ) : (
                                          variantCombinationSearchResults.map(
                                            (combo) => (
                                              <button
                                                key={combo._id}
                                                type="button"
                                                className="block w-full px-4 py-3 text-left hover:bg-muted"
                                                onMouseDown={(event) => {
                                                  event.preventDefault();
                                                  handleSelectVariantCombination(
                                                    combo._id,
                                                  );
                                                }}
                                              >
                                                <div className="font-semibold">
                                                  {getVariantComboDisplay(
                                                    combo,
                                                  ) || "—"}
                                                </div>
                                                {combo.variantCode ? (
                                                  <div className="text-sm text-muted-foreground">
                                                    {combo.variantCode}
                                                  </div>
                                                ) : null}
                                              </button>
                                            ),
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="mb-3 rounded-lg border border-border bg-muted/50 p-3 md:p-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {!isCatalogProductForm ? (
                              <div className="space-y-1.5">
                                <Label>HSN</Label>
                                <Input
                                  value={formProduct.hsnNumber || ""}
                                  onChange={(e) =>
                                    updateFormProduct(
                                      "hsnNumber",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="HSN code"
                                />
                              </div>
                            ) : null}
                            <div className="space-y-1.5">
                              <Label>Model number</Label>
                              <Input
                                value={formProduct.modelNumber || ""}
                                onChange={(e) =>
                                  updateFormProduct(
                                    "modelNumber",
                                    e.target.value,
                                  )
                                }
                                placeholder="Model / SKU"
                                readOnly={isCatalogProductForm}
                                className={
                                  isCatalogProductForm ? "bg-muted" : ""
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>GST %</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                value={
                                  formProduct.gstPercentage == null
                                    ? ""
                                    : formProduct.gstPercentage
                                }
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "") {
                                    updateFormProduct("gstPercentage", null);
                                    return;
                                  }
                                  const n = Number(raw);
                                  updateFormProduct(
                                    "gstPercentage",
                                    Number.isFinite(n) ? n : null,
                                  );
                                }}
                                placeholder="e.g. 18"
                                readOnly={isCatalogProductForm}
                                className={
                                  isCatalogProductForm ? "bg-muted" : ""
                                }
                              />
                            </div>
                          </div>

                          {!isCatalogProductForm ? (
                            <div className="mb-3 mt-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <Label className="mb-0">Variants</Label>
                                <Button
                                  size="sm"
                                  type="button"
                                  onClick={addVariant}
                                >
                                  <Plus className="mr-1 h-4 w-4" />
                                  Add variant
                                </Button>
                              </div>
                              {(formProduct.variants || []).length > 0
                                ? (formProduct.variants || []).map(
                                    (v, vIdx) => (
                                      <div
                                        key={vIdx}
                                        className="mb-2 flex items-end gap-2"
                                      >
                                        <div className="grow">
                                          <Input
                                            value={v.variantName || ""}
                                            onChange={(e) =>
                                              updateVariant(
                                                vIdx,
                                                "variantName",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="Variant name"
                                          />
                                        </div>
                                        <div className="shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => removeVariant(vIdx)}
                                            title="Remove variant"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ),
                                  )
                                : null}
                            </div>
                          ) : null}

                          {!isCatalogProductForm ? (
                            <div className="mb-3 space-y-1.5">
                              <Label>Description</Label>
                              <Textarea
                                rows={2}
                                value={formProduct.description}
                                onChange={(e) =>
                                  updateFormProduct(
                                    "description",
                                    e.target.value,
                                  )
                                }
                                placeholder="Specs, brand, or catalog text"
                              />
                            </div>
                          ) : null}
                          <div className="mb-3 space-y-1.5">
                            <Label>Remark</Label>
                            <Textarea
                              rows={2}
                              value={formProduct.remark}
                              onChange={(e) =>
                                updateFormProduct("remark", e.target.value)
                              }
                              placeholder="Internal note for this query"
                            />
                          </div>
                          <div className="mb-0 space-y-1.5">
                            <Label>Images</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (!files.length) return;
                                const existingCount = Array.isArray(
                                  formProduct.images,
                                )
                                  ? formProduct.images.length
                                  : 0;
                                const remainingSlots =
                                  MAX_PRODUCT_IMAGES -
                                  existingCount -
                                  productImageFiles.length;

                                if (remainingSlots <= 0) {
                                  toastError(
                                    `Only ${MAX_PRODUCT_IMAGES} images allowed per product`,
                                  );
                                  e.target.value = "";
                                  return;
                                }

                                const acceptedFiles = files.slice(
                                  0,
                                  remainingSlots,
                                );
                                if (acceptedFiles.length < files.length) {
                                  toastError(
                                    `Only ${MAX_PRODUCT_IMAGES} images allowed. Extra images were ignored.`,
                                  );
                                }

                                setProductImageFiles((prev) => [
                                  ...prev,
                                  ...acceptedFiles,
                                ]);
                                const previews = acceptedFiles.map((file) =>
                                  URL.createObjectURL(file),
                                );
                                setProductImagePreviews((prev) => [
                                  ...prev,
                                  ...previews,
                                ]);
                                e.target.value = "";
                              }}
                            />
                            {Array.isArray(formProduct.images) &&
                              formProduct.images.length > 0 && (
                                <div className="mt-2">
                                  <div className="mb-1 text-sm text-muted-foreground">
                                    Existing images
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {formProduct.images.map((img, idx) => {
                                      const imageUrl = getImageDisplayUrl(img);
                                      if (!imageUrl) return null;
                                      return (
                                        <div
                                          key={`existing-${idx}`}
                                          className="relative overflow-hidden rounded border border-border"
                                          style={{ width: 64, height: 64 }}
                                        >
                                          <img
                                            src={imageUrl}
                                            alt={`Existing ${idx + 1}`}
                                            width={64}
                                            height={64}
                                            className="h-full w-full"
                                            style={{ objectFit: "cover" }}
                                          />
                                          <button
                                            type="button"
                                            className="absolute flex items-center justify-center rounded-full bg-destructive p-0 text-destructive-foreground"
                                            style={{
                                              top: 2,
                                              right: 2,
                                              width: 18,
                                              height: 18,
                                              minWidth: 18,
                                            }}
                                            onClick={() =>
                                              removeExistingProductImage(idx)
                                            }
                                            title="Remove existing image"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            {productImagePreviews.length > 0 && (
                              <div className="mt-2">
                                <div className="mb-1 text-sm text-muted-foreground">
                                  New uploads
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {productImagePreviews.map((src, idx) => (
                                    <div
                                      key={idx}
                                      className="relative overflow-hidden rounded border border-border"
                                      style={{ width: 64, height: 64 }}
                                    >
                                      <img
                                        src={src}
                                        alt={`Preview ${idx + 1}`}
                                        width={64}
                                        height={64}
                                        className="h-full w-full"
                                        style={{ objectFit: "cover" }}
                                      />
                                      <button
                                        type="button"
                                        className="absolute flex items-center justify-center rounded-full bg-destructive p-0 text-destructive-foreground"
                                        style={{
                                          top: 2,
                                          right: 2,
                                          width: 18,
                                          height: 18,
                                          minWidth: 18,
                                        }}
                                        onClick={() =>
                                          removeSelectedUploadImage(idx)
                                        }
                                        title="Remove image"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="mt-1 text-sm text-muted-foreground">
                              {Math.min(
                                MAX_PRODUCT_IMAGES,
                                (formProduct.images || []).length +
                                  productImageFiles.length,
                              )}
                              /{MAX_PRODUCT_IMAGES} images
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
                          {editingProductIndex != null ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                className="order-2 sm:order-1"
                                onClick={clearProductForm}
                              >
                                Cancel editing
                              </Button>
                              <Button
                                type="button"
                                size="lg"
                                className="order-1 sm:order-2"
                                onClick={updateProductInList}
                                disabled={addingProductToQuery}
                              >
                                Save changes to list
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="lg"
                              className="px-4"
                              onClick={saveProduct}
                              disabled={addingProductToQuery}
                            >
                              {addingProductToQuery ? (
                                <>
                                  <Spinner size="sm" className="mr-2" />
                                  Adding…
                                </>
                              ) : (
                                "Add to query"
                              )}
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <div className="mt-3">
                  <strong className="mb-2 block">Added products</strong>
                  {products.length === 0 ? (
                    <p className="mb-0 text-sm text-muted-foreground">
                      No products yet. Search for a product or click{" "}
                      <strong>Create new product</strong> to add one.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>S.No.</TableHead>
                            <TableHead>Product name</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Subcategory</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Variants</TableHead>
                            <TableHead>HSN Number</TableHead>
                            <TableHead>GST %</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Remark</TableHead>
                            <TableHead>Images</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((p, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{p.productName || "–"}</TableCell>
                              <TableCell className="break-words text-sm">
                                {resolveGroupName(p.groupId)}
                              </TableCell>
                              <TableCell className="break-words text-sm">
                                {resolveCategoryName(p.categoryId)}
                              </TableCell>
                              <TableCell className="break-words text-sm">
                                {resolveSubcategoryName(p.subcategoryId)}
                              </TableCell>
                              <TableCell>{p.quantity ?? "–"}</TableCell>
                              <TableCell>{p.unit || "–"}</TableCell>
                              <TableCell>
                                {(p.variants || []).length > 0
                                  ? (p.variants || [])
                                      .map((v) => v.variantName || "–")
                                      .join(", ")
                                  : "–"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {p.hsnNumber || "–"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {typeof p.gstPercentage === "number"
                                  ? `${p.gstPercentage}%`
                                  : "–"}
                              </TableCell>
                              <TableCell>
                                {(p.description || "").slice(0, 40)}
                                {(p.description || "").length > 40 ? "…" : ""}
                              </TableCell>
                              <TableCell>
                                {(p.remark || "").slice(0, 40)}
                                {(p.remark || "").length > 40 ? "…" : ""}
                              </TableCell>
                              <TableCell>
                                {renderProductImagesCell(p)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="mr-1"
                                  onClick={() => editProductFromTable(index)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteProductFromTable(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mb-4 flex justify-between">
              <Button
                variant="secondary"
                type="button"
                onClick={() => goToStep(1)}
              >
                Back to Company
              </Button>
              <Button type="button" onClick={handleNextFromProducts}>
                Next: Preview
              </Button>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            {/* 3. Preview */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>3. Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <h6 className="mb-3 border-b border-border pb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Company
                </h6>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="md:col-span-3">
                    <QueryFormDetailField label="Client / company">
                      {industrySearch || companyInfo.name || "—"}
                    </QueryFormDetailField>
                  </div>
                  <QueryFormDetailField label="Zone">
                    {getAreaLabel() || "—"}
                  </QueryFormDetailField>
                  <QueryFormDetailField label="Sub-zone">
                    {getSubZoneLabel() || "—"}
                  </QueryFormDetailField>
                  <QueryFormDetailField label="Location link">
                    {(() => {
                      const loc = (companyInfo.location || "").trim();
                      if (!loc) return "—";
                      if (/^https?:\/\//i.test(loc)) {
                        return (
                          <a
                            href={loc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary! underline-offset-4 hover:underline"
                          >
                            {loc}
                          </a>
                        );
                      }
                      return loc;
                    })()}
                  </QueryFormDetailField>
                  <QueryFormDetailField label="Billing address">
                    <span style={{ whiteSpace: "pre-wrap" }}>
                      {companyInfo.billingAddress?.trim() || "—"}
                    </span>
                  </QueryFormDetailField>
                  <QueryFormDetailField label="Shipping address">
                    <span style={{ whiteSpace: "pre-wrap" }}>
                      {companyInfo.shippingAddress?.trim() || "—"}
                    </span>
                  </QueryFormDetailField>
                </div>

                <h6 className="border-b border-border pb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Purchase managers
                </h6>
                {getSelectedPurchaseManagersForApi(companyInfo.purchaseManagers)
                  .length === 0 ? (
                  <p className="mb-4 mt-3 text-sm text-muted-foreground">—</p>
                ) : (
                  <div className="mb-4 mt-3 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getSelectedPurchaseManagersForApi(
                          companyInfo.purchaseManagers,
                        ).map((purchaseManager, managerIndex) => (
                          <TableRow key={managerIndex}>
                            <TableCell className="break-words">
                              {purchaseManager.name || "—"}
                            </TableCell>
                            <TableCell className="break-words">
                              {purchaseManager.department || "—"}
                            </TableCell>
                            <TableCell>
                              {purchaseManager.phone || "—"}
                            </TableCell>
                            <TableCell className="break-words">
                              {purchaseManager.email || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <h6 className="border-b border-border pb-2 text-sm font-semibold uppercase text-muted-foreground">
                  Products
                </h6>
                {products.length === 0 ? (
                  <p className="mb-0 mt-3 text-sm text-muted-foreground">
                    No products on this query.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Subcategory</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Variants</TableHead>
                          <TableHead>HSN</TableHead>
                          <TableHead className="text-right">GST %</TableHead>
                          <TableHead style={{ minWidth: 180 }}>
                            Description
                          </TableHead>
                          <TableHead style={{ minWidth: 140 }}>
                            Remark
                          </TableHead>
                          <TableHead>Images</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((p, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell className="break-words font-medium">
                              {p.productName || "—"}
                            </TableCell>
                            <TableCell className="break-words text-sm">
                              {resolveGroupName(p.groupId)}
                            </TableCell>
                            <TableCell className="break-words text-sm">
                              {resolveCategoryName(p.categoryId)}
                            </TableCell>
                            <TableCell className="break-words text-sm">
                              {resolveSubcategoryName(p.subcategoryId)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {p.quantity ?? "—"}
                            </TableCell>
                            <TableCell>{p.unit || "—"}</TableCell>
                            <TableCell className="break-words text-sm">
                              {(p.variants || []).length > 0
                                ? (p.variants || [])
                                    .map((v) => v.variantName || "—")
                                    .join(", ")
                                : "—"}
                            </TableCell>
                            <TableCell className="break-words text-sm">
                              {p.hsnNumber || "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {typeof p.gstPercentage === "number"
                                ? `${p.gstPercentage}%`
                                : "—"}
                            </TableCell>
                            <TableCell
                              className="break-words text-sm"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {p.description?.trim() || "—"}
                            </TableCell>
                            <TableCell
                              className="break-words text-sm"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {p.remark?.trim() || "—"}
                            </TableCell>
                            <TableCell>{renderProductImagesCell(p)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mb-4 flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
              <Button
                variant="secondary"
                type="button"
                onClick={() => goToStep(2)}
              >
                Back to Products
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Spinner size="sm" className="mr-2" />}
                {isEdit ? "Update Query" : "Save Query"}
              </Button>
            </div>
          </>
        )}
      </form>

      <Dialog
        open={imagesModal.visible}
        onOpenChange={(open) =>
          !open && setImagesModal({ visible: false, images: [] })
        }
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Images</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {imagesModal.images.length === 0 ? (
              <p className="mb-0 text-muted-foreground">No images available.</p>
            ) : (
              <div className="flex flex-wrap justify-start gap-3">
                {imagesModal.images.map((path, idx) => (
                  <div
                    key={`${path}-${idx}`}
                    className="rounded border border-border bg-card p-1"
                    style={{ maxWidth: 200 }}
                  >
                    <img
                      src={getAssetsUrl(path)}
                      alt={`Product ${idx + 1}`}
                      className="w-full"
                      style={{ objectFit: "contain", maxHeight: 200 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QueryForm;
