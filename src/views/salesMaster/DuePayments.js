import React from "react";
import { useNavigate } from "react-router-dom";
import { IndianRupee, AlertTriangle, Clock, Wallet } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { statusVariant } from "./components/statusFormatters";
import { duePayments } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const columns = [
  { key: "id", label: "Invoice #", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "dueDate", label: "Due Date", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.amount),
    sortValue: (row) => row.amount,
  },
  {
    key: "daysOverdue",
    label: "Days Overdue",
    sortable: true,
    align: "right",
    render: (row) => (row.daysOverdue > 0 ? `${row.daysOverdue} days` : "—"),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const DuePayments = () => {
  const navigate = useNavigate();
  const totalDue = duePayments.reduce((sum, r) => sum + r.amount, 0);
  const overdue = duePayments.filter((r) => r.status === "overdue");
  const overdueAmount = overdue.reduce((sum, r) => sum + r.amount, 0);
  const pendingAmount = totalDue - overdueAmount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Due Payments"
        description="Outstanding client payments for your accounts. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Due"
          value={formatINR(totalDue)}
          icon={Wallet}
          color="primary"
        />
        <StatCard
          title="Overdue Amount"
          value={formatINR(overdueAmount)}
          subtitle={`${overdue.length} invoices`}
          icon={AlertTriangle}
          color="danger"
        />
        <StatCard
          title="Pending (not yet due)"
          value={formatINR(pendingAmount)}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Total Invoices"
          value={duePayments.length}
          icon={IndianRupee}
          color="info"
        />
      </div>

      <DataTable
        columns={columns}
        rows={duePayments}
        rowKey={(r) => r.id}
        exportFileName="due-payments"
        rowClassName={(row) =>
          row.status === "overdue" ? "bg-destructive/5" : ""
        }
        onRowClick={(row) => navigate(`/sales-master/due-payments/${row.id}`)}
      />
    </div>
  );
};

export default DuePayments;
