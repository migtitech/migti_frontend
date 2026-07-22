import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { gstinOptional, urlOptional, MSG } from "../../utils/validation";
import companyService from "../../services/companyService";
import {
  Loader,
  CrudFormPage,
  FormField,
  StatusToggle,
  BackButton,
} from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Textarea,
  Spinner,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";

const companySchema = () =>
  yup.object({
    name: yup
      .string()
      .trim()
      .required("Company name is required")
      .min(2, "At least 2 characters")
      .max(100, "At most 100 characters"),
    brandName: yup
      .string()
      .trim()
      .required("Brand name is required")
      .min(2, "At least 2 characters")
      .max(100, "At most 100 characters"),
    email: yup
      .string()
      .trim()
      .email("Enter a valid email")
      .required("Email is required"),
    gst: gstinOptional(),
    mobile: yup
      .string()
      .trim()
      .optional()
      .max(20, "At most 20 characters")
      .nullable()
      .transform((v, o) => (o === "" ? null : v)),
    address: yup
      .string()
      .trim()
      .optional()
      .max(500)
      .nullable()
      .transform((v, o) => (o === "" ? null : v)),
    website: urlOptional(200),
    logoUrl: yup.string().trim().optional().nullable(),
    logoDisplayUrl: yup.string().trim().optional().nullable(),
    isActive: yup.boolean().optional().default(true),
  });

const defaultValues = {
  name: "",
  brandName: "",
  email: "",
  gst: "",
  mobile: "",
  address: "",
  website: "",
  logoUrl: "",
  logoDisplayUrl: "",
  isActive: true,
};

const COMPANY_FORM_DRAFT_KEY = "company_form_draft";

const CompanyForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  // Company code is generated once by the backend and is immutable (read-only).
  const [companyCode, setCompanyCode] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(companySchema()),
    defaultValues,
    mode: "onBlur",
  });

  const logoUrl = watch("logoUrl");
  const logoDisplayUrl = watch("logoDisplayUrl");

  useEffect(() => {
    if (!isEdit) {
      // Load draft for new company form, if present
      try {
        const raw = localStorage.getItem(COMPANY_FORM_DRAFT_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          reset({ ...defaultValues, ...stored });
        } else {
          reset(defaultValues);
        }
      } catch {
        reset(defaultValues);
      }
      return;
    }

    const fetchCompany = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => companyService.getById(id));
        const data = res?.data?.data || res?.data?.company || res?.data || {};
        setCompanyCode(data.code || "");
        reset({
          name: data.name || "",
          brandName: data.brandName || "",
          email: data.email || "",
          gst: data.gst || "",
          mobile: data.mobile || "",
          address:
            data.address || data.shippingAddress || data.billingAddress || "",
          website: data.website || "",
          logoUrl: data.logoUrl || "",
          logoDisplayUrl: data.logoDisplayUrl || data.logoUrl || "",
          isActive: data.isActive !== false,
        });
      } catch (err) {
        toastError(err?.message || "Failed to load company");
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [id, isEdit, reset]);

  // Autosave draft for new company
  useEffect(() => {
    if (isEdit) return;
    const subscription = watch((values) => {
      try {
        localStorage.setItem(COMPANY_FORM_DRAFT_KEY, JSON.stringify(values));
      } catch {
        // ignore storage errors
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, isEdit]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("Please select an image file (JPEG, PNG, GIF, WebP)");
      return;
    }
    setLogoUploading(true);
    try {
      const res = await companyService.uploadLogo(file);
      const data = res?.data?.data || res?.data || {};
      const url = data?.url;
      const displayUrl = data?.displayUrl || url;
      if (url) {
        setValue("logoUrl", url, { shouldValidate: true });
        setValue("logoDisplayUrl", displayUrl || url, { shouldValidate: true });
        toastSuccess("Logo uploaded");
      } else {
        toastError("Upload failed");
      }
    } catch (err) {
      toastError(err?.message || "Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(COMPANY_FORM_DRAFT_KEY);
    } catch {
      // ignore
    }
    reset(defaultValues);
    toastSuccess("Saved company form data cleared");
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    setError("");
    try {
      const { logoDisplayUrl: _, branchId: __, ...rest } = values;
      const payload = {
        ...rest,
        logoUrl: values.logoUrl || undefined,
        mobile: values.mobile || "",
        address: values.address || "",
        // Keep backend compatibility: store single address into both fields.
        shippingAddress: values.address || "",
        billingAddress: values.address || "",
        website: values.website || "",
        isActive: values.isActive !== false,
      };

      if (isEdit) {
        await companyService.update(id, payload);
        toastSuccess("Company updated successfully");
      } else {
        await companyService.create(payload);
        toastSuccess("Company created successfully");
      }
      if (!isEdit) {
        try {
          localStorage.removeItem(COMPANY_FORM_DRAFT_KEY);
        } catch {}
      }
      navigate("/companies");
    } catch (err) {
      toastError(err?.message || "Failed to save company");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading company..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <BackButton fallback="/companies" />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CrudFormPage
        title={isEdit ? "Edit Company" : "Add Company"}
        description={
          isEdit
            ? "Update this company's profile, branding, and contact details."
            : "Create a new company profile for your organization."
        }
        actions={
          !isEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearDraft}
            >
              Clear saved data
            </Button>
          )
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Company Name" required error={errors.name?.message}>
            <Input {...register("name")} />
          </FormField>
          {isEdit && companyCode && (
            <FormField label="Company Code">
              <Input value={companyCode} readOnly disabled />
            </FormField>
          )}
          <FormField
            label="Brand Name"
            required
            error={errors.brandName?.message}
          >
            <Input {...register("brandName")} />
          </FormField>

          <FormField label="Email" required error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormField>
          <FormField label="Mobile" error={errors.mobile?.message}>
            <Input placeholder="e.g. 9876543210" {...register("mobile")} />
          </FormField>

          <FormField label="Website" error={errors.website?.message}>
            <Input placeholder="https://example.com" {...register("website")} />
          </FormField>
          <FormField label="Status">
            <Controller
              name="isActive"
              control={control}
              defaultValue={true}
              render={({ field: { value, onChange, onBlur } }) => (
                <StatusToggle
                  id="company-isActive"
                  checked={Boolean(value)}
                  onCheckedChange={onChange}
                  onBlur={onBlur}
                  aria-label="Company status"
                  className="h-9 gap-3"
                />
              )}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Address" error={errors.address?.message}>
              <Textarea
                rows={3}
                {...register("address")}
                placeholder="Address (optional)"
              />
            </FormField>
          </div>

          <FormField
            label="Company Logo"
            helper={logoUploading ? "Uploading to S3..." : undefined}
          >
            <div className="space-y-3">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleLogoChange}
                disabled={logoUploading}
                className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
              />
              {(logoDisplayUrl || logoUrl) && (
                <div className="flex items-center rounded-lg border border-border bg-muted p-3">
                  <img
                    src={logoDisplayUrl || logoUrl}
                    alt="Logo"
                    style={{
                      maxHeight: 80,
                      maxWidth: 160,
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>
          </FormField>

          <FormField label="GST" error={errors.gst?.message}>
            <Input placeholder="e.g. 22AAAAA0000A1Z5" {...register("gst")} />
          </FormField>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/companies")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update Company"
            ) : (
              "Create Company"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default CompanyForm;
