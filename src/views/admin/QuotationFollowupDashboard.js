import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  User,
  RefreshCw,
  X,
  History,
  MessageSquare,
  Bell,
  Clock,
  CheckCircle2,
  Lock,
  Timer,
  MapPin,
} from "lucide-react";
import { CChartDoughnut, CChartLine } from "@coreui/react-chartjs";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Progress,
} from "../../components/ui";
import quotationFollowupService from "../../services/quotationFollowupService";
import { toastError, toastSuccess } from "../../utils/toast";
import {
  Loader,
  TablePagination,
  FilterLockButton,
  StatCard,
} from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const OVERVIEW_CHART_COLORS = ["#f79009", "#12b76a", "#6f42c1", "#0ea5e9"];

const OVERVIEW_KPI_CARDS = [
  {
    title: "Total Follow-ups Due",
    value: "146",
    subtitle: "Across all active quotations",
    icon: Bell,
    color: "primary",
  },
  {
    title: "Pending",
    value: "58",
    subtitle: "Not yet followed up",
    icon: Clock,
    color: "warning",
  },
  {
    title: "Followed Up",
    value: "71",
    subtitle: "At least one follow-up logged",
    icon: CheckCircle2,
    color: "success",
  },
  {
    title: "Closed",
    value: "17",
    subtitle: "No further action needed",
    icon: Lock,
    color: "secondary",
  },
  {
    title: "Avg. Response Time",
    value: "1.8 days",
    subtitle: "From due date to follow-up",
    icon: Timer,
    color: "info",
  },
];

const OVERVIEW_STATUS_DOUGHNUT = {
  labels: ["Pending", "Followed up", "Closed", "Overdue"],
  datasets: [
    {
      backgroundColor: OVERVIEW_CHART_COLORS,
      data: [58, 71, 17, 22],
    },
  ],
};

const OVERVIEW_TREND_CHART = {
  labels: ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  datasets: [
    {
      label: "Follow-ups due",
      backgroundColor: "rgba(37,99,235,0.1)",
      borderColor: "#2563eb",
      pointBackgroundColor: "#2563eb",
      fill: true,
      tension: 0.35,
      data: [98, 104, 112, 121, 133, 146],
    },
    {
      label: "Follow-ups completed",
      backgroundColor: "rgba(18,183,106,0.08)",
      borderColor: "#12b76a",
      pointBackgroundColor: "#12b76a",
      fill: true,
      tension: 0.35,
      data: [72, 79, 84, 90, 96, 105],
    },
  ],
};

const OVERVIEW_ZONE_ROWS = [
  { zone: "Indore", pct: 68 },
  { zone: "Bengaluru", pct: 54 },
  { zone: "Mumbai", pct: 61 },
  { zone: "Delhi NCR", pct: 47 },
  { zone: "Pune", pct: 58 },
];

const QUOTATION_FOLLOWUP_FILTER_DEFAULTS = {
  quotationCode: "",
  companyName: "",
  followupStatus: "",
};

const resolveFollowupCount = (row) => {
  const count = Number(row?.followupCount) || 0;
  if (count > 0) return count;
  const historyLen = Array.isArray(row?.followupHistory)
    ? row.followupHistory.length
    : 0;
  if (historyLen > 0) return historyLen;
  return row?.followupStatus === "followed_up" ? 1 : 0;
};

const isOverdue = (followupDateStr, row) => {
  if (resolveFollowupCount(row) > 0) return false;
  if (row?.followupStatus === "closed") return false;
  if (!followupDateStr) return false;
  const due = new Date(followupDateStr);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
};

const followupStatusLabel = (row) => {
  const count = resolveFollowupCount(row);
  if (row?.followupStatus === "closed") return "Closed";
  if (count > 0) return `Followed up ${count}`;
  return "Pending";
};

const followupStatusVariant = (row) => {
  const count = resolveFollowupCount(row);
  if (row?.followupStatus === "closed") return "secondary";
  if (count > 0) return "success";
  return "warning";
};

const sortHistoryNewestFirst = (history = []) =>
  [...history].sort(
    (a, b) =>
      (Number(b.sequence) || 0) - (Number(a.sequence) || 0) ||
      new Date(b.followedUpAt || 0) - new Date(a.followedUpAt || 0),
  );

const DEBOUNCE_MS = 400;

