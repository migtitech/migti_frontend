import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Download,
  ShieldAlert,
  Eye,
  Package,
  Users,
  MapPin,
  IndianRupee,
  Check,
  ArrowLeft,
  ArrowRight,
  Save,
  Search,
  X,
  AlertCircle,
  Building2,
  Truck,
} from "lucide-react";
import { PageHeader, StatusBadge, DataTable } from "../../components";
import {
  Button,
  Label,
  Select,
  Input,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Progress,
  Separator,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { statusVariant } from "./components/statusFormatters";
import SupplierAutocomplete from "./components/SupplierAutocomplete";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  suppliers,
  purchaseOrderCatalog,
  purchaseOrders as initialPurchaseOrders,
  companyBillingPresets,
  companyShippingPresets,
  paymentTermPresets,
} from "../../data/purchaseMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const DEFAULT_TERMS =
  "1. Delivery within 7 working days of PO date.\n2. Payment: 50% advance, 50% on GRN.\n3. Goods must match approved sample/specification.\n4. Any damage/shortage to be reported within 48 hours of receipt.";

const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_GST = 18;

// Validation patterns (Indian formats).
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;

const STEPS = [
  { n: 1, label: "Products", icon: Package },
  { n: 2, label: "Supplier", icon: Users },
  { n: 3, label: "Addresses", icon: MapPin },
  { n: 4, label: "Review & Terms", icon: IndianRupee },
];

