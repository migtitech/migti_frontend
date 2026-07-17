import React from "react";
import { useNavigate } from "react-router-dom";
import { CChartLine } from "@coreui/react-chartjs";
import {
  IndianRupee,
  ShoppingBasket,
  Landmark,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { PageHeader, StatCard } from "../../components";
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
  overviewReport,
  salesReport,
  purchaseReport,
  financeReport,
  inventoryReport,
} from "../../data/reportsDummyData";
import { cn } from "../../lib/utils";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const ReportsOverview = () => {
  const navigate = useNavigate();
  const { revenueVsSpend, moduleSummaries } = overviewReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="mds-display-lg">Reports</span>}
        description="A single, unified view across Sales, Purchase, Inventory, Finance, HR and Targets. Data shown is sample/demo data for UI preview."
      />

      <ReportsSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatINR(overviewReport.kpis.totalRevenue)}
          subtitle={<GrowthIndicator value={salesReport.kpis.revenueGrowth} />}
          icon={IndianRupee}
          color="primary"
        />
        <StatCard
          title="Total Purchase Spend"
          value={formatINR(overviewReport.kpis.totalSpend)}
          subtitle={<GrowthIndicator value={purchaseReport.kpis.spendGrowth} />}
          icon={ShoppingBasket}
          color="info"
        />
        <StatCard
          title="Net Profit"
          value={formatINR(overviewReport.kpis.netProfit)}
          subtitle={
            <GrowthIndicator value={financeReport.kpis.netProfitGrowth} />
          }
          icon={Landmark}
          color="success"
        />
        <StatCard
          title="Inventory Value"
          value={formatINR(overviewReport.kpis.stockValue)}
          subtitle={
            <GrowthIndicator value={inventoryReport.kpis.stockValueGrowth} />
          }
          icon={Boxes}
          color="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Purchase Spend</CardTitle>
          <CardDescription>Last 6 months, sample trend</CardDescription>
        </CardHeader>
        <CardContent>
          <CChartLine
            style={{ height: "300px" }}
            data={{
              labels: revenueVsSpend.months,
              datasets: [
                {
                  label: "Revenue",
                  data: revenueVsSpend.revenue,
                  borderColor: "#2563eb",
                  backgroundColor: "rgba(37, 99, 235, 0.12)",
                  tension: 0.35,
                  fill: true,
                  pointRadius: 3,
                },
                {
                  label: "Purchase Spend",
                  data: revenueVsSpend.spend,
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
              onClick={() =>
                navigate(`/reports/${mod.key === "sales" ? "sales" : mod.key}`)
              }
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
    </div>
  );
};

export default ReportsOverview;
