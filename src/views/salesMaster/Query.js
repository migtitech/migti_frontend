import React from "react";
import { useNavigate } from "react-router-dom";
import { CircleDot, CheckCircle2, Sigma } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  formatQueryStatus,
  statusVariant,
} from "./components/statusFormatters";
import { queries } from "../../data/salesMasterDummyData";

const columns = [
  { key: "id", label: "Query #", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "product", label: "Product", sortable: true },
  { key: "date", label: "Date", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge variant={statusVariant(row.status)}>
        {formatQueryStatus(row.status)}
      </StatusBadge>
    ),
  },
];

const Query = () => {
  const navigate = useNavigate();
  const open = queries.filter((q) => q.status === "open").length;
  const quoted = queries.filter((q) => q.status === "quoted").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Query"
        description="Client product queries assigned to you. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Queries"
          value={queries.length}
          icon={Sigma}
          color="primary"
        />
        <StatCard title="Open" value={open} icon={CircleDot} color="warning" />
        <StatCard
          title="Quoted"
          value={quoted}
          icon={CheckCircle2}
          color="info"
        />
      </div>

      <DataTable
        columns={columns}
        rows={queries}
        rowKey={(r) => r.id}
        exportFileName="queries"
        onRowClick={(row) => navigate(`/sales-master/query/${row.id}`)}
      />
    </div>
  );
};

export default Query;
