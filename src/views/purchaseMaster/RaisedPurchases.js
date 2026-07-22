import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui";
import { formatINR } from "./components/DetailPrimitives";
import {
  raisedPurchases,
  raisedPurchaseStatusMeta,
  raisedPurchaseTotal,
} from "../../data/purchaseMasterDummyData";

/**
 * Raised Purchases — orders raised from the "Other Purchase" flow land here.
 * One supplier per row, one or more products, with an end-to-end status. Each
 * row opens a full detail/status page. Frontend-only sample data.
 */
const RaisedPurchases = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");

  const counts = useMemo(() => {
    const pending = raisedPurchases.filter(
      (r) => r.status === "pending_hod",
    ).length;
    const inProgress = raisedPurchases.filter((r) =>
      ["approved", "po_sent"].includes(r.status),
    ).length;
    const received = raisedPurchases.filter(
      (r) => r.status === "received",
    ).length;
    const rejected = raisedPurchases.filter(
      (r) => r.status === "rejected",
    ).length;
    return { pending, inProgress, received, rejected };
  }, []);

  const columns = useMemo(
    () => [
      { key: "id", label: "Order #", sortable: true },
      { key: "supplier", label: "Supplier", sortable: true },
      {
        key: "products",
        label: "Products",
        align: "right",
        sortValue: (r) => r.products.length,
        exportValue: (r) => r.products.length,
        render: (r) => (
          <Badge variant="secondary">
            {r.products.length} item{r.products.length > 1 ? "s" : ""}
          </Badge>
        ),
      },
      {
        key: "total",
        label: "Total",
        align: "right",
        sortValue: (r) => raisedPurchaseTotal(r),
        exportValue: (r) => raisedPurchaseTotal(r),
        render: (r) => (
          <span className="font-semibold tabular-nums">
            {formatINR(raisedPurchaseTotal(r))}
          </span>
        ),
      },
      { key: "sourcePr", label: "Source PR", sortable: true },
      { key: "raisedBy", label: "Raised By", sortable: true },
      { key: "raisedOn", label: "Raised On", sortable: true },
      {
        key: "status",
        label: "Status",
        sortValue: (r) => r.status,
        exportValue: (r) =>
          raisedPurchaseStatusMeta[r.status]?.label || r.status,
        render: (r) => {
          const meta = raisedPurchaseStatusMeta[r.status];
          return (
            <StatusBadge
              status={meta?.label || r.status}
              variant={meta?.variant || "secondary"}
            />
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        exportable: false,
        stopRowClick: true,
        render: (r) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/raised-purchases/${r.id}`)}
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

  const filtered = useMemo(() => {
    if (tab === "all") return raisedPurchases;
    if (tab === "pending")
      return raisedPurchases.filter((r) => r.status === "pending_hod");
    if (tab === "inprogress")
      return raisedPurchases.filter((r) =>
        ["approved", "po_sent"].includes(r.status),
      );
    if (tab === "received")
      return raisedPurchases.filter((r) => r.status === "received");
    if (tab === "rejected")
      return raisedPurchases.filter((r) => r.status === "rejected");
    return raisedPurchases;
  }, [tab]);

  const renderTable = (rows) => (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/raised-purchases/${r.id}`)}
      exportFileName="raised-purchases"
      emptyTitle="No raised purchases"
      emptyMessage="Raise one from Purchases Request → Action → Other Purchase."
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raised Purchases"
        description="Purchases raised from the Other Purchase flow — one supplier, multiple products — tracked from HOD approval to receipt. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Approval"
          value={counts.pending}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="In Progress"
          value={counts.inProgress}
          icon={ShoppingCart}
          color="info"
        />
        <StatCard
          title="Received"
          value={counts.received}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="Rejected"
          value={counts.rejected}
          icon={XCircle}
          color="danger"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({raisedPurchases.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="inprogress">
            In Progress ({counts.inProgress})
          </TabsTrigger>
          <TabsTrigger value="received">
            Received ({counts.received})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({counts.rejected})
          </TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>{renderTable(filtered)}</TabsContent>
      </Tabs>
    </div>
  );
};

export default RaisedPurchases;
