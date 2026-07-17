import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CChartBar, CChartDoughnut, CChartLine } from "@coreui/react-chartjs";
import {
  FileText,
  List,
  Bell,
  IndianRupee,
  CheckCircle2,
  TrendingUp,
  XCircle,
  RefreshCw,
  Download,
  Search,
  MapPin,
  ArrowUpRight,
  ChevronRight,
  Trophy,
  CalendarClock,
  Building2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Select,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Progress,
} from "../../components/ui";
import { PageHeader, StatCard } from "../../components";
import { toastInfo } from "../../utils/toast";
import { cn } from "../../lib/utils";

const CHART_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#12b76a",
  "#f79009",
  "#f04438",
  "#6f42c1",
];

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const KPI_CARDS = [
  {
    title: "Total Quotations",
    value: "864",
    subtitle: "+48 raised this month",
    icon: FileText,
    color: "primary",
    to: "/quotations",
  },
  {
    title: "Awaiting Response",
    value: "196",
    subtitle: "Sent, pending client reply",
    icon: CalendarClock,
    color: "warning",
    to: "/quotations",
  },
  {
    title: "Won Quotations",
    value: "412",
    subtitle: "47.7% win rate",
    icon: CheckCircle2,
    color: "success",
    to: "/quotations",
  },
  {
    title: "Quoted Value",
    value: "₹6.8 Cr",
    subtitle: "Across active quotations",
    icon: IndianRupee,
    color: "info",
    to: null,
  },
  {
    title: "Lost Quotations",
    value: "87",
    subtitle: "10.1% lost this quarter",
    icon: XCircle,
    color: "danger",
    to: "/lost-quotations",
  },
  {
    title: "Pending Follow-ups",
    value: "34",
    subtitle: "Needs a call-back",
    icon: Bell,
    color: "secondary",
    to: "/followup-dashboard",
  },
];

const ZONE_ROWS = [
  { zone: "Indore", quotations: 214, won: 118, pct: 55 },
  { zone: "Bengaluru", quotations: 186, won: 84, pct: 45 },
  { zone: "Mumbai", quotations: 158, won: 79, pct: 50 },
  { zone: "Delhi NCR", quotations: 132, won: 51, pct: 39 },
  { zone: "Pune", quotations: 104, won: 52, pct: 50 },
  { zone: "Chennai", quotations: 70, won: 28, pct: 40 },
];

const RECENT_QUOTATIONS = [
  {
    code: "QTN-3182",
    client: "Acme Industries",
    zone: "Indore",
    product: "SS 304 Coils",
    rep: "Neha Singh",
    status: "Sent",
    date: "2026-07-16",
    amount: 612000,
  },
  {
    code: "QTN-3181",
    client: "Bansal Steel Corp",
    zone: "Mumbai",
    product: "MS Angles & Channels",
    rep: "Priya Patel",
    status: "Won",
    date: "2026-07-16",
    amount: 962000,
  },
  {
    code: "QTN-3180",
    client: "Orion Fabricators",
    zone: "Pune",
    product: "Aluminium Sheets",
    rep: "Neha Singh",
    status: "Negotiation",
    date: "2026-07-15",
    amount: 275000,
  },
  {
    code: "QTN-3179",
    client: "Vertex Engineering",
    zone: "Chennai",
    product: "Copper Wire Rods",
    rep: "Aman Gupta",
    status: "Draft",
    date: "2026-07-15",
    amount: 148000,
  },
  {
    code: "QTN-3178",
    client: "Northline Traders",
    zone: "Delhi NCR",
    product: "Hydraulic Fittings",
    rep: "Priya Patel",
    status: "Lost",
    date: "2026-07-14",
    amount: 92000,
  },
  {
    code: "QTN-3177",
    client: "Crestwood Metals",
    zone: "Indore",
    product: "GI Pipes",
    rep: "Rahul Verma",
    status: "Won",
    date: "2026-07-14",
    amount: 531000,
  },
  {
    code: "QTN-3176",
    client: "Falcon Auto Components",
    zone: "Bengaluru",
    product: "Precision Bearings",
    rep: "Aman Gupta",
    status: "Sent",
    date: "2026-07-13",
    amount: 204500,
  },
  {
    code: "QTN-3175",
    client: "Seed Industry mm1t5i5-19",
    zone: "Bengaluru",
    product: "Industrial Fasteners",
    rep: "Rahul Verma",
    status: "Negotiation",
    date: "2026-07-13",
    amount: 186500,
  },
];

