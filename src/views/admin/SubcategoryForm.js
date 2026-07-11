import React, { useState, useEffect, useRef } from "react";
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
  CFormSwitch,
  CAlert,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilTrash } from "@coreui/icons";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import subcategoryService from "../../services/subcategoryService";
import categoryService from "../../services/categoryService";
import { Loader, SearchableDropdown } from "../../components";
import "../../components/CrudFormPage/CrudFormPage.scss";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const SUBCATEGORY_FORM_DRAFT_KEY = "subcategory_form_draft";

const countWords = (text) =>
  (text || "").trim().split(/\s+/).filter(Boolean).length;

const SubcategoryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const categoryFromQuery = searchParams.get("category") || "";
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState(() => {
    if (typeof window !== "undefined" && !id) {
      try {
        const stored = window.localStorage.getItem(SUBCATEGORY_FORM_DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            category: parsed.category || categoryFromQuery || "",
            name: parsed.name || "",
            description: parsed.description || "",
            status: parsed.status || "active",
            image: parsed.image || "",
          };
        }
      } catch {
        // ignore parse errors
      }
    }

    return {
      category: categoryFromQuery || "",
      name: "",
      description: "",
      status: "active",
      image: "",
    };
  });

  const [imageDisplayUrl, setImageDisplayUrl] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const imageInputRef = useRef(null);

  const hasSubcategoryImage = Boolean(imageDisplayUrl || formData.image);

  const persistDraft = (next) => {
    if (!id && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          SUBCATEGORY_FORM_DRAFT_KEY,
          JSON.stringify({
            category: next.category || "",
            name: next.name || "",
            description: next.description || "",
            status: next.status || "active",
            image: next.image || "",
          }),
        );
      } catch {
        // ignore storage errors
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getAll({
        pageNumber: 1,
        pageSize: 100,
        parent: "null",
      });
      const data = res?.data || res;
      const inner = data?.data ?? data;
      setCategories(inner?.categories || []);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    const fetchSubcategory = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          subcategoryService.getById(id),
        );
        const subcategory = res?.data || res;

        setFormData({
          category: subcategory.category?._id || subcategory.category || "",
          name: subcategory.name || "",
          description: subcategory.description || "",
          status: subcategory.status || "active",
          image: subcategory.image || "",
        });
        setImageDisplayUrl(
          subcategory.imageDisplayUrl || subcategory.image || "",
        );
      } catch {
        setError("Failed to load subcategory details");
      } finally {
        setLoading(false);
      }
    };

    fetchSubcategory();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      persistDraft(next);
      return next;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleStatusToggle = (checked) => {
    setFormData((prev) => {
      const next = { ...prev, status: checked ? "active" : "inactive" };
      persistDraft(next);
      return next;
    });
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toastError("Please select an image file (JPEG, PNG, GIF, WebP)");
      return;
    }

    setImageUploading(true);
    try {
      const res = await subcategoryService.uploadImage(file);
      const data = res?.data?.data || res?.data || {};
      const url = data?.url;
      const displayUrl = data?.displayUrl || url;

      if (!url) {
        toastError("Image upload failed");
        return;
      }

      setFormData((prev) => {
        const next = { ...prev, image: url };
        persistDraft(next);
        return next;
      });
      setImageDisplayUrl(displayUrl || url);
      toastSuccess("Subcategory image uploaded");
    } catch (err) {
      toastError(err?.message || "Image upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => {
      const next = { ...prev, image: "" };
      persistDraft(next);
      return next;
    });
    setImageDisplayUrl("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs = {};
    if (!formData.category) {
      errs.category = "Category is required";
    }
    const name = (formData.name || "").trim();
    if (!name) {
      errs.name = "Name is required";
    } else if (name.length < 2) {
      errs.name = "Name must be at least 2 characters";
    } else if (name.length > 100) {
      errs.name = "Name must be at most 100 characters";
    }
    if (!formData.status) {
      errs.status = "Status is required";
    } else if (!["active", "inactive"].includes(formData.status)) {
      errs.status = "Status must be active or inactive";
    }
    const description = (formData.description || "").trim();
    if (!description) {
      errs.description = "Description is required";
    } else if (countWords(description) > 200) {
      errs.description = "Description must be at most 200 words";
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: formData.category,
        name,
        description,
        status: formData.status,
        image: formData.image || "",
      };
      if (isEdit) {
        await subcategoryService.update(id, payload);
        toastSuccess("Subcategory updated successfully");
      } else {
        await subcategoryService.create(payload);
        toastSuccess("Subcategory created successfully");
      }
      if (!isEdit && typeof window !== "undefined") {
        window.localStorage.removeItem(SUBCATEGORY_FORM_DRAFT_KEY);
      }
      navigate("/subcategories");
    } catch (err) {
      toastError(err?.message || "Failed to save subcategory");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader message="Loading subcategory..." />
      </div>
    );
  }

  const title = isEdit ? "Edit Subcategory" : "Add Subcategory";

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
                    category: "",
                    name: "",
                    description: "",
                    status: "active",
                    image: "",
                  });
                  setImageDisplayUrl("");
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(SUBCATEGORY_FORM_DRAFT_KEY);
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
              <CRow className="mb-3 g-3 align-items-start">
                <CCol md={6} className="mb-3 mb-md-0">
                  <CFormLabel>
                    Category <span className="text-danger">*</span>
                  </CFormLabel>
                  <SearchableDropdown
                    options={categories}
                    value={formData.category}
                    onChange={(val) => {
                      setFormData((prev) => {
                        const next = { ...prev, category: val || "" };
                        persistDraft(next);
                        return next;
                      });
                      if (fieldErrors.category) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          category: undefined,
                        }));
                      }
                    }}
                    placeholder="Select category"
                    maxDisplayCount={10}
                    invalid={!!fieldErrors.category}
                    getOptionLabel={(cat) =>
                      `${cat.name || ""}${cat.categoryCode ? ` (${cat.categoryCode})` : ""}`
                    }
                    getOptionValue={(cat) => cat._id}
                  />
                  {fieldErrors.category && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.category}
                    </div>
                  )}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>
                    Name <span className="text-danger">*</span>
                  </CFormLabel>
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
              </CRow>

              <CRow className="mb-3 g-3">
                <CCol md={6}>
                  <div className="crud-form-field">
                    <label
                      className="crud-form-field__label"
                      htmlFor="subcategory-status"
                    >
                      Status <span className="text-danger">*</span>
                    </label>
                    <div className="crud-form-status-toggle">
                      <CFormSwitch
                        id="subcategory-status"
                        checked={formData.status === "active"}
                        onChange={(event) =>
                          handleStatusToggle(event.target.checked)
                        }
                        aria-label="Subcategory status"
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
                    {fieldErrors.status && (
                      <div className="text-danger small mt-1">
                        {fieldErrors.status}
                      </div>
                    )}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="crud-form-field">
                    <label
                      className="crud-form-field__label"
                      htmlFor="subcategory-image"
                    >
                      Subcategory image
                    </label>
                    <div className="crud-form-icon-upload__preview">
                      {hasSubcategoryImage ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-link p-0 border-0 flex-shrink-0"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={imageUploading || submitting}
                            aria-label="Change subcategory image"
                          >
                            <img
                              className="crud-form-icon-upload__image"
                              src={imageDisplayUrl || formData.image}
                              alt=""
                            />
                          </button>
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="p-1 ms-auto flex-shrink-0"
                            onClick={handleRemoveImage}
                            disabled={imageUploading || submitting}
                            aria-label="Remove subcategory image"
                          >
                            <CIcon icon={cilTrash} size="sm" />
                          </CButton>
                        </>
                      ) : (
                        <CFormInput
                          id="subcategory-image"
                          className="crud-form-icon-upload__file-input border-0 bg-transparent shadow-none"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageChange}
                          disabled={imageUploading || submitting}
                        />
                      )}
                      <input
                        ref={imageInputRef}
                        className="d-none"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        disabled={imageUploading || submitting}
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                      {imageUploading && (
                        <CSpinner size="sm" className="flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </CCol>
              </CRow>

              <div className="mb-4">
                <CFormLabel>
                  Description <span className="text-danger">*</span>
                </CFormLabel>
                <CFormTextarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter subcategory description..."
                  invalid={!!fieldErrors.description}
                />
                {fieldErrors.description && (
                  <div className="text-danger small mt-1">
                    {fieldErrors.description}
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate("/subcategories")}
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
                    "Update Subcategory"
                  ) : (
                    "Create Subcategory"
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

export default SubcategoryForm;
