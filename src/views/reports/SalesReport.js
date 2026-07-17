import React from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import { IndianRupee, ShoppingCart, Receipt, Percent } from "lucide-react";
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
import { salesReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const orderColumns = [
  { key: "id", label: "Order #", sortable: true },
  { key: "customer", label: "Customer", sortable: true },
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

const repColumns = [
  { key: "name", label: "Sales Rep", sortable: true },
  { key: "region", label: "Region", sortable: true },
  { key: "deals", label: "Deals", sortable: true, align: "right" },
  {
    key: "revenue",
    label: "Revenue",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.revenue),
    sortValue: (row) => row.revenue,
  },
  {
    key: "achievement",
    label: "Target Achievement",
    align: "right",
    render: (row) => {
      const pct = Math.round((row.revenue / row.target) * 100);
      return (
        <span
          className={
            pct >= 100
              ? "font-semibold text-success!"
              : "font-semibold text-warning!"
          }
        >
          {pct}%
        </span>
      );
    },
    sortValue: (row) => row.revenue / row.target,
  },
];

const productColumns = [
  { key: "name", label: "Product", sortable: true },
  { key: "sku", label: "SKU", sortable: true },
  { key: "units", label: "Units Sold", sortable: true, align: "right" },
  {
    key: "revenue",
    label: "Revenue",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.revenue),
    sortValue: (row) => row.revenue,
  },
];

const SalesReport = () => {
  const {
    kpis,
    monthlyRevenue,
    monthlyTarget,
    ordersByStatus,
    topProducts,
    topSalesReps,
    recentOrders,
  } = salesReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Report"
        description="Revenue, orders, conversion and sales-rep performance. Sample data for UI preview."
      />
      <ReportsSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatINR(kpis.totalRevenue)}
          subtitle={<GrowthIndicator value={kpis.revenueGrowth} />}
          icon={IndianRupee}
          color="primary"
        />
        <StatCard
          title="Total Orders"
          value={kpis.totalOrders}
          subtitle={<GrowthIndicator value={kpis.ordersGrowth} />}
          icon={ShoppingCart}
          color="info"
        />
        <StatCard
          title="Avg Order Value"
          value={formatINR(kpis.avgOrderValue)}
          subtitle={<GrowthIndicator value={kpis.avgOrderGrowth} />}
          icon={Receipt}
          color="success"
        />
        <StatCard
          title="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          subtitle={<GrowthIndicator value={kpis.conversionGrowth} />}
          icon={Percent}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Target</CardTitle>
            <CardDescription>Monthly, last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "300px" }}
              data={{
                labels: REPORT_MONTHS,
                datasets: [
                  {
                    label: "Revenue",
                    backgroundColor: "#2563eb",
                    data: monthlyRevenue,
                  },
                  {
                    label: "Target",
                    backgroundColor: "#d0d5dd",
                    data: monthlyTarget,
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
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartDoughnut
              style={{ height: "300px" }}
              data={{
                labels: ordersByStatus.map((o) => o.label),
                datasets: [
                  {
                    data: ordersByStatus.map((o) => o.value),
                    backgroundColor: ordersByStatus.map((o) => o.color),
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
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={productColumns}
              rows={topProducts}
              rowKey={(r) => r.sku}
              showSearch={false}
              maxHeight="none"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Sales Reps</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={repColumns}
              rows={topSalesReps}
              rowKey={(r) => r.name}
              showSearch={false}
              maxHeight="none"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest sales order activity</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={orderColumns}
            rows={recentOrders}
            rowKey={(r) => r.id}
            exportFileName="sales-orders-report"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesReport;
