import React from "react";
import { History, TrendingUp, Info } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { Badge } from "../../components/ui";
import ProcurementMasterSubNav from "./components/ProcurementMasterSubNav";
import { statusVariant, stageLabel } from "./components/statusFormatters";
import { procurementHistory } from "../../data/procurementMasterDummyData";

const formatINR = (value) =>
  value == null
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const columns = [
  { key: "product", label: "Product", sortable: true },
  { key: "category", label: "Category", sortable: true },
  {
    key: "bucketType",
    label: "Bucket",
    render: (row) => (
      <Badge variant={row.bucketType === "brand" ? "info" : "secondary"}>
        {row.bucketType === "brand" ? "Brand" : "Local"}
      </Badge>
    ),
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
  {
    key: "targetRate",
    label: "Target Rate",
    align: "right",
    render: (row) => formatINR(row.targetRate),
    sortValue: (row) => row.targetRate,
  },
  {
    key: "submittedRate",
    label: "Submitted Rate",
    align: "right",
    render: (row) => formatINR(row.submittedRate),
    sortValue: (row) => row.submittedRate ?? -1,
  },
  { key: "date", label: "Date", sortable: true },
];

/**
 * Procurement History: every procurement item ever raised, across every
 * stage (query, HOD rate, verification, fulfilled) — the full record, not
 * just fulfilled ones. Sample data for UI preview.
 */
const ProcurementHistory = () => (
  <div className="space-y-6">
    <PageHeader
      title="Procurement History"
      description="Every procurement item, across all stages. Sample data for UI preview."
    />
    <ProcurementMasterSubNav />

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard
        title="Total Items"
        value={procurementHistory.length}
        icon={History}
        color="primary"
      />
      <StatCard
        title="Fulfilled"
        value={procurementHistory.filter((p) => p.stage === "fulfilled").length}
        icon={TrendingUp}
        color="success"
      />
    </div>

    <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
      <p>
        This list always shows every procurement item, regardless of which stage
        it's currently in.
      </p>
    </div>

    <DataTable
      columns={columns}
      rows={procurementHistory}
      rowKey={(r) => r.id}
      exportFileName="procurement-history"
    />
  </div>
);

export default ProcurementHistory;
