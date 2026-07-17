import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ArrowLeft } from "lucide-react";
import bpDummy from "../../data/businessPartnerDummy";
import industryService from "../../services/industryService";
import supplierService from "../../services/supplierService";
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
import { toastSuccess, toastError } from "../../utils/toast";
import { emailOptional, phoneOptional } from "../../utils/validation";

/**
 * Frontend-only "Contact Person" form, shared by Customer Contacts and
 * Supplier Contacts. Persists to localStorage (see
 * data/businessPartnerDummy.js) — there is no backend entity for this yet.
 */
const PARENT_CONFIG = {
  industry: {
    module: "industry_branches",
    label: "client",
    basePath: "/customer-contacts",
    listAll: async () => {
      const res = await industryService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data ?? res;
      const list = data?.industries ?? data?.data?.industries ?? [];
      return Array.isArray(list) ? list : [];
    },
  },
  supplier: {
    module: "suppliers",
    label: "supplier",
    basePath: "/supplier-contacts",
    listAll: async () => {
      const res = await supplierService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data ?? res;
      const list = data?.suppliers ?? data?.data?.suppliers ?? [];
      return Array.isArray(list) ? list : [];
    },
  },
};

const schema = yup.object({
  firstName: yup.string().trim().required("First name is required").max(100),
  lastName: yup.string().trim().required("Last name is required").max(100),
  designation: yup.string().trim().optional().max(100),
  department: yup.string().trim().optional().max(100),
  email: emailOptional().required("Email is required"),
  secondaryEmail: emailOptional(),
  mobileNumber: phoneOptional("Mobile number"),
  officePhoneNumber: phoneOptional("Office phone number"),
  status: yup.string().oneOf(["active", "inactive"]).default("active"),
  mappedId: yup.string().when("status", {
    is: "active",
    then: (s) => s.required("Select a company to map this contact to"),
    otherwise: (s) => s.optional(),
  }),
  isPrimary: yup.boolean().default(false),
  remarks: yup.string().trim().optional().max(500),
});

const defaultValues = {
  firstName: "",
  lastName: "",
  designation: "",
  department: "",
  email: "",
  secondaryEmail: "",
  mobileNumber: "",
  officePhoneNumber: "",
  status: "active",
  mappedId: "",
  isPrimary: false,
  remarks: "",
};

