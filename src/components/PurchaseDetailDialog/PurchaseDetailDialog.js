import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Package, ReceiptText, Store, Tag } from "lucide-react";
import purchaseBucketService from "../../services/purchaseBucketService";
import { getAssetsUrl } from "../../api/endpoints";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { resolveProBucketEffectiveRate } from "../../utils/proBucketRate";
import Loader from "../Loader/Loader";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui";

// ─── config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open: { label: "Open", color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  pending: { label: "Open", color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  hod_approval_pending: {
    label: "HOD Pending",
    color: "#d97706",
    bg: "#fffbeb",
    dot: "#f59e0b",
  },
  billing_request_raised: {
    label: "BR Raised",
    color: "#0891b2",
    bg: "#ecfeff",
    dot: "#06b6d4",
  },
  payment_request_raised: {
    label: "Payment Requested",
    color: "#0891b2",
    bg: "#ecfeff",
    dot: "#06b6d4",
  },
  finance_approved: {
    label: "Finance Approved",
    color: "#7c3aed",
    bg: "#f5f3ff",
    dot: "#8b5cf6",
  },
  billing_request_rejected: {
    label: "Rejected",
    color: "#dc2626",
    bg: "#fef2f2",
    dot: "#ef4444",
  },
  purchased: {
    label: "Purchased",
    color: "#16a34a",
    bg: "#f0fdf4",
    dot: "#22c55e",
  },
  inventory_received: {
    label: "Inventory Received",
    color: "#0369a1",
    bg: "#e0f2fe",
    dot: "#0ea5e9",
  },
  ready_for_dispatchment: {
    label: "Ready to Dispatch",
    color: "#15803d",
    bg: "#dcfce7",
    dot: "#22c55e",
  },
  delivered: {
    label: "Delivered",
    color: "#15803d",
    bg: "#f0fdf4",
    dot: "#22c55e",
  },
  po_closed: {
    label: "Sales Order Closed",
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  },
};

