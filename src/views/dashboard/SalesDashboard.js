import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBasket,
  ShoppingCart,
  DollarSign,
  FileText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, StatCard, StatusBadge, DataTable } from "../../components";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import queryService from "../../services/queryService";
import employeeLocationService from "../../services/employeeLocationService";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";
import { salesMasterDashboard } from "../../data/salesMasterDummyData";
import { statusVariant } from "../salesMaster/components/statusFormatters";

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatQueryStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  if (v === "drafted") return "Draft";
  if (v === "convertedToQuotation") return "Converted";
  if (v === "closed") return "Closed";
  return v;
};

const formatQuotationStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  const map = {
    draft: "Draft",
    partial: "Partial",
    fulfilled: "Fulfilled",
    ready: "Ready",
    hod_approved: "Approved",
    sentToClient: "Sent to client",
    poReceived: "Sales Order received",
    followup01: "Follow-up 1",
    followup02: "Follow-up 2",
    closed: "Closed",
  };
  return map[v] || v;
};

const formatPoStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  const map = {
    draft: "Draft",
    confirmed: "Confirmed",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
  };
  return map[v] || v;
};

const formatTodayHeading = () =>
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatUserLocation = (u) => {
  if (!u || typeof u !== "object") return null;
  const addr = String(u.address || "").trim();
  const pc = String(u.pincode || "").trim();
  if (addr && pc) return `${addr} — ${pc}`;
  if (addr) return addr;
  if (pc) return `Pincode: ${pc}`;
  return null;
};

/** Prefer latest `employeeLocation` row (locality, city); pincode from profile when present. */
const formatHeaderLocation = (latestLoc, u) => {
  const locality = String(latestLoc?.locality || "").trim();
  const city = String(latestLoc?.city || "").trim();
  const areaParts = [];
  if (locality) areaParts.push(locality);
  if (city) areaParts.push(city);
  const area = areaParts.join(", ");
  const pc = String(u?.pincode || "").trim();
  if (area && pc) return `${area} — ${pc}`;
  if (area) return area;
  if (pc) return `Pincode: ${pc}`;
  return formatUserLocation(u);
};

/**
 * "Assigned Tasks" / "Assigned Work" below use sample/demo data
 * (salesMasterDummyData) — the backend has no task-assignment feed wired
 * into this dashboard yet. Swap for a real service call when available;
 * everything else on this page is untouched.
 */
const assignedTaskColumns = [
  { key: "title", label: "Task", sortable: true },
  { key: "assignedBy", label: "Assigned By", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
  { key: "due", label: "Due Date", sortable: true },
];

const assignedWorkColumns = [
  { key: "title", label: "Item", sortable: true },
  { key: "type", label: "Type", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <StatusBadge status={row.status} variant={statusVariant(row.status)} />
    ),
  },
  { key: "due", label: "Due Date", sortable: true },
];

const pendingWorkColumns = [
  { key: "title", label: "Pending Work", sortable: true },
  {
    key: "priority",
    label: "Priority",
    render: (row) => (
      <Badge variant={statusVariant(row.priority)}>{row.priority}</Badge>
    ),
  },
  { key: "due", label: "Due Date", sortable: true },
];

const TargetItem = ({ label, value, period, accent }) => (
  <div className={cn("rounded-lg border-l-4 bg-muted/40 px-3 py-2", accent)}>
    <div className="truncate text-sm text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
    {period && (
      <div className="mt-1 text-xs text-muted-foreground">{period}</div>
    )}
  </div>
);

const SalesDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [latestEmployeeLocation, setLatestEmployeeLocation] = useState(null);
  const [dashboard, setDashboard] = useState({
    monthlyFrom: "",
    monthlyTo: "",
    monthlyQueriesCount: 0,
    monthlyQuotationsCount: 0,
    monthlyPurchaseOrdersCount: 0,
    pendingQueriesCount: 0,
    pendingQuotationsCount: 0,
    pendingPurchaseOrdersCount: 0,
    pendingCollectionAmount: 0,
    weeklyTarget: 0,
    weeklyBilling: 0,
    monthlyTarget: 0,
    monthlyBilling: 0,
    weeklyPeriodFrom: "",
    weeklyPeriodTo: "",
    monthlyPeriodFrom: "",
    monthlyPeriodTo: "",
    pendingQueries: [],
    pendingQuotations: [],
    pendingPurchaseOrders: [],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cardsResult, locResult] = await Promise.allSettled([
          queryService.getSalesDashboardCards(),
          employeeLocationService.getLatest(),
        ]);

        if (locResult.status === "fulfilled") {
          const locPayload = locResult.value?.data;
          setLatestEmployeeLocation(
            locPayload && typeof locPayload === "object" ? locPayload : null,
          );
        } else {
          setLatestEmployeeLocation(null);
        }

        if (cardsResult.status === "fulfilled") {
          const response = cardsResult.value;
          const data = response?.data ?? {};
          setDashboard({
            monthlyFrom: data.monthlyFrom || "",
            monthlyTo: data.monthlyTo || "",
            monthlyQueriesCount: Number(data.monthlyQueriesCount || 0),
            monthlyQuotationsCount: Number(data.monthlyQuotationsCount || 0),
            monthlyPurchaseOrdersCount: Number(
              data.monthlyPurchaseOrdersCount || 0,
            ),
            pendingQueriesCount: Number(data.pendingQueriesCount || 0),
            pendingQuotationsCount: Number(data.pendingQuotationsCount || 0),
            pendingPurchaseOrdersCount: Number(
              data.pendingPurchaseOrdersCount || 0,
            ),
            pendingCollectionAmount: Number(data.pendingCollectionAmount || 0),
            pendingQueries: Array.isArray(data.pendingQueries)
              ? data.pendingQueries
              : [],
            pendingQuotations: Array.isArray(data.pendingQuotations)
              ? data.pendingQuotations
              : [],
            pendingPurchaseOrders: Array.isArray(data.pendingPurchaseOrders)
              ? data.pendingPurchaseOrders
              : [],
            weeklyTarget: Number(data.weeklyTarget || 0),
            weeklyBilling: Number(data.weeklyBilling || 0),
            monthlyTarget: Number(data.monthlyTarget || 0),
            monthlyBilling: Number(data.monthlyBilling || 0),
            weeklyPeriodFrom: data.weeklyPeriodFrom || "",
            weeklyPeriodTo: data.weeklyPeriodTo || "",
            monthlyPeriodFrom: data.monthlyPeriodFrom || "",
            monthlyPeriodTo: data.monthlyPeriodTo || "",
          });
        } else {
          setDashboard((prev) => ({
            ...prev,
            monthlyQueriesCount: 0,
            monthlyQuotationsCount: 0,
            monthlyPurchaseOrdersCount: 0,
            pendingQueriesCount: 0,
            pendingQuotationsCount: 0,
            pendingPurchaseOrdersCount: 0,
            pendingCollectionAmount: 0,
            pendingQueries: [],
            pendingQuotations: [],
            pendingPurchaseOrders: [],
            weeklyTarget: 0,
            weeklyBilling: 0,
            monthlyTarget: 0,
            monthlyBilling: 0,
            weeklyPeriodFrom: "",
            weeklyPeriodTo: "",
            monthlyPeriodFrom: "",
            monthlyPeriodTo: "",
          }));
        }
      } catch (_e) {
        setLatestEmployeeLocation(null);
        setDashboard((prev) => ({
          ...prev,
          monthlyQueriesCount: 0,
          monthlyQuotationsCount: 0,
          monthlyPurchaseOrdersCount: 0,
          pendingQueriesCount: 0,
          pendingQuotationsCount: 0,
          pendingPurchaseOrdersCount: 0,
          pendingCollectionAmount: 0,
          pendingQueries: [],
          pendingQuotations: [],
          pendingPurchaseOrders: [],
          weeklyTarget: 0,
          weeklyBilling: 0,
          monthlyTarget: 0,
          monthlyBilling: 0,
          weeklyPeriodFrom: "",
          weeklyPeriodTo: "",
          monthlyPeriodFrom: "",
          monthlyPeriodTo: "",
        }));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const targetPeriodLabel = (fromIso, toIso) => {
    const a = dateFormatter(fromIso, "");
    const b = dateFormatter(toIso, "");
    if (!a && !b) return "";
    return `From ${a || "—"} to ${b || "—"}`;
  };

  const locationText = useMemo(
    () => formatHeaderLocation(latestEmployeeLocation, user),
    [latestEmployeeLocation, user],
  );

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 text-sm text-muted-foreground">
          {formatTodayHeading()}
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Welcome, {user?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Location</span>
          {locationText ? (
            <> — {locationText}</>
          ) : (
            <span className="text-muted-foreground"> — Not set</span>
          )}
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Phone / small screens: highlight pending counts */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            <StatCard
              title="Pending queries"
              value={String(dashboard.pendingQueriesCount)}
              subtitle="Draft — action needed"
              icon={FileText}
              color="primary"
            />
            <StatCard
              title="Pending quotations"
              value={String(dashboard.pendingQuotationsCount)}
              subtitle="Not closed"
              icon={ShoppingCart}
              color="info"
            />
            <StatCard
              title="Pending Sales Orders"
              value={String(dashboard.pendingPurchaseOrdersCount)}
              subtitle="Open orders"
              icon={ShoppingBasket}
              color="success"
            />
            <StatCard
              title="Pending collection"
              value={formatAmount(dashboard.pendingCollectionAmount)}
              subtitle="To collect"
              icon={DollarSign}
              color="warning"
            />
          </div>

          {/* Tablet and up: monthly activity cards */}
          <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Queries"
              value={String(dashboard.monthlyQueriesCount)}
              icon={FileText}
              color="primary"
            />
            <StatCard
              title="Quotations"
              value={String(dashboard.monthlyQuotationsCount)}
              icon={ShoppingCart}
              color="info"
            />
            <StatCard
              title="Sales Orders"
              value={String(dashboard.monthlyPurchaseOrdersCount)}
              icon={ShoppingBasket}
              color="success"
            />
            <StatCard
              title="Pending collection"
              value={formatAmount(dashboard.pendingCollectionAmount)}
              icon={DollarSign}
              color="warning"
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-baseline gap-2">
                <span>Pending queries</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Draft — not yet converted
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query code</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.pendingQueries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-4 text-center text-muted-foreground"
                      >
                        No pending queries
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboard.pendingQueries.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.queryCode || "—"}</TableCell>
                        <TableCell>{row.companyName || "—"}</TableCell>
                        <TableCell>{formatQueryStatus(row.status)}</TableCell>
                        <TableCell>
                          {dateTimeFormatter(row.createdAt, "—")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/queries/${row.id}`)}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-baseline gap-2">
                <span>Pending quotations</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Not closed or fulfilled
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation code</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.pendingQuotations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-4 text-center text-muted-foreground"
                      >
                        No pending quotations
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboard.pendingQuotations.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.quotationCode || "—"}</TableCell>
                        <TableCell>{row.companyName || "—"}</TableCell>
                        <TableCell>
                          {formatQuotationStatus(row.status)}
                        </TableCell>
                        <TableCell>
                          {dateTimeFormatter(row.createdAt, "—")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/quotations/${row.id}`)}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-baseline gap-2">
                <span>Pending sales orders</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Not fulfilled or cancelled
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Order code</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pending amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.pendingPurchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-4 text-center text-muted-foreground"
                      >
                        No pending sales orders
                      </TableCell>
                    </TableRow>
                  ) : (
                    dashboard.pendingPurchaseOrders.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.poCode || "—"}</TableCell>
                        <TableCell>{row.companyName || "—"}</TableCell>
                        <TableCell>{formatPoStatus(row.status)}</TableCell>
                        <TableCell>
                          {formatAmount(row.remainingAmount)}
                        </TableCell>
                        <TableCell>
                          {dateTimeFormatter(row.createdAt, "—")}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.quotationId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(`/quotations/${row.quotationId}`)
                              }
                            >
                              Open quotation
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-baseline gap-2">
                <span>Sales target progress</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Branch employee targets vs billing
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <TargetItem
                  label="Weekly target"
                  value={formatAmount(dashboard.weeklyTarget)}
                  period={targetPeriodLabel(
                    dashboard.weeklyPeriodFrom,
                    dashboard.weeklyPeriodTo,
                  )}
                  accent="border-success!"
                />
                <TargetItem
                  label="Weekly billing"
                  value={formatAmount(dashboard.weeklyBilling)}
                  period={targetPeriodLabel(
                    dashboard.weeklyPeriodFrom,
                    dashboard.weeklyPeriodTo,
                  )}
                  accent="border-success!"
                />
                <TargetItem
                  label="Monthly target"
                  value={formatAmount(dashboard.monthlyTarget)}
                  period={targetPeriodLabel(
                    dashboard.monthlyPeriodFrom,
                    dashboard.monthlyPeriodTo,
                  )}
                  accent="border-warning!"
                />
                <TargetItem
                  label="Monthly billing"
                  value={formatAmount(dashboard.monthlyBilling)}
                  period={targetPeriodLabel(
                    dashboard.monthlyPeriodFrom,
                    dashboard.monthlyPeriodTo,
                  )}
                  accent="border-warning!"
                />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Pending Work</CardTitle>
                <CardDescription>Needs your attention (sample)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={pendingWorkColumns}
                  rows={salesMasterDashboard.pendingWork}
                  rowKey={(r) => r.id}
                  showSearch={false}
                  maxHeight="none"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Assigned Tasks</CardTitle>
                <CardDescription>
                  Given to you by management (sample)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={assignedTaskColumns}
                  rows={salesMasterDashboard.assignedTasks}
                  rowKey={(r) => r.id}
                  showSearch={false}
                  maxHeight="none"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Assigned Work</CardTitle>
                <CardDescription>
                  Queries, quotations & orders in your queue (sample)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={assignedWorkColumns}
                  rows={salesMasterDashboard.assignedWork}
                  rowKey={(r) => r.id}
                  showSearch={false}
                  maxHeight="none"
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default SalesDashboard;