const columns = [
  { key: "id", label: "PO #", sortable: true },
  { key: "supplier", label: "Supplier", sortable: true },
  { key: "items", label: "Items", align: "right", sortable: true },
  {
    key: "amount",
    label: "Amount",
    align: "right",
    sortable: true,
    render: (row) => formatINR(row.amount),
    sortValue: (row) => row.amount,
  },
  {
    key: "hodVerification",
    label: "HOD Verification",
    render: (row) => (
      <Badge
        variant={statusVariant(
          row.hodVerification === "pending" ? "pending" : row.hodVerification,
        )}
      >
        {row.hodVerification}
      </Badge>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
  { key: "date", label: "Date", sortable: true },
];

/** Step indicator — numbered pills with a progress bar. */
const StepIndicator = ({ step }) => (
  <div className="space-y-3">
    <Progress value={(step / STEPS.length) * 100} />
    <ol className="flex items-center justify-between gap-2">
      {STEPS.map((s) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : s.n}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:inline",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  </div>
);

/** Inline field error message. */
const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  ) : null;

const emptyBilling = () => ({ ...companyBillingPresets[0] });

/**
 * Purchase Order page. Keeps the PO list table and the HOD-verification banner;
 * "Create Purchase Order" opens a polished 4-step wizard (products → supplier
 * search → billing/shipping → review, terms & submit) with inline validation.
 * Sample/demo — Save just toasts and prepends a row locally.
 */
const PurchaseOrder = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(initialPurchaseOrders);
  const [wizardOpen, setWizardOpen] = useState(false);
  const nextPoNumberRef = useRef(3342);

  // Wizard state
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState({}); // { [sku]: { qty, discount } }
  const [productSearch, setProductSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [billing, setBilling] = useState(emptyBilling);
  const [shippingId, setShippingId] = useState(companyShippingPresets[0].id);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [paymentTermId, setPaymentTermId] = useState(paymentTermPresets[0].id);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [errors, setErrors] = useState({});

  const supplier = suppliers.find((s) => s.id === supplierId);
  const shipping = companyShippingPresets.find((s) => s.id === shippingId);
  const paymentTerm = paymentTermPresets.find((p) => p.id === paymentTermId);

  const filteredCatalog = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return purchaseOrderCatalog;
    return purchaseOrderCatalog.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [productSearch]);

  const selectedLines = useMemo(
    () =>
      Object.entries(selected).map(([sku, cfg]) => {
        const product = purchaseOrderCatalog.find((p) => p.sku === sku);
        const qty = Number(cfg.qty) || 0;
        const discount = Number(cfg.discount) || 0;
        const gross = product ? product.rate * qty : 0;
        const discountAmt = (gross * discount) / 100;
        const amount = gross - discountAmt;
        const gst = (amount * DEFAULT_GST) / 100;
        return { product, sku, qty, discount, gross, discountAmt, amount, gst };
      }),
    [selected],
  );

  const subtotal = selectedLines.reduce((sum, l) => sum + l.amount, 0);
  const gstTotal = selectedLines.reduce((sum, l) => sum + l.gst, 0);
  const grandTotal = subtotal + gstTotal;

  const resetWizard = () => {
    setStep(1);
    setSelected({});
    setProductSearch("");
    setSupplierId("");
    setBilling(emptyBilling());
    setShippingId(companyShippingPresets[0].id);
    setExpectedDelivery("");
    setPaymentTermId(paymentTermPresets[0].id);
    setTerms(DEFAULT_TERMS);
    setErrors({});
  };

  const openWizard = () => {
    resetWizard();
    setWizardOpen(true);
  };

  const toggleProduct = (sku, checked) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[sku] = prev[sku] || { qty: 1, discount: 0 };
      else delete next[sku];
      return next;
    });
    setErrors((e) => ({ ...e, products: undefined }));
  };

  const setLineField = (sku, field, val) =>
    setSelected((prev) => ({
      ...prev,
      [sku]: { ...prev[sku], [field]: val },
    }));

  // ---- Per-step validation ----
  const validateStep = (s) => {
    const next = {};
    if (s === 1) {
      if (selectedLines.length === 0) {
        next.products = "Select at least one product for this order.";
      } else if (selectedLines.some((l) => l.qty < 1)) {
        next.products = "Every selected product needs a quantity of 1 or more.";
      }
    }
    if (s === 2 && !supplier) {
      next.supplier = "Search and select a supplier to continue.";
    }
    if (s === 3) {
      if (!billing.company?.trim()) next.company = "Company name is required.";
      if (!billing.line?.trim()) next.line = "Address line is required.";
      if (!billing.city?.trim()) next.city = "City is required.";
      if (!billing.state?.trim()) next.state = "State is required.";
      if (!PINCODE_RE.test(String(billing.pincode || "").trim())) {
        next.pincode = "Enter a valid 6-digit pincode.";
      }
      if (
        !GSTIN_RE.test(
          String(billing.gstin || "")
            .trim()
            .toUpperCase(),
        )
      ) {
        next.gstin = "Enter a valid 15-character GSTIN.";
      }
      if (expectedDelivery && expectedDelivery < TODAY) {
        next.expectedDelivery = "Expected delivery can't be in the past.";
      }
    }
    if (s === 4 && !terms.trim()) {
      next.terms = "Terms & conditions can't be empty.";
    }
    return next;
  };

  const goNext = () => {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      toastError("Please fix the highlighted fields before continuing.");
      return;
    }
    setErrors({});
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const buildPoText = (po) =>
    [
      `PURCHASE ORDER: ${po.id}`,
      `Date: ${po.date}`,
      `Supplier: ${po.supplierName} (${po.supplierCode})`,
      po.expectedDelivery ? `Expected Delivery: ${po.expectedDelivery}` : "",
      "",
      `Bill To: ${po.billing.company}, ${po.billing.line}, ${po.billing.city}, ${po.billing.state} ${po.billing.pincode} (GSTIN ${po.billing.gstin})`,
      `Ship To: ${po.shipping.company}, ${po.shipping.line}, ${po.shipping.city}, ${po.shipping.state} ${po.shipping.pincode}`,
      "",
      "Items:",
      ...po.lines.map(
        (l) =>
          `  - ${l.product.name} x ${l.qty} @ ${formatINR(l.product.rate)}` +
          (l.discount ? ` (-${l.discount}%)` : "") +
          ` = ${formatINR(l.amount)} + GST ${DEFAULT_GST}%`,
      ),
      "",
      `Subtotal: ${formatINR(po.subtotal)}`,
      `GST: ${formatINR(po.gstTotal)}`,
      `Grand Total: ${formatINR(po.amount)}`,
      "",
      `Payment Term: ${po.paymentTerm}`,
      "",
      "Terms & Conditions:",
      po.terms,
      "",
      `HOD Verification: ${po.hodVerification.toUpperCase()}`,
    ]
      .filter((l) => l !== "")
      .join("\n");

  const downloadPoText = (po) => {
    const blob = new Blob([buildPoText(po)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${po.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildPo = () => ({
    id: `PO-${nextPoNumberRef.current}`,
    supplierName: supplier.name,
    supplierCode: supplier.id,
    lines: selectedLines,
    subtotal,
    gstTotal,
    amount: grandTotal,
    billing,
    shipping,
    expectedDelivery,
    paymentTerm: paymentTerm.label,
    terms,
    hodVerification: "pending",
    date: TODAY,
  });

  // Validate every step before a final submit.
  const validateAll = () => {
    for (let s = 1; s <= STEPS.length; s += 1) {
      const stepErrors = validateStep(s);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        setStep(s);
        toastError("Some details are incomplete — check the highlighted step.");
        return false;
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validateAll()) return;
    const po = buildPo();
    nextPoNumberRef.current += 1;
    const summary = {
      id: po.id,
      supplier: po.supplierName,
      items: selectedLines.length,
      amount: grandTotal,
      hodVerification: "pending",
      status: "draft",
      date: TODAY,
    };
    setOrders((prev) => [summary, ...prev]);
    setWizardOpen(false);
    toastSuccess(
      `Purchase Order ${po.id} created — awaiting HOD verification (sample UI, not saved)`,
    );
  };

  const handleDownload = () => {
    if (!validateAll()) return;
    downloadPoText(buildPo());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Order"
        description="Create a purchase order through a guided wizard, then track it in the list. Sample/demo — not wired to backend."
        actions={
          <Button type="button" onClick={openWizard}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Purchase Order
          </Button>
        }
      />

      <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning!" />
        <p>
          <strong>HOD verification is mandatory</strong> — a purchase order
          cannot be sent to the supplier until the HOD has verified it.
        </p>
      </div>

      <DataTable
        columns={[
          ...columns,
          {
            key: "actions",
            label: "Actions",
            align: "right",
            exportable: false,
            stopRowClick: true,
            render: (row) => (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/purchase-master/purchase-order/${row.id}`)
                  }
                >
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  View
                </Button>
              </div>
            ),
          },
        ]}
        rows={orders}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/purchase-master/purchase-order/${r.id}`)}
        exportFileName="purchase-orders"
      />

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader
            data-dialog-chrome
            className="flex-col items-stretch gap-4 px-6 pt-6"
          >
            <div>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Step {step} of {STEPS.length} — {STEPS[step - 1].label}
              </DialogDescription>
            </div>
            <StepIndicator step={step} />
          </DialogHeader>

          <div className="space-y-5">
            {/* Step 1 — Select Products */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Search products, select what you need, then set a quantity and
                  an optional line discount.
                </p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoComplete="off"
                    className="pl-9"
                    placeholder="Search products by name, SKU or category…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setProductSearch("")}
                      aria-label="Clear product search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {filteredCatalog.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                    No products match “{productSearch}”.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {filteredCatalog.map((p) => {
                      const checked = p.sku in selected;
                      const cfg = selected[p.sku] || {};
                      const qty = Number(cfg.qty) || 0;
                      const disc = Number(cfg.discount) || 0;
                      const lineAmt = p.rate * qty * (1 - disc / 100);
                      return (
                        <div
                          key={p.sku}
                          className={cn(
                            "rounded-lg border p-3 transition-colors",
                            checked
                              ? "border-primary bg-primary/5"
                              : "border-border",
                          )}
                        >
                          <label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                toggleProduct(p.sku, Boolean(v))
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground">
                                {p.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {p.sku} · {p.category} · {formatINR(p.rate)}
                              </span>
                            </span>
                          </label>
                          {checked && (
                            <div className="mt-3 flex flex-wrap items-end gap-3 pl-7">
                              <div className="space-y-1">
                                <Label
                                  htmlFor={`qty-${p.sku}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Qty
                                </Label>
                                <Input
                                  id={`qty-${p.sku}`}
                                  type="number"
                                  min="1"
                                  className="h-8 w-20"
                                  value={cfg.qty ?? ""}
                                  aria-invalid={qty < 1 || undefined}
                                  onChange={(e) =>
                                    setLineField(p.sku, "qty", e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label
                                  htmlFor={`disc-${p.sku}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Disc %
                                </Label>
                                <Input
                                  id={`disc-${p.sku}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="h-8 w-20"
                                  value={cfg.discount ?? ""}
                                  onChange={(e) =>
                                    setLineField(
                                      p.sku,
                                      "discount",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                              <span className="ml-auto text-sm font-semibold tabular-nums">
                                {formatINR(lineAmt)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <FieldError message={errors.products} />
                {selectedLines.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedLines.length} product
                    {selectedLines.length > 1 ? "s" : ""} selected · subtotal{" "}
                    <span className="font-medium text-foreground">
                      {formatINR(subtotal)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Step 2 — Supplier (search + suggestions) */}
            {step === 2 && (
              <div className="space-y-2">
                <SupplierAutocomplete
                  value={supplierId}
                  invalid={Boolean(errors.supplier)}
                  onSelect={(id) => {
                    setSupplierId(id);
                    setErrors((e) => ({ ...e, supplier: undefined }));
                  }}
                />
                <FieldError message={errors.supplier} />
              </div>
            )}

            {/* Step 3 — Billing & Shipping (inline, side by side) */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Billing */}
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Billing Address
                    </h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="bill-company">Company *</Label>
                      <Input
                        id="bill-company"
                        value={billing.company}
                        aria-invalid={Boolean(errors.company) || undefined}
                        onChange={(e) =>
                          setBilling((b) => ({ ...b, company: e.target.value }))
                        }
                      />
                      <FieldError message={errors.company} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bill-line">Address line *</Label>
                      <Input
                        id="bill-line"
                        value={billing.line}
                        aria-invalid={Boolean(errors.line) || undefined}
                        onChange={(e) =>
                          setBilling((b) => ({ ...b, line: e.target.value }))
                        }
                      />
                      <FieldError message={errors.line} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="bill-city">City *</Label>
                        <Input
                          id="bill-city"
                          value={billing.city}
                          aria-invalid={Boolean(errors.city) || undefined}
                          onChange={(e) =>
                            setBilling((b) => ({ ...b, city: e.target.value }))
                          }
                        />
                        <FieldError message={errors.city} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bill-state">State *</Label>
                        <Input
                          id="bill-state"
                          value={billing.state}
                          aria-invalid={Boolean(errors.state) || undefined}
                          onChange={(e) =>
                            setBilling((b) => ({ ...b, state: e.target.value }))
                          }
                        />
                        <FieldError message={errors.state} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="bill-pincode">Pincode *</Label>
                        <Input
                          id="bill-pincode"
                          inputMode="numeric"
                          maxLength={6}
                          value={billing.pincode}
                          aria-invalid={Boolean(errors.pincode) || undefined}
                          onChange={(e) =>
                            setBilling((b) => ({
                              ...b,
                              pincode: e.target.value.replace(/\D/g, ""),
                            }))
                          }
                        />
                        <FieldError message={errors.pincode} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bill-gstin">GSTIN *</Label>
                        <Input
                          id="bill-gstin"
                          maxLength={15}
                          className="uppercase"
                          value={billing.gstin}
                          aria-invalid={Boolean(errors.gstin) || undefined}
                          onChange={(e) =>
                            setBilling((b) => ({
                              ...b,
                              gstin: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                        <FieldError message={errors.gstin} />
                      </div>
                    </div>
                  </div>

                  {/* Shipping */}
                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      Shipping Address
                    </h3>
                    <div className="space-y-1.5">
                      <Label htmlFor="ship-select">Ship to warehouse *</Label>
                      <Select
                        id="ship-select"
                        value={shippingId}
                        onChange={(e) => setShippingId(e.target.value)}
                      >
                        {companyShippingPresets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.company} — {s.city}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {shipping && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <p className="font-medium text-foreground">
                          {shipping.company}
                        </p>
                        <p className="text-muted-foreground">{shipping.line}</p>
                        <p className="text-muted-foreground">
                          {shipping.city}, {shipping.state} {shipping.pincode}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="exp-delivery">
                        Expected delivery date
                      </Label>
                      <Input
                        id="exp-delivery"
                        type="date"
                        min={TODAY}
                        value={expectedDelivery}
                        aria-invalid={
                          Boolean(errors.expectedDelivery) || undefined
                        }
                        onChange={(e) => setExpectedDelivery(e.target.value)}
                      />
                      <FieldError message={errors.expectedDelivery} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 — Review, Terms & Submit */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pay-term">Payment Term *</Label>
                    <Select
                      id="pay-term"
                      value={paymentTermId}
                      onChange={(e) => setPaymentTermId(e.target.value)}
                    >
                      {paymentTermPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="po-terms">Terms &amp; Conditions *</Label>
                  <Textarea
                    id="po-terms"
                    rows={4}
                    value={terms}
                    aria-invalid={Boolean(errors.terms) || undefined}
                    onChange={(e) => setTerms(e.target.value)}
                  />
                  <FieldError message={errors.terms} />
                </div>

                {/* Professional invoice-style preview */}
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-4 bg-muted/40 px-5 py-4">
                    <div>
                      <p className="text-lg font-bold tracking-tight text-foreground">
                        PURCHASE ORDER
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Draft · {TODAY} · Awaiting HOD verification
                      </p>
                    </div>
                    <Badge variant={statusVariant("pending")}>DRAFT</Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-5 py-4 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Supplier
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {supplier?.name}
                      </p>
                      <p className="text-muted-foreground">
                        {supplier?.category} · {supplier?.city}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Bill To
                      </p>
                      <p className="mt-1 text-foreground">{billing.company}</p>
                      <p className="text-muted-foreground">
                        {billing.line}, {billing.city}, {billing.state}{" "}
                        {billing.pincode}
                      </p>
                      <p className="text-muted-foreground">
                        GSTIN {billing.gstin}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Ship To
                      </p>
                      <p className="mt-1 text-foreground">
                        {shipping?.company}
                      </p>
                      <p className="text-muted-foreground">
                        {shipping?.line}, {shipping?.city}, {shipping?.state}{" "}
                        {shipping?.pincode}
                      </p>
                      {expectedDelivery && (
                        <p className="text-muted-foreground">
                          Delivery by {expectedDelivery}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="overflow-x-auto px-5 py-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Disc%</TableHead>
                          <TableHead className="text-right">Taxable</TableHead>
                          <TableHead className="text-right">GST</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLines.map((l, i) => (
                          <TableRow key={l.sku}>
                            <TableCell className="text-muted-foreground">
                              {i + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {l.product?.name}
                              <span className="block text-xs text-muted-foreground">
                                {l.sku}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.qty}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatINR(l.product?.rate)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.discount ? `${l.discount}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatINR(l.amount)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatINR(l.gst)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="text-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Payment Term
                      </p>
                      <p className="mt-1 text-foreground">
                        {paymentTerm?.label}
                      </p>
                    </div>
                    <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tabular-nums">
                          {formatINR(subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          GST ({DEFAULT_GST}%)
                        </span>
                        <span className="tabular-nums">
                          {formatINR(gstTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
                        <span>Grand Total</span>
                        <span className="tabular-nums">
                          {formatINR(grandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter
            data-dialog-chrome
            className="justify-between px-6 pb-6"
          >
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 1}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-2">
              {step === STEPS.length ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownload}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </Button>
                  <Button type="button" onClick={handleSave}>
                    <Save className="mr-1.5 h-4 w-4" />
                    Create PO
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={goNext}>
                  Next
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrder;
