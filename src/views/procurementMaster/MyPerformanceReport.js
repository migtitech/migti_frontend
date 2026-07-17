import React from "react";
import { CChartLine, CChartBar } from "@coreui/react-chartjs";
import { Target, Clock, Percent, Award } from "lucide-react";
import { PageHeader, StatCard, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import ProcurementMasterSubNav from "./components/ProcurementMasterSubNav";
import { myProcurementPerformanceReport } from "../../data/procurementMasterDummyData";

const activityColumns = [
  { key: "id", label: "Reference", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "detail", label: "Detail" },
  { key: "date", label: "Date", sortable: true },
];

/**
 * My Performance Report: personal procurement performance — rates assigned
 * vs submitted, on-time %, turnaround, and how the stage funnel breaks down.
 * Sample data for UI preview.
 */
const MyPerformanceReport = () => {
  const { kpis, monthlyTrend, stageBreakdown, recentActivity } =
    myProcurementPerformanceReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance Report"
        description="Your personal procurement performance — rate targets vs what you submitted. Sample data for UI preview."
      />
      <ProcurementMasterSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Rates Assigned"
          value={kpis.ratesAssigned}
          icon={Target}
          color="primary"
        />
        <StatCard
          title="Submitted On Time"
          value={`${kpis.ratesSubmittedOnTimePct}%`}
          icon={Percent}
          color="success"
        />
        <StatCard
          title="Avg Turnaround"
          value={`${kpis.avgTurnaroundHrs}h`}
          icon={Clock}
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
            <CardTitle>Rates Submitted vs Target</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartLine
              style={{ height: "280px" }}
              data={{
                labels: monthlyTrend.months,
                datasets: [
                  {
                    label: "Submitted",
                    data: monthlyTrend.submitted,
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
                scales: { y: { beginAtZero: true } },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stage Breakdown</CardTitle>
            <CardDescription>Current bucket by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "280px" }}
              data={{
                labels: stageBreakdown.map((f) => f.stage),
                datasets: [
                  {
                    label: "Count",
                    backgroundColor: "#7a5af8",
                    data: stageBreakdown.map((f) => f.value),
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
