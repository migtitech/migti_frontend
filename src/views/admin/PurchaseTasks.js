import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Clipboard,
  Inbox,
  List,
  RefreshCcw,
  Users,
  Gauge,
  Eye,
} from "lucide-react";
import purchaseTaskService from "../../services/purchaseTaskService";
import {
  dummyPurchaseTasks,
  dummyRateBucketTasks,
} from "../../data/procurementRequestsDummy";
import employeeService from "../../services/employeeService";
import { Loader, FilterLockButton } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardContent,
  Label,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { useAuth, ROLES } from "../../context/AuthContext";
import { dateFormatter } from "../../utils/dateFormatter";
import { cn } from "../../lib/utils";

const FILTER_DEFAULTS = {
  adminRole: "",
  adminEmployeeId: "",
};

export const TASK_STATUS = {
  ASSIGNED: "assigned",
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  SETTLED: "settled",
};

export const getStatusBadge = (status) => {
  switch (status) {
    case TASK_STATUS.ASSIGNED:
      return <Badge variant="secondary">Assigned</Badge>;
    case TASK_STATUS.PENDING:
      return <Badge variant="warning">Pending</Badge>;
    case TASK_STATUS.IN_PROGRESS:
      return <Badge>In Progress</Badge>;
    case TASK_STATUS.SUBMITTED:
      return <Badge variant="info">Submitted</Badge>;
    case TASK_STATUS.SETTLED:
      return <Badge variant="success">Settled</Badge>;
    default:
      return <Badge variant="secondary">{status || "Pending"}</Badge>;
  }
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount)))
    return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const refId = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v._id || v.id || "");
  return String(v);
};

/**
 * Bucket a task into one of the page tabs:
 * - "reverify": submitted tasks sent back for re-verification
 * - "assigned": manually assigned by another person
 * - "direct":   self-assigned / auto-created from the quotation flow
 */
export const classifyTask = (task) => {
  if (task?.status === TASK_STATUS.SUBMITTED) return "reverify";
  const byId = refId(task?.assignedBy);
  const toId = refId(task?.assignedTo);
  if (byId && toId && byId !== toId) return "assigned";
  return "direct";
};

const isPendingStatus = (status) =>
  status === TASK_STATUS.ASSIGNED ||
  status === TASK_STATUS.PENDING ||
  status === TASK_STATUS.IN_PROGRESS ||
  !status;

