import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CChartLine } from "@coreui/react-chartjs";
import {
  IndianRupee,
  ShoppingBasket,
  Landmark,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import ReportsSubNav from "./components/ReportsSubNav";
import GrowthIndicator from "./components/GrowthIndicator";
import {
  SmartKpiCard,
  ReportToolbar,
  InsightStrip,
  DrilldownSheet,
  DrillRow,
  scaleValue,
  scaleSeries,
  prevValue,
  formatINR,
  formatINRCompact,
  buildInsights,
  trendInsight,
} from "./components/smart";
import {
  overviewReport,
  salesReport,
  purchaseReport,
  financeReport,
  inventoryReport,
} from "../../data/reportsDummyData";
import { cn } from "../../lib/utils";

const ReportsOverview = () => {
  const navigate = useNavigate();
  const { revenueVsSpend, moduleSummaries } = overviewReport;

  const [period, setPeriod] = useState("this_month");
  const [compare, setCompare] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drill, setDrill] = useState(null);

  const model = useMemo(() => {
    const revenue = scaleValue(overviewReport.kpis.totalRevenue, period, "rev");
    const spend = scaleValue(overviewReport.kpis.totalSpend, period, "spend");
    const profit = scaleValue(overviewReport.kpis.netProfit, period, "profit");
    const stock = overviewReport.kpis.stockValue; // stock is a snapshot, not period-scaled
    return {
      revenue,
      spend,
      profit,
      stock,
      revSeries: scaleSeries(revenueVsSpend.revenue, period, "rev"),
      spendSeries: scaleSeries(revenueVsSpend.spend, period, "spend"),
    };
  }, [period, revenueVsSpend]);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight("Revenue", model.revSeries),
        {
          tone: model.profit > 0 ? "positive" : "negative",
          text: `Net margin is ${((model.profit / model.revenue) * 100).toFixed(1)}% of revenue this period.`,
        },
        {
          tone: model.spend / model.revenue > 0.7 ? "warning" : "neutral",
          text: `Purchase spend is ${((model.spend / model.revenue) * 100).toFixed(0)}% of revenue.`,
        },
        {
          tone: inventoryReport.kpis.lowStockItems > 25 ? "warning" : "neutral",
          text: `${inventoryReport.kpis.lowStockItems} SKUs are at or below reorder level.`,
        },
      ]),
    [model],
  );

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const openDrill = (key) => setDrill(key);

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="mds-display-lg">Reports</span>}
        description="A unified, interactive view across Sales, Purchase, Inventory, Finance, HR and Targets. Sample data for UI preview."
      />

      <ReportsSubNav />

      <ReportToolbar
        period={period}
        onPeriodChange={setPeriod}
        compare={compare}
        onCompareChange={setCompare}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Total Revenue"
          value={formatINRCompact(model.revenue)}
          icon={IndianRupee}
          color="primary"
          delta={compare ? salesReport.kpis.revenueGrowth : null}
          spark={model.revSeries}
          footnote={
            compare
              ? `was ${formatINRCompact(prevValue(model.revenue, salesReport.kpis.revenueGrowth))}`
              : undefined
          }
          onClick={() => openDrill("revenue")}
        />
        <SmartKpiCard
          title="Purchase Spend"
          value={formatINRCompact(model.spend)}
          icon={ShoppingBasket}
          color="info"
          delta={compare ? purchaseReport.kpis.spendGrowth : null}
          spark={model.spendSeries}
          onClick={() => navigate("/reports/purchase")}
        />
        <SmartKpiCard
          title="Net Profit"
          value={formatINRCompact(model.profit)}
          icon={Landmark}
          color="success"
          delta={compare ? financeReport.kpis.netProfitGrowth : null}
          onClick={() => navigate("/reports/finance")}
        />
        <SmartKpiCard
          title="Inventory Value"
          value={formatINRCompact(model.stock)}
          icon={Boxes}
          color="warning"
          delta={compare ? inventoryReport.kpis.stockValueGrowth : null}
          onClick={() => navigate("/reports/inventory")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Purchase Spend</CardTitle>
          <CardDescription>
            Trend for the selected period · sample data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CChartLine
            style={{ height: "300px" }}
            data={{
              labels: revenueVsSpend.months,
              datasets: [
                {
                  label: "Revenue",
                  data: model.revSeries,
                  borderColor: "#2563eb",
                  backgroundColor: "rgba(37, 99, 235, 0.12)",
                  tension: 0.35,
                  fill: true,
                  pointRadius: 3,
                },
                {
                  label: "Purchase Spend",
                  data: model.spendSeries,
                  borderColor: "#f79009",
                  backgroundColor: "rgba(247, 144, 9, 0.1)",
                  tension: 0.35,
                  fill: true,
                  pointRadius: 3,
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

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Module snapshots
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moduleSummaries.map((mod) => (
            <Card
              key={mod.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/reports/${mod.key}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/reports/${mod.key}`);
                }
              }}
              className={cn(
                "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-primary/20",
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {mod.label}
                  </p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                  {mod.headline}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {mod.description}
                  </p>
                  <GrowthIndicator value={mod.trend} suffix="" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <DrilldownSheet
        open={drill === "revenue"}
        onOpenChange={(o) => !o && setDrill(null)}
        title="Revenue breakdown"
        description="How this period's revenue splits across the business."
      >
        <div>
          <DrillRow
            label="Total revenue"
            value={formatINR(model.revenue)}
            strong
          />
          <DrillRow
            label="vs previous period"
            value={
              <GrowthIndicator
                value={salesReport.kpis.revenueGrowth}
                suffix=""
              />
            }
          />
          <DrillRow label="Orders" value={salesReport.kpis.totalOrders} />
          <DrillRow
            label="Avg order value"
            value={formatINR(salesReport.kpis.avgOrderValue)}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">
            Top products
          </p>
          {salesReport.topProducts.slice(0, 4).map((p) => (
            <DrillRow key={p.sku} label={p.name} value={formatINR(p.revenue)} />
          ))}
        </div>
      </DrilldownSheet>
    </div>
  );
};

export default ReportsOverview;
