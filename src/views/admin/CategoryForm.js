import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ArrowLeft, Info, Tags } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import categoryService from "../../services/categoryService";
import groupService from "../../services/groupService";
import {
  Loader,
  SearchableDropdown,
  StatusBadge,
  StatusToggle,
  CrudFormPage,
  FormField,
  FileUpload,
} from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Textarea,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import MapBrandModal from "../../components/MapBrandModal/MapBrandModal";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { cn } from "../../lib/utils";

/**
 * Section anchor: an icon chip + title + short description used to visually
 * group each set of fields in the form scaffold (the shared "tile" system).
 */
const FormSection = ({
  icon: Icon,
  title,
  description,
  action,
  first,
  children,
}) => (
  <div
    className={cn("mt-8 first:mt-0", !first && "border-t border-border pt-8")}
  >
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary!" />
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
);

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
        status: "active",
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
      <div className="text-center p-5">
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
    <>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/categories")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Categories
        </Button>
      </div>

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
          <FormSection
            icon={Info}
            title="Category details"
            description="Group, name, status and description."
            first
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Group */}
              <FormField label="Group" required error={fieldErrors.group}>
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
                <StatusToggle
                  id="category-status"
                  status={formData.status}
                  onCheckedChange={handleStatusToggle}
                  aria-label="Category status"
                  className="h-9 gap-3"
                />
              </FormField>

              {/* Category icon */}
              <FormField label="Category icon" htmlFor="category-icon">
                <div className="flex items-center gap-3">
                  {hasCategoryIcon ? (
                    <>
                      <button
                        type="button"
                        className="shrink-0 rounded-md border border-border p-0"
                        onClick={() => iconInputRef.current?.click()}
                        disabled={iconUploading || submitting}
                        aria-label="Change category icon"
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
                        onClick={handleRemoveIcon}
                        disabled={iconUploading || submitting}
                        aria-label="Remove category icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <FileUpload
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      hint="JPEG, PNG, GIF or WebP"
                      disabled={iconUploading || submitting}
                      onChange={handleIconChange}
                      className="max-w-sm"
                    />
                  )}
                  <input
                    ref={iconInputRef}
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleIconChange}
                    disabled={iconUploading || submitting}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  {iconUploading && <Spinner size="sm" />}
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
                    placeholder="Enter category description..."
                    aria-invalid={!!fieldErrors.description}
                  />
                </FormField>
              </div>
            </div>
          </FormSection>

          {/* Map Brand */}
          <FormSection
            icon={Tags}
            title="Mapped brands"
            description="Brands available under this category."
            action={
              <Button
                size="sm"
                type="button"
                onClick={() => setMapBrandModalVisible(true)}
              >
                <Plus className="h-4 w-4" />
                Add Brand
              </Button>
            }
          >
            {mappedBrands.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedBrands.map((brand) => (
                      <TableRow key={brand._id}>
                        <TableCell className="font-medium">
                          {brand.name}
                        </TableCell>
                        <TableCell>{brand.description || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={brand.status} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMappedBrand(brand._id)}
                            aria-label={`Remove ${brand.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                No brands mapped yet.
              </p>
            )}
          </FormSection>

          <div className="-mx-6 -mb-6 mt-8 flex items-center justify-end gap-2 rounded-b-xl border-t border-border bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/categories")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Spinner size="sm" />
              ) : isEdit ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </Button>
          </div>
        </form>

        <MapBrandModal
          visible={mapBrandModalVisible}
          onClose={() => setMapBrandModalVisible(false)}
          onAdd={handleAddMappedBrand}
          mappedBrandIds={mappedBrands.map((brand) => brand._id)}
        />
      </CrudFormPage>
    </>
  );
};

export default CategoryForm;