const QuotationFollowupDashboard = () => {
  const location = useLocation();
  const isHodView = location.pathname === "/followup-dashboard";
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "quotation_followup",
    QUOTATION_FOLLOWUP_FILTER_DEFAULTS,
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [zoneSalesPersons, setZoneSalesPersons] = useState([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20,
  });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    quotationCode: initialValues.quotationCode,
    companyName: initialValues.companyName,
    followupStatus: initialValues.followupStatus,
  });
  const [debouncedFilters, setDebouncedFilters] = useState({
    quotationCode: initialValues.quotationCode,
    companyName: initialValues.companyName,
    followupStatus: initialValues.followupStatus,
  });
  const debounceTimer = useRef(null);

  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [submittingRemark, setSubmittingRemark] = useState(false);

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
    const empty = { quotationCode: "", companyName: "", followupStatus: "" };
    setFilters(empty);
    clearTimeout(debounceTimer.current);
    setDebouncedFilters(empty);
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  useFilterLockPersist("quotation_followup", filtersLocked, {
    quotationCode: filters.quotationCode,
    companyName: filters.companyName,
    followupStatus: filters.followupStatus,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      quotationCode: filters.quotationCode,
      companyName: filters.companyName,
      followupStatus: filters.followupStatus,
    });
  };

  const loadData = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        const params = { pageNumber, pageSize: 20 };
        if (debouncedFilters.quotationCode)
          params.quotationCode = debouncedFilters.quotationCode;
        if (debouncedFilters.companyName)
          params.companyName = debouncedFilters.companyName;
        if (debouncedFilters.followupStatus)
          params.followupStatus = debouncedFilters.followupStatus;
        if (!isHodView) params.includeZoneSalesPersons = true;

        const res = await quotationFollowupService.list(params);
        const payload = res?.data?.data ?? res?.data ?? res;

        setRows(payload?.items || []);
        setZoneSalesPersons(payload?.zoneSalesPersons || []);
        setOverdueCount(payload?.overdueCount || 0);
        setPagination(
          payload?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            pageSize: 20,
          },
        );
      } catch (err) {
        toastError(err?.message || "Failed to load quotation follow-ups");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [debouncedFilters, isHodView],
  );

  useEffect(() => {
    loadData(page);
  }, [page, loadData]);

  const openRemarkModal = (row) => {
    setSelectedRow(row);
    setRemarkText("");
    setRemarkModalOpen(true);
  };

  const closeRemarkModal = () => {
    setRemarkModalOpen(false);
    setSelectedRow(null);
    setRemarkText("");
  };

  const openHistoryModal = (row) => {
    setSelectedRow(row);
    setHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setHistoryModalOpen(false);
    setSelectedRow(null);
  };

  const submitRemark = async () => {
    if (!selectedRow?._id) return;
    const trimmed = remarkText.trim();
    if (!trimmed) {
      toastError("Please enter a remark");
      return;
    }
    setSubmittingRemark(true);
    try {
      await quotationFollowupService.updateRemark(selectedRow._id, trimmed);
      toastSuccess("Follow-up remark saved");
      closeRemarkModal();
      loadData(page);
    } catch (err) {
      toastError(err?.message || "Failed to save remark");
    } finally {
      setSubmittingRemark(false);
    }
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="relative">
      {loading && <Loader />}

      {isHodView && (
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              Follow-up Overview
            </h2>
            <Badge variant="outline">Sample overview</Badge>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {OVERVIEW_KPI_CARDS.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                color={card.color}
              />
            ))}
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Follow-up Trend</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[240px]">
                  <CChartLine
                    style={{ height: "240px" }}
                    data={OVERVIEW_TREND_CHART}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                      scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Status Split</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex h-[240px] items-center justify-center">
                  <CChartDoughnut
                    style={{ height: "240px" }}
                    data={OVERVIEW_STATUS_DOUGHNUT}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom" } },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Zone-wise Follow-up Completion</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {OVERVIEW_ZONE_ROWS.map((z) => (
                <div key={z.zone}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {z.zone}
                    </span>
                    <span className="font-semibold text-foreground">
                      {z.pct}%
                    </span>
                  </div>
                  <Progress
                    value={z.pct}
                    color={z.pct >= 55 ? "success" : "warning"}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {!isHodView && zoneSalesPersons.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Sales persons in your zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {zoneSalesPersons.map((person) => (
                <Badge key={person._id} variant="info" className="px-3 py-1">
                  {person.name}
                  {person.phone ? ` · ${person.phone}` : ""}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isHodView && overdueCount > 0 && (
        <div className="mb-3">
          <Badge variant="warning" className="px-3 py-1">
            {overdueCount} overdue follow-up{overdueCount !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>
            {isHodView ? "Follow-up Dashboard" : "Quotation Follow-up"}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadData(page)}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Quotation code</Label>
              <Input
                value={filters.quotationCode}
                placeholder="Search code"
                onChange={(e) =>
                  onFilterChange("quotationCode", e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={filters.companyName}
                placeholder="Search company"
                onChange={(e) => onFilterChange("companyName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up status</Label>
              <Select
                value={filters.followupStatus}
                onChange={(e) =>
                  onFilterChange("followupStatus", e.target.value)
                }
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="followed_up">Followed up</option>
                <option value="closed">Closed</option>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <FilterLockButton
                filtersLocked={filtersLocked}
                onToggle={handleToggleFiltersLock}
                pageLabel="Quotation Follow-up"
              />
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Sales person</TableHead>
                  <TableHead>Quotation status</TableHead>
                  <TableHead>Follow-up date</TableHead>
                  <TableHead>Follow-up status</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead>History</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-4 text-center">
                      No follow-ups found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const followupCount = resolveFollowupCount(row);
                    const overdue = isOverdue(row.followup_date, row);
                    const rowClassName =
                      isHodView && overdue ? "bg-warning-muted" : undefined;

                    return (
                      <TableRow key={row._id} className={rowClassName}>
                        <TableCell>
                          {row.quotationId ? (
                            <Link
                              to={`/quotations/${row.quotationId}`}
                              className="text-primary! hover:underline"
                            >
                              {row.quotationCode || "—"}
                            </Link>
                          ) : (
                            row.quotationCode || "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {row.companyName || row.industry_id?.name || "—"}
                        </TableCell>
                        <TableCell>{row.zoneId?.name || "—"}</TableCell>
                        <TableCell>
                          {row.salesEmployeeId?.name || "—"}
                        </TableCell>
                        <TableCell>{row.status || "—"}</TableCell>
                        <TableCell>
                          {dateFormatter(row.followup_date, "—")}
                          {overdue && (
                            <Badge variant="warning" className="ml-2">
                              Overdue
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={followupStatusVariant(row)}>
                            {followupStatusLabel(row)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          {row.remark || "—"}
                        </TableCell>
                        <TableCell>
                          {followupCount > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openHistoryModal(row)}
                            >
                              <History className="h-4 w-4" />
                              View ({followupCount})
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openRemarkModal(row)}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Remark
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            wrapperClassName="d-flex justify-content-center mt-4"
            align="center"
          />
        </CardContent>
      </Card>

      <Dialog
        open={remarkModalOpen}
        onOpenChange={(open) => {
          if (!open) closeRemarkModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Follow-up #{resolveFollowupCount(selectedRow || {}) + 1}
            </DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <>
              <p className="text-sm text-muted-foreground">
                Quotation: <strong>{selectedRow.quotationCode}</strong>
              </p>
              {selectedRow.remark ? (
                <p className="text-sm text-muted-foreground">
                  Latest remark: <em>{selectedRow.remark}</em>
                </p>
              ) : null}
            </>
          )}
          <Textarea
            rows={4}
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Enter remark for this follow-up"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeRemarkModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitRemark}
              disabled={submittingRemark}
            >
              {submittingRemark ? "Saving..." : "Save follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={historyModalOpen}
        onOpenChange={(open) => {
          if (!open) closeHistoryModal();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Follow-up history</DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <p className="text-sm text-muted-foreground">
              Quotation: <strong>{selectedRow.quotationCode}</strong>
              {selectedRow.companyName ? (
                <> · {selectedRow.companyName}</>
              ) : null}
            </p>
          )}
          {sortHistoryNewestFirst(selectedRow?.followupHistory || []).length ===
          0 ? (
            <p className="py-3 text-center text-muted-foreground">
              No follow-up history yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortHistoryNewestFirst(
                    selectedRow?.followupHistory || [],
                  ).map((entry) => (
                    <TableRow key={entry._id || entry.sequence}>
                      <TableCell>
                        <Badge variant="success">
                          Followed up {entry.sequence}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dateTimeFormatter(entry.followedUpAt, "—")}
                      </TableCell>
                      <TableCell>{entry.followedUpBy?.name || "—"}</TableCell>
                      <TableCell>{entry.remark || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeHistoryModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotationFollowupDashboard;
