import React, { useState, useEffect } from "react";
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
  CAlert,
  CSpinner,
} from "@coreui/react";
import { useNavigate, useParams } from "react-router-dom";
import groupService from "../../services/groupService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const GROUP_FORM_DRAFT_KEY = "group_form_draft";

const GroupForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState(() => {
    // For "new" group, try to restore draft from localStorage
    if (typeof window !== "undefined" && !id) {
      try {
        const stored = window.localStorage.getItem(GROUP_FORM_DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            name: parsed.name || "",
            code: parsed.code || "",
            description: parsed.description || "",
            status: parsed.status || "active",
          };
        }
      } catch (e) {
        // ignore parse errors and fall back to defaults
      }
    }

    return {
      name: "",
      code: "",
      description: "",
      status: "active",
    };
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load data for edit mode
  useEffect(() => {
    if (!isEdit) {
      const baseData = {
        name: "",
        code: "",
        description: "",
        status: "active",
      };

      // Clear any saved draft when starting a fresh "new" form
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GROUP_FORM_DRAFT_KEY);
      }

      setFormData(baseData);
      return;
    }

    const fetchGroup = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() => groupService.getById(id));
        const group = res?.data || res;

        setFormData({
          name: group.name || "",
          code: group.code || "",
          description: group.description || "",
          status: group.status || "active",
        });
      } catch (err) {
        setError("Failed to load group details");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]:
          name === "sortOrder"
            ? value === ""
              ? 0
              : parseInt(value, 10)
            : value,
      };

      // Persist draft only for "new" group (no id)
      if (typeof window !== "undefined" && !id) {
        try {
          window.localStorage.setItem(
            GROUP_FORM_DRAFT_KEY,
            JSON.stringify({
              name: updated.name || "",
              code: updated.code || "",
              description: updated.description || "",
              status: updated.status || "active",
            }),
          );
        } catch (e) {
          // ignore storage errors
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const { code: _omit, ...rest } = formData;
      const payload = { ...rest };
      if (isEdit) {
        await groupService.update(id, payload);
        toastSuccess("Group updated successfully");
      } else {
        await groupService.create(payload);
        toastSuccess("Group created successfully");
      }
      // On successful save, clear any draft and navigate
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GROUP_FORM_DRAFT_KEY);
      }
      navigate("/groups");
    } catch (err) {
      toastError(err?.message || "Failed to save group");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader message="Loading group..." />
      </div>
    );
  }

  const title = isEdit ? "Edit Group" : "Add Group";

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>{title}</strong>
            {!isEdit && (
              <CButton
                color="secondary"
                size="sm"
                variant="outline"
                onClick={() => {
                  setFormData({
                    name: "",
                    code: "",
                    description: "",
                    status: "active",
                  });
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(GROUP_FORM_DRAFT_KEY);
                  }
                  toastSuccess("Saved group form data cleared");
                }}
              >
                Clear saved data
              </CButton>
            )}
          </CCardHeader>

          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError("")}>
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              <CRow className="mb-3">
                <CCol md={6} className="mb-3 mb-md-0">
                  <CFormLabel>Name *</CFormLabel>
                  <CFormInput
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Code</CFormLabel>
                  <CFormInput
                    name="code"
                    value={formData.code || ""}
                    placeholder={isEdit ? "" : "Auto-generated (e.g. GRP01)"}
                    readOnly
                    disabled
                    className="bg-light"
                  />
                  {!isEdit && (
                    <small className="text-muted">
                      Generated by the server on save.
                    </small>
                  )}
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Status</CFormLabel>
                  <CFormSelect
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              <div className="mb-4">
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter group description..."
                />
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate("/groups")}
                >
                  Cancel
                </CButton>
                <CButton color="primary" type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    "Update Group"
                  ) : (
                    "Create Group"
                  )}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default GroupForm;
