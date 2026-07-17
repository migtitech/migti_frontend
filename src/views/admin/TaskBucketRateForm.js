import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import * as yup from "yup";
import taskManagementService from "../../services/taskManagementService";
import { Loader, CrudFormPage, FormField } from "../../components";
import { Button, Input, Textarea, Spinner } from "../../components/ui";
import { toastError, toastSuccess } from "../../utils/toast";

const rateSchema = yup.object({
  supplierName: yup.string().trim().required("Shop name is required"),
  contactName: yup.string().trim().required("Contact person is required"),
  contactPhone: yup
    .string()
    .required("Contact phone is required")
    .matches(/^\d{10}$/, "Contact phone must be 10 digits"),
  rate: yup
    .number()
    .typeError("Rate must be a number")
    .positive("Rate must be a positive number")
    .required("Rate is required"),
  remark: yup.string().trim().required("Remark is required"),
});

const TaskBucketRateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [form, setForm] = useState({
    supplierName: "",
    contactName: "",
    contactPhone: "",
    rate: "",
    remark: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await taskManagementService.getById(id);
        const data = res?.data?.data ?? res?.data;
        setTaskTitle(data?.title || "");
        const supplier = data?.supplierInfo || {};
        setForm({
          supplierName: supplier.supplierName || "",
          contactName: supplier.contactName || "",
          contactPhone: supplier.contactPhone || "",
          rate: supplier.rate != null ? String(supplier.rate) : "",
          remark: supplier.remark || "",
        });
      } catch (err) {
        toastError(err?.message || "Failed to load task");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;
    // Validate with Yup
    try {
      const casted = await rateSchema.validate(form, { abortEarly: false });
      setErrors({});
      // Use casted values (trimmed, numeric)
      setSubmitting(true);
      try {
        const payload = {
          supplierName: casted.supplierName,
          contactName: casted.contactName,
          contactPhone: casted.contactPhone,
          rate: casted.rate,
          remark: casted.remark,
        };
        await taskManagementService.updateSupplier(id, payload);
        toastSuccess("Supplier details & rate saved");
        navigate(`/task-bucket/${id}`);
      } catch (err) {
        toastError(
          err?.response?.data?.message || err?.message || "Failed to save rate",
        );
      } finally {
        setSubmitting(false);
      }
    } catch (validationError) {
      if (validationError.inner) {
        const fieldErrors = {};
        validationError.inner.forEach((ve) => {
          if (ve.path && !fieldErrors[ve.path]) {
            fieldErrors[ve.path] = ve.message;
          }
        });
        setErrors(fieldErrors);
      }
      toastError("Please fix validation errors");
    }
  };

  if (loading) {
    return <Loader message="Loading task..." />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(`/task-bucket/${id}`)}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to task bucket
        </Button>
      </div>

      <CrudFormPage
        title="Add Supplier Rate"
        description={taskTitle ? `Task: ${taskTitle}` : undefined}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Shop Name" error={errors.supplierName}>
            <Input
              value={form.supplierName}
              onChange={(e) => handleChange("supplierName", e.target.value)}
              placeholder="Shop name"
            />
          </FormField>
          <FormField label="Contact Person" error={errors.contactName}>
            <Input
              value={form.contactName}
              onChange={(e) => handleChange("contactName", e.target.value)}
              placeholder="Contact person name"
            />
          </FormField>
          <FormField label="Contact Phone" error={errors.contactPhone}>
            <Input
              value={form.contactPhone}
              onChange={(e) => handleChange("contactPhone", e.target.value)}
              placeholder="Phone number"
            />
          </FormField>
          <FormField label="Rate" error={errors.rate}>
            <Input
              type="number"
              min={0}
              step="any"
              value={form.rate}
              onChange={(e) => handleChange("rate", e.target.value)}
              placeholder="0"
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Remark" error={errors.remark}>
              <Textarea
                rows={2}
                value={form.remark}
                onChange={(e) => handleChange("remark", e.target.value)}
                placeholder="Supplier / rate remark"
              />
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/task-bucket/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <>
                Save
                <Save className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default TaskBucketRateForm;
