import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Boxes,
  CalendarClock,
  Hash,
  Image as ImageIcon,
  Layers,
  Package,
  Plus,
  Ruler,
  Search,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import proBucketService from "../../services/proBucketService";
import supplierService from "../../services/supplierService";
import localProcurementService from "../../services/localProcurementService";
import areaService from "../../services/areaService";
import usePermissions from "../../hooks/usePermissions";
import { BackButton, GstRateSelect, Loader } from "../../components";
import CategorySuppliersTable, {
  fetchAllSuppliersByCategory,
  DUMMY_CATEGORY_SUPPLIERS,
} from "../../components/CategorySuppliersTable/CategorySuppliersTable";
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
      return <Badge variant="warning">Pending</Badge>;
    case "rate_submitted":
      return <Badge variant="info">Rate submitted</Badge>;
    case "fulfilled":
      return <Badge variant="success">Fulfilled</Badge>;
    default:
      return <Badge variant="secondary">{s || "—"}</Badge>;
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

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <div className="mb-0.5 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="break-words text-sm font-medium text-foreground">
      {children != null && children !== "" ? children : "—"}
    </div>
  </div>
);

/** Compact icon + label + value tile used in the "at a glance" strip. */
const StatTile = ({ icon: Icon, label, value, accent = "primary" }) => {
  const accentMap = {
    primary: "bg-primary/10 text-primary!",
    info: "bg-info/10 text-info!",
    success: "bg-success/10 text-success!",
    warning: "bg-warning/10 text-warning!",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          accentMap[accent] || accentMap.primary,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-base font-semibold text-foreground">
          {value != null && value !== "" ? value : "—"}
        </div>
      </div>
    </div>
  );
};

/** Section shell with an icon-tinted heading for a consistent, polished look. */
const InfoSection = ({ icon: Icon, title, action, children }) => (
  <Card className="mb-4 overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between gap-2 border-b bg-muted/40 py-3">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary!">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </CardTitle>
      {action}
    </CardHeader>
    <CardContent className="pt-4">{children}</CardContent>
  </Card>
);

