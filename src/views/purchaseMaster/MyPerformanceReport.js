import React from "react";
import { CChartLine, CChartBar } from "@coreui/react-chartjs";
import { IndianRupee, Truck, TrendingDown, Award } from "lucide-react";
import { PageHeader, StatCard, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import { myPurchasePerformanceReport } from "../../data/purchaseMasterDummyData";

const activityColumns = [
  { key: "id", label: "Reference", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "detail", label: "Detail" },
  { key: "date", label: "Date", sortable: true },
];

/**
 * My Performance Report: personal purchasing performance — PO volume,
 * on-time delivery, cost savings, and the impact of purchase returns.
 * Sample data for UI preview.
 */
const MyPerformanceReport = () => {
  const { kpis, monthlyTrend, returnsImpact, recentActivity } =
    myPurchasePerformanceReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance Report"
        description="Your personal purchasing performance. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Purchase Orders"
          value={kpis.poCount}
          icon={IndianRupee}
          color="primary"
        />
        <StatCard
          title="On-Time Delivery"
          value={`${kpis.onTimeDeliveryPct}%`}
          icon={Truck}
          color="success"
        />
        <StatCard
          title="Cost Savings"
          value={`${kpis.costSavingsPct}%`}
          icon={TrendingDown}
          color="info"
        />
        <StatCard
          title="Performance Score"
          value={kpis.performanceScore}
          subtitle="out of 100"
          icon={Award}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Purchase Value vs Target</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartLine
              style={{ height: "280px" }}
              data={{
                labels: monthlyTrend.months,
                datasets: [
                  {
                    label: "Purchase Value",
                    data: monthlyTrend.purchaseValue,
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
            <CardTitle>Returns Impact</CardTitle>
            <CardDescription>Purchase Orders vs Returns</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "280px" }}
              data={{
                labels: returnsImpact.map((f) => f.stage),
                datasets: [
                  {
                    label: "Count",
                    backgroundColor: "#7a5af8",
                    data: returnsImpact.map((f) => f.value),
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
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={activityColumns}
            rows={recentActivity}
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
