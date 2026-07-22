import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Factory, IndianRupee, AlertTriangle, Clock } from "lucide-react";
import { PageHeader, DataTable, StatCard } from "../../components";
import { Badge } from "../../components/ui";
import poPaymentBacklogService from "../../services/poPaymentBacklogService";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";
import { formatAmount, unwrap, isOverdue, daysOverdue } from "./financeUtils";

const AGG_PAGE_SIZE = 200;

const companyName = (item) =>
  item?.clients_snapshot?.name || item?.po_snapshot?.companyInfo?.name || "—";

/**
 * Supplier Dues (Payable) / Payments to Make — money owed to suppliers, sourced
 * from the PO payment backlog (unsettled entries created on HOD approval).
 *
 * `variant="due"` frames the same data as an action queue (overdue emphasised);
 * `variant="all"` (default) is the full outstanding ledger. Read-only for
 * finance — settlement stays with the roles that own that action.
 */
const SupplierPayables = ({ variant = "all" }) => {
  const dueMode = variant === "due";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, totalAmount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await poPaymentBacklogService.list({
        is_settled: false,
        pageSize: AGG_PAGE_SIZE,
      });
      const data = unwrap(res);
      setItems(data?.items || []);
      setSummary(data?.summary || { totalCount: 0, totalAmount: 0 });
    } catch (err) {
      toastError(err?.message || "Failed to load supplier payables");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // In "due" mode, show overdue first and only outstanding (already unsettled).
  const rows = useMemo(() => {
    if (!dueMode) return items;
    return [...items].sort((a, b) => {
      const ao = isOverdue(a.due_date) ? 1 : 0;
      const bo = isOverdue(b.due_date) ? 1 : 0;
      if (ao !== bo) return bo - ao;
      return new Date(a.due_date || 0) - new Date(b.due_date || 0);
    });
  }, [items, dueMode]);

  const overdue = useMemo(
    () => items.filter((b) => isOverdue(b.due_date)),
    [items],
  );
  const overdueAmount = overdue.reduce(
    (s, b) => s + (Number(b.amount) || 0),
    0,
  );

  const columns = useMemo(
    () => [
      {
        key: "company",
        label: "Supplier / Client",
        sortable: true,
        sortValue: (r) => companyName(r),
        render: (r) => <span className="font-medium">{companyName(r)}</span>,
      },
      {
        key: "poCode",
        label: "Sales Order",
        sortable: true,
        sortValue: (r) => r?.po_snapshot?.poCode || "",
        render: (r) => <code>{r?.po_snapshot?.poCode || "—"}</code>,
      },
      {
        key: "amount",
        label: "Amount Payable",
        align: "right",
        sortable: true,
        sortValue: (r) => Number(r.amount) || 0,
        render: (r) => (
          <span className="font-semibold text-destructive">
            {formatAmount(r.amount)}
          </span>
        ),
      },
      {
        key: "due_date",
        label: "Due Date",
        sortable: true,
        sortValue: (r) => new Date(r.due_date || 0).getTime(),
        render: (r) => {
          const overdueRow = isOverdue(r.due_date);
          return (
            <span className={overdueRow ? "font-medium text-destructive" : ""}>
              {dateFormatter(r.due_date, "—")}
            </span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        sortValue: (r) => (isOverdue(r.due_date) ? "Overdue" : "Pending"),
        render: (r) => {
          const overdueRow = isOverdue(r.due_date);
          const d = daysOverdue(r.due_date);
          return (
            <Badge variant={overdueRow ? "destructive" : "warning"}>
              {overdueRow ? `Overdue ${d}d` : "Pending"}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={dueMode ? "Payments to Make" : "Supplier Dues (Payable)"}
        description={
          dueMode
            ? "Supplier payments due — overdue items first"
            : "Outstanding amounts owed to suppliers against approved orders"
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Payable"
          value={formatAmount(summary.totalAmount)}
          subtitle="All unsettled payments"
          icon={IndianRupee}
          color="danger"
        />
        <StatCard
          title="Payments Pending"
          value={String(summary.totalCount || items.length)}
          subtitle="Bills awaiting payment"
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Overdue"
          value={String(overdue.length)}
          subtitle={`${formatAmount(overdueAmount)} past due date`}
          icon={AlertTriangle}
          color="danger"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyTitle="No supplier payments pending"
        emptyMessage="All supplier dues are settled."
        searchPlaceholder="Search by supplier or order…"
        exportFileName={dueMode ? "payments-to-make" : "supplier-payables"}
        filterFields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            accessor: (r) => (isOverdue(r.due_date) ? "overdue" : "pending"),
            options: [
              { value: "overdue", label: "Overdue" },
              { value: "pending", label: "Pending" },
            ],
          },
          {
            key: "company",
            label: "Supplier / Client",
            type: "select",
            accessor: (r) => companyName(r),
          },
          {
            key: "amount",
            label: "Amount Payable",
            type: "amountRange",
            accessor: (r) => Number(r.amount) || 0,
          },
          {
            key: "due_date",
            label: "Due Date",
            type: "dateRange",
            accessor: (r) => r.due_date,
          },
        ]}
      />
    </div>
  );
};

export default SupplierPayables;
