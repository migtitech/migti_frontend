import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Factory,
  Receipt,
  Clock,
  AlertTriangle,
  PauseCircle,
  Scale,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { PageHeader, StatCard } from "../../components";
import purchaseOrderService from "../../services/purchaseOrderService";
import poPaymentBacklogService from "../../services/poPaymentBacklogService";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import { toastError } from "../../utils/toast";
import {
  formatAmount,
  unwrap,
  orderRemaining,
  orderHasDue,
  isOverdue,
} from "./financeUtils";

const AGG_PAGE_SIZE = 200;

const sumProducts = (products) =>
  Array.isArray(products)
    ? products.reduce(
        (s, p) => s + (typeof p.amount === "number" ? p.amount : 0),
        0,
      )
    : 0;

const backlogCompany = (item) =>
  item?.clients_snapshot?.name || item?.po_snapshot?.companyInfo?.name || "—";

const FinanceOverview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [backlogSummary, setBacklogSummary] = useState({
    totalCount: 0,
    totalAmount: 0,
  });
  const [billing, setBilling] = useState([]);
  const [billingMeta, setBillingMeta] = useState({ totalItems: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, backlogRes, billingRes] = await Promise.allSettled([
        purchaseOrderService.getAll({ pageNumber: 1, pageSize: AGG_PAGE_SIZE }),
        poPaymentBacklogService.list({
          is_settled: false,
          pageSize: AGG_PAGE_SIZE,
        }),
        billingRequestBatchService.list({
          pageNumber: 1,
          pageSize: AGG_PAGE_SIZE,
        }),
      ]);

      if (orderRes.status === "fulfilled") {
        const data = unwrap(orderRes.value);
        setOrders(data?.purchaseOrders || []);
      }
      if (backlogRes.status === "fulfilled") {
        const data = unwrap(backlogRes.value);
        setBacklog(data?.items || []);
        setBacklogSummary(data?.summary || { totalCount: 0, totalAmount: 0 });
      }
      if (billingRes.status === "fulfilled") {
        const data = unwrap(billingRes.value);
        setBilling(Array.isArray(data?.rows) ? data.rows : []);
        setBillingMeta(data?.pagination || { totalItems: 0 });
      }
      if (
        orderRes.status === "rejected" &&
        backlogRes.status === "rejected" &&
        billingRes.status === "rejected"
      ) {
        toastError("Failed to load finance overview");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Derived metrics (real data) -----------------------------------------
  const receivable = useMemo(() => {
    const due = orders.filter(orderHasDue);
    const amount = due.reduce((s, o) => s + orderRemaining(o), 0);
    return { amount, count: due.length, rows: due };
  }, [orders]);

  const payable = useMemo(() => {
    const amount = Number(backlogSummary.totalAmount) || 0;
    const overdue = backlog.filter((b) => isOverdue(b.due_date));
    return {
      amount,
      count: Number(backlogSummary.totalCount) || backlog.length,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, b) => s + (Number(b.amount) || 0), 0),
    };
  }, [backlog, backlogSummary]);

  const billed = useMemo(() => {
    const amount = billing.reduce((s, r) => s + sumProducts(r.products), 0);
    return {
      amount,
      count: Number(billingMeta.totalItems) || billing.length,
    };
  }, [billing, billingMeta]);

  const netPosition = receivable.amount - payable.amount;

  const topClientDues = useMemo(
    () =>
      [...receivable.rows]
        .sort((a, b) => orderRemaining(b) - orderRemaining(a))
        .slice(0, 6),
    [receivable.rows],
  );

  const topSupplierDues = useMemo(
    () =>
      [...backlog]
        .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
        .slice(0, 6),
    [backlog],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Finance Dashboard"
          description="Receivables, payables, billing and payment status at a glance"
        />
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Dashboard"
        description="Receivables, payables, billing and payment status at a glance"
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Client Dues (Receivable)"
          value={formatAmount(receivable.amount)}
          subtitle={`${receivable.count} orders pending`}
          icon={Users}
          color="success"
          onClick={() => navigate("/finance/receivables/clients")}
        />
        <StatCard
          title="Supplier Dues (Payable)"
          value={formatAmount(payable.amount)}
          subtitle={`${payable.count} bills to pay`}
          icon={Factory}
          color="danger"
          onClick={() => navigate("/finance/receivables/suppliers")}
        />
        <StatCard
          title="Billing Raised"
          value={formatAmount(billed.amount)}
          subtitle={`${billed.count} billing requests`}
          icon={Receipt}
          color="info"
          onClick={() => navigate("/finance/billing")}
        />
        <StatCard
          title="Payments to Make"
          value={String(payable.count)}
          subtitle={`${formatAmount(payable.amount)} outstanding`}
          icon={Clock}
          color="warning"
          onClick={() => navigate("/finance/payments/due")}
        />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Overdue Supplier Payments"
          value={String(payable.overdueCount)}
          subtitle={`${formatAmount(payable.overdueAmount)} overdue`}
          icon={AlertTriangle}
          color="danger"
          onClick={() => navigate("/finance/payments/due")}
        />
        <StatCard
          title="Payments on Hold"
          value={formatAmount(receivable.amount)}
          subtitle={`${receivable.count} client payments awaited`}
          icon={PauseCircle}
          color="secondary"
          onClick={() => navigate("/finance/payments/hold")}
        />
        <StatCard
          title="Net Position (Recv − Pay)"
          value={formatAmount(netPosition)}
          subtitle={netPosition >= 0 ? "Net inflow expected" : "Net outflow"}
          icon={Scale}
          color={netPosition >= 0 ? "primary" : "danger"}
        />
      </div>

      {/* Top dues tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Client Dues (Receivable)</CardTitle>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={() => navigate("/finance/receivables/clients")}
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-end">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClientDues.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      No pending client dues
                    </TableCell>
                  </TableRow>
                ) : (
                  topClientDues.map((o) => (
                    <TableRow key={o._id || o.id || o.poCode}>
                      <TableCell>{o.companyInfo?.name || "—"}</TableCell>
                      <TableCell>
                        <code>{o.poCode || "—"}</code>
                      </TableCell>
                      <TableCell className="text-end font-semibold text-success!">
                        {formatAmount(orderRemaining(o))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Supplier Dues (Payable)</CardTitle>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              onClick={() => navigate("/finance/receivables/suppliers")}
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier / Client</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-end">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSupplierDues.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No pending supplier dues
                    </TableCell>
                  </TableRow>
                ) : (
                  topSupplierDues.map((b) => {
                    const overdue = isOverdue(b.due_date);
                    return (
                      <TableRow key={b._id || b.id}>
                        <TableCell>{backlogCompany(b)}</TableCell>
                        <TableCell>
                          <code>{b?.po_snapshot?.poCode || "—"}</code>
                        </TableCell>
                        <TableCell className="text-end font-semibold text-destructive">
                          {formatAmount(b.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={overdue ? "destructive" : "warning"}>
                            {overdue ? "Overdue" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceOverview;
