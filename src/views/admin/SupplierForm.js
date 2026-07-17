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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  Mail,
  Landmark,
  MapPin,
  CreditCard,
  Paperclip,
  StickyNote,
  GitBranch,
  Tags,
} from "lucide-react";
import supplierService from "../../services/supplierService";
import supplierContactPersonService from "../../services/supplierContactPersonService";
import supplierBranchService from "../../services/supplierBranchService";
import categoryService from "../../services/categoryService";
import branchService from "../../services/branchService";
import locationService from "../../services/locationService";
import bpDummy from "../../data/businessPartnerDummy";
import { Loader, CrudFormPage, FormField, FileUpload } from "../../components";
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
    isActive: yup.boolean().optional().default(true),
    includeBankDetails: yup.boolean().default(false),
    bankDetails: yup.mixed().when("includeBankDetails", {
      is: true,
      then: () => requiredBankDetailsSchema,
      otherwise: () => optionalBankDetailsSchema.default({}),
    }),
  });
}

// Business/address/financial info — real Supplier fields (persisted).
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
          _id: yup.string().optional(),
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
  state: "",
  city: "",
  pincode: "",
  paymentTerms: "",
  creditLimit: "",
  internalComments: "",
};

// Real Supplier fields accepted by the backend — used to build a clean
// create/update payload (hasBranches/branches/companyLogoBase64 are handled
// separately and must never be sent to supplierService directly).
const buildBusinessInfoPayload = (values) => ({
  clientType: values.clientType || "",
  industrySector: values.industrySector || "",
  registrationNumber: values.registrationNumber || "",
  pan: (values.pan || "").trim().toUpperCase(),
  category: values.category || "",
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
  billingAddress: values.billingAddress || "",
  shippingAddress: values.shippingAddress || "",
  state: values.state || "",
  city: values.city || "",
  pincode: values.pincode || "",
  paymentTerms: values.paymentTerms || "",
  creditLimit:
    values.creditLimit === "" || values.creditLimit == null
      ? null
      : Number(values.creditLimit),
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
  isActive: true,
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
  const [states, setStates] = useState([]);
  const [citiesByState, setCitiesByState] = useState({});
  const catalogInputRef = useRef(null);
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
  const selectedState = watch("state");

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

  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchSupplierBranches = async (supplierId) => {
    try {
      const res = await supplierBranchService.getAll({
        supplierId,
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
        contactPersonId: b.contactPersonId?._id || b.contactPersonId || "",
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

  const syncSupplierBranches = async (supplierId, branches) => {
    const rows = (branches || []).filter((b) => (b.name || "").trim());
    const keptIds = [];
    for (const row of rows) {
      const payload = {
        supplierId,
        name: (row.name || "").trim(),
        address: row.address || "",
        state: row.state || "",
        city: row.city || "",
        pincode: row.pincode || "",
        contactPersonId: row.contactPersonId || null,
      };
      try {
        if (row._id) {
          await supplierBranchService.update(row._id, payload);
          keptIds.push(row._id);
        } else {
          const res = await supplierBranchService.create(payload);
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
        await supplierBranchService.delete(removedId);
      } catch (err) {
        toastError(err?.message || "Failed to remove a branch");
      }
    }
  };

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
    let cancelled = false;
    const loadContactPersons = async () => {
      try {
        const res = await supplierContactPersonService.getAll({
          pageNumber: 1,
          pageSize: 1000,
          status: "active",
        });
        const data = res?.data ?? res;
        const list = data?.contactPersons ?? data?.data?.contactPersons ?? [];
        if (!cancelled) {
          setContactPersons(
            (Array.isArray(list) ? list : []).map((cp) => ({
              ...cp,
              id: cp._id || cp.id,
            })),
          );
        }
      } catch {
        if (!cancelled) setContactPersons([]);
      }
    };
    loadContactPersons();
    if (isEdit) {
      fetchSupplier();
      fetchSupplierBranches(id);
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
      originalBranchIdsRef.current = [];
    }
    return () => {
      cancelled = true;
    };
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
        isActive: data?.isActive !== false,
        includeBankDetails: supplierHasBankDetails(existingBankDetails),
        bankDetails: existingBankDetails,
        clientType: data?.clientType || "",
        industrySector: data?.industrySector || "",
        registrationNumber: data?.registrationNumber || "",
        pan: data?.pan || "",
        category: data?.category || "",
        website: data?.website || "",
        companyEmail: data?.companyEmail || "",
        companyPhone: data?.companyPhone || "",
        companyLogoBase64:
          bpDummy.getOverlay("supplier", id)?.companyLogoBase64 || "",
        numberOfEmployees: data?.numberOfEmployees ?? "",
        annualRevenue: data?.annualRevenue ?? "",
        registeredAddress: data?.registeredAddress || "",
        billingAddress: data?.billingAddress || "",
        shippingAddress: data?.shippingAddress || "",
        state: data?.state || "",
        city: data?.city || "",
        pincode: data?.pincode || "",
        paymentTerms: data?.paymentTerms || "",
        creditLimit: data?.creditLimit ?? "",
        internalComments: data?.internalComments || "",
      });
      prevStateRef.current = data?.state || "";
      if (data?.state) ensureCitiesForState(data.state);
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
        const { bankDetails, includeBankDetails: withBankDetails } = values;
        const payload = {
          address: values.address || "",
          phone_1: values.phone_1 || "",
          phone_2: values.phone_2 || "",
          categories: values.categories || [],
          remark: values.remark || "",
          bankDetails: buildBankDetailsPayload(bankDetails, withBankDetails),
          isActive: values.isActive !== false,
          ...buildBusinessInfoPayload(values),
        };
        await supplierService.update(id, payload);
        if (values.hasBranches) {
          await syncSupplierBranches(id, values.branches);
        }
        if (values.companyLogoBase64) {
          bpDummy.saveOverlay("supplier", id, {
            companyLogoBase64: values.companyLogoBase64,
            attachments,
          });
        }
        toastSuccess("Supplier updated successfully");
      } else {
        const { bankDetails, includeBankDetails: withBankDetails } = values;
        const payload = {
          name: values.name,
          shopname: values.shopname || "",
          address: values.address || "",
          phone_1: values.phone_1 || "",
          phone_2: values.phone_2 || "",
          email: values.email || "",
          other_contact: values.other_contact || "",
          label: values.label || "",
          shop_location: values.shop_location || "",
          gst: values.gst || "",
          categories: values.categories || [],
          remark: values.remark || "",
          branchId,
          isActive: values.isActive !== false,
          ...buildBusinessInfoPayload(values),
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

        if (supplierId) {
          if (values.hasBranches) {
            await syncSupplierBranches(supplierId, values.branches);
          }
          if (values.companyLogoBase64 || attachments.length) {
            bpDummy.saveOverlay("supplier", supplierId, {
              companyLogoBase64: values.companyLogoBase64 || "",
              attachments,
            });
          }
          bpDummy.getOrCreateCode("supplier", supplierId);
        }
        toastSuccess("Supplier created successfully");
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
  const stateFieldProps = register("state");
  const pincodeFieldProps = register("pincode");

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
        <FormSection
          icon={Building2}
          title="Basic details"
          description="Identity, classification and status of this supplier."
          first
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

            <FormField label="Status" error={errors.isActive?.message}>
              <Select
                value={watch("isActive") === false ? "inactive" : "active"}
                onChange={(e) =>
                  setValue("isActive", e.target.value === "active", {
                    shouldValidate: true,
                  })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                label="Category"
                helper="Used to prioritise and segment suppliers."
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
                      )}
                    >
                      <input
                        type="radio"
                        value={cat}
                        className="sr-only"
                        checked={supplierCategory === cat}
                        onChange={() => setValue("category", cat)}
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
          icon={Mail}
          title="Contact information"
          description="How to reach this supplier and their tax identity."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          </div>
        </FormSection>

        <FormSection
          icon={Tags}
          title="Categories & address"
          description="Sourcing categories and the primary address."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Categories">
                <Input
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                <div
                  className="mt-2 grid gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/30 p-3"
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
          </div>
        </FormSection>

        <FormSection
          icon={Landmark}
          title="Bank details"
          description="Optional banking information for payments."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            {includeBankDetails ? (
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
            ) : (
              <div className="md:col-span-2">
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  Bank details are not included. Tick the box above to add them.
                </p>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection
          icon={Paperclip}
          title="Catalog"
          description="Product catalog stored in S3 (PDF, Excel, or images)."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField
                label="Catalog (PDF, Excel, or Images)"
                helper="For new suppliers, the catalog is uploaded after the supplier is created."
              >
                <div className="space-y-3">
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
                  <div className="flex flex-wrap items-center gap-3">
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
                </div>
              </FormField>
            </div>
          </div>
        </FormSection>

        {/* Branches */}
        <FormSection
          icon={GitBranch}
          title="Branches"
          description="Additional locations registered under this supplier."
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
              <div className="mb-3 flex items-center justify-end">
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
                          <div className="md:col-span-1">
                            <FormField label="City">
                              <Select
                                {...register(`branches.${index}.city`)}
                                disabled={!rowState}
                              >
                                <option value="">
                                  {rowState ? "Select" : "Select state first"}
                                </option>
                                {cityOptionsFor(rowState, rowCity).map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </Select>
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
                                {...register(
                                  `branches.${index}.contactPersonId`,
                                )}
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
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </FormSection>

        {/* Business Information */}
        <FormSection
          icon={Building2}
          title="Business information"
          description="Company profile, scale and branding."
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
              <FileUpload
                accept="image/*"
                hint="PNG or JPG"
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
        </FormSection>

        {/* Address Information */}
        <FormSection
          icon={MapPin}
          title="Address information"
          description="Registered, billing and shipping addresses."
        >
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

        {/* Financial Information */}
        <FormSection
          icon={CreditCard}
          title="Financial information"
          description="Payment terms and credit exposure."
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

        {/* Attachments */}
        <FormSection
          icon={Paperclip}
          title="Attachments"
          description="Reference documents (file name recorded only)."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Company Registration Certificate"
              helper="File name only — not uploaded"
            >
              <FileUpload
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
              <FileUpload
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
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {attachments.map((att) => (
                <li key={att.id}>{att.fileName}</li>
              ))}
            </ul>
          )}
        </FormSection>

        {/* Additional Information */}
        <FormSection
          icon={StickyNote}
          title="Additional information"
          description="Free-form notes visible to your team."
        >
          <FormField label="Internal Comments">
            <Textarea rows={2} {...register("internalComments")} />
          </FormField>
        </FormSection>

        <div className="-mx-6 -mb-6 mt-8 flex items-center justify-end gap-2 rounded-b-xl border-t border-border bg-muted/30 px-6 py-4">
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
