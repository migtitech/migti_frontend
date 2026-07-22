import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RotateCcw,
  AlertTriangle,
  TrendingDown,
  Eye,
  Plus,
  Search,
  X,
  Check,
  ArrowLeft,
  ArrowRight,
  Save,
  FileText,
  ClipboardList,
  Boxes,
  AlertCircle,
  Package,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { FileUpload } from "../../components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  Input,
  Select,
  Textarea,
  Badge,
  Checkbox,
  Progress,
  Separator,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { statusVariant } from "./components/statusFormatters";
import { formatINR } from "./components/DetailPrimitives";
import SupplierAutocomplete from "./components/SupplierAutocomplete";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  purchaseReturns,
  purchaseReturnReasons,
  returnableSources,
} from "../../data/purchaseMasterDummyData";

const noop = () => {};

const REFUND_MODES = ["Credit note", "Refund to bank", "Replacement"];

const STEPS = [
  { n: 1, label: "Source", icon: ClipboardList },
  { n: 2, label: "Items", icon: Boxes },
  { n: 3, label: "Reason", icon: FileText },
  { n: 4, label: "Review", icon: Check },
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

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  ) : null;

/**
 * Type-to-search picker for the returnable SOURCE (a received PO + its GRN).
 * A purchase return is always raised against goods that were actually
 * received, so choosing a source here auto-fills the supplier and the
 * delivered product lines — nothing is typed fresh, everything stays tracked.
 */
