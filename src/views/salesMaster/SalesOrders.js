import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ShoppingCart,
  PackageCheck,
  Clock,
  FileText,
  Search,
  Package,
  Flag,
  Paperclip,
  ArrowLeft,
  Upload,
  X,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Button,
  Label,
  Input,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../../components/ui";
import {
  formatOrderStatus,
  statusVariant,
} from "./components/statusFormatters";
import {
  salesOrdersFromQuotation,
  salesOrderCatalog,
} from "../../data/salesMasterDummyData";
import { toastSuccess, toastError } from "../../utils/toast";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const columns = [
  { key: "id", label: "Order #", sortable: true },
  {
    key: "quotationId",
    label: "From Quotation",
    sortable: true,
    render: (row) => (
      <span className="font-medium text-primary">{row.quotationId}</span>
    ),
  },
  { key: "client", label: "Client", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "items", label: "Items", sortable: true, align: "right" },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.amount),
    sortValue: (row) => row.amount,
  },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge variant={statusVariant(row.status)}>
        {formatOrderStatus(row.status)}
      </StatusBadge>
    ),
  },
];

/**
 * Sales Orders list — every row here was created by converting a quotation
 * into a sales order. The "New Sales Order" button opens a form that first
 * asks for a quotation number, then auto-fills its details.
 *
 * Header tools (Add Product / Set Priority / Attachment) were moved here from
 * the PO Bucket detail page. Presentational-only: reads sample data and the
 * tool dialogs are toast-only (not wired to the backend).
 */
const SalesOrders = () => {
  const navigate = useNavigate();
  const orders = salesOrdersFromQuotation;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const inProgress = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed",
  ).length;
  const totalValue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

  // --- Add Product dialog -------------------------------------------------
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [draftQty, setDraftQty] = useState(1);
  const [draftRate, setDraftRate] = useState(0);
  const productSearchRef = useRef(null);

  useEffect(() => {
    if (addProductOpen) {
      setProductQuery("");
      setSelectedProduct(null);
      const t = setTimeout(() => productSearchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [addProductOpen]);

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

  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setDraftQty(1);
    setDraftRate(product.rate);
  };

  const confirmAddProduct = () => {
    const qty = Number(draftQty) || 0;
    if (qty <= 0) {
      toastError("Enter a quantity of at least 1.");
      return;
    }
    toastSuccess(
      `${selectedProduct.name} × ${qty} added (sample UI, not saved).`,
    );
    setAddProductOpen(false);
  };

  // --- Set Priority dialog ------------------------------------------------
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [priority, setPriority] = useState("medium");

  const savePriority = () => {
    const label =
      PRIORITY_OPTIONS.find((p) => p.value === priority)?.label || priority;
    toastSuccess(`Priority set to ${label} (sample UI, not saved).`);
    setPriorityOpen(false);
  };

  // --- Attachment dialog --------------------------------------------------
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  const saveAttachment = () => {
    if (!attachedFile) {
      toastError("Choose a file to attach first.");
      return;
    }
    toastSuccess(`Attached “${attachedFile.name}” (sample UI, not saved).`);
    setAttachmentOpen(false);
    setAttachedFile(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Sales orders created from converted quotations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setAddProductOpen(true)}>
              <Package className="mr-1.5 h-4 w-4" />
              Add Product
            </Button>
            <Button variant="outline" onClick={() => setPriorityOpen(true)}>
              <Flag className="mr-1.5 h-4 w-4" />
              Set Priority
            </Button>
            <Button variant="outline" onClick={() => setAttachmentOpen(true)}>
              <Paperclip className="mr-1.5 h-4 w-4" />
              Attachment
            </Button>
            <Button onClick={() => navigate("/sales-master/sales-orders/new")}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Sales Order
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={orders.length}
          icon={ShoppingCart}
          color="primary"
        />
        <StatCard
          title="Delivered"
          value={delivered}
          icon={PackageCheck}
          color="success"
        />
        <StatCard
          title="In Progress"
          value={inProgress}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Order Value"
          value={formatINR(totalValue)}
          icon={FileText}
          color="info"
        />
      </div>

      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(r) => r.id}
        exportFileName="sales-orders"
        onRowClick={(row) => navigate(`/sales-master/sales-order/${row.id}`)}
      />

      {/* Add Product — search + detail */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-2xl">
          {selectedProduct ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
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
                    {[
                      { label: "SKU", value: selectedProduct.sku },
                      { label: "Category", value: selectedProduct.category },
                      { label: "Brand", value: selectedProduct.brand },
                      { label: "HSN", value: selectedProduct.hsn },
                      { label: "UOM", value: selectedProduct.uom },
                      { label: "GST", value: `${selectedProduct.gst}%` },
                      { label: "In Stock", value: selectedProduct.stock },
                      {
                        label: "List Rate",
                        value: formatINR(selectedProduct.rate),
                      },
                    ].map((f) => (
                      <div key={f.label}>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {f.label}
                        </p>
                        <p className="text-sm font-medium tabular-nums">
                          {f.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="so-qty">Quantity</Label>
                    <Input
                      id="so-qty"
                      type="number"
                      min="1"
                      value={draftQty}
                      onChange={(e) => setDraftQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="so-rate">Rate (₹)</Label>
                    <Input
                      id="so-rate"
                      type="number"
                      min="0"
                      value={draftRate}
                      onChange={(e) => setDraftRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Line total</Label>
                    <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-semibold tabular-nums">
                      {formatINR(
                        (Number(draftQty) || 0) * (Number(draftRate) || 0),
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedProduct(null)}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back to search
                </Button>
                <Button type="button" onClick={confirmAddProduct}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add product
                </Button>
              </DialogFooter>
            </>
          ) : (
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
                    productMatches.map((p) => (
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
                          <span className="block font-medium text-foreground">
                            {p.name}
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
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Set Priority */}
      <Dialog open={priorityOpen} onOpenChange={setPriorityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set priority</DialogTitle>
            <DialogDescription>
              Set the priority for this sales order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="so-priority">Priority</Label>
            <Select
              id="so-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriorityOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePriority}>
              <Flag className="mr-1.5 h-4 w-4" />
              Save priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment */}
      <Dialog
        open={attachmentOpen}
        onOpenChange={(open) => {
          setAttachmentOpen(open);
          if (!open) setAttachedFile(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attachment</DialogTitle>
            <DialogDescription>
              Attach a file to this sales order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.xlsx,.xls,.doc,.docx"
              onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
            />
            {attachedFile ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{attachedFile.name}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setAttachedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No file attached yet.
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Choose file
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAttachmentOpen(false);
                setAttachedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveAttachment}>Save attachment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrders;
