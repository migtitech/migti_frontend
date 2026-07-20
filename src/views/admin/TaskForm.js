import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import taskManagementService from "../../services/taskManagementService";
import employeeService from "../../services/employeeService";
import documentService from "../../services/documentService";
import { getAssetsUrl } from "../../api/endpoints";
import {
  Loader,
  CrudFormPage,
  FormField,
  BackButton,
  GstRateSelect,
} from "../../components";
import { Button, Input, Textarea, Select, Spinner } from "../../components/ui";
import { toastSuccess, toastError } from "../../utils/toast";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const TaskForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [form, setForm] = useState({
    title: "",
    productInfo: {
      name: "",
      hsn: "",
      gst: "",
      modelNumber: "",
      description: "",
      image: null,
    },
    remark: "",
    targetRate: "",
    dueDate: "",
    priority: "medium",
    employeeId: "",
  });
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { pageSize: 100 };
        const empRes = await employeeService.getAll(params);
        const empData = empRes?.data?.data ?? empRes?.data;
        setEmployees(empData?.employees ?? []);
      } catch (err) {
        toastError(err?.message || "Failed to load employees");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProductInfoChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      productInfo: { ...prev.productInfo, [field]: value },
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setProductImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toastError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      let imageId = form.productInfo?.image || null;
      if (productImageFile) {
        const uploadRes = await documentService.uploadImages([
          productImageFile,
        ]);
        const docs =
          uploadRes?.data?.data?.documents ?? uploadRes?.data?.documents ?? [];
        if (docs.length > 0) imageId = docs[0]._id ?? docs[0].id;
      }
      const payload = {
        title: form.title.trim(),
        employeeId: form.employeeId || undefined,
        productInfo: {
          name: form.productInfo?.name ?? "",
          hsn: form.productInfo?.hsn ?? "",
          gst: form.productInfo?.gst ? Number(form.productInfo.gst) : null,
          modelNumber: form.productInfo?.modelNumber ?? "",
          description: form.productInfo?.description ?? "",
          image: imageId,
        },
        remark: form.remark?.trim() ?? "",
        targetRate: form.targetRate ? Number(form.targetRate) : null,
        dueDate: form.dueDate || null,
        priority: form.priority || "medium",
      };
      await taskManagementService.create(payload);
      toastSuccess("Task created successfully");
      navigate("/task-dashboard");
    } catch (err) {
      toastError(
        err?.response?.data?.message || err?.message || "Failed to create task",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="Loading..." />;

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <BackButton fallback="/task-dashboard" />
      </div>

      <CrudFormPage
        title="Create Task"
        description="Create a new task with product details and assignment."
      >
        <div className="grid grid-cols-1 gap-4">
          <FormField label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Task title"
              required
            />
          </FormField>

          <FormField label="Assign Employee">
            <Select
              value={form.employeeId}
              onChange={(e) => handleChange("employeeId", e.target.value)}
              aria-label="Assign employee"
            >
              <option value="">– Select employee –</option>
              {employees.map((emp) => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name} {emp.designation ? `(${emp.designation})` : ""}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
            Product Information
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Product Name">
              <Input
                value={form.productInfo?.name ?? ""}
                onChange={(e) =>
                  handleProductInfoChange("name", e.target.value)
                }
                placeholder="Product name"
              />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="HSN">
                <Input
                  value={form.productInfo?.hsn ?? ""}
                  onChange={(e) =>
                    handleProductInfoChange("hsn", e.target.value)
                  }
                  placeholder="HSN code"
                />
              </FormField>
              <FormField label="GST %">
                <GstRateSelect
                  value={form.productInfo?.gst ?? ""}
                  onChange={(e) =>
                    handleProductInfoChange("gst", e.target.value)
                  }
                />
              </FormField>
            </div>
            <FormField label="Model Number">
              <Input
                value={form.productInfo?.modelNumber ?? ""}
                onChange={(e) =>
                  handleProductInfoChange("modelNumber", e.target.value)
                }
                placeholder="Model number"
              />
            </FormField>
            <FormField label="Product Image">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
              />
              {(productImagePreview ||
                (form.productInfo?.image && !productImageFile)) && (
                <div className="mt-2">
                  {productImagePreview ? (
                    <img
                      src={productImagePreview}
                      alt="Product preview"
                      className="h-20 w-20 rounded border border-border object-cover"
                    />
                  ) : form.productInfo?.image &&
                    typeof form.productInfo.image === "object" &&
                    form.productInfo.image?.path ? (
                    <img
                      src={getAssetsUrl(form.productInfo.image.path)}
                      alt="Product"
                      className="h-20 w-20 rounded border border-border object-cover"
                    />
                  ) : null}
                </div>
              )}
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <Textarea
                  value={form.productInfo?.description ?? ""}
                  onChange={(e) =>
                    handleProductInfoChange("description", e.target.value)
                  }
                  placeholder="Product description"
                  rows={2}
                />
              </FormField>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField label="Target Rate">
              <Input
                type="number"
                min={0}
                step="any"
                value={form.targetRate ?? ""}
                onChange={(e) => handleChange("targetRate", e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField label="Due Date">
              <Input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => handleChange("dueDate", e.target.value)}
              />
            </FormField>
            <FormField label="Priority">
              <Select
                value={form.priority}
                onChange={(e) => handleChange("priority", e.target.value)}
                aria-label="Priority"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="md:col-span-3">
              <FormField label="Remark">
                <Textarea
                  value={form.remark ?? ""}
                  onChange={(e) => handleChange("remark", e.target.value)}
                  placeholder="Remarks"
                  rows={2}
                />
              </FormField>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/task-dashboard")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <>
                Create Task
                <Send className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default TaskForm;
