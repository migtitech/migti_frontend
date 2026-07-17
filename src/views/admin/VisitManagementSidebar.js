import React, { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole } from "../../hooks/usePermissions";
import branchService from "../../services/branchService";
import areaService from "../../services/areaService";
import employeeService from "../../services/employeeService";
import industryService from "../../services/industryService";
import visitService from "../../services/visitService";
import {
  Loader,
  PageHeader,
  TablePagination,
  FilterLockButton,
} from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Textarea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === "object") return response.data;
  return response || {};
};

const VISIT_MANAGEMENT_FILTER_DEFAULTS = {
  period: "all",
  dateFrom: "",
  dateTo: "",
  status: "",
};

const PERIOD_OPTIONS = [
  { value: "all", label: "Total" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

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

const findIndoreBranchId = (branchList) => {
  const match = (branchList || []).find((branch) =>
    String(branch?.name || "")
      .toLowerCase()
      .includes("indore"),
  );
  return match ? String(match.id || match._id || "") : "";
};

const getPeriodRange = (period) => {
  if (!period || period === "all") return { from: "", to: "" };
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(todayEnd);
  if (period === "weekly") start.setDate(todayEnd.getDate() - 6);
  if (period === "monthly")
    start = new Date(todayEnd.getFullYear(), todayEnd.getMonth(), 1);
  const toInputDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  return { from: toInputDate(start), to: toInputDate(todayEnd) };
};

const VisitManagementSidebar = () => {
  const { user } = useAuth();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "visit_management",
    VISIT_MANAGEMENT_FILTER_DEFAULTS,
  );

  const [loadingInit, setLoadingInit] = useState(false);
  const [indoreBranchId, setIndoreBranchId] = useState("");
  const [isHod, setIsHod] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState("");
  const [currentEmployeeName, setCurrentEmployeeName] = useState("");
  const [loadingRows, setLoadingRows] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);

  const [zones, setZones] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(initialValues.period);
  const [dateFrom, setDateFrom] = useState(initialValues.dateFrom);
  const [dateTo, setDateTo] = useState(initialValues.dateTo);
  const [statusFilter, setStatusFilter] = useState(initialValues.status);

  const [form, setForm] = useState({
    branchId: "",
    zoneId: "",
    employeeId: "",
    industryId: "",
    instructions: "",
  });
  const [industrySearchText, setIndustrySearchText] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const payload = decodeTokenPayload(token);
    const role = normalizeRole(payload?.role || user?.role);
    const hodMode = role === "head_of_department" || role === "hod";
    setIsHod(hodMode);

    const employeeId = String(
      payload?.id || user?._id || user?.id || "",
    ).trim();
    const employeeName =
      user?.name ||
      user?.username ||
      (user?.firstName
        ? [user.firstName, user.lastName].filter(Boolean).join(" ")
        : "") ||
      user?.email ||
      "Current user";

    if (employeeId) {
      setCurrentEmployeeId(employeeId);
      setCurrentEmployeeName(employeeName);
      if (!hodMode) {
        setForm((prev) => ({ ...prev, employeeId }));
      }
    }
  }, [user]);

  const loadRows = async (pageNumber = 1) => {
    setLoadingRows(true);
    try {
      const res = await visitService.list({
        pageNumber,
        pageSize: 10,
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: statusFilter || undefined,
      });
      const payload = unwrapResponse(res);
      const data = payload?.data || payload || {};
      setRows(data?.visits || []);
      setPagination(
        data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        },
      );
    } catch (err) {
      toastError(err?.message || "Failed to load visits");
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  };

  const loadInitial = async () => {
    setLoadingInit(true);
    try {
      const [branchesRes] = await Promise.all([
        branchService.getAll({ pageNumber: 1, pageSize: 100 }),
      ]);
      const branchesPayload = unwrapResponse(branchesRes);
      const branchRows =
        branchesPayload?.data?.branches ||
        branchesPayload?.branches ||
        branchesPayload?.data?.companyBranches ||
        branchesPayload?.companyBranches ||
        [];
      const normalizedBranches = (branchRows || []).map((b) => ({
        ...b,
        id: b._id || b.id,
      }));
      const defaultBranchId = findIndoreBranchId(normalizedBranches);
      setIndoreBranchId(defaultBranchId);
      if (defaultBranchId) {
        setForm((prev) => ({ ...prev, branchId: defaultBranchId }));
      }
    } catch (err) {
      toastError(err?.message || "Failed to load branches");
    } finally {
      setLoadingInit(false);
    }
  };

  useEffect(() => {
    loadInitial();
    loadRows(1);
  }, []);

  useEffect(() => {
    const nextRange = getPeriodRange(period);
    setDateFrom(nextRange.from);
    setDateTo(nextRange.to);
    setPage(1);
  }, [period]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, statusFilter]);

  useFilterLockPersist("visit_management", filtersLocked, {
    period,
    dateFrom,
    dateTo,
    status: statusFilter,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      period,
      dateFrom,
      dateTo,
      status: statusFilter,
    });
  };

  useEffect(() => {
    loadRows(page);
  }, [page, period, dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    const loadScopedData = async () => {
      try {
        const [zonesRes, employeesRes, industriesRes] = await Promise.all([
          areaService.getAll({
            pageNumber: 1,
            pageSize: 100,
            areaType: "industry",
          }),
          employeeService.getAll({
            pageNumber: 1,
            pageSize: 100,
          }),
          industryService.getAll({
            pageNumber: 1,
            pageSize: 100,
          }),
        ]);

        const zonesPayload = unwrapResponse(zonesRes);
        const employeesPayload = unwrapResponse(employeesRes);
        const industriesPayload = unwrapResponse(industriesRes);

        const zoneRows = zonesPayload?.data?.areas || zonesPayload?.areas || [];
        const employeeRows =
          employeesPayload?.data?.employees ||
          employeesPayload?.employees ||
          [];
        const industryRows =
          industriesPayload?.data?.industries ||
          industriesPayload?.industries ||
          [];

        setZones((zoneRows || []).map((z) => ({ ...z, id: z._id || z.id })));
        setEmployees(
          (employeeRows || []).map((e) => ({ ...e, id: e._id || e.id })),
        );
        setIndustries(
          (industryRows || []).map((i) => ({ ...i, id: i._id || i.id })),
        );
      } catch (err) {
        toastError(err?.message || "Failed to load visit form data");
      }
    };

    loadScopedData();
  }, [isHod, currentEmployeeId]);

  const visibleIndustries = useMemo(() => {
    const q = industrySearchText.trim().toLowerCase();
    if (!q) return industries;
    return industries.filter((industry) =>
      String(industry?.name || "")
        .toLowerCase()
        .includes(q),
    );
  }, [industries, industrySearchText]);

  const onSaveVisit = async () => {
    const branchId = indoreBranchId || form.branchId;
    const employeeId = isHod ? form.employeeId : currentEmployeeId;

    if (!branchId || !form.zoneId || !employeeId) {
      toastError("Zone and employee are required");
      return;
    }

    setSubmitting(true);
    try {
      await visitService.create({
        branchId,
        zoneId: form.zoneId,
        employeeId,
        industryIds: form.industryId ? [form.industryId] : [],
        instructions: form.instructions || "",
      });

      toastSuccess("Visit created successfully");
      setIsDrawerOpen(false);
      setForm({
        branchId: indoreBranchId || form.branchId || "",
        zoneId: "",
        employeeId: isHod ? "" : currentEmployeeId,
        industryId: "",
        instructions: "",
      });
      setIndustrySearchText("");
      setPage(1);
      loadRows(1);
    } catch (err) {
      toastError(err?.message || "Failed to create visit");
    } finally {
      setSubmitting(false);
    }
  };

  const onViewVisit = (visit) => {
    setSelectedVisit(visit);
    setIsDrawerOpen(false);
    setIsViewDrawerOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Visit Management"
        actions={
          <Button
            type="button"
            onClick={() => {
              if (!isHod && currentEmployeeId) {
                setForm((prev) => ({
                  ...prev,
                  branchId: indoreBranchId || prev.branchId,
                  employeeId: currentEmployeeId,
                }));
              }
              setIsDrawerOpen(true);
            }}
          >
            Create Visit
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <FilterLockButton
                filtersLocked={filtersLocked}
                onToggle={handleToggleFiltersLock}
                pageLabel="Visit Management"
              />
            </div>
            <Card>
              <CardContent className="px-4 py-2">
                <div className="text-sm text-muted-foreground">
                  Total Visits
                </div>
                <div className="text-lg font-semibold text-foreground">
                  {pagination.totalItems || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {loadingInit || loadingRows ? (
            <div className="py-10 text-center">
              <Loader message="Loading visits..." />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S No</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Instructions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length > 0 ? (
                      rows.map((item, index) => (
                        <TableRow key={item._id || index}>
                          <TableCell>{(page - 1) * 10 + index + 1}</TableCell>
                          <TableCell>{item.zoneName || "-"}</TableCell>
                          <TableCell>{item.employeeName || "-"}</TableCell>
                          <TableCell>
                            {item.industries?.[0]?.name || "-"}
                          </TableCell>
                          <TableCell>{item.instructions || "-"}</TableCell>
                          <TableCell className="capitalize">
                            {item.status || "active"}
                          </TableCell>
                          <TableCell>
                            {dateTimeFormatter(item.createdAt, "-")}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onViewVisit(item)}
                              title="View visit"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground"
                        >
                          No visits found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                currentPage={pagination?.currentPage ?? 1}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                showRange
                totalItems={pagination?.totalItems ?? 0}
                itemsPerPage={pagination?.itemsPerPage ?? 10}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={isDrawerOpen}
        onOpenChange={(open) => !open && setIsDrawerOpen(false)}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-[460px]">
          <SheetHeader>
            <SheetTitle>Create Visit</SheetTitle>
          </SheetHeader>

          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <Label>Zone</Label>
              <Select
                value={form.zoneId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    zoneId: e.target.value,
                    employeeId: isHod ? "" : currentEmployeeId,
                  }))
                }
              >
                <option value="">Select zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name || zone.id}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Employee</Label>
              {isHod ? (
                <Select
                  value={form.employeeId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, employeeId: e.target.value }))
                  }
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name || employee.id}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input value={currentEmployeeName} disabled readOnly />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Search industry (optional)</Label>
              <Input
                placeholder="Type to search industries (optional)"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Industry (optional)</Label>
              <Select
                value={form.industryId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, industryId: e.target.value }))
                }
              >
                <option value="">No industry selected</option>
                {visibleIndustries.map((industry) => (
                  <option key={industry.id} value={industry.id}>
                    {industry.name || industry.id}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Instructions</Label>
              <Textarea
                rows={4}
                placeholder="Add instructions"
                value={form.instructions}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, instructions: e.target.value }))
                }
              />
            </div>
          </SheetBody>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={submitting} onClick={onSaveVisit}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={isViewDrawerOpen}
        onOpenChange={(open) => !open && setIsViewDrawerOpen(false)}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-[460px]">
          <SheetHeader>
            <SheetTitle>Visit Details</SheetTitle>
          </SheetHeader>

          <SheetBody className="space-y-4">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Zone</div>
              <div className="text-foreground">
                {selectedVisit?.zoneName || "-"}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Employee</div>
              <div className="text-foreground">
                {selectedVisit?.employeeName || "-"}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">
                Industry (optional)
              </div>
              <div className="text-foreground">
                {selectedVisit?.industries?.[0]?.name || "-"}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Status</div>
              <div>
                <Badge
                  variant={
                    selectedVisit?.status === "completed"
                      ? "success"
                      : "default"
                  }
                >
                  {selectedVisit?.status === "completed"
                    ? "Completed"
                    : "Active"}
                </Badge>
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">
                Instructions
              </div>
              <div className="text-foreground">
                {selectedVisit?.instructions || "-"}
              </div>
            </div>
            {selectedVisit?.status === "completed" ? (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Remark</div>
                <div className="text-foreground">
                  {selectedVisit?.remark || "-"}
                </div>
              </div>
            ) : null}
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Date</div>
              <div className="text-foreground">
                {dateTimeFormatter(selectedVisit?.createdAt, "-")}
              </div>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default VisitManagementSidebar;
