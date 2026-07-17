import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import brandService from "../../services/brandService";
import { Loader, CrudFormPage, FormField } from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Textarea,
  Select,
  Spinner,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

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
      <div className="text-center p-5">
        <Loader message="Loading brand..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/brands")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Button>
      </div>

      <CrudFormPage title={isEdit ? "Edit Brand" : "Add Brand"}>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Brand name" required error={fieldErrors.name}>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.name}
            />
          </FormField>

          <FormField label="Status" required error={fieldErrors.status}>
            <Select
              name="status"
              value={formData.status}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.status}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Brand icon"
              htmlFor="brand-icon"
              helper={iconUploading ? "Uploading to S3..." : undefined}
            >
              <div className="space-y-3">
                <Input
                  id="brand-icon"
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
              </div>
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField
              label="Description"
              required
              error={fieldErrors.description}
            >
              <Textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter brand description..."
                aria-invalid={!!fieldErrors.description}
              />
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/brands")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update Brand"
            ) : (
              "Create Brand"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default BrandForm;
