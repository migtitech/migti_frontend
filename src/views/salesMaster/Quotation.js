import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, IndianRupee, Send } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  formatQuotationStatus,
  statusVariant,
} from "./components/statusFormatters";
import { quotations } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const columns = [
  { key: "id", label: "Quotation #", sortable: true },
  { key: "client", label: "Client", sortable: true },
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
    render: (row) => (
      <StatusBadge variant={statusVariant(row.status)}>
        {formatQuotationStatus(row.status)}
      </StatusBadge>
    ),
  },
];

const Quotation = () => {
  const navigate = useNavigate();
  const totalValue = quotations.reduce((sum, q) => sum + q.amount, 0);
  const sent = quotations.filter((q) => q.status === "sentToClient").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation"
        description="Quotations you have raised for clients. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Quotations"
          value={quotations.length}
          icon={FileText}
          color="primary"
        />
        <StatCard
          title="Total Value"
          value={formatINR(totalValue)}
          icon={IndianRupee}
          color="success"
        />
        <StatCard
          title="Sent to Client"
          value={sent}
          icon={Send}
          color="info"
        />
      </div>

      <DataTable
        columns={columns}
        rows={quotations}
        rowKey={(r) => r.id}
        exportFileName="quotations"
        onRowClick={(row) => navigate(`/sales-master/quotation/${row.id}`)}
      />
    </div>
  );
};

export default Quotation;
