import React, { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  ClipboardList,
  Package,
  Truck,
  User,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Separator,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "../../../components/ui";
import AuthImage from "../../../components/AuthImage/AuthImage";
import { getAssetsUrl } from "../../../api/endpoints";
import quotationService from "../../../services/quotationService";
import { dateFormatter } from "../../../utils/dateFormatter";
import { toastError, toastSuccess } from "../../../utils/toast";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

const inr = (value) =>
  value == null || value === "" || Number.isNaN(Number(value))
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** Show the real value, or a plausible dummy when the field is empty. */
const orDummy = (value, dummy) => {
  if (value == null) return dummy;
  const s = String(value).trim();
  return s === "" ? dummy : value;
};

/** Deterministic small hash so dummy data stays stable per product. */
const seedFrom = (str) => {
  let h = 0;
  const s = String(str || "seed");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h);
};

/** Procurement staff to assign a line to (frontend-only demo directory). */
const PROCUREMENT_TEAM = [
  { id: "proc-ravi", name: "Ravi Kumar", role: "Procurement Executive" },
  { id: "proc-anjali", name: "Anjali Mehta", role: "Procurement Executive" },
  { id: "proc-suresh", name: "Suresh Patel", role: "Purchase Lead" },
  { id: "proc-neha", name: "Neha Sharma", role: "Procurement Manager" },
];

const DUMMY_SUPPLIER_NAMES = [
  "Sharma Traders",
  "Gupta Enterprises",
  "Metro Industrial Supplies",
  "Krishna Industries",
  "Sri Balaji Agencies",
];

const normalizeImage = (img) => {
  if (!img) return null;
  if (typeof img === "object") {
    const id = img._id ? String(img._id) : "";
    return { id: OBJECT_ID_RE.test(id) ? id : "", path: img.path || "" };
  }
  const s = String(img);
  return OBJECT_ID_RE.test(s) ? { id: s, path: "" } : { id: "", path: s };
};

const parseRates = (res) => {
  const block = res?.data?.data ?? res?.data ?? res;
  return {
    rates: Array.isArray(block?.rates) ? block.rates : [],
    status: block?.status ?? null,
  };
};

const InfoRow = ({ label, value, mono = false, muted = false }) => (
  <div className="flex items-start justify-between gap-3 py-1.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span
      className={`text-right text-sm font-medium ${mono ? "font-mono" : ""} ${
        muted ? "text-muted-foreground" : ""
      }`}
    >
      {value == null || value === "" ? "—" : value}
    </span>
  </div>
);

const SectionCard = ({ icon: Icon, title, children, right }) => (
  <div className="rounded-xl border border-border bg-card">
    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        {title}
      </div>
      {right}
    </div>
    <div className="px-4 py-2">{children}</div>
  </div>
);

const Field = ({ label, children, hint, required }) => (
  <div className="space-y-1">
    <Label className="text-xs">
      {label}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </Label>
    {children}
    {hint ? (
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    ) : null}
  </div>
);

const storageKey = (soProduct, poLineId) =>
  `soProcAssign::${
    poLineId ||
    soProduct?.rawProductCode ||
    soProduct?._id ||
    soProduct?.productName ||
    "line"
  }`;

const loadSavedAssignment = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Per-product detail popup for the Sales Order bucket: full specs, origin,
 * quotation-vs-sales pricing & margin, supplier rates, and a from-scratch
 * procurement assignment form (procurement price, target, qty, terms, and
 * which procurement person to assign it to). Persisted client-side only.
 */
