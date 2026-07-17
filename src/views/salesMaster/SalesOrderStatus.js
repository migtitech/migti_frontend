import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, PackageCheck, Clock, XCircle } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  formatOrderStatus,
  statusVariant,
} from "./components/statusFormatters";
import { salesOrders } from "../../data/salesMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const columns = [
  { key: "id", label: "Order #", sortable: true },
  { key: "client", label: "Client", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "items", label: "Items", sortable: true, align: "right" },
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
        {formatOrderStatus(row.status)}
      </StatusBadge>
    ),
  },
];

const SalesOrderStatus = () => {
  const navigate = useNavigate();
  const delivered = salesOrders.filter((o) => o.status === "delivered").length;
  const pending = salesOrders.filter(
    (o) => o.status === "pending" || o.status === "confirmed",
  ).length;
  const cancelled = salesOrders.filter((o) => o.status === "cancelled").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Order Status"
        description="Track status of sales orders you have created. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={salesOrders.length}
          icon={ShoppingCart}
          color="primary"
        />
        <StatCard
          title="Delivered"
          value={delivered}
          icon={PackageCheck}
          color="success"
        />
        <StatCard
          title="In Progress"
          value={pending}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Cancelled"
          value={cancelled}
          icon={XCircle}
          color="danger"
        />
      </div>

      <DataTable
        columns={columns}
        rows={salesOrders}
        rowKey={(r) => r.id}
        exportFileName="sales-order-status"
        onRowClick={(row) => navigate(`/sales-master/sales-order/${row.id}`)}
      />
    </div>
  );
};

export default SalesOrderStatus;
