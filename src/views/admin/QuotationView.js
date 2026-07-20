import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Undo2,
  ArrowLeft,
  ArrowRight,
  CloudDownload,
  History,
  List,
  Search,
  PackagePlus,
  Plus,
  CheckCircle2,
} from "lucide-react";
import quotationService from "../../services/quotationService";
import usePermissions, {
  canAddNewProductOnQuotation,
  canConvertQuotationToPo,
  isHodRole,
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
import { BackButton, GstRateSelect, Loader } from "../../components";
import {
  Button,
  Badge,
  Alert,
  AlertDescription,
  Input,
  Textarea,
  Select,
  Label,
  Card,
  CardHeader,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
  Switch,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import AuthImage from "../../components/AuthImage/AuthImage";
import { toastError, toastSuccess } from "../../utils/toast";
import {
  formatIstDisplayDate,
  formatIstDisplayDateTime,
  formatIstDateKey,
} from "../../utils/istDate";
import { ROLES, ROLE_LABELS } from "../../context/AuthContext";
import QuoteLogsSidebar from "./QuoteLogsSidebar";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import {
  getReadyQueryProductsMissingFromQuotation,
  getProductSubStatusLabel,
} from "../../utils/queryProductQuotationStatus";

const PURCHASE_ROLES = [
  ROLES.PURCHASE_EXICUTIVE,
  ROLES.PROCUREMENT,
  "purchase_executive",
];

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
      return <Badge variant="warning">Pending</Badge>;
    case "rate_submitted":
      return <Badge variant="info">Rate submitted</Badge>;
    case "fulfilled":
      return <Badge variant="success">Fulfilled</Badge>;
    case "approval_pending":
      return <Badge variant="secondary">Approval Pending</Badge>;
    default:
      return status ? (
        <Badge variant="secondary">{status}</Badge>
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

const computeProcurementRateBounds = (rates = []) => {
  const minValues = rates
    .map((rateRow) => rateRow?.minRate)
    .filter((value) => value != null && !Number.isNaN(Number(value)))
    .map(Number);
  const maxValues = rates
    .map((rateRow) => rateRow?.maxRate)
    .filter((value) => value != null && !Number.isNaN(Number(value)))
    .map(Number);

  return {
    minRate: minValues.length ? Math.min(...minValues) : null,
    maxRate: maxValues.length ? Math.max(...maxValues) : null,
  };
};

const formatProcurementBoundRate = (value) =>
  value != null && !Number.isNaN(Number(value))
    ? Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";

const PROCUREMENT_RATE_AVAILABLE_STYLE = {
  backgroundColor: "#198754",
  color: "#fff",
};

const PROCUREMENT_RATE_UNAVAILABLE_STYLE = {
  backgroundColor: "#ff9933",
  color: "#fff",
};

const ProcurementRateAvailabilityBadge = ({
  loading,
  available,
  hasProductCode,
}) => {
  const labelStyle =
    "small text-nowrap d-inline-block px-2 py-1 rounded fw-semibold";

  if (!hasProductCode) {
    return (
      <span className={labelStyle} style={PROCUREMENT_RATE_UNAVAILABLE_STYLE}>
        Rate not available
      </span>
    );
  }
  if (loading) {
    return <Spinner size="sm" />;
  }
  if (available) {
    return (
      <span className={labelStyle} style={PROCUREMENT_RATE_AVAILABLE_STYLE}>
        Rate available
      </span>
    );
  }
  return (
    <span className={labelStyle} style={PROCUREMENT_RATE_UNAVAILABLE_STYLE}>
      Rate not available
    </span>
  );
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

const newProductQuantitySchema = yup.object({
  quantity: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null ? NaN : value,
    )
    .typeError("Quantity is required")
    .required("Quantity is required")
    .integer("Quantity must be a whole number")
    .min(1, "Quantity must be greater than 0")
    .max(MAX_PRODUCT_QUANTITY, "Quantity cannot exceed 1,00,000"),
});

const resolveGstDisplayValue = (gstPercentage) => {
  if (gstPercentage === "" || gstPercentage == null) {
    return String(DEFAULT_GST_PERCENTAGE);
  }
  return String(gstPercentage);
};

const isGstAboveStandardRate = (gstPercentage) => {
  const raw =
    gstPercentage === "" || gstPercentage == null
      ? DEFAULT_GST_PERCENTAGE
      : Number(gstPercentage);
  return Number.isFinite(raw) && raw > DEFAULT_GST_PERCENTAGE;
};

const resolveGstSaveValue = (gstPercentage) => {
  if (gstPercentage === "" || gstPercentage == null) {
    return DEFAULT_GST_PERCENTAGE;
  }
  const parsedGst = Number(gstPercentage);
  return Number.isFinite(parsedGst) ? parsedGst : DEFAULT_GST_PERCENTAGE;
};

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

const formatClientPendingAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getQuotationBillingAddress = (quotation, companyForm = {}) => {
  const fromForm = String(companyForm.billingAddress || "").trim();
  if (fromForm) return fromForm;

  const companyInfo = quotation?.companyInfo || {};
  const industry = quotation?.industry_id || {};
  return (
    String(companyInfo.billingAddress || "").trim() ||
    String(industry.billingAddress || "").trim() ||
    String(companyInfo.address || "").trim() ||
    ""
  );
};

const getQuotationShippingAddress = (quotation, companyForm = {}) => {
  const fromForm = String(companyForm.shippingAddress || "").trim();
  if (fromForm) return fromForm;

  const companyInfo = quotation?.companyInfo || {};
  const industry = quotation?.industry_id || {};
  return (
    String(companyInfo.shippingAddress || "").trim() ||
    String(industry.shippingAddress || "").trim() ||
    String(companyInfo.address || "").trim() ||
    ""
  );
};

const ClientPendingAmountBadge = ({ quotation }) => {
  const isOverdue = !!quotation?.clientPaymentOverdue;

  return (
    <span
      className={`text-nowrap fw-semibold px-2 py-1 rounded border${
        isOverdue ? "" : " text-success!"
      }`}
      style={{
        color: isOverdue ? "#fd7e14" : undefined,
        backgroundColor: "#ffffff",
      }}
    >
      Pending amount: ₹
      {formatClientPendingAmount(quotation?.clientPendingAmount)}
    </span>
  );
};

/**
 * Dummy product catalog used only by the "Add New Product" modal below.
 * UI/demo data — no backend involved. Searching the modal filters this list.
 */
const DUMMY_PRODUCT_CATALOG = [
  {
    id: "CAT-1001",
    productName: "M8 Hex Bolt (SS304)",
    description: "Stainless steel 304 hex head bolt, fully threaded.",
    unit: "Nos",
    hsnNumber: "73181500",
    modelNumber: "HB-M8-SS",
    gstPercentage: 18,
  },
  {
    id: "CAT-1002",
    productName: "PVC Insulated Copper Wire 2.5sq mm",
    description: "Flame-retardant single-core copper wire, 90m coil.",
    unit: "Coil",
    hsnNumber: "85444999",
    modelNumber: "CW-2.5-FR",
    gstPercentage: 18,
  },
  {
    id: "CAT-1003",
    productName: "Industrial Safety Helmet",
    description: "ABS shell safety helmet with ratchet suspension.",
    unit: "Nos",
    hsnNumber: "65061010",
    modelNumber: "SH-RTC-01",
    gstPercentage: 12,
  },
  {
    id: "CAT-1004",
    productName: "Hydraulic Hose 1/2 inch",
    description:
      "Double wire-braided hydraulic hose, working pressure 250 bar.",
    unit: "Mtr",
    hsnNumber: "40091100",
    modelNumber: "HH-0.5-2WB",
    gstPercentage: 18,
  },
  {
    id: "CAT-1005",
    productName: "Ball Bearing 6204 ZZ",
    description: "Deep-groove sealed ball bearing, 20x47x14 mm.",
    unit: "Nos",
    hsnNumber: "84821011",
    modelNumber: "BB-6204ZZ",
    gstPercentage: 18,
  },
  {
    id: "CAT-1006",
    productName: "Cordless Impact Drill 20V",
    description: "Brushless 20V impact drill with 2 batteries and charger.",
    unit: "Set",
    hsnNumber: "84672900",
    modelNumber: "CD-20V-BL",
    gstPercentage: 18,
  },
];

/**
 * Add-New-Product flow — pure UI/demo. Two steps: (1) a search box that filters
 * the dummy catalog, (2) a details form (pre-filled from the picked catalog
 * item) with a "Add to query as well" toggle. On confirm, hands the assembled
 * product back to the caller which appends it to the quotation product list.
 * No backend calls are made anywhere in here.
 */
const AddNewProductModal = ({ open, onOpenChange, onAdd, queryCode }) => {
  const [step, setStep] = useState("search");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [addToQuery, setAddToQuery] = useState(false);
  const searchInputRef = useRef(null);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return DUMMY_PRODUCT_CATALOG;
    return DUMMY_PRODUCT_CATALOG.filter((p) =>
      [p.productName, p.modelNumber, p.hsnNumber, p.description]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(term)),
    );
  }, [search]);

  // Reset to a clean search step every time the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setStep("search");
      setSearch("");
      setForm(null);
      setAddToQuery(false);
      // focus the search box shortly after the dialog paints
      const t = setTimeout(() => searchInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  const pickProduct = (product) => {
    setForm({
      ...product,
      quantity: 1,
      remark: "",
    });
    setStep("details");
  };

  const openFirstOnEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0) pickProduct(results[0]);
    }
  };

  const updateForm = (key, value) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleAdd = () => {
    if (!form) return;
    onAdd(form, addToQuery);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === "details" ? "max-w-3xl" : "max-w-2xl"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary!" />
            {step === "search" ? "Add New Product" : "Product Details"}
          </DialogTitle>
        </DialogHeader>

        {step === "search" ? (
          <div>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={openFirstOnEnter}
                placeholder="Search product by name, model or HSN — press Enter to pick"
                className="pl-9"
              />
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              {results.length} product{results.length === 1 ? "" : "s"} found.
              Click one, or press Enter to open the top match.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              {results.length > 0 ? (
                results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickProduct(p)}
                    className="flex w-full items-start justify-between gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">
                        {p.productName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.modelNumber} · HSN {p.hsnNumber} · {p.description}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 font-normal">
                      GST {p.gstPercentage}%
                    </Badge>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No matching products in the catalog.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Left / main: editable details */}
            <div className="space-y-3 md:col-span-2">
              <div>
                <Label>
                  Product name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form?.productName || ""}
                  onChange={(e) => updateForm("productName", e.target.value)}
                  placeholder="Product name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={form?.description || ""}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>
                    Qty <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={form?.quantity ?? 1}
                    onChange={(e) => updateForm("quantity", e.target.value)}
                    placeholder="Quantity"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <ProductUnitSelect
                    value={form?.unit || ""}
                    onChange={(e) => updateForm("unit", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>HSN Number</Label>
                  <Input
                    value={form?.hsnNumber || ""}
                    onChange={(e) => updateForm("hsnNumber", e.target.value)}
                    placeholder="HSN"
                  />
                </div>
                <div>
                  <Label>Model Number</Label>
                  <Input
                    value={form?.modelNumber || ""}
                    onChange={(e) => updateForm("modelNumber", e.target.value)}
                    placeholder="Model"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>GST %</Label>
                  <GstRateSelect
                    value={form?.gstPercentage ?? ""}
                    onChange={(e) =>
                      updateForm("gstPercentage", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>Remark</Label>
                  <Input
                    value={form?.remark || ""}
                    onChange={(e) => updateForm("remark", e.target.value)}
                    placeholder="Remark"
                  />
                </div>
              </div>
            </div>

            {/* Right / side: the "also add to query" toggle */}
            <div className="md:col-span-1">
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Add to query as well
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Also create this as a new product on the linked query
                      {queryCode ? ` ${queryCode}` : ""}.
                    </p>
                  </div>
                  <Switch
                    checked={addToQuery}
                    onCheckedChange={setAddToQuery}
                  />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {addToQuery ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-success!" />
                      Will be added to the query too.
                    </>
                  ) : (
                    "Quotation only."
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "details" ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("search")}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to search
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!form?.productName?.trim()}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Product
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const QuotationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [quotation, setQuotation] = useState(null);
  // "Add New Product" demo modal (UI/dummy only — appends to the local list).
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [approvingHod, setApprovingHod] = useState(false);
  const [convertPoModalVisible, setConvertPoModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [productIndex, setProductIndex] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductEditModal, setShowProductEditModal] = useState(false);
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
  const [newProductImagesError, setNewProductImagesError] = useState("");
  const [editingProductImagesError, setEditingProductImagesError] =
    useState("");
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
  const productQuantityInputRef = useRef(null);
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
  const { ref: registerProductQuantityInputRef, ...productQuantityInputProps } =
    registerProductQuantityField("quantity");
  const {
    register: registerNewProductQuantityField,
    reset: resetNewProductQuantityForm,
    trigger: triggerNewProductQuantityField,
    getValues: getNewProductQuantityFormValues,
    formState: { errors: newProductQuantityFormErrors },
  } = useForm({
    resolver: yupResolver(newProductQuantitySchema),
    defaultValues: { quantity: 1 },
    mode: "onChange",
  });
  const {
    ref: registerNewProductQuantityInputRef,
    ...newProductQuantityInputProps
  } = registerNewProductQuantityField("quantity");
  const [companyForm, setCompanyForm] = useState({
    name: "",
    location: "",
    area: "",
    address: "",
    billingAddress: "",
    shippingAddress: "",
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
  const [quotationSnapshots, setQuotationSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState(null);
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
  const [importingQueryProductId, setImportingQueryProductId] = useState(null);
  /** Per line index: { loading, available, minRate, maxRate } */
  const [lineRateAvailability, setLineRateAvailability] = useState({});
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
  const queryProductsFromLinkedQuery = useMemo(() => {
    const raw =
      quotation?.queryId &&
      typeof quotation.queryId === "object" &&
      Array.isArray(quotation.queryId.products)
        ? quotation.queryId.products
        : [];
    return raw;
  }, [quotation?.queryId]);
  const queryProductsMissingFromQuotation = useMemo(
    () =>
      getReadyQueryProductsMissingFromQuotation(
        queryProductsFromLinkedQuery,
        products,
      ),
    [queryProductsFromLinkedQuery, products],
  );
  const relatedQueryCode =
    quotation?.queryId &&
    typeof quotation.queryId === "object" &&
    quotation.queryId.queryCode
      ? String(quotation.queryId.queryCode).trim()
      : "";
  const relatedQueryLinkLabel = relatedQueryCode || "View Query";

  // Demo-only: append the product chosen in the Add-New-Product modal to the
  // local quotation product list. No API call — dummy data, UI preview only.
  const handleAddDummyProduct = (product, addToQuery) => {
    const newRow = {
      _id: `dummy-${Date.now()}`,
      productName: (product.productName || "").trim(),
      description: product.description || "",
      quantity: Number(product.quantity) || 1,
      unit: product.unit || "",
      hsnNumber: product.hsnNumber || "",
      modelNumber: product.modelNumber || "",
      gstPercentage:
        product.gstPercentage === "" || product.gstPercentage == null
          ? null
          : Number(product.gstPercentage),
      remark: product.remark || "",
      images: [],
      product_id: null,
    };
    setQuotation((prev) =>
      prev ? { ...prev, products: [...(prev.products || []), newRow] } : prev,
    );
    toastSuccess(
      addToQuery
        ? `${newRow.productName || "Product"} added to quotation and query`
        : `${newRow.productName || "Product"} added to quotation`,
    );
  };

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
        billingAddress:
          ci.billingAddress ||
          displayQuotation?.industry_id?.billingAddress ||
          ci.address ||
          "",
        shippingAddress:
          ci.shippingAddress ||
          displayQuotation?.industry_id?.shippingAddress ||
          ci.address ||
          "",
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
        billingAddress:
          displayQuotation?.industry_id?.billingAddress ||
          displayQuotation?.industry_id?.address ||
          "",
        shippingAddress:
          displayQuotation?.industry_id?.shippingAddress ||
          displayQuotation?.industry_id?.address ||
          "",
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

  useEffect(() => {
    if (
      !id ||
      !OBJECT_ID_REGEX.test(id) ||
      activeTab !== "history" ||
      !isHodRole(user?.role)
    ) {
      return;
    }
    let cancelled = false;
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    quotationService
      .listSnapshots(id)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data ?? res?.data ?? res;
        const list = Array.isArray(data?.snapshots) ? data.snapshots : [];
        setQuotationSnapshots(list);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load quotation history";
        setSnapshotsError(msg);
        setQuotationSnapshots([]);
        toastError(msg);
      })
      .finally(() => {
        if (!cancelled) setSnapshotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, activeTab, user?.role]);

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
        setZoneNameDisplay(name || "");
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
          billingAddress: companyForm.billingAddress || "",
          shippingAddress: companyForm.shippingAddress || "",
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
              billingAddress: companyForm.billingAddress,
              shippingAddress: companyForm.shippingAddress,
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
      syncProductQuantityField(p.quantity ?? "");
      setEditingProductImagesError("");
    } else {
      setEditingProduct(null);
      syncProductQuantityField("");
      setEditingProductImagesError("");
    }
  }, [productIndex, products, syncProductQuantityField]);

  useEffect(() => {
    if (
      !quotation?.id ||
      !queryId ||
      !Array.isArray(displayQuotation?.products) ||
      displayQuotation.products.length === 0
    ) {
      setLineRateAvailability({});
      return;
    }

    let cancelled = false;
    const lineProducts = displayQuotation.products;

    const loadLineRates = async () => {
      const loadingState = {};
      lineProducts.forEach((product, index) => {
        loadingState[index] = {
          loading: Boolean(String(product?.rawProductCode ?? "").trim()),
          available: null,
          minRate: null,
          maxRate: null,
        };
      });
      setLineRateAvailability(loadingState);

      const results = await Promise.all(
        lineProducts.map(async (product, index) => {
          const rawCode = String(product?.rawProductCode ?? "").trim();
          if (!rawCode) {
            return {
              index,
              loading: false,
              available: false,
              minRate: null,
              maxRate: null,
            };
          }
          try {
            const res = await quotationService.getLineProcurementRates(
              quotation.id,
              {
                rawProductCode: rawCode,
                lineIndex: index,
              },
            );
            const { rates } = parseLineProcurementRatesResponse(res);
            const { minRate, maxRate } = computeProcurementRateBounds(rates);
            return {
              index,
              loading: false,
              available: rates.length > 0,
              minRate,
              maxRate,
            };
          } catch {
            return {
              index,
              loading: false,
              available: false,
              minRate: null,
              maxRate: null,
            };
          }
        }),
      );

      if (cancelled) return;

      const next = {};
      results.forEach(({ index, loading, available, minRate, maxRate }) => {
        next[index] = { loading, available, minRate, maxRate };
      });
      setLineRateAvailability(next);
    };

    loadLineRates();
    return () => {
      cancelled = true;
    };
  }, [quotation?.id, queryId, displayQuotation?.products]);

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

  const getEditingProductImageCount = (fallbackProduct = null) => {
    const fromEditing = Array.isArray(editingProduct?.images)
      ? editingProduct.images
      : [];
    if (fromEditing.length > 0) return fromEditing.length;
    if (fallbackProduct) return getProductImagesForEdit(fallbackProduct).length;
    return getProductImagesForEdit(editingProduct).length;
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
      setEditingProductImagesError("");
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
    const isQuantityValid = await triggerProductQuantityField("quantity");
    if (!isQuantityValid) return false;
    const idx = Math.min(productIndex, products.length - 1);
    if (getEditingProductImageCount(products[idx]) === 0) {
      setEditingProductImagesError("At least one image is required");
      toastError("Upload at least one image before updating");
      return false;
    }
    setEditingProductImagesError("");
    const qty = getProductQuantityFormValues("quantity");
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
        gstPercentage: resolveGstSaveValue(editingProduct.gstPercentage),
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

  const openProductEditModal = (idx) => {
    if (!products[idx]) return;
    setProductIndex(idx);
    setShowProductEditModal(true);
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
    return val != null ? String(val) : "";
  };
  const setListGst = (idx, val) =>
    setProductListGstEdits((prev) => ({ ...prev, [idx]: val }));
  const setListRate = (idx, val) =>
    setProductListRateEdits((prev) => ({ ...prev, [idx]: val }));

  const getLineProcurementBounds = (idx) => lineRateAvailability[idx] || {};

  const isListRateBelowProcurementMin = (idx) => {
    const { available, minRate } = getLineProcurementBounds(idx);
    if (!available || minRate == null || Number.isNaN(Number(minRate))) {
      return false;
    }
    const rateVal = getListRate(idx);
    if (rateVal === "" || rateVal == null) return false;
    const rateNum = Number(rateVal);
    if (Number.isNaN(rateNum)) return false;
    return rateNum < Number(minRate);
  };

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
  const isListDeliveryWithinFilled = (idx) =>
    getListDeliveryWithinApiValue(idx) != null;
  const isListRateFilled = (idx) => {
    const rateVal = getListRate(idx);
    return rateVal !== "" && rateVal != null && !Number.isNaN(Number(rateVal));
  };
  const isListGstFilled = (idx) => {
    const gstVal = getListGst(idx);
    return gstVal !== "" && gstVal != null && !Number.isNaN(Number(gstVal));
  };
  const isListProductUpdateReady = (idx) => {
    const p = products[idx];
    if (p?.notAvailable) return true;
    return (
      isListDeliveryWithinFilled(idx) &&
      isListRateFilled(idx) &&
      isListGstFilled(idx)
    );
  };
  const getListProductUpdateDisabledReason = (idx) => {
    if (isListProductUpdateReady(idx)) return undefined;
    const missing = [];
    if (!isListDeliveryWithinFilled(idx)) missing.push("Delivery within");
    if (!isListRateFilled(idx)) missing.push("Rate");
    if (!isListGstFilled(idx)) missing.push("GST %");
    return `Fill ${missing.join(", ")} to update`;
  };
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
      if (isListRateBelowProcurementMin(idx)) {
        const { minRate } = getLineProcurementBounds(idx);
        toastError(
          `Rate cannot be below the minimum procurement rate (₹${formatProcurementBoundRate(minRate)}).`,
        );
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
    resetNewProductQuantityForm({ quantity: 1 });
    setNewProductImageFiles([]);
    setNewProductImagePreviews([]);
    setNewProductImagesError("");
  };

  const handleAddNewProduct = async () => {
    if (!quotation?.id || !canShowAddNewProductTab) return;
    if (!newProductForm.productName?.trim()) {
      toastError("Product name is required");
      return;
    }
    const isQuantityValid = await triggerNewProductQuantityField("quantity");
    if (!isQuantityValid) return;
    const qty = getNewProductQuantityFormValues("quantity");
    if (newProductImageFiles.length === 0) {
      setNewProductImagesError("At least one image is required");
      toastError("Upload at least one image before adding the product");
      return;
    }
    setNewProductImagesError("");
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
        gstPercentage: resolveGstSaveValue(newProductForm.gstPercentage),
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
      setActiveTab("productList");
      setProductIndex(products.length);
    } catch (err) {
      toastError(err?.message || "Failed to add product");
    } finally {
      setAddingNewProduct(false);
    }
  };

  const handleImportQueryProduct = async (queryProduct) => {
    const queryProductId = queryProduct?._id ?? queryProduct?.id;
    if (
      !quotation?.id ||
      !queryProductId ||
      !canUpdateQuotation ||
      isSnapshotPreview
    ) {
      return;
    }
    setImportingQueryProductId(String(queryProductId));
    try {
      const res = await quotationService.importQueryProduct(
        quotation.id,
        queryProductId,
      );
      const data = res?.data?.data ?? res?.data ?? res;
      if (data) {
        setQuotation({ ...data, id: data._id ?? data.id ?? quotation.id });
      }
      setQuoteLogsRefreshKey((prev) => prev + 1);
      toastSuccess(
        "Product imported into quotation. HOD approval is required again.",
      );
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to import query product",
      );
    } finally {
      setImportingQueryProductId(null);
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
      const { rates, status, productName } =
        parseLineProcurementRatesResponse(res);
      const { minRate, maxRate } = computeProcurementRateBounds(rates);
      setProcurementRatesModal((prev) => ({
        ...prev,
        loading: false,
        error: "",
        status,
        rates,
        productLabel: productName || productLabel,
      }));
      setLineRateAvailability((prev) => ({
        ...prev,
        [lineIndex]: {
          loading: false,
          available: rates.length > 0,
          minRate,
          maxRate,
        },
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
  const canDeleteQuotationProduct = isHodUser;
  const canShowAddNewProductTab = canAddNewProductOnQuotation(userRole);
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
    setConvertPoModalVisible(true);
  };

  const closeConvertPoModal = () => {
    setConvertPoModalVisible(false);
  };

  const onConvertPoConfirmYes = () => {
    closeConvertPoModal();
    navigate(`/quotations/${quotation.id}/finalize-sales-order`);
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
    const cls = "uppercase font-semibold px-3 py-1.5";
    switch (status) {
      case "partial":
        return (
          <Badge variant="warning" className={cls}>
            Partial
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className={cls}>
            Approved
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="secondary" className={cls}>
            Draft
          </Badge>
        );
      case "hod_approved":
        return (
          <Badge variant="success" className={cls}>
            Approved
          </Badge>
        );
      case "sent":
      case "sentToClient":
        return (
          <Badge variant="info" className={cls}>
            Sent
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="success" className={cls}>
            Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className={cls}>
            Rejected
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="warning" className={cls}>
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className={cls}>
            {status}
          </Badge>
        );
    }
  };

  if (!quotation) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Quotation not found</h4>
          <Button type="button" onClick={() => navigate("/quotations")}>
            Back to Quotations
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4 border-0 shadow-sm rounded-xl bg-muted">
        <CardContent className="p-3 p-md-4">
          {/* Row 1: quotation id / status + summary */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-3">
            <div
              className="fw-bold text-primary! px-3 py-2 rounded-pill border"
              style={{
                fontSize: "1rem",
                letterSpacing: "0.3px",
                backgroundColor: "#eef4ff",
              }}
            >
              {quotation.quotationCode ||
                `QT-${String(quotation.id).slice(-6)}`}
              {snapshotPreview?.snapshotCode ? (
                <span className="ms-2 text-sm text-secondary font-normal">
                  ({snapshotPreview.snapshotCode})
                </span>
              ) : null}
            </div>
            <div
              className="flex flex-wrap items-center lg:justify-end gap-2 gap-md-3"
              style={{ minWidth: 0 }}
            >
              <span
                className="text-nowrap font-semibold px-2 py-1 rounded border bg-card"
                style={{ color: "#fd7e14" }}
              >
                Without Rate: {productsWithoutRate.length}
              </span>
              <span className="text-nowrap font-semibold text-success! px-2 py-1 rounded border bg-card">
                With Rate: {productsWithRate.length}
              </span>
              <span className="text-nowrap font-semibold text-secondary px-2 py-1 rounded border bg-card">
                Total: {products.length}
              </span>
              {isHodUser ? (
                <ClientPendingAmountBadge quotation={quotation} />
              ) : null}
              {getStatusBadge(displayQuotation?.status)}
            </div>
          </div>

          {/* Row 2: back + actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 gap-md-3 pt-3 border-t border-border">
            <BackButton fallback="/quotations" />

            <div className="flex flex-wrap md:justify-end items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuoteLogsOpen((prev) => !prev)}
                className="inline-flex items-center px-3"
                style={{ height: 40 }}
              >
                {quoteLogsOpen ? "Hide Quote Logs" : "Show Quote Logs"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadProductsPdf}
                disabled={exportingPdf || isSnapshotPreview || !canDownloadPdf}
                title={
                  canDownloadPdf ? "Download PDF" : pdfDownloadDisabledTitle
                }
                className="inline-flex items-center px-3"
                style={{ height: 40 }}
              >
                {exportingPdf && <Spinner size="sm" className="me-2" />}
                {!exportingPdf && <CloudDownload className="me-2 h-4 w-4" />}
                {exportingPdf ? "Generating PDF..." : "Download PDF"}
              </Button>
              {canCreatePurchaseOrder ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSnapshotPreview || !canConvertToPo}
                  onClick={handleConvertToPoClick}
                  className="inline-flex items-center px-3 border-green-600 text-green-700 hover:bg-green-50"
                  style={{ height: 40 }}
                  title={
                    canConvertToPo
                      ? "Convert quotation to sales order"
                      : "Convert to Sales Order is available after HOD approval"
                  }
                >
                  Convert to Sales Order
                </Button>
              ) : null}
              {canApproveAsHod ? (
                <Button
                  type="button"
                  variant={isHodApprovedStatus ? "outline" : "default"}
                  disabled={
                    approvingHod || isSnapshotPreview || isHodApprovedStatus
                  }
                  onClick={handleHodApproveQuotation}
                  className={cn(
                    "inline-flex items-center px-3",
                    isHodApprovedStatus
                      ? "border-green-600 text-green-700"
                      : "bg-amber-500 text-white hover:bg-amber-600",
                  )}
                  style={{ height: 40 }}
                  title={
                    isHodApprovedStatus
                      ? "Already HOD approved"
                      : "Approve quotation as HOD"
                  }
                >
                  {approvingHod && <Spinner size="sm" className="me-2" />}
                  {isHodApprovedStatus
                    ? "HOD Approved"
                    : approvingHod
                      ? "Approving..."
                      : "Approve (HOD)"}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {isSnapshotPreview ? (
        <Alert
          variant="info"
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-4"
        >
          <AlertDescription className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between w-full">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-nowrap"
              onClick={() => setSnapshotPreview(null)}
            >
              Back to current quotation
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-bottom bg-muted">
            <TabsList className="flex h-auto flex-wrap justify-start gap-2 border-0">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="company">Company Information</TabsTrigger>
              <TabsTrigger value="freightPacking">
                Freight &amp; Packing Charge
              </TabsTrigger>
              <TabsTrigger value="productList">
                Product List ({products.length})
              </TabsTrigger>
              {queryId ? (
                <TabsTrigger value="queryProducts">
                  Pull Product from Query (
                  {queryProductsMissingFromQuotation.length})
                </TabsTrigger>
              ) : null}
              {isHodUser ? (
                <TabsTrigger value="history">
                  <History className="me-1 h-4 w-4" />
                  Quotation History
                </TabsTrigger>
              ) : null}
            </TabsList>
          </CardHeader>
          <CardContent>
            {/* Tab 0: Preview - read-only full quotation */}
            <TabsContent
              value="preview"
              forceMount
              hidden={activeTab !== "preview"}
            >
              <Card className="mb-4">
                <CardHeader className="bg-light">
                  <strong>Quotation Preview</strong> — matches PDF layout
                  (read-only)
                </CardHeader>
                <CardContent>
                  {/* Fixed Migti header (same as PDF) */}
                  <div className="mb-4 pb-3 border-bottom">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-3 mb-3 md:mb-0">
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
                      </div>
                      <div className="md:col-span-9 text-center">
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
                      </div>
                    </div>
                  </div>

                  {/* Customer & shipping details (same structure as PDF) */}
                  <div className="mb-4">
                    <h6 className="text-muted-foreground uppercase text-sm mb-2">
                      Customer &amp; Shipping Details
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-7 mb-3 md:mb-0">
                        <h6 className="fw-semibold mb-2">Customer Details</h6>
                        <Table className="mb-0 table-bordered table-sm">
                          <TableBody>
                            <TableRow>
                              <TableHead
                                scope="row"
                                className="bg-light"
                                style={{ width: "32%" }}
                              >
                                Customer Name
                              </TableHead>
                              <TableCell>
                                {companyForm.name ||
                                  displayQuotation?.customerName ||
                                  "–"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableHead scope="row" className="bg-light">
                                Billing address
                              </TableHead>
                              <TableCell style={{ whiteSpace: "pre-wrap" }}>
                                {getQuotationBillingAddress(
                                  displayQuotation,
                                  companyForm,
                                ) || "–"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableHead scope="row" className="bg-light">
                                Contact Person
                              </TableHead>
                              <TableCell>
                                {companyForm.purchaseManagerName ||
                                  displayQuotation?.companyInfo
                                    ?.purchaseManagers?.[0]?.name ||
                                  displayQuotation?.industry_id
                                    ?.purchase_manager_name ||
                                  "–"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableHead scope="row" className="bg-light">
                                Phone
                              </TableHead>
                              <TableCell>
                                {companyForm.purchaseManagerPhone ||
                                  displayQuotation?.companyInfo
                                    ?.purchaseManagers?.[0]?.phone ||
                                  displayQuotation?.industry_id
                                    ?.purchase_manager_phone ||
                                  "–"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableHead scope="row" className="bg-light">
                                Email
                              </TableHead>
                              <TableCell>
                                {companyForm.purchaseManagerEmail ||
                                  displayQuotation?.companyInfo
                                    ?.purchaseManagers?.[0]?.email ||
                                  displayQuotation?.companyInfo?.email ||
                                  displayQuotation?.industry_id?.email ||
                                  displayQuotation?.customerEmail ||
                                  "–"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableHead scope="row" className="bg-light">
                                GST Number
                              </TableHead>
                              <TableCell>
                                {displayQuotation?.companyInfo?.gstNumber ||
                                  displayQuotation?.industry_id?.gstNumber ||
                                  "–"}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:col-span-5">
                        <h6 className="fw-semibold mb-2">Shipping Details</h6>
                        <Table className="mb-2 table-bordered table-sm">
                          <TableBody>
                            <TableRow>
                              <TableHead scope="row" className="bg-light">
                                Contact Person
                              </TableHead>
                              <TableCell>
                                {companyForm.purchaseManagerName ||
                                  displayQuotation?.companyInfo
                                    ?.purchaseManagers?.[0]?.name ||
                                  displayQuotation?.industry_id
                                    ?.purchase_manager_name ||
                                  "–"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableHead scope="row" className="bg-light">
                                Shipping Address
                              </TableHead>
                              <TableCell style={{ whiteSpace: "pre-wrap" }}>
                                {getQuotationShippingAddress(
                                  displayQuotation,
                                  companyForm,
                                ) || "–"}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
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
                              <Button
                                type="button"
                                variant="link"
                                className="p-0 align-baseline"
                                onClick={() => navigate(`/queries/${queryId}`)}
                              >
                                View Query
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quotation details table (mirror PDF columns) */}
                  <div className="mb-4" style={{ fontSize: "0.8rem" }}>
                    <h6 className="text-muted-foreground uppercase text-sm mb-2">
                      Quotation Details
                    </h6>
                    {products.length > 0 ? (
                      <Table className="table-bordered table-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-center">S.N.</TableHead>
                            <TableHead>Item Name &amp; Description</TableHead>
                            <TableHead className="text-center">
                              Variants
                            </TableHead>
                            <TableHead className="text-center">
                              HSN Code
                            </TableHead>
                            <TableHead className="text-end">
                              Unit Price
                            </TableHead>
                            {hasDiscountColumn && (
                              <TableHead className="text-end">
                                Discount
                              </TableHead>
                            )}
                            <TableHead className="text-center">Qty.</TableHead>
                            <TableHead className="text-center">Unit</TableHead>
                            <TableHead className="text-center">
                              Delivery Within
                            </TableHead>
                            <TableHead className="text-center">GST %</TableHead>
                            <TableHead className="text-end">Total</TableHead>
                            <TableHead className="text-center">Photo</TableHead>
                            <TableHead>Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
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
                              <TableRow key={index}>
                                <TableCell className="text-center align-middle">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
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
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  {variantsText}
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  {hsn}
                                </TableCell>
                                <TableCell className="text-end align-middle">
                                  {rate
                                    ? `₹${rate.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}`
                                    : ""}
                                </TableCell>
                                {hasDiscountColumn && (
                                  <TableCell className="text-end align-middle">
                                    {p.applyDiscount &&
                                    p.discountPercentage != null
                                      ? `${Number(p.discountPercentage).toFixed(2)}%`
                                      : "–"}
                                  </TableCell>
                                )}
                                <TableCell className="text-center align-middle">
                                  {qty || ""}
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  {p.unit || ""}
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  {formatDeliveryWithinDisplay(p.deliveryDate)}
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                  {gstPercent
                                    ? `${gstPercent.toFixed(2)}%`
                                    : "–"}
                                </TableCell>
                                <TableCell className="text-end align-middle">
                                  {rowTotal
                                    ? `₹${rowTotal.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}`
                                    : "–"}
                                </TableCell>
                                <TableCell className="text-center align-middle">
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
                                        <img
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
                                </TableCell>
                                <TableCell className="align-middle">
                                  {reasonText}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted mb-0">
                        No products in this quotation.
                      </p>
                    )}
                  </div>

                  {/* Terms & summary (same as PDF footer area) */}
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    <div style={{ flex: "0 0 55%" }}>
                      <h6 className="fw-semibold mb-2">Terms And Conditions</h6>
                      <ul className="mb-0 text-sm ps-3">
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
                      <Table className="mb-3 table-bordered table-sm">
                        <TableBody>
                          <TableRow>
                            <TableHead className="bg-light text-end">
                              Amount
                            </TableHead>
                            <TableCell className="text-end">
                              ₹
                              {calculatedTotalTaxable.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHead className="bg-light text-end">
                              Freight Charge
                            </TableHead>
                            <TableCell className="text-end">
                              {formatQuotationFreightDisplay(
                                displayQuotation?.freightCharge,
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHead className="bg-light text-end">
                              Packing Charge
                            </TableHead>
                            <TableCell className="text-end">
                              ₹
                              {(
                                Number(displayQuotation?.packingCharge) || 0
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHead className="bg-light text-end">
                              Expected Delivery Within
                            </TableHead>
                            <TableCell className="text-end">
                              {displayQuotation?.expectedDeliveryWithinDays !=
                                null &&
                              !Number.isNaN(
                                Number(
                                  displayQuotation.expectedDeliveryWithinDays,
                                ),
                              )
                                ? `${Number(displayQuotation.expectedDeliveryWithinDays)} Days`
                                : "NA"}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHead className="bg-light text-end">
                              Total Taxable Amount
                            </TableHead>
                            <TableCell className="text-end">
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
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHead className="bg-light text-end">
                              GST Amount
                            </TableHead>
                            <TableCell className="text-end">
                              ₹
                              {calculatedTotalGst.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHead className="bg-light text-end fw-semibold">
                              Total Amount
                            </TableHead>
                            <TableCell className="text-end fw-semibold">
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
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 1: Company Information */}
            <TabsContent
              value="company"
              forceMount
              hidden={activeTab !== "company"}
            >
              <Card className="mb-4">
                <CardHeader>
                  <strong>Company Information</strong>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <div className="mb-3">
                        <Label>Company name</Label>
                        <Input
                          disabled
                          className="bg-light"
                          value={companyForm.name}
                          placeholder="Company name"
                        />
                      </div>
                      <div className="mb-3">
                        <Label>Location</Label>
                        <Input
                          disabled
                          className="bg-light"
                          value={companyForm.location}
                          placeholder="Location"
                        />
                      </div>
                      <div className="mb-3">
                        <Label>Zone</Label>
                        <Input
                          disabled
                          className="bg-light"
                          value={
                            zoneNameDisplay ??
                            (OBJECT_ID_REGEX.test(
                              String(companyForm.area || "").trim(),
                            )
                              ? ""
                              : companyForm.area || "")
                          }
                          placeholder="Zone"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-4">
                      <div className="mb-3">
                        <Label>Billing address</Label>
                        <Textarea
                          disabled
                          className="bg-light"
                          rows={3}
                          value={companyForm.billingAddress}
                          placeholder="Billing address"
                        />
                      </div>
                      <div className="mb-3">
                        <Label>Shipping address</Label>
                        <Textarea
                          disabled
                          className="bg-light"
                          rows={3}
                          value={companyForm.shippingAddress}
                          placeholder="Shipping address"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-4">
                      <div className="mb-3">
                        <Label>Purchase manager name</Label>
                        <Input
                          disabled
                          className="bg-light"
                          value={companyForm.purchaseManagerName}
                          placeholder="Name"
                        />
                      </div>
                      <div className="mb-3">
                        <Label>Purchase manager phone</Label>
                        <Input
                          disabled
                          className="bg-light"
                          value={companyForm.purchaseManagerPhone}
                          placeholder="Phone"
                        />
                      </div>
                      <div className="mb-3">
                        <Label>Purchase manager email</Label>
                        <Input
                          disabled
                          className="bg-light"
                          type="email"
                          value={companyForm.purchaseManagerEmail}
                          placeholder="Email"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-0">
                <CardHeader className="flex justify-between items-center">
                  <strong>Related Query</strong>
                  {queryId ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigate(`/queries/${queryId}`)}
                    >
                      {relatedQueryLinkLabel}
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Freight & Packing Charge */}
            <TabsContent
              value="freightPacking"
              forceMount
              hidden={activeTab !== "freightPacking"}
            >
              <Card className="mb-4">
                <CardHeader>
                  <strong>Freight &amp; Packing Charge</strong>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <div className="mb-3">
                        <Label>Freight</Label>
                        <Select
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
                        </Select>
                      </div>
                      {freightForm.freightMode === "other" && (
                        <div className="mb-3">
                          <Label>Freight amount</Label>
                          <Input
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
                    </div>
                    <div className="md:col-span-4">
                      <div className="mb-3">
                        <Label>Packing charge</Label>
                        <Input
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
                    </div>
                  </div>
                  <div className="mt-2">
                    <Button
                      type="button"
                      onClick={handleSaveFreightPacking}
                      disabled={savingFreight || isSnapshotPreview}
                    >
                      {savingFreight ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Add New Product — HOD and back office only */}
            <TabsContent
              value="addNewProduct"
              forceMount
              hidden={
                !(canShowAddNewProductTab && activeTab === "addNewProduct")
              }
            >
              <Card>
                <CardHeader>
                  <strong>Add New Product</strong>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <Label className="fw-semibold">
                      Product name{" "}
                      <span className="text-danger" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <Input
                      value={newProductForm.productName}
                      onChange={(e) =>
                        updateNewProductForm("productName", e.target.value)
                      }
                      placeholder="Product name"
                    />
                  </div>

                  <h6 className="text-muted-foreground uppercase text-sm font-semibold mb-3">
                    Classification
                  </h6>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6">
                      <div className="mb-3">
                        <Label>
                          Group
                          {createNewQueryProduct || queryId ? (
                            <span className="text-danger"> *</span>
                          ) : null}
                        </Label>
                        <Select
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
                        </Select>
                      </div>
                    </div>
                    <div className="md:col-span-6">
                      <div className="mb-3">
                        <Label>
                          Category
                          {createNewQueryProduct || queryId ? (
                            <span className="text-danger"> *</span>
                          ) : null}
                        </Label>
                        <Select
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
                        </Select>
                      </div>
                    </div>
                  </div>

                  {queryId ? (
                    <div className="text-sm text-muted-foreground mb-3">
                      Product will also be added to query{" "}
                      {relatedQueryCode || "products"} in the Pro Bucket.
                    </div>
                  ) : null}

                  <div className="mb-3">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={newProductForm.description}
                      onChange={(e) =>
                        updateNewProductForm("description", e.target.value)
                      }
                      placeholder="Description"
                    />
                  </div>

                  <h6 className="text-muted-foreground uppercase text-sm font-semibold mb-3">
                    Quantity
                  </h6>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="col-span-6 md:col-span-4">
                      <div className="mb-3">
                        <Label>
                          Qty{" "}
                          <span className="text-danger" aria-hidden="true">
                            *
                          </span>
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={MAX_PRODUCT_QUANTITY}
                          step={1}
                          inputMode="numeric"
                          aria-invalid={!!newProductQuantityFormErrors.quantity}
                          {...newProductQuantityInputProps}
                          ref={(element) => {
                            registerNewProductQuantityInputRef(element);
                          }}
                          onChange={(e) => {
                            newProductQuantityInputProps.onChange(e);
                            updateNewProductForm("quantity", e.target.value);
                          }}
                          placeholder="Quantity"
                        />
                        {newProductQuantityFormErrors.quantity && (
                          <div className="text-destructive text-sm mt-1">
                            {newProductQuantityFormErrors.quantity.message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-4">
                      <div className="mb-3">
                        <Label>Unit</Label>
                        <ProductUnitSelect
                          value={newProductForm.unit}
                          onChange={(e) =>
                            updateNewProductForm("unit", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <h6 className="text-muted-foreground uppercase text-sm font-semibold mb-3">
                    Product details
                  </h6>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-4">
                      <div className="mb-3">
                        <Label>HSN Number</Label>
                        <Input
                          value={newProductForm.hsnNumber}
                          onChange={(e) =>
                            updateNewProductForm("hsnNumber", e.target.value)
                          }
                          placeholder="HSN"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-4">
                      <div className="mb-3">
                        <Label>Model Number</Label>
                        <Input
                          value={newProductForm.modelNumber}
                          onChange={(e) =>
                            updateNewProductForm("modelNumber", e.target.value)
                          }
                          placeholder="Model"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-4">
                      <div className="mb-3">
                        <Label>GST %</Label>
                        <GstRateSelect
                          value={resolveGstDisplayValue(
                            newProductForm.gstPercentage,
                          )}
                          onChange={(e) =>
                            updateNewProductForm(
                              "gstPercentage",
                              e.target.value,
                            )
                          }
                          selectClassName={
                            isGstAboveStandardRate(newProductForm.gstPercentage)
                              ? "border-destructive ring-2 ring-destructive/25"
                              : undefined
                          }
                        />
                        {isGstAboveStandardRate(
                          newProductForm.gstPercentage,
                        ) ? (
                          <div className="text-destructive text-sm mt-1">
                            GST is above {DEFAULT_GST_PERCENTAGE}%
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <Label>Remark</Label>
                    <Input
                      value={newProductForm.remark}
                      onChange={(e) =>
                        updateNewProductForm("remark", e.target.value)
                      }
                      placeholder="Remark"
                    />
                  </div>

                  <h6 className="text-muted-foreground uppercase text-sm font-semibold mb-3">
                    Images
                  </h6>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-6">
                      <div className="mb-3">
                        <Label>
                          Upload Images{" "}
                          <span className="text-danger" aria-hidden="true">
                            *
                          </span>
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          aria-invalid={!!newProductImagesError}
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
                            setNewProductImagesError("");
                          }}
                        />
                        {newProductImagesError ? (
                          <div className="text-destructive text-sm mt-1">
                            {newProductImagesError}
                          </div>
                        ) : null}
                        {newProductImagePreviews.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {newProductImagePreviews.map((src, idx) => (
                              <img
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
                    </div>
                    <div className="md:col-span-6 flex items-end">
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="create-new-query-product"
                            className="h-4 w-4 cursor-pointer rounded border-input"
                            checked={!!createNewQueryProduct}
                            onChange={(e) =>
                              setCreateNewQueryProduct(e.target.checked)
                            }
                          />
                          <Label
                            htmlFor="create-new-query-product"
                            className="mb-0 cursor-pointer"
                          >
                            Create New Query Product (same as in Query)
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    {canCreateQuotation ? (
                      <Button
                        type="button"
                        onClick={handleAddNewProduct}
                        disabled={addingNewProduct || isSnapshotPreview}
                      >
                        {addingNewProduct ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Adding...
                          </>
                        ) : (
                          "Add Product"
                        )}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Product List - bordered table */}
            <TabsContent
              value="productList"
              forceMount
              hidden={activeTab !== "productList"}
            >
              <div style={{ fontSize: "0.9rem" }}>
                {products.length > 0 ? (
                  <>
                    <div className="scrollbar-hidden-x">
                      <Table className="table-fixed table-bordered table-hover">
                        <TableHeader>
                          <TableRow>
                            <TableHead
                              className="text-center"
                              style={{ width: 40 }}
                            >
                              #
                            </TableHead>
                            <TableHead style={{ width: 140, maxWidth: 180 }}>
                              Product name / Description
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 52 }}
                            >
                              Qty
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 56 }}
                            >
                              Unit
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 120 }}
                            >
                              Delivery within
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 72 }}
                            >
                              HSN
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 72 }}
                            >
                              Model
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 115 }}
                            >
                              GST %
                            </TableHead>
                            {queryId ? (
                              <TableHead
                                className="text-center"
                                style={{ width: 140 }}
                              >
                                Procurement rate
                              </TableHead>
                            ) : null}
                            <TableHead
                              className="text-center"
                              style={{ width: 160 }}
                            >
                              Images
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 150 }}
                            >
                              Rate (₹)
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 100 }}
                            >
                              Discount
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 125 }}
                            >
                              Total (₹)
                            </TableHead>
                            <TableHead
                              className="text-center"
                              style={{ width: 100 }}
                            >
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
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
                            const procurementBounds =
                              getLineProcurementBounds(idx);
                            const rateBelowProcurementMin =
                              isListRateBelowProcurementMin(idx);
                            const productListUpdateReady =
                              isListProductUpdateReady(idx);
                            const productListUpdateDisabledReason =
                              getListProductUpdateDisabledReason(idx);
                            return (
                              <TableRow key={idx} style={rowBg}>
                                <TableCell className="text-center">
                                  {idx + 1}
                                </TableCell>
                                <TableCell
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
                                      className="text-sm text-muted-foreground truncate"
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
                                        className="text-sm text-destructive mt-1"
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
                                      <div className="text-sm text-destructive mt-1">
                                        Not available
                                      </div>
                                    ))}
                                </TableCell>
                                <TableCell
                                  className="text-center py-1 small"
                                  style={{ width: 52 }}
                                >
                                  {p.quantity ?? "–"}
                                </TableCell>
                                <TableCell
                                  className="text-center py-1 small"
                                  style={{ width: 56 }}
                                >
                                  {p.unit || "–"}
                                </TableCell>
                                <TableCell className="text-center py-1">
                                  <Select
                                    className="form-control-sm"
                                    style={{
                                      width: "100%",
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
                                  </Select>
                                  {getListDeliveryWithin(idx).select ===
                                    DELIVERY_WITHIN_OTHERS && (
                                    <Input
                                      type="text"
                                      className="form-control-sm mt-1"
                                      style={{
                                        width: "100%",
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
                                </TableCell>
                                <TableCell className="small text-center py-1">
                                  <div
                                    className="text-truncate mx-auto"
                                    title={
                                      productRef?.hsnNumber || p.hsnNumber || ""
                                    }
                                  >
                                    {productRef?.hsnNumber ||
                                      p.hsnNumber ||
                                      "–"}
                                  </div>
                                </TableCell>
                                <TableCell className="small text-center">
                                  <div
                                    className="text-truncate mx-auto"
                                    title={
                                      productRef?.modelNumber ||
                                      productRef?.defaultModelNumber ||
                                      p.modelNumber ||
                                      ""
                                    }
                                  >
                                    {productRef?.modelNumber ||
                                      productRef?.defaultModelNumber ||
                                      p.modelNumber ||
                                      "–"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-1 min-w-[140px]">
                                  <GstRateSelect
                                    selectClassName={cn(
                                      "h-8 text-xs",
                                      isGstAboveStandardRate(getListGst(idx)) &&
                                        "border-destructive ring-2 ring-destructive/25",
                                    )}
                                    value={getListGst(idx)}
                                    onChange={(e) =>
                                      setListGst(idx, e.target.value)
                                    }
                                    title={`GST % (default ${DEFAULT_GST_PERCENTAGE}%, 0–100)`}
                                    disabled={
                                      !!p.notAvailable || isSnapshotPreview
                                    }
                                  />
                                </TableCell>
                                {queryId ? (
                                  <TableCell className="text-center align-middle py-1">
                                    <div className="flex flex-col items-center gap-1">
                                      <ProcurementRateAvailabilityBadge
                                        loading={
                                          lineRateAvailability[idx]?.loading
                                        }
                                        available={
                                          lineRateAvailability[idx]?.available
                                        }
                                        hasProductCode={Boolean(
                                          String(p.rawProductCode ?? "").trim(),
                                        )}
                                      />
                                      {procurementBounds.available &&
                                      !procurementBounds.loading ? (
                                        <div className="text-sm text-muted-foreground text-center">
                                          <div>
                                            Min: ₹
                                            {formatProcurementBoundRate(
                                              procurementBounds.minRate,
                                            )}
                                          </div>
                                          <div>
                                            Max: ₹
                                            {formatProcurementBoundRate(
                                              procurementBounds.maxRate,
                                            )}
                                          </div>
                                        </div>
                                      ) : null}
                                      {String(p.rawProductCode ?? "").trim() ? (
                                        <Button
                                          type="button"
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
                                          <List className="h-5 w-5" />
                                        </Button>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                ) : null}
                                <TableCell className="text-center py-1">
                                  {allImages.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 justify-center items-center">
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
                                            <img
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
                                          className="flex items-center justify-center rounded border bg-muted text-primary! font-bold"
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
                                </TableCell>
                                <TableCell className="text-center py-1">
                                  <Input
                                    type="number"
                                    min={
                                      procurementBounds.available &&
                                      procurementBounds.minRate != null
                                        ? procurementBounds.minRate
                                        : 0
                                    }
                                    step="0.01"
                                    className="form-control-sm"
                                    style={{
                                      width: "100%",
                                      minHeight: 28,
                                      fontSize: "0.75rem",
                                      ...(rateBelowProcurementMin
                                        ? {
                                            borderColor: "#dc3545",
                                            boxShadow:
                                              "0 0 0 0.2rem rgba(220, 53, 69, 0.25)",
                                          }
                                        : {}),
                                    }}
                                    value={rateVal}
                                    onChange={(e) =>
                                      setListRate(idx, e.target.value)
                                    }
                                    placeholder="Rate"
                                    title={
                                      procurementBounds.available &&
                                      procurementBounds.minRate != null
                                        ? `Minimum procurement rate: ₹${formatProcurementBoundRate(procurementBounds.minRate)}`
                                        : "Rate"
                                    }
                                    disabled={
                                      !!p.notAvailable || isSnapshotPreview
                                    }
                                  />
                                  {rateBelowProcurementMin ? (
                                    <div className="text-sm text-destructive mt-1">
                                      Rate cannot be below ₹
                                      {formatProcurementBoundRate(
                                        procurementBounds.minRate,
                                      )}
                                    </div>
                                  ) : null}
                                </TableCell>
                                <TableCell className="text-center py-1">
                                  <div className="flex items-center gap-1 justify-center flex-wrap">
                                    <input
                                      type="checkbox"
                                      id={`discount-cb-${idx}`}
                                      className="h-4 w-4 cursor-pointer rounded border-input"
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
                                    <Label
                                      htmlFor={`discount-cb-${idx}`}
                                      className="mb-0 small"
                                      style={{
                                        fontSize: "0.75rem",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Apply
                                    </Label>
                                    {applyDiscount && (
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className="form-control-sm"
                                        style={{
                                          width: 72,
                                          fontSize: "0.75rem",
                                        }}
                                        value={discountPctVal}
                                        onChange={(e) =>
                                          setListDiscountPct(
                                            idx,
                                            e.target.value,
                                          )
                                        }
                                        placeholder="%"
                                      />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="form-control-sm"
                                    style={{
                                      width: "100%",
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
                                </TableCell>
                                <TableCell className="text-center py-1">
                                  <div className="flex flex-col gap-1 items-center">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-100"
                                      style={{
                                        minWidth: 90,
                                        minHeight: 28,
                                        fontSize: "0.75rem",
                                        lineHeight: 1.2,
                                        padding: "0.25rem 0.35rem",
                                        fontWeight: 700,
                                      }}
                                      onClick={() => openProductEditModal(idx)}
                                    >
                                      Action
                                    </Button>
                                    {canUpdateQuotation ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="w-100"
                                        style={{
                                          minWidth: 90,
                                          minHeight: 28,
                                          fontSize: "0.75rem",
                                          lineHeight: 1.2,
                                          padding: "0.25rem 0.35rem",
                                          fontWeight: 700,
                                        }}
                                        onClick={() =>
                                          handleUpdateProductFromList(idx)
                                        }
                                        disabled={
                                          updating ||
                                          isSnapshotPreview ||
                                          !!p.notAvailable ||
                                          rateBelowProcurementMin ||
                                          !productListUpdateReady
                                        }
                                        title={
                                          rateBelowProcurementMin
                                            ? `Rate must be at least ₹${formatProcurementBoundRate(procurementBounds.minRate)}`
                                            : productListUpdateDisabledReason
                                        }
                                      >
                                        Update
                                      </Button>
                                    ) : null}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
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

                {canShowAddNewProductTab ? (
                  <div className="mt-4 flex justify-end border-t border-border pt-4">
                    <Button
                      type="button"
                      onClick={() => setAddProductModalOpen(true)}
                      disabled={isSnapshotPreview}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add New Product
                    </Button>
                  </div>
                ) : null}
              </div>
            </TabsContent>

            {queryId ? (
              <TabsContent
                value="queryProducts"
                forceMount
                hidden={activeTab !== "queryProducts"}
              >
                <div style={{ fontSize: "0.9rem" }}>
                  <p className="text-muted-foreground text-sm mb-3">
                    Products on the linked query marked{" "}
                    <strong>Ready for quotation</strong> that are not included
                    in this quotation.
                    {relatedQueryCode ? (
                      <>
                        {" "}
                        Query:{" "}
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 align-baseline"
                          onClick={() => navigate(`/queries/${queryId}`)}
                        >
                          {relatedQueryCode}
                        </Button>
                      </>
                    ) : null}
                  </p>
                  {queryProductsMissingFromQuotation.length > 0 ? (
                    <Table className="table-bordered table-hover">
                      <TableHeader>
                        <TableRow>
                          <TableHead style={{ width: 60 }}>#</TableHead>
                          <TableHead>Product name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead style={{ width: 100 }}>Quantity</TableHead>
                          <TableHead style={{ width: 80 }}>Unit</TableHead>
                          <TableHead>Variants</TableHead>
                          <TableHead style={{ width: 100 }}>
                            Product code
                          </TableHead>
                          <TableHead>HSN</TableHead>
                          <TableHead style={{ width: 72 }}>GST %</TableHead>
                          <TableHead>Remark</TableHead>
                          <TableHead style={{ width: 110 }}>
                            Sub status
                          </TableHead>
                          <TableHead style={{ width: 120 }}>Images</TableHead>
                          <TableHead
                            className="text-center"
                            style={{ width: 90 }}
                          >
                            Import
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryProductsMissingFromQuotation.map((p, index) => {
                          const imageUrls = (
                            Array.isArray(p.images) ? p.images : []
                          )
                            .map((img) => getImageUrl(img))
                            .filter(Boolean);
                          return (
                            <TableRow key={p._id || index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{p.productName || "–"}</TableCell>
                              <TableCell className="small">
                                {p.description || "–"}
                              </TableCell>
                              <TableCell>
                                {p.quantity != null ? p.quantity : "–"}
                              </TableCell>
                              <TableCell>{p.unit || "–"}</TableCell>
                              <TableCell className="small">
                                {formatVariants(p.variants)}
                              </TableCell>
                              <TableCell className="small">
                                {p.rawProductCode || "–"}
                              </TableCell>
                              <TableCell className="small">
                                {p.hsnNumber || "–"}
                              </TableCell>
                              <TableCell className="small">
                                {p.gstPercentage != null
                                  ? `${p.gstPercentage}%`
                                  : "–"}
                              </TableCell>
                              <TableCell className="small">
                                {p.remark || "–"}
                              </TableCell>
                              <TableCell className="small">
                                <Badge variant="info" className="font-normal">
                                  {getProductSubStatusLabel(p)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {imageUrls.length > 0 ? (
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className="inline-flex items-center gap-1 flex-wrap"
                                    style={{ cursor: "pointer", maxWidth: 140 }}
                                    onClick={() => {
                                      setImageGalleryImages(imageUrls);
                                      setImageGalleryIndex(0);
                                      setImageGalleryVisible(true);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        setImageGalleryImages(imageUrls);
                                        setImageGalleryIndex(0);
                                        setImageGalleryVisible(true);
                                      }
                                    }}
                                    aria-label="View images"
                                  >
                                    {imageUrls.slice(0, 2).map((src, i) => (
                                      <div
                                        key={i}
                                        className="rounded overflow-hidden border flex-shrink-0"
                                        style={{ width: 40, height: 40 }}
                                      >
                                        <img
                                          src={src}
                                          alt=""
                                          className="w-100 h-100"
                                          style={{ objectFit: "cover" }}
                                        />
                                      </div>
                                    ))}
                                    {imageUrls.length > 2 ? (
                                      <div
                                        className="flex items-center justify-center rounded border bg-muted flex-shrink-0 text-primary! text-sm font-bold"
                                        style={{
                                          width: 40,
                                          height: 40,
                                          fontSize: "0.75rem",
                                        }}
                                      >
                                        +{imageUrls.length - 2}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-muted small">–</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {canUpdateQuotation && !isSnapshotPreview ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    title="Import into quotation"
                                    aria-label="Import into quotation"
                                    disabled={
                                      importingQueryProductId ===
                                      String(p._id ?? p.id ?? "")
                                    }
                                    onClick={() => handleImportQueryProduct(p)}
                                  >
                                    {importingQueryProductId ===
                                    String(p._id ?? p.id ?? "") ? (
                                      <Spinner size="sm" />
                                    ) : (
                                      <CloudDownload className="h-4 w-4" />
                                    )}
                                  </Button>
                                ) : (
                                  <span className="text-muted small">–</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted mb-0">
                      No query products are ready for quotation and missing from
                      this quotation.
                    </p>
                  )}
                </div>
              </TabsContent>
            ) : null}

            {isHodUser ? (
              <TabsContent
                value="history"
                forceMount
                hidden={activeTab !== "history"}
              >
                <Card className="mb-0 border-0">
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-3">
                      Versions saved when HOD approved this quotation. Restore
                      loads that snapshot into Preview, Company, Freight &amp;
                      Packing, Product, and Product List (read-only).
                    </p>
                    {snapshotsLoading ? (
                      <div className="text-center py-4">
                        <Spinner />
                      </div>
                    ) : snapshotsError ? (
                      <p className="text-danger mb-0">{snapshotsError}</p>
                    ) : quotationSnapshots.length === 0 ? (
                      <p className="text-muted mb-0">
                        No snapshots yet. Mark the quotation as HOD Approved to
                        create the first snapshot.
                      </p>
                    ) : (
                      <Table className="align-middle table-bordered table-hover">
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col">Snapshot code</TableHead>
                            <TableHead scope="col">Captured</TableHead>
                            <TableHead
                              scope="col"
                              className="text-center"
                              style={{ width: 96 }}
                            >
                              Restore
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quotationSnapshots.map((row) => (
                            <TableRow key={row._id}>
                              <TableCell className="fw-semibold text-break">
                                {row.snapshotCode}
                              </TableCell>
                              <TableCell>
                                {row.createdAt
                                  ? formatIstDisplayDateTime(row.createdAt)
                                  : "–"}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="p-1"
                                  title="Show this snapshot in all tabs"
                                  onClick={() => {
                                    setSnapshotPreview({
                                      _id: row._id,
                                      snapshotCode: row.snapshotCode,
                                      payload: row.payload,
                                      capturedAt: row.createdAt,
                                    });
                                    setActiveTab("preview");
                                    toastSuccess(`Showing ${row.snapshotCode}`);
                                  }}
                                >
                                  <Undo2 className="h-5 w-5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ) : null}
          </CardContent>
        </Tabs>
      </Card>
      <QuoteLogsSidebar
        refreshKey={quoteLogsRefreshKey}
        isOpen={quoteLogsOpen}
        onToggle={() => setQuoteLogsOpen((prev) => !prev)}
        showFloatingToggle={false}
      />

      <Dialog
        open={convertPoModalVisible}
        onOpenChange={(o) => {
          if (!o) closeConvertPoModal();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Sales Order?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Do you want to proceed to finalize a sales order from this
            quotation?
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={closeConvertPoModal}
            >
              No
            </Button>
            <Button
              type="button"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={onConvertPoConfirmYes}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignTaskModalVisible}
        onOpenChange={(o) => {
          if (!o) setAssignTaskModalVisible(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-3">
              <Label>Target Rate (₹)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Optional"
                value={assignTaskTargetRate}
                onChange={(e) => setAssignTaskTargetRate(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <Label>Due Date</Label>
              <Input
                type="date"
                placeholder="Optional"
                value={assignTaskDueDate}
                onChange={(e) => setAssignTaskDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAssignTaskModalVisible(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssignTask}
              disabled={assigningTask || !canUpdateQuotation}
            >
              {assigningTask ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={imageGalleryVisible}
        onOpenChange={(o) => {
          if (!o) closeImageGallery();
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Images</DialogTitle>
          </DialogHeader>
          <div
            className="flex items-center justify-center position-relative py-4"
            style={{ minHeight: 320 }}
          >
            {imageGalleryImages.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="position-absolute start-0 top-50 translate-middle-y rounded-circle shadow-sm bg-white"
                  style={{ zIndex: 2, width: 48, height: 48 }}
                  onClick={imageGalleryPrev}
                  aria-label="Previous"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div
                  className="flex-grow-1 flex justify-center items-center mx-5"
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
                <Button
                  type="button"
                  variant="outline"
                  className="position-absolute end-0 top-50 translate-middle-y rounded-circle shadow-sm bg-white"
                  style={{ zIndex: 2, width: 48, height: 48 }}
                  onClick={imageGalleryNext}
                  aria-label="Next"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <span className="me-auto text-muted-foreground text-sm">
              {imageGalleryImages.length > 0
                ? `${imageGalleryIndex + 1} / ${imageGalleryImages.length}`
                : ""}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={closeImageGallery}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={productListAssignModalVisible}
        onOpenChange={(o) => {
          if (!o) setProductListAssignModalVisible(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Task to Selected Products</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-3">
              <Label>Select Purchase Employee *</Label>
              <Select
                value={productListAssignEmployeeId}
                onChange={(e) => setProductListAssignEmployeeId(e.target.value)}
              >
                <option value="">-- Select Employee --</option>
                {purchaseEmployees.map((emp) => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {emp.name || emp.email || "–"}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mb-3">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={productListAssignDueDate}
                onChange={(e) => setProductListAssignDueDate(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground mb-0">
              {productListSelectedIndices().length} product(s) selected. One
              task will be created per product.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setProductListAssignModalVisible(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleProductListAssignTask}
              disabled={
                productListAssigningTask ||
                !productListAssignEmployeeId ||
                !canUpdateQuotation
              }
            >
              {productListAssigningTask ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showProductEditModal}
        onOpenChange={(open) => setShowProductEditModal(open)}
      >
        <DialogContent
          className="max-w-5xl"
          style={{
            width: "min(64rem, calc(100vw - 2rem))",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DialogHeader
            className="flex justify-between items-center"
            style={{ flexShrink: 0, paddingRight: 48 }}
          >
            <DialogTitle style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              Product Details
            </DialogTitle>
            {products.length > 0 && (
              <span className="text-muted small">
                Product {Math.min(productIndex + 1, products.length)} of{" "}
                {products.length}
              </span>
            )}
          </DialogHeader>
          <div
            className="pl-6 pr-4 py-3"
            style={{
              overflowY: "auto",
              flex: "1 1 auto",
              minHeight: 0,
              scrollbarGutter: "stable",
            }}
          >
            {products.length === 0 || !editingProduct ? (
              <p className="text-muted mb-0">No products in this quotation.</p>
            ) : (
              <>
                {isCurrentProductNotAvailable && (
                  <div className="alert alert-warning py-2 px-3 mb-3">
                    This product is marked as not available in Product List.
                    Revoke it there to edit this product again.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-3 items-start">
                  <div className="lg:col-span-4">
                    <div className="mb-3">
                      <Label>Product Name</Label>
                      <Input
                        disabled
                        className="bg-light"
                        value={editingProduct.productName || ""}
                        placeholder="Product name"
                      />
                    </div>
                    <div className="mb-3">
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        value={editingProduct.description || ""}
                        onChange={(e) =>
                          updateFormField("description", e.target.value)
                        }
                        placeholder="Description"
                        disabled={
                          isSnapshotPreview || isCurrentProductNotAvailable
                        }
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-4">
                    <div className="mb-3">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min={0}
                        max={MAX_PRODUCT_QUANTITY}
                        step={1}
                        inputMode="numeric"
                        aria-invalid={!!productQuantityFormErrors.quantity}
                        {...productQuantityInputProps}
                        ref={(element) => {
                          registerProductQuantityInputRef(element);
                          productQuantityInputRef.current = element;
                        }}
                        onChange={(e) => {
                          productQuantityInputProps.onChange(e);
                          updateFormField("quantity", e.target.value);
                        }}
                        placeholder="Quantity"
                        disabled={
                          isSnapshotPreview || isCurrentProductNotAvailable
                        }
                      />
                      {productQuantityFormErrors.quantity && (
                        <div className="text-destructive text-sm mt-1">
                          {productQuantityFormErrors.quantity.message}
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <Label>Unit</Label>
                      <ProductUnitSelect
                        value={editingProduct.unit || ""}
                        onChange={(e) =>
                          updateFormField("unit", e.target.value)
                        }
                        disabled={
                          isSnapshotPreview || isCurrentProductNotAvailable
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <Label>GST %</Label>
                      <GstRateSelect
                        value={resolveGstDisplayValue(
                          editingProduct.gstPercentage,
                        )}
                        onChange={(e) =>
                          updateFormField("gstPercentage", e.target.value)
                        }
                        selectClassName={
                          isGstAboveStandardRate(editingProduct.gstPercentage)
                            ? "border-destructive ring-2 ring-destructive/25"
                            : undefined
                        }
                        disabled={
                          isSnapshotPreview || isCurrentProductNotAvailable
                        }
                      />
                      {isGstAboveStandardRate(editingProduct.gstPercentage) ? (
                        <div className="text-destructive text-sm mt-1">
                          GST is above {DEFAULT_GST_PERCENTAGE}%
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="lg:col-span-4">
                    <div className="mb-3">
                      <Label>HSN Number</Label>
                      <Input
                        disabled
                        className="bg-light"
                        value={editingProduct.hsnNumber || ""}
                        placeholder="HSN Number"
                      />
                    </div>
                    <div className="mb-3">
                      <Label>Model Number</Label>
                      <Input
                        disabled
                        className="bg-light"
                        value={editingProduct.modelNumber || ""}
                        placeholder="Model Number"
                      />
                    </div>
                    <div className="mb-3">
                      <Label>Remark</Label>
                      <Input
                        value={editingProduct.remark || ""}
                        onChange={(e) =>
                          updateFormField("remark", e.target.value)
                        }
                        placeholder="Remark"
                        disabled={
                          isSnapshotPreview || isCurrentProductNotAvailable
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-3">
                  <div className="md:col-span-6">
                    <div className="mb-3">
                      <Label>Sales Rate (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editingProduct.rate ?? ""}
                        onChange={(e) =>
                          updateFormField("rate", e.target.value)
                        }
                        placeholder="Sales rate"
                        disabled={
                          isSnapshotPreview || isCurrentProductNotAvailable
                        }
                      />
                    </div>
                  </div>
                  <div className="md:col-span-6">
                    <div className="mb-3">
                      <Label>
                        Delivery Time{" "}
                        <span className="text-muted small">
                          (internal reference only)
                        </span>
                      </Label>
                      <Input
                        disabled
                        className="bg-light"
                        value={
                          editingProduct.deliveryDate?.select ===
                          DELIVERY_WITHIN_OTHERS
                            ? editingProduct.deliveryDate?.other || "Not set"
                            : editingProduct.deliveryDate?.select || "Not set"
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-1">
                  <div className="md:col-span-12">
                    <Label>
                      Uploaded Images{" "}
                      <span className="text-danger" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    {Array.isArray(editingProduct.images) &&
                    editingProduct.images.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {editingProduct.images.map((img, index) => (
                          <div
                            key={`edit-img-${index}`}
                            className="border rounded overflow-hidden position-relative"
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
                              <img
                                src={getImageUrl(img)}
                                alt=""
                                className="w-100 h-100"
                                style={{ objectFit: "cover" }}
                              />
                            )}
                            {!isSnapshotPreview &&
                            !isCurrentProductNotAvailable ? (
                              <button
                                type="button"
                                aria-label="Remove image"
                                onClick={() => {
                                  setEditingProduct((prev) => {
                                    if (!prev) return prev;
                                    const nextImages = (
                                      prev.images || []
                                    ).filter((_, i) => i !== index);
                                    return { ...prev, images: nextImages };
                                  });
                                }}
                                className="position-absolute flex items-center justify-center"
                                style={{
                                  top: 2,
                                  right: 2,
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  border: "none",
                                  background: "rgba(0,0,0,0.65)",
                                  color: "#fff",
                                  fontSize: 12,
                                  lineHeight: 1,
                                  padding: 0,
                                  cursor: "pointer",
                                }}
                              >
                                ×
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground mb-3">
                        No uploaded image for this product.
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      aria-invalid={!!editingProductImagesError}
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
                    {editingProductImagesError ? (
                      <div className="text-destructive text-sm mt-1">
                        {editingProductImagesError}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground mt-1">
                        Upload additional image(s) or remove one using the ×
                        icon, then click Update to save changes.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter
            className="flex-wrap justify-between"
            style={{ flexShrink: 0 }}
          >
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  updating ||
                  isSnapshotPreview ||
                  uploadingProductImages ||
                  productIndex <= 0
                }
                onClick={() => setProductIndex((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft className="me-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                type="button"
                disabled={
                  updating ||
                  isSnapshotPreview ||
                  uploadingProductImages ||
                  isCurrentProductNotAvailable ||
                  !canUpdateQuotation ||
                  products.length === 0
                }
                onClick={handleUpdateProduct}
              >
                {updating ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
              <Button
                type="button"
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
                <ArrowRight className="ms-1 h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {canUpdateQuotation && isCurrentProductNotAvailable ? (
                <Button
                  type="button"
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={
                    updating || isSnapshotPreview || products.length === 0
                  }
                  onClick={async () => {
                    await handleRevokeNotAvailable(productIndex);
                  }}
                >
                  Revoke
                </Button>
              ) : null}
              {canUpdateQuotation && !isCurrentProductNotAvailable ? (
                <Button
                  type="button"
                  className="bg-amber-500 text-white hover:bg-amber-600"
                  disabled={
                    updating || isSnapshotPreview || products.length === 0
                  }
                  onClick={() => {
                    const idx = productIndex;
                    setNotAvailableModalIndex(idx);
                    const qid = quotation?.id;
                    const fromSaved = products[idx]?.notAvailableRemark || "";
                    const draft = readNotAvailableReasonDraft(qid, idx);
                    setNotAvailableRemark(fromSaved || draft || "");
                    setShowProductEditModal(false);
                    setNotAvailableModalVisible(true);
                  }}
                >
                  Not available
                </Button>
              ) : null}
              {canDeleteQuotationProduct ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    updating || isSnapshotPreview || products.length === 0
                  }
                  onClick={() => {
                    setShowProductEditModal(false);
                    openDeleteProductModal(productIndex);
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteProductModalVisible}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteProductModalVisible(false);
            setDeleteProductIndex(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this product from the quotation?
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDeleteProductModalVisible(false);
                setDeleteProductIndex(null);
              }}
              disabled={updating || isSnapshotPreview}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteProduct}
              disabled={
                updating || isSnapshotPreview || !canDeleteQuotationProduct
              }
            >
              {updating ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={procurementRatesModal.visible}
        onOpenChange={(o) => {
          if (!o && !procurementRatesModal.loading)
            closeProcurementRatesModal();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Procurement Rates</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {procurementRatesModal.loading ? (
              <div className="text-center py-4">
                <Spinner />
                <div className="text-sm text-muted-foreground mt-2">
                  Loading rates...
                </div>
              </div>
            ) : procurementRatesModal.error ? (
              <Alert variant="destructive" className="mb-0">
                <AlertDescription>
                  {procurementRatesModal.error}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-3">
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
                    <div className="text-sm font-semibold mb-2">
                      Product images
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                          <img
                            src={src}
                            alt=""
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
                  <Table className="mb-0 text-sm">
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
                )}
              </>
            )}
          </div>
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

      <Dialog
        open={notAvailableModalVisible}
        onOpenChange={(o) => {
          if (!o) {
            setNotAvailableModalVisible(false);
            setNotAvailableModalIndex(null);
            setNotAvailableRemark("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Product as Not Available</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm mb-2">
              Add a remark for why this product is not available. The product
              will be saved without a rate and you can still create the
              quotation.
            </p>
            <Label>Remark *</Label>
            <Textarea
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setNotAvailableModalVisible(false);
                setNotAvailableModalIndex(null);
                setNotAvailableRemark("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="warning"
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
                  <Spinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                "Save & mark Not available"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddNewProductModal
        open={addProductModalOpen}
        onOpenChange={setAddProductModalOpen}
        onAdd={handleAddDummyProduct}
        queryCode={relatedQueryCode}
      />
    </>
  );
};

export default QuotationView;
