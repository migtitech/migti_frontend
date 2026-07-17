import React from "react";
import { CChartLine } from "@coreui/react-chartjs";
import { Target, CheckCircle2, Trophy, AlertOctagon } from "lucide-react";
import { PageHeader, StatCard, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Progress,
} from "../../components/ui";
import ReportsSubNav from "./components/ReportsSubNav";
import GrowthIndicator from "./components/GrowthIndicator";
import { targetsReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const teamColumns = [
  { key: "team", label: "Team / Vertical", sortable: true },
  {
    key: "target",
    label: "Target",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.target),
    sortValue: (row) => row.target,
  },
  {
    key: "achieved",
    label: "Achieved",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.achieved),
    sortValue: (row) => row.achieved,
  },
  {
    key: "pct",
    label: "Achievement",
    sortable: true,
    render: (row) => (
      <div className="flex min-w-[140px] items-center gap-2">
        <Progress
          value={Math.min(row.pct, 100)}
          color={
            row.pct >= 100
              ? "success"
              : row.pct >= 90
                ? "warning"
                : "destructive"
          }
          className="h-2 w-24"
        />
        <span className="text-sm font-semibold tabular-nums">{row.pct}%</span>
      </div>
    ),
  },
];

const TargetsReport = () => {
  const { kpis, achievementTrend, byTeam } = targetsReport;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targets Report"
        description="Target achievement across teams and regions. Sample data for UI preview."
      />
      <ReportsSubNav />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Overall Achievement"
          value={`${kpis.overallAchievement}%`}
          subtitle={<GrowthIndicator value={kpis.achievementGrowth} />}
          icon={Target}
          color="primary"
        />
        <StatCard
          title="Targets Met"
          value={`${kpis.targetsMet}/${kpis.targetsTotal}`}
          subtitle="this quarter"
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="Top Team Achievement"
          value={`${kpis.topTeamAchievement}%`}
          subtitle="North Region"
          icon={Trophy}
          color="info"
        />
        <StatCard
          title="At-risk Targets"
          value={kpis.atRiskTargets}
          subtitle="below 90% with < 2 weeks left"
          icon={AlertOctagon}
          color="danger"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievement Trend</CardTitle>
          <CardDescription>Overall % achieved, last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <CChartLine
            style={{ height: "280px" }}
            data={{
              labels: REPORT_MONTHS,
              datasets: [
                {
                  label: "Achievement %",
                  data: achievementTrend,
                  borderColor: "#2563eb",
                  backgroundColor: "rgba(37, 99, 235, 0.12)",
                  tension: 0.35,
                  fill: true,
                  pointRadius: 3,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { min: 60, max: 100 } },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Achievement by Team</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={teamColumns}
            rows={byTeam}
            rowKey={(r) => r.team}
            showSearch={false}
            maxHeight="none"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TargetsReport;
