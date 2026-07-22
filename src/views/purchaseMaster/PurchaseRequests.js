import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clipboard,
  ShoppingCart,
  CheckCircle2,
  Info,
  Eye,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import PurchaseActionDialog from "./components/PurchaseActionDialog";
import { purchaseRequests } from "../../data/purchaseMasterDummyData";

/**
 * Purchase Requests bucket: products the HOD has approved & verified with a
 * supplier assigned on the sales order land here automatically. One page, with
 * All / Local / Brand tabs — items route to Local or Brand depending on whether
 * the product is branded. Each row has a View (full detail page) and an Action
 * (purchase / assign-to-local dialog). Sample data for UI preview.
 */
const PurchaseRequests = () => {
  const navigate = useNavigate();
  const [actionRequest, setActionRequest] = useState(null);

  const open = purchaseRequests.filter((r) => r.status === "open");
  const inProgress = purchaseRequests.filter((r) => r.status === "in progress");
  const purchased = purchaseRequests.filter((r) => r.status === "purchased");

  const columns = useMemo(
    () => [
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

  const renderTable = (rows, fileName) => (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/purchase-master/purchase-requests/${r.id}`)}
      exportFileName={fileName}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Requests"
        description="Products approved & supplier-verified by HOD land here for purchasing. Local vs Brand is decided by whether the product is branded. Sample data for UI preview."
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
          row — it does not create a duplicate entry. Use <strong>View</strong>{" "}
          to see the full story of a request, or <strong>Action</strong> to
          purchase it directly or assign it to Local Purchase.
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({purchaseRequests.length})</TabsTrigger>
          <TabsTrigger value="local">
            Local Purchase (
            {purchaseRequests.filter((r) => r.bucketType === "local").length})
          </TabsTrigger>
          <TabsTrigger value="brand">
            Brand Purchase (
            {purchaseRequests.filter((r) => r.bucketType === "brand").length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          {renderTable(purchaseRequests, "purchase-requests")}
        </TabsContent>
        <TabsContent value="local">
          {renderTable(
            purchaseRequests.filter((r) => r.bucketType === "local"),
            "local-purchase-requests",
          )}
        </TabsContent>
        <TabsContent value="brand">
          {renderTable(
            purchaseRequests.filter((r) => r.bucketType === "brand"),
            "brand-purchase-requests",
          )}
        </TabsContent>
      </Tabs>

      <PurchaseActionDialog
        open={Boolean(actionRequest)}
        onOpenChange={(v) => !v && setActionRequest(null)}
        request={actionRequest}
      />
    </div>
  );
};

export default PurchaseRequests;
