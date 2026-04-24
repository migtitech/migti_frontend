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
import CIcon from "@coreui/icons-react";
import { cilReload } from "@coreui/icons";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import categoryService from "../../services/categoryService";
import groupService from "../../services/groupService";
import { Loader, SearchableDropdown } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const CATEGORY_FORM_DRAFT_KEY = "category_form_draft";

const CategoryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const parentFromQuery = searchParams.get("parent") || "";
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState(() => {
    if (typeof window !== "undefined" && !id) {
      try {
        const stored = window.localStorage.getItem(CATEGORY_FORM_DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            name: parsed.name || "",
            description: parsed.description || "",
            group: parsed.group || "",
            parent: parsed.parent || parentFromQuery || "",
            status: parsed.status || "active",
            categoryCode: parsed.categoryCode || "",
          };
        }
      } catch {
        // ignore parse errors
      }
    }

    return {
      name: "",
      description: "",
      group: "",
      parent: parentFromQuery || "",
      status: "active",
      categoryCode: "",
    };
  });

  const [groups, setGroups] = useState([]);
  const [rootCategories, setRootCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [groupsRefreshing, setGroupsRefreshing] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await groupService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data || res;
      setGroups(data?.groups || []);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  const refreshGroups = async () => {
    setGroupsRefreshing(true);
    try {
      await fetchGroups();
      toastSuccess("Groups refreshed");
    } catch (err) {
      toastError(err?.message || "Failed to refresh groups");
    } finally {
      setGroupsRefreshing(false);
    }
  };

  const fetchRootCategories = async () => {
    try {
      const res = await categoryService.getAll({
        pageNumber: 1,
        pageSize: 100,
        parent: "null",
      });
      const data = res?.data || res;
      setRootCategories(data?.categories || []);
    } catch (err) {
      console.error("Failed to fetch root categories", err);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchRootCategories();
  }, []);

  useEffect(() => {
    if (!isEdit) {
      // For new category, ensure parent from query param is respected if no draft
      setFormData((prev) => ({
        ...prev,
        parent: prev.parent || parentFromQuery || "",
      }));
      return;
    }

    const fetchCategory = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() => categoryService.getById(id));
        const category = res?.data || res;

        setFormData({
          name: category.name || "",
          description: category.description || "",
          group: category.group?._id || category.group || "",
          parent: category.parent?._id || category.parent || "",
          status: category.status || "active",
          sortOrder: category.sortOrder ?? 0,
          categoryCode: category.categoryCode || "",
        });
      } catch (err) {
        setError("Failed to load category details");
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id, isEdit, parentFromQuery]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (!id && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            CATEGORY_FORM_DRAFT_KEY,
            JSON.stringify({
              name: next.name || "",
              description: next.description || "",
              group: next.group || "",
              parent: next.parent || "",
              status: next.status || "active",
              categoryCode: next.categoryCode || "",
            }),
          );
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs = {};
    if (!formData.group) {
      errs.group = "Group is required";
    }
    const name = (formData.name || "").trim();
    if (!name) {
      errs.name = "Name is required";
    } else if (name.length < 2) {
      errs.name = "Name must be at least 2 characters";
    } else if (name.length > 100) {
      errs.name = "Name must be at most 100 characters";
    }
    if (formData.status && !["active", "inactive"].includes(formData.status)) {
      errs.status = "Status must be active or inactive";
    }
    const sortOrder = formData.sortOrder;
    if (sortOrder !== "" && sortOrder != null) {
      const n = Number(sortOrder);
      if (Number.isNaN(n) || n < 0) {
        errs.sortOrder = "Sort order must be 0 or more";
      }
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const { categoryCode, ...rest } = formData;
      const payload = {
        ...rest,
        group: formData.group || null,
        parent: formData.parent || null,
        sortOrder:
          rest.sortOrder !== "" && rest.sortOrder != null
            ? Number(rest.sortOrder)
            : undefined,
      };
      if (isEdit) {
        await categoryService.update(id, payload);
        toastSuccess("Category updated successfully");
      } else {
        await categoryService.create(payload);
        toastSuccess("Category created successfully");
      }
      if (!isEdit && typeof window !== "undefined") {
        window.localStorage.removeItem(CATEGORY_FORM_DRAFT_KEY);
      }
      navigate("/categories");
    } catch (err) {
      toastError(err?.message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader message="Loading category..." />
      </div>
    );
  }

  const title = isEdit
    ? "Edit Category"
    : parentFromQuery
      ? "Add Subcategory"
      : "Add Category";

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
                    description: "",
                    group: "",
                    parent: parentFromQuery || "",
                    status: "active",
                    categoryCode: "",
                  });
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(CATEGORY_FORM_DRAFT_KEY);
                  }
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
              {/* Row 0: Category Code (read-only, auto-generated) - visible only on edit */}
              {isEdit && (
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Category Code</CFormLabel>
                    <CFormInput
                      name="categoryCode"
                      value={formData.categoryCode || ""}
                      placeholder={formData.categoryCode ? "" : "—"}
                      readOnly
                      disabled
                      className="bg-light"
                    />
                  </CCol>
                </CRow>
              )}

              {/* Row 0.5: Group (select first before category) */}
              <CRow className="mb-3">
                <CCol md={6}>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <CFormLabel className="mb-0">Group</CFormLabel>
                    <CButton
                      color="secondary"
                      variant="ghost"
                      size="sm"
                      onClick={refreshGroups}
                      disabled={groupsRefreshing}
                      title="Refresh groups list"
                      aria-label="Refresh groups"
                    >
                      {groupsRefreshing ? (
                        <CSpinner size="sm" />
                      ) : (
                        <CIcon icon={cilReload} />
                      )}
                    </CButton>
                  </div>
                  <SearchableDropdown
                    options={groups}
                    value={formData.group}
                    onChange={(val) => {
                      setFormData((prev) => ({ ...prev, group: val || "" }));
                      if (fieldErrors.group)
                        setFieldErrors((prev) => ({
                          ...prev,
                          group: undefined,
                        }));
                    }}
                    placeholder="Select Group (required)"
                    maxDisplayCount={5}
                    getOptionLabel={(grp) =>
                      `${grp.name || ""}${grp.code ? ` (${grp.code})` : ""}`
                    }
                    getOptionValue={(grp) => grp._id}
                  />
                  {fieldErrors.group && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.group}
                    </div>
                  )}
                  <small className="text-muted">
                    Search and select a group. Best 5 matches shown. Click the
                    refresh icon to reload groups.
                  </small>
                </CCol>
              </CRow>

              {/* Row 1: Name + Parent Category */}
              <CRow className="mb-3">
                <CCol md={6} className="mb-3 mb-md-0">
                  <CFormLabel>Name *</CFormLabel>
                  <CFormInput
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    invalid={!!fieldErrors.name}
                  />
                  {fieldErrors.name && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.name}
                    </div>
                  )}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Parent Category</CFormLabel>
                  <SearchableDropdown
                    options={rootCategories}
                    value={formData.parent}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, parent: val || "" }))
                    }
                    placeholder="None (Root Category)"
                    maxDisplayCount={5}
                    getOptionLabel={(cat) =>
                      `${cat.name || ""}${
                        cat.categoryCode ? ` (${cat.categoryCode})` : ""
                      }`
                    }
                    getOptionValue={(cat) => cat._id}
                  />
                  <small className="text-muted">
                    Search within root categories. Leave empty for a root
                    category.
                  </small>
                </CCol>
              </CRow>

              {/* Row 2: Status */}
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Status</CFormLabel>
                  <CFormSelect
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    invalid={!!fieldErrors.status}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </CFormSelect>
                  {fieldErrors.status && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.status}
                    </div>
                  )}
                </CCol>
              </CRow>

              {/* Row 3: Description (full width) */}
              <div className="mb-4">
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter category description..."
                />
              </div>

              {/* Row 4: Actions */}
              <div className="d-flex justify-content-end gap-2 pt-2">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate("/categories")}
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
                    "Update Category"
                  ) : (
                    "Create Category"
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

export default CategoryForm;
