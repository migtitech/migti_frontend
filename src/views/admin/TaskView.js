import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CBadge,
  CListGroup,
  CListGroupItem,
  CFormSelect,
  CFormInput,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CImage,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilUser } from "@coreui/icons";
import taskManagementService from "../../services/taskManagementService";
import employeeService from "../../services/employeeService";
import useBranchContext from "../../hooks/useBranchContext";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
import { toastSuccess, toastError } from "../../utils/toast";

const getStatusBadge = (status) => {
  switch (status) {
    case "draft":
      return <CBadge color="secondary">Draft</CBadge>;
    case "assigned":
      return <CBadge color="info">Assigned</CBadge>;
    case "submitted":
      return <CBadge color="success">Submitted</CBadge>;
    default:
      return <CBadge color="secondary">{status || "–"}</CBadge>;
  }
};

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "string")
    return img.startsWith("http") ? img : getAssetsUrl(img);
  if (img?.path)
    return img.path.startsWith("http") ? img.path : getAssetsUrl(img.path);
  return "";
};

const TaskView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { branchId: userBranchId } = useBranchContext();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    productName: "",
    hsn: "",
    gst: "",
    modelNumber: "",
    description: "",
    remark: "",
    targetRate: "",
    dueDate: "",
    priority: "",
  });

  useEffect(() => {
    const fetchTask = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await taskManagementService.getById(id);
        const data = res?.data?.data ?? res?.data;
        setTask(data);
        setForm({
          title: data?.title || "",
          productName: data?.productInfo?.name || "",
          hsn: data?.productInfo?.hsn || "",
          gst:
            data?.productInfo?.gst != null &&
            !Number.isNaN(Number(data.productInfo.gst))
              ? String(data.productInfo.gst)
              : "",
          modelNumber: data?.productInfo?.modelNumber || "",
          description: data?.productInfo?.description || "",
          remark: data?.remark || "",
          targetRate:
            data?.targetRate != null && !Number.isNaN(Number(data.targetRate))
              ? String(data.targetRate)
              : "",
          dueDate: data?.dueDate ? data.dueDate.slice(0, 10) : "",
          priority: data?.priority || "",
        });
      } catch (err) {
        toastError(err?.message || "Failed to load task");
        setTask(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const params = { pageSize: 100 };
        if (userBranchId) params.branchId = userBranchId;
        const res = await employeeService.getAll(params);
        const data = res?.data?.data ?? res?.data;
        setEmployees(data?.employees ?? []);
      } catch {
        setEmployees([]);
      }
    };
    if (assignModalVisible) fetchEmployees();
  }, [assignModalVisible, userBranchId]);

  const handleAssign = async () => {
    if (!assignEmployeeId) {
      toastError("Please select an employee");
      return;
    }
    setAssigning(true);
    try {
      await taskManagementService.assignEmployee(id, assignEmployeeId);
      const res = await taskManagementService.getById(id);
      setTask(res?.data?.data ?? res?.data);
      setAssignModalVisible(false);
      setAssignEmployeeId("");
      toastSuccess("Employee assigned successfully");
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to assign",
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!task?._id && !id) return;
    if (!form.title.trim()) {
      toastError("Title is required");
      return;
    }
    setSaving(true);
    try {
      await taskManagementService.update(id, {
        title: form.title.trim(),
        productInfo: {
          name: form.productName || "",
          hsn: form.hsn || "",
          gst: form.gst ? Number(form.gst) : null,
          modelNumber: form.modelNumber || "",
          description: form.description || "",
        },
        remark: form.remark || "",
        targetRate: form.targetRate ? Number(form.targetRate) : null,
        dueDate: form.dueDate || null,
        priority: form.priority || "",
      });
      const res = await taskManagementService.getById(id);
      const data = res?.data?.data ?? res?.data;
      setTask(data);
      setEditing(false);
      toastSuccess("Task updated");
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to update task",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader message="Loading task..." />;
  if (!task) return null;

  const productImg = task.productInfo?.image;
  const canAssign = task.status !== "submitted";

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <CButton
                color="link"
                variant="ghost"
                className="me-2 p-0"
                onClick={() => navigate("/task-dashboard")}
              >
                <CIcon icon={cilArrowLeft} size="lg" />
              </CButton>
              <strong>{task.title || "Task"}</strong>
              <span className="ms-2">{getStatusBadge(task.status)}</span>
            </div>
            <div className="d-flex gap-2">
              {canAssign && (
                <CButton
                  color="primary"
                  size="sm"
                  onClick={() => setAssignModalVisible(true)}
                >
                  <CIcon icon={cilUser} className="me-1" />
                  Assign Employee
                </CButton>
              )}
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => setEditing((prev) => !prev)}
              >
                {editing ? "Cancel Edit" : "Edit"}
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol md={6}>
                <CListGroup className="mb-3">
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Title</span>
                    {editing ? (
                      <CFormInput
                        size="sm"
                        value={form.title}
                        onChange={(e) =>
                          handleFormChange("title", e.target.value)
                        }
                      />
                    ) : (
                      <strong>{task.title || "–"}</strong>
                    )}
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Status</span>
                    {getStatusBadge(task.status)}
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Priority</span>
                    <span className="text-capitalize">
                      {task.priority || "–"}
                    </span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Assigned To</span>
                    {task.employeeId ? (
                      <span>
                        {task.employeeId.name}
                        {task.employeeId.designation && (
                          <small className="d-block text-muted">
                            {task.employeeId.designation}
                          </small>
                        )}
                        {task.employeeId.email && (
                          <small className="d-block text-muted">
                            {task.employeeId.email}
                          </small>
                        )}
                      </span>
                    ) : (
                      "–"
                    )}
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Branch</span>
                    <span>
                      {task.branchId?.name || task.branchId?.address || "–"}
                    </span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Target Rate</span>
                    {editing ? (
                      <CFormInput
                        size="sm"
                        type="number"
                        min={0}
                        value={form.targetRate}
                        onChange={(e) =>
                          handleFormChange("targetRate", e.target.value)
                        }
                      />
                    ) : (
                      <span>
                        {task.targetRate != null
                          ? `₹${Number(task.targetRate).toLocaleString()}`
                          : "–"}
                      </span>
                    )}
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Due Date</span>
                    {editing ? (
                      <CFormInput
                        size="sm"
                        type="date"
                        value={form.dueDate}
                        onChange={(e) =>
                          handleFormChange("dueDate", e.target.value)
                        }
                      />
                    ) : (
                      <span>
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString()
                          : "–"}
                      </span>
                    )}
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Assigned Date</span>
                    <span>
                      {task.assignedDate
                        ? new Date(task.assignedDate).toLocaleString()
                        : "–"}
                    </span>
                  </CListGroupItem>
                  <CListGroupItem className="d-flex justify-content-between">
                    <span className="text-muted">Submission Date</span>
                    <span>
                      {task.submissionDate
                        ? new Date(task.submissionDate).toLocaleString()
                        : "–"}
                    </span>
                  </CListGroupItem>
                  <CListGroupItem>
                    <span className="text-muted d-block mb-1">Remark</span>
                    {editing ? (
                      <CFormTextarea
                        rows={2}
                        value={form.remark}
                        onChange={(e) =>
                          handleFormChange("remark", e.target.value)
                        }
                      />
                    ) : (
                      <span>{task.remark || "–"}</span>
                    )}
                  </CListGroupItem>
                  {(task.supplierInfo?.rate != null ||
                    task.supplierInfo?.supplierName ||
                    task.supplierInfo?.remark) && (
                    <>
                      <CListGroupItem className="d-flex justify-content-between">
                        <span className="text-muted">Rate</span>
                        <span>
                          {task.supplierInfo?.rate != null
                            ? `₹${Number(task.supplierInfo.rate).toLocaleString()}`
                            : "–"}
                        </span>
                      </CListGroupItem>
                      {task.supplierInfo?.supplierName && (
                        <CListGroupItem className="d-flex justify-content-between">
                          <span className="text-muted">Shop Name</span>
                          <span>{task.supplierInfo.supplierName}</span>
                        </CListGroupItem>
                      )}
                      {task.supplierInfo?.contactName && (
                        <CListGroupItem className="d-flex justify-content-between">
                          <span className="text-muted">Contact Name</span>
                          <span>{task.supplierInfo.contactName}</span>
                        </CListGroupItem>
                      )}
                      {task.supplierInfo?.contactPhone && (
                        <CListGroupItem className="d-flex justify-content-between">
                          <span className="text-muted">Contact Phone</span>
                          <span>{task.supplierInfo.contactPhone}</span>
                        </CListGroupItem>
                      )}
                      {task.supplierInfo?.remark && (
                        <CListGroupItem>
                          <span className="text-muted d-block mb-1">
                            Supplier Remark
                          </span>
                          <span>{task.supplierInfo.remark}</span>
                        </CListGroupItem>
                      )}
                    </>
                  )}
                </CListGroup>
              </CCol>
              <CCol md={6}>
                <CCard className="mb-3">
                  <CCardHeader className="py-2">
                    <strong>Product Information</strong>
                  </CCardHeader>
                  <CCardBody>
                    {productImg && getImageUrl(productImg) && (
                      <div className="mb-3">
                        <CImage
                          src={getImageUrl(productImg)}
                          thumbnail
                          style={{ maxHeight: 160, objectFit: "contain" }}
                        />
                      </div>
                    )}
                    <CListGroup flush>
                      <CListGroupItem className="d-flex justify-content-between">
                        <span className="text-muted">Name</span>
                        {editing ? (
                          <CFormInput
                            size="sm"
                            value={form.productName}
                            onChange={(e) =>
                              handleFormChange("productName", e.target.value)
                            }
                          />
                        ) : (
                          <span>{task.productInfo?.name || "–"}</span>
                        )}
                      </CListGroupItem>
                      <CListGroupItem className="d-flex justify-content-between">
                        <span className="text-muted">HSN</span>
                        {editing ? (
                          <CFormInput
                            size="sm"
                            value={form.hsn}
                            onChange={(e) =>
                              handleFormChange("hsn", e.target.value)
                            }
                          />
                        ) : (
                          <span>{task.productInfo?.hsn || "–"}</span>
                        )}
                      </CListGroupItem>
                      <CListGroupItem className="d-flex justify-content-between">
                        <span className="text-muted">GST %</span>
                        {editing ? (
                          <CFormInput
                            size="sm"
                            type="number"
                            min={0}
                            max={100}
                            value={form.gst}
                            onChange={(e) =>
                              handleFormChange("gst", e.target.value)
                            }
                          />
                        ) : (
                          <span>
                            {task.productInfo?.gst != null
                              ? task.productInfo.gst
                              : "–"}
                          </span>
                        )}
                      </CListGroupItem>
                      <CListGroupItem className="d-flex justify-content-between">
                        <span className="text-muted">Model Number</span>
                        {editing ? (
                          <CFormInput
                            size="sm"
                            value={form.modelNumber}
                            onChange={(e) =>
                              handleFormChange("modelNumber", e.target.value)
                            }
                          />
                        ) : (
                          <span>{task.productInfo?.modelNumber || "–"}</span>
                        )}
                      </CListGroupItem>
                      <CListGroupItem>
                        <span className="text-muted d-block mb-1">
                          Description
                        </span>
                        {editing ? (
                          <CFormTextarea
                            rows={2}
                            value={form.description}
                            onChange={(e) =>
                              handleFormChange("description", e.target.value)
                            }
                          />
                        ) : (
                          <span>{task.productInfo?.description || "–"}</span>
                        )}
                      </CListGroupItem>
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
            {editing && (
              <div className="mt-3 d-flex justify-content-end gap-2">
                <CButton
                  color="primary"
                  size="sm"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </CButton>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal
        alignment="center"
        visible={assignModalVisible}
        onClose={() => setAssignModalVisible(false)}
      >
        <CModalHeader>
          <CModalTitle>Assign Employee</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormSelect
            value={assignEmployeeId}
            onChange={(e) => setAssignEmployeeId(e.target.value)}
            aria-label="Select employee"
          >
            <option value="">– Select employee –</option>
            {employees.map((emp) => (
              <option key={emp._id || emp.id} value={emp._id || emp.id}>
                {emp.name} {emp.designation ? `(${emp.designation})` : ""}
              </option>
            ))}
          </CFormSelect>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setAssignModalVisible(false)}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleAssign}
            disabled={assigning || !assignEmployeeId}
          >
            {assigning ? "Assigning..." : "Assign"}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  );
};

export default TaskView;
