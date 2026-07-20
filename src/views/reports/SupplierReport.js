import React, { useMemo, useState } from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import { Factory, Star, Clock, IndianRupee } from "lucide-react";
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
import { supplierReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const RatingCell = ({ value }) => (
  <span className="inline-flex items-center gap-1 font-medium">
    <Star className="h-3.5 w-3.5 fill-warning text-warning!" />
    {Number(value).toFixed(1)}
  </span>
);

const onTimeClass = (pct) =>
  pct >= 90
    ? "font-semibold text-success!"
    : pct >= 80
      ? "font-semibold text-warning!"
      : "font-semibold text-destructive";

const topSupplierColumns = [
  { key: "name", label: "Supplier", sortable: true },
  { key: "category", label: "Category", sortable: true },
  { key: "orders", label: "Orders", sortable: true, align: "right" },
  {
    key: "spend",
    label: "Spend",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.spend),
    sortValue: (row) => row.spend,
  },
  {
    key: "rating",
    label: "Rating",
    align: "right",
    render: (row) => <RatingCell value={row.rating} />,
    sortValue: (row) => row.rating,
  },
];

const SupplierReport = () => {
  const {
    kpis,
    monthlyOnTime,
    monthlyDelayed,
    spendByCategory,
    ratingSplit,
    topSuppliers,
    suppliers,
  } = supplierReport;

  const [period, setPeriod] = useState("this_month");
  const [compare, setCompare] = useState(true);
  const [category, setCategory] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [drill, setDrill] = useState(null);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...spendByCategory.map((c) => ({ value: c.label, label: c.label })),
    ],
    [spendByCategory],
  );

  const m = useMemo(() => {
    const rows = category
      ? suppliers.filter((s) => s.category === category)
      : suppliers;
    return {
      spend: scaleValue(kpis.totalSpend, period, "spend"),
      onTimeSeries: scaleSeries(monthlyOnTime, period, "ot"),
      delayedSeries: scaleSeries(monthlyDelayed, period, "dl"),
      rows,
    };
  }, [period, category, kpis, monthlyOnTime, monthlyDelayed, suppliers]);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight("On-time spend", m.onTimeSeries),
        bestOf(
          topSuppliers,
          (s) => s.name,
          (s) => s.onTime,
          (v) => `${v}% on-time`,
        ),
        worstOf(
          suppliers,
          (s) => s.name,
          (s) => s.rating,
          (v) => `${v.toFixed(1)}★`,
        ),
        {
          tone:
            suppliers.filter((s) => s.status !== "active").length > 0
              ? "warning"
              : "neutral",
          text: `${suppliers.filter((s) => s.status !== "active").length} suppliers need review (below active status).`,
        },
      ]),
    [m, topSuppliers, suppliers],
  );

  const supplierColumns = useMemo(
    () => [
      { key: "name", label: "Supplier", sortable: true },
      { key: "category", label: "Category", sortable: true },
      { key: "city", label: "City", sortable: true },
      {
        key: "rating",
        label: "Rating",
        sortable: true,
        align: "right",
        render: (row) => <RatingCell value={row.rating} />,
        sortValue: (row) => row.rating,
      },
      {
        key: "onTime",
        label: "On-Time %",
        sortable: true,
        align: "right",
        render: (row) => (
          <span className={onTimeClass(row.onTime)}>{row.onTime}%</span>
        ),
        sortValue: (row) => row.onTime,
      },
      {
        key: "spend",
        label: "Spend",
        sortable: true,
        align: "right",
        render: (row) => formatINR(row.spend),
        sortValue: (row) => row.spend,
      },
      {
        key: "status",
        label: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  const handleExport = () =>
    exportRowsToCsv(
      "supplier-report",
      [
        { label: "Supplier", value: (r) => r.name },
        { label: "Category", value: (r) => r.category },
        { label: "City", value: (r) => r.city },
        { label: "Rating", value: (r) => r.rating },
        { label: "On-Time %", value: (r) => r.onTime },
        { label: "Spend", value: (r) => r.spend },
        { label: "Status", value: (r) => r.status },
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
        title="Supplier Report"
        description="Supplier spend, delivery reliability and quality ratings. Interactive sample data."
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
            id: "category",
            label: "Category",
            value: category,
            onChange: setCategory,
            options: categoryOptions,
          },
        ]}
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Active Suppliers"
          value={`${kpis.activeSuppliers} / ${kpis.totalSuppliers}`}
          icon={Factory}
          color="primary"
          delta={compare ? kpis.suppliersGrowth : null}
        />
        <SmartKpiCard
          title="Avg Rating"
          value={kpis.avgRating.toFixed(1)}
          icon={Star}
          color="warning"
          delta={compare ? kpis.ratingGrowth : null}
        />
        <SmartKpiCard
          title="On-Time Delivery"
          value={`${kpis.onTimeRate}%`}
          icon={Clock}
          color="success"
          delta={compare ? kpis.onTimeGrowth : null}
          spark={m.onTimeSeries}
        />
        <SmartKpiCard
          title="Total Spend"
          value={formatINRCompact(m.spend)}
          icon={IndianRupee}
          color="info"
          delta={compare ? kpis.spendGrowth : null}
          spark={m.onTimeSeries}
          footnote={
            compare
              ? `was ${formatINRCompact(prevValue(m.spend, kpis.spendGrowth))}`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>On-Time vs Delayed Spend</CardTitle>
            <CardDescription>Selected period · sample data</CardDescription>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "300px" }}
              data={{
                labels: REPORT_MONTHS,
                datasets: [
                  {
                    label: "On-time",
                    backgroundColor: "#12b76a",
                    data: m.onTimeSeries,
                  },
                  {
                    label: "Delayed",
                    backgroundColor: "#f04438",
                    data: m.delayedSeries,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "top" } },
                scales: {
                  x: { stacked: true },
                  y: {
                    stacked: true,
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
            <CardTitle>Supplier Rating Split</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartDoughnut
              style={{ height: "300px" }}
              data={{
                labels: ratingSplit.map((r) => r.label),
                datasets: [
                  {
                    data: ratingSplit.map((r) => r.value),
                    backgroundColor: ratingSplit.map((r) => r.color),
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
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartBar
              style={{ height: "280px" }}
              data={{
                labels: spendByCategory.map((c) => c.label),
                datasets: [
                  {
                    label: "Spend",
                    backgroundColor: spendByCategory.map((c) => c.color),
                    data: spendByCategory.map((c) => c.value),
                  },
                ],
              }}
              options={{
                indexAxis: "y",
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: { callback: (v) => `₹${(v / 100000).toFixed(1)}L` },
                  },
                },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers by Spend</CardTitle>
            <CardDescription>Click a supplier to drill in</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={topSupplierColumns}
              rows={topSuppliers}
              rowKey={(r) => r.name}
              showSearch={false}
              maxHeight="none"
              onRowClick={(row) => setDrill(row)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>
            {category
              ? `Filtered: ${category}`
              : "All suppliers with performance snapshot"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={supplierColumns}
            rows={m.rows}
            rowKey={(r) => r.name}
            exportFileName="supplier-report"
            onRowClick={(row) => setDrill(row)}
          />
        </CardContent>
      </Card>

      <DrilldownSheet
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drill?.name}
        description={
          drill
            ? `${drill.category}${drill.city ? ` · ${drill.city}` : ""}`
            : ""
        }
      >
        {drill && (
          <div>
            <DrillRow
              label="Total spend"
              value={formatINR(drill.spend)}
              strong
            />
            <DrillRow
              label="Rating"
              value={<RatingCell value={drill.rating} />}
            />
            <DrillRow label="On-time delivery" value={`${drill.onTime}%`} />
            {drill.orders != null && (
              <DrillRow label="Orders" value={drill.orders} />
            )}
            {drill.status && (
              <DrillRow
                label="Status"
                value={<StatusBadge status={drill.status} />}
              />
            )}
          </div>
        )}
      </DrilldownSheet>
    </div>
  );
};

export default SupplierReport;
