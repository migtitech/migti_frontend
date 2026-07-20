import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import rateLogService from "../../services/rateLogService";
import { PageHeader, StatCard, BackButton } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Badge,
  Separator,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";
import {
  Package,
  Building2,
  IndianRupee,
  History,
  User,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { SAMPLE_QUOTE_LOGS } from "../../data/sampleQuoteLogs";
import { QuotationStatusBadge } from "./QuoteLogsView";

const formatMoney = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0.00";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Build the same detail shape the API returns, from sample logs (newest first). */
const buildDetailFromLogs = (logs) => {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  const amounts = sorted
    .map((log) => Number(log.amount))
    .filter((n) => !Number.isNaN(n));

  const clientMap = new Map();
  for (const log of sorted) {
    const clientName = String(log.industry_name || "").trim() || "Unknown";
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        client_name: clientName,
        times_quoted: 0,
        latest_rate: Number(log.amount) || 0,
        latest_unit: log.unit || "",
        min_rate: Number.POSITIVE_INFINITY,
        max_rate: 0,
        last_quoted_at: log.created_at,
        first_quoted_at: log.created_at,
        entries: [],
      });
    }
    const client = clientMap.get(clientName);
    client.times_quoted += 1;
    const amount = Number(log.amount) || 0;
    client.min_rate = Math.min(client.min_rate, amount);
    client.max_rate = Math.max(client.max_rate, amount);
    client.first_quoted_at = log.created_at;
    client.entries.push(log);
  }
  const clients = [...clientMap.values()].map((client) => ({
    ...client,
    min_rate:
      client.min_rate === Number.POSITIVE_INFINITY ? 0 : client.min_rate,
  }));

  return {
    product: {
      title: sorted[0]?.product_title || "",
      descriptions: [
        ...new Set(sorted.map((log) => String(log.description || "").trim())),
      ].filter(Boolean),
      variants: [...new Set(sorted.flatMap((log) => log.variants || []))],
      units: [
        ...new Set(sorted.map((log) => String(log.unit || "").trim())),
      ].filter(Boolean),
    },
    summary: {
      total_quotes: sorted.length,
      unique_clients: clients.length,
      min_rate: amounts.length ? Math.min(...amounts) : 0,
      max_rate: amounts.length ? Math.max(...amounts) : 0,
      avg_rate: amounts.length
        ? amounts.reduce((sum, n) => sum + n, 0) / amounts.length
        : 0,
      latest_rate: Number(sorted[0]?.amount) || 0,
      first_quoted_at: sorted.length
        ? sorted[sorted.length - 1].created_at
        : null,
      last_quoted_at: sorted.length ? sorted[0].created_at : null,
    },
    clients,
    logs: sorted,
  };
};

