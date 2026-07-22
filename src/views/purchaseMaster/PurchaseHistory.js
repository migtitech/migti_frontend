import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { History, TrendingUp, Info, Eye } from "lucide-react";
import { PageHeader, StatCard, DataTable } from "../../components";
import { Button } from "../../components/ui";
import { purchaseHistory } from "../../data/purchaseMasterDummyData";

const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * Purchase History: product-wise, showing old vs current price for trend
 * awareness. Total purchase amount is intentionally NOT shown here, per
 * policy. Sample data for UI preview.
 */
const PurchaseHistory = () => {
  const navigate = useNavigate();

  // Note: intentionally no "Total Amount" column/stat — purchase history is
  // shown product-wise with old vs current price only, per policy.
  const columns = useMemo(
    () => [
      { key: "product", label: "Product", sortable: true },
      { key: "supplier", label: "Supplier", sortable: true },
      { key: "qty", label: "Qty", align: "right", sortable: true },
      {
        key: "oldPrice",
        label: "Old Price",
        align: "right",
        sortable: true,
        render: (row) => formatINR(row.oldPrice),
        sortValue: (row) => row.oldPrice,
      },
      {
        key: "currentPrice",
        label: "Current Price",
        align: "right",
        sortable: true,
        render: (row) => formatINR(row.currentPrice),
        sortValue: (row) => row.currentPrice,
      },
      {
        key: "change",
        label: "Change",
        align: "right",
        render: (row) => {
          const diff = row.currentPrice - row.oldPrice;
          const pct = row.oldPrice
            ? ((diff / row.oldPrice) * 100).toFixed(1)
            : "0.0";
          return (
            <span
              className={
                diff > 0 ? "text-destructive" : diff < 0 ? "text-success!" : ""
              }
            >
              {diff > 0 ? "+" : ""}
              {pct}%
            </span>
          );
        },
      },
      { key: "purchasedOn", label: "Purchased On", sortable: true },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        exportable: false,
        stopRowClick: true,
        render: (row) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/purchase-master/purchase-history/${row.id}`)
              }
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              View
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
        title="Purchase History"
        description="Product-wise purchase history with price trend. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Products Tracked"
          value={purchaseHistory.length}
          icon={History}
          color="primary"
        />
        <StatCard
          title="Products with Price Increase"
          value={
            purchaseHistory.filter((p) => p.currentPrice > p.oldPrice).length
          }
          icon={TrendingUp}
          color="warning"
        />
      </div>

      <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>
          Total purchase amount is not shown on this screen — only per-product
          old vs current price.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={purchaseHistory}
        rowKey={(r) => r.id}
        onRowClick={(r) =>
          navigate(`/purchase-master/purchase-history/${r.id}`)
        }
        exportFileName="purchase-history"
      />
    </div>
  );
};

export default PurchaseHistory;
