import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import groupService from "../../services/groupService";
import { ConfirmDialog, StatusBadge } from "../../components";
import {
  CrudFormPage,
  FormField,
  FormSkeleton,
} from "../../components/CrudFormPage";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Textarea,
  Switch,
  Spinner,
} from "../../components/ui";
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
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Button>
      </div>

      <CrudFormPage
        title={pageTitle}
        actions={
          !isEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearDraft}
            >
              Clear saved data
            </Button>
          ) : null
        }
      >
        {loading ? (
          <FormSkeleton />
        ) : (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Basic information
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    label="Group name"
                    required
                    htmlFor="group-name"
                    error={fieldErrors.name}
                  >
                    <Input
                      id="group-name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Industrial Supplies"
                      aria-invalid={Boolean(fieldErrors.name)}
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField label="Group code" htmlFor="group-code">
                    <Input
                      id="group-code"
                      name="code"
                      value={formData.code || ""}
                      placeholder={isEdit ? "" : "Auto-generated (e.g. GRP01)"}
                      readOnly
                      className="bg-muted"
                    />
                  </FormField>
                </div>
              </section>

              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Configuration
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="Status" htmlFor="group-status">
                    <div className="flex h-9 items-center gap-3">
                      <Switch
                        id="group-status"
                        checked={formData.status === "active"}
                        onCheckedChange={handleStatusToggle}
                        aria-label="Group status"
                      />
                      <StatusBadge
                        status={
                          formData.status === "active" ? "Active" : "Inactive"
                        }
                      />
                    </div>
                  </FormField>
                  <FormField label="Group icon" htmlFor="group-icon">
                    <div className="space-y-3">
                      <Input
                        id="group-icon"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleIconChange}
                        disabled={iconUploading || submitting}
                        className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
                      />
                      {(iconDisplayUrl || formData.iconUrl) && (
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-3">
                          <img
                            src={iconDisplayUrl || formData.iconUrl}
                            alt=""
                            style={{
                              maxHeight: 80,
                              maxWidth: 160,
                              objectFit: "contain",
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveIcon}
                            disabled={iconUploading || submitting}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      {iconUploading && <Spinner size="sm" />}
                    </div>
                  </FormField>
                </div>
              </section>

              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Additional details
                </h2>
                <FormField label="Description" htmlFor="group-description">
                  <Textarea
                    id="group-description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the purpose or scope of this group..."
                  />
                </FormField>
              </section>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSave}>
                  {submitting ? (
                    <Spinner size="sm" />
                  ) : isEdit ? (
                    "Save changes"
                  ) : (
                    "Create group"
                  )}
                </Button>
              </div>
            </form>
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