const STATUS_BADGE_VARIANT = {
  Draft: "outline",
  Sent: "info",
  Negotiation: "warning",
  Won: "success",
  Lost: "destructive",
};

const TOP_REPS = [
  { name: "Neha Singh", handled: 178, winRate: 54, initials: "NS" },
  { name: "Priya Patel", handled: 161, winRate: 49, initials: "PP" },
  { name: "Rahul Verma", handled: 148, winRate: 46, initials: "RV" },
  { name: "Aman Gupta", handled: 129, winRate: 41, initials: "AG" },
];

const UPCOMING_FOLLOWUPS = [
  {
    client: "Acme Industries",
    task: "Confirm negotiated rate",
    due: "Today, 3:30 PM",
    priority: "High",
  },
  {
    client: "Orion Fabricators",
    task: "Send revised terms",
    due: "Tomorrow, 11:00 AM",
    priority: "Normal",
  },
  {
    client: "Vertex Engineering",
    task: "Follow up on approval",
    due: "19 Jul, 2:00 PM",
    priority: "High",
  },
  {
    client: "Northline Traders",
    task: "Check final decision",
    due: "20 Jul, 10:30 AM",
    priority: "Low",
  },
];

const QUICK_LINKS = [
  {
    title: "Quotation",
    description: "All quotations raised against client queries.",
    icon: FileText,
    color: "primary",
    to: "/quotations",
    count: "48 active",
  },
  {
    title: "Quotation Products",
    description: "Product-level pricing detail per quotation.",
    icon: List,
    color: "info",
    to: "/quotation-products",
    count: "526 items",
  },
  {
    title: "Follow-up Dashboard",
    description: "Track pending and overdue quotation follow-ups.",
    icon: Bell,
    color: "warning",
    to: "/followup-dashboard",
    count: "34 pending",
  },
  {
    title: "Lost Quotation",
    description: "Quotations that were lost or not converted.",
    icon: XCircle,
    color: "danger",
    to: "/lost-quotations",
    count: "87 lost",
  },
];

const pipelineChart = {
  labels: ["Draft", "Sent", "Negotiation", "Won", "Lost"],
  datasets: [
    {
      label: "Quotations",
      backgroundColor: CHART_COLORS,
      borderRadius: 6,
      data: [96, 864, 269, 412, 87],
    },
  ],
};

const statusDoughnut = {
  labels: ["Draft", "Sent", "Negotiation", "Won", "Lost"],
  datasets: [
    {
      backgroundColor: CHART_COLORS,
      data: [96, 196, 73, 412, 87],
    },
  ],
};

