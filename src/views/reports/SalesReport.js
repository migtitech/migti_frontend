import React, { useMemo, useState } from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import { IndianRupee, ShoppingCart, Receipt, Percent } from "lucide-react";
import { PageHeader, StatusBadge, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui";
import ReportsSubNav from "./components/ReportsSubNav";
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
  bestOf,
  worstOf,
  exportRowsToCsv,
} from "./components/smart";
import { salesReport, REPORT_MONTHS } from "../../data/reportsDummyData";

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

const REGION_OPTIONS = [
  { value: "", label: "All regions" },
  { value: "North", label: "North" },
  { value: "West", label: "West" },
  { value: "South", label: "South" },
  { value: "East", label: "East" },
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

  const [period, setPeriod] = useState("this_month");
  const [compare, setCompare] = useState(true);
  const [region, setRegion] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [drillRep, setDrillRep] = useState(null);

  const m = useMemo(() => {
    const reps = region
      ? topSalesReps.filter((r) => r.region === region)
      : topSalesReps;
    return {
      revenue: scaleValue(kpis.totalRevenue, period, "rev"),
      orders: scaleValue(kpis.totalOrders, period, "ord"),
      aov: kpis.avgOrderValue,
      conversion: kpis.conversionRate,
      revSeries: scaleSeries(monthlyRevenue, period, "rev"),
      tgtSeries: scaleSeries(monthlyTarget, period, "tgt"),
      reps,
      orders_list: region
        ? recentOrders // recentOrders has no region; keep all when filtered
        : recentOrders,
    };
  }, [
    period,
    region,
    kpis,
    monthlyRevenue,
    monthlyTarget,
    topSalesReps,
    recentOrders,
  ]);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight("Revenue", m.revSeries),
        bestOf(
          m.reps,
          (r) => r.name,
          (r) => r.revenue,
          formatINRCompact,
        ),
        worstOf(
          m.reps,
          (r) => `${r.name}`,
          (r) => Math.round((r.revenue / r.target) * 100),
          (v) => `${v}% of target`,
        ),
        {
          tone:
            m.revSeries.at(-1) >= m.tgtSeries.at(-1) ? "positive" : "warning",
          text:
            m.revSeries.at(-1) >= m.tgtSeries.at(-1)
              ? "Latest month is above target."
              : "Latest month is tracking below target.",
        },
      ]),
    [m],
  );

  const repColumns = useMemo(
    () => [
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
        label: "Target",
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
    ],
    [],
  );

  const handleExport = () =>
    exportRowsToCsv(
      "sales-recent-orders",
      [
        { label: "Order #", value: (r) => r.id },
        { label: "Customer", value: (r) => r.customer },
        { label: "Date", value: (r) => r.date },
        { label: "Amount", value: (r) => r.amount },
        { label: "Status", value: (r) => r.status },
      ],
      recentOrders,
    );

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Report"
        description="Revenue, orders, conversion and rep performance. Interactive sample data."
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
            id: "region",
            label: "Region",
            value: region,
            onChange: setRegion,
            options: REGION_OPTIONS,
          },
        ]}
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Total Revenue"
          value={formatINRCompact(m.revenue)}
          icon={IndianRupee}
          color="primary"
          delta={compare ? kpis.revenueGrowth : null}
          spark={m.revSeries}
          footnote={
            compare
              ? `was ${formatINRCompact(prevValue(m.revenue, kpis.revenueGrowth))}`
              : undefined
          }
        />
        <SmartKpiCard
          title="Total Orders"
          value={m.orders}
          icon={ShoppingCart}
          color="info"
          delta={compare ? kpis.ordersGrowth : null}
        />
        <SmartKpiCard
          title="Avg Order Value"
          value={formatINR(m.aov)}
          icon={Receipt}
          color="success"
          delta={compare ? kpis.avgOrderGrowth : null}
        />
        <SmartKpiCard
          title="Conversion Rate"
          value={`${m.conversion}%`}
          icon={Percent}
          color="warning"
          delta={compare ? kpis.conversionGrowth : null}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Target</CardTitle>
            <CardDescription>Selected period · sample data</CardDescription>
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
                    data: m.revSeries,
                  },
                  {
                    label: "Target",
                    backgroundColor: "#d0d5dd",
                    data: m.tgtSeries,
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
            <CardDescription>Click a rep to drill in</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={repColumns}
              rows={m.reps}
              rowKey={(r) => r.name}
              showSearch={false}
              maxHeight="none"
              onRowClick={(row) => setDrillRep(row)}
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

      <DrilldownSheet
        open={!!drillRep}
        onOpenChange={(o) => !o && setDrillRep(null)}
        title={drillRep?.name}
        description={drillRep ? `${drillRep.region} region` : ""}
      >
        {drillRep && (
          <div>
            <DrillRow
              label="Revenue"
              value={formatINR(drillRep.revenue)}
              strong
            />
            <DrillRow label="Deals closed" value={drillRep.deals} />
            <DrillRow label="Target" value={formatINR(drillRep.target)} />
            <DrillRow
              label="Achievement"
              value={`${Math.round((drillRep.revenue / drillRep.target) * 100)}%`}
            />
            <DrillRow
              label="Avg deal size"
              value={formatINR(Math.round(drillRep.revenue / drillRep.deals))}
            />
          </div>
        )}
      </DrilldownSheet>
    </div>
  );
};

export default SalesReport;
