import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Eye,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { Button } from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import { grnList } from "../../data/purchaseMasterDummyData";

/**
 * GRN — Goods Received Note. Created by the Inventory side on receipt of
 * goods; read-only here. Each row has a View button (and a clickable row) that
 * opens the full GRN detail page. Sample data for UI preview.
 */
const Grn = () => {
  const navigate = useNavigate();

  const complete = grnList.filter((g) => g.status === "complete");
  const short = grnList.filter((g) => g.status === "short received");
  const mismatch = grnList.filter(
    (g) => g.status !== "complete" && g.status !== "short received",
  );

  const columns = useMemo(
    () => [
      { key: "id", label: "GRN #", sortable: true },
      { key: "po", label: "PO #", sortable: true },
      { key: "supplier", label: "Supplier", sortable: true },
      { key: "product", label: "Product", sortable: true },
      {
        key: "qtyOrdered",
        label: "Qty Ordered",
        align: "right",
        sortable: true,
      },
      {
        key: "qtyReceived",
        label: "Qty Received",
        align: "right",
        sortable: true,
      },
      { key: "receivedOn", label: "Received On", sortable: true },
      { key: "receivedBy", label: "Received By" },
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
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/purchase-master/grn/${row.id}`)}
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
        title="GRN"
        description="Goods Received Notes recorded by Inventory on receipt of your purchase orders. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          title="Short Received"
          value={short.length}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Mismatch"
          value={mismatch.length}
          icon={AlertTriangle}
          color="destructive"
        />
      </div>

      <div className="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <p>
          GRNs are created by the Inventory team when goods physically arrive —
          this view is read-only. Use <strong>View</strong> to open the full
          receipt, received lines, quality check and timeline.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={grnList}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/purchase-master/grn/${r.id}`)}
        exportFileName="grn"
      />
    </div>
  );
};

export default Grn;
