import React from "react";
import { ShoppingBasket, Info } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import ProcurementMasterSubNav from "./components/ProcurementMasterSubNav";
import { statusVariant, stageLabel } from "./components/statusFormatters";
import { localProcurementBucket } from "../../data/procurementMasterDummyData";

const formatINR = (value) =>
  value == null
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const columns = [
  { key: "id", label: "Req #", sortable: true },
  { key: "product", label: "Product", sortable: true },
  { key: "category", label: "Category", sortable: true },
  {
    key: "targetRate",
    label: "Target Rate",
    align: "right",
    render: (row) => formatINR(row.targetRate),
    sortValue: (row) => row.targetRate,
  },
  {
    key: "stage",
    label: "Stage",
    render: (row) => (
      <StatusBadge
        status={stageLabel(row.stage)}
        variant={statusVariant(row.stage)}
      />
    ),
  },
  { key: "receivedOn", label: "Received On", sortable: true },
];

/**
 * Local Procurement bucket: products auto-routed here because their
 * category isn't a brand category. Same underlying items also appear in the
 * main Procurement Requests bucket. Sample data for UI preview.
 */
const LocalProcurement = () => (
  <div className="space-y-6">
    <PageHeader
      title="Local Procurement"
      description="Products auto-routed to the local bucket by category. Sample data for UI preview."
    />
    <ProcurementMasterSubNav />

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard
        title="Items in Local Bucket"
        value={localProcurementBucket.length}
        icon={ShoppingBasket}
        color="primary"
      />
      <StatCard
        title="Rate Pending"
        value={
          localProcurementBucket.filter((r) => r.rateStatus === "pending")
            .length
        }
        icon={ShoppingBasket}
        color="warning"
      />
    </div>

    <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
      <p>
        These are the same requests that show up in the main Procurement
        Requests bucket — this view is just the local (non-brand) subset,
        auto-decided by category.
      </p>
    </div>

    <DataTable
      columns={columns}
      rows={localProcurementBucket}
      rowKey={(r) => r.id}
      exportFileName="local-procurement"
    />
  </div>
);

export default LocalProcurement;
