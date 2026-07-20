import React, { useMemo, useState } from "react";
import { CChartLine, CChartPolarArea } from "@coreui/react-chartjs";
import { Warehouse, Boxes, AlertTriangle, RefreshCw } from "lucide-react";
import { PageHeader, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "../../components/ui";
import ReportsSubNav from "./components/ReportsSubNav";
import {
  SmartKpiCard,
  ReportToolbar,
  InsightStrip,
  DrilldownSheet,
  DrillRow,
  scaleSeries,
  formatINRCompact,
  formatNumber,
  buildInsights,
  trendInsight,
  worstOf,
  exportRowsToCsv,
} from "./components/smart";
import { inventoryReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const InventoryReport = () => {
  const { kpis, stockByWarehouse, movementTrend, lowStock } = inventoryReport;

  const [period, setPeriod] = useState("this_month");
  const [compare, setCompare] = useState(true);
  const [warehouse, setWarehouse] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [drill, setDrill] = useState(null);

  const warehouseOptions = useMemo(
    () => [
      { value: "", label: "All warehouses" },
      ...stockByWarehouse.map((w) => ({ value: w.label, label: w.label })),
    ],
    [stockByWarehouse],
  );

  const m = useMemo(() => {
    const rows = warehouse
      ? lowStock.filter((r) => r.warehouse === warehouse)
      : lowStock;
    return {
      moveSeries: scaleSeries(movementTrend, period, "move"),
      rows,
    };
  }, [period, warehouse, movementTrend, lowStock]);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight("Stock movement", m.moveSeries),
        {
          tone: kpis.lowStockItems > 25 ? "warning" : "positive",
          text: `${kpis.lowStockItems} SKUs are below reorder level — ${lowStock.filter((r) => r.qty <= r.reorderLevel / 3).length} are critical.`,
        },
        worstOf(
          lowStock,
          (r) => r.name,
          (r) => r.qty,
          (v) => `${v} units left`,
        ),
        {
          tone: kpis.turnoverRatio >= 4 ? "positive" : "neutral",
          text: `Inventory turnover is ${kpis.turnoverRatio}x for the period.`,
        },
      ]),
    [m, kpis, lowStock],
  );

  const lowStockColumns = useMemo(
    () => [
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
            variant={
              row.qty <= row.reorderLevel / 3 ? "destructive" : "warning"
            }
          >
            {row.qty <= row.reorderLevel / 3 ? "Critical" : "Low stock"}
          </Badge>
        ),
      },
    ],
    [],
  );

  const handleExport = () =>
    exportRowsToCsv(
      "inventory-low-stock-report",
      [
        { label: "Product", value: (r) => r.name },
        { label: "SKU", value: (r) => r.sku },
        { label: "Warehouse", value: (r) => r.warehouse },
        { label: "In Stock", value: (r) => r.qty },
        { label: "Reorder Level", value: (r) => r.reorderLevel },
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
        title="Inventory Report"
        description="Stock value, warehouse distribution and reorder alerts. Interactive sample data."
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
            id: "warehouse",
            label: "Warehouse",
            value: warehouse,
            onChange: setWarehouse,
            options: warehouseOptions,
          },
        ]}
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Total Stock Value"
          value={formatINRCompact(kpis.totalStockValue)}
          icon={Warehouse}
          color="primary"
          delta={compare ? kpis.stockValueGrowth : null}
        />
        <SmartKpiCard
          title="Active SKUs"
          value={formatNumber(kpis.skuCount)}
          icon={Boxes}
          color="info"
          delta={compare ? kpis.skuGrowth : null}
        />
        <SmartKpiCard
          title="Low Stock Items"
          value={kpis.lowStockItems}
          icon={AlertTriangle}
          color="danger"
          delta={compare ? kpis.lowStockGrowth : null}
          invertDelta
        />
        <SmartKpiCard
          title="Turnover Ratio"
          value={`${kpis.turnoverRatio}x`}
          icon={RefreshCw}
          color="success"
          delta={compare ? kpis.turnoverGrowth : null}
          spark={m.moveSeries}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stock Movement Trend</CardTitle>
            <CardDescription>
              Units moved per month · selected period
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
                    data: m.moveSeries,
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
          <CardDescription>
            {warehouse
              ? `Filtered: ${warehouse}`
              : "Items below or near reorder level"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={lowStockColumns}
            rows={m.rows}
            rowKey={(r) => r.sku}
            exportFileName="inventory-low-stock-report"
            onRowClick={(row) => setDrill(row)}
          />
        </CardContent>
      </Card>

      <DrilldownSheet
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drill?.name}
        description={drill ? `${drill.sku} · ${drill.warehouse}` : ""}
      >
        {drill && (
          <div>
            <DrillRow label="In stock" value={drill.qty} strong />
            <DrillRow label="Reorder level" value={drill.reorderLevel} />
            <DrillRow
              label="Shortfall"
              value={Math.max(0, drill.reorderLevel - drill.qty)}
            />
            <DrillRow
              label="Severity"
              value={
                <Badge
                  variant={
                    drill.qty <= drill.reorderLevel / 3
                      ? "destructive"
                      : "warning"
                  }
                >
                  {drill.qty <= drill.reorderLevel / 3
                    ? "Critical"
                    : "Low stock"}
                </Badge>
              }
            />
          </div>
        )}
      </DrilldownSheet>
    </div>
  );
};

export default InventoryReport;
