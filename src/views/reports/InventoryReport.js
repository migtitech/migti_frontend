import React from "react";
import { CChartLine, CChartPolarArea } from "@coreui/react-chartjs";
import { Warehouse, Boxes, AlertTriangle, RefreshCw } from "lucide-react";
import { PageHeader, StatCard, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "../../components/ui";
import ReportsSubNav from "./components/ReportsSubNav";
import GrowthIndicator from "./components/GrowthIndicator";
import { inventoryReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const lowStockColumns = [
  { key: "name", label: "Product", sortable: true },
  { key: "sku", label: "SKU", sortable: true },
  { key: "warehouse", label: "Warehouse", sortable: true },
  { key: "qty", label: "In Stock", sortable: true, align: "right" },
  { key: "reorderLevel", label: "Reorder Level", align: "right" },
  {
    key: "gap",
    label: "Status",
    render: (row) => (
      <Badge
        variant={row.qty <= row.reorderLevel / 3 ? "destructive" : "warning"}
      >
        {row.qty <= row.reorderLevel / 3 ? "Critical" : "Low stock"}
      </Badge>
    ),
  },
];

const InventoryReport = () => {
  const { kpis, stockByWarehouse, movementTrend, lowStock } = inventoryReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Report"
        description="Stock value, warehouse distribution and reorder alerts. Sample data for UI preview."
      />
      <ReportsSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Stock Value"
          value={formatINR(kpis.totalStockValue)}
          subtitle={<GrowthIndicator value={kpis.stockValueGrowth} />}
          icon={Warehouse}
          color="primary"
        />
        <StatCard
          title="Active SKUs"
          value={kpis.skuCount}
          subtitle={<GrowthIndicator value={kpis.skuGrowth} />}
          icon={Boxes}
          color="info"
        />
        <StatCard
          title="Low Stock Items"
          value={kpis.lowStockItems}
          subtitle={
            <GrowthIndicator
              value={kpis.lowStockGrowth}
              suffix="vs last month"
            />
          }
          icon={AlertTriangle}
          color="danger"
        />
        <StatCard
          title="Turnover Ratio"
          value={`${kpis.turnoverRatio}x`}
          subtitle={<GrowthIndicator value={kpis.turnoverGrowth} />}
          icon={RefreshCw}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stock Movement Trend</CardTitle>
            <CardDescription>
              Units moved per month, last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CChartLine
              style={{ height: "300px" }}
              data={{
                labels: REPORT_MONTHS,
                datasets: [
                  {
                    label: "Units moved",
                    data: movementTrend,
                    borderColor: "#7a5af8",
                    backgroundColor: "rgba(122, 90, 248, 0.12)",
                    tension: 0.35,
                    fill: true,
                    pointRadius: 3,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock Value by Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartPolarArea
              style={{ height: "300px" }}
              data={{
                labels: stockByWarehouse.map((w) => w.label),
                datasets: [
                  {
                    data: stockByWarehouse.map((w) => w.value),
                    backgroundColor: stockByWarehouse.map((w) => w.color),
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
          <CardTitle>Low Stock Alerts</CardTitle>
          <CardDescription>Items below or near reorder level</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={lowStockColumns}
            rows={lowStock}
            rowKey={(r) => r.sku}
            exportFileName="inventory-low-stock-report"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryReport;
