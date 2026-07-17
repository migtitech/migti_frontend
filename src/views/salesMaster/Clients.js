import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserX, IndianRupee } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { statusVariant } from "./components/statusFormatters";
import { clients } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const columns = [
  { key: "name", label: "Client", sortable: true },
  { key: "city", label: "City", sortable: true },
  { key: "contact", label: "Contact Person", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "orders", label: "Orders", sortable: true, align: "right" },
  {
    key: "lifetimeValue",
    label: "Lifetime Value",
    sortable: true,
    align: "right",
    render: (row) => formatINR(row.lifetimeValue),
    sortValue: (row) => row.lifetimeValue,
  },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

const Clients = () => {
  const navigate = useNavigate();
  const active = clients.filter((c) => c.status === "active");
  const totalValue = clients.reduce((sum, c) => sum + c.lifetimeValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client"
        description="Clients under your sales portfolio. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={clients.length}
          icon={Users}
          color="primary"
        />
        <StatCard
          title="Active Clients"
          value={active.length}
          icon={UserCheck}
          color="success"
        />
        <StatCard
          title="Inactive Clients"
          value={clients.length - active.length}
          icon={UserX}
          color="warning"
        />
        <StatCard
          title="Total Lifetime Value"
          value={formatINR(totalValue)}
          icon={IndianRupee}
          color="info"
        />
      </div>

      <DataTable
        columns={columns}
        rows={clients}
        rowKey={(r) => r.id}
        exportFileName="clients"
        onRowClick={(row) => navigate(`/sales-master/clients/${row.id}`)}
      />
    </div>
  );
};

export default Clients;
