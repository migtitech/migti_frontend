import React, { useEffect, useMemo, useState } from "react";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilX } from "@coreui/icons";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole } from "../../hooks/usePermissions";
import branchService from "../../services/branchService";
import areaService from "../../services/areaService";
import employeeService from "../../services/employeeService";
import industryService from "../../services/industryService";
import visitService from "../../services/visitService";
import { Loader, TablePagination, FilterLockButton } from "../../components";
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

const drawerWidth = 460;
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
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Visit Management</strong>
              <CButton
                color="primary"
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
              </CButton>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3 mb-3 align-items-end">
                <CCol md={3}>
                  <CFormLabel className="small text-muted mb-1">
                    Period
                  </CFormLabel>
                  <CFormSelect
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    {PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="small text-muted mb-1">
                    From
                  </CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="small text-muted mb-1">To</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="small text-muted mb-1">
                    Status
                  </CFormLabel>
                  <CFormSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value || "all"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={3} className="d-flex align-items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="Visit Management"
                  />
                </CCol>
                <CCol md={3}>
                  <CCard>
                    <CCardBody className="py-2">
                      <div className="small text-muted">Total Visits</div>
                      <div className="fs-5 fw-semibold">
                        {pagination.totalItems || 0}
                      </div>
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>

              {loadingInit || loadingRows ? (
                <div className="text-center py-5">
                  <Loader message="Loading visits..." />
                </div>
              ) : (
                <>
                  <CTable hover bordered responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S No</CTableHeaderCell>
                        <CTableHeaderCell>Zone</CTableHeaderCell>
                        <CTableHeaderCell>Employee</CTableHeaderCell>
                        <CTableHeaderCell>Industry</CTableHeaderCell>
                        <CTableHeaderCell>Instructions</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                        <CTableHeaderCell>Action</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {rows.length > 0 ? (
                        rows.map((item, index) => (
                          <CTableRow key={item._id || index}>
                            <CTableDataCell>
                              {(page - 1) * 10 + index + 1}
                            </CTableDataCell>
                            <CTableDataCell>
                              {item.zoneName || "-"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {item.employeeName || "-"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {item.industries?.[0]?.name || "-"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {item.instructions || "-"}
                            </CTableDataCell>
                            <CTableDataCell className="text-capitalize">
                              {item.status || "active"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {dateTimeFormatter(item.createdAt, "-")}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CButton
                                color="light"
                                size="sm"
                                className="d-inline-flex align-items-center justify-content-center"
                                onClick={() => onViewVisit(item)}
                                title="View visit"
                              >
                                <span
                                  aria-hidden="true"
                                  style={{ fontSize: 16, lineHeight: 1 }}
                                >
                                  👁
                                </span>
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      ) : (
                        <CTableRow>
                          <CTableDataCell colSpan={8} className="text-center">
                            No visits found.
                          </CTableDataCell>
                        </CTableRow>
                      )}
                    </CTableBody>
                  </CTable>

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
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: isDrawerOpen ? 0 : -drawerWidth,
          width: drawerWidth,
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #dee2e6",
          boxShadow: "0 0 16px rgba(0,0,0,0.08)",
          zIndex: 2999,
          transition: "right 0.2s ease",
          padding: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Create Visit</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => setIsDrawerOpen(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Zone</CFormLabel>
              <CFormSelect
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
              </CFormSelect>
            </CCol>

            <CCol md={12}>
              <CFormLabel>Employee</CFormLabel>
              {isHod ? (
                <CFormSelect
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
                </CFormSelect>
              ) : (
                <CFormInput value={currentEmployeeName} disabled readOnly />
              )}
            </CCol>

            <CCol md={12}>
              <CFormLabel>Search industry (optional)</CFormLabel>
              <CFormInput
                placeholder="Type to search industries (optional)"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
            </CCol>

            <CCol md={12}>
              <CFormLabel>Industry (optional)</CFormLabel>
              <CFormSelect
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
              </CFormSelect>
            </CCol>

            <CCol md={12}>
              <CFormLabel>Instructions</CFormLabel>
              <CFormTextarea
                rows={4}
                placeholder="Add instructions"
                value={form.instructions}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, instructions: e.target.value }))
                }
              />
            </CCol>
          </CRow>
        </div>

        <div className="d-flex justify-content-end gap-2 pt-3">
          <CButton color="secondary" onClick={() => setIsDrawerOpen(false)}>
            Cancel
          </CButton>
          <CButton color="primary" disabled={submitting} onClick={onSaveVisit}>
            {submitting ? "Saving..." : "Save"}
          </CButton>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: isViewDrawerOpen ? 0 : -drawerWidth,
          width: drawerWidth,
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #dee2e6",
          boxShadow: "0 0 16px rgba(0,0,0,0.08)",
          zIndex: 2999,
          transition: "right 0.2s ease",
          padding: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Visit Details</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => setIsViewDrawerOpen(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Zone</CFormLabel>
              <div>{selectedVisit?.zoneName || "-"}</div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">
                Employee
              </CFormLabel>
              <div>{selectedVisit?.employeeName || "-"}</div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">
                Industry (optional)
              </CFormLabel>
              <div>{selectedVisit?.industries?.[0]?.name || "-"}</div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Status</CFormLabel>
              <div>
                <span
                  className={`badge ${selectedVisit?.status === "completed" ? "bg-success" : "bg-primary"}`}
                >
                  {selectedVisit?.status === "completed"
                    ? "Completed"
                    : "Active"}
                </span>
              </div>
            </CCol>
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">
                Instructions
              </CFormLabel>
              <div>{selectedVisit?.instructions || "-"}</div>
            </CCol>
            {selectedVisit?.status === "completed" ? (
              <CCol md={12}>
                <CFormLabel className="text-muted small mb-1">
                  Remark
                </CFormLabel>
                <div>{selectedVisit?.remark || "-"}</div>
              </CCol>
            ) : null}
            <CCol md={12}>
              <CFormLabel className="text-muted small mb-1">Date</CFormLabel>
              <div>{dateTimeFormatter(selectedVisit?.createdAt, "-")}</div>
            </CCol>
          </CRow>
        </div>
      </div>
    </>
  );
};

export default VisitManagementSidebar;
