import React, { useMemo, useState } from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import { FileText, Trophy, Clock, IndianRupee } from "lucide-react";
import { PageHeader, StatusBadge, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import ReportsSubNav from "./components/ReportsSubNav";
import {
  SmartKpiCard,
  ReportToolbar,
  InsightStrip,
  DrilldownSheet,
  DrillRow,
  scaleValue,
  scaleSeries,
  prevValue,
  formatINR,
  formatINRCompact,
  buildInsights,
  trendInsight,
  bestOf,
  worstOf,
  exportRowsToCsv,
} from "./components/smart";
import { quotationReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const STATUS_LABEL = {
  won: "Won",
  sent: "Sent",
  negotiation: "Negotiation",
  lost: "Lost",
  expired: "Expired",
};
const STATUS_VARIANT = {
  won: "success",
  sent: "info",
  negotiation: "warning",
  lost: "destructive",
  expired: "outline",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "won", label: "Won" },
  { value: "sent", label: "Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "lost", label: "Lost" },
  { value: "expired", label: "Expired" },
];

const quotationColumns = [
  { key: "id", label: "Quote #", sortable: true },
  { key: "customer", label: "Customer", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "validTill", label: "Valid Till", sortable: true },
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
      <StatusBadge
        status={STATUS_LABEL[row.status] || row.status}
        variant={STATUS_VARIANT[row.status]}
      />
    ),
  },
];

const repColumns = [
  { key: "name", label: "Sales Rep", sortable: true },
  { key: "region", label: "Region", sortable: true },
  { key: "quoted", label: "Quoted", sortable: true, align: "right" },
  { key: "won", label: "Won", sortable: true, align: "right" },
  {
    key: "winRate",
    label: "Win Rate",
    align: "right",
    render: (row) => (
      <span
        className={
          row.winRate >= 40
            ? "font-semibold text-success!"
            : "font-semibold text-warning!"
        }
      >
        {row.winRate}%
      </span>
    ),
    sortValue: (row) => row.winRate,
  },
];

