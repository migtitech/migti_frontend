import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CChartBar, CChartDoughnut, CChartLine } from "@coreui/react-chartjs";
import {
  MessageSquare,
  Clipboard,
  Bell,
  Star,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
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
import { dateMediumFormatter } from "../../utils/dateFormatter";
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
    title: "Total Queries",
    value: "1,248",
    subtitle: "+86 added this month",
    icon: MessageSquare,
    color: "primary",
    to: "/queries",
  },
  {
    title: "Open Queries",
    value: "312",
    subtitle: "Awaiting first response",
    icon: Clock,
    color: "warning",
    to: "/queries",
  },
  {
    title: "Converted to Quotation",
    value: "587",
    subtitle: "47.0% conversion rate",
    icon: CheckCircle2,
    color: "success",
    to: "/queries",
  },
  {
    title: "Avg. Response Time",
    value: "6.4 hrs",
    subtitle: "Target: within 8 hrs",
    icon: TrendingUp,
    color: "info",
    to: null,
  },
  {
    title: "Overdue Follow-ups",
    value: "18",
    subtitle: "Needs attention today",
    icon: AlertTriangle,
    color: "danger",
    to: "/follow-up",
  },
  {
    title: "Active Product Leads",
    value: "96",
    subtitle: "Linked to open queries",
    icon: Star,
    color: "secondary",
    to: "/product-lead",
  },
];

const ZONE_ROWS = [
  { zone: "Indore", queries: 312, converted: 168, pct: 54 },
  { zone: "Bengaluru", queries: 268, converted: 121, pct: 45 },
  { zone: "Mumbai", queries: 214, converted: 96, pct: 45 },
  { zone: "Delhi NCR", queries: 186, converted: 74, pct: 40 },
  { zone: "Pune", queries: 152, converted: 79, pct: 52 },
  { zone: "Chennai", queries: 116, converted: 49, pct: 42 },
];

const RECENT_QUERIES = [
  {
    code: "QRY-2461",
    client: "Acme Industries",
    zone: "Indore",
    product: "SS 304 Coils",
    rep: "Neha Singh",
    status: "Open",
    date: "2026-07-16",
    amount: 420000,
  },
  {
    code: "QRY-2460",
    client: "Seed Industry mm1t5i5-19",
    zone: "Bengaluru",
    product: "Industrial Fasteners",
    rep: "Rahul Verma",
    status: "Quoted",
    date: "2026-07-16",
    amount: 186500,
  },
  {
    code: "QRY-2459",
    client: "Bansal Steel Corp",
    zone: "Mumbai",
    product: "MS Angles & Channels",
    rep: "Priya Patel",
    status: "Converted",
    date: "2026-07-15",
    amount: 962000,
  },
  {
    code: "QRY-2458",
    client: "Orion Fabricators",
    zone: "Pune",
    product: "Aluminium Sheets",
    rep: "Neha Singh",
    status: "In Progress",
    date: "2026-07-15",
    amount: 275000,
  },
  {
    code: "QRY-2457",
    client: "Vertex Engineering",
    zone: "Chennai",
    product: "Copper Wire Rods",
    rep: "Aman Gupta",
    status: "On Hold",
    date: "2026-07-14",
    amount: 148000,
  },
  {
    code: "QRY-2456",
    client: "Northline Traders",
    zone: "Delhi NCR",
    product: "Hydraulic Fittings",
    rep: "Priya Patel",
    status: "Lost",
    date: "2026-07-14",
    amount: 92000,
  },
  {
    code: "QRY-2455",
    client: "Crestwood Metals",
    zone: "Indore",
    product: "GI Pipes",
    rep: "Rahul Verma",
    status: "Converted",
    date: "2026-07-13",
    amount: 531000,
  },
  {
    code: "QRY-2454",
    client: "Falcon Auto Components",
    zone: "Bengaluru",
    product: "Precision Bearings",
    rep: "Aman Gupta",
    status: "Quoted",
    date: "2026-07-13",
    amount: 204500,
  },
];

const STATUS_BADGE_VARIANT = {
  Open: "info",
  "In Progress": "warning",
  Quoted: "secondary",
  Converted: "success",
  "On Hold": "outline",
  Lost: "destructive",
};

const TOP_REPS = [
  { name: "Neha Singh", handled: 214, conversion: 52, initials: "NS" },
  { name: "Priya Patel", handled: 196, conversion: 49, initials: "PP" },
  { name: "Rahul Verma", handled: 181, conversion: 44, initials: "RV" },
  { name: "Aman Gupta", handled: 163, conversion: 41, initials: "AG" },
];

