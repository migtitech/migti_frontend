import React from "react";
import { CChartLine, CChartPie } from "@coreui/react-chartjs";
import { Users, CalendarCheck, Hourglass, UserMinus } from "lucide-react";
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
import { hrReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const performerColumns = [
  { key: "name", label: "Employee", sortable: true },
  { key: "dept", label: "Department", sortable: true },
  { key: "role", label: "Role", sortable: true },
  {
    key: "score",
    label: "Performance Score",
    sortable: true,
    align: "right",
    render: (row) => (
      <Badge variant={row.score >= 90 ? "success" : "info"}>{row.score}</Badge>
    ),
  },
];

const HrReport = () => {
  const { kpis, headcountByDept, attendanceTrend, topPerformers } = hrReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Report"
        description="Headcount, attendance, tenure and attrition across departments. Sample data for UI preview."
      />
      <ReportsSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Headcount"
          value={kpis.headcount}
          subtitle={<GrowthIndicator value={kpis.headcountGrowth} />}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Attendance Rate"
          value={`${kpis.attendanceRate}%`}
          subtitle={<GrowthIndicator value={kpis.attendanceGrowth} />}
          icon={CalendarCheck}
          color="success"
        />
        <StatCard
          title="Avg Tenure"
          value={`${kpis.avgTenureYears} yrs`}
          subtitle={<GrowthIndicator value={kpis.tenureGrowth} />}
          icon={Hourglass}
          color="info"
        />
        <StatCard
          title="Attrition Rate"
          value={`${kpis.attritionRate}%`}
          subtitle={<GrowthIndicator value={kpis.attritionGrowth} />}
          icon={UserMinus}
          color="warning"
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
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={performerColumns}
            rows={topPerformers}
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
