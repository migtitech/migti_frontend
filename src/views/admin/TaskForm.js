import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CImage,
  CInputGroup,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilSend } from "@coreui/icons";
import taskManagementService from "../../services/taskManagementService";
import employeeService from "../../services/employeeService";
import documentService from "../../services/documentService";
import useBranchContext from "../../hooks/useBranchContext";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
import { toastSuccess, toastError } from "../../utils/toast";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const TaskForm = () => {
  const navigate = useNavigate();
  const { branchId: userBranchId } = useBranchContext();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [form, setForm] = useState({
    title: "",
    productInfo: {
      name: "",
      hsn: "",
      gst: "",
      modelNumber: "",
      description: "",
      image: null,
    },
    remark: "",
    targetRate: "",
    dueDate: "",
    priority: "medium",
    employeeId: "",
  });
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { pageSize: 100 };
        if (userBranchId) params.branchId = userBranchId;
        const empRes = await employeeService.getAll(params);
        const empData = empRes?.data?.data ?? empRes?.data;
        setEmployees(empData?.employees ?? []);
      } catch (err) {
        toastError(err?.message || "Failed to load employees");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userBranchId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductInfoChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      productInfo: { ...prev.productInfo, [field]: value },
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setProductImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toastError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      let imageId = form.productInfo?.image || null;
      if (productImageFile) {
        const uploadRes = await documentService.uploadImages([
          productImageFile,
        ]);
        const docs =
          uploadRes?.data?.data?.documents ?? uploadRes?.data?.documents ?? [];
        if (docs.length > 0) imageId = docs[0]._id ?? docs[0].id;
      }
      const payload = {
        title: form.title.trim(),
        employeeId: form.employeeId || undefined,
        productInfo: {
          name: form.productInfo?.name ?? "",
          hsn: form.productInfo?.hsn ?? "",
          gst: form.productInfo?.gst ? Number(form.productInfo.gst) : null,
          modelNumber: form.productInfo?.modelNumber ?? "",
          description: form.productInfo?.description ?? "",
          image: imageId,
        },
        remark: form.remark?.trim() ?? "",
        targetRate: form.targetRate ? Number(form.targetRate) : null,
        dueDate: form.dueDate || null,
        priority: form.priority || "medium",
      };
      await taskManagementService.create(payload);
      toastSuccess("Task created successfully");
      navigate("/task-dashboard");
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to create task",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="Loading..." />;

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center">
            <CButton
              color="link"
              variant="ghost"
              className="me-2 p-0"
              onClick={() => navigate("/task-dashboard")}
            >
              <CIcon icon={cilArrowLeft} size="lg" />
            </CButton>
            <strong>Create Task</strong>
          </CCardHeader>
          <CCardBody>
            <CForm onSubmit={handleSubmit}>
              <CRow className="g-3">
                <CCol md={12}>
                  <CFormLabel>Title *</CFormLabel>
                  <CFormInput
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Task title"
                    required
                  />
                </CCol>

                <CCol md={12}>
                  <CFormLabel>Assign Employee</CFormLabel>
                  <CFormSelect
                    value={form.employeeId}
                    onChange={(e) => handleChange("employeeId", e.target.value)}
                    aria-label="Assign employee"
                  >
                    <option value="">– Select employee –</option>
                    {employees.map((emp) => (
                      <option key={emp._id || emp.id} value={emp._id || emp.id}>
                        {emp.name}{" "}
                        {emp.designation ? `(${emp.designation})` : ""}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol xs={12}>
                  <hr className="my-2" />
                  <strong className="text-muted">Product Information</strong>
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Product Name</CFormLabel>
                  <CFormInput
                    value={form.productInfo?.name ?? ""}
                    onChange={(e) =>
                      handleProductInfoChange("name", e.target.value)
                    }
                    placeholder="Product name"
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>HSN</CFormLabel>
                  <CFormInput
                    value={form.productInfo?.hsn ?? ""}
                    onChange={(e) =>
                      handleProductInfoChange("hsn", e.target.value)
                    }
                    placeholder="HSN code"
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>GST %</CFormLabel>
                  <CFormInput
                    type="number"
                    min={0}
                    max={100}
                    value={form.productInfo?.gst ?? ""}
                    onChange={(e) =>
                      handleProductInfoChange("gst", e.target.value)
                    }
                    placeholder="0"
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Model Number</CFormLabel>
                  <CFormInput
                    value={form.productInfo?.modelNumber ?? ""}
                    onChange={(e) =>
                      handleProductInfoChange("modelNumber", e.target.value)
                    }
                    placeholder="Model number"
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Product Image</CFormLabel>
                  <CInputGroup>
                    <CFormInput
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </CInputGroup>
                  {(productImagePreview ||
                    (form.productInfo?.image && !productImageFile)) && (
                    <div className="mt-2">
                      {productImagePreview ? (
                        <CImage
                          src={productImagePreview}
                          thumbnail
                          width={80}
                          height={80}
                        />
                      ) : form.productInfo?.image &&
                        typeof form.productInfo.image === "object" &&
                        form.productInfo.image?.path ? (
                        <CImage
                          src={getAssetsUrl(form.productInfo.image.path)}
                          thumbnail
                          width={80}
                          height={80}
                        />
                      ) : null}
                    </div>
                  )}
                </CCol>
                <CCol xs={12}>
                  <CFormLabel>Description</CFormLabel>
                  <CFormTextarea
                    value={form.productInfo?.description ?? ""}
                    onChange={(e) =>
                      handleProductInfoChange("description", e.target.value)
                    }
                    placeholder="Product description"
                    rows={2}
                  />
                </CCol>

                <CCol xs={12}>
                  <hr className="my-2" />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Target Rate</CFormLabel>
                  <CFormInput
                    type="number"
                    min={0}
                    step="any"
                    value={form.targetRate ?? ""}
                    onChange={(e) => handleChange("targetRate", e.target.value)}
                    placeholder="0"
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Due Date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={form.dueDate ?? ""}
                    onChange={(e) => handleChange("dueDate", e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Priority</CFormLabel>
                  <CFormSelect
                    value={form.priority}
                    onChange={(e) => handleChange("priority", e.target.value)}
                    aria-label="Priority"
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12}>
                  <CFormLabel>Remark</CFormLabel>
                  <CFormTextarea
                    value={form.remark ?? ""}
                    onChange={(e) => handleChange("remark", e.target.value)}
                    placeholder="Remarks"
                    rows={2}
                  />
                </CCol>

                <CCol xs={12} className="d-flex gap-2">
                  <CButton type="submit" color="primary" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Task"}
                    <CIcon icon={cilSend} className="ms-2" />
                  </CButton>
                  <CButton
                    type="button"
                    color="secondary"
                    onClick={() => navigate("/task-dashboard")}
                  >
                    Cancel
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default TaskForm;
