import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, User, X } from "lucide-react";
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
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
      <p className="text-muted-foreground">
        No suppliers are linked to
        {categoryName ? ` "${categoryName}"` : " this category"}.
      </p>
    );
  }
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Shop</TableHead>
            <TableHead>Phone 1</TableHead>
            <TableHead>Phone 2</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Other contact</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>GST</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Remark</TableHead>
            <TableHead>View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s, index) => (
            <TableRow
              key={s._id}
              className="cursor-pointer"
              onClick={() => navigate(`/suppliers/${s._id}`)}
            >
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <strong>{dash(s.name)}</strong>
              </TableCell>
              <TableCell>{dash(s.shopname)}</TableCell>
              <TableCell>{dash(s.phone_1)}</TableCell>
              <TableCell>{dash(s.phone_2)}</TableCell>
              <TableCell>{dash(s.email)}</TableCell>
              <TableCell>{dash(s.other_contact)}</TableCell>
              <TableCell>{dash(s.label)}</TableCell>
              <TableCell>{dash(s.shop_location)}</TableCell>
              <TableCell>{dash(s.gst)}</TableCell>
              <TableCell className="max-w-[14rem] break-words">
                {dash(s.address)}
              </TableCell>
              <TableCell className="max-w-[12rem] break-words">
                {dash(s.remark)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="View supplier"
                  onClick={() => navigate(`/suppliers/${s._id}`)}
                >
                  <EyeIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <div className="text-[0.7rem] uppercase text-muted-foreground">{label}</div>
    <div className="break-words text-sm text-foreground">
      {children != null && children !== "" ? children : "—"}
    </div>
  </div>
);

const ItemInfoSections = ({ item }) => {
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const imageList = Array.isArray(item.images) ? item.images : [];

  return (
    <div className="pro-bucket-item-info">
      <Card className="mb-3 border-0 bg-muted">
        <CardContent className="pt-6">
          <h4 className="mb-1 text-base font-semibold">
            {dash(item.productName) || "Product line"}
          </h4>
          <p className="text-sm text-muted-foreground">
            Line {item.lineIndex != null ? item.lineIndex + 1 : "—"}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Product and quantity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Field label="Quantity">{dash(item.quantity)}</Field>
            <Field label="Unit">{dash(item.unit)}</Field>
            <Field label="HSN">{dash(item.hsnNumber)}</Field>
            <Field label="Model / part #">{dash(item.modelNumber)}</Field>
            <Field label="GST %">
              {item.gstPercentage != null && item.gstPercentage !== ""
                ? `${item.gstPercentage}`
                : "—"}
            </Field>
            <Field label="Remark" className="sm:col-span-2 md:col-span-4">
              {dash(item.remark)}
            </Field>
            <Field label="Description" className="sm:col-span-2 md:col-span-4">
              {dash(item.description)}
            </Field>
            {variants.length > 0 && (
              <div className="sm:col-span-2 md:col-span-4">
                <div className="mb-1 text-[0.7rem] uppercase text-muted-foreground">
                  Variants
                </div>
                <ul className="list-disc pl-5 text-sm text-foreground">
                  {variants.map((v, i) => (
                    <li key={v._id || i}>{dash(v.variantName)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Classification and links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Product group">
              <RefName refVal={item.groupId} />
            </Field>
            <Field label="Category">
              <RefName refVal={item.categoryId} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {imageList.length > 0 && (
        <Card className="mb-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {imageList.map((img) => {
                const src = imgSrc(
                  typeof img === "object" && img != null
                    ? img.path || img.url
                    : img,
                );
                if (!src) return null;
                return (
                  <div key={img._id || src}>
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <img
                        src={src}
                        alt={img.name || "Product"}
                        className="w-full rounded border border-border"
                        style={{ maxHeight: 180, objectFit: "contain" }}
                      />
                    </a>
                    {img.name && (
                      <div
                        className="mt-1 truncate text-sm text-muted-foreground"
                        title={img.name}
                      >
                        {img.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              onClick={() => navigate("/pro-bucket")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center gap-2 py-4">
            {loading && <span className="text-muted-foreground">Loading…</span>}
            {!loading && item && (
              <>
                {item.productName && (
                  <strong className="mr-1">{item.productName}</strong>
                )}
                {rateBadge(item.status)}
                {canAssignLocalPro && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto"
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
              </>
            )}
          </CardHeader>
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
                  {!productCategoryId ? (
                    <p className="text-muted-foreground">
                      No category is assigned to this product, so suppliers
                      cannot be listed by category.
                    </p>
                  ) : (
                    <>
                      <p className="mb-3 text-sm text-muted-foreground">
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

                  {item.rates?.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {(item.rates || []).map((r) => {
                        const finalAmount = resolveProBucketEffectiveRate(r);
                        return (
                          <Card key={r._id || `${r.submittedAt}-${r.rate}`}>
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
                                  ₹ {formatProBucketRateAmount(finalAmount)}
                                </div>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-2 text-sm text-muted-foreground">
                                <span>
                                  <span className="mr-1">Base rate:</span>
                                  <span className="text-foreground">
                                    ₹ {formatProBucketRateAmount(r.rate)}
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
                                  <span className="mr-1">Discount %:</span>
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
                                    <span className="mr-1">Remark:</span>
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
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={rateBarOpen}
        onOpenChange={(o) => {
          if (!o) closeRateBar();
        }}
      >
        <SheetContent
          side={isPhoneView ? "bottom" : "right"}
          showClose={false}
          onInteractOutside={(e) => {
            if (saving) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (saving) e.preventDefault();
          }}
          className={cn(
            "gap-0 p-0",
            isPhoneView
              ? "max-h-[90vh] rounded-t-2xl"
              : "w-[min(28rem,100%)] sm:max-w-none",
          )}
          aria-label="Add rates"
        >
          {isPhoneView ? (
            <div
              className="flex flex-shrink-0 justify-center pb-1 pt-2"
              aria-hidden
            >
              <span className="h-[0.28rem] w-9 rounded-full bg-muted-foreground/45" />
            </div>
          ) : null}
          <SheetHeader
            className={cn(
              "flex-row items-center justify-between gap-2 space-y-0",
              isPhoneView ? "px-3 pb-3 pt-1" : "px-3 py-2",
            )}
          >
            <div className="min-w-0">
              <SheetTitle
                className={isPhoneView ? "text-lg font-semibold" : "text-base"}
              >
                Add rate
              </SheetTitle>
              {item?.productName && (
                <div
                  className="truncate text-[0.78rem] text-muted-foreground"
                  title={item.productName}
                >
                  {item.productName}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeRateBar}
              disabled={saving}
              className="flex-shrink-0 rounded-full"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>

          <div
            className={cn(
              "flex-shrink-0 border-b border-border",
              isPhoneView ? "px-3 py-3" : "px-3 py-2",
            )}
          >
            <Label className="mb-1 block" htmlFor="pro-bucket-supplier-search">
              Search suppliers
            </Label>
            <Input
              id="pro-bucket-supplier-search"
              placeholder="Name, shop, phone, email, GST…"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
            />
            {supplierSearch.trim() && (
              <p className="mt-1 text-sm text-muted-foreground">
                {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}{" "}
                match this search (up to 100). Clear the field to load the full
                list.
              </p>
            )}
          </div>

          <SheetBody className={cn("px-3", isPhoneView ? "py-3" : "py-2")}>
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
                  className="mb-3 rounded border border-border bg-muted"
                >
                  <div className="flex items-center justify-between rounded-t-[calc(0.375rem-1px)] border-b border-border bg-secondary! px-3 py-2">
                    <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      Rate entry {rateRows.length > 1 ? idx + 1 : ""}
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
                        <Input
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
                        <Input
                          type="text"
                          readOnly
                          tabIndex={-1}
                          value={
                            finalAmountPreview != null
                              ? formatProBucketRateAmount(finalAmountPreview)
                              : ""
                          }
                          placeholder="—"
                          className="bg-secondary!"
                        />
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
              className="mb-1"
            >
              <Plus className="h-4 w-4" />
              Add another entry
            </Button>
          </SheetBody>

          <SheetFooter
            className={cn(
              "flex-shrink-0 gap-2 px-3",
              isPhoneView
                ? "flex-col bg-card py-3"
                : "flex-wrap justify-end bg-secondary! py-2",
            )}
            style={{
              paddingBottom: isPhoneView
                ? "max(0.75rem, env(safe-area-inset-bottom, 0px))"
                : undefined,
              boxShadow: isPhoneView
                ? "0 -4px 20px rgba(0,0,0,0.06)"
                : undefined,
            }}
          >
            <Button
              type="button"
              onClick={submitRates}
              disabled={saving}
              className={isPhoneView ? "w-full" : undefined}
            >
              {saving ? "Saving…" : "Save rates"}
            </Button>
            <Button
              type="button"
              variant={isPhoneView ? "outline" : "ghost"}
              onClick={closeRateBar}
              disabled={saving}
              className={isPhoneView ? "w-full" : undefined}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={localProBarOpen}
        onOpenChange={(o) => {
          if (!o) closeLocalProBar();
        }}
      >
        <SheetContent
          side={isPhoneView ? "bottom" : "right"}
          showClose={false}
          onInteractOutside={(e) => {
            if (assigningLocalPro) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (assigningLocalPro) e.preventDefault();
          }}
          className={cn(
            "gap-0 p-0",
            isPhoneView
              ? "max-h-[90vh] rounded-t-2xl"
              : "w-[min(24rem,100%)] sm:max-w-none",
          )}
          aria-label="Assign local procurement"
        >
          <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0 px-3 py-2">
            <div className="min-w-0">
              <SheetTitle className="text-base">Assign Local Pro</SheetTitle>
              {item?.productName && (
                <div
                  className="truncate text-sm text-muted-foreground"
                  title={item.productName}
                >
                  {item.productName}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeLocalProBar}
              disabled={assigningLocalPro}
              className="flex-shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>

          <SheetBody className="px-3 py-3">
            {localProEmployeesLoading || marketZonesLoading ? (
              <Loader message="Loading form…" />
            ) : localProEmployees.length === 0 ? (
              <p className="text-muted-foreground">
                No employees with the local procurement role were found.
              </p>
            ) : (
              <>
                <Label htmlFor="local-pro-employee" className="mb-1 block">
                  Local procurement employee
                </Label>
                <Select
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
                </Select>

                <Label htmlFor="local-pro-zone" className="mb-1 block">
                  Zone (optional)
                </Label>
                <Select
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
                </Select>

                <Label htmlFor="local-pro-remark" className="mb-1 mt-2 block">
                  Remark
                </Label>
                <Textarea
                  id="local-pro-remark"
                  rows={3}
                  placeholder="Optional note for the assignee…"
                  value={localProAssignRemark}
                  onChange={(e) => setLocalProAssignRemark(e.target.value)}
                />
              </>
            )}
          </SheetBody>

          <SheetFooter className="flex-shrink-0 justify-end gap-2 px-3 py-2">
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
              {assigningLocalPro ? "Assigning…" : "Assign"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProBucketDetail;
