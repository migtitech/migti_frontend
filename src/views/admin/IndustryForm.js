import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { gstinOptional, MSG, phoneOptional } from "../../utils/validation";
import industryService from "../../services/industryService";
import areaService from "../../services/areaService";
import subZoneService from "../../services/subZoneService";
import branchService from "../../services/branchService";
import bpDummy from "../../data/businessPartnerDummy";
import { Loader, CrudFormPage, FormField } from "../../components";
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Textarea,
  Select,
  Checkbox,
  Spinner,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import useBranchContext from "../../hooks/useBranchContext";

const phoneOptional10 = () =>
  yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .test(
      "phone",
      "Phone must be exactly 10 digits",
      (v) => !v || /^\d{10}$/.test(v),
    );

const purchaseManagerSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Name is required")
    .min(1, MSG.minLength(1))
    .max(100, MSG.maxLength(100)),
  phone: phoneOptional10(),
  email: yup
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? "" : v)),
  department: yup
    .string()
    .trim()
    .optional()
    .max(100, MSG.maxLength(100))
    .nullable()
    .transform((v, o) => (o === "" ? "" : v)),
});

const industrySchema = yup.object({
  name: yup.string().required("Client name is required").min(2).max(100),
  category: yup
    .string()
    .oneOf(["A", "B", "C", "D", ""], "Invalid category")
    .optional()
    .nullable(),
  area: yup.string().trim().required("Zone selection is required"),
  subZoneId: yup.string().optional().nullable(),
  location: yup.string().optional().max(200),
  shippingAddress: yup
    .string()
    .trim()
    .required("Shipping address is required")
    .max(500),
  billingAddress: yup
    .string()
    .trim()
    .required("Billing address is required")
    .max(500),
  gstNumber: gstinOptional(),
  purchase_manager_name: yup
    .string()
    .trim()
    .optional()
    .max(100)
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  purchase_manager_phone: phoneOptional10(),
  email: yup
    .string()
    .email("Enter a valid email")
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  purchaseManagers: yup
    .array()
    .of(purchaseManagerSchema)
    .optional()
    .default([]),
  branchId: yup.string().optional().nullable(),
});

