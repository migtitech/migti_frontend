import React from "react";
import { CChartLine } from "@coreui/react-chartjs";
import { MessageSquare, Send, ShieldCheck, IndianRupee } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "../../components/ui";
import ProcurementMasterSubNav from "./components/ProcurementMasterSubNav";
import { statusVariant, stageLabel } from "./components/statusFormatters";
import { procurementMasterDashboard } from "../../data/procurementMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const pendingWorkColumns = [
  { key: "title", label: "Pending Work", sortable: true },
  {
    key: "priority",
    label: "Priority",
    render: (row) => (
      <Badge variant={statusVariant(row.priority)}>{row.priority}</Badge>
    ),
  },
  { key: "due", label: "Due Date", sortable: true },
];

const assignedWorkColumns = [
  { key: "id", label: "Item", sortable: true },
  { key: "type", label: "Type", sortable: true },
  {
    key: "status",
    label: "Stage",
    render: (row) => (
      <StatusBadge
        status={stageLabel(row.status)}
        variant={statusVariant(row.status)}
      />
    ),
  },
  { key: "due", label: "Due Date", sortable: true },
];

const ProcurementMasterDashboard = () => {
  const { kpis, pendingWork, assignedWork, monthlyTrend } =
    procurementMasterDashboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement Master Dashboard"
        description="Your procurement request pipeline at a glance. Sample data for UI preview."
      />
      <ProcurementMasterSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="From Query"
          value={kpis.fromQueryCount}
          subtitle="new products in query"
          icon={MessageSquare}
          color="primary"
        />
        <StatCard
          title="Sent for HOD Rate"
          value={kpis.hodRatePendingCount}
          subtitle="awaiting your rate"
          icon={Send}
          color="warning"
        />
        <StatCard
          title="Sent for Verification"
          value={kpis.verificationCount}
          subtitle="rate submitted, verifying"
          icon={ShieldCheck}
          color="info"
        />
        <StatCard
          title="This Month Procurement"
          value={formatINR(kpis.monthProcurementValue)}
          subtitle="total procurement value"
          icon={IndianRupee}
          color="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Procurement Value Trend</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <CChartLine
            style={{ height: "260px" }}
            data={{
              labels: monthlyTrend.months,
              datasets: [
                {
                  label: "Procurement Value",
                  data: monthlyTrend.value,
                  borderColor: "#2563eb",
                  backgroundColor: "rgba(37, 99, 235, 0.12)",
                  tension: 0.35,
                  fill: true,
                  pointRadius: 3,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Work</CardTitle>
            <CardDescription>Needs your action</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={pendingWorkColumns}
              rows={pendingWork}
              rowKey={(r) => r.id}
              showSearch={false}
              maxHeight="none"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assigned Work</CardTitle>
            <CardDescription>
              Procurement requests moving through query, HOD rate and
              verification
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={assignedWorkColumns}
              rows={assignedWork}
              rowKey={(r) => r.id}
              showSearch={false}
              maxHeight="none"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProcurementMasterDashboard;
