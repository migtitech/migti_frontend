import React from "react";
import { PackageCheck, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { statusVariant } from "./components/statusFormatters";
import { grnList } from "../../data/purchaseMasterDummyData";

const columns = [
  { key: "id", label: "GRN #", sortable: true },
  { key: "po", label: "PO #", sortable: true },
  { key: "supplier", label: "Supplier", sortable: true },
  { key: "product", label: "Product", sortable: true },
  { key: "qtyOrdered", label: "Qty Ordered", align: "right", sortable: true },
  { key: "qtyReceived", label: "Qty Received", align: "right", sortable: true },
  { key: "receivedOn", label: "Received On", sortable: true },
  { key: "receivedBy", label: "Received By" },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

/**
 * GRN — Goods Received Note. Created by the Inventory side on receipt of
 * goods; read-only here. Sample data for UI preview.
 */
const Grn = () => {
  const complete = grnList.filter((g) => g.status === "complete");
  const short = grnList.filter((g) => g.status !== "complete");

  return (
    <div className="space-y-6">
      <PageHeader
        title="GRN"
        description="Goods Received Notes recorded by Inventory on receipt of your purchase orders. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total GRNs"
          value={grnList.length}
          icon={PackageCheck}
          color="primary"
        />
        <StatCard
          title="Complete"
          value={complete.length}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="Short / Mismatch"
          value={short.length}
          icon={AlertTriangle}
          color="warning"
        />
      </div>

      <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>
          GRNs are created by the Inventory team when goods physically arrive —
          this view is read-only.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={grnList}
        rowKey={(r) => r.id}
        exportFileName="grn"
      />
    </div>
  );
};

export default Grn;
