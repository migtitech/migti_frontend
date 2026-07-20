import React, { useMemo, useState } from "react";
import { CChartBar, CChartPie } from "@coreui/react-chartjs";
import { IndianRupee, ClipboardList, Timer, Truck } from "lucide-react";
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
import { purchaseReport, REPORT_MONTHS } from "../../data/reportsDummyData";

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

const PurchaseReport = () => {
  const { kpis, monthlySpend, spendByCategory, topSuppliers, pendingPOs } =
    purchaseReport;

  const [period, setPeriod] = useState("this_month");
  const [compare, setCompare] = useState(true);
  const [status, setStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [drill, setDrill] = useState(null);

  const m = useMemo(() => {
    const rows = status
      ? pendingPOs.filter((p) => p.status === status)
      : pendingPOs;
    return {
      spend: scaleValue(kpis.totalSpend, period, "spend"),
      pos: scaleValue(kpis.totalPOs, period, "po"),
      spendSeries: scaleSeries(monthlySpend, period, "spend"),
      rows,
    };
  }, [period, status, kpis, monthlySpend, pendingPOs]);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight("Purchase spend", m.spendSeries),
        bestOf(
          topSuppliers,
          (s) => s.name,
          (s) => s.onTime,
          (v) => `${v}% on-time`,
        ),
        worstOf(
          topSuppliers,
          (s) => s.name,
          (s) => s.onTime,
          (v) => `${v}% on-time`,
        ),
        {
          tone: kpis.onTimeDeliveryRate >= 90 ? "positive" : "warning",
          text: `On-time delivery is ${kpis.onTimeDeliveryRate}% with a ${kpis.avgLeadTimeDays}-day avg lead time.`,
        },
      ]),
    [m, topSuppliers, kpis],
  );

  const statusOptions = useMemo(() => {
    const set = Array.from(new Set(pendingPOs.map((p) => p.status)));
    return [
      { value: "", label: "All statuses" },
      ...set.map((s) => ({ value: s, label: s })),
    ];
  }, [pendingPOs]);

  const supplierColumns = useMemo(
    () => [
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
        sortValue: (row) => row.onTime,
      },
    ],
    [],
  );

  const handleExport = () =>
    exportRowsToCsv(
      "purchase-orders-report",
      [
        { label: "PO #", value: (r) => r.id },
        { label: "Supplier", value: (r) => r.supplier },
        { label: "Date", value: (r) => r.date },
        { label: "Amount", value: (r) => r.amount },
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
        title="Purchase Report"
        description="Spend, purchase orders, supplier performance and delivery. Interactive sample data."
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
            id: "status",
            label: "PO status",
            value: status,
            onChange: setStatus,
            options: statusOptions,
          },
        ]}
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Total Spend"
          value={formatINRCompact(m.spend)}
          icon={IndianRupee}
          color="primary"
          delta={compare ? kpis.spendGrowth : null}
          spark={m.spendSeries}
          footnote={
            compare
              ? `was ${formatINRCompact(prevValue(m.spend, kpis.spendGrowth))}`
              : undefined
          }
        />
        <SmartKpiCard
          title="Purchase Orders"
          value={m.pos}
          icon={ClipboardList}
          color="info"
          delta={compare ? kpis.poGrowth : null}
        />
        <SmartKpiCard
          title="Avg Lead Time"
          value={`${kpis.avgLeadTimeDays} days`}
          icon={Timer}
          color="warning"
          delta={compare ? kpis.leadTimeGrowth : null}
          invertDelta
        />
        <SmartKpiCard
          title="On-time Delivery"
          value={`${kpis.onTimeDeliveryRate}%`}
          icon={Truck}
          color="success"
          delta={compare ? kpis.onTimeGrowth : null}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Purchase Spend</CardTitle>
            <CardDescription>Selected period · sample data</CardDescription>
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
                    data: m.spendSeries,
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
          <CardDescription>Click a supplier to drill in</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={supplierColumns}
            rows={topSuppliers}
            rowKey={(r) => r.name}
            showSearch={false}
            maxHeight="none"
            onRowClick={(row) => setDrill(row)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending / Recent Purchase Orders</CardTitle>
          <CardDescription>
            {status ? `Filtered: ${status}` : "Latest PO activity"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={poColumns}
            rows={m.rows}
            rowKey={(r) => r.id}
            exportFileName="purchase-orders-report"
          />
        </CardContent>
      </Card>

      <DrilldownSheet
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drill?.name}
        description="Supplier performance snapshot"
      >
        {drill && (
          <div>
            <DrillRow
              label="Total spend"
              value={formatINR(drill.spend)}
              strong
            />
            <DrillRow label="Orders" value={drill.orders} />
            <DrillRow label="On-time delivery" value={`${drill.onTime}%`} />
            <DrillRow
              label="Avg order value"
              value={formatINR(Math.round(drill.spend / drill.orders))}
            />
          </div>
        )}
      </DrilldownSheet>
    </div>
  );
};

export default PurchaseReport;
