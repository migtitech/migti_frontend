import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTabContent,
  CTabPane,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CNav,
  CNavItem,
  CNavLink,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilClipboard,
  cilFilter,
  cilList,
  cilPeople,
  cilSpeedometer,
  cilPencil,
} from "@coreui/icons";
import purchaseTaskService from "../../services/purchaseTaskService";
import employeeService from "../../services/employeeService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { useAuth, ROLES } from "../../context/AuthContext";

const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  SETTLED: "settled",
};

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: TASK_STATUS.PENDING, label: "Pending" },
  { value: TASK_STATUS.IN_PROGRESS, label: "In Progress" },
  { value: TASK_STATUS.SUBMITTED, label: "Submitted" },
  { value: TASK_STATUS.SETTLED, label: "Settled" },
];

const getStatusBadge = (status) => {
  switch (status) {
    case TASK_STATUS.PENDING:
      return <CBadge color="warning">Pending</CBadge>;
    case TASK_STATUS.IN_PROGRESS:
      return <CBadge color="primary">In Progress</CBadge>;
    case TASK_STATUS.SUBMITTED:
      return <CBadge color="info">Submitted</CBadge>;
    case TASK_STATUS.SETTLED:
      return <CBadge color="success">Settled</CBadge>;
    default:
      return <CBadge color="secondary">{status || "Pending"}</CBadge>;
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount)))
    return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const PurchaseTasks = () => {
  const { user } = useAuth();
  const query = useQuery();
  const viewParam = query.get("view");

  const isAdminLike =
    user?.role === ROLES.ADMIN ||
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.HEAD_OF_DEPARTMENT;

  const initialTab = useMemo(() => {
    if (viewParam === "rate") return "rate";
    if (viewParam === "admin" && isAdminLike) return "admin";
    // Admin-like users should default to admin tracking
    if (isAdminLike) return "admin";
    return "purchase";
  }, [viewParam, isAdminLike]);

  const [activeTab, setActiveTab] = useState(initialTab);

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const [adminTasks, setAdminTasks] = useState([]);
  const [adminPagination, setAdminPagination] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminStatusFilter, setAdminStatusFilter] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState("");
  const [adminEmployeeFilter, setAdminEmployeeFilter] = useState("");
  const [employees, setEmployees] = useState([]);

  const [remarkModalTask, setRemarkModalTask] = useState(null);
  const [remarkValue, setRemarkValue] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);
  const [targetRateModalTask, setTargetRateModalTask] = useState(null);
  const [targetRateValue, setTargetRateValue] = useState("");
  const [savingTargetRate, setSavingTargetRate] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseTaskService.getMyTasks({
          pageNumber: 1,
          pageSize: 50,
          status: statusFilter || undefined,
        }),
      );
      const data = res?.data || res;
      const result = data?.data ?? data;
      setTasks(result?.tasks || []);
      setPagination(result?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load tasks");
      setTasks([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRateBucket = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseTaskService.getRateBucket({
          pageNumber: 1,
          pageSize: 50,
          status: statusFilter || undefined,
        }),
      );
      const data = res?.data || res;
      const result = data?.data ?? data;
      setTasks(result?.tasks || []);
      setPagination(result?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load rate bucket data");
      setTasks([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminTasks = async () => {
    if (!isAdminLike) return;
    setAdminLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseTaskService.adminList({
          pageNumber: 1,
          pageSize: 50,
          status: adminStatusFilter || undefined,
          role: adminRoleFilter || undefined,
          employeeId: adminEmployeeFilter || undefined,
        }),
      );
      const data = res?.data || res;
      const result = data?.data ?? data;
      setAdminTasks(result?.tasks || []);
      setAdminPagination(result?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load tasks for admin view");
      setAdminTasks([]);
      setAdminPagination(null);
    } finally {
      setAdminLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeeService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data || res;
      const result = data?.data ?? data;
      const list = result?.employees || result?.items || result || [];
      setEmployees(list);
    } catch {
      setEmployees([]);
    }
  };

  useEffect(() => {
    if (activeTab === "purchase") {
      loadTasks();
    } else if (activeTab === "rate") {
      loadRateBucket();
    } else if (activeTab === "admin") {
      if (employees.length === 0) {
        loadEmployees();
      }
      loadAdminTasks();
    }
  }, [
    activeTab,
    statusFilter,
    adminStatusFilter,
    adminRoleFilter,
    adminEmployeeFilter,
  ]);

  const handleStatusChange = async (task, newStatus) => {
    if (!newStatus || newStatus === task.status) return;
    try {
      await purchaseTaskService.updateStatus(
        task._id || task.id,
        newStatus,
        task.targetRate,
      );
      toastSuccess("Task status updated");
      if (activeTab === "admin") {
        loadAdminTasks();
      } else if (activeTab === "rate") {
        loadRateBucket();
      } else {
        loadTasks();
      }
    } catch (err) {
      toastError(err?.message || "Failed to update task status");
    }
  };

  const openRemarkModal = (task) => {
    setRemarkModalTask(task);
    setRemarkValue(task.supplierRateRemark || "");
  };

  const closeRemarkModal = () => {
    setRemarkModalTask(null);
    setRemarkValue("");
  };

  const handleSaveRemark = async () => {
    if (!remarkModalTask) return;
    setSavingRemark(true);
    try {
      await purchaseTaskService.updateRemark(
        remarkModalTask._id || remarkModalTask.id,
        remarkValue,
      );
      toastSuccess("Supplier rate remark updated");
      closeRemarkModal();
      if (activeTab === "admin") {
        loadAdminTasks();
      } else if (activeTab === "rate") {
        loadRateBucket();
      } else {
        loadTasks();
      }
    } catch (err) {
      toastError(err?.message || "Failed to update remark");
    } finally {
      setSavingRemark(false);
    }
  };

  const openTargetRateModal = (task) => {
    setTargetRateModalTask(task);
    setTargetRateValue(task.targetRate != null ? String(task.targetRate) : "");
  };

  const closeTargetRateModal = () => {
    setTargetRateModalTask(null);
    setTargetRateValue("");
  };

  const handleSaveTargetRate = async () => {
    if (!targetRateModalTask) return;
    const task = targetRateModalTask;
    const value = targetRateValue === "" ? null : Number(targetRateValue);
    setSavingTargetRate(true);
    try {
      // reuse updateStatus endpoint by sending current status and new targetRate
      await purchaseTaskService.updateStatus(
        task._id || task.id,
        task.status || "",
        value,
      );
      toastSuccess("Target rate updated");
      closeTargetRateModal();
      // reload current view
      if (activeTab === "admin") {
        loadAdminTasks();
      } else if (activeTab === "rate") {
        loadRateBucket();
      } else {
        loadTasks();
      }
    } catch (err) {
      toastError(err?.message || "Failed to update target rate");
    } finally {
      setSavingTargetRate(false);
    }
  };

  const renderTaskRow = (task, index, showAssignee = false) => {
    const quotation = task.quotationId || task.quotation || {};
    const companyName =
      quotation.companyInfo?.name ||
      quotation.customerName ||
      quotation.companyName ||
      "-";

    return (
      <CTableRow key={task._id || task.id || index}>
        <CTableDataCell>{index + 1}</CTableDataCell>
        <CTableDataCell>
          <strong>
            {quotation.quotationCode ||
              (quotation._id || quotation.id
                ? `QT-${String(quotation._id || quotation.id)
                    .slice(-4)
                    .padStart(4, "0")}`
                : "-")}
          </strong>
        </CTableDataCell>
        <CTableDataCell>
          <strong>
            {Array.isArray(quotation.products) && quotation.products.length > 0
              ? quotation.products[0].productName || "-"
              : "-"}
          </strong>
        </CTableDataCell>
        <CTableDataCell>
          <strong>{companyName}</strong>
        </CTableDataCell>
        <CTableDataCell>
          <strong>{task.productCategory || "-"}</strong>
        </CTableDataCell>
        <CTableDataCell>
          <strong>{task.productGroup || "-"}</strong>
        </CTableDataCell>
        <CTableDataCell>
          <strong>{task.subCategory || "-"}</strong>
        </CTableDataCell>
        <CTableDataCell
          style={{ verticalAlign: "middle", whiteSpace: "nowrap" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                background:
                  task.targetRate != null
                    ? "rgba(16, 185, 129, 0.08)"
                    : "transparent",
                color: task.targetRate != null ? "#065f46" : undefined,
                fontWeight: task.targetRate != null ? 600 : 400,
              }}
            >
              {formatCurrency(task.targetRate)}
            </div>
            {(user?.role === ROLES.PURCHASE_MANAGER ||
              user?.role === ROLES.PURCHASE_EXICUTIVE) && (
              <CButton
                color="secondary"
                variant="ghost"
                size="sm"
                title="Edit Target Rate"
                onClick={() => openTargetRateModal(task)}
              >
                <CIcon icon={cilPencil} />
              </CButton>
            )}
          </div>
        </CTableDataCell>
        <CTableDataCell>
          <CFormSelect
            size="sm"
            value={task.status || TASK_STATUS.PENDING}
            onChange={(e) => handleStatusChange(task, e.target.value)}
          >
            {statusOptions
              .filter((o) => o.value)
              .map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
          </CFormSelect>
          <div className="mt-1">{getStatusBadge(task.status)}</div>
        </CTableDataCell>
        {showAssignee && (
          <CTableDataCell>
            <div>
              <strong>{task.assignedTo?.name || "-"}</strong>
            </div>
            {task.assignedTo?.designation && (
              <div className="small text-muted">
                {task.assignedTo.designation}
              </div>
            )}
          </CTableDataCell>
        )}
        <CTableDataCell>
          <div className="small mb-2">
            {task.supplierRateRemark ? (
              <span>{task.supplierRateRemark}</span>
            ) : (
              <span className="text-muted">No remark</span>
            )}
          </div>
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            onClick={() => openRemarkModal(task)}
          >
            Update Remark
          </CButton>
        </CTableDataCell>
        <CTableDataCell>{formatDate(task.createdAt)}</CTableDataCell>
      </CTableRow>
    );
  };

  const renderTasksTable = (items, showAssignee = false) => (
    <CTable hover responsive bordered>
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell>S No</CTableHeaderCell>
          <CTableHeaderCell>Quotation</CTableHeaderCell>
          <CTableHeaderCell>Product</CTableHeaderCell>
          <CTableHeaderCell>Company</CTableHeaderCell>
          <CTableHeaderCell>Product Category</CTableHeaderCell>
          <CTableHeaderCell>Product Group</CTableHeaderCell>
          <CTableHeaderCell>Subcategory</CTableHeaderCell>
          <CTableHeaderCell>Target Rate</CTableHeaderCell>
          <CTableHeaderCell>Status</CTableHeaderCell>
          {showAssignee && <CTableHeaderCell>Assigned To</CTableHeaderCell>}
          <CTableHeaderCell>Supplier Rate Remark</CTableHeaderCell>
          <CTableHeaderCell>Created</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {items && items.length > 0 ? (
          items.map((task, index) => renderTaskRow(task, index, showAssignee))
        ) : (
          <CTableRow>
            <CTableDataCell
              colSpan={showAssignee ? 12 : 11}
              className="text-center"
            >
              No tasks found.
            </CTableDataCell>
          </CTableRow>
        )}
      </CTableBody>
    </CTable>
  );

  const uniqueRoles = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.role) set.add(e.role);
    });
    return Array.from(set);
  }, [employees]);

  return (
    <>
      <CRow className="mb-3">
        <CCol className="d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-1">Purchase Tasks</h4>
            <p className="text-muted mb-0">
              Manage quotation-based purchase tasks, rate bucket, and admin
              tracking.
            </p>
          </div>
          <div className="d-flex gap-2">
            <CBadge color="primary" className="d-flex align-items-center">
              <CIcon icon={cilSpeedometer} className="me-2" />
              Total Tasks: {pagination?.totalItems ?? tasks.length}
            </CBadge>
            {isAdminLike && (
              <CBadge color="info" className="d-flex align-items-center">
                <CIcon icon={cilPeople} className="me-2" />
                Admin View
              </CBadge>
            )}
          </div>
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardHeader>
          <CNav variant="tabs" role="tablist">
            {isAdminLike ? (
              <CNavItem>
                <CNavLink
                  active={activeTab === "admin"}
                  onClick={() => setActiveTab("admin")}
                  style={{ cursor: "pointer" }}
                >
                  <CIcon icon={cilFilter} className="me-2" />
                  Admin Tracking
                </CNavLink>
              </CNavItem>
            ) : (
              <>
                <CNavItem>
                  <CNavLink
                    active={activeTab === "purchase"}
                    onClick={() => setActiveTab("purchase")}
                    style={{ cursor: "pointer" }}
                  >
                    <CIcon icon={cilClipboard} className="me-2" />
                    Purchase Task
                  </CNavLink>
                </CNavItem>
                {/* Rate Bucket visible only to purchase roles */}
                {(user?.role === ROLES.PURCHASE_MANAGER ||
                  user?.role === ROLES.PURCHASE_EXICUTIVE) && (
                  <CNavItem>
                    <CNavLink
                      active={activeTab === "rate"}
                      onClick={() => setActiveTab("rate")}
                      style={{ cursor: "pointer" }}
                    >
                      <CIcon icon={cilList} className="me-2" />
                      Rate Bucket
                    </CNavLink>
                  </CNavItem>
                )}
              </>
            )}
          </CNav>
        </CCardHeader>
        <CCardBody>
          <CTabContent>
            <CTabPane visible={activeTab === "purchase"}>
              <CRow className="mb-3">
                <CCol md={3}>
                  <CFormLabel>Status</CFormLabel>
                  <CFormSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="sm"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>
              {loading ? (
                <Loader message="Loading tasks..." />
              ) : (
                renderTasksTable(tasks)
              )}
            </CTabPane>

            <CTabPane visible={activeTab === "rate"}>
              <CRow className="mb-3">
                <CCol md={3}>
                  <CFormLabel>Status</CFormLabel>
                  <CFormSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    size="sm"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>
              {loading ? (
                <Loader message="Loading rate bucket data..." />
              ) : (
                renderTasksTable(tasks)
              )}
            </CTabPane>

            <CTabPane visible={activeTab === "admin"}>
              {isAdminLike ? (
                <>
                  <CRow className="mb-3">
                    <CCol md={3}>
                      <CFormLabel>Status</CFormLabel>
                      <CFormSelect
                        value={adminStatusFilter}
                        onChange={(e) => setAdminStatusFilter(e.target.value)}
                        size="sm"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Role</CFormLabel>
                      <CFormSelect
                        value={adminRoleFilter}
                        onChange={(e) => setAdminRoleFilter(e.target.value)}
                        size="sm"
                      >
                        <option value="">All Roles</option>
                        {uniqueRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel>Employee</CFormLabel>
                      <CFormSelect
                        value={adminEmployeeFilter}
                        onChange={(e) => setAdminEmployeeFilter(e.target.value)}
                        size="sm"
                      >
                        <option value="">All Employees</option>
                        {employees.map((e) => (
                          <option key={e._id || e.id} value={e._id || e.id}>
                            {e.name || e.email}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  </CRow>
                  {adminLoading ? (
                    <Loader message="Loading admin tasks..." />
                  ) : (
                    renderTasksTable(adminTasks, true)
                  )}
                </>
              ) : (
                <div className="text-muted">
                  You do not have access to the admin view.
                </div>
              )}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      <CModal visible={!!remarkModalTask} onClose={closeRemarkModal}>
        <CModalHeader>
          <CModalTitle>Update Supplier Rate Remark</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Remark</CFormLabel>
            <CFormInput
              type="text"
              value={remarkValue}
              onChange={(e) => setRemarkValue(e.target.value)}
              placeholder="Enter supplier rate remark"
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={closeRemarkModal}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleSaveRemark}
            disabled={savingRemark}
          >
            {savingRemark ? "Saving..." : "Save"}
          </CButton>
        </CModalFooter>
      </CModal>
      <CModal visible={!!targetRateModalTask} onClose={closeTargetRateModal}>
        <CModalHeader>
          <CModalTitle>Update Target Rate</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Target Rate (INR)</CFormLabel>
            <CFormInput
              type="number"
              min={0}
              value={targetRateValue}
              onChange={(e) => setTargetRateValue(e.target.value)}
              placeholder="Enter target rate"
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={closeTargetRateModal}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleSaveTargetRate}
            disabled={savingTargetRate}
          >
            {savingTargetRate ? "Saving..." : "Save"}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default PurchaseTasks;
