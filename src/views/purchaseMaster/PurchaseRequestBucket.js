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
import PurchaseRequestActionMenu from "./components/PurchaseRequestActionMenu";
import { purchaseRequests } from "../../data/purchaseMasterDummyData";

/**
 * Purchases Request bucket (Local Purchase section). Products approved &
 * supplier-verified by HOD land here for purchasing. One page with
 * All / Brand Purchase / Local Purchase tabs. Each row opens a full detail
 * page; the row's Action button (or the detail page's) offers "Assign to
 * Local Purchase" or "Other Purchase" — the latter opens a multi-product,
 * single-supplier purchase flow. Frontend-only sample data for UI preview.
 */
const PurchaseRequestBucket = () => {
  const navigate = useNavigate();
  const [actionRequest, setActionRequest] = useState(null);

  const open = purchaseRequests.filter((r) => r.status === "open");
  const inProgress = purchaseRequests.filter((r) => r.status === "in progress");
  const purchased = purchaseRequests.filter((r) => r.status === "purchased");

  const brand = purchaseRequests.filter((r) => r.bucketType === "brand");
  const local = purchaseRequests.filter((r) => r.bucketType === "local");

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
              onClick={() => navigate(`/purchase-request-bucket/${row.id}`)}
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
      onRowClick={(r) => navigate(`/purchase-request-bucket/${r.id}`)}
      exportFileName={fileName}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases Request"
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
          Open a row to see the full story of a request. Use{" "}
          <strong>Action</strong> to <strong>Assign to Local Purchase</strong>{" "}
          or start an <strong>Other Purchase</strong> — where you can buy
          multiple products from a single supplier in one go.
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({purchaseRequests.length})</TabsTrigger>
          <TabsTrigger value="brand">
            Brand Purchase ({brand.length})
          </TabsTrigger>
          <TabsTrigger value="local">
            Local Purchase ({local.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          {renderTable(purchaseRequests, "purchases-request")}
        </TabsContent>
        <TabsContent value="brand">
          {renderTable(brand, "brand-purchase-requests")}
        </TabsContent>
        <TabsContent value="local">
          {renderTable(local, "local-purchase-requests")}
        </TabsContent>
      </Tabs>

      <PurchaseRequestActionMenu
        open={Boolean(actionRequest)}
        onOpenChange={(v) => !v && setActionRequest(null)}
        request={actionRequest}
      />
    </div>
  );
};

export default PurchaseRequestBucket;
