import React, { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, Building2, RotateCw, X } from "lucide-react";
import poPaymentBacklogService from "../../services/poPaymentBacklogService";
import { toastError } from "../../utils/toast";
import { Loader, TablePagination } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import { dateFormatter } from "../../utils/dateFormatter";

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const isDueSoon = (dueDateStr) => {
  if (!dueDateStr) return false;
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
};

const isOverdue = (dueDateStr) => {
  if (!dueDateStr) return false;
  return new Date(dueDateStr) < new Date();
};

const getDueBadge = (dueDate, isSettled) => {
  if (isSettled) return { variant: "success", label: "Settled" };
  if (isOverdue(dueDate)) return { variant: "destructive", label: "Overdue" };
  if (isDueSoon(dueDate)) return { variant: "warning", label: "Due soon" };
  return { variant: "info", label: "Pending" };
};

const DEBOUNCE_MS = 400;

const HodPaymentBacklog = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20,
  });
  const [analytics, setAnalytics] = useState({
    totalPendingAmount: 0,
    totalCompaniesWithPending: 0,
  });
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    poNumber: "",
    salesPersonName: "",
    clientName: "",
    dateFrom: "",
    dateTo: "",
    is_settled: "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceTimer = useRef(null);

  const onFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedFilters(next);
      setPage(1);
    }, DEBOUNCE_MS);
  };

  const clearFilters = () => {
    const empty = {
      poNumber: "",
      salesPersonName: "",
      clientName: "",
      dateFrom: "",
      dateTo: "",
      is_settled: "",
    };
    setFilters(empty);
    clearTimeout(debounceTimer.current);
    setDebouncedFilters(empty);
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const loadData = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        const params = {
          pageNumber,
          pageSize: 20,
        };
        if (debouncedFilters.poNumber)
          params.poNumber = debouncedFilters.poNumber;
        if (debouncedFilters.salesPersonName)
          params.salesPersonName = debouncedFilters.salesPersonName;
        if (debouncedFilters.clientName)
          params.clientName = debouncedFilters.clientName;
        if (debouncedFilters.dateFrom)
          params.dateFrom = debouncedFilters.dateFrom;
        if (debouncedFilters.dateTo) params.dateTo = debouncedFilters.dateTo;
        if (debouncedFilters.is_settled !== "")
          params.is_settled = debouncedFilters.is_settled;

        const res = await poPaymentBacklogService.list(params);
        const payload = res?.data?.data ?? res?.data ?? res;

        setRows(payload?.items || []);
        setPagination(
          payload?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            pageSize: 20,
          },
        );
        if (payload?.analytics) {
          setAnalytics(payload.analytics);
        }
      } catch (err) {
        toastError(err?.message || "Failed to load payment backlog");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [debouncedFilters],
  );

  useEffect(() => {
    loadData(page);
  }, [page, loadData]);

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="relative">
      {loading && <Loader />}

      {/* Analytics Cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <Banknote className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Pending Amount
              </div>
              <div className="mt-1 text-lg font-bold text-destructive">
                {formatAmount(analytics.totalPendingAmount)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary!" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Companies with Pending
              </div>
              <div className="mt-1 text-lg font-bold text-primary!">
                {analytics.totalCompaniesWithPending}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="mb-1 text-lg font-semibold text-foreground">
                Payment Backlog
              </h4>
              <p className="mb-0 text-sm text-muted-foreground">
                All HOD-approved Sales Order payment obligations pending
                settlement.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => loadData(page)}
              disabled={loading}
              title="Refresh"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4">
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Sales Order Number</Label>
                <Input
                  placeholder="Search Sales Order number…"
                  value={filters.poNumber}
                  onChange={(e) => onFilterChange("poNumber", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Sales Person</Label>
                <Input
                  placeholder="Search sales person name…"
                  value={filters.salesPersonName}
                  onChange={(e) =>
                    onFilterChange("salesPersonName", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Client Name</Label>
                <Input
                  placeholder="Search client name…"
                  value={filters.clientName}
                  onChange={(e) => onFilterChange("clientName", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={filters.is_settled}
                  onChange={(e) => onFilterChange("is_settled", e.target.value)}
                >
                  <option value="">All</option>
                  <option value="false">Pending</option>
                  <option value="true">Settled</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onFilterChange("dateTo", e.target.value)}
                />
              </div>

              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : `${pagination.totalItems ?? 0} record${(pagination.totalItems ?? 0) !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales Order Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Sales Person</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-5 text-center text-muted-foreground"
                  >
                    No backlog entries found
                    {hasActiveFilters ? " for the current filters" : ""}.
                  </TableCell>
                </TableRow>
              )}
              {loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-5 text-center">
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" />
                      Loading…
                    </span>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => {
                const poCode =
                  row.po_snapshot?.poCode || row.po_snapshot?.po_number || "—";
                const clientName = row.clients_snapshot?.name || "—";
                const salesPerson = row.employeeId?.name || "—";
                const badge = getDueBadge(row.due_date, row.is_settled);

                return (
                  <TableRow key={row._id}>
                    <TableCell className="font-medium">{poCode}</TableCell>
                    <TableCell>
                      <div>{clientName}</div>
                      {row.clients_snapshot?.location && (
                        <div className="text-sm text-muted-foreground">
                          {row.clients_snapshot.location}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{salesPerson}</div>
                      {row.employeeId?.role && (
                        <div className="text-sm text-muted-foreground">
                          {String(row.employeeId.role).replace(/_/g, " ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatAmount(row.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dateFormatter(row.createdAt, "—")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          !row.is_settled && isOverdue(row.due_date)
                            ? "font-medium text-destructive"
                            : !row.is_settled && isDueSoon(row.due_date)
                              ? "font-medium text-warning!"
                              : ""
                        }
                      >
                        {dateFormatter(row.due_date, "—")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            wrapperClassName="flex justify-center mt-4"
            align="center"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default HodPaymentBacklog;
