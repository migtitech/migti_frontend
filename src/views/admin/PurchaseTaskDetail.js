import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Boxes,
  Building2,
  CalendarClock,
  ChevronRight,
  Hash,
  Image as ImageIcon,
  IndianRupee,
  Layers,
  Package,
  Plus,
  Ruler,
  ShoppingBasket,
  Tag,
  Trash2,
  User,
  Users,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "../../components/ui";
import { BackButton, Loader } from "../../components";
import { DUMMY_CATEGORY_SUPPLIERS } from "../../components/CategorySuppliersTable/CategorySuppliersTable";
import purchaseTaskService from "../../services/purchaseTaskService";
import { findDummyTask } from "../../data/procurementRequestsDummy";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { useAuth, ROLES } from "../../context/AuthContext";
import { dateFormatter } from "../../utils/dateFormatter";
import { cn } from "../../lib/utils";
import { getStatusBadge, formatCurrency, classifyTask } from "./PurchaseTasks";

const SOURCE_LABEL = {
  assigned: { label: "Assigned", variant: "secondary" },
  direct: { label: "Direct", variant: "info" },
  reverify: { label: "Reverify", variant: "warning" },
};

/* Demo data for the "Assign Local Pro" dialog (no backend — sample only). */
const DUMMY_LOCAL_PRO_EMPLOYEES = [
  { id: "lp-1", email: "ramesh.local@migti.com" },
  { id: "lp-2", email: "priya.local@migti.com" },
  { id: "lp-3", email: "farhan.local@migti.com" },
];
const DUMMY_MARKET_ZONES = [
  { id: "z-1", label: "Lohar Chawl (Mumbai)" },
  { id: "z-2", label: "Kalbadevi (Mumbai)" },
  { id: "z-3", label: "Turbhe Market (Navi Mumbai)" },
];

const dash = (v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  if (typeof v === "number" && Number.isNaN(v)) return "—";
  return v;
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

const emptyRate = () => ({
  supplier: "",
  rate: "",
  unit: "",
  gstPercentage: "",
  discountPercentage: "",
  remark: "",
});

/* Options for the Add Rate dropdowns (demo/UI only). */
const UNIT_OPTIONS = [
  "kg",
  "no",
  "bag",
  "box",
  "ton",
  "litre",
  "meter",
  "piece",
  "pack",
  "roll",
];
const GST_OPTIONS = ["0", "5", "12", "18", "28"];

const sanitizeRateInput = (raw) => {
  if (raw === "" || raw == null) return "";
  const t = String(raw).replace(/[^\d.]/g, "");
  if (t === "") return "";
  const dot = t.indexOf(".");
  if (dot === -1) return t;
  return t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, "");
};

const PurchaseTaskDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const isAdminLike =
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.HEAD_OF_DEPARTMENT;

  const [task, setTask] = useState(location.state?.task || null);
  const [loading, setLoading] = useState(!location.state?.task);
  const [notFound, setNotFound] = useState(false);

  /* Action chooser dialog (Add Rate / Assign Local Procurement) */
  const [actionOpen, setActionOpen] = useState(false);

  /* Assign Local Pro dialog (demo only) */
  const [localProOpen, setLocalProOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [assignRemark, setAssignRemark] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignedLocal, setAssignedLocal] = useState(null);

  /* Add rate dialog (demo only) */
  const [rateOpen, setRateOpen] = useState(false);
  const [rateRows, setRateRows] = useState([emptyRate()]);

  /* Load: prefer router state, then the list endpoints, then sample data. */
  useEffect(() => {
    if (task) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const finders = [
          () =>
            purchaseTaskService.getMyTasks({ pageNumber: 1, pageSize: 100 }),
        ];
        if (isAdminLike) {
          finders.push(() =>
            purchaseTaskService.adminList({ pageNumber: 1, pageSize: 100 }),
          );
        }
        let found = null;
        for (const fetchList of finders) {
          try {
            const res = await withMinimumDelay(fetchList);
            const data = res?.data || res;
            const result = data?.data ?? data;
            const list = result?.tasks || [];
            found = list.find((t) => String(t._id || t.id) === String(id));
            if (found) break;
          } catch {
            /* try the next source */
          }
        }
        if (!alive) return;
        // Sample fallback so the preview works when opened directly by URL.
        const resolved = found || findDummyTask(id);
        if (resolved) setTask(resolved);
        else setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [id, isAdminLike, task]);

  const quotation = task?.quotationId || task?.quotation || {};
  const companyInfo = quotation.companyInfo || {};
  const products = Array.isArray(quotation.products) ? quotation.products : [];
  const variants = Array.isArray(task?.variants) ? task.variants : [];
  const rates = Array.isArray(task?.rates) ? task.rates : [];
  const source = task
    ? SOURCE_LABEL[classifyTask(task)] || SOURCE_LABEL.direct
    : SOURCE_LABEL.direct;

  const productName =
    task?.productName || products[0]?.productName || "Product line";
  const gstText =
    task?.gstPercentage != null && task?.gstPercentage !== ""
      ? `${task.gstPercentage}%`
      : "—";
  const isBrand = task?.bucketType === "brand";

  const closeLocalPro = () => {
    if (assigning) return;
    setLocalProOpen(false);
    setSelectedEmployee("");
    setSelectedZone("");
    setAssignRemark("");
  };

  const submitLocalPro = () => {
    if (!selectedEmployee) {
      toastError("Select a local procurement employee.");
      return;
    }
    setAssigning(true);
    // Demo only — no backend call. Record the assignment in local state.
    setTimeout(() => {
      const emp = DUMMY_LOCAL_PRO_EMPLOYEES.find(
        (e) => e.id === selectedEmployee,
      );
      const zone = DUMMY_MARKET_ZONES.find((z) => z.id === selectedZone);
      setAssignedLocal({
        employee: emp?.email || "—",
        zone: zone?.label || "—",
        remark: assignRemark || "—",
        at: new Date().toISOString(),
      });
      setAssigning(false);
      setLocalProOpen(false);
      setSelectedEmployee("");
      setSelectedZone("");
      setAssignRemark("");
      toastSuccess(`Assigned to local procurement — ${emp?.email || "buyer"}`);
    }, 500);
  };

  const addRateRow = () => setRateRows((r) => [...r, emptyRate()]);
  const updateRateRow = (i, field, value) =>
    setRateRows((rows) =>
      rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)),
    );
  const removeRateRow = (i) =>
    setRateRows((rows) => rows.filter((_, idx) => idx !== i));

  const submitRates = () => {
    const valid = rateRows.filter((r) => r.rate !== "" && r.supplier.trim());
    if (!valid.length) {
      toastError("Add at least one line with a supplier and rate.");
      return;
    }
    // Demo only — append to the in-memory task so the Rates tab updates.
    setTask((prev) => ({
      ...prev,
      rates: [
        ...(prev.rates || []),
        ...valid.map((r) => ({
          _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          supplier: { name: r.supplier },
          rate: Number(r.rate),
          gstPercentage: r.gstPercentage === "" ? 0 : Number(r.gstPercentage),
          discountPercentage:
            r.discountPercentage === "" ? 0 : Number(r.discountPercentage),
          unit: r.unit || "",
          remark: r.remark || "",
          submittedAt: new Date().toISOString(),
        })),
      ],
    }));
    toastSuccess("Rates added (sample).");
    setRateOpen(false);
    setRateRows([emptyRate()]);
  };

  /* Action chooser → open the matching dialog. */
  const openAddRate = () => {
    setActionOpen(false);
    setRateRows([emptyRate()]);
    setRateOpen(true);
  };
  const openAssignLocalPro = () => {
    setActionOpen(false);
    setSelectedEmployee("");
    setSelectedZone("");
    setAssignRemark("");
    setLocalProOpen(true);
  };

  if (loading) return <Loader message="Loading request details..." />;

  if (notFound || !task) {
    return (
      <div>
        <BackButton fallback="/procurement-requests" />
        <Card className="mt-3">
          <CardContent className="py-6 text-muted-foreground">
            Request not found or you do not have access to it.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* breadcrumb */}
      <Card className="mb-3">
        <CardContent className="flex items-center justify-between gap-2 py-2">
          <nav className="flex min-w-0 flex-shrink items-center gap-1 overflow-hidden text-sm text-muted-foreground">
            <a href="#/" className="hover:text-foreground">
              Home
            </a>
            <span aria-hidden>/</span>
            <a href="#/procurement-requests" className="hover:text-foreground">
              Procurement Requests
            </a>
            <span aria-hidden>/</span>
            <span className="inline-block max-w-[12rem] truncate text-foreground">
              {productName}
            </span>
          </nav>
          <BackButton fallback="/procurement-requests" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {/* hero header */}
        <div className="relative border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary! shadow-sm">
              <Package className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold leading-tight text-foreground">
                  {productName}
                </h2>
                <Badge variant={source.variant}>{source.label}</Badge>
                {getStatusBadge(task.status)}
                <Badge variant={isBrand ? "info" : "secondary"}>
                  {isBrand ? "Brand" : "Local"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  {quotation.quotationCode || task.quotationNumber || "—"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {dash(task.productCategory)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {companyInfo.name || quotation.customerName || "—"}
                </span>
                {task.createdAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {dateFormatter(task.createdAt, "—")}
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 shadow-sm"
              onClick={() => setActionOpen(true)}
            >
              <Zap className="h-4 w-4" />
              Action
            </Button>
          </div>
        </div>

        <CardContent>
          {/* at-a-glance strip */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile
              icon={Boxes}
              label="Quantity"
              value={
                task.quantity != null && task.quantity !== ""
                  ? `${task.quantity}${task.unit ? ` ${task.unit}` : ""}`
                  : "—"
              }
              accent="primary"
            />
            <StatTile
              icon={Tag}
              label="Target Rate"
              value={formatCurrency(task.targetRate)}
              accent="success"
            />
            <StatTile
              icon={Ruler}
              label="Unit"
              value={dash(task.unit)}
              accent="info"
            />
            <StatTile
              icon={Hash}
              label="GST"
              value={gstText}
              accent="warning"
            />
          </div>

          <>
            {/* ── ITEM INFO ── */}
            <InfoSection icon={Package} title="Product details">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                <Field label="Product name">{dash(productName)}</Field>
                <Field label="Model / part #">{dash(task.modelNumber)}</Field>
                <Field label="Quantity">{dash(task.quantity)}</Field>
                <Field label="Unit">{dash(task.unit)}</Field>
                <Field label="HSN number">{dash(task.hsnNumber)}</Field>
                <Field label="GST %">{gstText}</Field>
                <Field label="Target rate">
                  {formatCurrency(task.targetRate)}
                </Field>
                <Field label="Procurement rate">
                  {formatCurrency(task.procurementRate)}
                </Field>
                <Field label="Priority">{dash(task.priority)}</Field>
                <Field label="Remark" className="sm:col-span-2 md:col-span-3">
                  {dash(task.supplierRateRemark)}
                </Field>
                <Field
                  label="Description"
                  className="sm:col-span-2 md:col-span-3"
                >
                  {dash(task.description)}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="mb-1 flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                    <Boxes className="h-3.5 w-3.5" /> Group
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {dash(task.productGroup)}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="mb-1 flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Category
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {dash(task.productCategory)}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="mb-1 flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" /> Subcategory
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {dash(task.subCategory)}
                  </div>
                </div>
              </div>
            </InfoSection>

            <InfoSection icon={Users} title="People &amp; company">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
                <Field label="Company">
                  {companyInfo.name
                    ? `${companyInfo.name}${
                        companyInfo.area ? ` (${companyInfo.area})` : ""
                      }`
                    : dash(quotation.customerName)}
                </Field>
                <Field label="Assigned to">
                  {task.assignedTo?.name || "—"}
                </Field>
                <Field label="Assigned by">
                  {task.assignedBy?.name || "—"}
                </Field>
                <Field label="Quotation status">{dash(quotation.status)}</Field>
              </div>
            </InfoSection>

            <InfoSection
              icon={Package}
              title={`Quotation products (${products.length})`}
            >
              {products.length === 0 ? (
                <p className="mb-0 text-muted-foreground">
                  No products found on the linked quotation.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: 48 }}>#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>HSN</TableHead>
                        <TableHead>Model</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p, i) => (
                        <TableRow key={p._id || i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-semibold">
                            {p.productName || "-"}
                          </TableCell>
                          <TableCell>{p.quantity ?? "-"}</TableCell>
                          <TableCell>{p.unit || "-"}</TableCell>
                          <TableCell>{p.hsnNumber || "-"}</TableCell>
                          <TableCell>{p.modelNumber || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </InfoSection>

            <InfoSection icon={ImageIcon} title="Images">
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No images attached to this product.
                </p>
              </div>
            </InfoSection>

            {/* ── RATES ── */}
            <InfoSection
              icon={IndianRupee}
              title="Supplier rates"
              action={
                <Button type="button" size="sm" onClick={openAddRate}>
                  <Plus className="h-4 w-4" />
                  Add rate
                </Button>
              }
            >
              {rates.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded border border-border bg-muted px-3 py-10 text-center">
                  <p className="mb-0 text-muted-foreground">
                    No rates have been submitted yet for this item. Use{" "}
                    <strong>Action → Add Rate</strong> to enter one.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {rates.map((r) => (
                    <Card key={r._id || `${r.submittedAt}-${r.rate}`}>
                      <CardContent className="py-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">
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
                            {formatCurrency(r.rate)}
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 border-t border-border pt-2 text-sm text-muted-foreground">
                          <span>
                            GST %:{" "}
                            <span className="text-foreground">
                              {r.gstPercentage != null ? r.gstPercentage : 0}
                            </span>
                          </span>
                          <span>
                            Discount %:{" "}
                            <span className="text-foreground">
                              {r.discountPercentage != null
                                ? r.discountPercentage
                                : 0}
                            </span>
                          </span>
                          <span>
                            Unit:{" "}
                            <span className="text-foreground">
                              {r.unit || "—"}
                            </span>
                          </span>
                          {r.remark && (
                            <span>
                              Remark:{" "}
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
                  ))}
                </div>
              )}
            </InfoSection>

            {/* ── LOCAL PROCUREMENT ── */}
            <InfoSection
              icon={ShoppingBasket}
              title="Local procurement"
              action={
                <Button type="button" size="sm" onClick={openAssignLocalPro}>
                  <User className="h-4 w-4" />
                  Assign Local Pro
                </Button>
              }
            >
              <p className="mb-4 text-sm text-muted-foreground">
                Route this item to a local procurement buyer to source it from
                the market. Once assigned it appears in that buyer&apos;s Local
                Procurement bucket.
              </p>
              {assignedLocal ? (
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-success/30 bg-success/5 p-4 sm:grid-cols-2 md:grid-cols-4">
                  <Field label="Assigned buyer">{assignedLocal.employee}</Field>
                  <Field label="Market zone">{assignedLocal.zone}</Field>
                  <Field label="Remark">{assignedLocal.remark}</Field>
                  <Field label="Assigned on">
                    {dateFormatter(assignedLocal.at, "—")}
                  </Field>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                  <ShoppingBasket className="mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Not yet assigned to local procurement. Use{" "}
                    <strong>Action → Assign to Local Procurement</strong> to
                    route it.
                  </p>
                </div>
              )}
            </InfoSection>
          </>
        </CardContent>
      </Card>

      {/* Action chooser dialog (Add Rate / Assign to Local Procurement) */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-lg" aria-label="Action">
          <DialogHeader className="gap-1">
            <DialogTitle>Action</DialogTitle>
            <DialogDescription className="truncate" title={productName}>
              {productName} · choose what to do with this item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <button
              type="button"
              onClick={openAddRate}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary!">
                <IndianRupee className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Add Rate</span>
                <span className="block text-sm text-muted-foreground">
                  Enter supplier rate(s) for this item.
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={openAssignLocalPro}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info!">
                <User className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  Assign to Local Procurement
                </span>
                <span className="block text-sm text-muted-foreground">
                  Route this item to a local procurement buyer.
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Local Pro dialog (demo) */}
      <Dialog
        open={localProOpen}
        onOpenChange={(o) => {
          if (!o) closeLocalPro();
        }}
      >
        <DialogContent
          className="max-w-md"
          aria-label="Assign local procurement"
        >
          <DialogHeader className="gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary!">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Assign Local Pro</DialogTitle>
              <DialogDescription className="truncate" title={productName}>
                {productName}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="lp-employee" className="mb-1.5 block">
                Local procurement employee{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                id="lp-employee"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">— Select employee —</option>
                {DUMMY_LOCAL_PRO_EMPLOYEES.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.email}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="lp-zone" className="mb-1.5 block">
                Zone{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Select
                id="lp-zone"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                <option value="">— Select zone —</option>
                {DUMMY_MARKET_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="lp-remark" className="mb-1.5 block">
                Remark
              </Label>
              <Textarea
                id="lp-remark"
                rows={3}
                placeholder="Optional note for the assignee…"
                value={assignRemark}
                onChange={(e) => setAssignRemark(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeLocalPro}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitLocalPro}
              disabled={assigning || !selectedEmployee}
            >
              <User className="h-4 w-4" />
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add rate dialog (demo) */}
      <Dialog open={rateOpen} onOpenChange={(o) => !o && setRateOpen(false)}>
        <DialogContent className="max-w-2xl" aria-label="Add rates">
          <DialogHeader className="gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary!">
              <Plus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Add Rate</DialogTitle>
              <DialogDescription className="truncate" title={productName}>
                {productName}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Shared supplier suggestions for the searchable supplier inputs. */}
            <datalist id="rate-supplier-list">
              {DUMMY_CATEGORY_SUPPLIERS.map((s) => (
                <option key={s._id} value={s.name}>
                  {s.shopname ? `${s.shopname} · ${s.phone_1 || ""}` : s.name}
                </option>
              ))}
            </datalist>
            {rateRows.map((row, idx) => (
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
                <div className="grid grid-cols-2 gap-3 p-3">
                  <div className="col-span-2">
                    <Label className="mb-1 block">
                      Supplier <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      list="rate-supplier-list"
                      placeholder="Search supplier…"
                      value={row.supplier}
                      onChange={(e) =>
                        updateRateRow(idx, "supplier", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">
                      Rate <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
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
                    <Select
                      value={row.unit}
                      onChange={(e) =>
                        updateRateRow(idx, "unit", e.target.value)
                      }
                    >
                      <option value="">— Select unit —</option>
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">GST %</Label>
                    <Select
                      value={row.gstPercentage}
                      onChange={(e) =>
                        updateRateRow(idx, "gstPercentage", e.target.value)
                      }
                    >
                      <option value="">— GST % —</option>
                      {GST_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}%
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Discount %</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
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
            ))}
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
              onClick={() => setRateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitRates}>
              Save rates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseTaskDetail;
