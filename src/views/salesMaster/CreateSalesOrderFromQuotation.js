import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Search,
  RotateCcw,
  FileText,
  Package,
  ArrowLeft,
} from "lucide-react";
import { PageHeader, StatusBadge } from "../../components";
import {
  formatQuotationStatus,
  statusVariant,
} from "./components/statusFormatters";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Label,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  quotations,
  salesOrderCatalog,
  findQuotationForOrder,
} from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const lineFromProduct = (product, qty = 1) => ({
  sku: product.sku,
  product: product.name,
  rate: product.rate,
  hsn: product.hsn,
  uom: product.uom,
  category: product.category,
  brand: product.brand,
  gst: product.gst,
  stock: product.stock,
  qty,
});

/**
 * New Sales Order flow. The user searches for a quotation (typeahead with
 * suggestions); on load, the quotation's client and product lines auto-fill.
 * A dedicated "Add product" dialog lets the user search the catalog, open a
 * product detail form (full specs + editable qty/rate) and then add a fully
 * auto-filled line (SKU, rate, HSN, UOM, stock, …).
 *
 * Presentational-only: all state is local, submitting shows a toast. Not wired
 * to the Sales Order backend — sample/dummy data.
 */
const CreateSalesOrderFromQuotation = () => {
  const [quotationInput, setQuotationInput] = useState("");
  const [showQuotationList, setShowQuotationList] = useState(false);
  const [loaded, setLoaded] = useState(null); // { quotation }
  const [lines, setLines] = useState([]);

  // Product-search dialog state
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const productSearchRef = useRef(null);
  // When set, the dialog switches from the search list to the product detail
  // form for this product before it is added to the order.
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [draftQty, setDraftQty] = useState(1);
  const [draftRate, setDraftRate] = useState(0);

  const comboRef = useRef(null);

  // Close the quotation suggestion dropdown when clicking elsewhere.
  useEffect(() => {
    const onClick = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) {
        setShowQuotationList(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Reset to the search step and focus the field whenever the dialog opens.
  useEffect(() => {
    if (productSearchOpen) {
      setProductQuery("");
      setSelectedProduct(null);
      const t = setTimeout(() => productSearchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [productSearchOpen]);

  // Open the product detail form for a picked product, pre-filling qty/rate.
  const openProductDetail = (product) => {
    setSelectedProduct(product);
    const existing = lines.find((l) => l.sku === product.sku);
    setDraftQty(existing ? Number(existing.qty) || 1 : 1);
    setDraftRate(
      existing ? Number(existing.rate) || product.rate : product.rate,
    );
  };

  const quotationMatches = useMemo(() => {
    const q = quotationInput.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.client.toLowerCase().includes(q),
    );
  }, [quotationInput]);

  const loadQuotation = (rawId) => {
    const id = String(rawId || quotationInput).trim();
    if (!id) {
      toastError("Search and pick a quotation first.");
      return;
    }
    const result = findQuotationForOrder(id);
    if (!result) {
      toastError(`No quotation found for "${id}".`);
      return;
    }
    setQuotationInput(result.quotation.id);
    setShowQuotationList(false);
    setLoaded({ quotation: result.quotation });
    setLines(result.lines);
    toastSuccess(`Loaded ${result.quotation.id} — details auto-filled.`);
  };

  const reset = () => {
    setQuotationInput("");
    setLoaded(null);
    setLines([]);
    setShowQuotationList(false);
  };

  const removeLine = (index) =>
    setLines((prev) => prev.filter((_, i) => i !== index));
  const updateLine = (index, patch) =>
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );

  // Confirm the product detail form → add or update the order line.
  const confirmAddProduct = () => {
    const product = selectedProduct;
    if (!product) return;
    const qty = Number(draftQty) || 0;
    if (qty <= 0) {
      toastError("Enter a quantity of at least 1.");
      return;
    }
    const patch = {
      ...lineFromProduct(product, qty),
      rate: Number(draftRate) || 0,
    };
    const existingIndex = lines.findIndex((l) => l.sku === product.sku);
    if (existingIndex !== -1) {
      updateLine(existingIndex, patch);
      toastSuccess(`${product.name} updated on the order.`);
    } else {
      setLines((prev) => [...prev, patch]);
      toastSuccess(`${product.name} added to the order.`);
    }
    setProductSearchOpen(false);
  };

  const productMatches = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return salesOrderCatalog;
    return salesOrderCatalog.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q),
    );
  }, [productQuery]);

  const rows = useMemo(
    () =>
      lines.map((line) => {
        const qty = Number(line.qty) || 0;
        const rate = Number(line.rate) || 0;
        return { ...line, amount: qty * rate };
      }),
    [lines],
  );

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loaded) {
      toastError("Load a quotation before creating the order.");
      return;
    }
    if (!rows.some((r) => r.sku && Number(r.qty) > 0)) {
      toastError("Add at least one product line.");
      return;
    }
    toastSuccess(
      `Sales order created from ${loaded.quotation.id} for ${loaded.quotation.client} — ${formatINR(total)} (sample UI, not saved)`,
    );
    reset();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Order"
        description="Search a quotation to auto-fill its details, then add or edit products before creating the order."
        back="/sales-master/sales-orders"
      />

      {/* Step 1 — searchable quotation */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation</CardTitle>
          <CardDescription>
            Search by quotation number or client, then load it into a sales
            order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div ref={comboRef} className="relative min-w-[260px] flex-1">
              <Label htmlFor="quotation-search">Search quotation</Label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="quotation-search"
                  autoComplete="off"
                  className="pl-9"
                  placeholder="e.g. QT-3391 or Vantage…"
                  value={quotationInput}
                  disabled={Boolean(loaded)}
                  onFocus={() => setShowQuotationList(true)}
                  onChange={(e) => {
                    setQuotationInput(e.target.value);
                    setShowQuotationList(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const first = quotationMatches[0];
                      loadQuotation(first ? first.id : quotationInput);
                    }
                  }}
                />
              </div>

              {showQuotationList && !loaded && (
                <div className="absolute z-[1055] mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {quotationMatches.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      No quotations match “{quotationInput}”.
                    </p>
                  ) : (
                    quotationMatches.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => loadQuotation(q.id)}
                        className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/60"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {q.id}
                            </span>
                            <StatusBadge variant={statusVariant(q.status)}>
                              {formatQuotationStatus(q.status)}
                            </StatusBadge>
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {q.client} · {q.date}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-medium tabular-nums">
                          {formatINR(q.amount)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {loaded ? (
              <Button type="button" variant="outline" onClick={reset}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Change quotation
              </Button>
            ) : (
              <Button type="button" onClick={() => loadQuotation()}>
                <Search className="mr-1.5 h-4 w-4" />
                Load quotation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — auto-filled, editable order */}
      {loaded && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                Order Details
                <StatusBadge variant={statusVariant(loaded.quotation.status)}>
                  {formatQuotationStatus(loaded.quotation.status)}
                </StatusBadge>
              </CardTitle>
              <CardDescription>
                Auto-filled from {loaded.quotation.id} · {loaded.quotation.date}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Client
                  </Label>
                  <p className="font-medium text-foreground">
                    {loaded.quotation.client}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Source quotation
                  </Label>
                  <p className="font-medium text-foreground">
                    {loaded.quotation.id}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>HSN</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">&nbsp;</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No products yet. Use “Add product” to search the
                          catalog.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, index) => (
                        <TableRow key={`${row.sku}-${index}`}>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {row.product}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.sku}
                              {row.brand ? ` · ${row.brand}` : ""}
                              {row.category ? ` · ${row.category}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.hsn || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.uom || "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                            {row.stock ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              className="w-20 text-right"
                              value={row.qty}
                              onChange={(e) =>
                                updateLine(index, { qty: e.target.value })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              className="w-28 text-right"
                              value={row.rate}
                              onChange={(e) =>
                                updateLine(index, { rate: e.target.value })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatINR(row.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProductSearchOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add product
              </Button>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order Total</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatINR(total)}
                </p>
              </div>
              <Button type="submit">
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                Create Sales Order
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* Product search + detail dialog */}
      <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
        <DialogContent className="max-w-2xl">
          {selectedProduct ? (
            /* Step B — product detail form (mirrors the Product Sales view) */
            <ProductDetailForm
              product={selectedProduct}
              qty={draftQty}
              rate={draftRate}
              onQty={setDraftQty}
              onRate={setDraftRate}
              onBack={() => setSelectedProduct(null)}
              onConfirm={confirmAddProduct}
              alreadyOnOrder={lines.some((l) => l.sku === selectedProduct.sku)}
            />
          ) : (
            /* Step A — search list */
            <>
              <DialogHeader>
                <DialogTitle>Add product</DialogTitle>
                <DialogDescription>
                  Search the catalog by name, SKU, brand or category. Pick a
                  product to view its full details before adding.
                </DialogDescription>
              </DialogHeader>
              <div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={productSearchRef}
                    autoComplete="off"
                    className="pl-9"
                    placeholder="Search products…"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                  />
                </div>

                <div className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto">
                  {productMatches.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No products match “{productQuery}”.
                    </p>
                  ) : (
                    productMatches.map((p) => {
                      const onOrder = lines.some((l) => l.sku === p.sku);
                      return (
                        <button
                          key={p.sku}
                          type="button"
                          onClick={() => openProductDetail(p)}
                          className="flex w-full items-start gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/60"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Package className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {p.name}
                              </span>
                              {onOrder && (
                                <StatusBadge variant="info">
                                  On order
                                </StatusBadge>
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {p.sku} · {p.brand} · {p.category}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span>HSN {p.hsn}</span>
                              <span>UOM {p.uom}</span>
                              <span>GST {p.gst}%</span>
                              <span>Stock {p.stock}</span>
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-semibold tabular-nums text-foreground">
                              {formatINR(p.rate)}
                            </span>
                            <span className="mt-1 inline-flex items-center text-xs font-medium text-primary">
                              View details →
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * Product detail form shown inside the Add-product dialog. Mirrors the
 * Product Sales detail view (overview grid) and adds editable qty/rate plus a
 * live line-total before the product is added to the order.
 */
const ProductDetailForm = ({
  product,
  qty,
  rate,
  onQty,
  onRate,
  onBack,
  onConfirm,
  alreadyOnOrder,
}) => {
  const lineTotal = (Number(qty) || 0) * (Number(rate) || 0);
  const fields = [
    { label: "SKU", value: product.sku },
    { label: "Category", value: product.category },
    { label: "Brand", value: product.brand },
    { label: "HSN", value: product.hsn },
    { label: "UOM", value: product.uom },
    { label: "GST", value: `${product.gst}%` },
    { label: "In Stock", value: product.stock },
    { label: "List Rate", value: formatINR(product.rate) },
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {product.name}
          {alreadyOnOrder && (
            <StatusBadge variant="info">Already on order</StatusBadge>
          )}
        </DialogTitle>
        <DialogDescription>
          Product details — review and set quantity/rate before adding.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <div className="rounded-lg border border-border p-4">
          <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
            Overview
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {f.label}
                </p>
                <p className="text-sm font-medium tabular-nums">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="detail-qty">Quantity</Label>
            <Input
              id="detail-qty"
              type="number"
              min="1"
              value={qty}
              onChange={(e) => onQty(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="detail-rate">Rate (₹)</Label>
            <Input
              id="detail-rate"
              type="number"
              min="0"
              value={rate}
              onChange={(e) => onRate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Line total</Label>
            <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-semibold tabular-nums">
              {formatINR(lineTotal)}
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to search
        </Button>
        <Button type="button" onClick={onConfirm}>
          <Plus className="mr-1.5 h-4 w-4" />
          {alreadyOnOrder ? "Update on order" : "Add to order"}
        </Button>
      </DialogFooter>
    </>
  );
};

export default CreateSalesOrderFromQuotation;
