import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2 } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { statusVariant } from "./components/statusFormatters";
import { queryFollowups } from "../../data/salesMasterDummyData";

const columns = [
  { key: "queryId", label: "Query #", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "followupDate", label: "Follow-up Date", sortable: true },
  { key: "note", label: "Note" },
  { key: "nextAction", label: "Next Action" },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const QueryFollowup = () => {
  const navigate = useNavigate();
  const pending = queryFollowups.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Query Follow-up"
        description="Follow-up activity tracked against your open queries. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Pending Follow-ups"
          value={pending}
          icon={Bell}
          color="warning"
        />
        <StatCard
          title="Completed"
          value={queryFollowups.length - pending}
          icon={CheckCircle2}
          color="success"
        />
      </div>

      <DataTable
        columns={columns}
        rows={queryFollowups}
        rowKey={(r) => r.queryId}
        exportFileName="query-followups"
        onRowClick={(row) => navigate(`/sales-master/query/${row.queryId}`)}
      />
    </div>
  );
};

export default QueryFollowup;
