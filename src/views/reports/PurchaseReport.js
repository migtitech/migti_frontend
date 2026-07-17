import React from "react";
import { CChartBar, CChartPie } from "@coreui/react-chartjs";
import { IndianRupee, ClipboardList, Timer, Truck } from "lucide-react";
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
import { purchaseReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const poColumns = [
  { key: "id", label: "PO #", sortable: true },
  { key: "supplier", label: "Supplier", sortable: true },
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

const supplierColumns = [
  { key: "name", label: "Supplier", sortable: true },
  { key: "orders", label: "Orders", sortable: true, align: "right" },
  {
    key: "spend",
    label: "Total Spend",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.spend),
    sortValue: (row) => row.spend,
  },
  {
    key: "onTime",
    label: "On-time %",
    sortable: true,
    align: "right",
    render: (row) => (
      <span
        className={
          row.onTime >= 90
            ? "font-semibold text-success!"
            : "font-semibold text-warning!"
        }
      >
        {row.onTime}%
      </span>
    ),
  },
];

const PurchaseReport = () => {
  const { kpis, monthlySpend, spendByCategory, topSuppliers, pendingPOs } =
    purchaseReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Report"
        description="Spend, purchase orders, supplier performance and delivery. Sample data for UI preview."
      />
      <ReportsSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Spend"
          value={formatINR(kpis.totalSpend)}
          subtitle={<GrowthIndicator value={kpis.spendGrowth} />}
          icon={IndianRupee}
          color="primary"
        />
        <StatCard
          title="Total Purchase Orders"
          value={kpis.totalPOs}
          subtitle={<GrowthIndicator value={kpis.poGrowth} />}
          icon={ClipboardList}
          color="info"
        />
        <StatCard
          title="Avg Lead Time"
          value={`${kpis.avgLeadTimeDays} days`}
          subtitle={<GrowthIndicator value={kpis.leadTimeGrowth} />}
          icon={Timer}
          color="warning"
        />
        <StatCard
          title="On-time Delivery"
          value={`${kpis.onTimeDeliveryRate}%`}
          subtitle={<GrowthIndicator value={kpis.onTimeGrowth} />}
          icon={Truck}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Purchase Spend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "300px" }}
              data={{
                labels: REPORT_MONTHS,
                datasets: [
                  {
                    label: "Spend",
                    backgroundColor: "#f79009",
                    data: monthlySpend,
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
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartPie
              style={{ height: "300px" }}
              data={{
                labels: spendByCategory.map((c) => c.label),
                datasets: [
                  {
                    data: spendByCategory.map((c) => c.value),
                    backgroundColor: spendByCategory.map((c) => c.color),
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
          <CardTitle>Top Suppliers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={supplierColumns}
            rows={topSuppliers}
            rowKey={(r) => r.name}
            showSearch={false}
            maxHeight="none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending / Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={poColumns}
            rows={pendingPOs}
            rowKey={(r) => r.id}
            exportFileName="purchase-orders-report"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseReport;
