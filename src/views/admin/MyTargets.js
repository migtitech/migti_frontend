import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
  CProgress,
  CProgressBar,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import targetAnalyticsService from "../../services/targetAnalyticsService";
import { Loader } from "../../components";
import { toastError } from "../../utils/toast";

const PERIOD_OPTIONS = [
  { value: "", label: "All Periods" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const formatAmount = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "-");

const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

const getProgressMeta = (target, achieved) => {
  const t = Number(target || 0);
  const a = Number(achieved || 0);
  if (t <= 0) return { pct: 0, display: 0, color: "secondary" };
  const pct = (a / t) * 100;
  const display = clamp(pct);
  if (pct < 50) return { pct, display, color: "danger" };
  if (pct < 80) return { pct, display, color: "warning" };
  return { pct, display, color: "success" };
};

const statusBadge = (status) => {
  if (status === "closed") return <CBadge color="secondary">Closed</CBadge>;
  return <CBadge color="success">Active</CBadge>;
};

const MyTargets = () => {
  const [loading, setLoading] = useState(false);
  const [targets, setTargets] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const loadTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await targetAnalyticsService.getMyZoneTargets();
      const data = res?.data?.data || res?.data || res;
      setTargets(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err?.message || "Failed to load targets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const displayed = useMemo(() => {
    let list = targets;
    if (filterPeriod) list = list.filter((t) => t.period === filterPeriod);
    if (filterStatus)
      list = list.filter((t) => (t.status || "active") === filterStatus);
    return list;
  }, [targets, filterPeriod, filterStatus]);

  const summary = useMemo(() => {
    const active = targets.filter((t) => (t.status || "active") === "active");
    const totalTarget = active.reduce(
      (s, t) => s + Number(t.targetAmount || 0),
      0,
    );
    return { totalTarget, activeCount: active.length };
  }, [targets]);

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>My Targets</strong>
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <div className="text-center py-5">
                <Loader message="Loading your targets..." />
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <CRow className="g-3 mb-4">
                  <CCol md={4}>
                    <CCard className="border-0 bg-light">
                      <CCardBody>
                        <div className="text-muted small mb-1">
                          Active Targets
                        </div>
                        <div className="fs-5 fw-semibold">
                          {summary.activeCount}
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                  <CCol md={4}>
                    <CCard className="border-0 bg-light">
                      <CCardBody>
                        <div className="text-muted small mb-1">
                          Total Active Amount
                        </div>
                        <div className="fs-5 fw-semibold">
                          {formatAmount(summary.totalTarget)}
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>

                {/* Filters */}
                <CRow className="mb-3 g-2 align-items-end">
                  <CCol md={3}>
                    <CFormLabel className="small text-muted mb-1">
                      Period
                    </CFormLabel>
                    <CFormSelect
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                    >
                      {PERIOD_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={3}>
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
                      <CTableHeaderCell>Progress</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {displayed.length ? (
                      displayed.map((row) => {
                        const meta = getProgressMeta(
                          row.targetAmount,
                          row.achievedAmount,
                        );
                        return (
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
                            <CTableDataCell style={{ minWidth: 120 }}>
                              <div className="d-flex align-items-center gap-2">
                                <CProgress
                                  height={8}
                                  className="flex-grow-1"
                                  style={{ minWidth: 80 }}
                                >
                                  <CProgressBar
                                    value={meta.display}
                                    color={meta.color}
                                  />
                                </CProgress>
                                <small className="text-muted">
                                  {meta.pct.toFixed(0)}%
                                </small>
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              {statusBadge(row.status)}
                            </CTableDataCell>
                          </CTableRow>
                        );
                      })
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
    </CRow>
  );
};

export default MyTargets;
