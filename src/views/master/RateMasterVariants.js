import React, { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import {
  ExternalLink,
  Eye,
  EyeOff,
  IndianRupee,
  Layers,
  SendToBack,
  Store,
  Trophy,
  Users,
} from "lucide-react";
import PageHeader from "../../components/PageHeader/PageHeader";
import BackButton from "../../components/BackButton";
import GstRateSelect from "../../components/GstRateSelect";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import DataTable from "../../components/DataTable/DataTable";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Textarea,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Select,
} from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  useRateMasterProducts,
  daysUntil,
  formatDate,
  setVariantRate,
  reassignVariantToProcurement,
  rankQuotes,
  salesRate,
  productVisibleToSales,
  setVariantSalesVisibility,
  setProductSalesVisibility,
  setVariantMarkup,
} from "./rateMasterStore";

/**
 * Variants page for a single product — reached by clicking "View Variants"
 * on the Rate Master board. Mock/demo data only, no backend calls.
 */
const RateMasterVariants = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const products = useRateMasterProducts();
  const product = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  );

  const [activeVariant, setActiveVariant] = useState(null);
  const [mode, setMode] = useState("set_rate");
  const [form, setForm] = useState({
    rate: "",
    discount: "",
    validDays: "",
    gst: "18",
    remark: "",
    visibleToSales: true,
    markupType: "percent",
    markupValue: "",
  });

  const openVariantModal = (variant) => {
    setActiveVariant(variant);
    setMode("set_rate");
    setForm({
      rate: variant.rate ?? "",
      discount: variant.discount ?? "",
      validDays: variant.validDays ?? "",
      gst: String(variant.gst ?? "18"),
      remark: "",
      visibleToSales: variant.visibleToSales !== false,
      markupType: variant.markupType || "percent",
      markupValue:
        variant.markupValue != null && variant.markupValue !== 0
          ? String(variant.markupValue)
          : "",
    });
  };

  const closeVariantModal = () => setActiveVariant(null);

  // Deep-link support: /master/rate-master/:productId?set=<variantId> opens the
  // Set-Rate popup for that variant, used by the "Set Rate" button on the
  // variant detail page. We consume the param immediately (replace history) so
  // it fires once and a later refresh / back doesn't re-open the popup.
  useEffect(() => {
    const setId = searchParams.get("set");
    if (!setId || !product) return;
    const target = product.variants.find((v) => v.id === setId);
    const next = new URLSearchParams(searchParams);
    next.delete("set");
    setSearchParams(next, { replace: true });
    if (target) openVariantModal(target);
  }, [searchParams, product, setSearchParams]);

  // Supplier quotes for the variant currently open in the popup, ranked L1/L2/L3.
  const activeQuotes = useMemo(
    () => (activeVariant ? rankQuotes(activeVariant.supplierQuotes || []) : []),
    [activeVariant],
  );

  // Fill the rate form from a chosen supplier quote (one-click "use this rate").
  const applySupplierQuote = (quote) => {
    setMode("set_rate");
    setForm((f) => ({
      ...f,
      rate: String(quote.quotedRate),
      gst: String(quote.gst),
    }));
    toastSuccess(`Filled rate from ${quote.supplier} (${quote.rank})`);
  };

  const handleSave = () => {
    if (!activeVariant || !product) return;

    if (mode === "reassign") {
      reassignVariantToProcurement(product.id, activeVariant.id);
      toastSuccess(`${activeVariant.name} sent back to Procurement team`);
      closeVariantModal();
      return;
    }

    const rateNum = Number(form.rate);
    if (!form.rate || Number.isNaN(rateNum) || rateNum <= 0) {
      toastError("Enter a valid selling rate");
      return;
    }
    const validDaysNum = Number(form.validDays) || 30;

    setVariantRate(product.id, activeVariant.id, {
      rate: rateNum,
      discount: Number(form.discount) || 0,
      gst: Number(form.gst),
      validDays: validDaysNum,
    });
    // Persist the sales-master access controls alongside the rate.
    setVariantMarkup(product.id, activeVariant.id, {
      type: form.markupType,
      value: Number(form.markupValue) || 0,
    });
    setVariantSalesVisibility(
      product.id,
      activeVariant.id,
      form.visibleToSales,
    );
    toastSuccess(`Rate updated for ${activeVariant.name}`);
    closeVariantModal();
  };

  // Live preview of the sales rate for the variant open in the popup.
  const previewSalesRate = useMemo(() => {
    const base = Number(form.rate);
    if (!form.rate || Number.isNaN(base) || base <= 0) return null;
    const value = Number(form.markupValue) || 0;
    const adjusted =
      form.markupType === "amount" ? base + value : base * (1 + value / 100);
    return Math.max(0, Math.round(adjusted));
  }, [form.rate, form.markupType, form.markupValue]);

  const variantColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Variant",
        render: (row) => (
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.code}</div>
          </div>
        ),
      },
      {
        key: "submittedRates",
        label: "Submitted Rates",
        exportable: false,
        render: (row) => {
          const ranked = rankQuotes(row.supplierQuotes || []);
          if (ranked.length === 0)
            return <span className="text-muted-foreground">No quotes</span>;
          const l1 = ranked[0];
          return (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {ranked.length} supplier{ranked.length === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-muted-foreground">
                L1: {l1.supplier} · ₹{l1.effectiveRate.toLocaleString("en-IN")}
              </div>
            </div>
          );
        },
      },
      {
        key: "rate",
        label: "Base Rate",
        align: "right",
        render: (row) =>
          row.rate != null ? `₹${row.rate.toLocaleString("en-IN")}` : "—",
      },
      {
        key: "salesRate",
        label: "Sales Rate",
        align: "right",
        exportValue: (row) => {
          const sr = salesRate(row);
          return sr != null ? sr : "";
        },
        render: (row) => {
          const sr = salesRate(row);
          if (sr == null) return "—";
          const mv = Number(row.markupValue) || 0;
          const markupLabel =
            mv === 0
              ? null
              : row.markupType === "amount"
                ? `${mv > 0 ? "+" : ""}₹${mv}`
                : `${mv > 0 ? "+" : ""}${mv}%`;
          return (
            <div>
              <div className="font-medium text-foreground">
                ₹{sr.toLocaleString("en-IN")}
              </div>
              {markupLabel && (
                <div
                  className={`text-xs ${mv > 0 ? "text-success!" : "text-warning!"}`}
                >
                  {markupLabel}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "visibleToSales",
        label: "In Sales Master",
        align: "center",
        exportValue: (row) => (row.visibleToSales ? "Yes" : "No"),
        render: (row) => (
          <div className="flex items-center justify-center gap-2">
            <Switch
              checked={row.visibleToSales !== false}
              onCheckedChange={(checked) => {
                setVariantSalesVisibility(product.id, row.id, checked);
                toastSuccess(
                  checked
                    ? `${row.name} shown in Sales Master`
                    : `${row.name} hidden from Sales Master`,
                );
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Toggle sales visibility"
            />
            {row.visibleToSales !== false ? (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        ),
      },
      {
        key: "discount",
        label: "Discount",
        align: "right",
        render: (row) => `${row.discount || 0}%`,
      },
      {
        key: "gst",
        label: "GST",
        align: "right",
        render: (row) => `${row.gst}%`,
      },
      {
        key: "expiryDate",
        label: "Valid Till",
        render: (row) =>
          row.expiryDate ? (
            <span
              className={
                daysUntil(row.expiryDate) <= 5
                  ? "text-warning! font-medium"
                  : ""
              }
            >
              {formatDate(row.expiryDate)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "status",
        label: "Status",
        align: "center",
        render: (row) => (
          <StatusBadge
            status={
              row.status === "priced"
                ? "active"
                : row.status === "expiring"
                  ? "expired"
                  : "pending"
            }
            children={
              row.status === "priced"
                ? "Priced"
                : row.status === "expiring"
                  ? "Expiring Soon"
                  : "Rate Pending"
            }
          />
        ),
      },
      { key: "assignedTo", label: "Assigned To" },
      {
        key: "action",
        label: "",
        exportable: false,
        toggleable: false,
        align: "right",
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              openVariantModal(row);
            }}
          >
            Set Rate
          </Button>
        ),
      },
    ],
    [product?.id],
  );

  if (!product) {
    return (
      <div>
        <PageHeader title="Rate Master" description="Product not found." />
        <BackButton fallback="/master/rate-master" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            {product.name}
          </span>
        }
        description={`${product.category} · ${product.sku} · Click a variant to see the suppliers who submitted rates (L1/L2/L3), or use "Set Rate".`}
        actions={<BackButton fallback="/master/rate-master" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
          <CardDescription>
            {product.variants.length} variants for this product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={variantColumns}
            rows={product.variants}
            rowKey={(row) => row.id}
            onRowClick={(row) =>
              navigate(`/master/rate-master/${product.id}/${row.id}`)
            }
            showSearch={false}
            exportFileName={`${product.id}-variants`}
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!activeVariant}
        onOpenChange={(open) => !open && closeVariantModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeVariant ? `${product.name} — ${activeVariant.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-6 py-4">
            {/* Submitted supplier rates — ranked L1/L2/L3. Click a row to
                pull that supplier's rate into the form below. */}
            {activeQuotes.length > 0 && (
              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Submitted Rates ({activeQuotes.length})
                  </span>
                  {activeVariant && (
                    <Link
                      to={`/master/rate-master/${product.id}/${activeVariant.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary!"
                    >
                      View full details
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {activeQuotes.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => applySupplierQuote(q)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Badge
                          variant={
                            q.rank === "L1"
                              ? "success"
                              : q.rank === "L2"
                                ? "info"
                                : "warning"
                          }
                          className="font-semibold"
                        >
                          {q.rank}
                        </Badge>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {q.supplier}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {q.submittedBy} · {formatDate(q.submittedAt)}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-medium text-foreground">
                          ₹{q.quotedRate.toLocaleString("en-IN")}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {q.gst}% GST
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3 text-warning!" />
                  Tap a supplier to use their rate. L1 is the cheapest landed
                  rate.
                </div>
              </div>
            )}

            <RadioGroup
              name="rate-action"
              value={mode}
              onValueChange={setMode}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                  mode === "set_rate"
                    ? "border-primary! bg-primary/5"
                    : "border-border"
                }`}
              >
                <RadioGroupItem value="set_rate" className="mt-0.5" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <IndianRupee className="h-3.5 w-3.5" /> Set Selling Rate
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Enter rate, discount, validity and GST
                  </span>
                </span>
              </label>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${
                  mode === "reassign"
                    ? "border-primary! bg-primary/5"
                    : "border-border"
                }`}
              >
                <RadioGroupItem value="reassign" className="mt-0.5" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <SendToBack className="h-3.5 w-3.5" /> Reassign to
                    Procurement
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Send this variant back for sourcing
                  </span>
                </span>
              </label>
            </RadioGroup>

            {mode === "set_rate" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rate">Selling Rate (₹)</Label>
                    <Input
                      id="rate"
                      type="number"
                      min="0"
                      placeholder="e.g. 450"
                      value={form.rate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="discount">Discount (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 5"
                      value={form.discount}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, discount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="validDays">Valid For (days)</Label>
                    <Input
                      id="validDays"
                      type="number"
                      min="1"
                      placeholder="e.g. 30"
                      value={form.validDays}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, validDays: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gst">GST (%)</Label>
                    <GstRateSelect
                      id="gst"
                      allowEmpty={false}
                      value={form.gst}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, gst: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Sales Master access — control what the sales team sees. */}
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    Sales Master Access
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Show in Sales Master
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Turn off to hide this variant's rate from the sales
                        team.
                      </div>
                    </div>
                    <Switch
                      checked={form.visibleToSales}
                      onCheckedChange={(checked) =>
                        setForm((f) => ({ ...f, visibleToSales: checked }))
                      }
                      aria-label="Show in sales master"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="markupType">Sales Adjustment</Label>
                      <Select
                        id="markupType"
                        value={form.markupType}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, markupType: e.target.value }))
                        }
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="amount">Fixed Amount (₹)</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="markupValue">
                        {form.markupType === "amount"
                          ? "Add / Subtract (₹)"
                          : "Add / Subtract (%)"}
                      </Label>
                      <Input
                        id="markupValue"
                        type="number"
                        placeholder={
                          form.markupType === "amount"
                            ? "e.g. 50 or -20"
                            : "e.g. 10 or -5"
                        }
                        value={form.markupValue}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            markupValue: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      Rate shown to sales
                    </span>
                    <span className="font-semibold text-foreground">
                      {form.visibleToSales
                        ? previewSalesRate != null
                          ? `₹${previewSalesRate.toLocaleString("en-IN")}`
                          : "—"
                        : "Hidden"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use a negative value to show a lower rate than the base.
                    Base rate stays unchanged for procurement.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="remark">
                  Remark for Procurement (optional)
                </Label>
                <Textarea
                  id="remark"
                  rows={3}
                  placeholder="e.g. Rate too high, please renegotiate with supplier"
                  value={form.remark}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remark: e.target.value }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeVariantModal}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {mode === "set_rate" ? "Save Rate" : "Send to Procurement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateMasterVariants;