const trendChart = {
  labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  datasets: [
    {
      label: "Quoted value (₹ Lakh)",
      backgroundColor: "rgba(37,99,235,0.1)",
      borderColor: "#2563eb",
      pointBackgroundColor: "#2563eb",
      fill: true,
      tension: 0.35,
      data: [412, 468, 501, 545, 612, 680],
    },
    {
      label: "Won value (₹ Lakh)",
      backgroundColor: "rgba(18,183,106,0.08)",
      borderColor: "#12b76a",
      pointBackgroundColor: "#12b76a",
      fill: true,
      tension: 0.35,
      data: [178, 205, 224, 248, 271, 302],
    },
  ],
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const QuotationReportDashboard = () => {
  const navigate = useNavigate();
  const [zoneFilter, setZoneFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("this_month");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filteredQuotations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return RECENT_QUOTATIONS.filter((q) => {
      if (zoneFilter && q.zone !== zoneFilter) return false;
      if (statusFilter && q.status !== statusFilter) return false;
      if (
        term &&
        !`${q.code} ${q.client} ${q.product}`.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [zoneFilter, statusFilter, search]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toastInfo("Report data refreshed");
    }, 600);
  };

  return (
    <div>
      <PageHeader
        title="Quotation Report"
        description="Quotation pipeline performance, win-rate trends and zone-wise tracking summaries."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("mr-1.5 h-4 w-4", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => toastInfo("Export will be available soon")}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export report
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-sm text-muted-foreground">
                Search quotation, client or product
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. QTN-3182, Acme Industries..."
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Zone</Label>
              <Select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
              >
                <option value="">All zones</option>
                {ZONE_ROWS.map((z) => (
                  <option key={z.zone} value={z.zone}>
                    {z.zone}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {Object.keys(STATUS_BADGE_VARIANT).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Period</Label>
              <Select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                <option value="this_week">This week</option>
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
                <option value="this_quarter">This quarter</option>
                <option value="this_year">This year</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_CARDS.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            color={card.color}
            onClick={card.to ? () => navigate(card.to) : undefined}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quotation Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[260px]">
              <CChartBar
                style={{ height: "260px" }}
                data={pipelineChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quotation Status Split</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex h-[260px] items-center justify-center">
              <CChartDoughnut
                style={{ height: "260px" }}
                data={statusDoughnut}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + leaderboard row */}
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quoted Value vs Won Value</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[260px]">
              <CChartLine
                style={{ height: "260px" }}
                data={trendChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Top Sales Reps</CardTitle>
            <Trophy className="h-4 w-4 text-warning!" />
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {TOP_REPS.map((rep, index) => (
              <div key={rep.name} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    index === 0
                      ? "bg-warning-muted text-warning!"
                      : "bg-accent text-accent-foreground",
                  )}
                >
                  {rep.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {rep.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rep.handled} quotations handled
                  </div>
                </div>
                <Badge variant="success">{rep.winRate}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Zone breakdown + upcoming follow-ups */}
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Zone-wise Performance</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {ZONE_ROWS.map((z) => (
              <div key={z.zone}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{z.zone}</span>
                  <span className="text-muted-foreground">
                    {z.won}/{z.quotations} won ·{" "}
                    <span className="font-semibold text-foreground">
                      {z.pct}%
                    </span>
                  </span>
                </div>
                <Progress
                  value={z.pct}
                  color={z.pct >= 50 ? "success" : "warning"}
                />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Upcoming Follow-ups</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {UPCOMING_FOLLOWUPS.map((f, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigate("/followup-dashboard")}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {f.client}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {f.task} · {f.due}
                    </div>
                  </div>
                  <Badge
                    variant={
                      f.priority === "High"
                        ? "destructive"
                        : f.priority === "Normal"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {f.priority}
                  </Badge>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => navigate("/followup-dashboard")}
            >
              View follow-up dashboard
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent quotations table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent Quotations</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {filteredQuotations.length} of {RECENT_QUOTATIONS.length}{" "}
              recent quotations
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/quotations")}
          >
            View all quotations
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Product interest</TableHead>
                  <TableHead>Sales rep</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((q) => (
                  <TableRow
                    key={q.code}
                    className="cursor-pointer"
                    onClick={() => navigate("/quotations")}
                  >
                    <TableCell className="font-medium text-primary!">
                      {q.code}
                    </TableCell>
                    <TableCell className="break-words">{q.client}</TableCell>
                    <TableCell>{q.zone}</TableCell>
                    <TableCell className="break-words">{q.product}</TableCell>
                    <TableCell>{q.rep}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[q.status]}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(q.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(q.date)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredQuotations.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No quotations match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick links to related Quotation Master sections */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Master — Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.title}
                type="button"
                onClick={() => navigate(link.to)}
                className="group flex cursor-pointer flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      link.color === "primary" && "bg-primary/10 text-primary!",
                      link.color === "info" &&
                        "bg-accent text-accent-foreground",
                      link.color === "warning" &&
                        "bg-warning-muted text-warning!",
                      link.color === "danger" &&
                        "bg-destructive/10 text-destructive",
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {link.title}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {link.description}
                  </p>
                </div>
                <Badge variant="outline" className="mt-auto">
                  <Building2 className="h-3 w-3" />
                  {link.count}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotationReportDashboard;
