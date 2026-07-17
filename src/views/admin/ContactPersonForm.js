import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  ArrowLeft,
  UserRound,
  Mail,
  Building2,
  StickyNote,
} from "lucide-react";
import industryService from "../../services/industryService";
import industryContactPersonService from "../../services/industryContactPersonService";
import supplierService from "../../services/supplierService";
import supplierContactPersonService from "../../services/supplierContactPersonService";
import {
  Loader,
  CrudFormPage,
  FormField,
  SearchableDropdown,
} from "../../components";
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
import { cn } from "../../lib/utils";

/**
 * Section anchor: an icon chip + title + short description used to visually
 * group each set of fields in the form scaffold (the shared "tile" system).
 */
const FormSection = ({ icon: Icon, title, description, first, children }) => (
  <div
    className={cn("mt-8 first:mt-0", !first && "border-t border-border pt-8")}
  >
    <div className="mb-5 flex items-start gap-3">
      {Icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary!" />
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    {children}
  </div>
);

/**
 * Shared Contact Person form for Customer Contacts and Supplier Contacts.
 * Both are API-backed (industryContactPerson / supplierContactPerson).
 */
const PARENT_CONFIG = {
  industry: {
    module: "industry_branches",
    label: "client",
    basePath: "/customer-contacts",
    mappedKey: "industryId",
    mapLabel: "Client",
    searchPlaceholder: "Search client...",
    mapRequiredMessage: "Select a client to map this contact to",
    mapHelper: "Search by client name or industry",
    listAll: async () => {
      const res = await industryService.getAll({
        pageNumber: 1,
        pageSize: 1000,
      });
      const data = res?.data ?? res;
      const list = data?.industries ?? data?.data?.industries ?? [];
      return Array.isArray(list) ? list : [];
    },
    getContact: async (id) => {
      const res = await industryContactPersonService.getById(id);
      const data = res?.data ?? res;
      return data?.data ?? data;
    },
    saveContact: async (payload, id) => {
      if (id) {
        return industryContactPersonService.update(id, payload);
      }
      return industryContactPersonService.create(payload);
    },
  },
  supplier: {
    module: "suppliers",
    label: "supplier",
    basePath: "/supplier-contacts",
    mappedKey: "supplierId",
    mapLabel: "Supplier",
    searchPlaceholder: "Search supplier...",
    mapRequiredMessage: "Select a supplier to map this contact to",
    mapHelper: "Search by supplier name or shop name",
    listAll: async () => {
      const res = await supplierService.getAll({
        pageNumber: 1,
        pageSize: 1000,
      });
      const data = res?.data ?? res;
      const list = data?.suppliers ?? data?.data?.suppliers ?? [];
      return Array.isArray(list) ? list : [];
    },
    getContact: async (id) => {
      const res = await supplierContactPersonService.getById(id);
      const data = res?.data ?? res;
      return data?.data ?? data;
    },
    saveContact: async (payload, id) => {
      if (id) {
        return supplierContactPersonService.update(id, payload);
      }
      return supplierContactPersonService.create(payload);
    },
  },
};

const buildSchema = (mapRequiredMessage) =>
  yup.object({
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
      then: (s) => s.required(mapRequiredMessage),
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

const getClientLabel = (company) => {
  const name = company?.name || "-";
  const sector = company?.industrySector?.trim();
  return sector ? `${name} — ${sector}` : name;
};

const getSupplierLabel = (company) => {
  const name = company?.name || "-";
  const shop = company?.shopname?.trim();
  if (shop) return `${name} — ${shop}`;
  const categories = Array.isArray(company?.categories)
    ? company.categories
        .map((c) => (typeof c === "object" ? c?.name : ""))
        .filter(Boolean)
        .join(", ")
    : "";
  return categories ? `${name} — ${categories}` : name;
};

const resolveMappedId = (data, mappedKey) => {
  const ref = data?.[mappedKey];
  if (typeof ref === "object" && ref?._id) return String(ref._id);
  if (typeof ref === "string" && ref) return ref;
  if (data?.mappedId) return String(data.mappedId);
  return "";
};

const ContactPersonFormBase = ({ parentType }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const config = PARENT_CONFIG[parentType];
  const schema = useMemo(
    () => buildSchema(config.mapRequiredMessage),
    [config.mapRequiredMessage],
  );

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
  const mappedId = watch("mappedId");

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

  const mapContactToForm = (data) => ({
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    designation: data.designation || "",
    department: data.department || "",
    email: data.email || "",
    secondaryEmail: data.secondaryEmail || "",
    mobileNumber: data.mobileNumber || "",
    officePhoneNumber: data.officePhoneNumber || "",
    status: data.status || "active",
    mappedId: resolveMappedId(data, config.mappedKey),
    isPrimary: Boolean(data.isPrimary),
    remarks: data.remarks || "",
  });

  const fetchContact = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await config.getContact(id);
      if (!data) {
        setError("Contact person not found");
        return;
      }
      const formValues = mapContactToForm(data);
      reset(formValues);
      prevStatusRef.current = formValues.status || "active";
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
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        designation: values.designation?.trim() || "",
        department: values.department?.trim() || "",
        email: values.email?.trim() || "",
        secondaryEmail: values.secondaryEmail?.trim() || "",
        mobileNumber: values.mobileNumber?.trim() || "",
        officePhoneNumber: values.officePhoneNumber?.trim() || "",
        status: values.status,
        [config.mappedKey]: values.status === "active" ? values.mappedId : null,
        isPrimary: Boolean(values.isPrimary),
        remarks: values.remarks?.trim() || "",
      };
      await config.saveContact(payload, isEdit ? id : undefined);
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
        description={`Identity, contact information, and ${config.label} mapping.`}
      >
        <FormSection
          icon={UserRound}
          title="Identity"
          description="Who this contact is and what they do."
          first
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
          </div>
        </FormSection>

        <FormSection
          icon={Mail}
          title="Contact information"
          description="How to reach this person by email or phone."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Email" required error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </FormField>
            <FormField
              label="Secondary Email"
              error={errors.secondaryEmail?.message}
            >
              <Input type="email" {...register("secondaryEmail")} />
            </FormField>
            <FormField
              label="Mobile Number"
              error={errors.mobileNumber?.message}
            >
              <Input {...register("mobileNumber")} placeholder="10 digits" />
            </FormField>
            <FormField
              label="Office Phone Number"
              error={errors.officePhoneNumber?.message}
            >
              <Input {...register("officePhoneNumber")} />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={Building2}
          title={`${config.mapLabel} mapping`}
          description={`Status and the ${config.label} this contact belongs to.`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Status" error={errors.status?.message}>
              <Select {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>

            <FormField
              label={`Map to ${config.mapLabel}`}
              required={status === "active"}
              error={errors.mappedId?.message}
              helper={
                status === "inactive"
                  ? "Contact is inactive — mapping removed"
                  : config.mapHelper
              }
            >
              <SearchableDropdown
                options={companies}
                value={mappedId}
                onChange={(val) =>
                  setValue("mappedId", val || "", { shouldValidate: true })
                }
                placeholder={
                  status === "inactive"
                    ? "Unassigned"
                    : config.searchPlaceholder
                }
                disabled={status === "inactive"}
                maxDisplayCount={15}
                invalid={!!errors.mappedId}
                getOptionLabel={
                  parentType === "industry" ? getClientLabel : getSupplierLabel
                }
                getOptionValue={(c) => String(c._id || c.id || "")}
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField
                label="Primary Contact"
                helper="Marks this person as the main point of contact."
              >
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Yes", value: true },
                    { label: "No", value: false },
                  ].map((opt) => (
                    <label
                      key={opt.label}
                      className={cn(
                        "relative flex! h-10 min-w-[4.5rem] cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium leading-none transition-colors",
                        "border-input bg-background text-foreground hover:bg-muted",
                        "has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary!",
                      )}
                    >
                      <input
                        type="radio"
                        name="isPrimary"
                        className="sr-only"
                        checked={
                          opt.value
                            ? watch("isPrimary") === true
                            : watch("isPrimary") !== true
                        }
                        onChange={() => setValue("isPrimary", opt.value)}
                      />
                      <span className="leading-none">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={StickyNote}
          title="Additional information"
          description="Free-form notes visible to your team."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Remarks" error={errors.remarks?.message}>
                <Textarea rows={3} {...register("remarks")} />
              </FormField>
            </div>
          </div>
        </FormSection>

        <div className="-mx-6 -mb-6 mt-8 flex items-center justify-end gap-2 rounded-b-xl border-t border-border bg-muted/30 px-6 py-4">
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
