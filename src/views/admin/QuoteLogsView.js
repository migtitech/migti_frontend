import React, { useEffect, useMemo, useState } from "react";
import rateLogService from "../../services/rateLogService";
import { PageHeader, StatCard } from "../../components";
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { dateFormatter } from "../../utils/dateFormatter";
import { Package, Building2, IndianRupee, TrendingUp } from "lucide-react";

const formatMoney = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0.00";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Sample preview shown only when no real quote-rate logs exist yet
 * (backend returns an empty list). Purely presentational — the live
 * fetch/search/filter logic above is untouched.
 */
const SAMPLE_LOGS = [
  {
    _id: "sample-1",
    product_title: "SS 304 Coils",
    description: "2mm thickness, 2B finish, cold rolled",
    variants: ["2mm", "1250mm width"],
    amount: 186500,
    unit: "MT",
    industry_name: "Acme Industries",
    created_at: "2026-07-16T10:30:00.000Z",
  },
  {
    _id: "sample-2",
    product_title: "MS Angles & Channels",
    description: "Structural grade, IS 2062",
    variants: ["50x50x6mm", "ISMC 100"],
    amount: 58200,
    unit: "MT",
    industry_name: "Bansal Steel Corp",
    created_at: "2026-07-16T09:05:00.000Z",
  },
  {
    _id: "sample-3",
    product_title: "Aluminium Sheets",
    description: "Marine grade 5052, mill finish",
    variants: ["1.5mm", "1220x2440mm"],
    amount: 312000,
    unit: "MT",
    industry_name: "Orion Fabricators",
    created_at: "2026-07-15T15:45:00.000Z",
  },
  {
    _id: "sample-4",
    product_title: "Copper Wire Rods",
    description: "Electrolytic grade, 99.9% purity",
    variants: ["8mm dia"],
    amount: 742000,
    unit: "MT",
    industry_name: "Vertex Engineering",
    created_at: "2026-07-15T12:15:00.000Z",
  },
  {
    _id: "sample-5",
    product_title: "Hydraulic Fittings",
    description: "Brass, BSP threaded, nickel plated",
    variants: ["1/2 inch", "3/4 inch"],
    amount: 4250,
    unit: "PCS",
    industry_name: "Northline Traders",
    created_at: "2026-07-14T11:00:00.000Z",
  },
  {
    _id: "sample-6",
    product_title: "GI Pipes",
    description: "Medium class, ERW, IS 1239",
    variants: ["25mm NB", "6 meter length"],
    amount: 68500,
    unit: "MT",
    industry_name: "Crestwood Metals",
    created_at: "2026-07-14T09:20:00.000Z",
  },
  {
    _id: "sample-7",
    product_title: "Precision Bearings",
    description: "Deep groove ball bearing, chrome steel",
    variants: ["6205-2RS"],
    amount: 385,
    unit: "PCS",
    industry_name: "Falcon Auto Components",
    created_at: "2026-07-13T16:40:00.000Z",
  },
  {
    _id: "sample-8",
    product_title: "Industrial Fasteners",
    description: "Hex bolts with nuts, zinc plated, Gr 8.8",
    variants: ["M12x50", "M16x60"],
    amount: 1120,
    unit: "PCS",
    industry_name: "Seed Industry mm1t5i5-19",
    created_at: "2026-07-13T14:10:00.000Z",
  },
];

const QuoteLogsView = () => {
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
    () => [...new Set(SAMPLE_LOGS.map((log) => log.industry_name))],
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
    return SAMPLE_LOGS.filter((log) => {
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

  return (
    <div>
      <PageHeader
        title="Quote Logs"
        description="Every product rate quoted to a client — captured for reference and repeat-order pricing."
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
                    <TableHead>Quoted on</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayLogs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No quote logs match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {displayLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {log.product_title || "Untitled product"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.description || "No description"}
                        </div>
                      </TableCell>
                      <TableCell className="break-words">
                        {log.industry_name || "Unknown"}
                      </TableCell>
                      <TableCell className="break-words text-sm">
                        {(log.variants || []).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold text-primary!">
                        Rs {formatMoney(log.amount)}
                        {log.unit ? ` / ${log.unit}` : ""}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {dateFormatter(log.created_at, "—")}
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