const QuotationReport = () => {
  const {
    kpis,
    monthlySent,
    monthlyWon,
    outcomeSplit,
    valueBuckets,
    topReps,
    recentQuotations,
  } = quotationReport;

  const [period, setPeriod] = useState("this_month");
  const [compare, setCompare] = useState(true);
  const [status, setStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [drillRep, setDrillRep] = useState(null);

  const m = useMemo(() => {
    const rows = status
      ? recentQuotations.filter((q) => q.status === status)
      : recentQuotations;
    return {
      total: scaleValue(kpis.totalQuotations, period, "qt"),
      winRate: kpis.winRate,
      pendingValue: scaleValue(kpis.pendingValue, period, "pend"),
      turnaround: kpis.avgTurnaroundDays,
      sentSeries: scaleSeries(monthlySent, period, "sent"),
      wonSeries: scaleSeries(monthlyWon, period, "won"),
      rows,
    };
  }, [period, status, kpis, monthlySent, monthlyWon, recentQuotations]);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight("Quotations sent", m.sentSeries),
        bestOf(
          topReps,
          (r) => r.name,
          (r) => r.winRate,
          (v) => `${v}% win rate`,
        ),
        worstOf(
          topReps,
          (r) => r.name,
          (r) => r.winRate,
          (v) => `${v}% win rate`,
        ),
        {
          tone: kpis.expiringSoon > 10 ? "warning" : "neutral",
          text: `${outcomeSplit.find((o) => o.label === "Pending")?.value ?? 0} quotations are still pending a decision.`,
        },
      ]),
    [m, topReps, kpis, outcomeSplit],
  );

  const handleExport = () =>
    exportRowsToCsv(
      "quotation-report",
      [
        { label: "Quote #", value: (r) => r.id },
        { label: "Customer", value: (r) => r.customer },
        { label: "Date", value: (r) => r.date },
        { label: "Valid Till", value: (r) => r.validTill },
        { label: "Amount", value: (r) => r.amount },
        { label: "Status", value: (r) => STATUS_LABEL[r.status] || r.status },
      ],
      m.rows,
    );

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Report"
        description="Quotation volume, win-rate, turnaround and rep performance. Interactive sample data."
      />
      <ReportsSubNav />

      <ReportToolbar
        period={period}
        onPeriodChange={setPeriod}
        compare={compare}
        onCompareChange={setCompare}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onExport={handleExport}
        filters={[
          {
            id: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: STATUS_OPTIONS,
          },
        ]}
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Total Quotations"
          value={m.total}
          icon={FileText}
          color="primary"
          delta={compare ? kpis.totalGrowth : null}
          spark={m.sentSeries}
        />
        <SmartKpiCard
          title="Win Rate"
          value={`${m.winRate}%`}
          icon={Trophy}
          color="success"
          delta={compare ? kpis.winRateGrowth : null}
          spark={m.wonSeries}
        />
        <SmartKpiCard
          title="Pending Value"
          value={formatINRCompact(m.pendingValue)}
          icon={IndianRupee}
          color="warning"
          delta={compare ? kpis.pendingGrowth : null}
          footnote={
            compare
              ? `was ${formatINRCompact(prevValue(m.pendingValue, kpis.pendingGrowth))}`
              : undefined
          }
        />
        <SmartKpiCard
          title="Avg Turnaround"
          value={`${m.turnaround} days`}
          icon={Clock}
          color="info"
          delta={compare ? kpis.turnaroundGrowth : null}
          invertDelta
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sent vs Won</CardTitle>
            <CardDescription>Selected period · sample data</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "300px" }}
              data={{
                labels: REPORT_MONTHS,
                datasets: [
                  {
                    label: "Sent",
                    backgroundColor: "#2563eb",
                    data: m.sentSeries,
                  },
                  {
                    label: "Won",
                    backgroundColor: "#12b76a",
                    data: m.wonSeries,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "top" } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outcome Split</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartDoughnut
              style={{ height: "300px" }}
              data={{
                labels: outcomeSplit.map((o) => o.label),
                datasets: [
                  {
                    data: outcomeSplit.map((o) => o.value),
                    backgroundColor: outcomeSplit.map((o) => o.color),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "bottom" } },
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Deal Size</CardTitle>
            <CardDescription>Sent vs won per value band</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "280px" }}
              data={{
                labels: valueBuckets.map((b) => b.bucket),
                datasets: [
                  {
                    label: "Sent",
                    backgroundColor: "#d0d5dd",
                    data: valueBuckets.map((b) => b.sent),
                  },
                  {
                    label: "Won",
                    backgroundColor: "#12b76a",
                    data: valueBuckets.map((b) => b.won),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "top" } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Reps by Win Rate</CardTitle>
            <CardDescription>Click a rep to drill in</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={repColumns}
              rows={topReps}
              rowKey={(r) => r.name}
              showSearch={false}
              maxHeight="none"
              onRowClick={(row) => setDrillRep(row)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Quotations</CardTitle>
          <CardDescription>
            {status
              ? `Filtered: ${STATUS_LABEL[status]}`
              : "Latest quotation activity"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={quotationColumns}
            rows={m.rows}
            rowKey={(r) => r.id}
            exportFileName="quotation-report"
          />
        </CardContent>
      </Card>

      <DrilldownSheet
        open={!!drillRep}
        onOpenChange={(o) => !o && setDrillRep(null)}
        title={drillRep?.name}
        description={drillRep ? `${drillRep.region} region` : ""}
      >
        {drillRep && (
          <div>
            <DrillRow label="Quotations sent" value={drillRep.quoted} strong />
            <DrillRow label="Won" value={drillRep.won} />
            <DrillRow label="Win rate" value={`${drillRep.winRate}%`} />
            <DrillRow
              label="Lost / pending"
              value={drillRep.quoted - drillRep.won}
            />
          </div>
        )}
      </DrilldownSheet>
    </div>
  );
};

export default QuotationReport;