const QuotationProductView = () => {
  const [searchParams] = useSearchParams();
  const productTitle = (searchParams.get("product") || "").trim();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [isSample, setIsSample] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchDetail = async () => {
      setLoading(true);
      setIsSample(false);
      try {
        const res = await rateLogService.getProductDetail(productTitle);
        const data = res?.data ?? res;
        const result = data?.data ?? data;
        if (cancelled) return;
        if (result?.logs?.length) {
          setDetail(result);
        } else {
          throw new Error("empty");
        }
      } catch (_err) {
        if (cancelled) return;
        const sampleLogs = SAMPLE_QUOTE_LOGS.filter(
          (log) =>
            log.product_title.toLowerCase() === productTitle.toLowerCase(),
        );
        if (sampleLogs.length) {
          setDetail(buildDetailFromLogs(sampleLogs));
          setIsSample(true);
        } else {
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (productTitle) {
      fetchDetail();
    } else {
      setDetail(null);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [productTitle]);

  const unitSuffix = useMemo(() => {
    const unit = detail?.product?.units?.[0];
    return unit ? ` / ${unit}` : "";
  }, [detail]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Spinner />
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <div className="mb-2">
          <BackButton fallback="/quotation-products" />
        </div>
        <PageHeader
          title={productTitle || "Quotation Product"}
          description="Product quote history"
        />
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No quote history found for this product yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { product, summary, clients, logs } = detail;

  return (
    <div>
      <div className="mb-2">
        <BackButton fallback="/quotation-products" />
      </div>
      <PageHeader
        title={product.title || "Quotation Product"}
        description="Complete quote history for this product — every client it was quoted to and at what rate."
      />
      {isSample && (
        <div className="mb-4">
          <Badge variant="outline">Sample preview</Badge>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Times Quoted"
          value={String(summary.total_quotes)}
          subtitle={
            summary.first_quoted_at
              ? `Since ${dateFormatter(summary.first_quoted_at)}`
              : "Quote entries"
          }
          icon={History}
          color="primary"
        />
        <StatCard
          title="Clients Quoted"
          value={String(summary.unique_clients)}
          subtitle="Unique companies"
          icon={Building2}
          color="info"
        />
        <StatCard
          title="Latest Rate"
          value={`Rs ${formatMoney(summary.latest_rate)}`}
          subtitle={
            summary.last_quoted_at
              ? `Quoted on ${dateFormatter(summary.last_quoted_at)}`
              : "Most recent quote"
          }
          icon={IndianRupee}
          color="success"
        />
        <StatCard
          title="Avg. Rate"
          value={`Rs ${formatMoney(summary.avg_rate)}`}
          subtitle={`Range Rs ${formatMoney(summary.min_rate)} – ${formatMoney(
            summary.max_rate,
          )}`}
          icon={Package}
          color="warning"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Description
              </div>
              {product.descriptions.length > 0 ? (
                <ul className="mt-1 space-y-1 text-sm text-foreground">
                  {product.descriptions.map((description, idx) => (
                    <li key={`desc-${idx}`}>{description}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">
                  No description
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Variants quoted
                </div>
                {product.variants.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {product.variants.map((variant, idx) => (
                      <Badge
                        key={`variant-${idx}`}
                        variant="outline"
                        className="font-normal"
                      >
                        {variant}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">—</div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Unit{product.units.length !== 1 ? "s" : ""}
                </div>
                <div className="mt-1 text-sm text-foreground">
                  {product.units.join(", ") || "—"}
                </div>
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="h-4 w-4 text-success!" />
              Lowest quoted:{" "}
              <span className="font-semibold">
                Rs {formatMoney(summary.min_rate)}
                {unitSuffix}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-destructive" />
              Highest quoted:{" "}
              <span className="font-semibold">
                Rs {formatMoney(summary.max_rate)}
                {unitSuffix}
              </span>
            </span>
            <span className="text-muted-foreground">
              First quoted {dateFormatter(summary.first_quoted_at, "—")} · Last
              quoted {dateFormatter(summary.last_quoted_at, "—")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Clients Quoted So Far</CardTitle>
          <span className="text-sm text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Times quoted</TableHead>
                  <TableHead className="text-right">Latest rate</TableHead>
                  <TableHead className="text-right">Lowest</TableHead>
                  <TableHead className="text-right">Highest</TableHead>
                  <TableHead>First quoted</TableHead>
                  <TableHead>Last quoted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.client_name}>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {client.client_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {client.times_quoted}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold text-primary!">
                      Rs {formatMoney(client.latest_rate)}
                      {client.latest_unit ? ` / ${client.latest_unit}` : ""}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      Rs {formatMoney(client.min_rate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      Rs {formatMoney(client.max_rate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {dateFormatter(client.first_quoted_at, "—")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {dateFormatter(client.last_quoted_at, "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Full Quote History</CardTitle>
          <span className="text-sm text-muted-foreground">
            {logs.length} entr{logs.length !== 1 ? "ies" : "y"} · newest first
          </span>
        </CardHeader>
        <CardContent
          className="pt-0"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quoted on</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Rate quoted</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Quoted by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {dateTimeFormatter(log.created_at, "—")}
                    </TableCell>
                    <TableCell className="break-words">
                      {log.industry_name || "Unknown"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold text-primary!">
                      Rs {formatMoney(log.amount)}
                      {log.unit ? ` / ${log.unit}` : ""}
                    </TableCell>
                    <TableCell className="max-w-[180px] text-sm">
                      {(log.variants || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(log.variants || []).map((variant, idx) => (
                            <Badge
                              key={`${log._id}-v-${idx}`}
                              variant="outline"
                              className="font-normal"
                            >
                              {variant}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {log.quotation_code ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-sm">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            {log.quotation_code}
                          </div>
                          <QuotationStatusBadge status={log.quotation_status} />
                        </div>
                      ) : log.quotation_status ? (
                        <QuotationStatusBadge status={log.quotation_status} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {log.created_by_name || "—"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotationProductView;