const PRIORITY_CONFIG = {
  high: { label: "High", color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
  medium: { label: "Medium", color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  low: { label: "Low", color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
};

// Statuses where a fresh billing request can no longer be raised.
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

// ─── helpers ───────────────────────────────────────────────────────────────────

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const codeLast4 = (code) => {
  const s = code != null ? String(code).trim() : "";
  if (!s) return null;
  return s.length <= 4 ? s : s.slice(-4);
};

const formatINR = (v) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? null
    : `₹${Number(v).toLocaleString("en-IN")}`;

const isImagePath = (att) => {
  if (!att || typeof att !== "object" || !att.path) return false;
  return (
    (att.mimeType && /^image\//i.test(String(att.mimeType))) ||
    /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(att.path))
  );
};

const resolveUrl = (path) => {
  if (!path) return null;
  return String(path).startsWith("http") ? path : getAssetsUrl(path);
};

const supplierLabel = (s) => {
  if (!s || typeof s !== "object") return "—";
  return s.name || s.shopname || s.shop_location || "—";
};

const supplierContact = (s) => {
  if (!s || typeof s !== "object") return [];
  const parts = [];
  if (s.phone_1) parts.push(s.phone_1);
  if (s.email) parts.push(s.email);
  if (s.address) parts.push(String(s.address).slice(0, 60));
  return parts;
};

const unwrapPayload = (res) => res?.data?.data ?? res?.data;

/**
 * Extract the po_product id from a variety of possible shapes:
 *  - a Purchase Bucket row/detail:   `_id`
 *  - a Local Purchase assignment:    `poProductId` (id or populated object)
 */
export const resolvePoProductId = (source) => {
  if (!source || typeof source !== "object") return "";
  const direct = source.poProductId ?? source.poProduct ?? source.po_product;
  if (direct) {
    if (typeof direct === "object")
      return String(direct._id || direct.id || "");
    return String(direct);
  }
  return String(source._id || source.id || "");
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
    dot: "#94a3b8",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}25`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
};

const PriorityPill = ({ priority }) => {
  const raw =
    priority != null && String(priority).trim() !== ""
      ? String(priority).trim().toLowerCase()
      : "medium";
  const cfg = PRIORITY_CONFIG[raw] || {
    label: raw.charAt(0).toUpperCase() + raw.slice(1),
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}25`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
};

const SectionLabel = ({ icon: Icon, children }) => (
  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
    {children}
  </div>
);

const Fact = ({ label, children }) => (
  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="mt-0.5 text-sm font-semibold text-foreground">
      {children}
    </div>
  </div>
);

// ─── component ─────────────────────────────────────────────────────────────────

/**
 * Reusable purchase-detail popup shared by Local Purchase and Brand Purchase.
 *
 * Props:
 *  - open           : boolean
 *  - onOpenChange   : (open) => void
 *  - poProductId    : string   (po_product id used to fetch the full detail)
 *  - fallback       : object   (a row already in hand, used while loading / if fetch fails)
 *  - source         : "local" | "brand"  (labels only)
 *  - canRaise       : boolean  (whether to show the Raise Billing Request button)
 */
const PurchaseDetailDialog = ({
  open,
  onOpenChange,
  poProductId,
  fallback = null,
  source = "brand",
  canRaise = false,
}) => {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!poProductId) {
      setItem(null);
      return;
    }
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseBucketService.getById(poProductId),
      );
      const doc = unwrapPayload(res);
      setItem(
        doc && typeof doc === "object" && !Array.isArray(doc) ? doc : null,
      );
    } catch (e) {
      toastError(e?.message || "Failed to load purchase details");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [poProductId]);

  useEffect(() => {
    if (open) load();
    else setItem(null);
  }, [open, load]);

  // Derived view model — merges the fetched detail with the fallback row so the
  // popup is populated even before / without a successful fetch.
  const vm = useMemo(() => {
    const it = item || {};
    const snap = fallback?.productSnapshot || {};
    const queryProduct =
      it.queryProductMatch && typeof it.queryProductMatch === "object"
        ? it.queryProductMatch
        : null;
    const catalogProduct =
      it.productDetail && typeof it.productDetail === "object"
        ? it.productDetail
        : null;

    const productName =
      catalogProduct?.name ||
      queryProduct?.productName ||
      it.productName ||
      snap.productName ||
      fallback?.productName;
    const productCode =
      catalogProduct?.productCode ||
      catalogProduct?.sku ||
      queryProduct?.rawProductCode ||
      it.rawProductCode ||
      snap.rawProductCode ||
      fallback?.rawProductCode;

    const quantity =
      queryProduct?.quantity ??
      catalogProduct?.quantity ??
      it.quantity ??
      snap.quantity ??
      fallback?.quantity;
    const unit =
      queryProduct?.unit ||
      catalogProduct?.unit ||
      it.unit ||
      snap.unit ||
      fallback?.unit;

    const status = it.status || fallback?.status;
    const priority = it.priority || fallback?.priority || snap.priority;
    const poCode = it.poCode || snap.poCode || fallback?.poCode;
    const queryCode =
      it.queryCode || queryProduct?.queryCode || fallback?.queryCode;
    const dispatchmentDate = it.dispatchmentDate || fallback?.dispatchmentDate;
    const targetRate = it.targetRate ?? fallback?.targetRate;

    // Supplier rates → "from whom to buy + at what rate".
    const rawRates = it.queryLineRates?.length
      ? it.queryLineRates
      : Array.isArray(it.queryRate)
        ? it.queryRate
        : [];
    const rates = rawRates
      .map((r) => ({
        name: supplierLabel(r.supplier),
        contact: supplierContact(r.supplier),
        rate: resolveProBucketEffectiveRate(r) ?? r.rate,
        remark: r.remark,
      }))
      .filter((r) => r.name !== "—" || r.rate != null);

    // Instructions / do's & don'ts → remarks & descriptions.
    const instructions = [
      { label: "Assignment remark", value: fallback?.remark },
      { label: "Query remark", value: queryProduct?.remark },
      { label: "Description", value: queryProduct?.description },
      { label: "Catalog note", value: catalogProduct?.description },
    ].filter((r) => r.value && String(r.value).trim());

    // Images — prefer query product images, fall back to snapshot images.
    const rawImgs = Array.isArray(queryProduct?.images)
      ? queryProduct.images
      : Array.isArray(catalogProduct?.images)
        ? catalogProduct.images
        : [];
    const images = rawImgs
      .filter(isImagePath)
      .map((d, idx) => ({ url: resolveUrl(d.path), key: d?._id || idx }))
      .filter((i) => i.url);

    const rejectionRemark =
      it.purchaseBillingRequestId &&
      typeof it.purchaseBillingRequestId === "object"
        ? it.purchaseBillingRequestId.financierRemark ||
          it.purchaseBillingRequestId.remark
        : null;

    const lineStatus =
      status != null && String(status).trim() !== ""
        ? String(status).trim()
        : "pending";

    return {
      productName: fmt(productName),
      productCode,
      quantity,
      unit,
      status,
      priority,
      poCode,
      queryCode,
      dispatchmentDate,
      targetRate,
      rates,
      instructions,
      images,
      rejectionRemark,
      isRejected: lineStatus === "billing_request_rejected",
      canRaiseNow: canRaise && !RAISE_BILLING_BLOCKED_STATUSES.has(lineStatus),
    };
  }, [item, fallback, canRaise]);

  const handleRaise = () => {
    const id = poProductId || resolvePoProductId(fallback);
    if (!id) return;
    onOpenChange?.(false);
    navigate(`/purchase-bucket/raise-billing-request?poProductId=${id}`);
  };

  const sourceLabel = source === "local" ? "Local Purchase" : "Brand Purchase";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex-col items-start gap-1.5">
          <div className="flex w-full flex-wrap items-center gap-2 pr-8">
            <DialogTitle className="min-w-0 flex-1 truncate">
              {vm.productName}
            </DialogTitle>
            {vm.status ? <StatusPill status={vm.status} /> : null}
            {vm.priority ? <PriorityPill priority={vm.priority} /> : null}
          </div>
          <DialogDescription>
            {sourceLabel}
            {vm.productCode ? (
              <>
                {" · "}
                <span className="font-mono">{vm.productCode}</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10">
            <Loader message="Loading purchase details…" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Key facts — target rate, qty, codes, dispatch */}
            <div>
              <SectionLabel icon={Package}>Purchase Snapshot</SectionLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Fact label="Target Rate">
                  {formatINR(vm.targetRate) ? (
                    <span className="text-primary">
                      {formatINR(vm.targetRate)}
                    </span>
                  ) : (
                    "—"
                  )}
                </Fact>
                <Fact label="Quantity">
                  {vm.quantity != null ? vm.quantity : "—"}
                  {vm.unit ? ` ${vm.unit}` : ""}
                </Fact>
                <Fact label="Dispatch Date">
                  {dateFormatter(vm.dispatchmentDate, "—")}
                </Fact>
                <Fact label="Sales Order Code">
                  {codeLast4(vm.poCode) ? (
                    <Badge
                      variant="secondary"
                      className="font-mono"
                      title={vm.poCode ? String(vm.poCode).trim() : undefined}
                    >
                      {codeLast4(vm.poCode)}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Fact>
                <Fact label="Query Code">
                  {codeLast4(vm.queryCode) ? (
                    <Badge
                      variant="secondary"
                      className="font-mono"
                      title={
                        vm.queryCode ? String(vm.queryCode).trim() : undefined
                      }
                    >
                      {codeLast4(vm.queryCode)}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Fact>
              </div>
            </div>

            {/* Whom to buy from + at what rate */}
            <div>
              <SectionLabel icon={Store}>
                Suppliers — whom to buy from &amp; at what rate
              </SectionLabel>
              {vm.rates.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  No supplier rates recorded for this item yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  {vm.rates.map((r, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{r.name}</span>
                        </div>
                        {r.contact.length > 0 && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {r.contact.join(" · ")}
                          </div>
                        )}
                        {r.remark && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {r.remark}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-foreground">
                          {formatINR(r.rate) || "—"}
                        </div>
                        <div className="text-[10px] uppercase text-muted-foreground">
                          rate
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What to do / what not to do — instructions & remarks */}
            {vm.instructions.length > 0 && (
              <div>
                <SectionLabel icon={FileText}>
                  Instructions &amp; Remarks
                </SectionLabel>
                <div className="space-y-2">
                  {vm.instructions.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {r.label}
                      </div>
                      <div className="mt-0.5 whitespace-pre-wrap break-words text-sm">
                        {r.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection notice */}
            {vm.isRejected && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ReceiptText className="h-4 w-4" />
                  Billing request rejected
                </div>
                {vm.rejectionRemark && (
                  <div className="mt-1 whitespace-pre-wrap break-words">
                    {vm.rejectionRemark}
                  </div>
                )}
                <div className="mt-1 text-red-600 dark:text-red-400">
                  Please resubmit using Raise Billing Request.
                </div>
              </div>
            )}

            {/* Product images */}
            {vm.images.length > 0 && (
              <div>
                <SectionLabel icon={Tag}>Product Images</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {vm.images.map((img) => (
                    <img
                      key={img.key}
                      src={img.url}
                      alt="Product"
                      className="h-24 w-24 rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
          {vm.canRaiseNow && (
            <Button onClick={handleRaise} disabled={loading}>
              <ReceiptText className="h-4 w-4" />
              Raise Billing Request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDetailDialog;
