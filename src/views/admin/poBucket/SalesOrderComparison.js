import React, { useMemo } from "react";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

const toNum = (value) => {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const lineTotal = (product) => {
  const qty = Number(product?.quantity) || 0;
  const rate = Number(product?.rate) || 0;
  const before = qty * rate;
  const discount =
    product?.applyDiscount &&
    product?.discountPercentage !== "" &&
    product?.discountPercentage != null
      ? (before * Number(product.discountPercentage || 0)) / 100
      : 0;
  return Math.max(0, before - discount);
};

const inr = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

/** Match a Sales Order product line to its originating quotation product line. */
const matchQuotationLine = (soProduct, quotationProducts) => {
  if (!Array.isArray(quotationProducts) || quotationProducts.length === 0) {
    return null;
  }
  const qLineIdx = soProduct?.quotationLineIndex;
  if (qLineIdx != null && quotationProducts[qLineIdx]) {
    return quotationProducts[qLineIdx];
  }
  const rawCode = String(soProduct?.rawProductCode || "").trim();
  if (rawCode) {
    const byCode = quotationProducts.find(
      (q) => String(q?.rawProductCode || "").trim() === rawCode,
    );
    if (byCode) return byCode;
  }
  const pid =
    soProduct?.product_id && typeof soProduct.product_id === "object"
      ? String(soProduct.product_id._id || "")
      : String(soProduct?.product_id || "");
  if (pid && OBJECT_ID_RE.test(pid)) {
    const byPid = quotationProducts.find((q) => {
      const qpid =
        q?.product_id && typeof q.product_id === "object"
          ? String(q.product_id._id || "")
          : String(q?.product_id || "");
      return qpid === pid;
    });
    if (byPid) return byPid;
  }
  const name = String(soProduct?.productName || "")
    .trim()
    .toLowerCase();
  if (name) {
    return (
      quotationProducts.find(
        (q) =>
          String(q?.productName || "")
            .trim()
            .toLowerCase() === name,
      ) || null
    );
  }
  return null;
};

const DeltaBadge = ({ soValue, qValue, money = false }) => {
  const so = toNum(soValue);
  const q = toNum(qValue);
  if (so == null || q == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const diff = so - q;
  if (Math.abs(diff) < 0.005) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> Same
      </span>
    );
  }
  const up = diff > 0;
  const text = money
    ? `${up ? "+" : "−"}${inr(Math.abs(diff)).slice(1)}`
    : `${up ? "+" : "−"}${Math.abs(diff).toLocaleString("en-IN")}`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        up ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {text}
    </span>
  );
};

const SummaryTile = ({ label, primary, secondary, tone = "default" }) => {
  const toneClasses =
    tone === "quotation"
      ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40"
      : tone === "sales"
        ? "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40"
        : "border-border bg-muted/40";
  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{primary}</div>
      {secondary ? (
        <div className="mt-0.5 text-sm text-muted-foreground">{secondary}</div>
      ) : null}
    </div>
  );
};

/**
 * One-window comparison of what was quoted (quotation) vs what the sales order
 * carries. Read-only. Clicking a row opens the product detail modal.
 */
const SalesOrderComparison = ({
  quotation,
  quotationLoading,
  products,
  onOpenProduct,
}) => {
  const quotationProducts = Array.isArray(quotation?.products)
    ? quotation.products
    : [];

  const rows = useMemo(
    () =>
      (products || []).map((so, index) => {
        const q = matchQuotationLine(so, quotationProducts);
        return {
          index,
          so,
          q,
          soTotal: lineTotal(so),
          qTotal: q ? lineTotal(q) : null,
        };
      }),
    [products, quotationProducts],
  );

  const quotationTotal = useMemo(
    () => rows.reduce((sum, r) => sum + (r.qTotal != null ? r.qTotal : 0), 0),
    [rows],
  );
  const salesTotal = useMemo(
    () => rows.reduce((sum, r) => sum + (r.soTotal || 0), 0),
    [rows],
  );
  const matchedCount = rows.filter((r) => r.q).length;
  const grandDelta = salesTotal - quotationTotal;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Quotation value"
          tone="quotation"
          primary={inr(quotationTotal)}
          secondary={
            quotation?.quotationCode ? `#${quotation.quotationCode}` : "—"
          }
        />
        <SummaryTile
          label="Sales order value"
          tone="sales"
          primary={inr(salesTotal)}
          secondary={`${products?.length || 0} item(s)`}
        />
        <SummaryTile
          label="Difference (SO − Quote)"
          primary={
            <span
              className={
                grandDelta > 0.005
                  ? "text-emerald-600"
                  : grandDelta < -0.005
                    ? "text-rose-600"
                    : ""
              }
            >
              {grandDelta >= 0 ? "+" : "−"}
              {inr(Math.abs(grandDelta)).slice(1)}
            </span>
          }
          secondary={
            quotationTotal > 0
              ? `${((grandDelta / quotationTotal) * 100).toFixed(1)}% vs quote`
              : "—"
          }
        />
        <SummaryTile
          label="Lines matched to quote"
          primary={`${matchedCount} / ${products?.length || 0}`}
          secondary={
            matchedCount === (products?.length || 0)
              ? "All lines traced"
              : "Some lines added later"
          }
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="min-w-[200px]">Product</TableHead>
                  <TableHead className="text-center">
                    Qty (Quote → SO)
                  </TableHead>
                  <TableHead className="text-center">
                    Rate (Quote → SO)
                  </TableHead>
                  <TableHead className="text-right">Quote total</TableHead>
                  <TableHead className="text-right">SO total</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotationLoading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Loading quotation…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No products on this sales order.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow
                      key={r.so._id || r.index}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => onOpenProduct?.(r.index)}
                    >
                      <TableCell className="font-semibold text-muted-foreground">
                        {r.index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">
                              {r.so.productName || "—"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {r.so.rawProductCode ? (
                                <span className="font-mono">
                                  {r.so.rawProductCode}
                                </span>
                              ) : null}
                              {r.q ? (
                                <Badge
                                  variant="secondary"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  from quote
                                </Badge>
                              ) : (
                                <Badge
                                  variant="warning"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  added later
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
                          <span className="text-muted-foreground">
                            {r.q ? (r.q.quantity ?? "—") : "—"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold">
                            {r.so.quantity ?? "—"}
                          </span>
                        </div>
                        <div>
                          <DeltaBadge
                            soValue={r.so.quantity}
                            qValue={r.q?.quantity}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
                          <span className="text-muted-foreground">
                            {r.q?.rate != null ? inr(r.q.rate) : "—"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold">
                            {r.so.rate != null ? inr(r.so.rate) : "—"}
                          </span>
                        </div>
                        <div>
                          <DeltaBadge
                            soValue={r.so.rate}
                            qValue={r.q?.rate}
                            money
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r.qTotal != null ? inr(r.qTotal) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {inr(r.soTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeltaBadge
                          soValue={r.soTotal}
                          qValue={r.qTotal}
                          money
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { matchQuotationLine, lineTotal };
export default SalesOrderComparison;
