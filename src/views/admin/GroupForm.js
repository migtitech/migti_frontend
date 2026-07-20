import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Info, Settings2, StickyNote } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import groupService from "../../services/groupService";
import { ConfirmDialog, StatusToggle, FileUpload } from "../../components";
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
  Spinner,
} from "../../components/ui";
import useUnsavedChangesGuard from "../../hooks/useUnsavedChangesGuard";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { cn } from "../../lib/utils";

/**
 * Section anchor: an icon chip + title + short description used to visually
 * group each set of fields in the form scaffold (the shared "tile" system).
 */
const FormSection = ({ icon: Icon, title, description, first, children }) => (
  <div
    className={cn("mt-8 first:mt-0", !first && "border-t border-border pt-8")}
  >
    <div className="mb-5 flex items-start gap-3">
      {Icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary!" />
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    {children}
  </div>
);

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
          Back
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
              <FormSection
                icon={Info}
                title="Basic information"
                description="Name and auto-generated code for this group."
                first
              >
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
              </FormSection>

              <FormSection
                icon={Settings2}
                title="Configuration"
                description="Status and the icon shown across the app."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="Status" htmlFor="group-status">
                    <StatusToggle
                      id="group-status"
                      status={formData.status}
                      onCheckedChange={handleStatusToggle}
                      aria-label="Group status"
                      className="h-9 gap-3"
                    />
                  </FormField>
                  <FormField label="Group icon" htmlFor="group-icon">
                    <div className="space-y-3">
                      <FileUpload
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        hint="JPEG, PNG, GIF or WebP"
                        disabled={iconUploading || submitting}
                        onChange={handleIconChange}
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
              </FormSection>

              <FormSection
                icon={StickyNote}
                title="Additional details"
                description="Free-form notes about this group's scope."
              >
                <FormField label="Description" htmlFor="group-description">
                  <Textarea
                    id="group-description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the purpose or scope of this group…"
                  />
                </FormField>
              </FormSection>

              <div className="-mx-6 -mb-6 mt-8 flex items-center justify-end gap-2 rounded-b-xl border-t border-border bg-muted/30 px-6 py-4">
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
        title="Discard Unsaved Changes?"
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
