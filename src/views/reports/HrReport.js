import React, { useMemo, useState } from "react";
import { CChartLine, CChartPie } from "@coreui/react-chartjs";
import { Users, CalendarCheck, Hourglass, UserMinus } from "lucide-react";
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
  buildInsights,
  trendInsight,
  bestOf,
  exportRowsToCsv,
} from "./components/smart";
import { hrReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const HrReport = () => {
  const { kpis, headcountByDept, attendanceTrend, topPerformers } = hrReport;

  const [period, setPeriod] = useState("this_month");
  const [compare, setCompare] = useState(true);
  const [dept, setDept] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const deptOptions = useMemo(
    () => [
      { value: "", label: "All departments" },
      ...headcountByDept.map((d) => ({ value: d.label, label: d.label })),
    ],
    [headcountByDept],
  );

  const m = useMemo(() => {
    const rows = dept
      ? topPerformers.filter((p) => p.dept === dept)
      : topPerformers;
    return { rows };
  }, [dept, topPerformers]);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight(
          "Attendance",
          attendanceTrend,
          `${attendanceTrend.at(-1)}%`,
        ),
        bestOf(
          topPerformers,
          (p) => p.name,
          (p) => p.score,
          (v) => `score ${v}`,
        ),
        {
          tone: kpis.attritionRate < 6 ? "positive" : "warning",
          text: `Attrition is ${kpis.attritionRate}% (${kpis.attritionGrowth < 0 ? "improving" : "rising"}).`,
        },
        {
          tone: "neutral",
          text: `Largest team: ${[...headcountByDept].sort((a, b) => b.value - a.value)[0].label} (${[...headcountByDept].sort((a, b) => b.value - a.value)[0].value} people).`,
        },
      ]),
    [attendanceTrend, topPerformers, kpis, headcountByDept],
  );

  const performerColumns = useMemo(
    () => [
      { key: "name", label: "Employee", sortable: true },
      { key: "dept", label: "Department", sortable: true },
      { key: "role", label: "Role", sortable: true },
      {
        key: "score",
        label: "Performance Score",
        sortable: true,
        align: "right",
        render: (row) => (
          <Badge variant={row.score >= 90 ? "success" : "info"}>
            {row.score}
          </Badge>
        ),
        sortValue: (row) => row.score,
      },
    ],
    [],
  );

  const handleExport = () =>
    exportRowsToCsv(
      "hr-top-performers",
      [
        { label: "Employee", value: (r) => r.name },
        { label: "Department", value: (r) => r.dept },
        { label: "Role", value: (r) => r.role },
        { label: "Score", value: (r) => r.score },
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
        title="HR Report"
        description="Headcount, attendance, tenure and attrition across departments. Interactive sample data."
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
            id: "dept",
            label: "Department",
            value: dept,
            onChange: setDept,
            options: deptOptions,
          },
        ]}
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Headcount"
          value={kpis.headcount}
          icon={Users}
          color="primary"
          delta={compare ? kpis.headcountGrowth : null}
        />
        <SmartKpiCard
          title="Attendance Rate"
          value={`${kpis.attendanceRate}%`}
          icon={CalendarCheck}
          color="success"
          delta={compare ? kpis.attendanceGrowth : null}
          spark={attendanceTrend}
        />
        <SmartKpiCard
          title="Avg Tenure"
          value={`${kpis.avgTenureYears} yrs`}
          icon={Hourglass}
          color="info"
          delta={compare ? kpis.tenureGrowth : null}
        />
        <SmartKpiCard
          title="Attrition Rate"
          value={`${kpis.attritionRate}%`}
          icon={UserMinus}
          color="warning"
          delta={compare ? kpis.attritionGrowth : null}
          invertDelta
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>
              Monthly attendance rate, last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CChartLine
              style={{ height: "300px" }}
              data={{
                labels: REPORT_MONTHS,
                datasets: [
                  {
                    label: "Attendance %",
                    data: attendanceTrend,
                    borderColor: "#12b76a",
                    backgroundColor: "rgba(18, 183, 106, 0.12)",
                    tension: 0.35,
                    fill: true,
                    pointRadius: 3,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 90, max: 100 } },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <CChartPie
              style={{ height: "300px" }}
              data={{
                labels: headcountByDept.map((d) => d.label),
                datasets: [
                  {
                    data: headcountByDept.map((d) => d.value),
                    backgroundColor: headcountByDept.map((d) => d.color),
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
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>
            {dept ? `Filtered: ${dept}` : "Highest-scoring employees"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={performerColumns}
            rows={m.rows}
            rowKey={(r) => r.name}
            showSearch={false}
            maxHeight="none"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default HrReport;
