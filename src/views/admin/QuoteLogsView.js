import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import rateLogService from "../../services/rateLogService";
import { PageHeader, StatCard, BackButton } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Select,
  Spinner,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { dateTimeFormatter } from "../../utils/dateFormatter";
import {
  Package,
  Building2,
  IndianRupee,
  TrendingUp,
  Eye,
  User,
  FileText,
} from "lucide-react";
import { SAMPLE_QUOTE_LOGS } from "../../data/sampleQuoteLogs";

const formatMoney = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0.00";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const QUOTATION_STATUS_LABELS = {
  draft: { label: "Draft", variant: "outline" },
  sentToClient: { label: "Sent to Client", variant: "info" },
  poReceived: { label: "PO Received", variant: "success" },
  followup01: { label: "Follow-up 1", variant: "warning" },
  followup02: { label: "Follow-up 2", variant: "warning" },
  closed: { label: "Closed", variant: "secondary" },
};

export const QuotationStatusBadge = ({ status }) => {
  if (!status) return null;
  const meta = QUOTATION_STATUS_LABELS[status] || {
    label: status,
    variant: "outline",
  };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
};

const QuoteLogsView = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [industryName, setIndustryName] = useState("");
  const [industrySearchText, setIndustrySearchText] = useState("");
  const [logs, setLogs] = useState([]);
  const [industryOptions, setIndustryOptions] = useState([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await rateLogService.getAll({
        pageNumber: 1,
        pageSize: 100,
        search: searchText,
        industryName,
      });
      const data = res?.data ?? res;
      const result = data?.data ?? data;
      setLogs(result?.items || []);
      setIndustryOptions(result?.filters?.industries || []);
    } catch (_err) {
      setLogs([]);
      setIndustryOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, industryName]);

  const isSample =
    !loading && industryOptions.length === 0 && logs.length === 0;

  const sampleIndustryNames = useMemo(
    () => [...new Set(SAMPLE_QUOTE_LOGS.map((log) => log.industry_name))],
    [],
  );

  const visibleIndustryOptions = (() => {
    const source = isSample ? sampleIndustryNames : industryOptions;
    const normalizedSearch = industrySearchText.trim().toLowerCase();
    const filtered = !normalizedSearch
      ? source
      : source.filter((name) => name.toLowerCase().includes(normalizedSearch));
    return filtered.slice(0, 20);
  })();

  const displayLogs = useMemo(() => {
    if (!isSample) return logs;
    const term = searchText.trim().toLowerCase();
    return SAMPLE_QUOTE_LOGS.filter((log) => {
      if (industryName && log.industry_name !== industryName) return false;
      if (!term) return true;
      const haystack = `${log.product_title} ${log.description} ${(
        log.variants || []
      ).join(" ")}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [isSample, logs, searchText, industryName]);

  const summary = useMemo(() => {
    if (displayLogs.length === 0) {
      return { totalEntries: 0, uniqueClients: 0, avgRate: 0, topProduct: "—" };
    }
    const clientSet = new Set(
      displayLogs.map((log) => log.industry_name || "Unknown"),
    );
    const totalAmount = displayLogs.reduce(
      (sum, log) => sum + (Number(log.amount) || 0),
      0,
    );
    const topProduct = [...displayLogs].sort(
      (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0),
    )[0]?.product_title;
    return {
      totalEntries: displayLogs.length,
      uniqueClients: clientSet.size,
      avgRate: totalAmount / displayLogs.length,
      topProduct: topProduct || "—",
    };
  }, [displayLogs]);

  const openProductView = (log) => {
    const title = log.product_title || "";
    if (!title) return;
    navigate(`/quotation-products/view?product=${encodeURIComponent(title)}`);
  };

  return (
    <div>
      <div className="mb-2">
        <BackButton fallback="/dashboard" />
      </div>
      <PageHeader
        title="Quotation Products"
        description="Every product rate quoted to a client — click a product to see its full quote history: which clients were quoted and at what rates."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Quote Log Entries"
          value={String(summary.totalEntries)}
          subtitle="Product rates logged"
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Clients Quoted"
          value={String(summary.uniqueClients)}
          subtitle="Unique companies"
          icon={Building2}
          color="info"
        />
        <StatCard
          title="Avg. Quoted Rate"
          value={`Rs ${formatMoney(summary.avgRate)}`}
          subtitle="Across logged entries"
          icon={IndianRupee}
          color="success"
        />
        <StatCard
          title="Top Quoted Product"
          value={summary.topProduct}
          subtitle="By highest rate logged"
          icon={TrendingUp}
          color="warning"
          valueClassName="text-lg"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by product title, description, variants"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Search client</Label>
              <Input
                placeholder="Type to search clients"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
              <Label>Client</Label>
              <Select
                value={industryName}
                onChange={(e) => setIndustryName(e.target.value)}
              >
                <option value="">All clients</option>
                {visibleIndustryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <div className="mt-1 text-sm text-muted-foreground">
                Showing {visibleIndustryOptions.length} of{" "}
                {isSample ? sampleIndustryNames.length : industryOptions.length}{" "}
                clients
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2">
            <CardTitle>Log Entries</CardTitle>
            {isSample && <Badge variant="outline">Sample preview</Badge>}
          </div>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {displayLogs.length} product rate
              {displayLogs.length !== 1 ? "s" : ""} quoted
            </span>
          )}
        </CardHeader>
        <CardContent
          className="pt-0"
          style={{ maxHeight: "65vh", overflowY: "auto" }}
        >
          {loading ? (
            <div className="py-8 text-center">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Client quoted</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead className="text-right">Rate quoted</TableHead>
                    <TableHead>Quotation</TableHead>
                    <TableHead>Quoted by</TableHead>
                    <TableHead>Quoted on</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayLogs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No quote logs match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {displayLogs.map((log) => (
                    <TableRow
                      key={log._id}
                      className="cursor-pointer"
                      onClick={() => openProductView(log)}
                    >
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {log.product_title || "Untitled product"}
                        </div>
                        <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                          {log.description || "No description"}
                        </div>
                      </TableCell>
                      <TableCell className="break-words">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {log.industry_name || "Unknown"}
                        </div>
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
                      <TableCell className="whitespace-nowrap text-right font-semibold text-primary!">
                        Rs {formatMoney(log.amount)}
                        {log.unit ? ` / ${log.unit}` : ""}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.quotation_code ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-sm">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              {log.quotation_code}
                            </div>
                            <QuotationStatusBadge
                              status={log.quotation_status}
                            />
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
                      <TableCell className="whitespace-nowrap text-sm">
                        {dateTimeFormatter(log.created_at, "—")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProductView(log);
                          }}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteLogsView;
