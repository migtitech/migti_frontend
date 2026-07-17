import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus } from "lucide-react";
import taskManagementService from "../../services/taskManagementService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { Button, Label, Select, Tooltip } from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { dateFormatter } from "../../utils/dateFormatter";
import { toastError } from "../../utils/toast";

const TASK_FILTER_DEFAULTS = { status: "" };

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "assigned", label: "Assigned" },
  { value: "submitted", label: "Submitted" },
];

const STATUS_LABELS = {
  draft: "Draft",
  assigned: "Assigned",
  submitted: "Submitted",
};

const getStatusBadge = (status) => (
  <StatusBadge status={status}>
    {STATUS_LABELS[status] || status || "–"}
  </StatusBadge>
);

const TaskList = () => {
  const navigate = useNavigate();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "task_list",
    TASK_FILTER_DEFAULTS,
  );
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialValues.status);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchDebounced, statusFilter]);

  useFilterLockPersist("task_list", filtersLocked, {
    status: statusFilter,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status: statusFilter });
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        taskManagementService.getAll({
          pageNumber,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: statusFilter || undefined,
        }),
      );
      const data = res?.data || res;
      const result = data?.data ?? data;
      const list = result?.tasks ?? [];
      setTasks(list);
      setPagination(result?.pagination ?? null);
    } catch (err) {
      toastError(err?.message || "Failed to load tasks");
      setTasks([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, searchDebounced, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await taskManagementService.delete(deleteTarget._id);
      setDeleteTarget(null);
      await fetchTasks();
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to delete task",
      );
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "#",
        width: 56,
        toggleable: false,
        exportable: false,
        render: (_row, index) =>
          (pagination?.currentPage - 1) * pageSize + index + 1,
      },
      {
        key: "product",
        label: "Product",
        exportValue: (task) => task.productInfo?.name || "",
        render: (task) => (
          <div>
            <strong>{task.productInfo?.name || "–"}</strong>
            {task.productInfo?.description && (
              <small className="block text-muted-foreground">
                {task.productInfo.description}
              </small>
            )}
            {(task.productInfo?.variant ||
              (Array.isArray(task.productInfo?.variants) &&
                task.productInfo.variants.length > 0)) && (
              <small className="block text-muted-foreground">
                Variant:{" "}
                {task.productInfo?.variant ||
                  task.productInfo.variants.filter(Boolean).join(", ")}
              </small>
            )}
            {task.productInfo?.modelNumber && (
              <small className="block text-muted-foreground">
                Model: {task.productInfo.modelNumber}
              </small>
            )}
          </div>
        ),
      },
      {
        key: "assignedTo",
        label: "Assigned To",
        exportValue: (task) => task.employeeId?.name || "",
        render: (task) =>
          task.employeeId?.name ? (
            <>
              {task.employeeId.name}
              {task.employeeId.designation && (
                <small className="block text-muted-foreground">
                  {task.employeeId.designation}
                </small>
              )}
            </>
          ) : (
            "–"
          ),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (task) => task.status,
        exportValue: (task) => STATUS_LABELS[task.status] || task.status || "",
        render: (task) => getStatusBadge(task.status),
      },
      {
        key: "supplier",
        label: "Supplier",
        exportValue: (task) => task.supplierInfo?.supplierName || "",
        render: (task) =>
          task.supplierInfo ? (
            <small className="block text-muted-foreground">
              {task.supplierInfo.supplierName && (
                <span className="block">{task.supplierInfo.supplierName}</span>
              )}
              {task.supplierInfo.contactName && (
                <span className="block">{task.supplierInfo.contactName}</span>
              )}
              {task.supplierInfo.contactPhone && (
                <span className="block">{task.supplierInfo.contactPhone}</span>
              )}
              {!task.supplierInfo.supplierName &&
                !task.supplierInfo.contactName &&
                !task.supplierInfo.contactPhone &&
                "–"}
            </small>
          ) : (
            "–"
          ),
      },
      {
        key: "rate",
        label: "Rate",
        exportValue: (task) =>
          task.supplierInfo?.rate != null ? Number(task.supplierInfo.rate) : "",
        render: (task) =>
          task.supplierInfo?.rate != null
            ? `₹${Number(task.supplierInfo.rate).toLocaleString()}`
            : "–",
      },
      {
        key: "remark",
        label: "Remark",
        exportValue: (task) => task.supplierInfo?.remark || "",
        render: (task) => task.supplierInfo?.remark || "–",
      },
      {
        key: "dueDate",
        label: "Due Date",
        exportValue: (task) =>
          task.dueDate ? dateFormatter(task.dueDate, "–") : "–",
        render: (task) =>
          task.dueDate ? dateFormatter(task.dueDate, "–") : "–",
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (task) => (
          <RowActions
            extra={
              <Tooltip content="Assign employee">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => navigate(`/task-dashboard/${task._id}`)}
                  aria-label="Assign employee"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </Tooltip>
            }
            onView={() => navigate(`/task-dashboard/${task._id}`)}
            onDelete={() => setDeleteTarget(task)}
            deleteLabel="Delete task"
          />
        ),
      },
    ],
    [navigate, pagination, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Task Dashboard"
        description="Track sourcing tasks, assignments and their current status."
        actions={
          <Button onClick={() => navigate("/task-dashboard/new")}>
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <FilterLockButton
            filtersLocked={filtersLocked}
            onToggle={handleToggleFiltersLock}
            pageLabel="Task Dashboard"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={tasks}
        rowKey={(task) => task._id}
        loading={loading}
        onRowClick={(task) => navigate(`/task-dashboard/${task._id}`)}
        showSearch={false}
        exportFileName="tasks"
        emptyTitle="No tasks found"
        emptyMessage="Create one to get started."
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Task"
        message={
          deleteTarget
            ? `Are you sure you want to delete task "${deleteTarget.title || ""}"?`
            : ""
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={setPageNumber}
        disabled={loading}
        showRange
        totalItems={pagination.totalItems}
        itemsPerPage={pageSize}
        wrapperClassName="flex justify-between items-center mt-2"
      />
    </div>
  );
};

export default TaskList;