// Extra fields with no backend column yet — persisted client-side only via
// data/businessPartnerDummy.js (see onSubmit). All optional so they can
// never block a real save; merged into industrySchema's resolver below.
const newFieldsSchema = yup.object({
  clientType: yup.string().oneOf(["", "Customer", "Vendor"]).optional(),
  industrySector: yup.string().trim().max(100).optional(),
  registrationNumber: yup.string().trim().max(50).optional(),
  pan: yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .test(
      "pan",
      "Enter a valid PAN (e.g. ABCDE1234F)",
      (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v),
    ),
  website: yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .test(
      "url",
      "Enter a valid URL",
      (v) => !v || /^https?:\/\/.+\..+/.test(v),
    ),
  companyEmail: yup
    .string()
    .email("Enter a valid email")
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v)),
  companyPhone: phoneOptional("Company phone"),
  companyLogoBase64: yup.string().optional(),
  numberOfEmployees: yup
    .number()
    .typeError("Must be a number")
    .optional()
    .nullable()
    .min(0)
    .transform((v, o) => (o === "" ? null : v)),
  annualRevenue: yup
    .number()
    .typeError("Must be a number")
    .optional()
    .nullable()
    .min(0)
    .transform((v, o) => (o === "" ? null : v)),
  registeredAddress: yup.string().trim().optional(),
  country: yup.string().trim().optional(),
  state: yup.string().trim().optional(),
  city: yup.string().trim().optional(),
  pincode: yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .test(
      "pincode",
      "Pincode must be 6 digits",
      (v) => !v || /^\d{6}$/.test(v),
    ),
  currency: yup.string().trim().optional(),
  paymentTerms: yup.string().trim().optional(),
  creditLimit: yup
    .number()
    .typeError("Must be a number")
    .optional()
    .nullable()
    .min(0)
    .transform((v, o) => (o === "" ? null : v)),
  remarks: yup.string().trim().optional(),
  internalComments: yup.string().trim().optional(),
  hasBranches: yup.boolean().default(false),
  branches: yup
    .array()
    .of(
      yup.object({
        name: yup.string().trim().optional(),
        address: yup.string().trim().optional(),
        city: yup.string().trim().optional(),
        state: yup.string().trim().optional(),
        pincode: yup
          .string()
          .trim()
          .optional()
          .test(
            "pincode",
            "Pincode must be 6 digits",
            (v) => !v || /^\d{6}$/.test(v),
          ),
        contactPersonId: yup.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

const overlayDefaultValues = bpDummy.defaultOverlay();

const defaultValues = {
  name: "",
  category: "",
  area: "",
  subZoneId: "",
  location: "",
  shippingAddress: "",
  billingAddress: "",
  gstNumber: "",
  purchase_manager_name: "",
  purchase_manager_phone: "",
  email: "",
  purchaseManagers: [],
  branchId: "",
  ...overlayDefaultValues,
};

// Fields from the dummy overlay this form actually renders/submits (skip
// billingAddress/shippingAddress/category/attachments which are real fields
// here, or not applicable — Attachments handled separately via state).
const extractOverlayFields = (values) => ({
  clientType: values.clientType || "",
  industrySector: values.industrySector || "",
  registrationNumber: values.registrationNumber || "",
  pan: values.pan || "",
  hasBranches: Boolean(values.hasBranches),
  branches: values.branches || [],
  website: values.website || "",
  companyEmail: values.companyEmail || "",
  companyPhone: values.companyPhone || "",
  companyLogoBase64: values.companyLogoBase64 || "",
  numberOfEmployees: values.numberOfEmployees ?? "",
  annualRevenue: values.annualRevenue ?? "",
  registeredAddress: values.registeredAddress || "",
  country: values.country || "",
  state: values.state || "",
  city: values.city || "",
  pincode: values.pincode || "",
  currency: values.currency || "",
  paymentTerms: values.paymentTerms || "",
  creditLimit: values.creditLimit ?? "",
  remarks: values.remarks || "",
  internalComments: values.internalComments || "",
});

const IndustryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { branchId: userBranchId } = useBranchContext();

  const [loading, setLoading] = useState(false);
  const [defaultBranchId, setDefaultBranchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [areas, setAreas] = useState([]);
  const [subZones, setSubZones] = useState([]);
  const [clientCode, setClientCode] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [contactPersons, setContactPersons] = useState([]);
  const prevAreaRef = useRef("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(industrySchema.concat(newFieldsSchema)),
    context: { isEdit },
    defaultValues,
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "purchaseManagers",
  });

  const {
    fields: branchFields,
    append: appendBranch,
    remove: removeBranch,
  } = useFieldArray({
    control,
    name: "branches",
  });

  const selectedAreaId = watch("area");
  const hasBranches = watch("hasBranches");
  const companyLogoBase64 = watch("companyLogoBase64");

  useEffect(() => {
    fetchAreas();
    setContactPersons(bpDummy.listContactPersons({ parentType: "industry" }));
    if (isEdit) {
      fetchIndustry();
    } else {
      reset(defaultValues);
      setClientCode("");
      setAttachments([]);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const loadBranches = async () => {
      try {
        const response = await branchService.getAll({
          pageNumber: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        const list =
          response?.data?.branches ??
          response?.data?.data?.branches ??
          response?.branches ??
          (Array.isArray(response?.data) ? response.data : []);
        const arr = Array.isArray(list) ? list : [];
        const normalized = arr.map((b) => ({ ...b, id: b.id || b._id }));
        const preferred =
          userBranchId &&
          normalized.some((b) => (b.id || b._id) === userBranchId)
            ? userBranchId
            : (normalized[0] && (normalized[0].id || normalized[0]._id)) || "";
        if (preferred) setDefaultBranchId(String(preferred));
      } catch (err) {
        if (!cancelled) {
          setDefaultBranchId("");
          toastError(err?.message || "Failed to load branches");
        }
      }
    };
    loadBranches();
    return () => {
      cancelled = true;
    };
  }, [isEdit, userBranchId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedAreaId) {
        setSubZones([]);
        setValue("subZoneId", "");
        prevAreaRef.current = "";
        return;
      }
      if (prevAreaRef.current && prevAreaRef.current !== selectedAreaId) {
        setValue("subZoneId", "");
      }
      prevAreaRef.current = selectedAreaId;
      try {
        const res = await subZoneService.listByZone(selectedAreaId);
        const data = res?.data?.data || res?.data || res;
        const list = data?.subZones || [];
        if (!cancelled) setSubZones(list || []);
      } catch {
        if (!cancelled) {
          setSubZones([]);
          setValue("subZoneId", "");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedAreaId, setValue]);

  const fetchAreas = async () => {
    try {
      const res = await areaService.getAll({ pageSize: 100 });
      const data = res?.data || res;
      setAreas(data?.areas || []);
    } catch (err) {
      console.error("Failed to fetch areas", err);
    }
  };

  const fetchIndustry = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await withMinimumDelay(() => industryService.getById(id));
      const data = res?.data || res;
      const purchaseManagers = (data?.purchaseManagers || []).map((pm) => ({
        name: pm.name || "",
        phone: pm.phone || "",
        email: pm.email || "",
        department: pm.department || "",
      }));
      const branchId =
        data?.branchId ||
        (data?.branch && (data.branch._id || data.branch.id)) ||
        "";
      reset({
        name: data?.name || "",
        category: data?.category || "",
        area:
          typeof data?.area === "object"
            ? data?.area?._id || ""
            : data?.area || "",
        subZoneId:
          typeof data?.subZoneId === "object"
            ? data?.subZoneId?._id || ""
            : data?.subZoneId || "",
        location: data?.location || "",
        shippingAddress: data?.shippingAddress || data?.address || "",
        billingAddress: data?.billingAddress || data?.address || "",
        gstNumber: data?.gstNumber || "",
        purchase_manager_name: data?.purchase_manager_name || "",
        purchase_manager_phone: data?.purchase_manager_phone || "",
        email: data?.email || "",
        purchaseManagers: purchaseManagers.length ? purchaseManagers : [],
        branchId: branchId || "",
        ...bpDummy.getOverlay("industry", id),
      });
      prevAreaRef.current =
        typeof data?.area === "object"
          ? data?.area?._id || ""
          : data?.area || "";
      setClientCode(bpDummy.getOrCreateCode("industry", id));
      setAttachments(bpDummy.getOverlay("industry", id).attachments || []);
    } catch (err) {
      toastError(err?.message || "Failed to fetch client");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    const branchId = defaultBranchId || values.branchId;
    if (!isEdit && !branchId) {
      setError("Unable to determine branch. Please contact admin.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (isEdit) {
        const payload = {
          location: values.location || "",
          shippingAddress: values.shippingAddress || "",
          billingAddress: values.billingAddress || "",
          gstNumber: (values.gstNumber || "").trim().toUpperCase(),
          subZoneId:
            (values.subZoneId && String(values.subZoneId).trim()) || null,
          purchaseManagers: (values.purchaseManagers || [])
            .filter((pm) => (pm.name || "").trim())
            .map((pm) => ({
              name: (pm.name || "").trim(),
              phone: (pm.phone || "").trim(),
              email: (pm.email || "").trim(),
              department: (pm.department || "").trim(),
            })),
        };
        await industryService.update(id, payload);
        toastSuccess("Client updated successfully");
        bpDummy.saveOverlay("industry", id, {
          ...extractOverlayFields(values),
          attachments,
        });
      } else {
        // Only real Industry fields go to the API — new dummy fields (see
        // newFieldsSchema) are intentionally excluded via destructuring so
        // they never leak into the real create payload.
        const {
          clientType,
          industrySector,
          registrationNumber,
          pan,
          hasBranches: _hasBranches,
          branches,
          website,
          companyEmail,
          companyPhone,
          companyLogoBase64,
          numberOfEmployees,
          annualRevenue,
          registeredAddress,
          country,
          state,
          city,
          pincode,
          currency,
          paymentTerms,
          creditLimit,
          remarks,
          internalComments,
          ...realValues
        } = values;
        const payload = {
          ...realValues,
          area: values.area || null,
          gstNumber: (values.gstNumber || "").trim().toUpperCase(),
          branchId: branchId || undefined,
          purchaseManagers: (values.purchaseManagers || [])
            .filter((pm) => (pm.name || "").trim())
            .map((pm) => ({
              name: (pm.name || "").trim(),
              phone: (pm.phone || "").trim(),
              email: (pm.email || "").trim(),
              department: (pm.department || "").trim(),
            })),
        };
        const res = await industryService.create(payload);
        const created = res?.data?.data || res?.data || res;
        const newId = created?._id || created?.id;
        toastSuccess("Client created successfully");
        if (newId) {
          bpDummy.saveOverlay("industry", newId, {
            ...extractOverlayFields(values),
            attachments,
          });
          bpDummy.getOrCreateCode("industry", newId);
        }
      }
      navigate("/industries");
    } catch (err) {
      toastError(err?.message || "Failed to save client");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading client..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/industries")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CrudFormPage
        title={isEdit ? "Edit client" : "Add client"}
        description={
          isEdit
            ? "You can update location, purchase managers and addresses."
            : "Fill in client details below."
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Client name" required error={errors.name?.message}>
            <Input
              {...register("name")}
              readOnly={isEdit}
              disabled={isEdit}
              className={isEdit ? "bg-muted" : ""}
            />
          </FormField>

          <FormField label="GST Number" error={errors.gstNumber?.message}>
            <Input
              {...register("gstNumber")}
              placeholder="e.g. 27AABCU9603R1ZM"
            />
          </FormField>

          <FormField label="Client Code" helper="Auto-generated on save">
            <Input value={clientCode} readOnly disabled className="bg-muted" />
          </FormField>

          <FormField label="Client Type" error={errors.clientType?.message}>
            <Select {...register("clientType")}>
              <option value="">Select type</option>
              <option value="Customer">Customer</option>
              <option value="Vendor">Vendor</option>
            </Select>
          </FormField>

          <FormField
            label="Industry (Sector)"
            error={errors.industrySector?.message}
            helper="Business sector, e.g. Manufacturing, IT"
          >
            <Input {...register("industrySector")} />
          </FormField>

          <FormField
            label="Registration Number"
            error={errors.registrationNumber?.message}
          >
            <Input {...register("registrationNumber")} />
          </FormField>

          <FormField label="PAN" error={errors.pan?.message}>
            <Input
              {...register("pan")}
              placeholder="e.g. ABCDE1234F"
              maxLength={10}
              style={{ textTransform: "uppercase" }}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Company Category"
              error={errors.category?.message}
            >
              <div className="flex h-9 items-center gap-4">
                {["A", "B", "C", "D"].map((cat) => (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      id={`category-${cat}`}
                      value={cat}
                      className="h-4 w-4 cursor-pointer accent-primary"
                      {...register("category")}
                      disabled={isEdit}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </FormField>
          </div>

          <FormField label="Zone" required error={errors.area?.message}>
            <Select
              {...register("area")}
              disabled={isEdit}
              className={isEdit ? "bg-muted" : ""}
            >
              <option value="">Select Zone</option>
              {areas.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} {a.city ? `- ${a.city}` : ""}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Sub-zone">
            <Select {...register("subZoneId")} disabled={!subZones.length}>
              <option value="">
                {subZones.length ? "Optional" : "No sub-zones for this zone"}
              </option>
              {subZones.map((sz) => {
                const sid = sz._id || sz.id;
                return (
                  <option key={sid} value={sid}>
                    {(sz.subZoneCode ? `${sz.subZoneCode} — ` : "") +
                      (sz.name || "")}
                  </option>
                );
              })}
            </Select>
          </FormField>

          <FormField
            label="Location ( Google Map URL )"
            error={errors.location?.message}
          >
            <Input {...register("location")} />
          </FormField>
        </div>

        {/* Purchase Managers */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Purchase Managers
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ name: "", phone: "", email: "", department: "" })
              }
            >
              <Plus className="h-4 w-4" />
              Add Purchase Manager
            </Button>
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No purchase managers added. Click &quot;Add Purchase Manager&quot;
              to add.
            </p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12">
                    <div className="md:col-span-3">
                      <FormField
                        label="Name"
                        required
                        error={errors.purchaseManagers?.[index]?.name?.message}
                      >
                        <Input
                          {...register(`purchaseManagers.${index}.name`)}
                          placeholder="Name"
                        />
                      </FormField>
                    </div>
                    <div className="md:col-span-3">
                      <FormField
                        label="Department"
                        error={
                          errors.purchaseManagers?.[index]?.department?.message
                        }
                      >
                        <Input
                          {...register(`purchaseManagers.${index}.department`)}
                          placeholder="Department"
                        />
                      </FormField>
                    </div>
                    <div className="md:col-span-2">
                      <FormField
                        label="Phone"
                        error={errors.purchaseManagers?.[index]?.phone?.message}
                      >
                        <Input
                          {...register(`purchaseManagers.${index}.phone`)}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="10 digits"
                        />
                      </FormField>
                    </div>
                    <div className="md:col-span-3">
                      <FormField
                        label="Email"
                        error={errors.purchaseManagers?.[index]?.email?.message}
                      >
                        <Input
                          type="email"
                          {...register(`purchaseManagers.${index}.email`)}
                          placeholder="Email"
                        />
                      </FormField>
                    </div>
                    <div className="flex md:col-span-1 md:justify-center md:pt-7">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(index)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Shipping address"
            required
            error={errors.shippingAddress?.message}
          >
            <Textarea rows={3} {...register("shippingAddress")} />
          </FormField>
          <FormField
            label="Billing address"
            required
            error={errors.billingAddress?.message}
          >
            <Textarea rows={3} {...register("billingAddress")} />
          </FormField>
        </div>

        {/* Branches */}
        <div className="mt-6 border-t border-border pt-5">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={Boolean(hasBranches)}
              onCheckedChange={(checked) =>
                setValue("hasBranches", Boolean(checked))
              }
            />
            <span className="text-sm font-medium text-foreground">
              Do you have a branch?
            </span>
          </label>

          {hasBranches && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Branches
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendBranch({
                      name: "",
                      address: "",
                      city: "",
                      state: "",
                      pincode: "",
                      contactPersonId: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Branch
                </Button>
              </div>
              {branchFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No branches added. Click &quot;Add Branch&quot; to add.
                </p>
              ) : (
                <div className="space-y-3">
                  {branchFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12">
                        <div className="md:col-span-3">
                          <FormField label="Name">
                            <Input
                              {...register(`branches.${index}.name`)}
                              placeholder="Branch name"
                            />
                          </FormField>
                        </div>
                        <div className="md:col-span-3">
                          <FormField label="Address">
                            <Input
                              {...register(`branches.${index}.address`)}
                              placeholder="Address"
                            />
                          </FormField>
                        </div>
                        <div className="md:col-span-2">
                          <FormField label="City">
                            <Input {...register(`branches.${index}.city`)} />
                          </FormField>
                        </div>
                        <div className="md:col-span-2">
                          <FormField label="State">
                            <Input {...register(`branches.${index}.state`)} />
                          </FormField>
                        </div>
                        <div className="md:col-span-1">
                          <FormField
                            label="Pincode"
                            error={errors.branches?.[index]?.pincode?.message}
                          >
                            <Input
                              {...register(`branches.${index}.pincode`)}
                              maxLength={6}
                            />
                          </FormField>
                        </div>
                        <div className="flex md:col-span-1 md:justify-center md:pt-7">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeBranch(index)}
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="md:col-span-12">
                          <FormField label="Contact Person">
                            <Select
                              {...register(`branches.${index}.contactPersonId`)}
                            >
                              <option value="">Unassigned</option>
                              {contactPersons.map((cp) => (
                                <option key={cp.id} value={cp.id}>
                                  {`${cp.firstName} ${cp.lastName}`.trim()}
                                </option>
                              ))}
                            </Select>
                          </FormField>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Business Information */}
        <div className="mt-6 border-t border-border pt-5">
          <span className="mb-2 block text-sm font-medium text-foreground">
            Business Information
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Website" error={errors.website?.message}>
              <Input
                {...register("website")}
                placeholder="https://example.com"
              />
            </FormField>
            <FormField
              label="Company Email"
              error={errors.companyEmail?.message}
            >
              <Input type="email" {...register("companyEmail")} />
            </FormField>
            <FormField
              label="Company Phone Number"
              error={errors.companyPhone?.message}
            >
              <Input {...register("companyPhone")} />
            </FormField>
            <FormField label="Number of Employees">
              <Input type="number" min={0} {...register("numberOfEmployees")} />
            </FormField>
            <FormField label="Annual Revenue">
              <Input type="number" min={0} {...register("annualRevenue")} />
            </FormField>
            <FormField label="Company Logo">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e?.target?.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    setValue("companyLogoBase64", String(reader.result || ""));
                  reader.readAsDataURL(file);
                }}
              />
              {companyLogoBase64 && (
                <img
                  src={companyLogoBase64}
                  alt="Company logo preview"
                  className="mt-2 h-12 w-12 rounded object-contain"
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Address Information */}
        <div className="mt-6 border-t border-border pt-5">
          <span className="mb-2 block text-sm font-medium text-foreground">
            Address Information
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Registered Address">
                <Textarea rows={2} {...register("registeredAddress")} />
              </FormField>
            </div>
            <FormField label="Country">
              <Input {...register("country")} />
            </FormField>
            <FormField label="State">
              <Input {...register("state")} />
            </FormField>
            <FormField label="City">
              <Input {...register("city")} />
            </FormField>
            <FormField label="Pin Code" error={errors.pincode?.message}>
              <Input {...register("pincode")} maxLength={6} />
            </FormField>
          </div>
        </div>

        {/* Financial Information */}
        <div className="mt-6 border-t border-border pt-5">
          <span className="mb-2 block text-sm font-medium text-foreground">
            Financial Information
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Currency">
              <Select {...register("currency")}>
                <option value="">Select currency</option>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </FormField>
            <FormField label="Payment Terms">
              <Input {...register("paymentTerms")} placeholder="e.g. Net 30" />
            </FormField>
            <FormField label="Credit Limit" error={errors.creditLimit?.message}>
              <Input type="number" min={0} {...register("creditLimit")} />
            </FormField>
          </div>
        </div>

        {/* Attachments */}
        <div className="mt-6 border-t border-border pt-5">
          <span className="mb-2 block text-sm font-medium text-foreground">
            Attachments
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Company Registration Certificate"
              helper="File name only — not uploaded"
            >
              <Input
                type="file"
                onChange={(e) => {
                  const file = e?.target?.files?.[0];
                  if (!file) return;
                  setAttachments((prev) => [
                    ...prev,
                    {
                      id: `att_${Date.now()}`,
                      fileName: file.name,
                      uploadedAt: new Date().toISOString(),
                    },
                  ]);
                }}
              />
            </FormField>
            <FormField
              label="Business Documents"
              helper="File name only — not uploaded"
            >
              <Input
                type="file"
                onChange={(e) => {
                  const file = e?.target?.files?.[0];
                  if (!file) return;
                  setAttachments((prev) => [
                    ...prev,
                    {
                      id: `att_${Date.now()}`,
                      fileName: file.name,
                      uploadedAt: new Date().toISOString(),
                    },
                  ]);
                }}
              />
            </FormField>
          </div>
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {attachments.map((att) => (
                <li key={att.id}>{att.fileName}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Additional Information */}
        <div className="mt-6 border-t border-border pt-5">
          <span className="mb-2 block text-sm font-medium text-foreground">
            Additional Information
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Remarks">
              <Textarea rows={2} {...register("remarks")} />
            </FormField>
            <FormField label="Internal Comments">
              <Textarea rows={2} {...register("internalComments")} />
            </FormField>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/industries")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update client"
            ) : (
              "Create client"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default IndustryForm;
