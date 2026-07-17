import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Clipboard, Filter, List, Users, Gauge, Pencil } from "lucide-react";
import purchaseTaskService from "../../services/purchaseTaskService";
import employeeService from "../../services/employeeService";
import { Loader, FilterLockButton, PageHeader } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardContent,
  Input,
  Label,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
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
import { toastError, toastSuccess } from "../../utils/toast";
import { useAuth, ROLES } from "../../context/AuthContext";
import { dateFormatter } from "../../utils/dateFormatter";
import { cn } from "../../lib/utils";

const PURCHASE_TASKS_FILTER_DEFAULTS = {
  status: "",
  adminStatus: "",
  adminRole: "",
  adminEmployeeId: "",
};

const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  SETTLED: "settled",
};

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: TASK_STATUS.PENDING, label: "Pending" },
  { value: TASK_STATUS.IN_PROGRESS, label: "In Progress" },
  { value: TASK_STATUS.SUBMITTED, label: "Submitted" },
  { value: TASK_STATUS.SETTLED, label: "Settled" },
];

const getStatusBadge = (status) => {
  switch (status) {
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

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount)))
    return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const PurchaseTasks = () => {
  const { user } = useAuth();
  const query = useQuery();
  const viewParam = query.get("view");

  const isAdminLike =
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.HEAD_OF_DEPARTMENT;

  const initialTab = useMemo(() => {
    if (viewParam === "rate") return "rate";
    if (viewParam === "admin" && isAdminLike) return "admin";
    // Admin-like users should default to admin tracking
    if (isAdminLike) return "admin";
    return "purchase";
  }, [viewParam, isAdminLike]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "purchase_tasks",
    PURCHASE_TASKS_FILTER_DEFAULTS,
  );

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialValues.status);

  const [adminTasks, setAdminTasks] = useState([]);
  const [adminPagination, setAdminPagination] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminStatusFilter, setAdminStatusFilter] = useState(
    initialValues.adminStatus,
  );
  const [adminRoleFilter, setAdminRoleFilter] = useState(
    initialValues.adminRole,
  );
  const [adminEmployeeFilter, setAdminEmployeeFilter] = useState(
    initialValues.adminEmployeeId,
  );
  const [employees, setEmployees] = useState([]);

  const [remarkModalTask, setRemarkModalTask] = useState(null);
  const [remarkValue, setRemarkValue] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);
  const [targetRateModalTask, setTargetRateModalTask] = useState(null);
  const [targetRateValue, setTargetRateValue] = useState("");
  const [savingTargetRate, setSavingTargetRate] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseTaskService.getMyTasks({
          pageNumber: 1,
          pageSize: 50,
          status: statusFilter || undefined,
        }),
      );
      const data = res?.data || res;
      const result = data?.data ?? data;
      setTasks(result?.tasks || []);
      setPagination(result?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load tasks");
      setTasks([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRateBucket = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseTaskService.getRateBucket({
          pageNumber: 1,
          pageSize: 50,
          status: statusFilter || undefined,
        }),
      );
      const data = res?.data || res;
      const result = data?.data ?? data;
      setTasks(result?.tasks || []);
      setPagination(result?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load rate bucket data");
      setTasks([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminTasks = async () => {
    if (!isAdminLike) return;
    setAdminLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseTaskService.adminList({
          pageNumber: 1,
          pageSize: 50,
          status: adminStatusFilter || undefined,
          role: adminRoleFilter || undefined,
          employeeId: adminEmployeeFilter || undefined,
        }),
      );
      const data = res?.data || res;
      const result = data?.data ?? data;
      setAdminTasks(result?.tasks || []);
      setAdminPagination(result?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load tasks for admin view");
      setAdminTasks([]);
      setAdminPagination(null);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeeService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data || res;
      const result = data?.data ?? data;
      const list = result?.employees || result?.items || result || [];
      setEmployees(list);
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (activeTab === "purchase") {
      loadTasks();
    } else if (activeTab === "rate") {
      loadRateBucket();
    } else if (activeTab === "admin") {
      if (employees.length === 0) {
        loadEmployees();
      }
      loadAdminTasks();
    }
  }, [
    activeTab,
    statusFilter,
    adminStatusFilter,
    adminRoleFilter,
    adminEmployeeFilter,
  ]);

  useFilterLockPersist("purchase_tasks", filtersLocked, {
    status: statusFilter,
    adminStatus: adminStatusFilter,
    adminRole: adminRoleFilter,
    adminEmployeeId: adminEmployeeFilter,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      status: statusFilter,
      adminStatus: adminStatusFilter,
      adminRole: adminRoleFilter,
      adminEmployeeId: adminEmployeeFilter,
    });
  };

  const handleStatusChange = async (task, newStatus) => {
    if (!newStatus || newStatus === task.status) return;
    try {
      await purchaseTaskService.updateStatus(
        task._id || task.id,
        newStatus,
        task.targetRate,
      );
      toastSuccess("Task status updated");
      if (activeTab === "admin") {
        loadAdminTasks();
      } else if (activeTab === "rate") {
        loadRateBucket();
      } else {
        loadTasks();
      }
    } catch (err) {
      toastError(err?.message || "Failed to update task status");
    }
  };

  const openRemarkModal = (task) => {
    setRemarkModalTask(task);
    setRemarkValue(task.supplierRateRemark || "");
  };

  const closeRemarkModal = () => {
    setRemarkModalTask(null);
    setRemarkValue("");
  };

  const handleSaveRemark = async () => {
    if (!remarkModalTask) return;
    setSavingRemark(true);
    try {
      await purchaseTaskService.updateRemark(
        remarkModalTask._id || remarkModalTask.id,
        remarkValue,
      );
      toastSuccess("Supplier rate remark updated");
      closeRemarkModal();
      if (activeTab === "admin") {
        loadAdminTasks();
      } else if (activeTab === "rate") {
        loadRateBucket();
      } else {
        loadTasks();
      }
    } catch (err) {
      toastError(err?.message || "Failed to update remark");
    } finally {
      setSavingRemark(false);
    }
  };

  const openTargetRateModal = (task) => {
    setTargetRateModalTask(task);
    setTargetRateValue(task.targetRate != null ? String(task.targetRate) : "");
  };

  const closeTargetRateModal = () => {
    setTargetRateModalTask(null);
    setTargetRateValue("");
  };

  const handleSaveTargetRate = async () => {
    if (!targetRateModalTask) return;
    const task = targetRateModalTask;
    const value = targetRateValue === "" ? null : Number(targetRateValue);
    setSavingTargetRate(true);
    try {
      // reuse updateStatus endpoint by sending current status and new targetRate
      await purchaseTaskService.updateStatus(
        task._id || task.id,
        task.status || "",
        value,
      );
      toastSuccess("Target rate updated");
      closeTargetRateModal();
      // reload current view
      if (activeTab === "admin") {
        loadAdminTasks();
      } else if (activeTab === "rate") {
        loadRateBucket();
      } else {
        loadTasks();
      }
    } catch (err) {
      toastError(err?.message || "Failed to update target rate");
    } finally {
      setSavingTargetRate(false);
    }
  };

  const renderTaskRow = (task, index, showAssignee = false) => {
    const quotation = task.quotationId || task.quotation || {};
    const companyName =
      quotation.companyInfo?.name ||
      quotation.customerName ||
      quotation.companyName ||
      "-";

    return (
      <TableRow key={task._id || task.id || index}>
        <TableCell>{index + 1}</TableCell>
        <TableCell>
          <strong>
            {quotation.quotationCode ||
              (quotation._id || quotation.id
                ? `QT-${String(quotation._id || quotation.id)
                    .slice(-4)
                    .padStart(4, "0")}`
                : "-")}
          </strong>
        </TableCell>
        <TableCell>
          <strong>
            {Array.isArray(quotation.products) && quotation.products.length > 0
              ? quotation.products[0].productName || "-"
              : "-"}
          </strong>
        </TableCell>
        <TableCell>
          <strong>{companyName}</strong>
        </TableCell>
        <TableCell>
          <strong>{task.productCategory || "-"}</strong>
        </TableCell>
        <TableCell>
          <strong>{task.productGroup || "-"}</strong>
        </TableCell>
        <TableCell>
          <strong>{task.subCategory || "-"}</strong>
        </TableCell>
        <TableCell className="whitespace-nowrap align-middle">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "rounded-md px-2.5 py-1.5",
                task.targetRate != null
                  ? "bg-success-muted font-semibold text-success!"
                  : "",
              )}
            >
              {formatCurrency(task.targetRate)}
            </div>
            {(user?.role === ROLES.PURCHASE_EXICUTIVE ||
              user?.role === ROLES.PROCUREMENT) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Edit Target Rate"
                onClick={() => openTargetRateModal(task)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Select
            className="h-8 text-xs"
            value={task.status || TASK_STATUS.PENDING}
            onChange={(e) => handleStatusChange(task, e.target.value)}
          >
            {statusOptions
              .filter((o) => o.value)
              .map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
          </Select>
          <div className="mt-1">{getStatusBadge(task.status)}</div>
        </TableCell>
        {showAssignee && (
          <TableCell>
            <div>
              <strong>{task.assignedTo?.name || "-"}</strong>
            </div>
            {task.assignedTo?.designation && (
              <div className="text-sm text-muted-foreground">
                {task.assignedTo.designation}
              </div>
            )}
          </TableCell>
        )}
        <TableCell>
          <div className="mb-2 text-sm">
            {task.supplierRateRemark ? (
              <span>{task.supplierRateRemark}</span>
            ) : (
              <span className="text-muted-foreground">No remark</span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openRemarkModal(task)}
          >
            Update Remark
          </Button>
        </TableCell>
        <TableCell>{dateFormatter(task.createdAt, "-")}</TableCell>
      </TableRow>
    );
  };

  const renderTasksTable = (items, showAssignee = false) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>S No</TableHead>
            <TableHead>Quotation</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Product Category</TableHead>
            <TableHead>Product Group</TableHead>
            <TableHead>Subcategory</TableHead>
            <TableHead>Target Rate</TableHead>
            <TableHead>Status</TableHead>
            {showAssignee && <TableHead>Assigned To</TableHead>}
            <TableHead>Supplier Rate Remark</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items && items.length > 0 ? (
            items.map((task, index) => renderTaskRow(task, index, showAssignee))
          ) : (
            <TableRow>
              <TableCell
                colSpan={showAssignee ? 12 : 11}
                className="text-center"
              >
                No tasks found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const uniqueRoles = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.role) set.add(e.role);
    });
    return Array.from(set);
  }, [employees]);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="mb-1 text-lg font-semibold">Purchase Tasks</h4>
          <p className="mb-0 text-sm text-muted-foreground">
            Manage quotation-based purchase tasks, rate bucket, and admin
            tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Total Tasks: {pagination?.totalItems ?? tasks.length}
          </Badge>
          {isAdminLike && (
            <Badge variant="info" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Admin View
            </Badge>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b border-border py-2">
            <TabsList>
              {isAdminLike ? (
                <TabsTrigger value="admin">
                  <Filter className="mr-2 h-4 w-4" />
                  Admin Tracking
                </TabsTrigger>
              ) : (
                <>
                  <TabsTrigger value="purchase">
                    <Clipboard className="mr-2 h-4 w-4" />
                    Purchase Task
                  </TabsTrigger>
                  {/* Rate Bucket visible only to purchase roles */}
                  {(user?.role === ROLES.PURCHASE_EXICUTIVE ||
                    user?.role === ROLES.PROCUREMENT) && (
                    <TabsTrigger value="rate">
                      <List className="mr-2 h-4 w-4" />
                      Rate Bucket
                    </TabsTrigger>
                  )}
                </>
              )}
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="purchase">
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-48">
                  <Label>Status</Label>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <FilterLockButton
                  filtersLocked={filtersLocked}
                  onToggle={handleToggleFiltersLock}
                  pageLabel="Purchase Tasks"
                />
              </div>
              {loading ? (
                <Loader message="Loading tasks..." />
              ) : (
                renderTasksTable(tasks)
              )}
            </TabsContent>

            <TabsContent value="rate">
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-48">
                  <Label>Status</Label>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <FilterLockButton
                  filtersLocked={filtersLocked}
                  onToggle={handleToggleFiltersLock}
                  pageLabel="Purchase Tasks"
                />
              </div>
              {loading ? (
                <Loader message="Loading rate bucket data..." />
              ) : (
                renderTasksTable(tasks)
              )}
            </TabsContent>

            <TabsContent value="admin">
              {isAdminLike ? (
                <>
                  <div className="mb-3 flex flex-wrap items-end gap-3">
                    <div className="w-full sm:w-48">
                      <Label>Status</Label>
                      <Select
                        value={adminStatusFilter}
                        onChange={(e) => setAdminStatusFilter(e.target.value)}
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </div>
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
                      pageLabel="Purchase Tasks"
                    />
                  </div>
                  {adminLoading ? (
                    <Loader message="Loading admin tasks..." />
                  ) : (
                    renderTasksTable(adminTasks, true)
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">
                  You do not have access to the admin view.
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Dialog
        open={!!remarkModalTask}
        onOpenChange={(open) => !open && closeRemarkModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Supplier Rate Remark</DialogTitle>
          </DialogHeader>
          <div className="mb-3">
            <Label>Remark</Label>
            <Input
              type="text"
              value={remarkValue}
              onChange={(e) => setRemarkValue(e.target.value)}
              placeholder="Enter supplier rate remark"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeRemarkModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRemark}
              disabled={savingRemark}
            >
              {savingRemark ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!targetRateModalTask}
        onOpenChange={(open) => !open && closeTargetRateModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Target Rate</DialogTitle>
          </DialogHeader>
          <div className="mb-3">
            <Label>Target Rate (INR)</Label>
            <Input
              type="number"
              min={0}
              value={targetRateValue}
              onChange={(e) => setTargetRateValue(e.target.value)}
              placeholder="Enter target rate"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeTargetRateModal}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveTargetRate}
              disabled={savingTargetRate}
            >
              {savingTargetRate ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PurchaseTasks;