const ItemInfoSections = ({ item }) => {
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const imageList = Array.isArray(item.images) ? item.images : [];
  const gstText =
    item.gstPercentage != null && item.gstPercentage !== ""
      ? `${item.gstPercentage}%`
      : "—";

  return (
    <div className="pro-bucket-item-info">
      {/* At-a-glance strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile
          icon={Boxes}
          label="Quantity"
          value={
            item.quantity != null && item.quantity !== ""
              ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
              : "—"
          }
          accent="primary"
        />
        <StatTile
          icon={Ruler}
          label="Unit"
          value={dash(item.unit)}
          accent="info"
        />
        <StatTile
          icon={Hash}
          label="HSN"
          value={dash(item.hsnNumber)}
          accent="success"
        />
        <StatTile icon={Tag} label="GST" value={gstText} accent="warning" />
      </div>

      <InfoSection icon={Package} title="Product details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label="Product name">{dash(item.productName)}</Field>
          <Field label="Line #">
            {item.lineIndex != null ? item.lineIndex + 1 : "—"}
          </Field>
          <Field label="Model / part #">{dash(item.modelNumber)}</Field>
          <Field label="Quantity">{dash(item.quantity)}</Field>
          <Field label="Unit">{dash(item.unit)}</Field>
          <Field label="HSN number">{dash(item.hsnNumber)}</Field>
          <Field label="GST %">{gstText}</Field>
          <Field label="Remark" className="sm:col-span-2 md:col-span-3">
            {dash(item.remark)}
          </Field>
          <Field label="Description" className="sm:col-span-2 md:col-span-3">
            {dash(item.description)}
          </Field>
        </div>

        {variants.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <div className="mb-2 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
              Variants ({variants.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {variants.map((v, i) => (
                <span
                  key={v._id || i}
                  className="inline-flex items-center rounded-full border border-border bg-secondary! px-3 py-1 text-sm font-medium text-foreground"
                >
                  {dash(v.variantName)}
                </span>
              ))}
            </div>
          </div>
        )}
      </InfoSection>

      <InfoSection icon={Layers} title="Classification">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-1 flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
              <Boxes className="h-3.5 w-3.5" /> Product group
            </div>
            <div className="text-sm font-semibold text-foreground">
              <RefName refVal={item.groupId} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-1 flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
              <Tag className="h-3.5 w-3.5" /> Category
            </div>
            <div className="text-sm font-semibold text-foreground">
              <RefName refVal={item.categoryId} />
            </div>
          </div>
        </div>
      </InfoSection>

      <InfoSection
        icon={ImageIcon}
        title={`Images${imageList.length ? ` (${imageList.length})` : ""}`}
      >
        {imageList.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {imageList.map((img) => {
              const src = imgSrc(
                typeof img === "object" && img != null
                  ? img.path || img.url
                  : img,
              );
              if (!src) return null;
              return (
                <a
                  key={img._id || src}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-xl border border-border bg-muted/30 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-36 items-center justify-center overflow-hidden bg-background">
                    <img
                      src={src}
                      alt={img.name || "Product"}
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  {img.name && (
                    <div
                      className="truncate border-t border-border px-2 py-1.5 text-xs text-muted-foreground"
                      title={img.name}
                    >
                      {img.name}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No images attached to this product.
            </p>
          </div>
        )}
      </InfoSection>
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
  const [suppliersTabSearch, setSuppliersTabSearch] = useState("");
  const [ratesSearch, setRatesSearch] = useState("");
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
    <div>
      <div>
        <Card className="mb-3">
          <CardContent className="flex items-center justify-between gap-2 py-2">
            <nav className="flex min-w-0 flex-shrink items-center gap-1 overflow-hidden text-sm text-muted-foreground">
              <a href="#/" className="hover:text-foreground">
                Home
              </a>
              <span aria-hidden>/</span>
              <a href="#/pro-bucket" className="hover:text-foreground">
                Pro Bucket
              </a>
              <span aria-hidden>/</span>
              <span className="inline-block max-w-[10rem] truncate text-foreground">
                {item?.productName || "Item"}
              </span>
            </nav>
            <BackButton fallback="/pro-bucket" />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {!loading && item && (
            <div className="relative border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5">
              <div className="flex flex-wrap items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary! shadow-sm">
                  <Package className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold leading-tight text-foreground">
                      {item.productName || "Product line"}
                    </h2>
                    {rateBadge(item.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      Line {item.lineIndex != null ? item.lineIndex + 1 : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      <RefName refVal={item.categoryId} />
                    </span>
                    {item.createdAt && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {dateFormatter(item.createdAt, "—")}
                      </span>
                    )}
                  </div>
                </div>
                {canAssignLocalPro && (
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 shadow-sm"
                    onClick={() => {
                      setSelectedLocalProEmployee("");
                      setSelectedLocalProZone("");
                      setLocalProAssignRemark("");
                      setLocalProBarOpen(true);
                    }}
                  >
                    <User className="h-4 w-4" />
                    Assign Local Pro
                  </Button>
                )}
              </div>
            </div>
          )}
          {loading && (
            <CardHeader className="py-4">
              <span className="text-muted-foreground">Loading…</span>
            </CardHeader>
          )}
          <CardContent>
            {loading ? (
              <Loader />
            ) : !item ? (
              <p className="text-muted-foreground">Item not found.</p>
            ) : (
              <Tabs
                value={String(activeTab)}
                onValueChange={(v) => setActiveTab(Number(v))}
              >
                <div
                  className={
                    isPhoneView
                      ? "sticky top-0 z-[6] mb-3 border-b pb-2"
                      : undefined
                  }
                  style={
                    isPhoneView
                      ? {
                          marginLeft: "-1rem",
                          marginRight: "-1rem",
                          paddingLeft: "1rem",
                          paddingRight: "1rem",
                          marginTop: "-0.5rem",
                          paddingTop: "0.75rem",
                          background: "var(--background)",
                          boxShadow: "0 6px 16px rgba(0, 0, 0, 0.06)",
                        }
                      : undefined
                  }
                >
                  <div
                    className={
                      isPhoneView
                        ? "flex flex-nowrap items-end gap-2"
                        : undefined
                    }
                  >
                    <TabsList
                      className={cn(
                        isPhoneView
                          ? "min-w-0 flex-grow flex-nowrap overflow-x-auto border-b-0"
                          : "mb-3 w-full",
                      )}
                    >
                      <TabsTrigger
                        value={String(TAB_ITEM)}
                        className="flex-shrink-0"
                      >
                        Item info
                      </TabsTrigger>
                      <TabsTrigger
                        value={String(TAB_SUPPLIERS)}
                        className="flex-shrink-0"
                      >
                        Suppliers
                        {productCategoryId && categorySuppliers.length > 0 && (
                          <Badge
                            variant={
                              activeTab === TAB_SUPPLIERS
                                ? "default"
                                : "secondary"
                            }
                            className="px-1.5 py-0 text-[0.65rem]"
                          >
                            {categorySuppliers.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger
                        value={String(TAB_RATES)}
                        className="flex-shrink-0"
                      >
                        Rates
                        {item?.rates?.length > 0 && (
                          <Badge
                            variant={
                              activeTab === TAB_RATES ? "default" : "secondary"
                            }
                            className="px-1.5 py-0 text-[0.65rem]"
                          >
                            {item.rates.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                    {isPhoneView && canAddRate && activeTab === TAB_RATES ? (
                      <Button
                        type="button"
                        size="sm"
                        className="flex-shrink-0 rounded-full shadow-sm"
                        onClick={() => {
                          setRateRows([emptyRow()]);
                          setSupplierSearch("");
                          setRateBarOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add rate</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
                <TabsContent value={String(TAB_ITEM)}>
                  <ItemInfoSections item={item} />
                </TabsContent>
                <TabsContent value={String(TAB_SUPPLIERS)}>
                  {(() => {
                    const hasRealSuppliers = categorySuppliers.length > 0;
                    const showSample =
                      !categorySuppliersLoading && !hasRealSuppliers;
                    const rows = hasRealSuppliers
                      ? categorySuppliers
                      : DUMMY_CATEGORY_SUPPLIERS;
                    return (
                      <>
                        <p className="mb-3 text-sm text-muted-foreground">
                          {productCategoryId ? (
                            <>
                              Suppliers linked to category{" "}
                              <strong>{productCategoryName}</strong> (matched
                              via supplier <code>categories</code>).
                            </>
                          ) : (
                            "No category is assigned to this product — showing sample suppliers below."
                          )}
                        </p>
                        <CategorySuppliersTable
                          suppliers={rows}
                          loading={categorySuppliersLoading}
                          isSample={showSample}
                          search={suppliersTabSearch}
                          onSearchChange={setSuppliersTabSearch}
                          categoryName={
                            typeof item?.categoryId === "object" &&
                            item.categoryId?.name
                              ? String(item.categoryId.name)
                              : ""
                          }
                          navigate={navigate}
                        />
                      </>
                    );
                  })()}
                </TabsContent>
                <TabsContent value={String(TAB_RATES)}>
                  {canAddRate && !isPhoneView && item.rates?.length > 0 && (
                    <Button
                      type="button"
                      className="mb-3"
                      onClick={() => {
                        setRateRows([emptyRow()]);
                        setSupplierSearch("");
                        setRateBarOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add rate
                    </Button>
                  )}

                  {(!item.rates || !item.rates.length) && (
                    <div
                      className="flex flex-col items-center justify-center rounded border border-border bg-muted px-3 py-10 text-center"
                      style={{ minHeight: "12rem" }}
                    >
                      <p className="mb-3 text-muted-foreground">
                        No rates have been submitted yet for this item.
                      </p>
                      {canAddRate && !isPhoneView && (
                        <Button
                          type="button"
                          onClick={() => {
                            setRateRows([emptyRow()]);
                            setSupplierSearch("");
                            setRateBarOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                          Add first rate
                        </Button>
                      )}
                      {canAddRate && isPhoneView && (
                        <p className="text-sm text-muted-foreground">
                          Tap <strong>Add rate</strong> above to submit a rate.
                        </p>
                      )}
                    </div>
                  )}

                  {item.rates?.length > 0 &&
                    (() => {
                      const term = ratesSearch.trim().toLowerCase();
                      const filteredRates = term
                        ? item.rates.filter((r) =>
                            [
                              r.supplier?.name,
                              r.supplier?.shopname,
                              r.supplier?.phone_1,
                              r.unit,
                              r.remark,
                              r.rate,
                              r.gstPercentage,
                              r.discountPercentage,
                            ].some((v) =>
                              String(v ?? "")
                                .toLowerCase()
                                .includes(term),
                            ),
                          )
                        : item.rates;
                      return (
                        <>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="relative w-full max-w-xs">
                              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Search rates by supplier, unit, remark…"
                                value={ratesSearch}
                                onChange={(e) => setRatesSearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                            <span className="px-1 text-sm text-muted-foreground">
                              {filteredRates.length} of {item.rates.length}
                            </span>
                          </div>
                          {filteredRates.length === 0 ? (
                            <p className="rounded border border-border bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
                              No rates match “{ratesSearch}”.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {filteredRates.map((r) => {
                                const finalAmount =
                                  resolveProBucketEffectiveRate(r);
                                return (
                                  <Card
                                    key={r._id || `${r.submittedAt}-${r.rate}`}
                                  >
                                    <CardContent className="py-3">
                                      <div className="mb-2 flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div
                                            className="truncate font-semibold"
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
                                            <div className="text-sm text-muted-foreground">
                                              {r.supplier.phone_1}
                                            </div>
                                          )}
                                        </div>
                                        <div className="whitespace-nowrap text-[1.15rem] font-bold text-primary!">
                                          ₹{" "}
                                          {formatProBucketRateAmount(
                                            finalAmount,
                                          )}
                                        </div>
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-2 text-sm text-muted-foreground">
                                        <span>
                                          <span className="mr-1">
                                            Base rate:
                                          </span>
                                          <span className="text-foreground">
                                            ₹{" "}
                                            {formatProBucketRateAmount(r.rate)}
                                          </span>
                                        </span>
                                        <span>
                                          <span className="mr-1">GST %:</span>
                                          <span className="text-foreground">
                                            {r.gstPercentage != null
                                              ? r.gstPercentage
                                              : 0}
                                          </span>
                                        </span>
                                        <span>
                                          <span className="mr-1">
                                            Discount %:
                                          </span>
                                          <span className="text-foreground">
                                            {r.discountPercentage != null
                                              ? r.discountPercentage
                                              : 0}
                                          </span>
                                        </span>
                                        <span>
                                          <span className="mr-1">Unit:</span>
                                          <span className="text-foreground">
                                            {r.unit || "—"}
                                          </span>
                                        </span>
                                        {r.remark && (
                                          <span>
                                            <span className="mr-1">
                                              Remark:
                                            </span>
                                            <span className="text-foreground">
                                              {r.remark}
                                            </span>
                                          </span>
                                        )}
                                        {r.submittedAt && (
                                          <span className="ml-auto whitespace-nowrap">
                                            {dateFormatter(r.submittedAt, "—")}
                                          </span>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={rateBarOpen}
        onOpenChange={(o) => {
          if (!o) closeRateBar();
        }}
      >
        <DialogContent
          showClose={!saving}
          onInteractOutside={(e) => {
            if (saving) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (saving) e.preventDefault();
          }}
          className="max-w-2xl"
          aria-label="Add rates"
        >
          <DialogHeader className="gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary!">
              <Plus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Add Rate</DialogTitle>
              <DialogDescription className="truncate" title={item?.productName}>
                {item?.productName || "Submit supplier rates for this item"}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <Label
                className="mb-1.5 block"
                htmlFor="pro-bucket-supplier-search"
              >
                Search suppliers
              </Label>
              <Input
                id="pro-bucket-supplier-search"
                placeholder="Name, shop, phone, email, GST…"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
              />
              {supplierSearch.trim() && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {suppliers.length} supplier
                  {suppliers.length !== 1 ? "s" : ""} match this search (up to
                  100). Clear the field to load the full list.
                </p>
              )}
            </div>

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
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary!">
                        {idx + 1}
                      </span>
                      Rate entry
                    </span>
                    {rateRows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeRateRow(idx)}
                        aria-label="Remove this entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label className="mb-1 block">
                          Supplier <span className="text-destructive">*</span>
                        </Label>
                        <Select
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
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1 block">
                          Rate <span className="text-destructive">*</span>
                        </Label>
                        <Input
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
                      </div>
                      <div>
                        <Label className="mb-1 block">Unit</Label>
                        <ProductUnitSelect
                          value={row.unit}
                          onChange={(e) =>
                            updateRateRow(idx, "unit", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block">GST %</Label>
                        <GstRateSelect
                          value={row.gstPercentage}
                          onChange={(e) =>
                            updateRateRow(
                              idx,
                              "gstPercentage",
                              sanitizeRateInput(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block">Discount %</Label>
                        <Input
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
                      </div>
                      <div>
                        <Label className="mb-1 block">Final amount</Label>
                        <div className="flex h-9 items-center rounded-md border border-primary/30 bg-primary/5 px-3 text-sm font-bold text-primary!">
                          ₹{" "}
                          {finalAmountPreview != null
                            ? formatProBucketRateAmount(finalAmountPreview)
                            : "—"}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Label className="mb-1 block">Remark</Label>
                        <Input
                          placeholder="Optional note…"
                          value={row.remark}
                          onChange={(e) =>
                            updateRateRow(idx, "remark", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRateRow}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4" />
              Add another entry
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeRateBar}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitRates} disabled={saving}>
              {saving ? "Saving…" : "Save rates"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={localProBarOpen}
        onOpenChange={(o) => {
          if (!o) closeLocalProBar();
        }}
      >
        <DialogContent
          showClose={!assigningLocalPro}
          onInteractOutside={(e) => {
            if (assigningLocalPro) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (assigningLocalPro) e.preventDefault();
          }}
          className="max-w-md"
          aria-label="Assign local procurement"
        >
          <DialogHeader className="gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary!">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Assign Local Pro</DialogTitle>
              <DialogDescription className="truncate" title={item?.productName}>
                {item?.productName || "Assign this item to a local buyer"}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {localProEmployeesLoading || marketZonesLoading ? (
              <Loader message="Loading form…" />
            ) : localProEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <User className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No employees with the local procurement role were found.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="local-pro-employee" className="mb-1.5 block">
                    Local procurement employee{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    id="local-pro-employee"
                    value={selectedLocalProEmployee}
                    onChange={(e) =>
                      setSelectedLocalProEmployee(e.target.value)
                    }
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
                  </Select>
                </div>

                <div>
                  <Label htmlFor="local-pro-zone" className="mb-1.5 block">
                    Zone{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    id="local-pro-zone"
                    value={selectedLocalProZone}
                    onChange={(e) => setSelectedLocalProZone(e.target.value)}
                  >
                    <option value="">— Select zone —</option>
                    {marketZones.map((zone) => (
                      <option key={zone.id} value={String(zone.id)}>
                        {formatProcurementZone(zone)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="local-pro-remark" className="mb-1.5 block">
                    Remark
                  </Label>
                  <Textarea
                    id="local-pro-remark"
                    rows={3}
                    placeholder="Optional note for the assignee…"
                    value={localProAssignRemark}
                    onChange={(e) => setLocalProAssignRemark(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeLocalProBar}
              disabled={assigningLocalPro}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitLocalProAssignment}
              disabled={
                assigningLocalPro ||
                localProEmployeesLoading ||
                marketZonesLoading ||
                !selectedLocalProEmployee
              }
            >
              <User className="h-4 w-4" />
              {assigningLocalPro ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProBucketDetail;
