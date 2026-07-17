import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import taskManagementService from "../../services/taskManagementService";
import Filtered from "../../filtered/Filtered";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardContent,
  Label,
  Select,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const TASK_BUCKET_FILTER_DEFAULTS = { status: "assigned" };

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "assigned", label: "Assigned" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
];

const getStatusBadge = (status) => {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "assigned":
      return <Badge variant="info">Assigned</Badge>;
    case "submitted":
      return <Badge variant="success">Submitted</Badge>;
    default:
      return <Badge variant="secondary">{status || "–"}</Badge>;
  }
};

const TaskBucket = () => {
  const navigate = useNavigate();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "task_bucket",
    TASK_BUCKET_FILTER_DEFAULTS,
  );
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialValues.status);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchDebounced, statusFilter]);

  useFilterLockPersist("task_bucket", filtersLocked, {
    status: statusFilter,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status: statusFilter });
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        taskManagementService.getMyTasks({
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
  }, [pageNumber, pageSize, searchDebounced, statusFilter]);

  const assignedCount = tasks.filter((t) => t.status === "assigned").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-center justify-between border-b border-border py-4">
        <div className="text-base font-semibold">Task Bucket</div>
        <div className="flex gap-3 text-sm">
          <span>
            <span className="mr-1 text-muted-foreground">Assigned:</span>
            <strong>{assignedCount}</strong>
          </span>
          <span>
            <span className="mr-1 text-muted-foreground">Submitted:</span>
            <strong>{submittedCount}</strong>
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              Search
            </Label>
            <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              Status
            </Label>
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
              pageLabel="Task Bucket"
            />
          </div>
        </div>
        {loading && <Loader />}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tasks && tasks.length > 0
            ? tasks.map((task, index) => (
                <Card
                  key={task._id || index}
                  className="h-full cursor-pointer"
                  onClick={() => navigate(`/task-bucket/${task._id}`)}
                >
                  <CardContent className="p-6">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          #
                          {(pagination?.currentPage - 1) * pageSize + index + 1}
                        </div>
                        <strong>{task.title || "–"}</strong>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="mb-2">
                      <div className="text-sm text-muted-foreground">
                        Product
                      </div>
                      <div>
                        {task.productInfo?.name || "–"}
                        {task.productInfo?.modelNumber && (
                          <small className="block text-muted-foreground">
                            {task.productInfo.modelNumber}
                          </small>
                        )}
                      </div>
                    </div>
                    <div className="mb-2 flex justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Target Rate
                        </div>
                        <div>
                          {task.targetRate != null
                            ? `₹${Number(task.targetRate).toLocaleString()}`
                            : "–"}
                        </div>
                      </div>
                      <div>
                        <div className="text-right text-sm text-muted-foreground">
                          Due Date
                        </div>
                        <div className="text-right">
                          {task.dueDate
                            ? dateFormatter(task.dueDate, "–")
                            : "–"}
                        </div>
                      </div>
                    </div>
                    {task.supplierInfo?.rate != null && (
                      <div className="mb-2">
                        <div className="text-sm text-muted-foreground">
                          Rate
                        </div>
                        <div>
                          ₹{Number(task.supplierInfo.rate).toLocaleString()}
                          {(task.supplierInfo.supplierName ||
                            task.supplierInfo.contactName ||
                            task.supplierInfo.contactPhone) && (
                            <small className="mt-1 block text-muted-foreground">
                              {task.supplierInfo.supplierName && (
                                <span className="block">
                                  {task.supplierInfo.supplierName}
                                </span>
                              )}
                              {task.supplierInfo.contactName && (
                                <span className="block">
                                  {task.supplierInfo.contactName}
                                </span>
                              )}
                              {task.supplierInfo.contactPhone && (
                                <span className="block">
                                  {task.supplierInfo.contactPhone}
                                </span>
                              )}
                            </small>
                          )}
                        </div>
                      </div>
                    )}
                    {task.supplierInfo?.remark && (
                      <div className="mb-2">
                        <div className="text-sm text-muted-foreground">
                          Remark
                        </div>
                        <div className="break-words">
                          {task.supplierInfo.remark}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/task-bucket/${task._id}/rate`);
                        }}
                      >
                        {task.supplierInfo?.rate != null
                          ? "Edit Rate"
                          : "Add Rate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            : !loading && (
                <div className="col-span-full py-4 text-center text-muted-foreground">
                  No tasks found in your bucket.
                </div>
              )}
        </div>
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={setPageNumber}
          disabled={loading}
          showRange
          totalItems={pagination.totalItems}
          itemsPerPage={pageSize}
          wrapperClassName="d-flex justify-content-between align-items-center mt-2"
        />
      </CardContent>
    </Card>
  );
};

export default TaskBucket;
