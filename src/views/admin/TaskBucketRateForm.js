import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilSave } from "@coreui/icons";
import * as yup from "yup";
import taskManagementService from "../../services/taskManagementService";
import { Loader } from "../../components";
import { toastError, toastSuccess } from "../../utils/toast";

const rateSchema = yup.object({
  supplierName: yup.string().trim().required("Shop name is required"),
  contactName: yup.string().trim().required("Contact person is required"),
  contactPhone: yup
    .string()
    .required("Contact phone is required")
    .matches(/^\d{10}$/, "Contact phone must be 10 digits"),
  rate: yup
    .number()
    .typeError("Rate must be a number")
    .positive("Rate must be a positive number")
    .required("Rate is required"),
  remark: yup.string().trim().required("Remark is required"),
});

const TaskBucketRateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [form, setForm] = useState({
    supplierName: "",
    contactName: "",
    contactPhone: "",
    rate: "",
    remark: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await taskManagementService.getById(id);
        const data = res?.data?.data ?? res?.data;
        setTaskTitle(data?.title || "");
        const supplier = data?.supplierInfo || {};
        setForm({
          supplierName: supplier.supplierName || "",
          contactName: supplier.contactName || "",
          contactPhone: supplier.contactPhone || "",
          rate: supplier.rate != null ? String(supplier.rate) : "",
          remark: supplier.remark || "",
        });
      } catch (err) {
        toastError(err?.message || "Failed to load task");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;
    // Validate with Yup
    try {
      const casted = await rateSchema.validate(form, { abortEarly: false });
      setErrors({});
      // Use casted values (trimmed, numeric)
      setSubmitting(true);
      try {
        const payload = {
          supplierName: casted.supplierName,
          contactName: casted.contactName,
          contactPhone: casted.contactPhone,
          rate: casted.rate,
          remark: casted.remark,
        };
        await taskManagementService.updateSupplier(id, payload);
        toastSuccess("Supplier details & rate saved");
        navigate(`/task-bucket/${id}`);
      } catch (err) {
        toastError(
          err?.response?.data?.message || err?.message || "Failed to save rate",
        );
      } finally {
        setSubmitting(false);
      }
    } catch (validationError) {
      if (validationError.inner) {
        const fieldErrors = {};
        validationError.inner.forEach((ve) => {
          if (ve.path && !fieldErrors[ve.path]) {
            fieldErrors[ve.path] = ve.message;
          }
        });
        setErrors(fieldErrors);
      }
      toastError("Please fix validation errors");
    }
  };

  if (loading) {
    return <Loader message="Loading task..." />;
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center">
            <CButton
              color="link"
              variant="ghost"
              className="me-2 p-0"
              onClick={() => navigate(`/task-bucket/${id}`)}
            >
              <CIcon icon={cilArrowLeft} size="lg" />
            </CButton>
            <div>
              <strong>Add Supplier Rate</strong>
              {taskTitle && (
                <div className="small text-muted mt-1">
                  Task: <span className="fw-semibold">{taskTitle}</span>
                </div>
              )}
            </div>
          </CCardHeader>
          <CCardBody>
            <CForm onSubmit={handleSubmit}>
              <CRow className="g-3">
                <CCol md={6}>
                  <CFormLabel>Shop Name</CFormLabel>
                  <CFormInput
                    value={form.supplierName}
                    onChange={(e) =>
                      handleChange("supplierName", e.target.value)
                    }
                    placeholder="Shop name"
                  />
                  {errors.supplierName && (
                    <div className="text-danger small mt-1">
                      {errors.supplierName}
                    </div>
                  )}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Contact Person</CFormLabel>
                  <CFormInput
                    value={form.contactName}
                    onChange={(e) =>
                      handleChange("contactName", e.target.value)
                    }
                    placeholder="Contact person name"
                  />
                  {errors.contactName && (
                    <div className="text-danger small mt-1">
                      {errors.contactName}
                    </div>
                  )}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Contact Phone</CFormLabel>
                  <CFormInput
                    value={form.contactPhone}
                    onChange={(e) =>
                      handleChange("contactPhone", e.target.value)
                    }
                    placeholder="Phone number"
                  />
                  {errors.contactPhone && (
                    <div className="text-danger small mt-1">
                      {errors.contactPhone}
                    </div>
                  )}
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Rate</CFormLabel>
                  <CFormInput
                    type="number"
                    min={0}
                    step="any"
                    value={form.rate}
                    onChange={(e) => handleChange("rate", e.target.value)}
                    placeholder="0"
                  />
                </CCol>
                <CCol md={8}>
                  <CFormLabel>Remark</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={form.remark}
                    onChange={(e) => handleChange("remark", e.target.value)}
                    placeholder="Supplier / rate remark"
                  />
                  {errors.remark && (
                    <div className="text-danger small mt-1">
                      {errors.remark}
                    </div>
                  )}
                </CCol>
                <CCol xs={12} className="d-flex gap-2">
                  <CButton type="submit" color="primary" disabled={submitting}>
                    {submitting ? "Saving..." : "Save"}
                    <CIcon icon={cilSave} className="ms-2" />
                  </CButton>
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    onClick={() => navigate(`/task-bucket/${id}`)}
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

export default TaskBucketRateForm;
