import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Receipt, IndianRupee, CheckCircle2, Clock } from "lucide-react";
import { PageHeader, DataTable, StatCard, StatusBadge } from "../../components";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";
import { formatAmount, unwrap } from "./financeUtils";

const AGG_PAGE_SIZE = 200;

const STATUS_META = {
  hod_approval_pending: { label: "Pending", variant: "warning" },
  finance_approval_pending: { label: "Finance Review", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  finance_approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  completed: { label: "Completed", variant: "success" },
};

const statusMeta = (status) =>
  STATUS_META[status] || { label: status || "—", variant: "secondary" };

const rowAmount = (r) =>
  Array.isArray(r.products)
    ? r.products.reduce(
        (s, p) => s + (typeof p.amount === "number" ? p.amount : 0),
        0,
      )
    : 0;

const isPending = (r) => String(r.status || "").includes("pending");

/**
 * Billing — how much billing has been raised, sourced from billing requests.
 * Read-only summary for the finance role.
 */
const FinanceBilling = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await billingRequestBatchService.list({
        pageNumber: 1,
        pageSize: AGG_PAGE_SIZE,
      });
      const data = unwrap(res);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (err) {
      toastError(err?.message || "Failed to load billing");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const totalAmount = rows.reduce((s, r) => s + rowAmount(r), 0);
    const pending = rows.filter(isPending);
    const pendingAmount = pending.reduce((s, r) => s + rowAmount(r), 0);
    return {
      totalAmount,
      count: rows.length,
      pendingCount: pending.length,
      pendingAmount,
      clearedCount: rows.length - pending.length,
    };
  }, [rows]);

  const columns = useMemo(
    () => [
      {
        key: "billingRequestCode",
        label: "BR Code",
        sortable: true,
        render: (r) => <code>{r.billingRequestCode || "—"}</code>,
      },
      {
        key: "poCode",
        label: "Sales Order",
        sortable: true,
        render: (r) => <code>{r.poCode || "—"}</code>,
      },
      {
        key: "products",
        label: "Items",
        align: "right",
        sortable: true,
        sortValue: (r) => (Array.isArray(r.products) ? r.products.length : 0),
        render: (r) => (Array.isArray(r.products) ? r.products.length : 0),
      },
      {
        key: "amount",
        label: "Billed Amount",
        align: "right",
        sortable: true,
        sortValue: (r) => rowAmount(r),
        render: (r) => (
          <span className="font-semibold">{formatAmount(rowAmount(r))}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (r) => statusMeta(r.status).label,
        render: (r) => {
          const meta = statusMeta(r.status);
          return <StatusBadge variant={meta.variant} status={meta.label} />;
        },
      },
      {
        key: "raisedBy",
        label: "Raised By",
        render: (r) =>
          r.createdBySnapshot?.name || r.createdBySnapshot?.fullName || "—",
      },
      {
        key: "date",
        label: "Date",
        sortable: true,
        sortValue: (r) => new Date(r.createdAt || 0).getTime(),
        render: (r) => dateFormatter(r.createdAt, "—"),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Billing raised across sales orders and its current status"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Billed"
          value={formatAmount(totals.totalAmount)}
          subtitle={`${totals.count} billing requests`}
          icon={IndianRupee}
          color="info"
        />
        <StatCard
          title="Billing Requests"
          value={String(totals.count)}
          subtitle="All raised requests"
          icon={Receipt}
          color="primary"
        />
        <StatCard
          title="Pending Approval"
          value={String(totals.pendingCount)}
          subtitle={`${formatAmount(totals.pendingAmount)} awaiting`}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Cleared"
          value={String(totals.clearedCount)}
          subtitle="Approved / completed"
          icon={CheckCircle2}
          color="success"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyTitle="No billing requests"
        emptyMessage="No billing has been raised yet."
        searchPlaceholder="Search by BR code or order…"
        exportFileName="finance-billing"
        filterFields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            accessor: (r) => statusMeta(r.status).label,
          },
          {
            key: "raisedBy",
            label: "Raised By",
            type: "select",
            accessor: (r) =>
              r.createdBySnapshot?.name || r.createdBySnapshot?.fullName || "",
          },
          {
            key: "amount",
            label: "Billed Amount",
            type: "amountRange",
            accessor: (r) => rowAmount(r),
          },
          {
            key: "date",
            label: "Date",
            type: "dateRange",
            accessor: (r) => r.createdAt,
          },
        ]}
      />
    </div>
  );
};

export default FinanceBilling;
