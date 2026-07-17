import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Spinner,
  Progress,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
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
import branchService from "../../services/branchService";
import areaService from "../../services/areaService";
import employeeService from "../../services/employeeService";
import targetAnalyticsService from "../../services/targetAnalyticsService";
import { Loader, PageHeader, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { toastError, toastSuccess } from "../../utils/toast";
import usePermissions from "../../hooks/usePermissions";
import { dateFormatter } from "../../utils/dateFormatter";

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const TABLE_TAB = { active: "active", history: "history" };
const VIEW_TAB = { branch: "branch", zone: "zone", employee: "employee" };

const TARGET_ANALYTICS_FILTER_DEFAULTS = {
  period: "weekly",
  branchId: "",
  zoneId: "",
  employeeId: "",
};

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
const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};
const getEmployeePrimaryZoneId = (employee) => {
  if (Array.isArray(employee?.zoneIds) && employee.zoneIds.length)
    return normalizeId(employee.zoneIds[0]);
  return normalizeId(employee?.zoneId);
};
const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));
const getPeriodRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);
  if (period === "weekly") start.setDate(today.getDate() - 6);
  else {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).getDate();
    end = new Date(
      today.getFullYear(),
      today.getMonth(),
      Math.min(30, lastDay),
    );
  }
  const toInput = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toInput(start), to: toInput(end) };
};
const getProgressMeta = (targetAmount, achievedAmount) => {
  const target = Number(targetAmount || 0);
  const achieved = Number(achievedAmount || 0);
  if (target <= 0)
    return { actualPercent: 0, displayPercent: 0, color: "danger" };
  const actualPercent = (achieved / target) * 100;
  const displayPercent = clamp(actualPercent);
  if (actualPercent < 50)
    return { actualPercent, displayPercent, color: "danger" };
  if (actualPercent < 80)
    return { actualPercent, displayPercent, color: "warning" };
  return { actualPercent, displayPercent, color: "success" };
};

const progressColorMap = {
  danger: "destructive",
  warning: "warning",
  success: "success",
};

const decodeTokenPayload = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded));
  } catch (_err) {
    return null;
  }
};

