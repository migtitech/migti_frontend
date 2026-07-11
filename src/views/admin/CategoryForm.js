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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilTrash, cilPlus } from "@coreui/icons";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import categoryService from "../../services/categoryService";
import groupService from "../../services/groupService";
import { Loader, SearchableDropdown, StatusLabel } from "../../components";
import MapBrandModal from "../../components/MapBrandModal/MapBrandModal";
import "../../components/CrudFormPage/CrudFormPage.scss";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const CATEGORY_FORM_DRAFT_KEY = "category_form_draft";

const countWords = (text) =>
  (text || "").trim().split(/\s+/).filter(Boolean).length;

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
            image: parsed.image || "",
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
      image: "",
    };
  });

  const [imageDisplayUrl, setImageDisplayUrl] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [mappedBrands, setMappedBrands] = useState([]);
  const [mapBrandModalVisible, setMapBrandModalVisible] = useState(false);
  const iconInputRef = useRef(null);

  const hasCategoryIcon = Boolean(imageDisplayUrl || formData.image);

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

  useEffect(() => {
    fetchGroups();
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
          image: category.image || "",
        });
        setImageDisplayUrl(category.imageDisplayUrl || category.image || "");
        setMappedBrands(category.brands || []);
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
              image: next.image || "",
            }),
          );
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleStatusToggle = (checked) => {
    setFormData((prev) => {
      const next = { ...prev, status: checked ? "active" : "inactive" };
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
              image: next.image || "",
            }),
          );
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

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
      const res = await categoryService.uploadIcon(file);
      const data = res?.data?.data || res?.data || {};
      const url = data?.url;
      const displayUrl = data?.displayUrl || url;

      if (!url) {
        toastError("Icon upload failed");
        return;
      }

      setFormData((prev) => {
        const next = { ...prev, image: url };
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
                image: next.image || "",
              }),
            );
          } catch {
            // ignore storage errors
          }
        }
        return next;
      });
      setImageDisplayUrl(displayUrl || url);
      toastSuccess("Category icon uploaded");
    } catch (err) {
      toastError(err?.message || "Icon upload failed");
    } finally {
      setIconUploading(false);
    }
  };

  const handleRemoveIcon = () => {
    setFormData((prev) => {
      const next = { ...prev, image: "" };
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
              image: "",
            }),
          );
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
    setImageDisplayUrl("");
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
        description,
        group: formData.group || null,
        parent: formData.parent || null,
        image: formData.image || "",
        brandIds: mappedBrands.map((brand) => brand._id),
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

  const handleAddMappedBrand = (brand) => {
    if (!brand?._id) return;
    setMappedBrands((prev) => {
      if (prev.some((item) => item._id === brand._id)) return prev;
      return [...prev, brand];
    });
  };

  const handleRemoveMappedBrand = (brandId) => {
    setMappedBrands((prev) => prev.filter((brand) => brand._id !== brandId));
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
                    image: "",
                  });
                  setImageDisplayUrl("");
                  setMappedBrands([]);
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
              {/* Row 1: Group + Name */}
              <CRow className="mb-3 g-3 align-items-start">
                <CCol md={6} className="mb-3 mb-md-0">
                  <CFormLabel>
                    Group <span className="text-danger">*</span>
                  </CFormLabel>
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
                    placeholder="Select group"
                    maxDisplayCount={10}
                    invalid={!!fieldErrors.group}
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

              {/* Row 2: Status + Category icon */}
              <CRow className="mb-3 g-3">
                <CCol md={6}>
                  <div className="crud-form-field">
                    <label
                      className="crud-form-field__label"
                      htmlFor="category-status"
                    >
                      Status <span className="text-danger">*</span>
                    </label>
                    <div className="crud-form-status-toggle">
                      <CFormSwitch
                        id="category-status"
                        checked={formData.status === "active"}
                        onChange={(event) =>
                          handleStatusToggle(event.target.checked)
                        }
                        aria-label="Category status"
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
                      htmlFor="category-icon"
                    >
                      Category icon
                    </label>
                    <div className="crud-form-icon-upload__preview">
                      {hasCategoryIcon ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-link p-0 border-0 flex-shrink-0"
                            onClick={() => iconInputRef.current?.click()}
                            disabled={iconUploading || submitting}
                            aria-label="Change category icon"
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
                            onClick={handleRemoveIcon}
                            disabled={iconUploading || submitting}
                            aria-label="Remove category icon"
                          >
                            <CIcon icon={cilTrash} size="sm" />
                          </CButton>
                        </>
                      ) : (
                        <CFormInput
                          id="category-icon"
                          className="crud-form-icon-upload__file-input border-0 bg-transparent shadow-none"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleIconChange}
                          disabled={iconUploading || submitting}
                        />
                      )}
                      <input
                        ref={iconInputRef}
                        className="d-none"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleIconChange}
                        disabled={iconUploading || submitting}
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                      {iconUploading && (
                        <CSpinner size="sm" className="flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </CCol>
              </CRow>

              {/* Row 3: Description (full width) */}
              <div className="mb-4">
                <CFormLabel>
                  Description <span className="text-danger">*</span>
                </CFormLabel>
                <CFormTextarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter category description..."
                  invalid={!!fieldErrors.description}
                />
                {fieldErrors.description && (
                  <div className="text-danger small mt-1">
                    {fieldErrors.description}
                  </div>
                )}
              </div>

              {/* Row 4: Map Brand */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <CFormLabel className="mb-0">Map Brand</CFormLabel>
                  <CButton
                    color="primary"
                    size="sm"
                    type="button"
                    onClick={() => setMapBrandModalVisible(true)}
                  >
                    <CIcon icon={cilPlus} className="me-1" />
                    Add Brand
                  </CButton>
                </div>

                {mappedBrands.length > 0 ? (
                  <CTable hover responsive className="mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Name</CTableHeaderCell>
                        <CTableHeaderCell>Description</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">
                          Actions
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {mappedBrands.map((brand) => (
                        <CTableRow key={brand._id}>
                          <CTableDataCell className="fw-semibold">
                            {brand.name}
                          </CTableDataCell>
                          <CTableDataCell>
                            {brand.description || "—"}
                          </CTableDataCell>
                          <CTableDataCell>
                            <StatusLabel status={brand.status} />
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => handleRemoveMappedBrand(brand._id)}
                              aria-label={`Remove ${brand.name}`}
                            >
                              <CIcon icon={cilTrash} size="sm" />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                ) : (
                  <div className="border rounded p-3 text-body-secondary">
                    No brands mapped yet.
                  </div>
                )}
              </div>

              {/* Row 5: Actions */}
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

            <MapBrandModal
              visible={mapBrandModalVisible}
              onClose={() => setMapBrandModalVisible(false)}
              onAdd={handleAddMappedBrand}
              mappedBrandIds={mappedBrands.map((brand) => brand._id)}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default CategoryForm;
