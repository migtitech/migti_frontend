import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2 } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { statusVariant } from "./components/statusFormatters";
import { quotationFollowups } from "../../data/salesMasterDummyData";

const columns = [
  { key: "quotationId", label: "Quotation #", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "followupDate", label: "Follow-up Date", sortable: true },
  { key: "stage", label: "Stage" },
  { key: "note", label: "Note" },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const QuotationFollowup = () => {
  const navigate = useNavigate();
  const pending = quotationFollowups.filter(
    (f) => f.status === "pending",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Followup"
        description="Follow-up activity tracked against your sent quotations. Sample data for UI preview."
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
          value={quotationFollowups.length - pending}
          icon={CheckCircle2}
          color="success"
        />
      </div>

      <DataTable
        columns={columns}
        rows={quotationFollowups}
        rowKey={(r) => r.quotationId}
        exportFileName="quotation-followups"
        onRowClick={(row) =>
          navigate(`/sales-master/quotation/${row.quotationId}`)
        }
      />
    </div>
  );
};

export default QuotationFollowup;
