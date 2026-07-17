import React from "react";
import { CChartLine } from "@coreui/react-chartjs";
import { ListTodo, ClipboardCheck, Briefcase, IndianRupee } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import { purchaseMasterDashboard } from "../../data/purchaseMasterDummyData";

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

const assignedTaskColumns = [
  { key: "title", label: "Task", sortable: true },
  { key: "assignedBy", label: "Assigned By", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
  { key: "due", label: "Due Date", sortable: true },
];

const assignedWorkColumns = [
  { key: "id", label: "Item", sortable: true },
  { key: "type", label: "Type", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
  { key: "due", label: "Due Date", sortable: true },
];

const PurchaseMasterDashboard = () => {
  const { kpis, pendingWork, assignedTasks, assignedWork, monthlyTrend } =
    purchaseMasterDashboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Manager Dashboard"
        description="Your pending work, assigned tasks and assigned work at a glance. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Work"
          value={kpis.pendingWorkCount}
          subtitle="items need your action"
          icon={ListTodo}
          color="warning"
        />
        <StatCard
          title="Assigned Tasks"
          value={kpis.assignedTaskCount}
          subtitle="from management"
          icon={ClipboardCheck}
          color="info"
        />
        <StatCard
          title="Assigned Work"
          value={kpis.assignedWorkCount}
          subtitle="requests, orders & returns"
          icon={Briefcase}
          color="primary"
        />
        <StatCard
          title="This Month Purchases"
          value={formatINR(kpis.monthPurchaseValue)}
          subtitle="total purchase value"
          icon={IndianRupee}
          color="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Value Trend</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <CChartLine
            style={{ height: "260px" }}
            data={{
              labels: monthlyTrend.months,
              datasets: [
                {
                  label: "Purchase Value",
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pending Work</CardTitle>
            <CardDescription>Needs your attention</CardDescription>
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
            <CardTitle>Assigned Tasks</CardTitle>
            <CardDescription>Given to you by HOD / management</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={assignedTaskColumns}
              rows={assignedTasks}
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
              Purchase requests, orders & returns in your queue
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

export default PurchaseMasterDashboard;
