import React from "react";
import { useParams } from "react-router-dom";
import {
  Package,
  TrendingUp,
  IndianRupee,
  FileText,
  Clock,
} from "lucide-react";
import { PageHeader } from "../../components";
import {
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import {
  DetailSection,
  DetailGrid,
  DetailTimeline,
  DetailNotFound,
  formatINR,
} from "./components/DetailPrimitives";
import {
  getPurchaseHistoryDetail,
  purchaseHistoryPaymentMeta,
} from "../../data/purchaseMasterDummyData";

/**
 * Purchase History — full detail page for one product's purchase record. Shows
 * the product & purchase context, the supplier/buyer trail, a price trend over
 * recent months, payment status, remark and a timeline. Total purchase amount
 * is intentionally NOT shown anywhere, per policy — only per-product old vs
 * current price. Sample data only.
 */
const PurchaseHistoryDetail = () => {
  const { id } = useParams();
  const data = getPurchaseHistoryDetail(id);

  if (data.notFound) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Purchase History ${id}`}
          back="/purchase-master/purchase-history"
        />
        <DetailNotFound label="Purchase History" id={id} />
      </div>
    );
  }

  const payment = purchaseHistoryPaymentMeta[data.paymentStatus] || {
    label: data.paymentStatus,
    variant: "secondary",
  };

  const diff = data.currentPrice - data.oldPrice;
  const pct = data.oldPrice ? ((diff / data.oldPrice) * 100).toFixed(1) : "0.0";
  const changeClass =
    diff > 0 ? "text-destructive" : diff < 0 ? "text-success!" : "";

  const lastIndex = data.priceHistory.length - 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Purchase History · ${data.product}`}
        description={`${data.supplier} — ${data.category}`}
        back="/purchase-master/purchase-history"
      />

      {/* Snapshot chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={data.mode === "brand" ? "info" : "secondary"}>
          {data.mode === "brand" ? "Brand" : "Local"}
        </Badge>
        <Badge variant={payment.variant}>{payment.label}</Badge>
        <Badge variant="secondary">{data.rawProductCode}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DetailSection title="Product & Purchase" icon={Package}>
            <DetailGrid
              items={[
                { label: "Product", value: data.product },
                { label: "Product Code", value: data.rawProductCode },
                { label: "Category", value: data.category },
                {
                  label: "Mode",
                  value: data.mode === "brand" ? "Brand" : "Local",
                },
                { label: "Unit", value: data.unit },
                { label: "Quantity", value: `${data.qty} ${data.unit}` },
                { label: "Supplier", value: data.supplier },
                { label: "Supplier Code", value: data.supplierCode },
                { label: "Buyer", value: data.buyer },
                { label: "Purchased On", value: data.purchasedOn },
                { label: "PO Code", value: data.poCode },
                { label: "Query Code", value: data.queryCode },
                { label: "GRN", value: data.grn },
              ]}
            />
          </DetailSection>

          <DetailSection
            title="Price Trend"
            icon={TrendingUp}
            description="Rate over recent months. Total purchase amount is not shown — only per-product price movement."
          >
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {data.priceTrendMonths.map((month) => (
                      <TableHead key={month} className="text-right">
                        {month}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {data.priceHistory.map((value, i) => (
                      <TableCell
                        key={i}
                        className={`text-right tabular-nums ${
                          i === lastIndex ? "font-semibold text-foreground" : ""
                        }`}
                      >
                        {formatINR(value)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Old Price
                </span>
                <p className="mt-1 tabular-nums text-foreground">
                  {formatINR(data.oldPrice)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current Price
                </span>
                <p className="mt-1 tabular-nums text-foreground">
                  {formatINR(data.currentPrice)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Change
                </span>
                <p className={`mt-1 tabular-nums ${changeClass}`}>
                  {diff > 0 ? "+" : ""}
                  {pct}%
                </p>
              </div>
            </div>
          </DetailSection>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <DetailSection title="Payment" icon={IndianRupee}>
            <DetailGrid
              columns={2}
              items={[
                {
                  label: "Payment Status",
                  value: (
                    <Badge variant={payment.variant}>{payment.label}</Badge>
                  ),
                  full: true,
                },
              ]}
            />
          </DetailSection>

          <DetailSection title="Remark" icon={FileText}>
            <p className="text-sm text-foreground">{data.remark || "—"}</p>
          </DetailSection>

          <DetailSection title="Timeline" icon={Clock}>
            <DetailTimeline items={data.timeline} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
};

export default PurchaseHistoryDetail;
