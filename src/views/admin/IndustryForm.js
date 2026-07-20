import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Plus,
  Trash2,
  Building2,
  MapPin,
  Users,
  Landmark,
  CreditCard,
  Paperclip,
  StickyNote,
  GitBranch,
} from "lucide-react";
import { gstinOptional, MSG, phoneOptional } from "../../utils/validation";
import industryService from "../../services/industryService";
import industryBranchService from "../../services/industryBranchService";
import industryAttachmentService from "../../services/industryAttachmentService";
import areaService from "../../services/areaService";
import subZoneService from "../../services/subZoneService";
import branchService from "../../services/branchService";
import locationService from "../../services/locationService";
import bpDummy from "../../data/businessPartnerDummy";
import {
  INDUSTRY_SECTORS,
  OTHER_SECTOR_VALUE,
} from "../../constants/industrySectors";
import {
  BackButton,
  Loader,
  CrudFormPage,
  FormField,
  FileUpload,
} from "../../components";
import { cn } from "../../lib/utils";
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

const pincodeOptional = () =>
  yup
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v, o) => (o === "" ? null : v))
    .test(
      "pincode",
      "Pincode must be 6 digits",
      (v) => !v || /^\d{6}$/.test(v),
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

const branchRowSchema = yup.object({
  _id: yup.string().optional(),
  name: yup.string().trim().optional(),
  address: yup.string().trim().optional(),
  state: yup.string().trim().optional(),
  city: yup.string().trim().optional(),
  pincode: pincodeOptional(),
});

const industrySchema = yup.object({
  name: yup.string().required("Customer name is required").min(2).max(100),
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
  // Business/address/financial info — real Industry fields (persisted).
  clientType: yup.string().oneOf(["", "Customer", "Vendor"]).optional(),
  industrySector: yup.string().trim().max(100).optional(),
  industrySectorOtherText: yup.string().trim().max(100).optional(),
  registrationNumber: yup.string().trim().max(100).optional(),
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
  state: yup.string().trim().optional(),
  city: yup.string().trim().optional(),
  pincode: pincodeOptional(),
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
  // Branches — UI-only toggle + real industryBranch rows synced on submit.
  hasBranches: yup.boolean().default(false),
  branches: yup.array().of(branchRowSchema).optional().default([]),
});

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
  clientType: "",
  industrySector: "",
  industrySectorOtherText: "",
  registrationNumber: "",
  pan: "",
  website: "",
  companyEmail: "",
  companyPhone: "",
  companyLogoBase64: "",
  numberOfEmployees: "",
  annualRevenue: "",
  registeredAddress: "",
  state: "",
  city: "",
  pincode: "",
  paymentTerms: "",
  creditLimit: "",
  remarks: "",
  internalComments: "",
  hasBranches: false,
  branches: [],
};

// Real Industry fields accepted by the backend — used to build a clean
// create/update payload (hasBranches/branches/companyLogoBase64 are handled
// separately and must never be sent to industryService directly).
const buildBusinessInfoPayload = (values) => ({
  clientType: values.clientType || "",
  industrySector:
    values.industrySector === OTHER_SECTOR_VALUE
      ? (values.industrySectorOtherText || "").trim()
      : values.industrySector || "",
  registrationNumber: values.registrationNumber || "",
  pan: (values.pan || "").trim().toUpperCase(),
  website: values.website || "",
  companyEmail: values.companyEmail || "",
  companyPhone: values.companyPhone || "",
  numberOfEmployees:
    values.numberOfEmployees === "" || values.numberOfEmployees == null
      ? null
      : Number(values.numberOfEmployees),
  annualRevenue:
    values.annualRevenue === "" || values.annualRevenue == null
      ? null
      : Number(values.annualRevenue),
  registeredAddress: values.registeredAddress || "",
  state: values.state || "",
  city: values.city || "",
  pincode: values.pincode || "",
  paymentTerms: values.paymentTerms || "",
  creditLimit:
    values.creditLimit === "" || values.creditLimit == null
      ? null
      : Number(values.creditLimit),
  remarks: values.remarks || "",
  internalComments: values.internalComments || "",
});

