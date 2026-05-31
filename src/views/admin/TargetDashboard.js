import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CBadge,
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
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilX, cilPlus } from "@coreui/icons";
import areaService from "../../services/areaService";
import branchService from "../../services/branchService";
import targetAnalyticsService from "../../services/targetAnalyticsService";
import { Loader } from "../../components";
import { toastError, toastSuccess } from "../../utils/toast";

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const SIDEBAR_WIDTH = 400;

const normalizeId = (v) => {
  if (!v) return "";
  if (typeof v === "object") return String(v._id || v.id || "");
  return String(v);
};

const formatAmount = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-IN") : "-";

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
      d.getDate()
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
      "="
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
  if (status === "closed") return <CBadge color="secondary">Closed</CBadge>;
  return <CBadge color="success">Active</CBadge>;
};

const TargetDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [targets, setTargets] = useState([]);
  const [branches, setBranches] = useState([]);
  const [zones, setZones] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterZoneId, setFilterZoneId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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
      }))
    );
    const zoneData = zonesRes?.data?.data || zonesRes?.data || zonesRes;
    setZones(
      (zoneData?.areas || zoneData || []).map((z) => ({
        ...z,
        id: z._id || z.id,
      }))
    );
  }, []);

  const loadTargets = useCallback(async () => {
    const params = {};
    if (branchId) params.branchId = branchId;
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
  }, [branchId, filterPeriod, filterZoneId]);

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
  }, [branchId, filterPeriod, filterZoneId, loading]);

  const zoneOptions = useMemo(
    () =>
      zones.filter(
        (z) => !branchId || normalizeId(z.branchId) === String(branchId)
      ),
    [zones, branchId]
  );

  const displayedTargets = useMemo(() => {
    if (!filterStatus) return targets;
    return targets.filter((t) => (t.status || "active") === filterStatus);
  }, [targets, filterStatus]);

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
    if (!branchId) return toastError("Branch not determined from your profile");
    setSaving(true);
    try {
      await targetAnalyticsService.upsertZoneTarget({
        branchId,
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
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <strong>Target Dashboard</strong>
              <CButton color="primary" size="sm" onClick={openSidebar}>
                <CIcon icon={cilPlus} className="me-1" />
                Add Target
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <div className="text-center py-5">
                <Loader message="Loading targets..." />
              </div>
            ) : (
              <>
                <CRow className="mb-3 g-2 align-items-end">
                  {!isHod && (
                    <CCol md={3}>
                      <CFormLabel className="small text-muted mb-1">
                        Branch
                      </CFormLabel>
                      <CFormSelect
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                      >
                        <option value="">All branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name || b.branchcode || b.id}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  )}
                  <CCol md={3}>
                    <CFormLabel className="small text-muted mb-1">
                      Zone
                    </CFormLabel>
                    <CFormSelect
                      value={filterZoneId}
                      onChange={(e) => setFilterZoneId(e.target.value)}
                    >
                      <option value="">All zones</option>
                      {zoneOptions.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name || z.id}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CFormLabel className="small text-muted mb-1">
                      Period
                    </CFormLabel>
                    <CFormSelect
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                    >
                      <option value="">All periods</option>
                      {PERIOD_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CFormLabel className="small text-muted mb-1">
                      Status
                    </CFormLabel>
                    <CFormSelect
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All</option>
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                    </CFormSelect>
                  </CCol>
                </CRow>

                <CTable hover responsive bordered>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Zone</CTableHeaderCell>
                      <CTableHeaderCell>Period</CTableHeaderCell>
                      <CTableHeaderCell>From</CTableHeaderCell>
                      <CTableHeaderCell>To</CTableHeaderCell>
                      <CTableHeaderCell>Target Amount</CTableHeaderCell>
                      <CTableHeaderCell>Remark</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {displayedTargets.length ? (
                      displayedTargets.map((row) => (
                        <CTableRow key={row._id}>
                          <CTableDataCell>
                            {row.zoneId?.name || "-"}
                          </CTableDataCell>
                          <CTableDataCell
                            style={{ textTransform: "capitalize" }}
                          >
                            {row.period || "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatDate(row.dateFrom)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatDate(row.dateTo)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatAmount(row.targetAmount)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {row.remark || "-"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {statusBadge(row.status)}
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    ) : (
                      <CTableRow>
                        <CTableDataCell colSpan={7} className="text-center">
                          No targets found.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* Create Target Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: sidebarOpen ? 0 : -SIDEBAR_WIDTH,
          width: SIDEBAR_WIDTH,
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #dee2e6",
          boxShadow: "-4px 0 16px rgba(0,0,0,0.10)",
          zIndex: 2999,
          transition: "right 0.25s ease",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h6 className="mb-0 fw-semibold">Create Zone Target</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 28, height: 28 }}
            onClick={() => setSidebarOpen(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">
            Zone <span className="text-danger">*</span>
          </CFormLabel>
          <CFormSelect
            value={formZoneId}
            onChange={(e) => setFormZoneId(e.target.value)}
          >
            <option value="">Select zone</option>
            {zoneOptions.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name || z.id}
              </option>
            ))}
          </CFormSelect>
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">Period</CFormLabel>
          <CFormSelect
            value={formPeriod}
            onChange={(e) => setFormPeriod(e.target.value)}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </CFormSelect>
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">From Date</CFormLabel>
          <CFormInput
            type="date"
            value={formDateFrom}
            max={formDateTo || undefined}
            onChange={(e) => setFormDateFrom(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">To Date</CFormLabel>
          <CFormInput
            type="date"
            value={formDateTo}
            min={formDateFrom || undefined}
            onChange={(e) => setFormDateTo(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">
            Target Amount <span className="text-danger">*</span>
          </CFormLabel>
          <CFormInput
            type="number"
            min={0}
            placeholder="Enter amount"
            value={formTargetAmount}
            onChange={(e) => setFormTargetAmount(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">Remark</CFormLabel>
          <CFormTextarea
            rows={3}
            placeholder="Optional remark"
            value={formRemark}
            onChange={(e) => setFormRemark(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <CFormLabel className="small text-muted mb-1">Status</CFormLabel>
          <CFormSelect disabled value="active">
            <option value="active">Active</option>
          </CFormSelect>
        </div>

        <div className="mt-auto pt-3">
          <CButton
            color="primary"
            className="w-100"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              "Save Target"
            )}
          </CButton>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 2998,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </CRow>
  );
};

export default TargetDashboard;
