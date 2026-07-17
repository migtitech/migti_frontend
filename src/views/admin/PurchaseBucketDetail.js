import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  AlertTriangle,
  FileText,
  User,
} from "lucide-react";
import purchaseBucketService from "../../services/purchaseBucketService";
import localPurchaseService from "../../services/localPurchaseService";
import areaService from "../../services/areaService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader, PageHeader } from "../../components";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Alert,
  AlertDescription,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  Label,
  Input,
  Textarea,
  Select,
  Spinner,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import usePermissions from "../../hooks/usePermissions";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";
import {
  formatProBucketRateAmount,
  resolveProBucketEffectiveRate,
} from "../../utils/proBucketRate";

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
  high: { label: "High", variant: "destructive" },
  medium: { label: "Medium", variant: "warning" },
  low: { label: "Low", variant: "success" },
};

const PriorityBadge = ({ priority }) => {
  const raw =
    priority != null && String(priority).trim() !== ""
      ? String(priority).trim().toLowerCase()
      : "medium";
  const cfg = PRIORITY_CONFIG[raw] || {
    label: raw.charAt(0).toUpperCase() + raw.slice(1),
    variant: "secondary",
  };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

const DetailRow = ({ label, value, mono, fullWidth }) => (
  <div className={cn("mb-1", fullWidth && "sm:col-span-2 lg:col-span-3")}>
    <div className="mb-1 text-xs text-muted-foreground">{label}</div>
    <div
      className={cn("font-semibold", mono && "font-mono")}
      style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
    >
      {value || "—"}
    </div>
  </div>
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

// Small reusable section-card header label
const SectionLabel = ({ children }) => (
  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {children}
  </span>
);

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
      <Card>
        <CardContent className="py-16 text-center">
          <Loader />
        </CardContent>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-10">
          <p className="text-muted-foreground">
            Item not found or you do not have access.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/purchase-bucket")}
          >
            Back
          </Button>
        </CardContent>
      </Card>
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
    <div>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/purchase-bucket")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase Bucket
        </Button>
      </div>

      <PageHeader
        title={displayProductName || "Line item"}
        description={
          item.poCode ? (
            <Badge variant="secondary" className="font-mono">
              {item.poCode}
            </Badge>
          ) : undefined
        }
        actions={
          <>
            <StatusPill status={lineStatus} />
            {item.priority && <PriorityBadge priority={item.priority} />}
            {showRaiseBillingRequest && (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  navigate(
                    `/purchase-bucket/raise-billing-request?poProductId=${id}`,
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Raise Billing Request
              </Button>
            )}
            {canAssignPurchase && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAssignBar}
              >
                <User className="h-4 w-4" />
                Assign Purchase
              </Button>
            )}
            {canRaise && lineStatus === "finance_approved" && (
              <Button
                type="button"
                variant="success"
                size="sm"
                disabled={markingPurchased}
                onClick={markAsPurchased}
              >
                {markingPurchased ? (
                  <>
                    <Spinner size="sm" />
                    Updating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Purchased
                  </>
                )}
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {displayQuantity != null && (
              <div>
                <div className="text-xs text-muted-foreground">Qty</div>
                <div className="font-semibold">
                  {displayQuantity}
                  {displayUnit ? ` ${displayUnit}` : ""}
                </div>
              </div>
            )}
            {item.dispatchmentDate && (
              <div>
                <div className="text-xs text-muted-foreground">Dispatch</div>
                <div className="font-semibold">
                  {dateFormatter(item.dispatchmentDate, "—")}
                </div>
              </div>
            )}
            {item.targetRate != null && (
              <div>
                <div className="text-xs text-muted-foreground">Target Rate</div>
                <div className="font-semibold">
                  ₹{Number(item.targetRate).toLocaleString("en-IN")}
                </div>
              </div>
            )}
            {displayProductCode && (
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">
                  Product code
                </div>
                <div className="font-mono font-semibold text-primary!">
                  {displayProductCode}
                </div>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="rates">
                Supplier Rates
                {ratesToShow.length > 0 && (
                  <Badge
                    variant={activeTab === "rates" ? "default" : "secondary"}
                    className="text-[0.65rem]"
                  >
                    {ratesToShow.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              {item.queryRatesMatchNote === "missing_rawProductCode" && (
                <Alert variant="warning" className="mb-3">
                  <AlertDescription>
                    This Sales Order line has no raw product code — query
                    product details cannot be matched.
                  </AlertDescription>
                </Alert>
              )}
              {item.queryRatesMatchNote === "no_query_product" &&
                displayProductCode && (
                  <Alert variant="warning" className="mb-3">
                    <AlertDescription>
                      No query product found for code{" "}
                      <code>{displayProductCode}</code>.
                    </AlertDescription>
                  </Alert>
                )}

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {hasQueryMedia && (
                  <div className="lg:col-span-1">
                    <Card className="mb-0 h-full">
                      <CardHeader className="px-4 py-3">
                        <SectionLabel>Query Product Images</SectionLabel>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        {queryImagePreviews.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {queryImagePreviews.map(({ doc, url }, i) => (
                              <a
                                key={
                                  doc._id != null ? String(doc._id) : `img-${i}`
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
                            className="mt-2 flex items-center gap-2 text-primary! no-underline hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                            {doc.originalName || doc.name || "Open attachment"}
                          </a>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div
                  className={hasQueryMedia ? "lg:col-span-2" : "lg:col-span-3"}
                >
                  <Card className="mb-0 h-full">
                    <CardHeader className="flex flex-row flex-wrap items-center gap-2 px-4 py-3">
                      <SectionLabel>Query Product Details</SectionLabel>
                      {queryProduct?.proBucketStatus && (
                        <Badge variant="info">
                          {String(queryProduct.proBucketStatus).replace(
                            /_/g,
                            " ",
                          )}
                        </Badge>
                      )}
                      {queryProduct?.queryCode && (
                        <code className="text-sm">
                          {queryProduct.queryCode}
                        </code>
                      )}
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      {!queryProduct ? (
                        <p className="mb-0 text-muted-foreground">
                          No matched query product data available.
                        </p>
                      ) : queryProductDetailFields.length === 0 &&
                        queryVariants.length === 0 ? (
                        <p className="mb-0 text-muted-foreground">
                          Query product matched but no detail fields are stored.
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
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
                          </div>
                          {queryVariants.length > 0 && (
                            <div className="mt-2 border-t border-border pt-2">
                              <div className="mb-2 text-xs text-muted-foreground">
                                Variants
                              </div>
                              <ul className="mb-0 list-disc pl-5 text-sm">
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
                    </CardContent>
                  </Card>
                </div>

                {!catalogProduct && (
                  <div className="lg:col-span-3">
                    <Alert variant="default" className="mb-0">
                      <AlertDescription>
                        {item.product_id
                          ? "Linked catalog product could not be loaded."
                          : "No linked catalog product on this Sales Order line."}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {catalogProduct && (
                  <>
                    {hasCatalogMedia && (
                      <div className="lg:col-span-1">
                        <Card className="mb-0 h-full">
                          <CardHeader className="px-4 py-3">
                            <SectionLabel>Catalog Product Images</SectionLabel>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 pt-0">
                            {catalogImagePreviews.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-2">
                                {catalogImagePreviews.map(({ doc, url }, i) => (
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
                                ))}
                              </div>
                            )}
                            {catalogNonImageDocs.map((doc, i) => (
                              <a
                                key={doc._id ?? `cat-ndoc-${i}`}
                                href={resolveUrl(doc.path)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 flex items-center gap-2 text-primary! no-underline hover:underline"
                              >
                                <FileText className="h-4 w-4" />
                                {doc.originalName ||
                                  doc.name ||
                                  "Open attachment"}
                              </a>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    <div
                      className={
                        hasCatalogMedia ? "lg:col-span-2" : "lg:col-span-3"
                      }
                    >
                      <Card className="mb-0 h-full">
                        <CardHeader className="flex flex-row flex-wrap items-center gap-2 px-4 py-3">
                          <SectionLabel>Catalog Product Details</SectionLabel>
                          {catalogProduct.status && (
                            <Badge variant="secondary">
                              {String(catalogProduct.status).replace(/_/g, " ")}
                            </Badge>
                          )}
                          {catalogProduct.sku && (
                            <code className="text-sm">
                              {catalogProduct.sku}
                            </code>
                          )}
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0">
                          {catalogProductDetailFields.length === 0 &&
                          catalogVariantTypes.length === 0 &&
                          catalogVariantCombinations.length === 0 ? (
                            <p className="mb-0 text-muted-foreground">
                              Linked catalog product has no stored detail
                              fields.
                            </p>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
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
                              </div>

                              {catalogVariantTypes.length > 0 && (
                                <div className="mt-2 border-t border-border pt-2">
                                  <div className="mb-2 text-xs text-muted-foreground">
                                    Variant types
                                  </div>
                                  <div className="rounded-lg border border-border">
                                    <Table className="text-sm">
                                      <TableBody>
                                        {catalogVariantTypes.map(
                                          (variant, index) => (
                                            <TableRow
                                              key={variant.name || index}
                                            >
                                              <TableCell
                                                className="font-medium"
                                                style={{ width: "30%" }}
                                              >
                                                {variant.name || "—"}
                                              </TableCell>
                                              <TableCell>
                                                {(variant.options || []).map(
                                                  (option, optionIndex) => (
                                                    <Badge
                                                      key={`${option}-${optionIndex}`}
                                                      className="mb-1 mr-1"
                                                    >
                                                      {option}
                                                    </Badge>
                                                  ),
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ),
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}

                              {catalogVariantCombinations.length > 0 && (
                                <div className="mt-3 border-t border-border pt-2">
                                  <div className="mb-2 text-xs text-muted-foreground">
                                    Variant combinations
                                  </div>
                                  <div className="rounded-lg border border-border">
                                    <Table className="text-sm">
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Variant</TableHead>
                                          <TableHead>SKU</TableHead>
                                          <TableHead>Code</TableHead>
                                          <TableHead>HSN</TableHead>
                                          <TableHead>Model</TableHead>
                                          <TableHead>Price</TableHead>
                                          <TableHead>Images</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {catalogVariantCombinations.map(
                                          (variantRow, index) => {
                                            const variantImages = (
                                              variantRow.images || []
                                            ).filter(isImagePath);
                                            return (
                                              <TableRow
                                                key={
                                                  variantRow._id ||
                                                  variantRow.uniqueId ||
                                                  index
                                                }
                                              >
                                                <TableCell>
                                                  {formatVariantOptionValues(
                                                    variantRow.optionValues,
                                                  )}
                                                </TableCell>
                                                <TableCell className="font-mono">
                                                  {variantRow.variantCode ||
                                                    "—"}
                                                </TableCell>
                                                <TableCell className="font-mono">
                                                  {variantRow.variantCode ||
                                                    "—"}
                                                </TableCell>
                                                <TableCell className="font-mono">
                                                  {variantRow.hsnNumber || "—"}
                                                </TableCell>
                                                <TableCell>
                                                  {variantRow.modelNumber ||
                                                    "—"}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCurrency(
                                                    variantRow.price,
                                                  ) || "—"}
                                                </TableCell>
                                                <TableCell>
                                                  {variantImages.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
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
                                                </TableCell>
                                              </TableRow>
                                            );
                                          },
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {item.paymentRequestBillDocumentId?.path && (
                  <div className="lg:col-span-3">
                    <Card className="mb-0 border-primary/20 bg-accent">
                      <CardContent className="py-3">
                        <div className="mb-2 font-semibold text-primary!">
                          Payment Request Bill
                        </div>
                        <a
                          href={resolveUrl(
                            item.paymentRequestBillDocumentId.path,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-primary! no-underline hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {item.paymentRequestBillDocumentId.originalName ||
                            "Open bill"}
                        </a>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {br && (
                  <div className="lg:col-span-3">
                    <Card className="mb-0">
                      <CardHeader className="flex flex-row flex-wrap items-center gap-2 px-4 py-3">
                        <SectionLabel>Purchase Billing Request</SectionLabel>
                        <Badge
                          variant={
                            br.status === "finance_approved"
                              ? "success"
                              : br.status === "rejected"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {String(br.status || "pending")}
                        </Badge>
                        {br.uniqueId && (
                          <code className="text-sm">{br.uniqueId}</code>
                        )}
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {br.amount != null && (
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Amount
                              </div>
                              <div className="font-bold">
                                ₹{Number(br.amount).toLocaleString("en-IN")}
                              </div>
                            </div>
                          )}
                          {(br.createdBySnapshot?.name ||
                            br.createdBy?.name) && (
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Submitted by
                              </div>
                              <div className="font-semibold">
                                {br.createdBySnapshot?.name ||
                                  br.createdBy?.name}
                              </div>
                            </div>
                          )}
                          {(br.approvedBySnapshot?.name ||
                            br.approvedBy?.name) && (
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Approved by
                              </div>
                              <div className="font-semibold">
                                {br.approvedBySnapshot?.name ||
                                  br.approvedBy?.name}
                              </div>
                              {br.approvedAt && (
                                <div className="text-xs text-muted-foreground">
                                  {dateTimeFormatter(br.approvedAt, "—")}
                                </div>
                              )}
                            </div>
                          )}
                          {br.statusRemark && (
                            <div className="sm:col-span-2 md:col-span-3 lg:col-span-4">
                              <div className="text-xs text-muted-foreground">
                                Financier remark
                              </div>
                              <div>{br.statusRemark}</div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {br.billDocumentId?.path && (
                            <Button
                              asChild
                              type="button"
                              variant="outline"
                              size="sm"
                            >
                              <a
                                href={resolveUrl(br.billDocumentId.path)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <FileText className="h-4 w-4" />
                                {br.billDocumentId.originalName || "View Bill"}
                              </a>
                            </Button>
                          )}
                          {br.proofDocumentId?.path && (
                            <Button
                              asChild
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-success!"
                            >
                              <a
                                href={resolveUrl(br.proofDocumentId.path)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {br.proofDocumentId.originalName ||
                                  "View Payment Proof"}
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="lg:col-span-3">
                  <Card className="mb-0">
                    <CardHeader className="px-4 py-3">
                      <SectionLabel>Local Purchase Assignments</SectionLabel>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      {localPurchasesLoading ? (
                        <Loader message="Loading assignments…" />
                      ) : localPurchases.length === 0 ? (
                        <p className="mb-0 text-muted-foreground">
                          No local purchase assignments yet.
                        </p>
                      ) : (
                        <div className="rounded-lg border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Zone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Remark</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Assigned on</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {localPurchases.map((row) => {
                                const emp =
                                  row.employeeId &&
                                  typeof row.employeeId === "object"
                                    ? row.employeeId
                                    : null;
                                return (
                                  <TableRow key={row._id}>
                                    <TableCell>
                                      {emp?.name || emp?.email || "—"}
                                    </TableCell>
                                    <TableCell>
                                      {[emp?.designation, emp?.role]
                                        .filter(Boolean)
                                        .join(" · ") || "—"}
                                    </TableCell>
                                    <TableCell>
                                      {formatLocalPurchaseZone(row.zoneId)}
                                    </TableCell>
                                    <TableCell>
                                      {String(row.status || "pending")}
                                    </TableCell>
                                    <TableCell>
                                      {row.remark ||
                                        row.assignmentRemark ||
                                        "—"}
                                    </TableCell>
                                    <TableCell>
                                      {row.locationLink ? (
                                        <a
                                          href={row.locationLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-block max-w-[180px] truncate text-primary! hover:underline"
                                        >
                                          Link
                                        </a>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {dateTimeFormatter(row.createdAt, "—")}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rates">
              {item.queryRatesMatchNote === "missing_rawProductCode" && (
                <p className="mb-0 py-4 text-center text-muted-foreground">
                  This Sales Order line has no raw product code — rates cannot
                  be matched.
                </p>
              )}
              {item.queryRatesMatchNote === "no_query_product" &&
                item.rawProductCode && (
                  <p className="mb-0 py-4 text-center text-muted-foreground">
                    No query product found for code{" "}
                    <code>{item.rawProductCode}</code>.
                  </p>
                )}

              {item.queryProductMatch && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted p-2 text-sm">
                  <span className="text-muted-foreground">
                    Matched query line
                  </span>
                  <strong>#{item.queryProductMatch.lineIndex}</strong>
                  {item.queryProductMatch.queryCode && (
                    <code className="text-sm">
                      {item.queryProductMatch.queryCode}
                    </code>
                  )}
                  {item.queryProductMatch.proBucketStatus && (
                    <Badge variant="info">
                      Pro: {item.queryProductMatch.proBucketStatus}
                    </Badge>
                  )}
                </div>
              )}

              {ratesToShow.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-10 text-center text-muted-foreground">
                  No supplier rates yet
                </div>
              ) : (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ minWidth: 160 }}>
                          Supplier
                        </TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead style={{ width: 120 }}>Base rate</TableHead>
                        <TableHead style={{ width: 80 }}>GST %</TableHead>
                        <TableHead style={{ width: 90 }}>Discount %</TableHead>
                        <TableHead style={{ width: 120 }}>
                          Final amount
                        </TableHead>
                        <TableHead style={{ width: 80 }}>Unit</TableHead>
                        <TableHead>Remark</TableHead>
                        <TableHead>Submitted by</TableHead>
                        <TableHead style={{ width: 140 }}>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ratesToShow.map((r, idx) => {
                        const extras = supplierExtra(r.supplier);
                        return (
                          <TableRow key={r._id != null ? String(r._id) : idx}>
                            <TableCell className="font-semibold">
                              {supplierLabel(r.supplier)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {extras.length > 0 ? extras.join(" · ") : "—"}
                            </TableCell>
                            <TableCell>
                              {r.rate != null
                                ? `₹${Number(r.rate).toLocaleString("en-IN")}`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {r.gstPercentage != null ? r.gstPercentage : 0}
                            </TableCell>
                            <TableCell>
                              {r.discountPercentage != null
                                ? r.discountPercentage
                                : 0}
                            </TableCell>
                            <TableCell className="font-bold text-primary!">
                              {r.finalAmount != null
                                ? `₹${formatProBucketRateAmount(r.finalAmount)}`
                                : resolveProBucketEffectiveRate(r) != null
                                  ? `₹${formatProBucketRateAmount(
                                      resolveProBucketEffectiveRate(r),
                                    )}`
                                  : "—"}
                            </TableCell>
                            <TableCell>{r.unit || "—"}</TableCell>
                            <TableCell>{r.remark || "—"}</TableCell>
                            <TableCell>{r.submittedBy?.name || "—"}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {r.submittedAt
                                ? dateTimeFormatter(r.submittedAt, "—")
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {lineStatus === "billing_request_rejected" && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-destructive" />
                  <span className="text-destructive">
                    This line&apos;s billing request was rejected. Please
                    resubmit using Raise Billing Request.
                  </span>
                  {showRaiseBillingRequest && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="ml-auto shrink-0"
                      onClick={() =>
                        navigate(
                          `/purchase-bucket/raise-billing-request?poProductId=${id}`,
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Resubmit
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Sheet
        open={assignBarOpen}
        onOpenChange={(open) => {
          if (!open) closeAssignBar();
        }}
      >
        <SheetContent side="right" className="w-[min(28rem,100%)] max-w-md">
          <SheetHeader>
            <SheetTitle>Assign Purchase</SheetTitle>
            {item?.productName && (
              <SheetDescription className="truncate" title={item.productName}>
                {item.productName}
              </SheetDescription>
            )}
          </SheetHeader>

          <SheetBody>
            {localPurchaseEmployeesLoading || marketZonesLoading ? (
              <Loader message="Loading form…" />
            ) : localPurchaseEmployeeOptions.length === 0 ? (
              <p className="mb-0 text-muted-foreground">
                No employees with the local purchase role were found.
              </p>
            ) : marketZoneOptions.length === 0 ? (
              <p className="mb-0 text-muted-foreground">
                No market zones were found.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="local-purchase-employee">
                    Local purchase employee
                  </Label>
                  <Select
                    id="local-purchase-employee"
                    value={selectedLocalPurchaseEmployee}
                    onChange={(e) =>
                      setSelectedLocalPurchaseEmployee(e.target.value)
                    }
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
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="local-purchase-zone">Zone</Label>
                  <Select
                    id="local-purchase-zone"
                    value={selectedMarketZone}
                    onChange={(e) => setSelectedMarketZone(e.target.value)}
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
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="local-purchase-remark">Remark</Label>
                  <Textarea
                    id="local-purchase-remark"
                    rows={3}
                    placeholder="Optional note for the assignee…"
                    value={assignRemark}
                    onChange={(e) => setAssignRemark(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="local-purchase-location">Location link</Label>
                  <Input
                    id="local-purchase-location"
                    type="url"
                    value={assignLocationLink}
                    onChange={(e) => setAssignLocationLink(e.target.value)}
                    placeholder="https://maps.google.com/…"
                  />
                </div>
              </div>
            )}
          </SheetBody>

          <SheetFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeAssignBar}
              disabled={assigningPurchase}
            >
              Cancel
            </Button>
            <Button
              type="button"
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
                  <Spinner size="sm" />
                  Assigning…
                </>
              ) : (
                "Assign Purchase"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PurchaseBucketDetail;
