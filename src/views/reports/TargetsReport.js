import React, { useMemo, useState } from "react";
import { CChartLine } from "@coreui/react-chartjs";
import { Target, CheckCircle2, Trophy, AlertOctagon } from "lucide-react";
import { PageHeader, DataTable } from "../../components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Progress,
} from "../../components/ui";
import ReportsSubNav from "./components/ReportsSubNav";
import {
  SmartKpiCard,
  ReportToolbar,
  InsightStrip,
  DrilldownSheet,
  DrillRow,
  formatINR,
  buildInsights,
  trendInsight,
  bestOf,
  worstOf,
  exportRowsToCsv,
} from "./components/smart";
import { targetsReport, REPORT_MONTHS } from "../../data/reportsDummyData";

const TargetsReport = () => {
  const { kpis, achievementTrend, byTeam } = targetsReport;

  const [period, setPeriod] = useState("this_quarter");
  const [compare, setCompare] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drill, setDrill] = useState(null);

  const insights = useMemo(
    () =>
      buildInsights([
        trendInsight(
          "Achievement",
          achievementTrend,
          `${achievementTrend.at(-1)}%`,
        ),
        bestOf(
          byTeam,
          (t) => t.team,
          (t) => t.pct,
          (v) => `${v}% achieved`,
        ),
        worstOf(
          byTeam,
          (t) => t.team,
          (t) => t.pct,
          (v) => `${v}% achieved`,
        ),
        {
          tone: kpis.atRiskTargets > 0 ? "warning" : "positive",
          text: `${kpis.atRiskTargets} target(s) at risk — below 90% with under 2 weeks left.`,
        },
      ]),
    [achievementTrend, byTeam, kpis],
  );

  const teamColumns = useMemo(
    () => [
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
            <span className="text-sm font-semibold tabular-nums">
              {row.pct}%
            </span>
          </div>
        ),
        sortValue: (row) => row.pct,
      },
    ],
    [],
  );

  const handleExport = () =>
    exportRowsToCsv(
      "targets-by-team",
      [
        { label: "Team", value: (r) => r.team },
        { label: "Target", value: (r) => r.target },
        { label: "Achieved", value: (r) => r.achieved },
        { label: "Achievement %", value: (r) => r.pct },
      ],
      byTeam,
    );

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targets Report"
        description="Target achievement across teams and regions. Interactive sample data."
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
      />

      <InsightStrip insights={insights} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SmartKpiCard
          title="Overall Achievement"
          value={`${kpis.overallAchievement}%`}
          icon={Target}
          color="primary"
          delta={compare ? kpis.achievementGrowth : null}
          spark={achievementTrend}
        />
        <SmartKpiCard
          title="Targets Met"
          value={`${kpis.targetsMet}/${kpis.targetsTotal}`}
          icon={CheckCircle2}
          color="success"
          footnote="this quarter"
        />
        <SmartKpiCard
          title="Top Team"
          value={`${kpis.topTeamAchievement}%`}
          icon={Trophy}
          color="info"
          footnote="North Region"
        />
        <SmartKpiCard
          title="At-risk Targets"
          value={kpis.atRiskTargets}
          icon={AlertOctagon}
          color="danger"
          footnote="< 90%, under 2 weeks"
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
          <CardDescription>Click a team to drill in</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={teamColumns}
            rows={byTeam}
            rowKey={(r) => r.team}
            showSearch={false}
            maxHeight="none"
            onRowClick={(row) => setDrill(row)}
          />
        </CardContent>
      </Card>

      <DrilldownSheet
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drill?.team}
        description="Target vs achievement detail"
      >
        {drill && (
          <div>
            <DrillRow label="Target" value={formatINR(drill.target)} strong />
            <DrillRow label="Achieved" value={formatINR(drill.achieved)} />
            <DrillRow label="Achievement" value={`${drill.pct}%`} />
            <DrillRow
              label="Gap"
              value={formatINR(Math.abs(drill.target - drill.achieved))}
            />
            <DrillRow
              label="Status"
              value={
                drill.pct >= 100
                  ? "On / above target"
                  : drill.pct >= 90
                    ? "Near target"
                    : "Behind"
              }
            />
          </div>
        )}
      </DrilldownSheet>
    </div>
  );
};

export default TargetsReport;
