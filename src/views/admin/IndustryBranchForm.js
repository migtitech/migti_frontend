import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ArrowLeft } from "lucide-react";
import industryBranchService from "../../services/industryBranchService";
import industryService from "../../services/industryService";
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

const schema = yup.object({
  industryId: yup.string().required("Please select a client"),
  name: yup.string().required("Branch name is required").min(1).max(100),
  location: yup.string().optional().max(200),
  address: yup.string().optional().max(500),
  gst: yup
    .string()
    .optional()
    .transform((v) =>
      typeof v === "string" ? v.trim().toUpperCase() : v || "",
    )
    .test(
      "gst",
      "Enter a valid 15-character GSTIN (e.g. 22AABCU9603R1ZX)",
      (v) =>
        !v ||
        v === "" ||
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v),
    ),
});

const defaultValues = {
  industryId: "",
  name: "",
  location: "",
  address: "",
  gst: "",
};

const IndustryBranchForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [industries, setIndustries] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    fetchIndustries();
    if (isEdit) {
      fetchBranch();
    } else {
      reset(defaultValues);
    }
  }, [id]);

  // Refetch industries when form becomes visible (e.g. after adding industry in another tab)
  useEffect(() => {
    const onFocus = () => {
      if (!isEdit) fetchIndustries();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isEdit]);

  const fetchIndustries = async () => {
    try {
      const res = await industryService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data ?? res;
      const list = data?.industries ?? data?.data?.industries ?? [];
      setIndustries(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch industries", err);
      toastError(err?.message || "Failed to load industries for dropdown");
    }
  };

  const fetchBranch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() =>
        industryBranchService.getById(id),
      );
      const data = res?.data?.data || res?.data || res;
      const industryId =
        typeof data?.industryId === "object"
          ? data?.industryId?._id
          : data?.industryId || "";
      reset({
        industryId: industryId || "",
        name: data?.name || "",
        location: data?.location || "",
        address: data?.address || "",
        gst: data?.gst || "",
      });
    } catch (err) {
      toastError(err?.message || "Failed to fetch client branch");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        industryId: values.industryId || null,
        name: values.name?.trim() || "",
        location: values.location?.trim() || "",
        address: values.address?.trim() || "",
        gst: values.gst?.trim() || "",
      };
      if (isEdit) {
        await industryBranchService.update(id, payload);
        toastSuccess("Client branch updated successfully");
      } else {
        await industryBranchService.create(payload);
        toastSuccess("Client branch created successfully");
      }
      navigate("/industry-branches");
    } catch (err) {
      toastError(err?.message || "Failed to save client branch");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading client branch..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/industry-branches")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to client branches
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CrudFormPage
        title={isEdit ? "Edit client branch" : "Add client branch"}
        description={
          isEdit
            ? "Update this client branch's details."
            : "Create a new client branch."
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Client" required error={errors.industryId?.message}>
            <Select {...register("industryId")} disabled={isEdit}>
              <option value="">Select client</option>
              {industries.map((ind) => {
                const industryId = ind._id ?? ind.id;
                return (
                  <option key={industryId} value={industryId}>
                    {ind.name ?? "-"}
                  </option>
                );
              })}
            </Select>
          </FormField>

          <FormField label="Branch Name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Branch name" />
          </FormField>

          <FormField label="Location" error={errors.location?.message}>
            <Input {...register("location")} placeholder="Location" />
          </FormField>

          <FormField label="GST Number" error={errors.gst?.message}>
            <Input {...register("gst")} placeholder="e.g. 22AABCU9603R1ZX" />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Address" error={errors.address?.message}>
              <Textarea
                rows={3}
                {...register("address")}
                placeholder="Address"
              />
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/industry-branches")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update client branch"
            ) : (
              "Create client branch"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default IndustryBranchForm;
