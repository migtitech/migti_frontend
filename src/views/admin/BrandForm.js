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
import brandService from "../../services/brandService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import "../../components/CrudFormPage/CrudFormPage.scss";

const BrandForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
    iconUrl: "",
  });
  const [iconDisplayUrl, setIconDisplayUrl] = useState("");
  const [iconUploading, setIconUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;

    const fetchBrand = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() => brandService.getById(id));
        const brand = res?.data || res;

        setFormData({
          name: brand.name || "",
          description: brand.description || "",
          status: brand.status || "active",
          iconUrl: brand.iconUrl || "",
        });
        setIconDisplayUrl(brand.iconDisplayUrl || brand.iconUrl || "");
      } catch (err) {
        toastError("Failed to load brand details");
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const name = (formData.name || "").trim();
    if (!name) {
      errors.name = "Brand name is required";
    } else if (name.length < 2) {
      errors.name = "Brand name must be at least 2 characters";
    } else if (name.length > 100) {
      errors.name = "Brand name must be at most 100 characters";
    }

    if (!formData.status) {
      errors.status = "Status is required";
    } else if (!["active", "inactive"].includes(formData.status)) {
      errors.status = "Status must be active or inactive";
    }

    const description = (formData.description || "").trim();
    if (!description) {
      errors.description = "Description is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
      const res = await brandService.uploadIcon(file);
      const data = res?.data?.data || res?.data || {};
      const url = data?.url;
      const displayUrl = data?.displayUrl || url;

      if (!url) {
        toastError("Icon upload failed");
        return;
      }

      setFormData((prev) => ({ ...prev, iconUrl: url }));
      setIconDisplayUrl(displayUrl || url);
      toastSuccess("Brand icon uploaded");
    } catch (err) {
      toastError(err?.message || "Icon upload failed");
    } finally {
      setIconUploading(false);
    }
  };

  const handleRemoveIcon = () => {
    setFormData((prev) => ({ ...prev, iconUrl: "" }));
    setIconDisplayUrl("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        iconUrl: formData.iconUrl || "",
      };

      if (isEdit) {
        await brandService.update(id, payload);
        toastSuccess("Brand updated successfully");
      } else {
        await brandService.create(payload);
        toastSuccess("Brand created successfully");
      }
      navigate("/brands");
    } catch (err) {
      toastError(err?.message || "Failed to save brand");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader message="Loading brand..." />
      </div>
    );
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>{isEdit ? "Edit Brand" : "Add Brand"}</strong>
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
                  <CFormLabel>
                    Brand name <span className="text-danger">*</span>
                  </CFormLabel>
                  <CFormInput
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    invalid={!!fieldErrors.name}
                  />
                  {fieldErrors.name && (
                    <div className="text-danger small mt-1">
                      {fieldErrors.name}
                    </div>
                  )}
                </CCol>
                <CCol md={6}>
                  <CFormLabel>
                    Status <span className="text-danger">*</span>
                  </CFormLabel>
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

              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel htmlFor="brand-icon">Brand icon</CFormLabel>
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
                      id="brand-icon"
                      className="crud-form-icon-upload__file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleIconChange}
                      disabled={iconUploading || submitting}
                    />
                    {iconUploading && <CSpinner size="sm" />}
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
                  placeholder="Enter brand description..."
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
                  onClick={() => navigate("/brands")}
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
                    "Update Brand"
                  ) : (
                    "Create Brand"
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

export default BrandForm;
