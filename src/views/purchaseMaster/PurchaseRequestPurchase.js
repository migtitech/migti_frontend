import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Trash2,
  Plus,
  CheckCircle2,
  Factory,
  Package,
  ShoppingCart,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
} from "../../components/ui";
import { PageHeader, BackButton } from "../../components";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  suppliers,
  purchaseOrderCatalog,
  purchaseRequests,
} from "../../data/purchaseMasterDummyData";

const formatInr = (value) =>
  value == null || Number.isNaN(Number(value))
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const lineAmount = (item) => {
  const qty = Number(item.qty);
  const rate = Number(item.rate);
  if (!Number.isFinite(qty) || !Number.isFinite(rate)) return 0;
  return qty * rate;
};

/**
 * Other Purchase — multi-product / single-supplier purchase flow. Same idea as
 * "Raise Billing Request", but here you pick ONE supplier and add MULTIPLE
 * products for that supplier in a single request. The product catalog is scoped
 * to the chosen supplier's category. When opened from a Purchases Request
 * (?pr=PR-xxxx) the matching supplier is pre-selected and the product is
 * pre-added. Frontend-only sample UI — submitting just toasts.
 */
const PurchaseRequestPurchase = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prId = searchParams.get("pr")?.trim() || "";
  const sourcePr = purchaseRequests.find((r) => r.id === prId);

  // Pre-select the supplier that was assigned on the source request, if any.
  const initialSupplier = sourcePr
    ? suppliers.find((s) => s.name === sourcePr.supplier)
    : null;

  const [supplierId, setSupplierId] = useState(initialSupplier?.id || "");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  // Pre-add the source product line when arriving from a request.
  const [cart, setCart] = useState(() => {
    if (!sourcePr) return [];
    const match = purchaseOrderCatalog.find((p) => p.name === sourcePr.product);
    if (!match) return [];
    return [
      {
        sku: match.sku,
        name: match.name,
        qty: String(sourcePr.qty || 1),
        rate: String(match.rate),
      },
    ];
  });

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) || null;

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q),
    );
  }, [supplierSearch]);

  // Catalog scoped to the selected supplier's category.
  const catalog = useMemo(() => {
    if (!selectedSupplier) return [];
    const q = productSearch.trim().toLowerCase();
    return purchaseOrderCatalog
      .filter((p) => p.category === selectedSupplier.category)
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  }, [selectedSupplier, productSearch]);

  const total = cart.reduce((sum, item) => sum + lineAmount(item), 0);

  const addProduct = (product) => {
    if (cart.some((c) => c.sku === product.sku)) {
      toastError("This product is already in the list.");
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        sku: product.sku,
        name: product.name,
        qty: "1",
        rate: String(product.rate),
      },
    ]);
  };

  const patchLine = (sku, patch) =>
    setCart((prev) =>
      prev.map((item) => (item.sku === sku ? { ...item, ...patch } : item)),
    );

  const removeLine = (sku) =>
    setCart((prev) => prev.filter((item) => item.sku !== sku));

  const changeSupplier = (id) => {
    setSupplierId(id);
    // Products are category-scoped to the supplier, so clear the list.
    setCart([]);
    setProductSearch("");
  };

  const submit = () => {
    if (!supplierId) {
      toastError("Select a supplier first.");
      return;
    }
    if (cart.length === 0) {
      toastError("Add at least one product to purchase.");
      return;
    }
    const invalid = cart.find(
      (item) => !(Number(item.qty) > 0) || !(Number(item.rate) > 0),
    );
    if (invalid) {
      toastError("Every product needs a quantity and rate greater than zero.");
      return;
    }
    toastSuccess(
      `Purchase raised for ${selectedSupplier?.name} — ${cart.length} product${
        cart.length > 1 ? "s" : ""
      }, total ${formatInr(total)}. Track it under Raised Purchases (sample UI, not saved)`,
    );
    navigate("/raised-purchases");
  };

  return (
    <div className="space-y-6">
      <div>
        <BackButton fallback="/purchase-request-bucket" />
      </div>

      <PageHeader
        title="Other Purchase"
        description="Pick one supplier, then add multiple products to buy from them in a single request. Sample data for UI preview."
      />

      {sourcePr && (
        <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
          <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p>
            Started from <strong>{sourcePr.id}</strong> ({sourcePr.product}).
            The assigned supplier and product are pre-loaded — add more products
            from the same supplier below.
          </p>
        </div>
      )}

      {/* ── Step 1: Supplier ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              1
            </span>
            <div>
              <div className="font-semibold">Select supplier</div>
              <div className="text-sm text-muted-foreground">
                One supplier per purchase request.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <Label className="mb-1">Search supplier</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  placeholder="Name, category or city…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="md:col-span-7">
              <Label className="mb-1">Supplier</Label>
              <Select
                value={supplierId}
                onChange={(e) => changeSupplier(e.target.value)}
              >
                <option value="">— Select supplier —</option>
                {filteredSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.category} · {s.city}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {selectedSupplier && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <Factory className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{selectedSupplier.name}</span>
              <Badge variant="secondary">{selectedSupplier.category}</Badge>
              <span className="text-muted-foreground">
                {selectedSupplier.contact} · {selectedSupplier.phone}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2: Products ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              2
            </span>
            <div>
              <div className="font-semibold">Add products</div>
              <div className="text-sm text-muted-foreground">
                Add as many products as you need from this supplier.
              </div>
            </div>
          </div>

          {!selectedSupplier ? (
            <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-6 w-6" />
              Select a supplier first to see their products.
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={`Search ${selectedSupplier.category} products…`}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-col gap-2">
                {catalog.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No products found for this supplier.
                  </div>
                ) : (
                  catalog.map((p) => {
                    const inCart = cart.some((c) => c.sku === p.sku);
                    return (
                      <div
                        key={p.sku}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.sku} · Rate {formatInr(p.rate)}
                          </div>
                        </div>
                        {inCart ? (
                          <Badge variant="success" className="shrink-0">
                            Added ✓
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => addProduct(p)}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Step 3: Review ───────────────────────────────────────────── */}
      {cart.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                3
              </span>
              <div>
                <div className="font-semibold">
                  Review products
                  <Badge className="ml-2">{cart.length}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Set quantity and rate for each product.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {cart.map((item) => (
                <div
                  key={item.sku}
                  className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-12"
                >
                  <div className="sm:col-span-5">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.sku}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1 text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.qty}
                      onChange={(e) =>
                        patchLine(item.sku, { qty: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1 text-xs">Rate</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) =>
                        patchLine(item.sku, { rate: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1 text-xs">Amount</Label>
                    <div className="flex h-9 items-center font-semibold tabular-nums">
                      {formatInr(lineAmount(item))}
                    </div>
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => removeLine(item.sku)}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
              <span className="font-semibold">Total amount</span>
              <span className="text-lg font-bold tabular-nums">
                {formatInr(total)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit bar */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-background py-3">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/purchase-request-bucket")}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Raise Purchase ({cart.length})
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequestPurchase;
