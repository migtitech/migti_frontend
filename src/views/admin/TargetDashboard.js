import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import areaService from "../../services/areaService";
import branchService from "../../services/branchService";
import targetAnalyticsService from "../../services/targetAnalyticsService";
import { Loader, PageHeader, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const TARGET_DASHBOARD_FILTER_DEFAULTS = {
  zoneId: "",
  period: "",
  status: "",
};

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const normalizeId = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v._id || v.id || "");
  return String(v);
};

const formatAmount = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const getPeriodRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);
  if (period === "weekly") {
    start.setDate(today.getDate() - today.getDay() + 1);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { from: fmt(start), to: fmt(end) };
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
  } catch {
    return null;
  }
};

const extractList = (res, keys = []) => {
  const data = res?.data || res;
  const nested = data?.data ?? data;
  for (const key of keys) {
    if (Array.isArray(nested?.[key])) return nested[key];
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(nested)) return nested;
  if (Array.isArray(data)) return data;
  return [];
};

const statusBadge = (status) => {
  if (status === "closed") return <Badge variant="secondary">Closed</Badge>;
  return <Badge variant="success">Active</Badge>;
};

const TargetDashboard = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "target_dashboard",
    TARGET_DASHBOARD_FILTER_DEFAULTS,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [targets, setTargets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [zones, setZones] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState(initialValues.period);
  const [filterZoneId, setFilterZoneId] = useState(initialValues.zoneId);
  const [filterStatus, setFilterStatus] = useState(initialValues.status);

  const [branchId, setBranchId] = useState("");
  const [isHod, setIsHod] = useState(false);

  // Form state
  const [formZoneId, setFormZoneId] = useState("");
  const [formPeriod, setFormPeriod] = useState("weekly");
  const [formDateFrom, setFormDateFrom] = useState("");
  const [formDateTo, setFormDateTo] = useState("");
  const [formTargetAmount, setFormTargetAmount] = useState("");
  const [formRemark, setFormRemark] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const payload = decodeTokenPayload(token);
    const role = String(payload?.role || "").toLowerCase();
    const hodMode = role === "head_of_department" || role === "hod";
    setIsHod(hodMode);

    const rawBranchId =
      typeof payload?.branchId === "object"
        ? payload?.branchId?._id || payload?.branchId?.id
        : payload?.branchId;
    if (rawBranchId) setBranchId(String(rawBranchId));

    const userRaw = localStorage.getItem("migticrm_user");
    const user = userRaw ? JSON.parse(userRaw) : {};
    if (!rawBranchId && user?.branchId) {
      const fb =
        typeof user.branchId === "object"
          ? user.branchId._id || user.branchId.id
          : user.branchId;
      if (fb) setBranchId(String(fb));
    }
  }, []);

  const loadMasterData = useCallback(async () => {
    const [branchesRes, zonesRes] = await Promise.all([
      branchService.getAll({ pageNumber: 1, pageSize: 100 }),
      areaService.getAll({ pageNumber: 1, pageSize: 100 }),
    ]);
    setBranches(
      extractList(branchesRes, ["branches"]).map((b) => ({
        ...b,
        id: b._id || b.id,
      })),
    );
    const zoneData = zonesRes?.data?.data || zonesRes?.data || zonesRes;
    setZones(
      (zoneData?.areas || zoneData || []).map((z) => ({
        ...z,
        id: z._id || z.id,
      })),
    );
  }, []);

  const loadTargets = useCallback(async () => {
    const params = {};
    if (filterPeriod) params.period = filterPeriod;
    if (filterZoneId) params.zoneId = filterZoneId;
    const res = await targetAnalyticsService.getZoneData(params);
    const data = res?.data?.data || res?.data || {};
    const active = data.activeTargets || [];
    const history = data.history || [];
    const all = [
      ...active.map((t) => ({ ...t, status: t.status || "active" })),
      ...history.map((t) => ({ ...t, status: t.status || "closed" })),
    ];
    setTargets(all);
  }, [filterPeriod, filterZoneId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadMasterData()]);
    } catch (err) {
      toastError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [loadMasterData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!loading) loadTargets();
  }, [filterPeriod, filterZoneId, loading]);

  const zoneOptions = useMemo(() => zones, [zones]);

  const displayedTargets = useMemo(() => {
    if (!filterStatus) return targets;
    return targets.filter((t) => (t.status || "active") === filterStatus);
  }, [targets, filterStatus]);

  useFilterLockPersist("target_dashboard", filtersLocked, {
    zoneId: filterZoneId,
    period: filterPeriod,
    status: filterStatus,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      zoneId: filterZoneId,
      period: filterPeriod,
      status: filterStatus,
    });
  };

  const openSidebar = () => {
    const range = getPeriodRange("weekly");
    setFormPeriod("weekly");
    setFormDateFrom(range.from);
    setFormDateTo(range.to);
    setFormZoneId("");
    setFormTargetAmount("");
    setFormRemark("");
    setSidebarOpen(true);
  };

  useEffect(() => {
    const range = getPeriodRange(formPeriod);
    setFormDateFrom(range.from);
    setFormDateTo(range.to);
  }, [formPeriod]);

  const onSave = async () => {
    if (!formZoneId) return toastError("Please select a zone");
    if (!formDateFrom || !formDateTo)
      return toastError("Please select a date range");
    if (formTargetAmount === "" || Number(formTargetAmount) < 0)
      return toastError("Enter a valid target amount");
    const effectiveBranchId = branchId || String(branches[0]?.id || "");
    if (!effectiveBranchId) return toastError("Unable to determine branch");
    setSaving(true);
    try {
      await targetAnalyticsService.upsertZoneTarget({
        branchId: effectiveBranchId,
        zoneId: formZoneId,
        period: formPeriod,
        dateFrom: formDateFrom,
        dateTo: formDateTo,
        targetAmount: Number(formTargetAmount),
        remark: formRemark,
        status: "active",
      });
      toastSuccess("Target saved successfully");
      setSidebarOpen(false);
      await loadTargets();
    } catch (err) {
      toastError(err?.message || "Failed to save target");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Target Dashboard"
        actions={
          <Button type="button" onClick={openSidebar}>
            <Plus className="h-4 w-4" />
            Add Target
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="py-10 text-center">
              <Loader message="Loading targets..." />
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Zone</Label>
                  <Select
                    value={filterZoneId}
                    onChange={(e) => setFilterZoneId(e.target.value)}
                  >
                    <option value="">All zones</option>
                    {zoneOptions.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name || z.id}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Period
                  </Label>
                  <Select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                  >
                    <option value="">All periods</option>
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="Target Dashboard"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Target Amount</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTargets.length ? (
                    displayedTargets.map((row) => (
                      <TableRow key={row._id}>
                        <TableCell>{row.zoneId?.name || "-"}</TableCell>
                        <TableCell className="capitalize">
                          {row.period || "-"}
                        </TableCell>
                        <TableCell>
                          {dateFormatter(row.dateFrom, "-")}
                        </TableCell>
                        <TableCell>{dateFormatter(row.dateTo, "-")}</TableCell>
                        <TableCell>{formatAmount(row.targetAmount)}</TableCell>
                        <TableCell>{row.remark || "-"}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        No targets found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Target Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create Zone Target</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Zone <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formZoneId}
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
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={formDateFrom}
                max={formDateTo || undefined}
                onChange={(e) => setFormDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={formDateTo}
                min={formDateFrom || undefined}
                onChange={(e) => setFormDateTo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Target Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="Enter amount"
                value={formTargetAmount}
                onChange={(e) => setFormTargetAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Remark</Label>
              <Textarea
                rows={3}
                placeholder="Optional remark"
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select disabled value="active">
                <option value="active">Active</option>
              </Select>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button
              type="button"
              className="w-full"
              onClick={onSave}
              disabled={saving}
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
    </div>
  );
};

export default TargetDashboard;