const ContactPersonFormBase = ({ parentType }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const config = PARENT_CONFIG[parentType];

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState([]);
  const prevStatusRef = useRef("active");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const status = watch("status");

  useEffect(() => {
    fetchCompanies();
    if (isEdit) {
      fetchContact();
    } else {
      reset(defaultValues);
      prevStatusRef.current = "active";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, parentType]);

  // Active -> Inactive transition: blank the mapping immediately.
  // Inactive -> Active transition: leave it blank so the user must re-pick
  // (schema's when() makes mappedId required while status === "active").
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== status) {
      if (status === "inactive") {
        setValue("mappedId", "");
      }
      prevStatusRef.current = status;
    }
  }, [status, setValue]);

  const fetchCompanies = async () => {
    try {
      const list = await config.listAll();
      setCompanies(list);
    } catch (err) {
      console.error("Failed to fetch companies", err);
      toastError(err?.message || `Failed to load ${config.label} list`);
    }
  };

  const fetchContact = async () => {
    setLoading(true);
    setError("");
    try {
      const data = bpDummy.getContactPerson(id);
      if (!data) {
        setError("Contact person not found");
        return;
      }
      reset({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        designation: data.designation || "",
        department: data.department || "",
        email: data.email || "",
        secondaryEmail: data.secondaryEmail || "",
        mobileNumber: data.mobileNumber || "",
        officePhoneNumber: data.officePhoneNumber || "",
        status: data.status || "active",
        mappedId: data.mappedId || "",
        isPrimary: Boolean(data.isPrimary),
        remarks: data.remarks || "",
      });
      prevStatusRef.current = data.status || "active";
    } catch (err) {
      toastError(err?.message || "Failed to fetch contact person");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    setError("");
    try {
      const mappedCompany = companies.find(
        (c) => (c._id || c.id) === values.mappedId,
      );
      const record = {
        id: isEdit ? id : undefined,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        designation: values.designation?.trim() || "",
        department: values.department?.trim() || "",
        email: values.email?.trim() || "",
        secondaryEmail: values.secondaryEmail?.trim() || "",
        mobileNumber: values.mobileNumber?.trim() || "",
        officePhoneNumber: values.officePhoneNumber?.trim() || "",
        status: values.status,
        mappedType: values.status === "active" ? parentType : "",
        mappedId: values.status === "active" ? values.mappedId : "",
        mappedName: values.status === "active" ? mappedCompany?.name || "" : "",
        isPrimary: Boolean(values.isPrimary),
        remarks: values.remarks?.trim() || "",
      };
      bpDummy.saveContactPerson(record);
      toastSuccess(
        isEdit
          ? "Contact person updated successfully"
          : "Contact person created successfully",
      );
      navigate(config.basePath);
    } catch (err) {
      toastError(err?.message || "Failed to save contact person");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading contact person..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(config.basePath)}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contacts
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CrudFormPage
        title={isEdit ? "Edit contact person" : "Add contact person"}
        description="Basic details, contact information, and company mapping."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="First Name"
            required
            error={errors.firstName?.message}
          >
            <Input {...register("firstName")} />
          </FormField>
          <FormField
            label="Last Name"
            required
            error={errors.lastName?.message}
          >
            <Input {...register("lastName")} />
          </FormField>
          <FormField label="Designation" error={errors.designation?.message}>
            <Input {...register("designation")} />
          </FormField>
          <FormField label="Department" error={errors.department?.message}>
            <Input {...register("department")} />
          </FormField>

          <FormField label="Email" required error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormField>
          <FormField
            label="Secondary Email"
            error={errors.secondaryEmail?.message}
          >
            <Input type="email" {...register("secondaryEmail")} />
          </FormField>
          <FormField label="Mobile Number" error={errors.mobileNumber?.message}>
            <Input {...register("mobileNumber")} placeholder="10 digits" />
          </FormField>
          <FormField
            label="Office Phone Number"
            error={errors.officePhoneNumber?.message}
          >
            <Input {...register("officePhoneNumber")} />
          </FormField>

          <FormField label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>

          <FormField
            label={`Map to ${config.label === "client" ? "Client" : "Supplier"}`}
            required={status === "active"}
            error={errors.mappedId?.message}
            helper={
              status === "inactive"
                ? "Contact is inactive — mapping removed"
                : "Please select a company to map this contact to"
            }
          >
            <Select {...register("mappedId")} disabled={status === "inactive"}>
              <option value="">
                {status === "inactive" ? "Unassigned" : "Select company"}
              </option>
              {companies.map((c) => {
                const cid = c._id || c.id;
                return (
                  <option key={cid} value={cid}>
                    {c.name || "-"}
                  </option>
                );
              })}
            </Select>
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Primary Contact">
              <div className="flex h-9 items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value="true"
                    className="h-4 w-4 cursor-pointer accent-primary"
                    checked={watch("isPrimary") === true}
                    onChange={() => setValue("isPrimary", true)}
                  />
                  Yes
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value="false"
                    className="h-4 w-4 cursor-pointer accent-primary"
                    checked={watch("isPrimary") !== true}
                    onChange={() => setValue("isPrimary", false)}
                  />
                  No
                </label>
              </div>
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="Remarks" error={errors.remarks?.message}>
              <Textarea rows={3} {...register("remarks")} />
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(config.basePath)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update contact person"
            ) : (
              "Create contact person"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export const CustomerContactForm = () => (
  <ContactPersonFormBase parentType="industry" />
);
export const SupplierContactForm = () => (
  <ContactPersonFormBase parentType="supplier" />
);
