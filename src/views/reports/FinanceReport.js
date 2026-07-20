import React, { useMemo, useState } from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import { IndianRupee, TrendingDown, TrendingUp, Wallet } from "lucide-react";
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
  scaleValue,
  scaleSeries,
  prevValue,
  formatINR,
  formatINRCompact,
  buildInsights,
  trendInsight,
  exportRowsToCsv,
} from "./components/smart";
import { financeReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const paymentColumns = [
  { key: "id", label: "Reference", sortable: true },
  { key: "party", label: "Party", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "date", label: "Date", sortable: true },
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
    render: (row) => <StatusBadge status={row.status} />,
  },
];

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "Receivable", label: "Receivable" },
  { value: "Payable", label: "Payable" },
];

const FinanceReport = () => {
  const { kpis, revenueVsExpense, expenseBreakdown, payments } = financeReport;

  const [period, setPeriod] = useState("this_month");
  const [compare, setCompare] = useState(true);
  const [type, setType] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const m = useMemo(() => {
    const rows = type ? payments.filter((p) => p.type === type) : payments;
    return {
      revenue: scaleValue(kpis.revenue, period, "rev"),
      expenses: scaleValue(kpis.expenses, period, "exp"),
      profit: scaleValue(kpis.netProfit, period, "profit"),
      revSeries: scaleSeries(revenueVsExpense.revenue, period, "rev"),
      expSeries: scaleSeries(revenueVsExpense.expenses, period, "exp"),
      rows,
    };
  }, [period, type, kpis, revenueVsExpense, payments]);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight("Revenue", m.revSeries),
        {
          tone: m.profit > 0 ? "positive" : "negative",
          text: `Net margin is ${((m.profit / m.revenue) * 100).toFixed(1)}% (${formatINRCompact(m.profit)} profit).`,
        },
        {
          tone:
            payments.filter((p) => p.status === "overdue").length > 0
              ? "warning"
              : "neutral",
          text: `${payments.filter((p) => p.status === "overdue").length} payment(s) currently overdue.`,
        },
        {
          tone: kpis.receivablesGrowth < 0 ? "positive" : "warning",
          text: `Outstanding receivables ${kpis.receivablesGrowth < 0 ? "down" : "up"} ${Math.abs(kpis.receivablesGrowth)}% — ${formatINRCompact(kpis.outstandingReceivables)} open.`,
        },
      ]),
    [m, payments, kpis],
  );

  const handleExport = () =>
    exportRowsToCsv(
      "finance-payments-report",
      [
        { label: "Reference", value: (r) => r.id },
        { label: "Party", value: (r) => r.party },
        { label: "Type", value: (r) => r.type },
        { label: "Date", value: (r) => r.date },
        { label: "Amount", value: (r) => r.amount },
        { label: "Status", value: (r) => r.status },
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
        title="Finance Report"
        description="Revenue, expenses, profitability and outstanding payments. Interactive sample data."
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
            id: "type",
            label: "Payment type",
            value: type,
            onChange: setType,
            options: TYPE_OPTIONS,
          },
        ]}
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Revenue"
          value={formatINRCompact(m.revenue)}
          icon={IndianRupee}
          color="primary"
          delta={compare ? kpis.revenueGrowth : null}
          spark={m.revSeries}
          footnote={
            compare
              ? `was ${formatINRCompact(prevValue(m.revenue, kpis.revenueGrowth))}`
              : undefined
          }
        />
        <SmartKpiCard
          title="Expenses"
          value={formatINRCompact(m.expenses)}
          icon={TrendingDown}
          color="warning"
          delta={compare ? kpis.expensesGrowth : null}
          spark={m.expSeries}
          invertDelta
        />
        <SmartKpiCard
          title="Net Profit"
          value={formatINRCompact(m.profit)}
          icon={TrendingUp}
          color="success"
          delta={compare ? kpis.netProfitGrowth : null}
        />
        <SmartKpiCard
          title="Outstanding Receivables"
          value={formatINRCompact(kpis.outstandingReceivables)}
          icon={Wallet}
          color="danger"
          delta={compare ? kpis.receivablesGrowth : null}
          invertDelta
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Selected period · sample data</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "300px" }}
              data={{
                labels: REPORT_MONTHS,
                datasets: [
                  {
                    label: "Revenue",
                    backgroundColor: "#12b76a",
                    data: m.revSeries,
                  },
                  {
                    label: "Expenses",
                    backgroundColor: "#f04438",
                    data: m.expSeries,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "top" } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => `₹${(v / 1000).toFixed(0)}k` },
                  },
                },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartDoughnut
              style={{ height: "300px" }}
              data={{
                labels: expenseBreakdown.map((e) => e.label),
                datasets: [
                  {
                    data: expenseBreakdown.map((e) => e.value),
                    backgroundColor: expenseBreakdown.map((e) => e.color),
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

      <Card>
        <CardHeader>
          <CardTitle>Payments & Receivables</CardTitle>
          <CardDescription>
            {type
              ? `Filtered: ${type}`
              : "Recent payable and receivable activity"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={paymentColumns}
            rows={m.rows}
            rowKey={(r) => r.id}
            exportFileName="finance-payments-report"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceReport;
