import React from "react";
import { Clipboard, ShoppingCart, CheckCircle2, Info } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { Badge } from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import { purchaseRequests } from "../../data/purchaseMasterDummyData";

const columns = [
  { key: "id", label: "PR #", sortable: true },
  { key: "product", label: "Product", sortable: true },
  {
    key: "bucketType",
    label: "Bucket",
    render: (row) => (
      <Badge variant={row.bucketType === "brand" ? "info" : "secondary"}>
        {row.bucketType === "brand" ? "Brand" : "Local"}
      </Badge>
    ),
  },
  { key: "qty", label: "Qty", align: "right", sortable: true },
  { key: "salesOrder", label: "Sales Order", sortable: true },
  { key: "supplier", label: "Supplier Assigned", sortable: true },
  { key: "hodApprovedOn", label: "HOD Approved On", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

/**
 * Purchase Requests bucket: products the HOD has approved & verified with a
 * supplier assigned on the sales order land here automatically. Sample data
 * for UI preview, not wired to backend.
 */
const PurchaseRequests = () => {
  const open = purchaseRequests.filter((r) => r.status === "open");
  const inProgress = purchaseRequests.filter((r) => r.status === "in progress");
  const purchased = purchaseRequests.filter((r) => r.status === "purchased");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Requests"
        description="Products approved & supplier-verified by HOD land here for purchasing. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total in Bucket"
          value={purchaseRequests.length}
          icon={Clipboard}
          color="primary"
        />
        <StatCard
          title="Open"
          value={open.length}
          icon={ShoppingCart}
          color="warning"
        />
        <StatCard
          title="In Progress"
          value={inProgress.length}
          icon={Clipboard}
          color="info"
        />
        <StatCard
          title="Purchased"
          value={purchased.length}
          icon={CheckCircle2}
          color="success"
        />
      </div>

      <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>
          If the same product is already open in this bucket, a new sales order
          for it only increases the <strong>quantity</strong> on the existing
          row — it does not create a duplicate entry. See "Cable Ties 200mm"
          below, merged from 5 sales orders.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={purchaseRequests}
        rowKey={(r) => r.id}
        exportFileName="purchase-requests"
      />
    </div>
  );
};

export default PurchaseRequests;
