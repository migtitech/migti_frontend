import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Users, IndianRupee, FileText } from "lucide-react";
import { PageHeader, DataTable, StatCard, StatusBadge } from "../../components";
import purchaseOrderService from "../../services/purchaseOrderService";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";
import {
  formatAmount,
  unwrap,
  orderRemaining,
  orderHasDue,
} from "./financeUtils";

const AGG_PAGE_SIZE = 200;

const PAYMENT_STATUS = {
  none: { label: "Unpaid", variant: "destructive" },
  partial_payment_received: { label: "Partial", variant: "warning" },
  full_payment_received: { label: "Paid", variant: "success" },
};

/**
 * Client Dues (Receivable) — how much each client still owes us, derived from
 * sales orders (purchaseorders) with an outstanding balance. Read-only view for
 * the finance role.
 */
const ClientReceivables = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await purchaseOrderService.getAll({
        pageNumber: 1,
        pageSize: AGG_PAGE_SIZE,
      });
      const data = unwrap(res);
      const orders = (data?.purchaseOrders || []).filter(orderHasDue);
      setRows(orders);
    } catch (err) {
      toastError(err?.message || "Failed to load client receivables");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalDue = useMemo(
    () => rows.reduce((s, o) => s + orderRemaining(o), 0),
    [rows],
  );

  const columns = useMemo(
    () => [
      {
        key: "client",
        label: "Client",
        sortable: true,
        sortValue: (r) => r.companyInfo?.name || "",
        render: (r) => (
          <span className="font-medium">{r.companyInfo?.name || "—"}</span>
        ),
      },
      {
        key: "poCode",
        label: "Sales Order",
        sortable: true,
        render: (r) => <code>{r.poCode || "—"}</code>,
      },
      {
        key: "date",
        label: "Order Date",
        sortable: true,
        sortValue: (r) =>
          new Date(r.poReceivedDate || r.createdAt || 0).getTime(),
        render: (r) => dateFormatter(r.poReceivedDate || r.createdAt, "—"),
      },
      {
        key: "grandTotal",
        label: "Order Total",
        align: "right",
        sortable: true,
        sortValue: (r) => Number(r.financials?.grandTotal) || 0,
        render: (r) => formatAmount(r.financials?.grandTotal),
      },
      {
        key: "totalPaid",
        label: "Received",
        align: "right",
        sortable: true,
        sortValue: (r) => Number(r.financials?.totalPaid) || 0,
        render: (r) => formatAmount(r.financials?.totalPaid),
      },
      {
        key: "due",
        label: "Amount Due",
        align: "right",
        sortable: true,
        sortValue: (r) => orderRemaining(r),
        render: (r) => (
          <span className="font-semibold text-success!">
            {formatAmount(orderRemaining(r))}
          </span>
        ),
      },
      {
        key: "status",
        label: "Payment",
        render: (r) => {
          const meta =
            PAYMENT_STATUS[r.paymentReceivedStatus] || PAYMENT_STATUS.none;
          return <StatusBadge variant={meta.variant} status={meta.label} />;
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Dues (Receivable)"
        description="Outstanding payments clients still owe against their sales orders"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Receivable"
          value={formatAmount(totalDue)}
          subtitle="Across all pending orders"
          icon={IndianRupee}
          color="success"
        />
        <StatCard
          title="Clients / Orders Pending"
          value={String(rows.length)}
          subtitle="Sales orders with a balance"
          icon={Users}
          color="info"
        />
        <StatCard
          title="Avg. Due per Order"
          value={formatAmount(rows.length ? totalDue / rows.length : 0)}
          subtitle="Mean outstanding balance"
          icon={FileText}
          color="warning"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyTitle="No pending client dues"
        emptyMessage="Every client sales order is fully paid."
        searchPlaceholder="Search by client or order…"
        exportFileName="client-receivables"
        filterFields={[
          {
            key: "status",
            label: "Payment",
            type: "select",
            accessor: (r) => r.paymentReceivedStatus || "none",
            options: [
              { value: "none", label: "Unpaid" },
              { value: "partial_payment_received", label: "Partial" },
            ],
          },
          {
            key: "client",
            label: "Client",
            type: "select",
            accessor: (r) => r.companyInfo?.name || "",
          },
          {
            key: "due",
            label: "Amount Due",
            type: "amountRange",
            accessor: (r) => orderRemaining(r),
          },
          {
            key: "date",
            label: "Order Date",
            type: "dateRange",
            accessor: (r) => r.poReceivedDate || r.createdAt,
          },
        ]}
      />
    </div>
  );
};

export default ClientReceivables;
