import React, { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import subcategoryService from "../../services/subcategoryService";
import categoryService from "../../services/categoryService";
import {
  Loader,
  SearchableDropdown,
  StatusBadge,
  CrudFormPage,
  FormField,
} from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Textarea,
  Switch,
  Spinner,
} from "../../components/ui";
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
      <div className="text-center p-5">
        <Loader message="Loading subcategory..." />
      </div>
    );
  }

  const title = isEdit ? "Edit Subcategory" : "Add Subcategory";

  return (
    <CrudFormPage
      title={title}
      actions={
        !isEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
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
          </Button>
        )
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Category */}
          <FormField label="Category" required error={fieldErrors.category}>
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
          </FormField>

          {/* Name */}
          <FormField label="Name" required error={fieldErrors.name}>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              aria-invalid={!!fieldErrors.name}
            />
          </FormField>

          {/* Status */}
          <FormField label="Status" required error={fieldErrors.status}>
            <div className="flex h-9 items-center gap-3">
              <Switch
                id="subcategory-status"
                checked={formData.status === "active"}
                onCheckedChange={handleStatusToggle}
                aria-label="Subcategory status"
              />
              <StatusBadge
                status={formData.status === "active" ? "Active" : "Inactive"}
              />
            </div>
          </FormField>

          {/* Subcategory image */}
          <FormField label="Subcategory image" htmlFor="subcategory-image">
            <div className="flex items-center gap-3">
              {hasSubcategoryImage ? (
                <>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-border p-0"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={imageUploading || submitting}
                    aria-label="Change subcategory image"
                  >
                    <img
                      className="h-12 w-12 rounded-md object-contain"
                      src={imageDisplayUrl || formData.image}
                      alt=""
                    />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="text-destructive hover:text-destructive"
                    onClick={handleRemoveImage}
                    disabled={imageUploading || submitting}
                    aria-label="Remove subcategory image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Input
                  id="subcategory-image"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  disabled={imageUploading || submitting}
                  className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
                />
              )}
              <input
                ref={imageInputRef}
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                disabled={imageUploading || submitting}
                tabIndex={-1}
                aria-hidden="true"
              />
              {imageUploading && <Spinner size="sm" />}
            </div>
          </FormField>

          {/* Description */}
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
                placeholder="Enter subcategory description..."
                aria-invalid={!!fieldErrors.description}
              />
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/subcategories")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update Subcategory"
            ) : (
              "Create Subcategory"
            )}
          </Button>
        </div>
      </form>
    </CrudFormPage>
  );
};

export default SubcategoryForm;
