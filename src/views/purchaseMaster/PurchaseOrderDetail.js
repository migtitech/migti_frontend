import React from "react";
import { useParams } from "react-router-dom";
import {
  Package,
  IndianRupee,
  MapPin,
  FileText,
  Clock,
  Truck,
  Download,
  CheckCircle2,
} from "lucide-react";
import { PageHeader, StatusBadge } from "../../components";
import {
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import {
  DetailSection,
  DetailGrid,
  DetailTimeline,
  DetailNotFound,
  formatINR,
} from "./components/DetailPrimitives";
import { getPurchaseOrderDetail } from "../../data/purchaseMasterDummyData";

const lineAmount = (l) => Number(l.qty) * Number(l.rate);
const lineGst = (l) => (lineAmount(l) * Number(l.gstPercent || 0)) / 100;

/**
 * Purchase Order — full detail page. Shows the whole order end-to-end: supplier
 * & order meta, line items with GST and totals, billing/shipping addresses,
 * terms, payment terms, GRN/receipt status and a timeline. "Download PO" builds
 * a text blob. Sample data only.
 */
const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const data = getPurchaseOrderDetail(id);

  if (data.notFound) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Purchase Order ${id}`}
          back="/purchase-master/purchase-order"
        />
        <DetailNotFound label="Purchase Order" id={id} />
      </div>
    );
  }

  const subtotal = data.lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const gstTotal = data.lines.reduce((sum, l) => sum + lineGst(l), 0);
  const grandTotal = subtotal + gstTotal;

  const hodVariant = statusVariant(
    data.hodVerification === "pending" ? "pending" : data.hodVerification,
  );

  const handleDownload = () => {
    const lines = [
      `PURCHASE ORDER: ${data.id}`,
      `Date: ${data.date}`,
      `Supplier: ${data.supplier} (${data.supplierCode})`,
      `Expected Delivery: ${data.expectedDelivery}`,
      "",
      `Bill To: ${data.billingAddress.company}, ${data.billingAddress.line}, ${data.billingAddress.city}, ${data.billingAddress.state} ${data.billingAddress.pincode} (GSTIN ${data.billingAddress.gstin})`,
      `Ship To: ${data.shippingAddress.company}, ${data.shippingAddress.line}, ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.pincode}`,
      "",
      "Items:",
      ...data.lines.map(
        (l) =>
          `  - ${l.name} (${l.sku}) x ${l.qty} @ ${formatINR(l.rate)} = ${formatINR(lineAmount(l))} (GST ${l.gstPercent}%)`,
      ),
      "",
      `Subtotal: ${formatINR(subtotal)}`,
      `GST: ${formatINR(gstTotal)}`,
      `Grand Total: ${formatINR(grandTotal)}`,
      "",
      `Payment: ${data.paymentTerms.type} · ${data.paymentTerms.mode} · Due ${data.paymentTerms.dueDate}`,
      "",
      "Terms & Conditions:",
      data.terms,
      "",
      `HOD Verification: ${String(data.hodVerification).toUpperCase()}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Purchase Order · ${data.id}`}
        description={data.supplier}
        back="/purchase-master/purchase-order"
        actions={
          <Button type="button" variant="outline" onClick={handleDownload}>
            <Download className="mr-1.5 h-4 w-4" />
            Download PO
          </Button>
        }
      />

      {/* Snapshot chips */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={data.status}
          variant={statusVariant(data.status)}
        />
        <Badge variant={hodVariant}>HOD: {data.hodVerification}</Badge>
        <Badge variant={data.paymentTerms.paid ? "success" : "warning"}>
          {data.paymentTerms.paid ? "Paid" : "Unpaid"}
        </Badge>
        <Badge
          variant={data.receipt.materialReceived ? "success" : "secondary"}
        >
          {data.receipt.materialReceived ? "Material Received" : "Not Received"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailSection title="Supplier & Order" icon={Package}>
            <DetailGrid
              items={[
                { label: "Supplier", value: data.supplier },
                { label: "Supplier Code", value: data.supplierCode },
                { label: "Contact", value: data.supplierContact },
                { label: "Created By", value: data.createdBy },
                { label: "PO Date", value: data.date },
                { label: "Expected Delivery", value: data.expectedDelivery },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Line Items"
            icon={IndianRupee}
            description="Products ordered, with GST and amount per line."
          >
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">GST%</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {l.sku}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.qty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(l.rate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.gstPercent}%
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatINR(lineAmount(l))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span className="tabular-nums">{formatINR(gstTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatINR(grandTotal)}</span>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Billing Address" icon={MapPin}>
            <DetailGrid
              items={[
                { label: "Company", value: data.billingAddress.company },
                { label: "Address", value: data.billingAddress.line },
                { label: "City", value: data.billingAddress.city },
                { label: "State", value: data.billingAddress.state },
                { label: "Pincode", value: data.billingAddress.pincode },
                { label: "GSTIN", value: data.billingAddress.gstin },
              ]}
            />
          </DetailSection>

          <DetailSection title="Shipping Address" icon={Truck}>
            <DetailGrid
              items={[
                { label: "Company", value: data.shippingAddress.company },
                { label: "Address", value: data.shippingAddress.line },
                { label: "City", value: data.shippingAddress.city },
                { label: "State", value: data.shippingAddress.state },
                { label: "Pincode", value: data.shippingAddress.pincode },
              ]}
            />
          </DetailSection>

          <DetailSection title="Terms & Conditions" icon={FileText}>
            <pre className="whitespace-pre-wrap text-sm text-foreground">
              {data.terms}
            </pre>
          </DetailSection>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <DetailSection title="Payment Terms" icon={IndianRupee}>
            <DetailGrid
              columns={2}
              items={[
                { label: "Type", value: data.paymentTerms.type },
                {
                  label: "Credit Days",
                  value:
                    data.paymentTerms.type === "credit"
                      ? `${data.paymentTerms.creditDays} days`
                      : "—",
                },
                {
                  label: "Advance %",
                  value: `${data.paymentTerms.advancePercent}%`,
                },
                { label: "Mode", value: data.paymentTerms.mode },
                { label: "Due Date", value: data.paymentTerms.dueDate },
                {
                  label: "Paid",
                  value: (
                    <Badge
                      variant={data.paymentTerms.paid ? "success" : "warning"}
                    >
                      {data.paymentTerms.paid ? "Paid" : "Unpaid"}
                    </Badge>
                  ),
                },
              ]}
            />
          </DetailSection>

          <DetailSection title="Receipt / GRN" icon={CheckCircle2}>
            <DetailGrid
              columns={2}
              items={[
                {
                  label: "GRN",
                  value: data.receipt.grn || "—",
                  full: true,
                },
                {
                  label: "Material Received",
                  value: (
                    <Badge
                      variant={
                        data.receipt.materialReceived ? "success" : "secondary"
                      }
                    >
                      {data.receipt.materialReceived ? "Yes" : "No"}
                    </Badge>
                  ),
                },
                data.receipt.receivedQty != null && {
                  label: "Received / Ordered",
                  value: `${data.receipt.receivedQty} / ${data.receipt.orderedQty}`,
                },
                { label: "Note", value: data.receipt.note, full: true },
              ]}
            />
          </DetailSection>

          <DetailSection title="Timeline" icon={Clock}>
            <DetailTimeline items={data.timeline} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetail;
