import React from "react";
import { ShoppingCart, Info } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { statusVariant } from "./components/statusFormatters";
import { localPurchaseBucket } from "../../data/purchaseMasterDummyData";

const columns = [
  { key: "id", label: "PR #", sortable: true },
  { key: "product", label: "Product", sortable: true },
  { key: "category", label: "Category", sortable: true },
  { key: "qty", label: "Qty", align: "right", sortable: true },
  { key: "supplier", label: "Supplier Assigned", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
];

/**
 * Local Purchase bucket: non-branded / internal-category products, handled
 * directly by the purchase manager. Same underlying items also appear in the
 * main Purchase Requests bucket. Sample data for UI preview.
 */
const LocalPurchase = () => (
  <div className="space-y-6">
    <PageHeader
      title="Local Purchase"
      description="Internal-category (non-branded) products you handle yourself. Sample data for UI preview."
    />

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard
        title="Items in Local Bucket"
        value={localPurchaseBucket.length}
        icon={ShoppingCart}
        color="primary"
      />
      <StatCard
        title="Open"
        value={localPurchaseBucket.filter((r) => r.status === "open").length}
        icon={ShoppingCart}
        color="warning"
      />
    </div>

    <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
      <p>
        These are the same products that show up in the main Purchase Requests
        bucket — this view is just the non-branded (local) subset for you to
        action directly.
      </p>
    </div>

    <DataTable
      columns={columns}
      rows={localPurchaseBucket}
      rowKey={(r) => r.id}
      exportFileName="local-purchase"
    />
  </div>
);

export default LocalPurchase;
