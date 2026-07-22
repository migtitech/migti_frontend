import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Info, Eye, Zap } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { Button } from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import PurchaseActionDialog from "./components/PurchaseActionDialog";
import { brandPurchaseBucket } from "../../data/purchaseMasterDummyData";

/**
 * Brand Purchase bucket: branded products, handled directly by the purchase
 * manager. Same underlying items also appear in the main Purchase Requests
 * bucket. Each row has a View (full detail page) and an Action (purchase /
 * assign-to-local dialog). Sample data for UI preview.
 */
const BrandPurchase = () => {
  const navigate = useNavigate();
  const [actionRequest, setActionRequest] = useState(null);

  const columns = useMemo(
    () => [
      { key: "id", label: "PR #", sortable: true },
      { key: "product", label: "Product", sortable: true },
      { key: "category", label: "Category", sortable: true },
      { key: "qty", label: "Qty", align: "right", sortable: true },
      { key: "supplier", label: "Supplier Assigned", sortable: true },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <StatusBadge
            status={row.status}
            variant={statusVariant(row.status)}
          />
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        exportable: false,
        stopRowClick: true,
        render: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/purchase-master/purchase-requests/${row.id}`)
              }
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              View
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setActionRequest(row)}
            >
              <Zap className="mr-1 h-3.5 w-3.5" />
              Action
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Purchase"
        description="Branded products you handle yourself. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Items in Brand Bucket"
          value={brandPurchaseBucket.length}
          icon={ShoppingCart}
          color="primary"
        />
        <StatCard
          title="Open"
          value={brandPurchaseBucket.filter((r) => r.status === "open").length}
          icon={ShoppingCart}
          color="warning"
        />
      </div>

      <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>
          These are the same products that show up in the main Purchase Requests
          bucket — this view is just the branded subset for you to action
          directly.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={brandPurchaseBucket}
        rowKey={(r) => r.id}
        onRowClick={(r) =>
          navigate(`/purchase-master/purchase-requests/${r.id}`)
        }
        exportFileName="brand-purchase"
      />

      <PurchaseActionDialog
        open={Boolean(actionRequest)}
        onOpenChange={(v) => !v && setActionRequest(null)}
        request={actionRequest}
      />
    </div>
  );
};

export default BrandPurchase;