const UPCOMING_FOLLOWUPS = [
  {
    client: "Acme Industries",
    task: "Share revised quotation",
    due: "Today, 4:00 PM",
    priority: "High",
  },
  {
    client: "Orion Fabricators",
    task: "Confirm delivery timeline",
    due: "Tomorrow, 11:00 AM",
    priority: "Normal",
  },
  {
    client: "Vertex Engineering",
    task: "Site visit call-back",
    due: "19 Jul, 2:30 PM",
    priority: "High",
  },
  {
    client: "Northline Traders",
    task: "Reconfirm requirement",
    due: "20 Jul, 10:00 AM",
    priority: "Low",
  },
];

const QUICK_LINKS = [
  {
    title: "Query",
    description: "Browse and manage all incoming client queries.",
    icon: MessageSquare,
    color: "primary",
    to: "/queries",
    count: "50 active",
  },
  {
    title: "Query Products",
    description: "Product-level detail captured against each query.",
    icon: Clipboard,
    color: "info",
    to: "/query-products",
    count: "312 items",
  },
  {
    title: "Follow-up",
    description: "Scheduled follow-ups and reminders for open queries.",
    icon: Bell,
    color: "warning",
    to: "/follow-up",
    count: "18 overdue",
  },
  {
    title: "Product Lead",
    description: "Leads generated from queries, ready for procurement.",
    icon: Star,
    color: "success",
    to: "/product-lead",
    count: "96 leads",
  },
];

const pipelineChart = {
  labels: ["New", "Contacted", "Quoted", "Negotiation", "Won", "Lost"],
  datasets: [
    {
      label: "Queries",
      backgroundColor: CHART_COLORS,
      borderRadius: 6,
      data: [1248, 940, 587, 340, 268, 96],
    },
  ],
};

const statusDoughnut = {
  labels: ["Open", "In Progress", "Converted", "On Hold", "Lost"],
  datasets: [
    {
      backgroundColor: CHART_COLORS,
      data: [312, 180, 587, 73, 96],
    },
  ],
};

const trendChart = {
  labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  datasets: [
    {
      label: "Queries received",
      backgroundColor: "rgba(37,99,235,0.1)",
      borderColor: "#2563eb",
      pointBackgroundColor: "#2563eb",
      fill: true,
      tension: 0.35,
      data: [162, 178, 195, 210, 233, 248],
    },
    {
      label: "Converted",
      backgroundColor: "rgba(18,183,106,0.08)",
      borderColor: "#12b76a",
      pointBackgroundColor: "#12b76a",
      fill: true,
      tension: 0.35,
      data: [71, 78, 88, 96, 104, 112],
    },
  ],
};

const formatDate = (value) => dateMediumFormatter(value);

const QueryReportDashboard = () => {
  const navigate = useNavigate();
  const [zoneFilter, setZoneFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("this_month");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filteredQueries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return RECENT_QUERIES.filter((q) => {
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
        title="Query Report"
        description="Query pipeline performance, conversion trends and zone-wise tracking summaries."
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
                Search query, client or product
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. QRY-2461, Acme Industries…"
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
            <CardTitle>Query Pipeline Funnel</CardTitle>
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
            <CardTitle>Query Status Split</CardTitle>
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
            <CardTitle>Queries Received vs Converted</CardTitle>
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
                    {rep.handled} queries handled
                  </div>
                </div>
                <Badge variant="success">{rep.conversion}%</Badge>
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
                    {z.converted}/{z.queries} converted ·{" "}
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
                  onClick={() => navigate("/follow-up")}
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
              onClick={() => navigate("/follow-up")}
            >
              View all follow-ups
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent queries table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent Queries</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {filteredQueries.length} of {RECENT_QUERIES.length} recent
              queries
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/queries")}
          >
            View all queries
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Product interest</TableHead>
                  <TableHead>Sales rep</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Est. value</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQueries.map((q) => (
                  <TableRow
                    key={q.code}
                    className="cursor-pointer"
                    onClick={() => navigate("/queries")}
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
                {filteredQueries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No queries match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick links to related Query Master sections */}
      <Card>
        <CardHeader>
          <CardTitle>Query Master — Quick Links</CardTitle>
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
                      link.color === "success" &&
                        "bg-success-muted text-success!",
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

export default QueryReportDashboard;