const SourcePicker = ({ value, onSelect, invalid }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const selected = returnableSources.find((s) => s.id === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return returnableSources;
    return returnableSources.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.grn.toLowerCase().includes(q) ||
        s.supplier.toLowerCase().includes(q) ||
        s.lines.some((l) => l.name.toLowerCase().includes(q)),
    );
  }, [query]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative" ref={boxRef}>
        <Label htmlFor="source-search">
          Search a received PO / GRN to return against
        </Label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="source-search"
            autoComplete="off"
            className="pl-9"
            placeholder="Search by PO#, GRN#, supplier or product…"
            value={query}
            aria-invalid={invalid || undefined}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {open && (
          <ul className="absolute z-[1100] mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg">
            {matches.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No received order matches “{query}”.
              </li>
            ) : (
              matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(s.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {s.id} · {s.supplier}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        GRN {s.grn} · received {s.receivedOn} · {s.lines.length}{" "}
                        item{s.lines.length > 1 ? "s" : ""}
                      </span>
                    </span>
                    <Badge variant="secondary">{s.grn}</Badge>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {selected ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-foreground">
              {selected.id} · {selected.supplier}
            </p>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:text-destructive"
              onClick={() => onSelect("")}
              aria-label="Clear source"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            GRN {selected.grn} · received {selected.receivedOn} ·{" "}
            {selected.supplierCode}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Pick the order the goods came from — supplier and products fill in
          automatically.
        </p>
      )}
    </div>
  );
};

/**
 * Purchase Return page. Every return dents the purchase manager's performance
 * score. "Create Return" opens a guided wizard that starts from a received
 * PO/GRN (so supplier + products are auto-selected and tracked), lets the user
 * pick lines and return qty, capture reason/refund/photos, and preview before
 * submitting — with inline validation. Sample data / frontend-only.
 */
const PurchaseReturn = () => {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  // Wizard state
  const [step, setStep] = useState(1);
  const [sourceId, setSourceId] = useState("");
  const [lines, setLines] = useState({}); // { [sku]: qty }
  const [reason, setReason] = useState(purchaseReturnReasons[0]);
  const [refundMode, setRefundMode] = useState(REFUND_MODES[0]);
  const [remark, setRemark] = useState("");
  const [errors, setErrors] = useState({});

  const source = returnableSources.find((s) => s.id === sourceId);
  const supplierObj = source ? { id: source.supplierId } : { id: "" };

  const returnLines = useMemo(() => {
    if (!source) return [];
    return Object.entries(lines)
      .map(([sku, qty]) => {
        const line = source.lines.find((l) => l.sku === sku);
        const q = Number(qty) || 0;
        return line ? { ...line, qty: q, value: q * line.rate } : null;
      })
      .filter(Boolean);
  }, [lines, source]);

  const totalReturnValue = returnLines.reduce((sum, l) => sum + l.value, 0);
  const totalReturnQty = returnLines.reduce((sum, l) => sum + l.qty, 0);

  const totalImpact = purchaseReturns.reduce(
    (sum, r) => sum + r.performanceImpact,
    0,
  );
  const pending = purchaseReturns.filter((r) => r.status === "pending");

  const resetWizard = () => {
    setStep(1);
    setSourceId("");
    setLines({});
    setReason(purchaseReturnReasons[0]);
    setRefundMode(REFUND_MODES[0]);
    setRemark("");
    setErrors({});
  };

  const openWizard = () => {
    resetWizard();
    setCreateOpen(true);
  };

  const toggleLine = (sku, checked) =>
    setLines((prev) => {
      const next = { ...prev };
      if (checked) next[sku] = prev[sku] || 1;
      else delete next[sku];
      return next;
    });

  const setLineQty = (sku, qty) =>
    setLines((prev) => ({ ...prev, [sku]: qty }));

  const validateStep = (s) => {
    const next = {};
    if (s === 1 && !source) {
      next.source = "Search and select the PO/GRN this return is against.";
    }
    if (s === 2) {
      if (returnLines.length === 0) {
        next.items = "Select at least one delivered product to return.";
      } else {
        // Return qty can't exceed what was received.
        const over = returnLines.find((l) => {
          const src = source.lines.find((x) => x.sku === l.sku);
          return l.qty < 1 || l.qty > src.receivedQty;
        });
        if (over) {
          next.items = `Return qty for “${over.name}” must be between 1 and the received ${
            source.lines.find((x) => x.sku === over.sku).receivedQty
          }.`;
        }
      }
    }
    if (s === 3 && !remark.trim()) {
      next.remark = "Add a short remark explaining the return.";
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

  const handleSubmit = () => {
    if (!validateAll()) return;
    toastSuccess(
      `Return raised against ${source.id} — ${totalReturnQty} unit(s), ${formatINR(
        totalReturnValue,
      )} (sample UI, not saved)`,
    );
    setCreateOpen(false);
  };

  const columns = useMemo(
    () => [
      { key: "id", label: "Return #", sortable: true },
      { key: "po", label: "PO #", sortable: true },
      { key: "supplier", label: "Supplier", sortable: true },
      { key: "product", label: "Product", sortable: true },
      { key: "qty", label: "Qty", align: "right", sortable: true },
      {
        key: "returnValue",
        label: "Return Value",
        align: "right",
        sortable: true,
        render: (row) => formatINR(row.returnValue),
      },
      { key: "reason", label: "Reason" },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge
            status={row.status}
            variant={statusVariant(row.status)}
          />
        ),
      },
      { key: "refund", label: "Refund" },
      { key: "raisedOn", label: "Raised On", sortable: true },
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
                navigate(`/purchase-master/purchase-return/${row.id}`)
              }
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              View
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Return"
        description="Purchases that were wrong or need to be returned. Sample data for UI preview."
        actions={
          <Button type="button" onClick={openWizard}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Return
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Returns"
          value={purchaseReturns.length}
          icon={RotateCcw}
          color="primary"
        />
        <StatCard
          title="Pending"
          value={pending.length}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Performance Impact"
          value={`${totalImpact} pts`}
          subtitle="reduces your performance score"
          icon={TrendingDown}
          color="danger"
        />
      </div>

      <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p>
          Every return dents your performance score. Raise them only when goods
          are genuinely wrong, damaged, or in excess — and always attach photos
          and the reason so the supplier can act quickly.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={purchaseReturns}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/purchase-master/purchase-return/${r.id}`)}
        exportFileName="purchase-returns"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader
            data-dialog-chrome
            className="flex-col items-stretch gap-4 px-6 pt-6"
          >
            <div>
              <DialogTitle>Create Purchase Return</DialogTitle>
              <DialogDescription>
                Step {step} of {STEPS.length} — {STEPS[step - 1].label}. Raised
                against a received order, so supplier &amp; products stay
                tracked. Frontend-only sample.
              </DialogDescription>
            </div>
            <StepIndicator step={step} />
          </DialogHeader>

          <div className="space-y-5">
            {/* Step 1 — Source (PO/GRN) + auto-locked supplier */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <SourcePicker
                    value={sourceId}
                    invalid={Boolean(errors.source)}
                    onSelect={(id) => {
                      setSourceId(id);
                      setLines({});
                      setErrors((e) => ({ ...e, source: undefined }));
                    }}
                  />
                  <FieldError message={errors.source} />
                </div>
                {source && (
                  <SupplierAutocomplete
                    value={supplierObj.id}
                    onSelect={noop}
                    locked
                    lockedHint="Auto-selected from the chosen PO/GRN — a return always ties back to the supplier the goods came from."
                  />
                )}
              </div>
            )}

            {/* Step 2 — Pick delivered lines + return qty */}
            {step === 2 && (
              <div className="space-y-3">
                {!source ? (
                  <p className="text-sm text-muted-foreground">
                    Go back and pick a source first.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Select the delivered products you're returning and how
                      many. Return qty can't exceed what was received.
                    </p>
                    <div className="space-y-3">
                      {source.lines.map((l) => {
                        const checked = l.sku in lines;
                        const qty = Number(lines[l.sku]) || 0;
                        return (
                          <div
                            key={l.sku}
                            className={cn(
                              "rounded-lg border p-3 transition-colors",
                              checked
                                ? "border-primary bg-primary/5"
                                : "border-border",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) =>
                                  toggleLine(l.sku, Boolean(v))
                                }
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                  {l.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {l.sku} · received {l.receivedQty} ·{" "}
                                  {formatINR(l.rate)} each
                                </p>
                              </div>
                            </div>
                            {checked && (
                              <div className="mt-3 flex flex-wrap items-end gap-3 pl-7">
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={`ret-qty-${l.sku}`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    Return Qty (max {l.receivedQty})
                                  </Label>
                                  <Input
                                    id={`ret-qty-${l.sku}`}
                                    type="number"
                                    min="1"
                                    max={l.receivedQty}
                                    className="h-8 w-28"
                                    value={lines[l.sku] ?? ""}
                                    aria-invalid={
                                      qty < 1 ||
                                      qty > l.receivedQty ||
                                      undefined
                                    }
                                    onChange={(e) =>
                                      setLineQty(l.sku, e.target.value)
                                    }
                                  />
                                </div>
                                <span className="ml-auto text-sm font-semibold tabular-nums">
                                  {formatINR(qty * l.rate)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <FieldError message={errors.items} />
                    {returnLines.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {totalReturnQty} unit(s) · return value{" "}
                        <span className="font-medium text-foreground">
                          {formatINR(totalReturnValue)}
                        </span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 3 — Reason, refund mode, photos, remark */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ret-reason">Reason *</Label>
                    <Select
                      id="ret-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      {purchaseReturnReasons.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ret-refund">Expected Refund *</Label>
                    <Select
                      id="ret-refund"
                      value={refundMode}
                      onChange={(e) => setRefundMode(e.target.value)}
                    >
                      {REFUND_MODES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Photos (proof)</Label>
                  <FileUpload accept="image/*" onChange={noop} />
                  <p className="text-xs text-muted-foreground">
                    Attach photos of the damaged / wrong goods so the supplier
                    can act quickly.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ret-remark">Remark *</Label>
                  <Textarea
                    id="ret-remark"
                    rows={3}
                    placeholder="e.g. Two connectors arrived with bent pins; photos shared with supplier."
                    value={remark}
                    aria-invalid={Boolean(errors.remark) || undefined}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                  <FieldError message={errors.remark} />
                </div>
              </div>
            )}

            {/* Step 4 — Review */}
            {step === 4 && source && (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="flex items-start justify-between gap-4 bg-muted/40 px-5 py-4">
                  <div>
                    <p className="text-lg font-bold tracking-tight text-foreground">
                      PURCHASE RETURN
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Against {source.id} · GRN {source.grn} · draft
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
                      {source.supplier}
                    </p>
                    <p className="text-muted-foreground">
                      {source.supplierCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Reason
                    </p>
                    <p className="mt-1 text-foreground">{reason}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Expected Refund
                    </p>
                    <p className="mt-1 text-foreground">{refundMode}</p>
                  </div>
                </div>

                <Separator />

                <div className="overflow-x-auto px-5 py-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Return Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnLines.map((l) => (
                        <TableRow key={l.sku}>
                          <TableCell className="font-medium">
                            {l.name}
                            <span className="block text-xs text-muted-foreground">
                              {l.sku}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {l.qty}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatINR(l.rate)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatINR(l.value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between border-t border-border px-5 py-4">
                  <span className="text-sm text-muted-foreground">
                    {totalReturnQty} unit(s) · {returnLines.length} line(s)
                  </span>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total Return Value
                    </p>
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {formatINR(totalReturnValue)}
                    </p>
                  </div>
                </div>

                {remark && (
                  <div className="border-t border-border px-5 py-4 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Remark
                    </p>
                    <p className="mt-1 text-foreground">{remark}</p>
                  </div>
                )}
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
                <Button type="button" onClick={handleSubmit}>
                  <Save className="mr-1.5 h-4 w-4" />
                  Raise Return
                </Button>
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

export default PurchaseReturn;
