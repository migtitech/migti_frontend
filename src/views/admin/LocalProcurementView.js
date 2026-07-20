import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Boxes,
  CalendarClock,
  Hash,
  Image as ImageIcon,
  IndianRupee,
  MapPin,
  Package,
  Ruler,
  Search,
  Tag,
  User,
  Users,
} from "lucide-react";
import localProcurementService from "../../services/localProcurementService";
import categoryService from "../../services/categoryService";
import documentService from "../../services/documentService";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import { BackButton, Loader, PageHeader, StatusBadge } from "../../components";
import CategorySuppliersTable, {
  fetchAllSuppliersByCategory,
  DUMMY_CATEGORY_SUPPLIERS,
} from "../../components/CategorySuppliersTable/CategorySuppliersTable";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter } from "../../utils/dateFormatter";
import { useAuth, ROLES } from "../../context/AuthContext";

const TAB_ITEM = 0;
const TAB_SUPPLIERS = 1;
const TAB_RATES = 2;

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

const resolveImagePath = (img) => {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.path || img.url || "";
};

const sanitizeRateInput = (raw) => {
  if (raw === "" || raw == null) return "";
  const t = String(raw).replace(/[^\d.]/g, "");
  if (t === "") return "";
  const dot = t.indexOf(".");
  if (dot === -1) return t;
  return t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, "");
};

const latestRate = (row) => {
  const rates = Array.isArray(row?.rates) ? row.rates : [];
  if (rates.length) return rates[rates.length - 1];
  if (row?.status === "submitted") {
    return {
      supplier: row.supplier,
      price: row.rate,
      rate: row.rate,
      unit: row.unit,
      remark: row.remark,
    };
  }
  return null;
};

const formatProcurementZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const statusBadge = (status) => {
  switch (status) {
    case "pending":
      return <StatusBadge variant="warning" status="Pending" />;
    case "submitted":
      return <StatusBadge variant="success" status="Submitted" />;
    default:
      return <StatusBadge variant="secondary" status={status || "—"} />;
  }
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

const LocalProcurementView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isLocalPro =
    String(user?.role || "").toLowerCase() === ROLES.LOCAL_PROCUREMENT;

  const [row, setRow] = useState(location.state?.row || null);
  const [loading, setLoading] = useState(!location.state?.row);

  const [activeTab, setActiveTab] = useState(TAB_ITEM);
  const [categorySuppliers, setCategorySuppliers] = useState([]);
  const [categorySuppliersLoading, setCategorySuppliersLoading] =
    useState(false);
  const [suppliersTabSearch, setSuppliersTabSearch] = useState("");
  const [ratesSearch, setRatesSearch] = useState("");

  const [submitOpen, setSubmitOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState("");
  const [remark, setRemark] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  /* No get-by-id API — pull the list and find this row by id (fallback for
     direct URL / refresh when no router state was passed). */
  const loadFromList = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        localProcurementService.list({ page: 1, pageSize: 100 }),
      );
      const block = res?.data;
      const list = Array.isArray(block?.data) ? block.data : [];
      const found = list.find((r) => String(r._id) === String(id)) || null;
      setRow(found);
    } catch (e) {
      toastError(e?.message || "Failed to load assignment");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!location.state?.row) {
      loadFromList();
    }
  }, [location.state, loadFromList]);

  const snap = row?.productSnapshot || {};
  const submitted = latestRate(row);
  const submissionImages = Array.isArray(row?.images) ? row.images : [];
  const productImages = Array.isArray(snap.images) ? snap.images : [];

  /** Full submitted-rate history for the Rates tab (newest first). */
  const allRates = useMemo(() => {
    const rates = Array.isArray(row?.rates) ? [...row.rates] : [];
    if (!rates.length && submitted) return [submitted];
    return rates.reverse();
  }, [row?.rates, submitted]);

  const categoryName =
    typeof row?.categoryId === "object" && row.categoryId?.name
      ? String(row.categoryId.name)
      : snap.categoryName || "";

  /* No category id on the assignment record — resolve it by name so the
     Suppliers tab can list category-linked suppliers; falls back to sample
     rows (like the Pro Bucket detail) when it can't be resolved. */
  useEffect(() => {
    const name = String(categoryName || "").trim();
    if (!name) {
      setCategorySuppliers([]);
      setCategorySuppliersLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setCategorySuppliersLoading(true);
      try {
        let categoryId =
          typeof row?.categoryId === "object"
            ? row.categoryId?._id
            : row?.categoryId;
        if (!categoryId) {
          const res = await categoryService.getAllCategories();
          const list =
            res?.data?.categories ||
            res?.data?.data ||
            (Array.isArray(res?.data) ? res.data : []) ||
            [];
          const match = (Array.isArray(list) ? list : []).find(
            (c) =>
              String(c?.name || "")
                .trim()
                .toLowerCase() === name.toLowerCase(),
          );
          categoryId = match?._id || null;
        }
        if (!categoryId) {
          if (!cancelled) setCategorySuppliers([]);
          return;
        }
        const suppliers = await fetchAllSuppliersByCategory(categoryId);
        if (!cancelled) setCategorySuppliers(suppliers);
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
  }, [categoryName, row?.categoryId]);

  const canSubmit = useMemo(() => {
    if (!row || row.status !== "pending") return false;
    if (
      user?.role === ROLES.SUPER_ADMIN ||
      user?.role === ROLES.ADMIN ||
      user?.role === ROLES.HEAD_OF_DEPARTMENT
    ) {
      return true;
    }
    if (isLocalPro) {
      const uid = user?.id || user?._id;
      return (
        uid && String(row?.employeeId?._id || row?.employeeId) === String(uid)
      );
    }
    return false;
  }, [row, user, isLocalPro]);

  const openSubmit = () => {
    setSupplier("");
    setPrice("");
    setRate("");
    setUnit(snap.unit || "");
    setRemark("");
    setImageFiles([]);
    setSubmitOpen(true);
  };

  const closeSubmit = () => {
    if (submitting || uploadingImages) return;
    setSubmitOpen(false);
    setImageFiles([]);
  };

  const handleSubmit = async () => {
    if (!row?._id) return;
    if (!supplier.trim()) {
      toastError("Supplier is required");
      return;
    }
    if (rate === "" || Number.isNaN(Number(rate)) || Number(rate) < 0) {
      toastError("Enter a valid rate ≥ 0");
      return;
    }
    if (price !== "" && (Number.isNaN(Number(price)) || Number(price) < 0)) {
      toastError("Enter a valid price ≥ 0");
      return;
    }
    setSubmitting(true);
    try {
      let images = [];
      if (imageFiles.length) {
        setUploadingImages(true);
        const uploadRes = await documentService.uploadImages(imageFiles);
        const docs =
          uploadRes?.data?.documents ||
          uploadRes?.documents ||
          uploadRes?.data ||
          [];
        images = (Array.isArray(docs) ? docs : [])
          .filter((d) => d?._id)
          .map((d) => ({ documentId: d._id }));
        setUploadingImages(false);
      }
      await localProcurementService.submit(row._id, {
        supplier: supplier.trim(),
        price: price !== "" ? Number(price) : undefined,
        rate: Number(rate),
        unit: unit || "",
        remark: remark || "",
        images,
      });
      toastSuccess("Submitted successfully");
      setSubmitOpen(false);
      loadFromList();
    } catch (e) {
      toastError(e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  return (
    <div>
      <Card className="mb-3">
        <CardContent className="flex items-center justify-between gap-2 py-2">
          <nav className="flex min-w-0 flex-shrink items-center gap-1 overflow-hidden text-sm text-muted-foreground">
            <a href="#/" className="hover:text-foreground">
              Home
            </a>
            <span aria-hidden>/</span>
            <a href="#/local-pro" className="hover:text-foreground">
              Local Pro
            </a>
            <span aria-hidden>/</span>
            <span className="inline-block max-w-[12rem] truncate text-foreground">
              {snap.productName || "Assignment"}
            </span>
          </nav>
          <BackButton fallback="/local-pro" />
        </CardContent>
      </Card>

      {loading ? (
        <Loader message="Loading assignment…" />
      ) : !row ? (
        <PageHeader
          title="Assignment not found"
          description="This local procurement assignment could not be loaded. It may have been removed or is on another page."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="relative border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5">
            <div className="flex flex-wrap items-start gap-4">
              {imgSrc(resolveImagePath(productImages[0])) ? (
                <img
                  src={imgSrc(resolveImagePath(productImages[0]))}
                  alt={snap.productName || "Product"}
                  className="h-16 w-16 shrink-0 rounded-2xl border border-border object-cover shadow-sm"
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary! shadow-sm">
                  <Package className="h-8 w-8" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold leading-tight text-foreground">
                    {snap.productName || "Product"}
                  </h2>
                  {statusBadge(row.status)}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Hash className="h-3.5 w-3.5" />
                    {row.queryCode || snap.queryCode || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {snap.categoryName || "—"}
                  </span>
                  {row.createdAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Assigned {dateFormatter(row.createdAt, "—")}
                    </span>
                  )}
                </div>
              </div>
              {canSubmit && (
                <Button className="shrink-0 shadow-sm" onClick={openSubmit}>
                  <IndianRupee className="h-4 w-4" />
                  Submit rate
                </Button>
              )}
            </div>
          </div>

          <CardContent className="pt-5">
            {/* At-a-glance strip */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <StatTile
                icon={Boxes}
                label="Quantity"
                value={
                  snap.quantity != null
                    ? `${snap.quantity}${snap.unit ? ` ${snap.unit}` : ""}`
                    : "—"
                }
                accent="primary"
              />
              <StatTile
                icon={Ruler}
                label="Unit"
                value={dash(snap.unit)}
                accent="info"
              />
              <StatTile
                icon={Tag}
                label="Category"
                value={dash(snap.categoryName)}
                accent="success"
              />
              <StatTile
                icon={MapPin}
                label="Zone"
                value={formatProcurementZone(row.zoneId)}
                accent="warning"
              />
            </div>

            <Tabs
              value={String(activeTab)}
              onValueChange={(v) => setActiveTab(Number(v))}
            >
              <TabsList className="mb-3 w-full">
                <TabsTrigger value={String(TAB_ITEM)} className="flex-shrink-0">
                  Item info
                </TabsTrigger>
                <TabsTrigger
                  value={String(TAB_SUPPLIERS)}
                  className="flex-shrink-0"
                >
                  Suppliers
                  {categorySuppliers.length > 0 && (
                    <Badge
                      variant={
                        activeTab === TAB_SUPPLIERS ? "default" : "secondary"
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
                  {allRates.length > 0 && (
                    <Badge
                      variant={
                        activeTab === TAB_RATES ? "default" : "secondary"
                      }
                      className="px-1.5 py-0 text-[0.65rem]"
                    >
                      {allRates.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={String(TAB_ITEM)}>
                <InfoSection icon={Package} title="Product details">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                    <Field label="Product name">{dash(snap.productName)}</Field>
                    <Field label="Query code">
                      <span className="font-mono">
                        {dash(row.queryCode || snap.queryCode)}
                      </span>
                    </Field>
                    <Field label="Category">{dash(snap.categoryName)}</Field>
                    <Field label="Quantity">{dash(snap.quantity)}</Field>
                    <Field label="Unit">{dash(snap.unit)}</Field>
                    <Field label="HSN number">{dash(snap.hsnNumber)}</Field>
                    <Field
                      label="Description"
                      className="sm:col-span-2 md:col-span-3"
                    >
                      {dash(snap.description)}
                    </Field>
                  </div>
                </InfoSection>

                <InfoSection icon={Users} title="Assignment">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                    <Field label="Assignee">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {row.employeeId?.name || "Unassigned"}
                      </span>
                    </Field>
                    <Field label="Zone">
                      {formatProcurementZone(row.zoneId)}
                    </Field>
                    <Field label="Assigned on">
                      {dateFormatter(row.createdAt, "—")}
                    </Field>
                    <Field
                      label="Assignment note"
                      className="sm:col-span-2 md:col-span-3"
                    >
                      {dash(row.assignmentRemark)}
                    </Field>
                  </div>
                </InfoSection>

                <InfoSection
                  icon={ImageIcon}
                  title={`Product images${
                    productImages.length ? ` (${productImages.length})` : ""
                  }`}
                >
                  {productImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {productImages.map((img, i) => {
                        const src = imgSrc(resolveImagePath(img));
                        if (!src) return null;
                        return (
                          <a
                            key={img._id || `${src}-${i}`}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="group block overflow-hidden rounded-xl border border-border bg-muted/30 transition-shadow hover:shadow-md"
                          >
                            <div className="flex h-36 items-center justify-center overflow-hidden bg-background">
                              <img
                                src={src}
                                alt={snap.productName || "Product"}
                                className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                              />
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                      <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        No product images attached.
                      </p>
                    </div>
                  )}
                </InfoSection>

                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 text-[0.68rem]"
                  >
                    Status
                  </Badge>
                  {statusBadge(row.status)}
                </div>
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
                        {categoryName ? (
                          <>
                            Suppliers linked to category{" "}
                            <strong>{categoryName}</strong>.
                          </>
                        ) : (
                          "No category on this item — showing sample suppliers below."
                        )}
                      </p>
                      <CategorySuppliersTable
                        suppliers={rows}
                        loading={categorySuppliersLoading}
                        isSample={showSample}
                        search={suppliersTabSearch}
                        onSearchChange={setSuppliersTabSearch}
                        categoryName={categoryName}
                        navigate={navigate}
                      />
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value={String(TAB_RATES)}>
                {canSubmit && (
                  <Button className="mb-3" onClick={openSubmit}>
                    <IndianRupee className="h-4 w-4" />
                    Submit rate
                  </Button>
                )}

                {allRates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                    <IndianRupee className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="mb-3 text-sm text-muted-foreground">
                      No rate has been submitted for this assignment yet.
                    </p>
                    {canSubmit && (
                      <Button size="sm" onClick={openSubmit}>
                        <IndianRupee className="h-4 w-4" />
                        Submit first rate
                      </Button>
                    )}
                  </div>
                ) : (
                  (() => {
                    const term = ratesSearch.trim().toLowerCase();
                    const filtered = term
                      ? allRates.filter((r) =>
                          [r.supplier, r.unit, r.remark, r.rate, r.price].some(
                            (v) =>
                              String(v ?? "")
                                .toLowerCase()
                                .includes(term),
                          ),
                        )
                      : allRates;
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
                            {filtered.length} of {allRates.length}
                          </span>
                        </div>
                        {filtered.length === 0 ? (
                          <p className="rounded border border-border bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
                            No rates match “{ratesSearch}”.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filtered.map((r, i) => (
                              <div
                                key={r._id || `${r.supplier}-${i}`}
                                className="rounded-xl border border-border bg-card p-4"
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    {dash(r.supplier)}
                                  </span>
                                  <span className="text-base font-bold text-primary">
                                    ₹ {dash(r.rate)}
                                    {r.unit ? (
                                      <span className="text-xs font-normal text-muted-foreground">
                                        {" "}
                                        / {r.unit}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                  <Field label="Price">
                                    ₹ {dash(r.price ?? r.rate)}
                                  </Field>
                                  <Field label="Unit">{dash(r.unit)}</Field>
                                  <Field label="Remark" className="col-span-2">
                                    {dash(r.remark)}
                                  </Field>
                                  {r.submittedAt ? (
                                    <Field
                                      label="Submitted on"
                                      className="col-span-2"
                                    >
                                      {dateFormatter(r.submittedAt, "—")}
                                    </Field>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {submissionImages.length > 0 && (
                          <div className="mt-4">
                            <div className="mb-2 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                              Submission images
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {submissionImages.map((img) => {
                                const thumb = imgSrc(resolveImagePath(img));
                                if (!thumb) return null;
                                return (
                                  <a
                                    key={img._id || img.documentId || thumb}
                                    href={thumb}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <img
                                      src={thumb}
                                      alt={img.name || "Upload"}
                                      className="h-16 w-16 rounded-lg border border-border object-cover"
                                    />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={submitOpen}
        onOpenChange={(o) => {
          if (!o) closeSubmit();
        }}
      >
        <DialogContent
          showClose={!submitting && !uploadingImages}
          className="max-w-lg"
          onInteractOutside={(e) => {
            if (submitting || uploadingImages) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (submitting || uploadingImages) e.preventDefault();
          }}
          aria-label="Submit rate"
        >
          <DialogHeader className="gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary!">
              <IndianRupee className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Submit Rate</DialogTitle>
              <DialogDescription className="truncate" title={snap.productName}>
                {snap.productName || "Submit supplier rate for this item"}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Supplier <span className="text-destructive">*</span>
              </Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(sanitizeRateInput(e.target.value))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Rate <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(sanitizeRateInput(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <ProductUnitSelect
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remark</Label>
              <Input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Images</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setImageFiles(Array.from(e?.target?.files || []))
                }
              />
              {imageFiles.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {imageFiles.length} file(s) selected
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeSubmit}
              disabled={submitting || uploadingImages}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploadingImages}
            >
              {submitting || uploadingImages ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalProcurementView;