const ProductDetailModal = ({
  open,
  onClose,
  quotationId,
  soProduct,
  quotationProduct,
  poProductLine,
  purchaseOrder,
  totalCount,
  position,
  onPrev,
  onNext,
}) => {
  const [ratesState, setRatesState] = useState({
    loading: false,
    error: "",
    rates: [],
    status: null,
  });
  const [proc, setProc] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const rawProductCode = String(soProduct?.rawProductCode || "").trim();
  const poLineId = poProductLine?._id ? String(poProductLine._id) : "";
  const lineIndex =
    soProduct?.quotationLineIndex != null
      ? soProduct.quotationLineIndex
      : poProductLine?.lineIndex;
  const seed = seedFrom(rawProductCode || soProduct?.productName);

  // Live supplier rates for this line.
  useEffect(() => {
    if (!open || !quotationId || !rawProductCode) {
      setRatesState({ loading: false, error: "", rates: [], status: null });
      return undefined;
    }
    let cancelled = false;
    setRatesState({ loading: true, error: "", rates: [], status: null });
    (async () => {
      try {
        const res = await quotationService.getLineProcurementRates(
          quotationId,
          { rawProductCode, lineIndex },
        );
        const { rates, status } = parseRates(res);
        if (!cancelled)
          setRatesState({ loading: false, error: "", rates, status });
      } catch (err) {
        if (!cancelled) {
          const msg = err?.message || "Failed to load supplier rates";
          toastError(msg);
          setRatesState({
            loading: false,
            error: msg,
            rates: [],
            status: null,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, quotationId, rawProductCode, lineIndex]);

  const images = useMemo(
    () =>
      (Array.isArray(soProduct?.images) ? soProduct.images : [])
        .map(normalizeImage)
        .filter((x) => x && (x.id || x.path)),
    [soProduct?.images],
  );

  const sellingRate = Number(soProduct?.rate) || 0;

  // Real supplier rows, or plausible dummy rows so the table is never empty.
  const supplierRows = useMemo(() => {
    if (ratesState.rates.length > 0) {
      return ratesState.rates.map((r, i) => ({
        key: r._id || i,
        name: r.supplierName || r.supplier?.name || DUMMY_SUPPLIER_NAMES[i % 5],
        minRate: Number(r.minRate),
        maxRate: Number(r.maxRate),
        discount: r.discount,
        unit: r.unit || soProduct?.unit || "Nos",
        available: true,
        demo: false,
      }));
    }
    const base = sellingRate > 0 ? sellingRate * 0.78 : 100 + (seed % 900);
    return DUMMY_SUPPLIER_NAMES.slice(0, 3).map((name, i) => {
      const factor = 1 + ((seed >> (i * 3)) % 12) / 100; // 1.00–1.11
      const min = Math.round(base * factor);
      return {
        key: `demo-${i}`,
        name,
        minRate: min,
        maxRate: Math.round(min * 1.08),
        discount: (seed >> i) % 6,
        unit: soProduct?.unit || "Nos",
        available: ((seed >> i) & 1) === 0,
        demo: true,
      };
    });
  }, [ratesState.rates, sellingRate, seed, soProduct?.unit]);

  const bestSupplierCost = useMemo(() => {
    const mins = supplierRows
      .map((r) => Number(r.minRate))
      .filter((n) => !Number.isNaN(n));
    return mins.length ? Math.min(...mins) : null;
  }, [supplierRows]);

  // Initialise / restore the procurement form when the product changes.
  useEffect(() => {
    if (!open || !soProduct) return;
    const key = storageKey(soProduct, poLineId);
    const saved = loadSavedAssignment(key);
    if (saved) {
      setProc(saved.form);
      setSavedAt(saved.savedAt || null);
      return;
    }
    const cost =
      bestSupplierCost != null
        ? bestSupplierCost
        : Math.round(sellingRate * 0.78);
    setProc({
      assignTo: "",
      supplier: "",
      procurementPrice: cost ? String(cost) : "",
      targetRate: cost ? String(Math.round(cost * 0.95)) : "",
      quantity: soProduct?.quantity != null ? String(soProduct.quantity) : "1",
      unit: soProduct?.unit || "Nos",
      paymentTerm: "credit",
      remark: "",
    });
    setSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    poLineId,
    rawProductCode,
    soProduct?.productName,
    bestSupplierCost,
  ]);

  const patch = (field, value) =>
    setProc((prev) => ({ ...(prev || {}), [field]: value }));

  const marginAmount =
    proc && proc.procurementPrice !== "" && sellingRate > 0
      ? sellingRate - Number(proc.procurementPrice)
      : bestSupplierCost != null && sellingRate > 0
        ? sellingRate - bestSupplierCost
        : null;
  const marginPct =
    marginAmount != null && sellingRate > 0
      ? (marginAmount / sellingRate) * 100
      : null;

  const poClosed =
    String(purchaseOrder?.status || "").toLowerCase() === "closed";

  const handleSubmit = () => {
    if (poClosed) {
      toastError("This sales order is closed.");
      return;
    }
    if (!proc?.assignTo) {
      toastError("Choose a procurement person to assign this product to.");
      return;
    }
    if (!proc.procurementPrice || Number(proc.procurementPrice) <= 0) {
      toastError("Enter a valid procurement price.");
      return;
    }
    if (!proc.quantity || Number(proc.quantity) <= 0) {
      toastError("Enter a valid purchase quantity.");
      return;
    }
    setSubmitting(true);
    try {
      const key = storageKey(soProduct, poLineId);
      const now = new Date().toISOString();
      const assignee = PROCUREMENT_TEAM.find((p) => p.id === proc.assignTo);
      window.localStorage.setItem(
        key,
        JSON.stringify({
          form: proc,
          savedAt: now,
          poLineId,
          productName: soProduct?.productName || "",
        }),
      );
      setSavedAt(now);
      toastSuccess(
        `Assigned to ${assignee?.name || "procurement"} for procurement`,
      );
    } catch {
      toastError("Could not save the assignment on this device.");
    } finally {
      setSubmitting(false);
    }
  };

  const origin = rawProductCode
    ? "From query / rate master"
    : soProduct?.product_id
      ? "From product catalog"
      : "Manually added";
  const addedBy =
    purchaseOrder?.assigned_employee?.name ||
    purchaseOrder?.assigned_employee?.email ||
    "Kabir Singh";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        className="max-w-5xl"
        style={{
          width: "min(68rem, calc(100vw - 2rem))",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DialogHeader style={{ flexShrink: 0, paddingRight: 48 }}>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              {soProduct?.productName || "Product"}
            </DialogTitle>
            {rawProductCode ? (
              <Badge variant="secondary" className="font-mono">
                {rawProductCode}
              </Badge>
            ) : null}
            {savedAt ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Assigned
              </Badge>
            ) : null}
            {totalCount ? (
              <span className="ml-auto text-sm text-muted-foreground">
                Product {position} of {totalCount}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <div
          className="px-6 py-3"
          style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left: identity & pricing */}
            <div className="space-y-4">
              {images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {images.map((img, i) => (
                    <div
                      key={img.id || img.path || i}
                      className="overflow-hidden rounded-lg border border-border"
                      style={{ width: 84, height: 84 }}
                    >
                      {img.id ? (
                        <AuthImage
                          documentId={img.id}
                          fallbackUrl={img.path ? getAssetsUrl(img.path) : ""}
                          alt=""
                          className="h-full w-full"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <img
                          src={
                            img.path?.startsWith("http")
                              ? img.path
                              : getAssetsUrl(img.path)
                          }
                          alt=""
                          className="h-full w-full"
                          style={{ objectFit: "cover" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <SectionCard icon={Package} title="Product details">
                <InfoRow
                  label="Description"
                  value={orDummy(
                    soProduct?.description,
                    "Industrial-grade product suitable for bulk institutional supply.",
                  )}
                />
                <InfoRow
                  label="HSN number"
                  value={orDummy(soProduct?.hsnNumber, "84818090")}
                  mono
                />
                <InfoRow
                  label="Model number"
                  value={orDummy(
                    soProduct?.modelNumber,
                    `MDL-${1000 + (seed % 9000)}`,
                  )}
                />
                <InfoRow
                  label="Quantity"
                  value={`${soProduct?.quantity ?? "—"} ${
                    soProduct?.unit || "Nos"
                  }`}
                />
                <InfoRow
                  label="GST %"
                  value={orDummy(soProduct?.gstPercentage, "18")}
                />
                <InfoRow
                  label="Dispatchment date"
                  value={
                    soProduct?.dispatchmentDate
                      ? dateFormatter(soProduct.dispatchmentDate)
                      : "Not set"
                  }
                />
                <InfoRow
                  label="Remark"
                  value={orDummy(soProduct?.remark, "—")}
                />
              </SectionCard>

              <SectionCard icon={User} title="Origin & ownership">
                <InfoRow label="Source" value={origin} />
                <InfoRow label="Assigned / sales" value={addedBy} />
                <InfoRow
                  label="Quotation"
                  value={
                    quotationProduct ? (
                      <Badge variant="success" className="text-[11px]">
                        traced to quote
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[11px]">
                        added on sales order
                      </Badge>
                    )
                  }
                />
                <InfoRow
                  label="Sales order"
                  value={purchaseOrder?.poCode}
                  mono
                />
                <InfoRow
                  label="Created"
                  value={
                    purchaseOrder?.createdAt
                      ? dateFormatter(purchaseOrder.createdAt)
                      : "—"
                  }
                />
              </SectionCard>

              <SectionCard icon={Boxes} title="Pricing & margin">
                <div className="grid grid-cols-2 gap-3 py-1">
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-900 dark:bg-sky-950/40">
                    <div className="text-xs text-muted-foreground">
                      Quotation rate
                    </div>
                    <div className="text-lg font-bold">
                      {inr(orDummy(quotationProduct?.rate, sellingRate || 0))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-900 dark:bg-violet-950/40">
                    <div className="text-xs text-muted-foreground">
                      Sales order rate
                    </div>
                    <div className="text-lg font-bold">
                      {inr(soProduct?.rate)}
                    </div>
                  </div>
                </div>
                <Separator className="my-2" />
                <InfoRow
                  label="Best supplier cost"
                  value={
                    ratesState.loading ? (
                      <Spinner size="sm" />
                    ) : (
                      inr(bestSupplierCost)
                    )
                  }
                />
                <InfoRow
                  label="Estimated margin"
                  value={
                    marginAmount != null ? (
                      <span
                        className={
                          marginAmount >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }
                      >
                        {inr(marginAmount)}
                        {marginPct != null ? ` (${marginPct.toFixed(1)}%)` : ""}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
              </SectionCard>
            </div>

            {/* Right: suppliers + procurement form */}
            <div className="space-y-4">
              <SectionCard
                icon={Truck}
                title="Supplier rates & availability"
                right={
                  ratesState.rates.length === 0 ? (
                    <Badge variant="secondary" className="text-[11px]">
                      demo data
                    </Badge>
                  ) : ratesState.status ? (
                    <Badge variant="secondary" className="text-[11px]">
                      {String(ratesState.status).replace(/_/g, " ")}
                    </Badge>
                  ) : null
                }
              >
                {ratesState.loading ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                    <Spinner size="sm" /> Loading supplier rates…
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Disc %</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Availability</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplierRows.map((r) => (
                          <TableRow key={r.key}>
                            <TableCell className="font-medium">
                              {r.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {inr(r.minRate)}
                              {r.maxRate && r.maxRate !== r.minRate
                                ? ` – ${inr(r.maxRate).slice(1)}`
                                : ""}
                            </TableCell>
                            <TableCell className="text-right">
                              {r.discount != null &&
                              !Number.isNaN(Number(r.discount))
                                ? Number(r.discount)
                                : "—"}
                            </TableCell>
                            <TableCell>{r.unit || "—"}</TableCell>
                            <TableCell>
                              {r.available ? (
                                <Badge
                                  variant="success"
                                  className="text-[10px]"
                                >
                                  In stock
                                </Badge>
                              ) : (
                                <Badge
                                  variant="warning"
                                  className="text-[10px]"
                                >
                                  On order
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </SectionCard>

              <SectionCard icon={ClipboardList} title="Assign for Procurement">
                {proc ? (
                  <div className="space-y-3 py-1">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Assign to (procurement)" required>
                        <Select
                          value={proc.assignTo}
                          disabled={poClosed}
                          onChange={(e) => patch("assignTo", e.target.value)}
                        >
                          <option value="">— Select person —</option>
                          {PROCUREMENT_TEAM.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} · {p.role}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Buy from supplier">
                        <Select
                          value={proc.supplier}
                          disabled={poClosed}
                          onChange={(e) => {
                            const name = e.target.value;
                            patch("supplier", name);
                            const row = supplierRows.find(
                              (s) => s.name === name,
                            );
                            if (row && row.minRate) {
                              patch("procurementPrice", String(row.minRate));
                            }
                          }}
                        >
                          <option value="">— Select supplier —</option>
                          {supplierRows.map((s) => (
                            <option key={s.key} value={s.name}>
                              {s.name} ({inr(s.minRate)})
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="Procurement price ₹" required>
                        <Input
                          type="number"
                          min={0}
                          value={proc.procurementPrice}
                          disabled={poClosed}
                          onChange={(e) =>
                            patch("procurementPrice", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Target rate ₹" hint="Negotiation goal">
                        <Input
                          type="number"
                          min={0}
                          value={proc.targetRate}
                          disabled={poClosed}
                          onChange={(e) => patch("targetRate", e.target.value)}
                        />
                      </Field>
                      <Field label="Purchase qty" required>
                        <Input
                          type="number"
                          min={0}
                          value={proc.quantity}
                          disabled={poClosed}
                          onChange={(e) => patch("quantity", e.target.value)}
                        />
                      </Field>
                      <Field label="Unit">
                        <Input
                          value={proc.unit}
                          disabled={poClosed}
                          onChange={(e) => patch("unit", e.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Payment terms">
                        <Select
                          value={proc.paymentTerm}
                          disabled={poClosed}
                          onChange={(e) => patch("paymentTerm", e.target.value)}
                        >
                          <option value="credit">Credit</option>
                          <option value="cash">Cash / Nagad</option>
                          <option value="advance">Advance</option>
                        </Select>
                      </Field>
                      <Field label="Remark">
                        <Input
                          value={proc.remark}
                          disabled={poClosed}
                          placeholder="Any note for procurement"
                          onChange={(e) => patch("remark", e.target.value)}
                        />
                      </Field>
                    </div>

                    <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      Purchase value:{" "}
                      <span className="font-semibold text-foreground">
                        {inr(
                          (Number(proc.procurementPrice) || 0) *
                            (Number(proc.quantity) || 0),
                        )}
                      </span>
                      {marginAmount != null ? (
                        <>
                          {"  ·  Margin/unit: "}
                          <span
                            className={`font-semibold ${
                              marginAmount >= 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {inr(marginAmount)}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {savedAt ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Assigned {dateFormatter(savedAt)} — saved on this
                        device.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </SectionCard>
            </div>
          </div>
        </div>

        <DialogFooter
          className="flex-wrap justify-between gap-2"
          style={{ flexShrink: 0 }}
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!onPrev}
              onClick={() => onPrev?.()}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!onNext}
              onClick={() => onNext?.()}
            >
              Next
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onClose?.()}>
              Close
            </Button>
            <Button
              type="button"
              disabled={poClosed || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="mr-1" /> Assigning…
                </>
              ) : savedAt ? (
                "Update assignment"
              ) : (
                "Assign for Procurement"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
