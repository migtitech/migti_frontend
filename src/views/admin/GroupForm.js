import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormTextarea,
  CFormSwitch,
  CAlert,
  CSpinner,
} from "@coreui/react";
import { useNavigate, useParams } from "react-router-dom";
import groupService from "../../services/groupService";
import { ConfirmDialog } from "../../components";
import {
  CrudFormPage,
  FormField,
  FormSkeleton,
} from "../../components/CrudFormPage";
import useUnsavedChangesGuard from "../../hooks/useUnsavedChangesGuard";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const GROUP_FORM_DRAFT_KEY = "group_form_draft";

const EMPTY_FORM = {
  name: "",
  code: "",
  description: "",
  status: "active",
  iconUrl: "",
};

const getDefaultFormData = (id) => {
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
          iconUrl: parsed.iconUrl || "",
        };
      }
    } catch {
      // ignore parse errors
    }
  }

  return { ...EMPTY_FORM };
};

const normalizeFormData = (data) => ({
  name: (data.name || "").trim(),
  code: data.code || "",
  description: (data.description || "").trim(),
  status: data.status || "active",
  iconUrl: data.iconUrl || "",
});

const GroupForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState(() => getDefaultFormData(id));
  const [iconDisplayUrl, setIconDisplayUrl] = useState("");
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return (
      JSON.stringify(normalizeFormData(formData)) !==
      JSON.stringify(normalizeFormData(initialData))
    );
  }, [formData, initialData]);

  const canSave = isEdit
    ? isDirty && !submitting
    : Boolean(formData.name.trim()) && !submitting;

  const { leaveConfirmVisible, requestNavigation, confirmLeave, cancelLeave } =
    useUnsavedChangesGuard(isDirty, submitting);

  useEffect(() => {
    if (!isEdit) {
      const baseData = getDefaultFormData();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GROUP_FORM_DRAFT_KEY);
      }
      setFormData(baseData);
      setIconDisplayUrl(baseData.iconUrl || "");
      setInitialData(baseData);
      setLoading(false);
      return;
    }

    const fetchGroup = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => groupService.getById(id));
        const group = res?.data || res;
        const loadedData = {
          name: group.name || "",
          code: group.code || "",
          description: group.description || "",
          status: group.status || "active",
          iconUrl: group.iconUrl || "",
        };
        setFormData(loadedData);
        setIconDisplayUrl(group.iconDisplayUrl || group.iconUrl || "");
        setInitialData(loadedData);
      } catch {
        setError("Failed to load group details");
        toastError("Failed to load group details");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id, isEdit]);

  const handleIconChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toastError("Please select an image file (JPEG, PNG, GIF, WebP)");
      return;
    }

    setIconUploading(true);
    try {
      const res = await groupService.uploadIcon(file);
      const data = res?.data?.data || res?.data || {};
      const url = data?.url;
      const displayUrl = data?.displayUrl || url;

      if (!url) {
        toastError("Icon upload failed");
        return;
      }

      setFormData((prev) => {
        const updated = { ...prev, iconUrl: url };

        if (typeof window !== "undefined" && !id) {
          try {
            window.localStorage.setItem(
              GROUP_FORM_DRAFT_KEY,
              JSON.stringify(normalizeFormData(updated)),
            );
          } catch {
            // ignore storage errors
          }
        }

        return updated;
      });
      setIconDisplayUrl(displayUrl || url);
      toastSuccess("Group icon uploaded");
    } catch (err) {
      toastError(err?.message || "Icon upload failed");
    } finally {
      setIconUploading(false);
    }
  };

  const handleRemoveIcon = () => {
    setFormData((prev) => {
      const updated = { ...prev, iconUrl: "" };

      if (typeof window !== "undefined" && !id) {
        try {
          window.localStorage.setItem(
            GROUP_FORM_DRAFT_KEY,
            JSON.stringify(normalizeFormData(updated)),
          );
        } catch {
          // ignore storage errors
        }
      }

      return updated;
    });
    setIconDisplayUrl("");
  };

  const handleStatusToggle = (checked) => {
    setFormData((prev) => {
      const updated = { ...prev, status: checked ? "active" : "inactive" };

      if (typeof window !== "undefined" && !id) {
        try {
          window.localStorage.setItem(
            GROUP_FORM_DRAFT_KEY,
            JSON.stringify(normalizeFormData(updated)),
          );
        } catch {
          // ignore storage errors
        }
      }

      return updated;
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (typeof window !== "undefined" && !id) {
        try {
          window.localStorage.setItem(
            GROUP_FORM_DRAFT_KEY,
            JSON.stringify(normalizeFormData(updated)),
          );
        } catch {
          // ignore storage errors
        }
      }

      return updated;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Group name is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError("");

    try {
      const { code: _omit, ...rest } = formData;
      const payload = {
        ...rest,
        iconUrl: formData.iconUrl || "",
      };
      if (isEdit) {
        await groupService.update(id, payload);
        toastSuccess("Group updated successfully");
      } else {
        await groupService.create(payload);
        toastSuccess("Group created successfully");
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GROUP_FORM_DRAFT_KEY);
      }
      setInitialData(formData);
      navigate("/groups");
    } catch (err) {
      toastError(err?.message || "Failed to save group");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = useCallback(() => {
    requestNavigation(() => navigate("/groups"));
  }, [navigate, requestNavigation]);

  const handleClearDraft = () => {
    setFormData({ ...EMPTY_FORM });
    setIconDisplayUrl("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(GROUP_FORM_DRAFT_KEY);
    }
    toastSuccess("Saved group form data cleared");
  };

  const pageTitle = isEdit ? "Edit Group" : "Add Group";

  return (
    <>
      <CrudFormPage
        title={pageTitle}
        actions={
          !isEdit ? (
            <CButton
              className="crud-form-btn crud-form-btn--secondary"
              color="secondary"
              variant="outline"
              onClick={handleClearDraft}
            >
              Clear saved data
            </CButton>
          ) : null
        }
      >
        {loading ? (
          <FormSkeleton />
        ) : (
          <>
            {error && (
              <CAlert
                className="mb-4"
                color="danger"
                dismissible
                onClose={() => setError("")}
              >
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              <section className="crud-form-section">
                <h2 className="crud-form-section__title">Basic information</h2>
                <CRow className="crud-form-grid">
                  <CCol xs={12} md={6}>
                    <FormField
                      label="Group name"
                      required
                      htmlFor="group-name"
                      error={fieldErrors.name}
                    >
                      <CFormInput
                        id="group-name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Industrial Supplies"
                        invalid={Boolean(fieldErrors.name)}
                        autoComplete="off"
                      />
                    </FormField>
                  </CCol>
                  <CCol xs={12} md={6}>
                    <FormField label="Group code" htmlFor="group-code">
                      <CFormInput
                        id="group-code"
                        name="code"
                        value={formData.code || ""}
                        placeholder={
                          isEdit ? "" : "Auto-generated (e.g. GRP01)"
                        }
                        readOnly
                        className="form-control--readonly"
                      />
                    </FormField>
                  </CCol>
                </CRow>
              </section>

              <section className="crud-form-section">
                <h2 className="crud-form-section__title">Configuration</h2>
                <CRow className="crud-form-grid">
                  <CCol xs={12} md={6}>
                    <div className="crud-form-field">
                      <label
                        className="crud-form-field__label"
                        htmlFor="group-status"
                      >
                        Status
                      </label>
                      <div className="crud-form-status-toggle">
                        <CFormSwitch
                          id="group-status"
                          checked={formData.status === "active"}
                          onChange={(event) =>
                            handleStatusToggle(event.target.checked)
                          }
                          aria-label="Group status"
                        />
                        <span
                          className={`crud-form-status-toggle__badge ${
                            formData.status === "active"
                              ? "crud-form-status-toggle__badge--active"
                              : "crud-form-status-toggle__badge--inactive"
                          }`}
                        >
                          {formData.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </CCol>
                  <CCol xs={12} md={6}>
                    <div className="crud-form-field">
                      <label
                        className="crud-form-field__label"
                        htmlFor="group-icon"
                      >
                        Group icon
                      </label>
                      <div className="crud-form-icon-upload">
                        {(iconDisplayUrl || formData.iconUrl) && (
                          <div className="crud-form-icon-upload__preview">
                            <img
                              className="crud-form-icon-upload__image"
                              src={iconDisplayUrl || formData.iconUrl}
                              alt=""
                            />
                            <div className="crud-form-icon-upload__actions">
                              <CButton
                                className="crud-form-btn crud-form-btn--secondary"
                                color="secondary"
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={handleRemoveIcon}
                                disabled={iconUploading || submitting}
                              >
                                Remove
                              </CButton>
                            </div>
                          </div>
                        )}
                        <CFormInput
                          id="group-icon"
                          className="crud-form-icon-upload__file-input"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleIconChange}
                          disabled={iconUploading || submitting}
                        />
                        {iconUploading && <CSpinner size="sm" />}
                      </div>
                    </div>
                  </CCol>
                </CRow>
              </section>

              <section className="crud-form-section">
                <h2 className="crud-form-section__title">Additional details</h2>
                <FormField label="Description" htmlFor="group-description">
                  <CFormTextarea
                    id="group-description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the purpose or scope of this group..."
                  />
                </FormField>
              </section>

              <footer className="crud-form-footer">
                <CButton
                  className="crud-form-btn crud-form-btn--secondary"
                  color="secondary"
                  variant="outline"
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </CButton>
                <CButton
                  className="crud-form-btn"
                  color="primary"
                  type="submit"
                  disabled={!canSave}
                >
                  {submitting ? (
                    <>
                      <CSpinner size="sm" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    "Save changes"
                  ) : (
                    "Create group"
                  )}
                </CButton>
              </footer>
            </CForm>
          </>
        )}
      </CrudFormPage>

      <ConfirmDialog
        visible={leaveConfirmVisible}
        onClose={cancelLeave}
        onConfirm={confirmLeave}
        title="Discard unsaved changes?"
        message="You have unsaved changes on this page. If you leave now, your edits will be lost."
        confirmText="Leave without saving"
        cancelText="Stay on page"
        confirmColor="danger"
        icon="warning"
      />
    </>
  );
};

export default GroupForm;
