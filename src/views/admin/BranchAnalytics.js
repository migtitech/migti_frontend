import React, { useEffect, useMemo, useState } from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Select,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import areaService from "../../services/areaService";
import branchAnalyticsService from "../../services/branchAnalyticsService";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const BRANCH_ANALYTICS_FILTER_DEFAULTS = {
  zoneId: "",
  period: "all",
  dateFrom: "",
  dateTo: "",
};

const TAB_KEYS = {
  queries: "queries",
  quotations: "quotations",
  po: "po",
  billing: "billing",
};

const PERIOD_OPTIONS = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const extractListFromResponse = (response, keys = []) => {
  const data = response?.data || response;
  const nested = data?.data ?? data;
  for (const key of keys) {
    if (Array.isArray(nested?.[key])) return nested[key];
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(nested)) return nested;
  if (Array.isArray(data)) return data;
  return [];
};

const getPeriodRange = (period) => {
  if (!period || period === "all") return { from: "", to: "" };
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(todayEnd);

  if (period === "daily") {
    start = new Date(todayEnd);
  } else if (period === "weekly") {
    start.setDate(todayEnd.getDate() - 6);
  } else if (period === "monthly") {
    start = new Date(todayEnd.getFullYear(), todayEnd.getMonth(), 1);
  } else if (period === "yearly") {
    start = new Date(todayEnd.getFullYear(), 0, 1);
  }

  const toInputDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return { from: toInputDate(start), to: toInputDate(todayEnd) };
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const BranchAnalytics = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "branch_analytics",
    BRANCH_ANALYTICS_FILTER_DEFAULTS,
  );
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [zones, setZones] = useState([]);
  const [metrics, setMetrics] = useState({
    totalQueries: 0,
    totalQuotation: 0,
    quotedAmount: 0,
    totalPo: 0,
    poAmount: 0,
    totalBilling: 0,
    billingAmount: 0,
  });
  const [tableRows, setTableRows] = useState([]);
  const [tablePagination, setTablePagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [selectedZoneId, setSelectedZoneId] = useState(initialValues.zoneId);
  const [period, setPeriod] = useState(initialValues.period);
  const [dateFrom, setDateFrom] = useState(initialValues.dateFrom);
  const [dateTo, setDateTo] = useState(initialValues.dateTo);

  const [activeTab, setActiveTab] = useState(TAB_KEYS.queries);
  const [tabPages, setTabPages] = useState({
    [TAB_KEYS.queries]: 1,
    [TAB_KEYS.quotations]: 1,
    [TAB_KEYS.po]: 1,
    [TAB_KEYS.billing]: 1,
  });
  const pageSize = 10;

  useEffect(() => {
    const load = async () => {
      setLoadingFilters(true);
      try {
        const [zonesRes] = await Promise.all([
          areaService.getAll({ pageNumber: 1, pageSize: 100 }),
        ]);
        const zoneData = zonesRes?.data?.data || zonesRes?.data || zonesRes;
        const zoneList = (zoneData?.areas || zoneData || []).map((zone) => ({
          id: zone._id || zone.id,
          name: zone.name || zone._id || zone.id,
        }));

        setZones(zoneList);
      } catch (err) {
        toastError(err?.message || "Failed to load branch analytics data");
      } finally {
        setLoadingFilters(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const nextRange = getPeriodRange(period);
    setDateFrom(nextRange.from);
    setDateTo(nextRange.to);
  }, [period]);

  const zoneOptions = useMemo(() => zones, [zones]);

  useEffect(() => {
    if (!selectedZoneId) return;
    const zoneStillValid = zoneOptions.some(
      (zone) => String(zone.id) === String(selectedZoneId),
    );
    if (!zoneStillValid) setSelectedZoneId("");
  }, [selectedZoneId, zoneOptions]);

  const currentRows = tableRows || [];
  const currentPage = tabPages[activeTab] || 1;
  const totalPages = tablePagination?.totalPages || 1;
  const safePage = tablePagination?.currentPage || currentPage;
  const summaryCards = useMemo(
    () => [
      {
        label: "Total Queries",
        value: metrics.totalQueries || 0,
        className: "bg-primary! text-white",
      },
      {
        label: "Total Quotations",
        value: metrics.totalQuotation || 0,
        className: "bg-info text-white",
      },
      {
        label: "Quoted Amount",
        value: formatAmount(metrics.quotedAmount || 0),
        className: "bg-warning! text-dark",
      },
      {
        label: "Total Sales Order",
        value: metrics.totalPo || 0,
        className: "bg-success! text-success-foreground",
      },
      {
        label: "Sales Order Amount",
        value: formatAmount(metrics.poAmount || 0),
        className: "bg-destructive text-destructive-foreground",
      },
      {
        label: "Total Billing",
        value: metrics.totalBilling || 0,
        className: "bg-secondary! text-white",
      },
      {
        label: "Billing Amount",
        value: formatAmount(metrics.billingAmount || 0),
        className: "bg-dark text-white",
      },
    ],
    [metrics],
  );

  const volumeChartData = useMemo(
    () => ({
      labels: ["Queries", "Quotations", "Sales Order", "Billing"],
      datasets: [
        {
          label: "Count",
          backgroundColor: ["#321fdb", "#39f", "#2eb85c", "#f9b115"],
          borderColor: ["#321fdb", "#39f", "#2eb85c", "#f9b115"],
          borderWidth: 1,
          borderRadius: 8,
          data: [
            Number(metrics.totalQueries || 0),
            Number(metrics.totalQuotation || 0),
            Number(metrics.totalPo || 0),
            Number(metrics.totalBilling || 0),
          ],
        },
      ],
    }),
    [metrics],
  );

  const amountChartData = useMemo(
    () => ({
      labels: ["Quoted", "Sales Order", "Billing"],
      datasets: [
        {
          backgroundColor: ["#8a93ff", "#2eb85c", "#f9b115"],
          data: [
            Number(metrics.quotedAmount || 0),
            Number(metrics.poAmount || 0),
            Number(metrics.billingAmount || 0),
          ],
        },
      ],
    }),
    [metrics],
  );

  useEffect(() => {
    setTabPages({
      [TAB_KEYS.queries]: 1,
      [TAB_KEYS.quotations]: 1,
      [TAB_KEYS.po]: 1,
      [TAB_KEYS.billing]: 1,
    });
  }, [selectedZoneId, period, dateFrom, dateTo]);

  useFilterLockPersist("branch_analytics", filtersLocked, {
    zoneId: selectedZoneId,
    period,
    dateFrom,
    dateTo,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      zoneId: selectedZoneId,
      period,
      dateFrom,
      dateTo,
    });
  };

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoadingData(true);
      try {
        const response = await branchAnalyticsService.getData({
          zoneId: selectedZoneId || undefined,
          period: period || "all",
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          tab: activeTab,
          pageNumber: tabPages[activeTab] || 1,
          pageSize,
        });
        const data = response?.data?.data || response?.data || {};
        setMetrics(data?.metrics || {});
        setTableRows(data?.table?.rows || []);
        setTablePagination(
          data?.table?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: pageSize,
          },
        );
      } catch (err) {
        setTableRows([]);
        setTablePagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: pageSize,
        });
        toastError(err?.message || "Failed to load analytics data");
      } finally {
        setLoadingData(false);
      }
    };

    loadAnalytics();
  }, [selectedZoneId, period, dateFrom, dateTo, activeTab, tabPages, pageSize]);

  const setPageForActiveTab = (nextPage) => {
    setTabPages((prev) => ({ ...prev, [activeTab]: nextPage }));
  };

  return (
    <div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Branch Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 grid grid-cols-1 items-end gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <Label className="mb-1 block text-xs text-muted-foreground">
                Zone
              </Label>
              <Select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
              >
                <option value="">All zones</option>
                {zoneOptions.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label className="mb-1 block text-xs text-muted-foreground">
                Period
              </Label>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label className="mb-1 block text-xs text-muted-foreground">
                From
              </Label>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="mb-1 block text-xs text-muted-foreground">
                To
              </Label>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end md:col-span-3">
              <FilterLockButton
                filtersLocked={filtersLocked}
                onToggle={handleToggleFiltersLock}
                pageLabel="Branch Analytics"
              />
            </div>
          </div>

          {loadingFilters || loadingData ? (
            <div className="py-5 text-center">
              <Loader message="Loading analytics..." />
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                {summaryCards.map((item) => (
                  <Card
                    className={item.className}
                    style={{ border: "none" }}
                    key={item.label}
                  >
                    <CardContent className="p-4">
                      <div className="text-sm opacity-75 flex justify-between items-center">
                        {item.label}
                        <Badge
                          variant={
                            item.className.includes("text-white")
                              ? "secondary"
                              : "outline"
                          }
                        >
                          Live
                        </Badge>
                      </div>
                      <div className="fs-5 fw-semibold">{item.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Card className="h-100 shadow-sm md:col-span-2">
                  <CardHeader>
                    <CardTitle>Volume Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CChartBar
                      data={volumeChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { beginAtZero: true, ticks: { precision: 0 } },
                        },
                      }}
                    />
                  </CardContent>
                </Card>
                <Card className="h-100 shadow-sm">
                  <CardHeader>
                    <CardTitle>Amount Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CChartDoughnut
                      data={amountChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: "bottom" } },
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mb-3"
              >
                <TabsList>
                  <TabsTrigger value={TAB_KEYS.queries}>Queries</TabsTrigger>
                  <TabsTrigger value={TAB_KEYS.quotations}>
                    Quotations
                  </TabsTrigger>
                  <TabsTrigger value={TAB_KEYS.po}>Sales Order</TabsTrigger>
                  <TabsTrigger value={TAB_KEYS.billing}>Billing</TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === TAB_KEYS.queries && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Query Code</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRows.length > 0 ? (
                      currentRows.map((item, index) => (
                        <TableRow key={item._id || item.id || `${index}`}>
                          <TableCell>
                            {(safePage - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>{item.queryCode || "-"}</TableCell>
                          <TableCell>{item.companyInfo?.name || "-"}</TableCell>
                          <TableCell>{item.status || "-"}</TableCell>
                          <TableCell>
                            {dateFormatter(item.createdAt, "-")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No query data found for selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {activeTab === TAB_KEYS.quotations && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Quotation No.</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRows.length > 0 ? (
                      currentRows.map((item, index) => (
                        <TableRow key={item._id || item.id || `${index}`}>
                          <TableCell>
                            {(safePage - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>{item.quotationCode || "-"}</TableCell>
                          <TableCell>{item.companyInfo?.name || "-"}</TableCell>
                          <TableCell>
                            {formatAmount(item.totalAmount)}
                          </TableCell>
                          <TableCell>{item.status || "-"}</TableCell>
                          <TableCell>
                            {dateFormatter(item.createdAt, "-")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No quotation data found for selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {activeTab === TAB_KEYS.po && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRows.length > 0 ? (
                      currentRows.map((item, index) => (
                        <TableRow key={item._id || `${index}`}>
                          <TableCell>
                            {(safePage - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>{item.companyName || "-"}</TableCell>
                          <TableCell>{item.salespersonName || "-"}</TableCell>
                          <TableCell>{formatAmount(item.amount)}</TableCell>
                          <TableCell>
                            {dateFormatter(item.entryDate, "-")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No Sales Order data found for selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {activeTab === TAB_KEYS.billing && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRows.length > 0 ? (
                      currentRows.map((item, index) => (
                        <TableRow key={item._id || `${index}`}>
                          <TableCell>
                            {(safePage - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>{item.companyName || "-"}</TableCell>
                          <TableCell>{item.salespersonName || "-"}</TableCell>
                          <TableCell>{formatAmount(item.amount)}</TableCell>
                          <TableCell>
                            {dateFormatter(item.entryDate, "-")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No billing data found for selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              <TablePagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setPageForActiveTab}
                showRange
                totalItems={tablePagination?.totalItems ?? 0}
                itemsPerPage={tablePagination?.itemsPerPage ?? 10}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchAnalytics;
