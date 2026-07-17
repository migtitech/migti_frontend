import React from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import { IndianRupee, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import ReportsSubNav from "./components/ReportsSubNav";
import GrowthIndicator from "./components/GrowthIndicator";
import { financeReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

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

const FinanceReport = () => {
  const { kpis, revenueVsExpense, expenseBreakdown, payments } = financeReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Report"
        description="Revenue, expenses, profitability and outstanding payments. Sample data for UI preview."
      />
      <ReportsSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatINR(kpis.revenue)}
          subtitle={<GrowthIndicator value={kpis.revenueGrowth} />}
          icon={IndianRupee}
          color="primary"
        />
        <StatCard
          title="Expenses"
          value={formatINR(kpis.expenses)}
          subtitle={<GrowthIndicator value={kpis.expensesGrowth} />}
          icon={TrendingDown}
          color="warning"
        />
        <StatCard
          title="Net Profit"
          value={formatINR(kpis.netProfit)}
          subtitle={<GrowthIndicator value={kpis.netProfitGrowth} />}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          title="Outstanding Receivables"
          value={formatINR(kpis.outstandingReceivables)}
          subtitle={<GrowthIndicator value={kpis.receivablesGrowth} />}
          icon={Wallet}
          color="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
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
                    data: revenueVsExpense.revenue,
                  },
                  {
                    label: "Expenses",
                    backgroundColor: "#f04438",
                    data: revenueVsExpense.expenses,
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
            Recent payable and receivable activity
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={paymentColumns}
            rows={payments}
            rowKey={(r) => r.id}
            exportFileName="finance-payments-report"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceReport;
