import React, { useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  FileText,
  Download,
  Send,
  ShieldAlert,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
} from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  suppliers,
  purchaseOrderCatalog,
  purchaseOrders as initialPurchaseOrders,
} from "../../data/purchaseMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const DEFAULT_TERMS =
  "1. Delivery within 7 working days of PO date.\n2. Payment: 50% advance, 50% on GRN.\n3. Goods must match approved sample/specification.\n4. Any damage/shortage to be reported within 48 hours of receipt.";

const TODAY = new Date().toISOString().slice(0, 10);

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

/**
 * Create Purchase Order: select supplier → select product(s) → terms &
 * conditions → generate. HOD verification is required before a PO can be
 * sent to the supplier. Sample/demo form — not wired to the backend.
 */
const PurchaseOrder = () => {
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState([{ sku: "", qty: 1 }]);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [generatedPo, setGeneratedPo] = useState(null);
  const [orders, setOrders] = useState(initialPurchaseOrders);
  const nextPoNumberRef = useRef(3342);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const catalogForSupplier = useMemo(
    () =>
      supplier
        ? purchaseOrderCatalog.filter((p) => p.category === supplier.category)
        : [],
    [supplier],
  );

  const addLine = () => setLines((prev) => [...prev, { sku: "", qty: 1 }]);
  const removeLine = (index) =>
    setLines((prev) => prev.filter((_, i) => i !== index));
  const updateLine = (index, patch) =>
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );

  const rows = useMemo(
    () =>
      lines.map((line) => {
        const product = catalogForSupplier.find((p) => p.sku === line.sku);
        const qty = Number(line.qty) || 0;
        const amount = product ? product.rate * qty : 0;
        return { ...line, product, amount };
      }),
    [lines, catalogForSupplier],
  );

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!supplier) {
      toastError("Select a supplier before generating the purchase order.");
      return;
    }
    if (!rows.some((r) => r.product && r.qty > 0)) {
      toastError("Add at least one product line.");
      return;
    }
    const po = {
      id: `PO-${nextPoNumberRef.current++}`,
      supplier: supplier.name,
      items: rows.filter((r) => r.product).length,
      amount: total,
      hodVerification: "pending",
      status: "draft",
      date: TODAY,
      lines: rows.filter((r) => r.product),
      terms,
    };
    setGeneratedPo(po);
    setOrders((prev) => [po, ...prev]);
    toastSuccess(
      `Purchase Order ${po.id} generated — awaiting HOD verification (sample UI, not saved)`,
    );
  };

  const handleDownload = () => {
    if (!generatedPo) return;
    const lines = [
      `PURCHASE ORDER: ${generatedPo.id}`,
      `Date: ${generatedPo.date}`,
      `Supplier: ${generatedPo.supplier}`,
      "",
      "Items:",
      ...generatedPo.lines.map(
        (l) =>
          `  - ${l.product.name} x ${l.qty} @ ${formatINR(l.product.rate)} = ${formatINR(l.amount)}`,
      ),
      "",
      `Total: ${formatINR(generatedPo.amount)}`,
      "",
      "Terms & Conditions:",
      generatedPo.terms,
      "",
      `HOD Verification: ${generatedPo.hodVerification.toUpperCase()}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedPo.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = () => {
    if (!generatedPo) return;
    if (generatedPo.hodVerification !== "verified") {
      toastError("This PO cannot be sent until HOD verification is complete.");
      return;
    }
    toastSuccess(
      `Purchase Order ${generatedPo.id} sent to ${generatedPo.supplier} (sample UI, not sent)`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Order"
        description="Select supplier, select products, set terms and generate a purchase order. Sample/demo — not wired to backend."
      />

      <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning!" />
        <p>
          <strong>HOD verification is mandatory</strong> — a purchase order
          cannot be sent to the supplier until the HOD has verified it.
        </p>
      </div>

      <form onSubmit={handleGenerate}>
        <Card>
          <CardHeader>
            <CardTitle>New Purchase Order</CardTitle>
            <CardDescription>
              Products are limited to your selected supplier's category.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="po-supplier">Supplier</Label>
              <Select
                id="po-supplier"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setLines([{ sku: "", qty: 1 }]);
                }}
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </Select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">&nbsp;</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={row.sku}
                          disabled={!supplier}
                          onChange={(e) =>
                            updateLine(index, { sku: e.target.value })
                          }
                        >
                          <option value="">Select product…</option>
                          {catalogForSupplier.map((p) => (
                            <option key={p.sku} value={p.sku}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.product ? formatINR(row.product.rate) : "—"}
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
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatINR(row.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              disabled={!supplier}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add product
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="po-terms">Terms &amp; Conditions</Label>
              <Textarea
                id="po-terms"
                rows={5}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Order Total</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatINR(total)}
              </p>
            </div>
            <Button type="submit">
              <FileText className="mr-1.5 h-4 w-4" />
              Generate Purchase Order
            </Button>
          </CardFooter>
        </Card>
      </form>

      {generatedPo && (
        <Card>
          <CardHeader>
            <CardTitle>Generated: {generatedPo.id}</CardTitle>
            <CardDescription>
              Awaiting HOD verification before this can be sent to{" "}
              {generatedPo.supplier}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant={statusVariant("pending")}>
              HOD Verification: {generatedPo.hodVerification}
            </Badge>
            <Button type="button" variant="outline" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              Download PO
            </Button>
            <Button type="button" onClick={handleSend}>
              <Send className="mr-1.5 h-4 w-4" />
              Send to Supplier
            </Button>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(r) => r.id}
        exportFileName="purchase-orders"
      />
    </div>
  );
};

export default PurchaseOrder;
