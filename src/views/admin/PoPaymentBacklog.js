import React, { useCallback, useEffect, useState } from "react";
import { Clock, IndianRupee, CheckCircle2, User } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  Label,
  Select,
  Spinner,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { FULL_ACCESS_ROLES, ROLE_LABELS } from "../../context/AuthContext";
import poPaymentBacklogService from "../../services/poPaymentBacklogService";
import employeeService from "../../services/employeeService";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";
import { FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";

const PO_PAYMENT_FILTER_DEFAULTS = { employeeId: "" };

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const isOverdue = (due_date) => {
  if (!due_date) return false;
  return new Date(due_date) < new Date();
};

const unwrap = (res) => {
  if (res?.data && typeof res.data === "object") return res.data;
  return res || {};
};

const PoPaymentBacklog = () => {
  const { user } = useAuth();
  const isAdmin = FULL_ACCESS_ROLES.includes(
    String(user?.role || "")
      .trim()
      .toLowerCase(),
  );

  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "po_payment_backlog",
    PO_PAYMENT_FILTER_DEFAULTS,
  );

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState(
    initialValues.employeeId,
  );

  const loadEmployees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await employeeService.getAll({ pageSize: 100 });
      const payload = unwrap(res);
      const data = payload?.data || payload;
      setEmployees(data?.employees || data?.items || []);
    } catch {
      // non-critical
    }
  }, [isAdmin]);

  const loadBacklog = useCallback(
    async (empId) => {
      setLoading(true);
      try {
        const res = await poPaymentBacklogService.list({
          employeeId: empId || (!isAdmin ? user?._id || user?.id : undefined),
          is_settled: false,
          pageSize: 100,
        });
        const payload = unwrap(res);
        const data = payload?.data || payload;
        setItems(data?.items || []);
        setSummary(data?.summary || { totalCount: 0, totalAmount: 0 });
      } catch (err) {
        toastError(err?.message || "Failed to load payment backlog");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, user],
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadBacklog(employeeFilter);
  }, [employeeFilter, loadBacklog]);

  useFilterLockPersist("po_payment_backlog", filtersLocked, {
    employeeId: employeeFilter,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ employeeId: employeeFilter });
  };

  const handleSettle = async (backlogId) => {
    if (settling) return;
    setSettling(backlogId);
    try {
      await poPaymentBacklogService.settle(backlogId);
      toastSuccess("Payment backlog entry marked as settled");
      loadBacklog(employeeFilter);
    } catch (err) {
      toastError(err?.message || "Failed to settle entry");
    } finally {
      setSettling(null);
    }
  };

  const displayedEmployeeName = (item) => {
    const emp = item?.employeeId;
    if (!emp) return "—";
    if (typeof emp === "object") return emp.name || emp.email || "—";
    return String(emp);
  };

  const companyName = (item) => {
    const cs = item?.clients_snapshot;
    if (cs?.name) return cs.name;
    const snap = item?.po_snapshot;
    return snap?.companyInfo?.name || "—";
  };

  return (
    <div>
      <div className="mb-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="mb-1 text-xl font-semibold text-foreground">
              Pending Payments
            </h4>
            <p className="mb-0 text-sm text-muted-foreground">
              Payment backlog created on HOD approval of sales orders
            </p>
          </div>
          {isAdmin && employees.length > 0 && (
            <div className="flex items-end gap-2">
              <div style={{ minWidth: 220 }}>
                <Label className="mb-1 text-sm text-muted-foreground">
                  Filter by employee
                </Label>
                <Select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <option value="">All employees</option>
                  {employees.map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>
                      {e.name || e.email || String(e._id || e.id)}
                    </option>
                  ))}
                </Select>
              </div>
              <FilterLockButton
                filtersLocked={filtersLocked}
                onToggle={handleToggleFiltersLock}
                pageLabel="Pending Payments"
              />
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Card className="h-full">
            <CardContent className="flex items-center gap-3 p-6">
              <div
                className="flex items-center justify-center rounded-full bg-warning-muted"
                style={{ width: 48, height: 48, flexShrink: 0 }}
              >
                <Clock className="h-5 w-5 text-warning!" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Sales Order Payments Pending
                </div>
                <div className="text-2xl font-bold">
                  {loading ? <Spinner size="sm" /> : summary.totalCount}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardContent className="flex items-center gap-3 p-6">
              <div
                className="flex items-center justify-center rounded-full bg-destructive/10"
                style={{ width: 48, height: 48, flexShrink: 0 }}
              >
                <IndianRupee className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Pending Amount
                </div>
                <div className="text-2xl font-bold text-destructive">
                  {loading ? (
                    <Spinner size="sm" />
                  ) : (
                    formatAmount(summary.totalAmount)
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backlog cards */}
        {loading ? (
          <div className="flex justify-center py-5">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-5 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-success!" />
              <div className="mb-1 text-xl font-semibold">All caught up!</div>
              <div className="text-sm">No pending payment backlog entries.</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const id = item._id || item.id;
              const overdue = isOverdue(item.due_date);
              const poCode = item?.po_snapshot?.poCode || "—";
              return (
                <Card
                  key={id}
                  className={`h-full border-l-4 ${overdue ? "border-l-destructive" : "border-l-warning"}`}
                >
                  <CardContent className="p-6">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div
                          className="truncate text-base font-semibold"
                          style={{ maxWidth: 180 }}
                        >
                          {companyName(item)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {poCode}
                        </div>
                      </div>
                      {overdue ? (
                        <Badge variant="destructive" className="ml-2 shrink-0">
                          Overdue
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="ml-2 shrink-0">
                          Pending
                        </Badge>
                      )}
                    </div>

                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xl font-bold text-destructive">
                        {formatAmount(item.amount)}
                      </span>
                    </div>

                    <div className="mb-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Due:{" "}
                          <strong className={overdue ? "text-destructive" : ""}>
                            {dateFormatter(item.due_date, "—")}
                          </strong>
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{displayedEmployeeName(item)}</span>
                        </div>
                      )}
                      {item?.clients_snapshot?.location && (
                        <div className="text-sm text-muted-foreground">
                          {item.clients_snapshot.location}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoPaymentBacklog;