/**
 * Consistent section header (icon chip + title + optional description) used
 * to visually anchor each group of fields in the long-form scaffold.
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
  const [states, setStates] = useState([]);
  const [citiesByState, setCitiesByState] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const prevAreaRef = useRef("");
  const prevStateRef = useRef("");
  const originalBranchIdsRef = useRef([]);
  const citiesByStateRef = useRef({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(industrySchema),
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
  const selectedState = watch("state");
  const selectedSector = watch("industrySector");

  useEffect(() => {
    citiesByStateRef.current = citiesByState;
  }, [citiesByState]);

  const ensureCitiesForState = async (state) => {
    if (!state || citiesByStateRef.current[state]) return;
    try {
      const res = await locationService.getCitiesByState(state);
      const data = res?.data || res;
      setCitiesByState((prev) => ({ ...prev, [state]: data?.cities || [] }));
    } catch (err) {
      toastError(err?.message || "Failed to load cities for this state");
      setCitiesByState((prev) => ({ ...prev, [state]: [] }));
    }
  };

  const cityOptionsFor = (state, currentCity) => {
    const list = citiesByState[state] || [];
    if (currentCity && !list.includes(currentCity)) {
      return [currentCity, ...list];
    }
    return list;
  };

  const lookupPincode = async (pincode) => {
    if (!/^\d{6}$/.test(pincode || "")) return null;
    try {
      const res = await locationService.getByPincode(pincode);
      const data = res?.data || res;
      return data?.state ? data : null;
    } catch (err) {
      toastError(err?.message || "Could not find location for this pincode");
      return null;
    }
  };

  useEffect(() => {
    fetchAreas();
    let cancelled = false;
    (async () => {
      try {
        const res = await locationService.getStates();
        const data = res?.data || res;
        if (!cancelled) setStates(data?.states || []);
      } catch (err) {
        if (!cancelled) {
          setStates([]);
          toastError(err?.message || "Failed to load states");
        }
      }
    })();
    if (isEdit) {
      fetchIndustry();
      fetchBranches();
      fetchAttachments();
    } else {
      reset(defaultValues);
      setAttachments([]);
      setPendingAttachments([]);
      originalBranchIdsRef.current = [];
    }
    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    if (!selectedState) {
      prevStateRef.current = "";
      return;
    }
    if (prevStateRef.current && prevStateRef.current !== selectedState) {
      setValue("city", "");
    }
    prevStateRef.current = selectedState;
    ensureCitiesForState(selectedState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  const fetchAreas = async () => {
    try {
      const res = await areaService.getAll({
        pageSize: 100,
        areaType: "industry",
      });
      const data = res?.data || res;
      setAreas(data?.areas || []);
    } catch (err) {
      console.error("Failed to fetch areas", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await industryBranchService.getAll({
        industryId: id,
        pageSize: 100,
      });
      const data = res?.data || res;
      const list = data?.branches || [];
      const mapped = list.map((b) => ({
        _id: b._id,
        name: b.name || "",
        address: b.address || "",
        state: b.state || "",
        city: b.city || "",
        pincode: b.pincode || "",
      }));
      originalBranchIdsRef.current = mapped.map((b) => b._id);
      setValue("branches", mapped);
      setValue("hasBranches", mapped.length > 0);
      mapped.forEach((b) => {
        if (b.state) ensureCitiesForState(b.state);
      });
    } catch (err) {
      toastError(err?.message || "Failed to load branches");
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await industryAttachmentService.list({ industryId: id });
      const data = res?.data || res;
      setAttachments(data?.attachments || []);
    } catch (err) {
      toastError(err?.message || "Failed to load attachments");
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
      const rawSector = data?.industrySector || "";
      const isKnownSector = INDUSTRY_SECTORS.includes(rawSector);
      reset({
        ...defaultValues,
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
        clientType: data?.clientType || "",
        industrySector: rawSector
          ? isKnownSector
            ? rawSector
            : OTHER_SECTOR_VALUE
          : "",
        industrySectorOtherText: rawSector && !isKnownSector ? rawSector : "",
        registrationNumber: data?.registrationNumber || "",
        pan: data?.pan || "",
        website: data?.website || "",
        companyEmail: data?.companyEmail || "",
        companyPhone: data?.companyPhone || "",
        companyLogoBase64:
          bpDummy.getOverlay("industry", id)?.companyLogoBase64 || "",
        numberOfEmployees: data?.numberOfEmployees ?? "",
        annualRevenue: data?.annualRevenue ?? "",
        registeredAddress: data?.registeredAddress || "",
        state: data?.state || "",
        city: data?.city || "",
        pincode: data?.pincode || "",
        paymentTerms: data?.paymentTerms || "",
        creditLimit: data?.creditLimit ?? "",
        remarks: data?.remarks || "",
        internalComments: data?.internalComments || "",
      });
      prevAreaRef.current =
        typeof data?.area === "object"
          ? data?.area?._id || ""
          : data?.area || "";
      prevStateRef.current = data?.state || "";
      if (data?.state) ensureCitiesForState(data.state);
    } catch (err) {
      toastError(err?.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentFileChange = async (e, label) => {
    const file = e?.target?.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (isEdit) {
      setAttachmentBusy(true);
      try {
        await industryAttachmentService.create({
          industryId: id,
          label,
          file,
        });
        await fetchAttachments();
        toastSuccess("Attachment uploaded");
      } catch (err) {
        toastError(err?.message || "Failed to upload attachment");
      } finally {
        setAttachmentBusy(false);
      }
    } else {
      setPendingAttachments((prev) => [...prev, { file, label }]);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await industryAttachmentService.delete(attachmentId);
      setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
    } catch (err) {
      toastError(err?.message || "Failed to delete attachment");
    }
  };

  const removePendingAttachment = (index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const syncBranches = async (industryId, branches) => {
    const rows = (branches || []).filter((b) => (b.name || "").trim());
    const keptIds = [];
    for (const row of rows) {
      const payload = {
        industryId,
        name: (row.name || "").trim(),
        address: row.address || "",
        state: row.state || "",
        city: row.city || "",
        pincode: row.pincode || "",
      };
      try {
        if (row._id) {
          await industryBranchService.update(row._id, payload);
          keptIds.push(row._id);
        } else {
          const res = await industryBranchService.create(payload);
          const created = res?.data?.data || res?.data || res;
          if (created?._id) keptIds.push(created._id);
        }
      } catch (err) {
        toastError(err?.message || "Failed to save a branch");
      }
    }
    const removedIds = originalBranchIdsRef.current.filter(
      (oid) => !keptIds.includes(oid),
    );
    for (const removedId of removedIds) {
      try {
        await industryBranchService.delete(removedId);
      } catch (err) {
        toastError(err?.message || "Failed to remove a branch");
      }
    }
  };

  const uploadPendingAttachments = async (industryId) => {
    for (const pending of pendingAttachments) {
      try {
        await industryAttachmentService.create({
          industryId,
          label: pending.label,
          file: pending.file,
        });
      } catch (err) {
        toastError(err?.message || "Failed to upload an attachment");
      }
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
          ...buildBusinessInfoPayload(values),
        };
        await industryService.update(id, payload);
        if (values.hasBranches) {
          await syncBranches(id, values.branches);
        }
        if (values.companyLogoBase64) {
          bpDummy.saveOverlay("industry", id, {
            companyLogoBase64: values.companyLogoBase64,
          });
        }
        toastSuccess("Customer updated successfully");
      } else {
        const payload = {
          name: values.name,
          category: values.category || "",
          area: values.area || null,
          subZoneId: values.subZoneId || null,
          location: values.location || "",
          shippingAddress: values.shippingAddress || "",
          billingAddress: values.billingAddress || "",
          gstNumber: (values.gstNumber || "").trim().toUpperCase(),
          purchase_manager_name: values.purchase_manager_name || "",
          purchase_manager_phone: values.purchase_manager_phone || "",
          email: values.email || "",
          branchId: branchId || undefined,
          purchaseManagers: (values.purchaseManagers || [])
            .filter((pm) => (pm.name || "").trim())
            .map((pm) => ({
              name: (pm.name || "").trim(),
              phone: (pm.phone || "").trim(),
              email: (pm.email || "").trim(),
              department: (pm.department || "").trim(),
            })),
          ...buildBusinessInfoPayload(values),
        };
        const res = await industryService.create(payload);
        const created = res?.data?.data || res?.data || res;
        const newId = created?._id || created?.id;
        if (newId) {
          if (values.hasBranches) {
            await syncBranches(newId, values.branches);
          }
          await uploadPendingAttachments(newId);
          if (values.companyLogoBase64) {
            bpDummy.saveOverlay("industry", newId, {
              companyLogoBase64: values.companyLogoBase64,
            });
          }
        }
        toastSuccess("Customer created successfully");
      }
      navigate("/industries");
    } catch (err) {
      toastError(err?.message || "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading customer..." />
      </div>
    );
  }

  const stateFieldProps = register("state");
  const pincodeFieldProps = register("pincode");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <BackButton fallback="/industries" />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CrudFormPage
        title={isEdit ? "Edit customer" : "Add customer"}
        description={
          isEdit
            ? "You can update location, purchase managers and addresses."
            : "Fill in customer details below."
        }
      >
        <FormSection
          icon={Building2}
          title="Basic Details"
          description="Core identity and classification for this customer."
          first
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Customer name"
              required
              error={errors.name?.message}
            >
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

            <FormField label="Customer Type" error={errors.clientType?.message}>
              <Select {...register("clientType")}>
                <option value="">Select type</option>
                <option value="Customer">Customer</option>
                <option value="Vendor">Vendor</option>
              </Select>
            </FormField>

            <FormField
              label="Industry (Sector)"
              error={errors.industrySector?.message}
            >
              <Select {...register("industrySector")}>
                <option value="">Select sector</option>
                {INDUSTRY_SECTORS.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
                <option value={OTHER_SECTOR_VALUE}>{OTHER_SECTOR_VALUE}</option>
              </Select>
            </FormField>

            {selectedSector === OTHER_SECTOR_VALUE && (
              <FormField
                label="Specify Sector"
                error={errors.industrySectorOtherText?.message}
              >
                <Input
                  {...register("industrySectorOtherText")}
                  placeholder="Enter industry sector"
                />
              </FormField>
            )}

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
                helper="Used to prioritise and segment customers."
                error={errors.category?.message}
              >
                <div className="flex flex-wrap gap-2">
                  {["A", "B", "C", "D"].map((cat) => (
                    <label
                      key={cat}
                      className={cn(
                        "relative flex! h-10 min-w-[3.5rem] cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium leading-none transition-colors",
                        "border-input bg-background text-foreground hover:bg-muted",
                        "has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary!",
                        isEdit && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="radio"
                        id={`category-${cat}`}
                        value={cat}
                        className="sr-only"
                        {...register("category")}
                        disabled={isEdit}
                      />
                      <span className="leading-none">{cat}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={MapPin}
          title="Location"
          description="Zone assignment and map reference used for routing and reporting."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <div className="md:col-span-2">
              <FormField
                label="Location ( Google Map URL )"
                error={errors.location?.message}
              >
                <Input {...register("location")} />
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={Users}
          title="Purchase Managers"
          description="Key procurement contacts at this customer."
          action={
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
          }
        >
          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              No purchase managers added. Click &quot;Add Purchase Manager&quot;
              to add.
            </p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-lg border border-border bg-muted/30 p-4"
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
        </FormSection>

        <FormSection
          icon={MapPin}
          title="Addresses"
          description="Shipping and billing destinations for orders and invoices."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        </FormSection>

        <FormSection
          icon={GitBranch}
          title="Branches"
          description="Additional branch locations for this customer, if any."
        >
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
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Branch locations
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendBranch({
                      name: "",
                      address: "",
                      state: "",
                      city: "",
                      pincode: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Branch
                </Button>
              </div>
              {branchFields.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  No branches added. Click &quot;Add Branch&quot; to add.
                </p>
              ) : (
                <div className="space-y-3">
                  {branchFields.map((field, index) => {
                    const rowState = watch(`branches.${index}.state`);
                    const rowCity = watch(`branches.${index}.city`);
                    const rowStateFieldProps = register(
                      `branches.${index}.state`,
                    );
                    const rowPincodeFieldProps = register(
                      `branches.${index}.pincode`,
                    );
                    return (
                      <div
                        key={field.id}
                        className="rounded-lg border border-border bg-muted/30 p-4"
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
                            <FormField
                              label="Pincode"
                              error={errors.branches?.[index]?.pincode?.message}
                            >
                              <Input
                                {...rowPincodeFieldProps}
                                maxLength={6}
                                onBlur={async (e) => {
                                  rowPincodeFieldProps.onBlur(e);
                                  const found = await lookupPincode(
                                    e.target.value,
                                  );
                                  if (found?.state) {
                                    setValue(
                                      `branches.${index}.state`,
                                      found.state,
                                    );
                                    await ensureCitiesForState(found.state);
                                  }
                                  if (found?.city) {
                                    setValue(
                                      `branches.${index}.city`,
                                      found.city,
                                    );
                                  }
                                }}
                              />
                            </FormField>
                          </div>
                          <div className="md:col-span-2">
                            <FormField label="State">
                              <Select
                                {...rowStateFieldProps}
                                onChange={(e) => {
                                  rowStateFieldProps.onChange(e);
                                  setValue(`branches.${index}.city`, "");
                                  ensureCitiesForState(e.target.value);
                                }}
                              >
                                <option value="">Select state</option>
                                {states.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Select>
                            </FormField>
                          </div>
                          <div className="md:col-span-2">
                            <FormField label="City">
                              <Select
                                {...register(`branches.${index}.city`)}
                                disabled={!rowState}
                              >
                                <option value="">
                                  {rowState
                                    ? "Select city"
                                    : "Select state first"}
                                </option>
                                {cityOptionsFor(rowState, rowCity).map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </Select>
                            </FormField>
                          </div>
                          <div className="flex md:col-span-12 md:justify-end">
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </FormSection>

        <FormSection
          icon={Landmark}
          title="Business Information"
          description="Public-facing company details and branding."
        >
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
              <div className="flex items-start gap-3">
                {companyLogoBase64 && (
                  <img
                    src={companyLogoBase64}
                    alt="Company logo preview"
                    className="h-16 w-16 shrink-0 rounded-lg border border-border object-contain p-1"
                  />
                )}
                <FileUpload
                  accept="image/*"
                  hint="PNG, JPG or SVG"
                  onChange={(e) => {
                    const file = e?.target?.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () =>
                      setValue(
                        "companyLogoBase64",
                        String(reader.result || ""),
                      );
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={MapPin}
          title="Address Information"
          description="Registered address used for compliance and correspondence."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Registered Address">
                <Textarea rows={2} {...register("registeredAddress")} />
              </FormField>
            </div>
            <FormField label="Pin Code" error={errors.pincode?.message}>
              <Input
                {...pincodeFieldProps}
                maxLength={6}
                onBlur={async (e) => {
                  pincodeFieldProps.onBlur(e);
                  const found = await lookupPincode(e.target.value);
                  if (found?.state) {
                    setValue("state", found.state);
                    await ensureCitiesForState(found.state);
                  }
                  if (found?.city) setValue("city", found.city);
                }}
              />
            </FormField>
            <FormField label="State">
              <Select {...stateFieldProps}>
                <option value="">Select state</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="City">
              <Select {...register("city")} disabled={!selectedState}>
                <option value="">
                  {selectedState ? "Select city" : "Select state first"}
                </option>
                {cityOptionsFor(selectedState, watch("city")).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={CreditCard}
          title="Financial Information"
          description="Payment terms and credit exposure for this customer."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Payment Terms">
              <Input {...register("paymentTerms")} placeholder="e.g. Net 30" />
            </FormField>
            <FormField label="Credit Limit" error={errors.creditLimit?.message}>
              <Input type="number" min={0} {...register("creditLimit")} />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={Paperclip}
          title="Attachments"
          description="Supporting documents for verification and records."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Company Registration Certificate">
              <FileUpload
                hint="PDF, JPG or PNG"
                disabled={attachmentBusy}
                onChange={(e) =>
                  handleAttachmentFileChange(
                    e,
                    "Company Registration Certificate",
                  )
                }
              />
            </FormField>
            <FormField label="Business Documents">
              <FileUpload
                hint="PDF, JPG or PNG"
                disabled={attachmentBusy}
                onChange={(e) =>
                  handleAttachmentFileChange(e, "Business Documents")
                }
              />
            </FormField>
          </div>
          {(attachments.length > 0 || pendingAttachments.length > 0) && (
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {attachments.map((att) => (
                <li
                  key={att._id}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">
                    {att.label ? `${att.label}: ` : ""}
                    {att.documentId?.originalName || "Attachment"}
                  </span>
                  <button
                    type="button"
                    className="text-destructive hover:underline"
                    onClick={() => handleDeleteAttachment(att._id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
              {pendingAttachments.map((pending, index) => (
                <li
                  key={`pending_${index}`}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">
                    {pending.label ? `${pending.label}: ` : ""}
                    {pending.file.name} (will upload on save)
                  </span>
                  <button
                    type="button"
                    className="text-destructive hover:underline"
                    onClick={() => removePendingAttachment(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FormSection>

        <FormSection
          icon={StickyNote}
          title="Additional Information"
          description="Free-form notes visible to your team."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Remarks">
              <Textarea rows={2} {...register("remarks")} />
            </FormField>
            <FormField label="Internal Comments">
              <Textarea rows={2} {...register("internalComments")} />
            </FormField>
          </div>
        </FormSection>

        <div className="-mx-6 -mb-6 mt-8 flex items-center justify-end gap-2 rounded-b-xl border-t border-border bg-muted/30 px-6 py-4">
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
              "Update customer"
            ) : (
              "Create customer"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default IndustryForm;
