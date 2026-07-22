import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IndianRupee, AlertTriangle, Clock, Eye } from "lucide-react";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import { Button } from "../../components/ui";
import { statusVariant } from "./components/statusFormatters";
import { formatINR } from "./components/DetailPrimitives";
import { vendorDuePayments } from "../../data/purchaseMasterDummyData";

/**
 * Vendor Payments: only outstanding DUE amounts are shown — cleared invoices
 * are intentionally not listed here. Each row has a View button that opens the
 * full vendor payment detail page. Sample data for UI preview.
 */
const VendorPayments = () => {
  const navigate = useNavigate();

  const totalDue = vendorDuePayments.reduce((sum, r) => sum + r.amount, 0);
  const overdue = vendorDuePayments.filter((r) => r.status === "overdue");
  const overdueAmount = overdue.reduce((sum, r) => sum + r.amount, 0);

  const columns = useMemo(
    () => [
      { key: "id", label: "Invoice #", sortable: true },
      { key: "vendor", label: "Vendor", sortable: true },
      { key: "po", label: "PO #", sortable: true },
      { key: "dueDate", label: "Due Date", sortable: true },
      {
        key: "amount",
        label: "Due Amount",
        sortable: true,
        align: "right",
        render: (row) => formatINR(row.amount),
        sortValue: (row) => row.amount,
      },
      {
        key: "daysOverdue",
        label: "Days Overdue",
        sortable: true,
        align: "right",
        render: (row) =>
          row.daysOverdue > 0 ? (
            <span className="text-destructive">{row.daysOverdue} days</span>
          ) : (
            "—"
          ),
      },
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
              onClick={() =>
                navigate(`/purchase-master/vendor-payments/${row.id}`)
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
        title="Vendor Payments"
        description="Outstanding due amounts to vendors — cleared invoices are not shown here. Sample data for UI preview."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Due"
          value={formatINR(totalDue)}
          icon={IndianRupee}
          color="primary"
        />
        <StatCard
          title="Overdue Amount"
          value={formatINR(overdueAmount)}
          subtitle={`${overdue.length} invoices`}
          icon={AlertTriangle}
          color="danger"
        />
        <StatCard
          title="Pending (not yet due)"
          value={formatINR(totalDue - overdueAmount)}
          icon={Clock}
          color="warning"
        />
      </div>

      <DataTable
        columns={columns}
        rows={vendorDuePayments}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/purchase-master/vendor-payments/${r.id}`)}
        exportFileName="vendor-payments"
        rowClassName={(row) =>
          row.status === "overdue" ? "bg-destructive/5" : ""
        }
      />
    </div>
  );
};

export default VendorPayments;