const TargetAnalytics = () => {
  const { canCreate } = usePermissions();
  const canCreateTargetAnalytics = canCreate("target_analytics");
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "target_analytics",
    TARGET_ANALYTICS_FILTER_DEFAULTS,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewTab, setViewTab] = useState(VIEW_TAB.branch);
  const [tableTab, setTableTab] = useState(TABLE_TAB.active);
  const [summaryPeriod, setSummaryPeriod] = useState(initialValues.period);
  const [summaryBranchId, setSummaryBranchId] = useState(
    initialValues.branchId,
  );
  const [summaryZoneId, setSummaryZoneId] = useState(initialValues.zoneId);
  const [summaryEmployeeId, setSummaryEmployeeId] = useState(
    initialValues.employeeId,
  );
  const [summary, setSummary] = useState({
    targetAmount: 0,
    achievedAmount: 0,
    remainingAmount: 0,
  });
  const [activeTargets, setActiveTargets] = useState([]);
  const [historyTargets, setHistoryTargets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [zones, setZones] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isHod, setIsHod] = useState(false);
  const [isSalesRole, setIsSalesRole] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState("");

  const [formBranchId, setFormBranchId] = useState("");
  const [formZoneId, setFormZoneId] = useState("");
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formPeriod, setFormPeriod] = useState("weekly");
  const [formDateFrom, setFormDateFrom] = useState("");
  const [formDateTo, setFormDateTo] = useState("");
  const [formTargetAmount, setFormTargetAmount] = useState("");

  const progressMeta = useMemo(
    () => getProgressMeta(summary.targetAmount, summary.achievedAmount),
    [summary],
  );

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const payload = decodeTokenPayload(token);
    const tokenRole = String(payload?.role || "").toLowerCase();
    const tokenEmployeeId = String(payload?.id || "");
    const tokenBranchId =
      typeof payload?.branchId === "object"
        ? payload?.branchId?._id || payload?.branchId?.id
        : payload?.branchId;

    const userRaw = localStorage.getItem("migticrm_user");
    const user = userRaw ? JSON.parse(userRaw) : {};
    const fallbackRole = String(user?.role || "").toLowerCase();
    const role = tokenRole || fallbackRole;
    const hodMode = role === "head_of_department";
    const salesMode = role.includes("sales");
    setIsHod(hodMode);
    setIsSalesRole(salesMode);
    if (tokenEmployeeId) setCurrentEmployeeId(tokenEmployeeId);
    if (hodMode && (tokenBranchId || user?.branchId)) {
      const fallbackBranchId =
        typeof user.branchId === "object"
          ? user.branchId._id || user.branchId.id
          : user.branchId;
      const branchId = tokenBranchId || fallbackBranchId;
      setSummaryBranchId(String(branchId || ""));
      setFormBranchId(String(branchId || ""));
    }
    if (salesMode && (tokenBranchId || user?.branchId)) {
      const fallbackBranchId =
        typeof user.branchId === "object"
          ? user.branchId._id || user.branchId.id
          : user.branchId;
      const branchId = tokenBranchId || fallbackBranchId;
      setSummaryBranchId(String(branchId || ""));
      setFormBranchId(String(branchId || ""));
      setViewTab(VIEW_TAB.employee);
    }
  }, []);

  useEffect(() => {
    const range = getPeriodRange(formPeriod);
    setFormDateFrom(range.from);
    setFormDateTo(range.to);
  }, [formPeriod]);

  const loadMasterData = async () => {
    const [branchesRes, zonesRes, employeesRes] = await Promise.all([
      branchService.getAll({ pageNumber: 1, pageSize: 100 }),
      areaService.getAll({ pageNumber: 1, pageSize: 100 }),
      employeeService.getAll({ pageNumber: 1, pageSize: 100 }),
    ]);
    const branchList = extractListFromResponse(branchesRes, ["branches"]).map(
      (b) => ({ ...b, id: b._id || b.id }),
    );
    const zoneData = zonesRes?.data?.data || zonesRes?.data || zonesRes;
    const zoneList = (zoneData?.areas || zoneData || []).map((z) => ({
      ...z,
      id: z._id || z.id,
    }));
    const empList = extractListFromResponse(employeesRes, ["employees"]).map(
      (e) => ({ ...e, id: e._id || e.id }),
    );
    setBranches(branchList);
    setZones(zoneList);
    setEmployees(empList);
    const preferredBranchId =
      summaryBranchId || (branchList[0]?.id ? String(branchList[0].id) : "");
    if (preferredBranchId) {
      setSummaryBranchId(preferredBranchId);
      setFormBranchId(preferredBranchId);
    }
  };

  const loadTargetLists = async () => {
    const branchId = summaryBranchId || undefined;
    if (viewTab === VIEW_TAB.branch) {
      const res = await targetAnalyticsService.getData({
        branchId,
        period: summaryPeriod,
      });
      const data = res?.data?.data || res?.data || {};
      setActiveTargets(data.activeTargets || []);
      setHistoryTargets(data.history || []);
      return;
    }
    if (viewTab === VIEW_TAB.zone) {
      const res = await targetAnalyticsService.getZoneData({
        branchId,
        zoneId: summaryZoneId || undefined,
        period: summaryPeriod,
      });
      const data = res?.data?.data || res?.data || {};
      setActiveTargets(data.activeTargets || []);
      setHistoryTargets(data.history || []);
      return;
    }
    const res = await targetAnalyticsService.getEmployeeData({
      branchId,
      employeeId: summaryEmployeeId || undefined,
      period: summaryPeriod,
    });
    const data = res?.data?.data || res?.data || {};
    setActiveTargets(data.activeTargets || []);
    setHistoryTargets(data.history || []);
  };

  const loadSummary = async () => {
    if (!summaryBranchId) return;
    let data = {};
    if (viewTab === VIEW_TAB.branch) {
      const res = await targetAnalyticsService.getSummary({
        branchId: summaryBranchId,
        period: summaryPeriod,
      });
      data = res?.data?.data || res?.data || {};
    } else if (viewTab === VIEW_TAB.zone) {
      if (!summaryZoneId) return;
      const res = await targetAnalyticsService.getZoneSummary({
        branchId: summaryBranchId,
        zoneId: summaryZoneId,
        period: summaryPeriod,
      });
      data = res?.data?.data || res?.data || {};
    } else {
      if (!summaryEmployeeId) return;
      const res = await targetAnalyticsService.getEmployeeSummary({
        branchId: summaryBranchId,
        employeeId: summaryEmployeeId,
        period: summaryPeriod,
      });
      data = res?.data?.data || res?.data || {};
    }
    setSummary({
      targetAmount: Number(data.targetAmount || 0),
      achievedAmount: Number(data.achievedAmount || 0),
      remainingAmount: Number(data.remainingAmount || 0),
    });
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await loadMasterData();
    } catch (err) {
      toastError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);
  useEffect(() => {
    loadTargetLists();
    loadSummary();
  }, [
    viewTab,
    summaryBranchId,
    summaryZoneId,
    summaryEmployeeId,
    summaryPeriod,
  ]);

  const zoneOptions = useMemo(() => zones, [zones]);
  const employeeOptions = useMemo(() => employees, [employees]);

  useEffect(() => {
    if (!isSalesRole || !employees.length) return;
    const self =
      employees.find((e) => String(e.id) === String(currentEmployeeId)) ||
      employees.find((e) => String(e._id) === String(currentEmployeeId));
    if (!self) return;
    const zoneId = getEmployeePrimaryZoneId(self);
    setSummaryEmployeeId(String(self.id || self._id || ""));
    setFormEmployeeId(String(self.id || self._id || ""));
    setSummaryZoneId(zoneId);
    setFormZoneId(zoneId);
  }, [isSalesRole, employees, currentEmployeeId]);

  const openAddTargetSidebar = () => {
    const range = getPeriodRange("weekly");
    setFormPeriod("weekly");
    setFormDateFrom(range.from);
    setFormDateTo(range.to);
    setFormTargetAmount("");
    setFormBranchId(summaryBranchId || formBranchId);
    setFormZoneId(summaryZoneId || "");
    setFormEmployeeId(summaryEmployeeId || "");
    setIsSidebarOpen(true);
  };

  useFilterLockPersist("target_analytics", filtersLocked, {
    period: summaryPeriod,
    branchId: summaryBranchId,
    zoneId: summaryZoneId,
    employeeId: summaryEmployeeId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      period: summaryPeriod,
      branchId: summaryBranchId,
      zoneId: summaryZoneId,
      employeeId: summaryEmployeeId,
    });
  };

  const onSave = async () => {
    const effectiveBranchId = formBranchId || summaryBranchId;
    if (!effectiveBranchId) return toastError("Unable to determine branch");
    if (!formDateFrom || !formDateTo)
      return toastError("Please select date range");
    if (formTargetAmount === "" || Number(formTargetAmount) < 0)
      return toastError("Enter valid target amount");
    setSaving(true);
    try {
      if (viewTab === VIEW_TAB.branch) {
        await targetAnalyticsService.upsertTarget({
          branchId: effectiveBranchId,
          period: formPeriod,
          dateFrom: formDateFrom,
          dateTo: formDateTo,
          targetAmount: Number(formTargetAmount),
        });
      } else if (viewTab === VIEW_TAB.zone) {
        if (!formZoneId) throw new Error("Please select zone");
        await targetAnalyticsService.upsertZoneTarget({
          branchId: effectiveBranchId,
          zoneId: formZoneId,
          period: formPeriod,
          dateFrom: formDateFrom,
          dateTo: formDateTo,
          targetAmount: Number(formTargetAmount),
        });
      } else {
        if (!formEmployeeId) throw new Error("Please select employee");
        const emp = employees.find(
          (e) => String(e.id) === String(formEmployeeId),
        );
        await targetAnalyticsService.upsertEmployeeTarget({
          branchId: effectiveBranchId,
          zoneId: getEmployeePrimaryZoneId(emp) || null,
          employeeId: formEmployeeId,
          period: formPeriod,
          dateFrom: formDateFrom,
          dateTo: formDateTo,
          targetAmount: Number(formTargetAmount),
        });
      }
      toastSuccess("Target updated successfully");
      setIsSidebarOpen(false);
      await loadTargetLists();
      await loadSummary();
    } catch (err) {
      toastError(err?.message || "Failed to save target");
    } finally {
      setSaving(false);
    }
  };

  const getPrimaryLabel = () =>
    viewTab === VIEW_TAB.branch
      ? "Branch"
      : viewTab === VIEW_TAB.zone
        ? "Zone"
        : "Employee";
  const getPrimaryValue = (row) => {
    if (viewTab === VIEW_TAB.branch)
      return row?.branchId?.name || row?.branchId?.branchcode || "-";
    if (viewTab === VIEW_TAB.zone) return row?.zoneId?.name || "-";
    return row?.employeeId?.name || "-";
  };

  return (
    <div>
      <PageHeader
        title="Target Analytics"
        actions={
          canCreateTargetAnalytics ? (
            <Button type="button" onClick={openAddTargetSidebar}>
              Add Target
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="py-10 text-center">
              <Loader message="Loading target analytics..." />
            </div>
          ) : (
            <>
              <Tabs value={viewTab} onValueChange={setViewTab} className="mb-4">
                <TabsList>
                  {!isSalesRole && (
                    <TabsTrigger value={VIEW_TAB.branch}>Branch</TabsTrigger>
                  )}
                  <TabsTrigger value={VIEW_TAB.zone}>Zone</TabsTrigger>
                  <TabsTrigger value={VIEW_TAB.employee}>Employee</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {viewTab === VIEW_TAB.zone && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Zone
                    </Label>
                    <Select
                      value={summaryZoneId}
                      disabled={isSalesRole}
                      onChange={(e) => setSummaryZoneId(e.target.value)}
                    >
                      <option value="">Select zone</option>
                      {zoneOptions.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name || z.id}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                {viewTab === VIEW_TAB.employee && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Employee
                    </Label>
                    <Select
                      value={summaryEmployeeId}
                      disabled={isSalesRole}
                      onChange={(e) => setSummaryEmployeeId(e.target.value)}
                    >
                      <option value="">Select employee</option>
                      {employeeOptions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name || e.email || e.id}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Period
                  </Label>
                  <Select
                    value={summaryPeriod}
                    onChange={(e) => setSummaryPeriod(e.target.value)}
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="Target Analytics"
                  />
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">Target</div>
                    <div className="mt-1 text-xl font-semibold">
                      {formatAmount(summary.targetAmount)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">
                      Achieved
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {formatAmount(summary.achievedAmount)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">
                      Remaining
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {formatAmount(summary.remainingAmount)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-4">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Target Achievement Progress
                    </div>
                    <div className="font-semibold">
                      {Number(progressMeta.actualPercent || 0).toFixed(1)}%
                    </div>
                  </div>
                  <Progress
                    value={progressMeta.displayPercent}
                    color={progressColorMap[progressMeta.color] || "primary"}
                    className="h-3.5"
                  />
                </CardContent>
              </Card>

              <Tabs
                value={tableTab}
                onValueChange={setTableTab}
                className="mb-4"
              >
                <TabsList>
                  <TabsTrigger value={TABLE_TAB.active}>
                    Active Targets
                  </TabsTrigger>
                  <TabsTrigger value={TABLE_TAB.history}>
                    History Targets
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{getPrimaryLabel()}</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Target</TableHead>
                    {tableTab === TABLE_TAB.history && (
                      <TableHead>Billing</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tableTab === TABLE_TAB.active
                    ? activeTargets
                    : historyTargets
                  ).length ? (
                    (tableTab === TABLE_TAB.active
                      ? activeTargets
                      : historyTargets
                    ).map((row) => (
                      <TableRow key={row._id}>
                        <TableCell>{getPrimaryValue(row)}</TableCell>
                        <TableCell>{row.period || "-"}</TableCell>
                        <TableCell>
                          {dateFormatter(row.dateFrom, "-")}
                        </TableCell>
                        <TableCell>{dateFormatter(row.dateTo, "-")}</TableCell>
                        <TableCell>{formatAmount(row.targetAmount)}</TableCell>
                        {tableTab === TABLE_TAB.history && (
                          <TableCell>
                            {formatAmount(row.actualBillingAmount)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={tableTab === TABLE_TAB.history ? 6 : 5}
                        className="text-center"
                      >
                        No data found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {canCreateTargetAnalytics ? (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>
                Add{" "}
                {viewTab === VIEW_TAB.branch
                  ? "Branch"
                  : viewTab === VIEW_TAB.zone
                    ? "Zone"
                    : "Employee"}{" "}
                Target
              </SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-4">
              {viewTab === VIEW_TAB.zone && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Zone</Label>
                  <Select
                    value={formZoneId}
                    disabled={isSalesRole}
                    onChange={(e) => setFormZoneId(e.target.value)}
                  >
                    <option value="">Select zone</option>
                    {zoneOptions.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name || z.id}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {viewTab === VIEW_TAB.employee && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Employee
                  </Label>
                  <Select
                    value={formEmployeeId}
                    disabled={isSalesRole}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                  >
                    <option value="">Select employee</option>
                    {employeeOptions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name || e.email || e.id}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Period</Label>
                <Select
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                >
                  {PERIOD_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={formDateFrom}
                  max={formDateTo || undefined}
                  onChange={(e) => setFormDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={formDateTo}
                  min={formDateFrom || undefined}
                  onChange={(e) => setFormDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Target Amount
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formTargetAmount}
                  onChange={(e) => setFormTargetAmount(e.target.value)}
                />
              </div>
            </SheetBody>
            <SheetFooter>
              <Button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Target"
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
};

export default TargetAnalytics;
