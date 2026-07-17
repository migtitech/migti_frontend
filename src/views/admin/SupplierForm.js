import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import supplierService from "../../services/supplierService";
import categoryService from "../../services/categoryService";
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
  Badge,
  Spinner,
} from "../../components/ui";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";
import useBranchContext from "../../hooks/useBranchContext";
import { IFSC_PATTERN, MSG, phoneOptional } from "../../utils/validation";

// Indian GSTIN: 15 chars - 2 digit state + 5 letter + 4 digit + 1 letter (PAN) + 1 entity + Z + 1 checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GST_MESSAGE =
  "GST number must be valid 15-character GSTIN (e.g. 22AABCU9603R1ZX)";
const PHONE_MESSAGE = "Phone number must be 10 to 15 digits";

const optionalBankDetailsSchema = yup.object({
  accountNumber: yup.string().notRequired().default(""),
  ifscCode: yup.string().notRequired().default(""),
  bankName: yup.string().notRequired().default(""),
  accountHolderName: yup.string().notRequired().default(""),
  upiDetails: yup.string().notRequired().default(""),
});

const requiredBankDetailsSchema = yup.object({
  accountHolderName: yup
    .string()
    .trim()
    .required("Account holder name is required"),
  accountNumber: yup
    .string()
    .trim()
    .required("Account number is required")
    .matches(/^\d{9,18}$/, "Enter a valid account number (9–18 digits)"),
  bankName: yup.string().trim().required("Bank name is required"),
  ifscCode: yup
    .string()
    .trim()
    .transform((value) =>
      typeof value === "string" ? value.toUpperCase() : value,
    )
    .required("IFSC code is required")
    .matches(IFSC_PATTERN, MSG.ifsc),
  upiDetails: yup.string().trim().required("UPI details is required"),
});

