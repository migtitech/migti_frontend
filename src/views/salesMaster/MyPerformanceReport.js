import React from "react";
import { CChartLine, CChartBar } from "@coreui/react-chartjs";
import { IndianRupee, Target, Trophy, Percent } from "lucide-react";
import { PageHeader, StatCard, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import { myPerformanceReport } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const dealColumns = [
  { key: "id", label: "Order #", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "closedOn", label: "Closed On", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.amount),
    sortValue: (row) => row.amount,
  },
];

const MyPerformanceReport = () => {
  const { kpis, monthlyTrend, funnel, recentDeals } = myPerformanceReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance Report"
        description="Your personal sales performance against target. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue (this period)"
          value={formatINR(kpis.revenue)}
          icon={IndianRupee}
          color="primary"
        />
        <StatCard
          title="Target Achievement"
          value={`${kpis.achievementPct}%`}
          subtitle={`Target ${formatINR(kpis.target)}`}
          icon={Target}
          color="success"
        />
        <StatCard
          title="Deals Won"
          value={kpis.dealsWon}
          icon={Trophy}
          color="info"
        />
        <StatCard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          icon={Percent}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Achieved vs Target</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartLine
              style={{ height: "280px" }}
              data={{
                labels: monthlyTrend.months,
                datasets: [
                  {
                    label: "Achieved",
                    data: monthlyTrend.achieved,
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37, 99, 235, 0.12)",
                    tension: 0.35,
                    fill: true,
                    pointRadius: 3,
                  },
                  {
                    label: "Target",
                    data: monthlyTrend.target,
                    borderColor: "#98a2b3",
                    borderDash: [6, 4],
                    tension: 0.35,
                    fill: false,
                    pointRadius: 2,
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
            <CardTitle>Sales Funnel</CardTitle>
            <CardDescription>Query → Sales Order</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "280px" }}
              data={{
                labels: funnel.map((f) => f.stage),
                datasets: [
                  {
                    label: "Count",
                    backgroundColor: "#7a5af8",
                    data: funnel.map((f) => f.value),
                  },
                ],
              }}
              options={{
                indexAxis: "y",
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } },
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently Closed Deals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={dealColumns}
            rows={recentDeals}
            rowKey={(r) => r.id}
            showSearch={false}
            maxHeight="none"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPerformanceReport;