const useQueryParams = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const PurchaseTasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useQueryParams();
  const viewParam = query.get("view");

  const isAdminLike =
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.HEAD_OF_DEPARTMENT;

  const isPurchaseRole =
    user?.role === ROLES.PURCHASE_EXICUTIVE || user?.role === ROLES.PROCUREMENT;

  const initialTab =
    viewParam === "rate" && isPurchaseRole ? "rate" : "assigned";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "purchase_tasks",
    FILTER_DEFAULTS,
  );

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [rateTasks, setRateTasks] = useState([]);
  const [rateLoading, setRateLoading] = useState(false);

  const [adminRoleFilter, setAdminRoleFilter] = useState(
    initialValues.adminRole,
  );
  const [adminEmployeeFilter, setAdminEmployeeFilter] = useState(
    initialValues.adminEmployeeId,
  );
  const [employees, setEmployees] = useState([]);

  /* ── load all tasks once (classified client-side into tabs) ── */
  useEffect(() => {
    let alive = true;
    const loadTasks = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          isAdminLike
            ? purchaseTaskService.adminList({
                pageNumber: 1,
                pageSize: 100,
                role: adminRoleFilter || undefined,
                employeeId: adminEmployeeFilter || undefined,
              })
            : purchaseTaskService.getMyTasks({
                pageNumber: 1,
                pageSize: 100,
              }),
        );
        if (!alive) return;
        const data = res?.data || res;
        const result = data?.data ?? data;
        const loaded = result?.tasks || [];
        // Sample data for UI preview when the backend has no requests yet.
        setTasks(loaded.length ? loaded : dummyPurchaseTasks);
      } catch (err) {
        if (!alive) return;
        toastError(err?.message || "Failed to load procurement requests");
        setTasks(dummyPurchaseTasks);
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadTasks();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminRoleFilter, adminEmployeeFilter]);

  useEffect(() => {
    if (!isAdminLike) return;
    let alive = true;
    const loadEmployees = async () => {
      try {
        const res = await employeeService.getAll({
          pageNumber: 1,
          pageSize: 100,
        });
        if (!alive) return;
        const data = res?.data || res;
        const result = data?.data ?? data;
        const list = result?.employees || result?.items || result || [];
        setEmployees(Array.isArray(list) ? list : []);
      } catch {
        if (alive) setEmployees([]);
      }
    };
    loadEmployees();
    return () => {
      alive = false;
    };
  }, [isAdminLike]);

  useEffect(() => {
    if (activeTab !== "rate" || !isPurchaseRole) return;
    let alive = true;
    const loadRateBucket = async () => {
      setRateLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          purchaseTaskService.getRateBucket({ pageNumber: 1, pageSize: 100 }),
        );
        if (!alive) return;
        const data = res?.data || res;
        const result = data?.data ?? data;
        const loaded = result?.tasks || [];
        setRateTasks(loaded.length ? loaded : dummyRateBucketTasks);
      } catch (err) {
        if (!alive) return;
        toastError(err?.message || "Failed to load rate bucket data");
        setRateTasks(dummyRateBucketTasks);
      } finally {
        if (alive) setRateLoading(false);
      }
    };
    loadRateBucket();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useFilterLockPersist("purchase_tasks", filtersLocked, {
    adminRole: adminRoleFilter,
    adminEmployeeId: adminEmployeeFilter,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      adminRole: adminRoleFilter,
      adminEmployeeId: adminEmployeeFilter,
    });
  };

  /* ── classification ── */
  const buckets = useMemo(() => {
    const assigned = [];
    const direct = [];
    const reverify = [];
    tasks.forEach((t) => {
      const kind = classifyTask(t);
      if (kind === "reverify") reverify.push(t);
      else if (kind === "assigned") assigned.push(t);
      else direct.push(t);
    });
    return { assigned, direct, reverify };
  }, [tasks]);

  const pendingCounts = useMemo(
    () => ({
      assigned: buckets.assigned.filter((t) => isPendingStatus(t.status))
        .length,
      direct: buckets.direct.filter((t) => isPendingStatus(t.status)).length,
      reverify: buckets.reverify.length,
      rate: rateTasks.filter((t) => isPendingStatus(t.status)).length,
    }),
    [buckets, rateTasks],
  );

  const uniqueRoles = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.role) set.add(e.role);
    });
    return Array.from(set);
  }, [employees]);

  const openDetail = (task) => {
    const id = task._id || task.id;
    if (!id) return;
    navigate(`/procurement-requests/${id}`, { state: { task } });
  };

  /* ── clean table: row click opens the full detail page ── */
  const renderTasksTable = (items, { showAssignedBy = false } = {}) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: 48 }}>#</TableHead>
            <TableHead>Quotation</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Target Rate</TableHead>
            {showAssignedBy && <TableHead>Assigned By</TableHead>}
            {isAdminLike && <TableHead>Assigned To</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items && items.length > 0 ? (
            items.map((task, index) => {
              const quotation = task.quotationId || task.quotation || {};
              const companyName =
                quotation.companyInfo?.name ||
                quotation.customerName ||
                quotation.companyName ||
                "-";
              return (
                <TableRow
                  key={task._id || task.id || index}
                  className="cursor-pointer"
                  onClick={() => openDetail(task)}
                  title="Open full details"
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {quotation.quotationCode || task.quotationNumber || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {Array.isArray(quotation.products) &&
                    quotation.products.length > 0
                      ? quotation.products[0].productName || "-"
                      : "-"}
                    {Array.isArray(quotation.products) &&
                      quotation.products.length > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          +{quotation.products.length - 1} more
                        </span>
                      )}
                  </TableCell>
                  <TableCell>{companyName}</TableCell>
                  <TableCell>{task.productCategory || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        task.targetRate != null && task.targetRate > 0
                          ? "font-semibold text-success!"
                          : "",
                      )}
                    >
                      {formatCurrency(task.targetRate)}
                    </span>
                  </TableCell>
                  {showAssignedBy && (
                    <TableCell>
                      {task.assignedBy?.name || "-"}
                      {task.assignedBy?.role && (
                        <div className="text-xs text-muted-foreground">
                          {task.assignedBy.role}
                        </div>
                      )}
                    </TableCell>
                  )}
                  {isAdminLike && (
                    <TableCell>
                      {task.assignedTo?.name || "-"}
                      {task.assignedTo?.designation && (
                        <div className="text-xs text-muted-foreground">
                          {task.assignedTo.designation}
                        </div>
                      )}
                    </TableCell>
                  )}
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {dateFormatter(task.createdAt, "-")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(task);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={9 + (showAssignedBy ? 1 : 0) + (isAdminLike ? 1 : 0)}
                className="text-center"
              >
                No requests found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  /* small count badge shown on top of each tab */
  const countBadge = (count) => (
    <Badge
      variant={count > 0 ? "warning" : "secondary"}
      className="ml-1.5 px-1.5 text-[0.68rem]"
      title={`${count} pending`}
    >
      {count}
    </Badge>
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="mb-1 text-lg font-semibold">Procurement Requests</h4>
          <p className="mb-0 text-sm text-muted-foreground">
            Assigned, direct and re-verification requests — click a row to open
            full details.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Total: {tasks.length}
          </Badge>
          {isAdminLike && (
            <Badge variant="info" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Admin View
            </Badge>
          )}
        </div>
      </div>

      {isAdminLike && (
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-48">
            <Label>Role</Label>
            <Select
              value={adminRoleFilter}
              onChange={(e) => setAdminRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <Label>Employee</Label>
            <Select
              value={adminEmployeeFilter}
              onChange={(e) => setAdminEmployeeFilter(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e._id || e.id} value={e._id || e.id}>
                  {e.name || e.email}
                </option>
              ))}
            </Select>
          </div>
          <FilterLockButton
            filtersLocked={filtersLocked}
            onToggle={handleToggleFiltersLock}
            pageLabel="Procurement Requests"
          />
        </div>
      )}

      <Card className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b border-border py-2">
            <TabsList>
              <TabsTrigger value="assigned">
                <Clipboard className="mr-2 h-4 w-4" />
                Assigned
                {countBadge(pendingCounts.assigned)}
              </TabsTrigger>
              <TabsTrigger value="direct">
                <Inbox className="mr-2 h-4 w-4" />
                Direct
                {countBadge(pendingCounts.direct)}
              </TabsTrigger>
              <TabsTrigger value="reverify">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reverify
                {countBadge(pendingCounts.reverify)}
              </TabsTrigger>
              {isPurchaseRole && (
                <TabsTrigger value="rate">
                  <List className="mr-2 h-4 w-4" />
                  Rate Bucket
                  {countBadge(pendingCounts.rate)}
                </TabsTrigger>
              )}
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="assigned">
              {loading ? (
                <Loader message="Loading assigned requests..." />
              ) : (
                renderTasksTable(buckets.assigned, { showAssignedBy: true })
              )}
            </TabsContent>

            <TabsContent value="direct">
              {loading ? (
                <Loader message="Loading direct requests..." />
              ) : (
                renderTasksTable(buckets.direct)
              )}
            </TabsContent>

            <TabsContent value="reverify">
              {loading ? (
                <Loader message="Loading re-verification requests..." />
              ) : (
                renderTasksTable(buckets.reverify, { showAssignedBy: true })
              )}
            </TabsContent>

            {isPurchaseRole && (
              <TabsContent value="rate">
                {rateLoading ? (
                  <Loader message="Loading rate bucket data..." />
                ) : (
                  renderTasksTable(rateTasks)
                )}
              </TabsContent>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </>
  );
};

export default PurchaseTasks;