function getSupplierSchema() {
  return yup.object({
    name: yup
      .string()
      .required("Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    shopname: yup.string().notRequired().default(""),
    address: yup
      .string()
      .required("Address is required")
      .max(500, "Address must be at most 500 characters"),
    phone_1: yup
      .string()
      .required("Phone 1 is required")
      .transform((v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v))
      .matches(/^[0-9]{10,15}$/, PHONE_MESSAGE),
    phone_2: yup
      .string()
      .required("Phone 2 is required")
      .transform((v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v))
      .matches(/^[0-9]{10,15}$/, PHONE_MESSAGE),
    email: yup
      .string()
      .email("Enter a valid email")
      .required("Email is required")
      .transform((v) => (typeof v === "string" ? v.trim() : v)),
    other_contact: yup.string().notRequired().default(""),
    label: yup.string().notRequired().default(""),
    shop_location: yup.string().notRequired().default(""),
    gst: yup
      .string()
      .transform((v) =>
        typeof v === "string" ? v.trim().toUpperCase() : v || "",
      )
      .required("GST number is required")
      .matches(GSTIN_REGEX, GST_MESSAGE),
    categories: yup.array().of(yup.string()).optional().default([]),
    remark: yup.string().notRequired().default(""),
    branchId: yup.string().optional().nullable(),
    includeBankDetails: yup.boolean().default(false),
    bankDetails: yup.mixed().when("includeBankDetails", {
      is: true,
      then: () => requiredBankDetailsSchema,
      otherwise: () => optionalBankDetailsSchema.default({}),
    }),
  });
}

// Extra fields with no backend column yet — persisted client-side only via
// data/businessPartnerDummy.js (see onSubmit). All optional so they can
// never block a real save; merged into getSupplierSchema()'s resolver below.
// Note: Supplier already has real "remark" and "gst"/"address" fields, so
// this schema does not duplicate those.
function getSupplierNewFieldsSchema() {
  return yup.object({
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
    category: yup
      .string()
      .oneOf(["A", "B", "C", "D", ""], "Invalid category")
      .optional()
      .nullable(),
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
    billingAddress: yup.string().trim().optional(),
    shippingAddress: yup.string().trim().optional(),
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
}

const supplierOverlayDefaultValues = {
  clientType: "",
  industrySector: "",
  registrationNumber: "",
  pan: "",
  category: "",
  hasBranches: false,
  branches: [],
  website: "",
  companyEmail: "",
  companyPhone: "",
  companyLogoBase64: "",
  numberOfEmployees: "",
  annualRevenue: "",
  registeredAddress: "",
  billingAddress: "",
  shippingAddress: "",
  country: "",
  state: "",
  city: "",
  pincode: "",
  currency: "",
  paymentTerms: "",
  creditLimit: "",
  internalComments: "",
};

// Fields from the dummy overlay this form actually renders/submits.
const extractSupplierOverlayFields = (values) => ({
  clientType: values.clientType || "",
  industrySector: values.industrySector || "",
  registrationNumber: values.registrationNumber || "",
  pan: values.pan || "",
  category: values.category || "",
  hasBranches: Boolean(values.hasBranches),
  branches: values.branches || [],
  website: values.website || "",
  companyEmail: values.companyEmail || "",
  companyPhone: values.companyPhone || "",
  companyLogoBase64: values.companyLogoBase64 || "",
  numberOfEmployees: values.numberOfEmployees ?? "",
  annualRevenue: values.annualRevenue ?? "",
  registeredAddress: values.registeredAddress || "",
  billingAddress: values.billingAddress || "",
  shippingAddress: values.shippingAddress || "",
  country: values.country || "",
  state: values.state || "",
  city: values.city || "",
  pincode: values.pincode || "",
  currency: values.currency || "",
  paymentTerms: values.paymentTerms || "",
  creditLimit: values.creditLimit ?? "",
  internalComments: values.internalComments || "",
});

const defaultValues = {
  name: "",
  shopname: "",
  address: "",
  phone_1: "",
  phone_2: "",
  email: "",
  other_contact: "",
  label: "",
  shop_location: "",
  gst: "",
  categories: [],
  remark: "",
  branchId: "",
  includeBankDetails: false,
  bankDetails: {
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    accountHolderName: "",
    upiDetails: "",
  },
  ...supplierOverlayDefaultValues,
};

const SUPPLIER_FORM_DRAFT_KEY = "supplier_form_draft";

const emptyBankDetails = defaultValues.bankDetails;

const supplierHasBankDetails = (bankDetails = {}) =>
  [
    bankDetails.accountNumber,
    bankDetails.ifscCode,
    bankDetails.bankName,
    bankDetails.accountHolderName,
    bankDetails.upiDetails,
  ].some((value) => String(value || "").trim());

const buildBankDetailsPayload = (bankDetails, withBankDetails) => {
  if (!withBankDetails) {
    return { ...emptyBankDetails };
  }
  return {
    accountNumber: bankDetails?.accountNumber || "",
    ifscCode: bankDetails?.ifscCode || "",
    bankName: bankDetails?.bankName || "",
    accountHolderName: bankDetails?.accountHolderName || "",
    upiDetails: bankDetails?.upiDetails || "",
  };
};

const SupplierForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { branchId: userBranchId } = useBranchContext();

  const [categories, setCategories] = useState([]);
  const [defaultBranchId, setDefaultBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [catalogUploading, setCatalogUploading] = useState(false);
  const [catalogPreview, setCatalogPreview] = useState(null);
  const [newCatalogFile, setNewCatalogFile] = useState(null);
  const [supplierCode, setSupplierCode] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [contactPersons, setContactPersons] = useState([]);
  const catalogInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(
      getSupplierSchema().concat(getSupplierNewFieldsSchema()),
    ),
    defaultValues,
    mode: "onBlur",
  });

  const {
    fields: branchFields,
    append: appendBranch,
    remove: removeBranch,
  } = useFieldArray({
    control,
    name: "branches",
  });

  const selectedCategories = watch("categories") || [];
  const includeBankDetails = watch("includeBankDetails");
  const hasBranches = watch("hasBranches");
  const companyLogoBase64 = watch("companyLogoBase64");
  const supplierCategory = watch("category");

  useEffect(() => {
    fetchCategories();
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
  }, [userBranchId]);

  useEffect(() => {
    setContactPersons(bpDummy.listContactPersons({ parentType: "supplier" }));
    if (isEdit) {
      fetchSupplier();
    } else {
      // Load draft for new supplier form, if present
      try {
        const raw = localStorage.getItem(SUPPLIER_FORM_DRAFT_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          reset({ ...defaultValues, ...stored });
        } else {
          reset(defaultValues);
        }
      } catch {
        reset(defaultValues);
      }
      setSupplierCode("");
      setAttachments([]);
    }
  }, [id, isEdit, reset]);

  // Autosave draft for new supplier
  useEffect(() => {
    if (isEdit) return;
    const subscription = watch((values) => {
      try {
        localStorage.setItem(SUPPLIER_FORM_DRAFT_KEY, JSON.stringify(values));
      } catch {
        // ignore storage errors
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, isEdit]);

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getAll({
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data || res;
      setCategories(data?.categories || []);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const fetchSupplier = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await supplierService.getById(id);
      const data = res?.data || res;
      const existingBankDetails = {
        accountNumber: data?.bankDetails?.accountNumber || "",
        ifscCode: data?.bankDetails?.ifscCode || "",
        bankName: data?.bankDetails?.bankName || "",
        accountHolderName: data?.bankDetails?.accountHolderName || "",
        upiDetails: data?.bankDetails?.upiDetails || "",
      };
      reset({
        name: data?.name || "",
        shopname: data?.shopname || "",
        address: data?.address || "",
        phone_1: data?.phone_1 || "",
        phone_2: data?.phone_2 || "",
        email: data?.email || "",
        other_contact: data?.other_contact || "",
        label: data?.label || data?.labal || "",
        shop_location: data?.shop_location || "",
        gst: data?.gst || "",
        categories: (data?.categories || []).map((cat) =>
          typeof cat === "string" ? cat : cat?._id,
        ),
        remark: data?.remark || "",
        includeBankDetails: supplierHasBankDetails(existingBankDetails),
        bankDetails: existingBankDetails,
        ...bpDummy.getOverlay("supplier", id),
      });
      if (data?.catalog?.url) {
        setCatalogPreview(data.catalog);
      } else {
        setCatalogPreview(null);
      }
      setSupplierCode(bpDummy.getOrCreateCode("supplier", id));
      setAttachments(bpDummy.getOverlay("supplier", id).attachments || []);
    } catch (err) {
      toastError(err?.message || "Failed to fetch supplier");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    const list = term
      ? categories.filter((cat) => cat.name?.toLowerCase().includes(term))
      : categories;
    return list.slice(0, 10);
  }, [categories, categorySearch]);

  const selectedCategoryBadges = useMemo(() => {
    return selectedCategories.map((id) => {
      const match = categories.find((cat) => cat._id === id);
      return {
        id,
        name: match?.name || id,
      };
    });
  }, [selectedCategories, categories]);

  const handleCatalogUpload = useCallback(
    async (e) => {
      const file = e?.target?.files?.[0];
      if (!file || !id) return;
      setCatalogUploading(true);
      setError("");
      try {
        const res = await supplierService.uploadCatalog(id, file);
        const supplier = res?.data?.data || res?.data || res;
        const cat = supplier?.catalog;
        if (cat?.url) {
          setCatalogPreview({
            url: cat.url,
            fileName: cat.fileName,
            uploadedAt: cat.uploadedAt,
          });
        }
        toastSuccess("Catalog uploaded successfully");
      } catch (err) {
        toastError(
          err?.response?.data?.message ||
            err?.message ||
            "Catalog upload failed",
        );
      } finally {
        setCatalogUploading(false);
        if (catalogInputRef.current) catalogInputRef.current.value = "";
      }
    },
    [id],
  );

  const toggleCategory = (categoryId) => {
    const exists = selectedCategories.includes(categoryId);
    const next = exists
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];
    setValue("categories", next, { shouldValidate: true });
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(SUPPLIER_FORM_DRAFT_KEY);
    } catch {
      // ignore
    }
    reset(defaultValues);
    toastSuccess("Saved supplier form data cleared");
  };

  const handleIncludeBankDetailsChange = (checked) => {
    setValue("includeBankDetails", checked, { shouldValidate: checked });
    if (!checked) {
      setValue("bankDetails", emptyBankDetails);
      clearErrors("bankDetails");
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
        const {
          bankDetails,
          includeBankDetails: withBankDetails,
          ...restValues
        } = values;
        const payload = {
          address: restValues.address || "",
          phone_1: restValues.phone_1 || "",
          phone_2: restValues.phone_2 || "",
          categories: restValues.categories || [],
          remark: restValues.remark || "",
          bankDetails: buildBankDetailsPayload(bankDetails, withBankDetails),
        };
        await supplierService.update(id, payload);
        toastSuccess("Supplier updated successfully");
        bpDummy.saveOverlay("supplier", id, {
          ...extractSupplierOverlayFields(values),
          attachments,
        });
      } else {
        // Only real Supplier fields go to the API — new dummy fields (see
        // getSupplierNewFieldsSchema) are intentionally excluded via
        // destructuring so they never leak into the real create payload.
        const {
          bankDetails,
          includeBankDetails: withBankDetails,
          clientType,
          industrySector,
          registrationNumber,
          pan,
          category,
          hasBranches: _hasBranches,
          branches,
          website,
          companyEmail,
          companyPhone,
          companyLogoBase64,
          numberOfEmployees,
          annualRevenue,
          registeredAddress,
          billingAddress,
          shippingAddress,
          country,
          state,
          city,
          pincode,
          currency,
          paymentTerms,
          creditLimit,
          internalComments,
          ...restValues
        } = values;
        const payload = {
          ...restValues,
          branchId,
          categories: values.categories || [],
        };
        if (withBankDetails) {
          payload.bankDetails = buildBankDetailsPayload(
            bankDetails,
            withBankDetails,
          );
        }
        const res = await supplierService.create(payload);
        const created = res?.data?.data || res?.data || res;
        const supplierId = created?._id || created?.id;

        if (newCatalogFile && supplierId) {
          try {
            setCatalogUploading(true);
            await supplierService.uploadCatalog(supplierId, newCatalogFile);
            toastSuccess("Catalog uploaded successfully");
          } catch (err) {
            toastError(
              err?.response?.data?.message ||
                err?.message ||
                "Catalog upload failed",
            );
          } finally {
            setCatalogUploading(false);
          }
        }

        toastSuccess("Supplier created successfully");
        if (supplierId) {
          bpDummy.saveOverlay("supplier", supplierId, {
            ...extractSupplierOverlayFields(values),
            attachments,
          });
          bpDummy.getOrCreateCode("supplier", supplierId);
        }
      }
      if (!isEdit) {
        try {
          localStorage.removeItem(SUPPLIER_FORM_DRAFT_KEY);
        } catch {}
      }
      navigate("/suppliers");
    } catch (err) {
      const apiErrors = err?.response?.data?.error;
      const message = Array.isArray(apiErrors)
        ? apiErrors.join(". ")
        : err?.response?.data?.message ||
          err?.message ||
          "Failed to save supplier";
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading supplier..." />
      </div>
    );
  }

  const editReadOnlyClass = isEdit ? "bg-muted" : "";

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/suppliers")}
          className="px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Suppliers
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CrudFormPage
        title={isEdit ? "Edit Supplier" : "Add Supplier"}
        description={
          isEdit
            ? "Only address, mobile numbers, categories, remark and bank details can be updated."
            : "Create a new supplier profile."
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
          <FormField label="Name" required error={errors.name?.message}>
            <Input
              {...register("name")}
              readOnly={isEdit}
              disabled={isEdit}
              className={editReadOnlyClass}
            />
          </FormField>
          <FormField label="Shop Name" error={errors.shopname?.message}>
            <Input
              {...register("shopname")}
              readOnly={isEdit}
              disabled={isEdit}
              className={editReadOnlyClass}
            />
          </FormField>

          <FormField label="Supplier Code" helper="Auto-generated on save">
            <Input
              value={supplierCode}
              readOnly
              disabled
              className="bg-muted"
            />
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
            <FormField label="Category" error={errors.category?.message}>
              <div className="flex h-9 items-center gap-4">
                {["A", "B", "C", "D"].map((cat) => (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      value={cat}
                      className="h-4 w-4 cursor-pointer accent-primary"
                      checked={supplierCategory === cat}
                      onChange={() => setValue("category", cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </FormField>
          </div>

          <FormField label="Email" error={errors.email?.message}>
            <Input
              type="email"
              {...register("email")}
              readOnly={isEdit}
              disabled={isEdit}
              className={editReadOnlyClass}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Phone 1" error={errors.phone_1?.message}>
              <Input {...register("phone_1")} placeholder="10 digits" />
            </FormField>
            <FormField label="Phone 2" error={errors.phone_2?.message}>
              <Input {...register("phone_2")} placeholder="10 digits" />
            </FormField>
          </div>

          <FormField
            label="Other Contact"
            error={errors.other_contact?.message}
          >
            <Input
              {...register("other_contact")}
              readOnly={isEdit}
              disabled={isEdit}
              className={editReadOnlyClass}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Label" error={errors.label?.message}>
              <Input
                {...register("label")}
                readOnly={isEdit}
                disabled={isEdit}
                className={editReadOnlyClass}
              />
            </FormField>
            <FormField
              label="Shop Location"
              error={errors.shop_location?.message}
            >
              <Input
                {...register("shop_location")}
                readOnly={isEdit}
                disabled={isEdit}
                className={editReadOnlyClass}
              />
            </FormField>
          </div>

          <FormField
            label="GST Number"
            error={errors.gst?.message}
            helper={!errors.gst ? "15-character GSTIN (optional)" : undefined}
          >
            <Input
              placeholder="e.g. 22AABCU9603R1ZX"
              maxLength={15}
              {...register("gst")}
              readOnly={isEdit}
              disabled={isEdit}
              className={editReadOnlyClass}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Categories">
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
              <div
                className="mt-2 grid gap-x-4 gap-y-1.5 rounded-lg border border-border p-3"
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  gridTemplateColumns: "repeat(4, 1fr)",
                }}
              >
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const inputId = `cat-${cat._id}`;
                    const checked = selectedCategories.includes(cat._id);
                    return (
                      <label
                        key={cat._id}
                        htmlFor={inputId}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          id={inputId}
                          className="h-4 w-4 accent-primary"
                          checked={checked}
                          onChange={() => toggleCategory(cat._id)}
                        />
                        <span>{cat.name}</span>
                      </label>
                    );
                  })
                ) : (
                  <small
                    className="text-muted-foreground"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    No categories found
                  </small>
                )}
              </div>
              {selectedCategoryBadges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCategoryBadges.map((cat) => (
                    <Badge variant="secondary" key={cat.id}>
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              )}
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="Address" error={errors.address?.message}>
              <Textarea rows={3} {...register("address")} />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="Remark" error={errors.remark?.message}>
              <Textarea rows={2} {...register("remark")} />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="includeBankDetails"
              className="flex cursor-pointer items-center gap-2"
            >
              <Checkbox
                id="includeBankDetails"
                checked={Boolean(includeBankDetails)}
                onCheckedChange={(checked) =>
                  handleIncludeBankDetailsChange(Boolean(checked))
                }
              />
              <span className="text-sm">Include bank details</span>
            </label>
          </div>

          {includeBankDetails && (
            <>
              <FormField
                label="Account Holder Name"
                required
                htmlFor="accountHolderName"
                error={errors.bankDetails?.accountHolderName?.message}
              >
                <Input
                  id="accountHolderName"
                  {...register("bankDetails.accountHolderName")}
                />
              </FormField>
              <FormField
                label="Account Number"
                required
                htmlFor="accountNumber"
                error={errors.bankDetails?.accountNumber?.message}
              >
                <Input
                  id="accountNumber"
                  inputMode="numeric"
                  {...register("bankDetails.accountNumber")}
                />
              </FormField>
              <FormField
                label="Bank Name"
                required
                htmlFor="bankName"
                error={errors.bankDetails?.bankName?.message}
              >
                <Input id="bankName" {...register("bankDetails.bankName")} />
              </FormField>
              <FormField
                label="IFSC Code"
                required
                htmlFor="ifscCode"
                error={errors.bankDetails?.ifscCode?.message}
              >
                <Input id="ifscCode" {...register("bankDetails.ifscCode")} />
              </FormField>
              <FormField
                label="UPI Details"
                required
                htmlFor="upiDetails"
                error={errors.bankDetails?.upiDetails?.message}
              >
                <Input
                  id="upiDetails"
                  {...register("bankDetails.upiDetails")}
                />
              </FormField>
            </>
          )}

          <div className="md:col-span-2">
            <FormField
              label="Catalog (PDF, Excel, or Images)"
              helper="Stored in S3. Supports PDF, Excel, or images. For new suppliers, the catalog is uploaded after the supplier is created."
            >
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  ref={catalogInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,image/*"
                  onChange={
                    isEdit
                      ? handleCatalogUpload
                      : (e) => {
                          const file = e?.target?.files?.[0] || null;
                          setNewCatalogFile(file);
                        }
                  }
                  disabled={catalogUploading || submitting}
                  className="max-w-[280px] cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
                />
                {catalogUploading && <Spinner size="sm" />}
                {isEdit && catalogPreview?.url && (
                  <div className="text-sm text-muted-foreground">
                    <a
                      href={catalogPreview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary! hover:underline"
                    >
                      {catalogPreview.fileName || "View catalog"}
                    </a>
                    {catalogPreview.uploadedAt && (
                      <span className="ml-2">
                        uploaded{" "}
                        {dateTimeFormatter(catalogPreview.uploadedAt, "—")}
                      </span>
                    )}
                  </div>
                )}
                {!isEdit && newCatalogFile && (
                  <div className="text-sm text-muted-foreground">
                    Selected file:{" "}
                    <strong className="text-foreground">
                      {newCatalogFile.name}
                    </strong>
                  </div>
                )}
              </div>
            </FormField>
          </div>
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
            <FormField label="Registered Address">
              <Textarea rows={2} {...register("registeredAddress")} />
            </FormField>
            <FormField label="Billing Address">
              <Textarea rows={2} {...register("billingAddress")} />
            </FormField>
            <FormField label="Shipping Address">
              <Textarea rows={2} {...register("shippingAddress")} />
            </FormField>
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
          <FormField label="Internal Comments">
            <Textarea rows={2} {...register("internalComments")} />
          </FormField>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/suppliers")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Spinner size="sm" />
            ) : isEdit ? (
              "Update Supplier"
            ) : (
              "Create Supplier"
            )}
          </Button>
        </div>
      </CrudFormPage>
    </form>
  );
};

export default SupplierForm;
