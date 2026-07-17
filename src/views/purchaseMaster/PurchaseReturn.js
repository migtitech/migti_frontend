import React from "react";
import { RotateCcw, AlertTriangle, TrendingDown } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { statusVariant } from "./components/statusFormatters";
import { purchaseReturns } from "../../data/purchaseMasterDummyData";

const columns = [
  { key: "id", label: "Return #", sortable: true },
  { key: "po", label: "PO #", sortable: true },
  { key: "supplier", label: "Supplier", sortable: true },
  { key: "product", label: "Product", sortable: true },
  { key: "qty", label: "Qty", align: "right", sortable: true },
  { key: "reason", label: "Reason" },
  { key: "raisedOn", label: "Raised On", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
  {
    key: "performanceImpact",
    label: "Performance Impact",
    align: "right",
    render: (row) => (
      <span className="font-medium text-destructive">
        {row.performanceImpact} pts
      </span>
    ),
  },
];

/**
 * Purchase Return: goods purchased in error / needing return. Each return
 * negatively affects the purchase manager's performance score. Sample data
 * for UI preview.
 */
const PurchaseReturn = () => {
  const totalImpact = purchaseReturns.reduce(
    (sum, r) => sum + r.performanceImpact,
    0,
  );
  const pending = purchaseReturns.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Return"
        description="Purchases that were wrong or need to be returned. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Returns"
          value={purchaseReturns.length}
          icon={RotateCcw}
          color="primary"
        />
        <StatCard
          title="Pending"
          value={pending.length}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Performance Impact"
          value={`${totalImpact} pts`}
          subtitle="reduces your performance score"
          icon={TrendingDown}
          color="danger"
        />
      </div>

      <DataTable
        columns={columns}
        rows={purchaseReturns}
        rowKey={(r) => r.id}
        exportFileName="purchase-returns"
      />
    </div>
  );
};

export default PurchaseReturn;
