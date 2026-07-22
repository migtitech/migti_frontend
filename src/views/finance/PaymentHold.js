import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PauseCircle, IndianRupee, AlertTriangle } from "lucide-react";
import { PageHeader, DataTable, StatCard } from "../../components";
import { Badge } from "../../components/ui";
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

// Payments outstanding beyond this many days are treated as "overdue / held".
const PAYMENT_TERM_DAYS = 30;

const orderDate = (o) => o.poReceivedDate || o.createdAt || null;

const ageInDays = (o) => {
  const d = orderDate(o);
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
};

/**
 * Payment Hold — client payments that are awaited / on hold, i.e. sales orders
 * with an outstanding balance, aged from the order date. Payments past the
 * standard term are flagged as overdue. Read-only for the finance role.
 */
const PaymentHold = () => {
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
      setRows((data?.purchaseOrders || []).filter(orderHasDue));
    } catch (err) {
      toastError(err?.message || "Failed to load held payments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const held = rows.reduce((s, o) => s + orderRemaining(o), 0);
    const overdue = rows.filter((o) => (ageInDays(o) ?? 0) > PAYMENT_TERM_DAYS);
    const overdueAmount = overdue.reduce((s, o) => s + orderRemaining(o), 0);
    return { held, count: rows.length, overdue: overdue.length, overdueAmount };
  }, [rows]);

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
        sortValue: (r) => new Date(orderDate(r) || 0).getTime(),
        render: (r) => dateFormatter(orderDate(r), "—"),
      },
      {
        key: "age",
        label: "Age",
        align: "right",
        sortable: true,
        sortValue: (r) => ageInDays(r) ?? -1,
        render: (r) => {
          const age = ageInDays(r);
          return age == null ? "—" : `${age}d`;
        },
      },
      {
        key: "due",
        label: "Amount Held",
        align: "right",
        sortable: true,
        sortValue: (r) => orderRemaining(r),
        render: (r) => (
          <span className="font-semibold text-warning!">
            {formatAmount(orderRemaining(r))}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (r) => ((ageInDays(r) ?? 0) > PAYMENT_TERM_DAYS ? 1 : 0),
        render: (r) => {
          const over = (ageInDays(r) ?? 0) > PAYMENT_TERM_DAYS;
          return (
            <Badge variant={over ? "destructive" : "warning"}>
              {over ? "Overdue" : "On Hold"}
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
        title="Payment Hold"
        description="Client payments awaited / on hold against open sales orders"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total on Hold"
          value={formatAmount(totals.held)}
          subtitle={`${totals.count} client payments`}
          icon={PauseCircle}
          color="warning"
        />
        <StatCard
          title="Payments Awaited"
          value={String(totals.count)}
          subtitle="Orders with a balance"
          icon={IndianRupee}
          color="info"
        />
        <StatCard
          title={`Overdue (> ${PAYMENT_TERM_DAYS}d)`}
          value={String(totals.overdue)}
          subtitle={`${formatAmount(totals.overdueAmount)} past term`}
          icon={AlertTriangle}
          color="danger"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyTitle="No payments on hold"
        emptyMessage="No client payments are currently awaited."
        searchPlaceholder="Search by client or order…"
        exportFileName="payment-hold"
        filterFields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            accessor: (r) =>
              (ageInDays(r) ?? 0) > PAYMENT_TERM_DAYS ? "overdue" : "hold",
            options: [
              { value: "overdue", label: "Overdue" },
              { value: "hold", label: "On Hold" },
            ],
          },
          {
            key: "client",
            label: "Client",
            type: "select",
            accessor: (r) => r.companyInfo?.name || "",
          },
          {
            key: "held",
            label: "Amount Held",
            type: "amountRange",
            accessor: (r) => orderRemaining(r),
          },
          {
            key: "date",
            label: "Order Date",
            type: "dateRange",
            accessor: (r) => orderDate(r),
          },
        ]}
      />
    </div>
  );
};

export default PaymentHold;
