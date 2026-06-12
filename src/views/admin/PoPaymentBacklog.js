import React, { useCallback, useEffect, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilMoney, cilCheck, cilClock, cilUser } from "@coreui/icons";
import { useAuth } from "../../context/AuthContext";
import { FULL_ACCESS_ROLES, ROLE_LABELS } from "../../context/AuthContext";
import poPaymentBacklogService from "../../services/poPaymentBacklogService";
import employeeService from "../../services/employeeService";
import { toastError, toastSuccess } from "../../utils/toast";

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

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
    String(user?.role || "").trim().toLowerCase()
  );

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState("");

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
        setSummary(
          data?.summary || { totalCount: 0, totalAmount: 0 }
        );
      } catch (err) {
        toastError(err?.message || "Failed to load payment backlog");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, user]
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadBacklog(employeeFilter);
  }, [employeeFilter, loadBacklog]);

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
      <CRow className="mb-4">
        <CCol xs={12}>
          <div className="d-flex justify-content-between flex-wrap align-items-center mb-4">
            <div>
              <h4 className="mb-1 fw-semibold">Pending Payments</h4>
              <p className="text-body-secondary small mb-0">
                Payment backlog created on HOD approval of sales orders
              </p>
            </div>
            {isAdmin && employees.length > 0 && (
              <div style={{ minWidth: 220 }}>
                <CFormLabel className="mb-1 small text-body-secondary">
                  Filter by employee
                </CFormLabel>
                <CFormSelect
                  size="sm"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <option value="">All employees</option>
                  {employees.map((e) => (
                    <option key={e._id || e.id} value={e._id || e.id}>
                      {e.name || e.email || String(e._id || e.id)}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <CRow className="g-3 mb-4">
            <CCol sm={6} md={4}>
              <CCard className="border-0 shadow-sm h-100">
                <CCardBody className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle bg-warning bg-opacity-10"
                    style={{ width: 48, height: 48, flexShrink: 0 }}
                  >
                    <CIcon icon={cilClock} className="text-warning" size="lg" />
                  </div>
                  <div>
                    <div className="text-body-secondary small">
                      Total Sales Order Payments Pending
                    </div>
                    <div className="fs-4 fw-bold">
                      {loading ? (
                        <CSpinner size="sm" />
                      ) : (
                        summary.totalCount
                      )}
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol sm={6} md={4}>
              <CCard className="border-0 shadow-sm h-100">
                <CCardBody className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle bg-danger bg-opacity-10"
                    style={{ width: 48, height: 48, flexShrink: 0 }}
                  >
                    <CIcon icon={cilMoney} className="text-danger" size="lg" />
                  </div>
                  <div>
                    <div className="text-body-secondary small">
                      Total Pending Amount
                    </div>
                    <div className="fs-4 fw-bold text-danger">
                      {loading ? (
                        <CSpinner size="sm" />
                      ) : (
                        formatAmount(summary.totalAmount)
                      )}
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* Backlog cards */}
          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <CSpinner />
            </div>
          ) : items.length === 0 ? (
            <CCard className="border-0 shadow-sm">
              <CCardBody className="text-center py-5 text-body-secondary">
                <CIcon icon={cilCheck} size="xl" className="mb-3 text-success" />
                <div className="fs-5 fw-semibold mb-1">All caught up!</div>
                <div className="small">No pending payment backlog entries.</div>
              </CCardBody>
            </CCard>
          ) : (
            <CRow className="g-3">
              {items.map((item) => {
                const id = item._id || item.id;
                const overdue = isOverdue(item.due_date);
                const poCode =
                  item?.po_snapshot?.poCode || "—";
                return (
                  <CCol key={id} sm={12} md={6} lg={4}>
                    <CCard
                      className={`border-0 shadow-sm h-100 ${overdue ? "border-start border-danger border-3" : "border-start border-warning border-3"}`}
                    >
                      <CCardBody>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <div className="fw-semibold fs-6 text-truncate" style={{ maxWidth: 180 }}>
                              {companyName(item)}
                            </div>
                            <div className="text-body-secondary small">{poCode}</div>
                          </div>
                          {overdue ? (
                            <CBadge color="danger" className="ms-2 flex-shrink-0">
                              Overdue
                            </CBadge>
                          ) : (
                            <CBadge color="warning" className="ms-2 flex-shrink-0" textColor="dark">
                              Pending
                            </CBadge>
                          )}
                        </div>

                        <div className="d-flex align-items-center gap-2 mb-3">
                          <span className="fs-5 fw-bold text-danger">
                            {formatAmount(item.amount)}
                          </span>
                        </div>

                        <div className="d-flex flex-column gap-1 mb-3">
                          <div className="d-flex align-items-center gap-2 text-body-secondary small">
                            <CIcon icon={cilClock} size="sm" />
                            <span>
                              Due: <strong className={overdue ? "text-danger" : ""}>{formatDate(item.due_date)}</strong>
                            </span>
                          </div>
                          {isAdmin && (
                            <div className="d-flex align-items-center gap-2 text-body-secondary small">
                              <CIcon icon={cilUser} size="sm" />
                              <span>{displayedEmployeeName(item)}</span>
                            </div>
                          )}
                          {item?.clients_snapshot?.location && (
                            <div className="text-body-secondary small">
                              {item.clients_snapshot.location}
                            </div>
                          )}
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                );
              })}
            </CRow>
          )}
        </CCol>
      </CRow>
    </div>
  );
};

export default PoPaymentBacklog;
