import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Package,
  Percent,
  Ruler,
  Boxes,
  Building2,
  Truck,
} from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Section card header: an icon chip + title + optional description used to
 * visually anchor each section card in the form (the shared "tile" system).
 */
const SectionCardHeader = ({ icon: Icon, title, description }) => (
  <CardHeader className="flex flex-row items-start gap-3 border-b border-border">
    {Icon && (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary!" />
      </span>
    )}
    <div>
      <CardTitle className="text-sm">{title}</CardTitle>
      {description && (
        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  </CardHeader>
);
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Checkbox,
  Alert,
  AlertDescription,
  Spinner,
  Progress,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui";
import productService from "../../services/productService";
import categoryService from "../../services/categoryService";
import subcategoryService from "../../services/subcategoryService";
import brandService from "../../services/brandService";
import groupService from "../../services/groupService";
import industryService from "../../services/industryService";
import supplierService from "../../services/supplierService";
import { getAssetsUrl } from "../../api/endpoints";
import {
  BackButton,
  GstRateSelect,
  Loader,
  StatusToggle,
} from "../../components";
import StatusLabel from "../../components/StatusLabel/StatusLabel";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import { useAuth, ROLES } from "../../context/AuthContext";
import { normalizeRole } from "../../hooks/usePermissions";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import {
  productFormSchema,
  validateCompanyProductCodeRows,
  validateSupplierProductCodeRows,
  validateProductPayload,
} from "../../validation/productSchema";
import {
  TIMELINE_UNIT_OPTIONS,
  convertTimelineToDays,
  computeNextTimelineDate,
  computeProcurementReviewStatus,
  formatDateInputValue,
  daysToTimelineForm,
  getTomorrowDateInputValue,
  getTodayDateInputValue,
  isFutureDate,
} from "../../utils/procurementTimeline";
import {
  buildVariantCode,
  getOptionValuesKey,
  deriveVariantsFromSelectedCombinations,
} from "../../utils/variantCode";
import "../../components/CrudFormPage/CrudFormPage.scss";

const VARIANT_TYPE_OPTIONS = [
  { value: "Brand", label: "Brand" },
  { value: "Color", label: "Color" },
  { value: "Size", label: "Size" },
  { value: "Grade", label: "Grade" },
  { value: "Thickness", label: "Thickness" },
  { value: "Voltage", label: "Voltage" },
  { value: "Weight", label: "Weight" },
  { value: "Height", label: "Height" },
  { value: "Length", label: "Length" },
  { value: "Amp", label: "Amp" },
];

const defaultValues = {
  name: "",
  description: "",
  category: "",
  subcategory: "",
  brand: "",
  group: "",
  hsnNumber: "",
  taxClause: "",
  gstPercentage: "",
  defaultModelNumber: "",
  hasVariants: true,
  weight: "",
  weightUnit: "g",
  dimensions: { length: "", width: "", height: "" },
  dimensionUnit: "cm",
  tags: "",
  status: "pending_hod_approval",
  unit: "PCS",
  purchaseUnit: "",
  salesUnit: "",
  minStock: "",
  maxStock: "",
  expiry: "",
};

const PRODUCT_FORM_DRAFT_KEY = "product_form_draft";

const getProductSteps = (includeHodSections) => {
  const steps = [
    { id: 1, label: "Basic Information" },
    { id: 2, label: "Tax & Accounting" },
    { id: 3, label: "Attributes" },
    { id: 4, label: "Inventory" },
  ];
  if (includeHodSections) {
    steps.push({ id: 5, label: "Map Customer Code" });
    steps.push({ id: 6, label: "Map Supplier Code" });
  }
  steps.push({ id: steps.length + 1, label: "Preview" });
  return steps;
};

const PREVIEW_EMPTY = "—";

const formatPreviewText = (value) => {
  if (value == null) return PREVIEW_EMPTY;
  const text = String(value).trim();
  return text || PREVIEW_EMPTY;
};

const getPreviewImageUrl = (image) => {
  if (!image) return "";
  if (typeof image === "object" && image?.path) return getAssetsUrl(image.path);
  return typeof image === "string" ? image : "";
};

const STEP_FIELD_GROUPS = {
  1: ["name", "group", "category", "status", "description", "subcategory"],
  2: ["gstPercentage", "hsnNumber", "unit", "purchaseUnit", "salesUnit"],
  4: ["minStock", "maxStock", "expiry"],
};

const EMPTY_COMPANY_PRODUCT_CODE = {
  industryId: "",
  industryLabel: "",
  code: "",
  search: "",
};

const EMPTY_SUPPLIER_PRODUCT_CODE = {
  supplierId: "",
  supplierLabel: "",
  code: "",
  search: "",
};

const isHodRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === ROLES.HEAD_OF_DEPARTMENT || normalized === "hod";
};

const collectFormErrors = (errs) => {
  const messages = [];
  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return;
    if (obj.message) {
      messages.push(obj.message);
      return;
    }
    Object.values(obj).forEach(walk);
  };
  walk(errs);
  return messages;
};

const formatApiValidationErrors = (err) => {
  const messages = [];
  const raw = err?.errors;
  if (Array.isArray(raw)) {
    messages.push(...raw.map((item) => String(item)));
  } else if (raw && typeof raw === "object") {
    Object.values(raw).forEach((value) => {
      if (Array.isArray(value))
        messages.push(...value.map((item) => String(item)));
      else if (value != null && String(value).trim())
        messages.push(String(value));
    });
  } else if (typeof raw === "string" && raw.trim()) {
    messages.push(raw);
  }
  if (messages.length === 0 && err?.message) {
    messages.push(err.message);
  }
  return messages.length ? messages : ["Failed to save product"];
};

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isHodUser = isHodRole(user?.role);
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [success, setSuccess] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  const showValidationAlert = (messages) => {
    const list = (Array.isArray(messages) ? messages : [messages])
      .flat()
      .map((item) => String(item).trim())
      .filter(Boolean);
    setValidationErrors(list.length ? list : ["Validation failed"]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearValidationAlert = () => setValidationErrors([]);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categoryBrands, setCategoryBrands] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  const [variants, setVariants] = useState([{ name: "", options: [] }]);
  const [customVariantInput, setCustomVariantInput] = useState({});

  const [variantCombinations, setVariantCombinations] = useState([]);
  const [companyProductCodes, setCompanyProductCodes] = useState([
    { ...EMPTY_COMPANY_PRODUCT_CODE },
  ]);
  const [supplierProductCodes, setSupplierProductCodes] = useState([
    { ...EMPTY_SUPPLIER_PRODUCT_CODE },
  ]);
  const [industryResultsByRow, setIndustryResultsByRow] = useState({});
  const [supplierResultsByRow, setSupplierResultsByRow] = useState({});
  const comboFileInputRefs = useRef({});
  const [productCode, setProductCode] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues,
    resolver: yupResolver(productFormSchema),
    mode: "onBlur",
  });

  const selectedGroup = watch("group");
  const selectedCategory = watch("category");
  const selectedSubcategory = watch("subcategory");
  const selectedBrand = watch("brand");
  const selectedStatus = watch("status");

  const sectionBodyStyle = { padding: "1.5rem 1.5rem" };
  const productSteps = getProductSteps(isHodUser);
  const totalSteps = productSteps.length;

  const goToStep = (step) => {
    if (step < 1 || step > totalSteps) return;
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "active";
    return "pending";
  };

  const validateAttributesStep = () => {
    const hasNamedAttribute = variants.some((attribute) =>
      attribute?.name?.trim(),
    );
    if (!hasNamedAttribute) {
      toastError("Add at least one attribute.");
      return false;
    }
    const hasVariantOption = variants.some(
      (attribute) =>
        attribute?.name?.trim() &&
        (attribute.options || []).some((option) => String(option).trim()),
    );
    if (!hasVariantOption) {
      toastError("Add at least one variant option for your attributes.");
      return false;
    }
    return true;
  };

  const getVariantComboLabel = (combo, index) =>
    combo.optionValues
      ?.map((o) => `${o.variantName}: ${o.variantValue}`)
      .join(" · ") || `Variant ${index + 1}`;

  const getDisplayVariantCode = (combo) => {
    if (combo.variantCode && !String(combo.variantCode).includes("?")) {
      return combo.variantCode;
    }
    return buildVariantCode(productCode, combo.optionValues);
  };

  const validateSelectedVariantCombinations = () => {
    const selected = variantCombinations.filter((vc) => vc.selected);
    if (selected.length === 0) {
      return ["Select at least one variant combination."];
    }

    const errors = [];
    selected.forEach((combo, index) => {
      const label = getVariantComboLabel(combo, index);

      if (!String(combo.modelNumber || "").trim()) {
        errors.push(`${label}: Model number is required`);
      }

      if (!(combo.images || []).length) {
        errors.push(`${label}: At least one image is required`);
      }

      const purchase =
        combo.costPrice === "" || combo.costPrice == null
          ? null
          : Number(combo.costPrice);
      const selling =
        combo.price === "" || combo.price == null ? null : Number(combo.price);

      if (purchase == null || !Number.isFinite(purchase)) {
        errors.push(`${label}: Purchase price is required`);
      } else if (purchase < 0) {
        errors.push(`${label}: Purchase price cannot be negative`);
      }

      if (selling == null || !Number.isFinite(selling)) {
        errors.push(`${label}: Selling price is required`);
      } else if (selling < 0) {
        errors.push(`${label}: Selling price cannot be negative`);
      }

      if (
        purchase != null &&
        selling != null &&
        Number.isFinite(purchase) &&
        Number.isFinite(selling) &&
        selling < purchase
      ) {
        errors.push(
          `${label}: Selling price cannot be less than purchase price`,
        );
      }

      const timelineVal =
        combo.timelineValue === "" || combo.timelineValue == null
          ? null
          : Number(combo.timelineValue);
      if (
        timelineVal != null &&
        Number.isFinite(timelineVal) &&
        timelineVal < 0
      ) {
        errors.push(`${label}: Procurement timeline cannot be negative`);
      }

      let nextDate = null;
      if (combo.nextTimelineDate) {
        const stored = new Date(combo.nextTimelineDate);
        if (!Number.isNaN(stored.getTime())) nextDate = stored;
      }
      if (!nextDate) {
        const timelineDays =
          combo.timeline != null && Number(combo.timeline) > 0
            ? Number(combo.timeline)
            : convertTimelineToDays(
                combo.timelineValue,
                combo.timelineUnit || "day",
              );
        nextDate = computeNextTimelineDate(timelineDays);
      }
      if (nextDate && !isFutureDate(nextDate)) {
        errors.push(`${label}: Next review date must be a future date`);
      }
    });

    return errors;
  };

  const handleNextStep = async () => {
    clearValidationAlert();

    if (STEP_FIELD_GROUPS[currentStep]) {
      if (currentStep === 1) {
        if (selectedGroup && groupSearch !== getSelectedGroupName()) {
          clearGroupSelection();
        }
        if (selectedCategory && categorySearch !== getSelectedCategoryName()) {
          clearCategorySelection();
        }
      }

      const isValid = await trigger(STEP_FIELD_GROUPS[currentStep]);
      if (!isValid) return;
    }

    if (currentStep === 3 && !validateAttributesStep()) {
      return;
    }

    if (currentStep === 3) {
      const comboErrors = validateSelectedVariantCombinations();
      if (comboErrors.length > 0) {
        showValidationAlert(comboErrors);
        return;
      }
    }

    if (currentStep === 5 && isHodUser) {
      const companyCodeErrors =
        await validateCompanyProductCodeRows(companyProductCodes);
      if (companyCodeErrors.length > 0) {
        showValidationAlert(companyCodeErrors);
        return;
      }
    }

    if (currentStep === 6 && isHodUser) {
      const supplierCodeErrors =
        await validateSupplierProductCodeRows(supplierProductCodes);
      if (supplierCodeErrors.length > 0) {
        showValidationAlert(supplierCodeErrors);
        return;
      }
    }

    goToStep(currentStep + 1);
  };

  const renderStepNav = () => (
    <div className="mb-4 flex flex-col items-stretch justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center">
      {currentStep > 1 ? (
        <Button
          variant="secondary"
          type="button"
          onClick={() => goToStep(currentStep - 1)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-2 sm:ml-auto">
        <Button
          variant="outline"
          type="button"
          onClick={() => navigate("/products")}
        >
          Cancel
        </Button>
        {currentStep < totalSteps ? (
          <Button type="button" onClick={handleNextStep}>
            Next
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={submitting}>
            {submitting ? <Spinner size="sm" className="mr-2" /> : null}
            {isEdit ? "Update Product" : "Create Product"}
          </Button>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    fetchDropdownData();
    if (isEdit) {
      fetchProduct();
    } else {
      // Load draft for new product form, if present
      try {
        const raw = localStorage.getItem(PRODUCT_FORM_DRAFT_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          const {
            companyProductCodes: storedCodes,
            supplierProductCodes: storedSupplierCodes,
            currentStep: storedStep,
            ...formValues
          } = stored;
          reset({ ...defaultValues, ...formValues, hasVariants: true });
          if (Array.isArray(storedCodes) && storedCodes.length > 0) {
            setCompanyProductCodes(storedCodes);
          }
          if (
            Array.isArray(storedSupplierCodes) &&
            storedSupplierCodes.length > 0
          ) {
            setSupplierProductCodes(storedSupplierCodes);
          }
          const maxStep = getProductSteps(isHodUser).length;
          if (
            typeof storedStep === "number" &&
            storedStep >= 1 &&
            storedStep <= maxStep
          ) {
            setCurrentStep(storedStep);
          }
        } else {
          reset(defaultValues);
        }
      } catch {
        reset(defaultValues);
      }
    }
  }, [id, isEdit, reset]);

  // Autosave draft for new product
  useEffect(() => {
    if (isEdit) return;
    const subscription = watch((values) => {
      try {
        localStorage.setItem(
          PRODUCT_FORM_DRAFT_KEY,
          JSON.stringify({
            ...values,
            companyProductCodes,
            supplierProductCodes,
            currentStep,
          }),
        );
      } catch {
        // ignore storage errors
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, isEdit, companyProductCodes, supplierProductCodes, currentStep]);

  // Preview the next product code from the selected group so variant codes
  // show a complete code (e.g. PRD-ELC-1-1R) instead of PRD-???-…
  useEffect(() => {
    if (isEdit) return;
    if (!selectedGroup) {
      setProductCode("");
      return;
    }
    let cancelled = false;
    const loadPreviewCode = async () => {
      try {
        const res = await productService.previewCode(selectedGroup);
        const data = res?.data?.data || res?.data || res;
        const code = data?.productCode || res?.productCode;
        if (!cancelled && code && !String(code).includes("?")) {
          setProductCode(code);
        }
      } catch {
        if (!cancelled) setProductCode("");
      }
    };
    loadPreviewCode();
    return () => {
      cancelled = true;
    };
  }, [selectedGroup, isEdit]);

  useEffect(() => {
    const timers = {};
    companyProductCodes.forEach((row, index) => {
      if (!row.search?.trim() || row.industryLabel === row.search) {
        setIndustryResultsByRow((prev) => ({ ...prev, [index]: [] }));
        return;
      }
      timers[index] = setTimeout(async () => {
        try {
          const res = await industryService.getAll({
            search: row.search.trim(),
            pageSize: 10,
          });
          const data = res?.data || res;
          setIndustryResultsByRow((prev) => ({
            ...prev,
            [index]: data?.industries || [],
          }));
        } catch {
          setIndustryResultsByRow((prev) => ({ ...prev, [index]: [] }));
        }
      }, 300);
    });
    return () => Object.values(timers).forEach(clearTimeout);
  }, [companyProductCodes]);

  useEffect(() => {
    const timers = {};
    supplierProductCodes.forEach((row, index) => {
      if (!row.search?.trim() || row.supplierLabel === row.search) {
        setSupplierResultsByRow((prev) => ({ ...prev, [index]: [] }));
        return;
      }
      timers[index] = setTimeout(async () => {
        try {
          const res = await supplierService.getAll({
            search: row.search.trim(),
            pageSize: 10,
          });
          const data = res?.data?.data || res?.data || res;
          setSupplierResultsByRow((prev) => ({
            ...prev,
            [index]: data?.suppliers || [],
          }));
        } catch {
          setSupplierResultsByRow((prev) => ({ ...prev, [index]: [] }));
        }
      }, 300);
    });
    return () => Object.values(timers).forEach(clearTimeout);
  }, [supplierProductCodes]);

  const fetchDropdownData = async () => {
    try {
      const [brandRes, groupRes] = await Promise.all([
        brandService.getAll({ pageNumber: 1, pageSize: 100 }),
        groupService.getAll({ pageNumber: 1, pageSize: 100, status: "active" }),
      ]);
      const brandData = brandRes?.data || brandRes;
      const groupData = groupRes?.data || groupRes;
      setBrands(brandData?.brands || []);
      setGroups(groupData?.groups || []);
    } catch (err) {
      console.error("Failed to fetch dropdown data", err);
    }
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(PRODUCT_FORM_DRAFT_KEY);
    } catch {
      // ignore
    }
    reset(defaultValues);
    setProductCode("");
    setCompanyProductCodes([{ ...EMPTY_COMPANY_PRODUCT_CODE }]);
    setSupplierProductCodes([{ ...EMPTY_SUPPLIER_PRODUCT_CODE }]);
    setVariants([{ name: "", options: [] }]);
    setVariantCombinations([]);
    setIndustryResultsByRow({});
    setSupplierResultsByRow({});
    setCurrentStep(1);
    toastSuccess("Saved product form data cleared");
  };

  const updateCompanyProductCodeRow = (index, field, value) => {
    setCompanyProductCodes((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const selectCompanyForRow = (index, industry) => {
    const indId = industry._id || industry.id;
    const label = industry.name || "";
    setCompanyProductCodes((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              industryId: indId || "",
              industryLabel: label,
              search: label,
            }
          : row,
      ),
    );
    setIndustryResultsByRow((prev) => ({ ...prev, [index]: [] }));
  };

  const addCompanyProductCodeRow = () => {
    setCompanyProductCodes((prev) => [
      ...prev,
      { ...EMPTY_COMPANY_PRODUCT_CODE },
    ]);
  };

  const removeCompanyProductCodeRow = (index) => {
    setCompanyProductCodes((prev) => {
      if (prev.length <= 1) return [{ ...EMPTY_COMPANY_PRODUCT_CODE }];
      return prev.filter((_, i) => i !== index);
    });
    setIndustryResultsByRow((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateSupplierProductCodeRow = (index, field, value) => {
    setSupplierProductCodes((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const selectSupplierForRow = (index, supplier) => {
    const supplierId = supplier._id || supplier.id;
    const label = supplier.name || supplier.shopname || "";
    setSupplierProductCodes((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              supplierId: supplierId || "",
              supplierLabel: label,
              search: label,
            }
          : row,
      ),
    );
    setSupplierResultsByRow((prev) => ({ ...prev, [index]: [] }));
  };

  const addSupplierProductCodeRow = () => {
    setSupplierProductCodes((prev) => [
      ...prev,
      { ...EMPTY_SUPPLIER_PRODUCT_CODE },
    ]);
  };

  const removeSupplierProductCodeRow = (index) => {
    setSupplierProductCodes((prev) => {
      if (prev.length <= 1) return [{ ...EMPTY_SUPPLIER_PRODUCT_CODE }];
      return prev.filter((_, i) => i !== index);
    });
    setSupplierResultsByRow((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const fetchSubcategories = async (parentId) => {
    if (!parentId) {
      setSubcategories([]);
      return;
    }
    try {
      const res = await subcategoryService.getAllSubcategories({
        category: parentId,
        status: "active",
      });
      const data = res?.data || res;
      const inner = data?.data ?? data;
      setSubcategories(inner?.subcategories || []);
    } catch (err) {
      console.error("Failed to fetch subcategories", err);
    }
  };

  // When group changes, fetch categories for that group so category dropdown shows correctly
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = {
          pageNumber: 1,
          pageSize: 100,
          parent: "null",
          status: "active",
        };
        if (selectedGroup) params.group = selectedGroup;
        const res = await categoryService.getAll(params);
        if (cancelled) return;
        const data = res?.data || res;
        setCategories(data?.categories || []);
      } catch (err) {
        if (!cancelled)
          console.error("Failed to fetch categories by group", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedGroup]);

  const filteredGroups = groups.filter((g) =>
    (g.name || "").toLowerCase().includes((groupSearch || "").toLowerCase()),
  );

  const filteredCategories = categories.filter((c) => {
    const nameMatches = (c.name || "")
      .toLowerCase()
      .includes((categorySearch || "").toLowerCase());
    const categoryGroupId =
      c.group && (c.group._id || c.group) ? c.group._id || c.group : "";
    const matchesGroup =
      !selectedGroup || String(categoryGroupId) === String(selectedGroup);
    return nameMatches && matchesGroup;
  });

  const filteredSubcategories = subcategories.filter((s) =>
    (s.name || "")
      .toLowerCase()
      .includes((subcategorySearch || "").toLowerCase()),
  );

  const getSelectedGroupName = () => {
    if (!selectedGroup) return "";
    const group = groups.find(
      (item) => String(item._id || item.id) === String(selectedGroup),
    );
    return group?.name || groupSearch || "";
  };

  const getSelectedCategoryName = () => {
    if (!selectedCategory) return "";
    const category = categories.find(
      (item) => String(item._id || item.id) === String(selectedCategory),
    );
    return category?.name || categorySearch || "";
  };

  const getSelectedSubcategoryName = () => {
    if (!selectedSubcategory) return "";
    const subcategory = subcategories.find(
      (item) => String(item._id || item.id) === String(selectedSubcategory),
    );
    return subcategory?.name || subcategorySearch || "";
  };

  const resetBrandVariantOptions = () => {
    setVariants((prev) =>
      prev.map((attribute) =>
        attribute.name === "Brand"
          ? { ...attribute, options: [""] }
          : attribute,
      ),
    );
  };

  const clearGroupSelection = () => {
    setValue("group", "", { shouldValidate: true });
    setValue("category", "", { shouldValidate: true });
    setValue("subcategory", "", { shouldValidate: true });
    setCategorySearch("");
    setSubcategorySearch("");
    setCategoryBrands([]);
    resetBrandVariantOptions();
  };

  const clearCategorySelection = () => {
    setValue("category", "", { shouldValidate: true });
    setValue("subcategory", "", { shouldValidate: true });
    setSubcategorySearch("");
    setCategoryBrands([]);
    resetBrandVariantOptions();
  };

  const handleGroupSearchChange = (event) => {
    const nextSearch = event.target.value;
    setGroupSearch(nextSearch);
    if (selectedGroup && nextSearch !== getSelectedGroupName()) {
      clearGroupSelection();
    }
  };

  const handleCategorySearchChange = (event) => {
    const nextSearch = event.target.value;
    setCategorySearch(nextSearch);
    if (selectedCategory && nextSearch !== getSelectedCategoryName()) {
      clearCategorySelection();
    }
  };

  const handleSubcategorySearchChange = (event) => {
    const nextSearch = event.target.value;
    setSubcategorySearch(nextSearch);
    if (selectedSubcategory && nextSearch !== getSelectedSubcategoryName()) {
      setValue("subcategory", "", { shouldValidate: true });
    }
  };

  const filteredBrands = brands.filter((b) =>
    (b.name || "").toLowerCase().includes((brandSearch || "").toLowerCase()),
  );

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() => productService.getById(id));
      const product = res?.data || res;
      if (product) {
        reset({
          name: product.name || "",
          description: product.description || product.shortDescription || "",
          category: product.category?._id || product.category || "",
          subcategory: product.subcategory?._id || product.subcategory || "",
          brand: product.brand?._id || product.brand || "",
          group: product.group?._id || product.group || "",
          hsnNumber: product.hsnNumber || "",
          taxClause: product.taxClause || "",
          gstPercentage: product.gstPercentage ?? "",
          defaultModelNumber: product.defaultModelNumber || "",
          hasVariants: true,
          weight: product.weight ?? "",
          weightUnit: product.weightUnit || "g",
          dimensions: product.dimensions || {
            length: "",
            width: "",
            height: "",
          },
          dimensionUnit: product.dimensionUnit || "cm",
          tags: (product.tags || []).join(", "),
          status: product.status || "pending_hod_approval",
          unit: product.unit || "PCS",
          purchaseUnit: product.purchaseUnit || "",
          salesUnit: product.salesUnit || "",
          minStock: product.minStock ?? "",
          maxStock: product.maxStock ?? "",
          expiry: product.expiry
            ? formatDateInputValue(new Date(product.expiry))
            : "",
        });
        setProductCode(product.productCode || "");
        if (product.group?.name) setGroupSearch(product.group.name);
        if (product.category?.name) setCategorySearch(product.category.name);
        if (product.subcategory?.name)
          setSubcategorySearch(product.subcategory.name);
        const loadedVariants = product.variants || [];
        setVariants(
          loadedVariants.length > 0
            ? loadedVariants
            : [{ name: "", options: [] }],
        );
        const customInputMap = {};
        loadedVariants.forEach((v, i) => {
          if (v.name && !VARIANT_TYPE_OPTIONS.some((o) => o.value === v.name)) {
            customInputMap[i] = true;
          }
        });
        setCustomVariantInput(customInputMap);
        setVariantCombinations(
          (product.variantCombinations || []).map((vc) => {
            const queryImage = vc.queryQuotationImageId;
            const queryImageId =
              typeof queryImage === "object" && queryImage?._id
                ? queryImage._id
                : queryImage || null;
            return {
              ...vc,
              selected: true,
              price: vc.price ?? "",
              costPrice: vc.costPrice ?? "",
              modelNumber: vc.modelNumber || "",
              isActive: vc.isActive !== false,
              queryQuotationImageId: queryImageId,
              ...daysToTimelineForm(vc.timeline),
              nextTimelineDate: vc.nextTimelineDate || null,
              procurementReviewStatus: vc.procurementReviewStatus || "idle",
            };
          }),
        );
        const loadedCompanyCodes = (product.companyProductCodes || []).map(
          (item) => {
            const industry = item.industry;
            const indId =
              (typeof industry === "object" ? industry?._id : industry) || "";
            const label =
              typeof industry === "object" ? industry?.name || "" : "";
            return {
              industryId: indId,
              industryLabel: label,
              code: item.code || "",
              search: label,
            };
          },
        );
        setCompanyProductCodes(
          loadedCompanyCodes.length > 0
            ? loadedCompanyCodes
            : [{ ...EMPTY_COMPANY_PRODUCT_CODE }],
        );
        const loadedSupplierCodes = (product.supplierProductCodes || []).map(
          (item) => {
            const supplier = item.supplier;
            const supplierId =
              (typeof supplier === "object" ? supplier?._id : supplier) || "";
            const label =
              typeof supplier === "object"
                ? supplier?.name || supplier?.shopname || ""
                : "";
            return {
              supplierId,
              supplierLabel: label,
              code: item.code || "",
              search: label,
            };
          },
        );
        setSupplierProductCodes(
          loadedSupplierCodes.length > 0
            ? loadedSupplierCodes
            : [{ ...EMPTY_SUPPLIER_PRODUCT_CODE }],
        );
        if (product.category?._id || product.category) {
          const categoryId = product.category?._id || product.category;
          fetchSubcategories(categoryId);
          fetchCategoryBrands(categoryId);
        }
      }
    } catch (err) {
      toastError(err?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryBrands = async (categoryId) => {
    if (!categoryId) {
      setCategoryBrands([]);
      return;
    }

    try {
      const response = await categoryService.getById(categoryId);
      const category = response?.data || response;
      setCategoryBrands(category?.brands || []);
    } catch (error) {
      setCategoryBrands([]);
      toastError(error?.message || "Failed to load category brands");
    }
  };

  const handleCategoryChange = (value) => {
    setValue("subcategory", "");
    setSubcategorySearch("");
    setCategoryBrands([]);
    setVariants((prev) =>
      prev.map((attribute) =>
        attribute.name === "Brand"
          ? { ...attribute, options: [""] }
          : attribute,
      ),
    );
    fetchSubcategories(value);
    fetchCategoryBrands(value);
  };

  // Variant management
  const addVariant = () => {
    setVariants((prev) => [...prev, { name: "", options: [] }]);
  };

  const handleVariantTypeChange = (index, value) => {
    if (value === "__custom__") {
      setCustomVariantInput((prev) => ({ ...prev, [index]: true }));
      setVariants((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], name: "" };
        return next;
      });
    } else {
      setCustomVariantInput((prev) => ({ ...prev, [index]: false }));
      setVariants((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          name: value,
          options: value === "Brand" ? [""] : [],
        };
        return next;
      });
    }
  };

  const updateVariantName = (index, name) => {
    setVariants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    });
  };

  const removeVariant = (index) => {
    setVariants((prev) => {
      if (prev.length <= 1) {
        return [{ name: "", options: [] }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const addSubVariant = (variantIndex) => {
    const variant = variants[variantIndex];
    if (!variant?.name) {
      toastError("Please enter an attribute name first.");
      return;
    }
    if (variant.name === "Brand" && !selectedCategory) {
      toastError("Select a category first.");
      return;
    }
    const newOption = "";
    setVariants((prev) => {
      const next = [...prev];
      next[variantIndex] = {
        ...next[variantIndex],
        options: [...next[variantIndex].options, newOption],
      };
      return next;
    });
  };

  const updateSubVariantName = (variantIndex, optionIndex, value) => {
    setVariants((prev) => {
      const next = [...prev];
      const newOptions = [...next[variantIndex].options];
      newOptions[optionIndex] = value;
      next[variantIndex] = { ...next[variantIndex], options: newOptions };
      return next;
    });
  };

  const removeSubVariant = (variantIndex, optionIndex) => {
    setVariants((prev) => {
      const next = [...prev];
      const newOptions = next[variantIndex].options.filter(
        (_, i) => i !== optionIndex,
      );
      next[variantIndex] = { ...next[variantIndex], options: newOptions };
      return next;
    });
  };

  const getVariantComboKey = (combo, index = 0) =>
    combo?._id || getOptionValuesKey(combo?.optionValues) || `combo-${index}`;

  const handleVariantComboImageUpload = async (comboIndex, files) => {
    if (!files?.length) return;
    const fileList = Array.from(files);
    try {
      const opts = id ? { productId: id } : {};
      const uploadRes = await productService.uploadImages(fileList, opts);
      const uploadData = uploadRes?.data ?? uploadRes;
      const documents =
        uploadData?.documents ?? uploadData?.data?.documents ?? [];
      if (documents.length > 0) {
        const newImages = documents.map((d) => ({
          _id: d._id || d.id,
          path: d.path || d.url || "",
        }));
        setVariantCombinations((prev) => {
          const next = [...prev];
          const combo = next[comboIndex];
          const images = [...(combo.images || []), ...newImages];
          next[comboIndex] = {
            ...combo,
            images,
            queryQuotationImageId:
              combo.queryQuotationImageId || newImages[0]?._id || null,
          };
          return next;
        });
        toastSuccess(`${newImages.length} image(s) uploaded`);
      } else {
        toastError("No documents returned from upload");
      }
    } catch (err) {
      toastError(err?.message || "Image upload failed");
    }
  };

  const removeVariantComboImage = (comboIndex, imageIndex) => {
    setVariantCombinations((prev) => {
      const next = [...prev];
      const combo = next[comboIndex];
      const removed = (combo.images || [])[imageIndex];
      const removedId =
        typeof removed === "object" && removed?._id ? removed._id : removed;
      const queryId =
        typeof combo.queryQuotationImageId === "object"
          ? combo.queryQuotationImageId?._id
          : combo.queryQuotationImageId;
      next[comboIndex] = {
        ...combo,
        images: (combo.images || []).filter((_, i) => i !== imageIndex),
        queryQuotationImageId:
          String(queryId || "") === String(removedId || "")
            ? null
            : combo.queryQuotationImageId,
      };
      return next;
    });
  };

  const setVariantComboQueryQuotationImage = (comboIndex, imageId) => {
    setVariantCombinations((prev) => {
      const next = [...prev];
      next[comboIndex] = {
        ...next[comboIndex],
        queryQuotationImageId: imageId || null,
      };
      return next;
    });
  };

  /** Cartesian product of variant options -> array of { optionValues, variantCode, price, ... } */
  const generateSubvariantsFromVariants = () => {
    const varsWithOptions = variants.filter(
      (v) => v?.name && v?.options?.length > 0,
    );
    if (varsWithOptions.length === 0) {
      toastError("Add at least one attribute with variant options.");
      return;
    }
    const existingByKey = new Map(
      variantCombinations.map((combo) => [
        getOptionValuesKey(combo.optionValues),
        combo,
      ]),
    );

    const optionArrays = varsWithOptions.map((v) =>
      (v.options || [])
        .filter(Boolean)
        .map((val) => ({ variantName: v.name, variantValue: val })),
    );
    const combine = (arrs, i = 0) => {
      if (i >= arrs.length) return [[]];
      const rest = combine(arrs, i + 1);
      return arrs[i].flatMap((opt) => rest.map((r) => [opt, ...r]));
    };
    const optionValueLists = combine(optionArrays);
    const newCombos = optionValueLists.map((optionValues) => {
      const existing = existingByKey.get(getOptionValuesKey(optionValues));
      return {
        _id: existing?._id,
        optionValues,
        price: existing?.price ?? "",
        mrp: existing?.mrp ?? 0,
        costPrice: existing?.costPrice ?? "",
        quantity: existing?.quantity ?? 0,
        weight: existing?.weight ?? 0,
        weightUnit: existing?.weightUnit ?? "g",
        dimensions: existing?.dimensions ?? {
          length: 0,
          width: 0,
          height: 0,
        },
        dimensionUnit: existing?.dimensionUnit ?? "cm",
        images: existing?.images ?? [],
        queryQuotationImageId: existing?.queryQuotationImageId ?? null,
        modelNumber: existing?.modelNumber ?? "",
        isActive: existing?.isActive !== false,
        variantCode: existing?.variantCode,
        timelineValue: existing?.timelineValue ?? "",
        timelineUnit: existing?.timelineUnit ?? "day",
        timeline: existing?.timeline ?? null,
        nextTimelineDate: existing?.nextTimelineDate ?? null,
        procurementReviewStatus: existing?.procurementReviewStatus ?? "idle",
        selected: existing?.selected ?? false,
      };
    });
    setVariantCombinations(newCombos);
    toastSuccess(
      `Generated ${newCombos.length} variants. Select the ones you need.`,
    );
  };

  const toggleVariantComboSelected = (comboIndex) => {
    setVariantCombinations((prev) => {
      const next = [...prev];
      next[comboIndex] = {
        ...next[comboIndex],
        selected: !next[comboIndex].selected,
      };
      return next;
    });
  };

  const updateVariantComboField = (comboIndex, field, value) => {
    setVariantCombinations((prev) => {
      const next = [...prev];
      const combo = { ...next[comboIndex], [field]: value };
      if (field === "nextTimelineDate") {
        const timelineDays =
          combo.timeline != null && Number(combo.timeline) > 0
            ? Number(combo.timeline)
            : convertTimelineToDays(
                combo.timelineValue,
                combo.timelineUnit || "day",
              );
        combo.procurementReviewStatus = computeProcurementReviewStatus(
          timelineDays,
          value ? new Date(value) : null,
        );
      }
      next[comboIndex] = combo;
      return next;
    });
  };

  const getComboTimelineDays = (combo) => {
    if (combo.timeline != null && Number(combo.timeline) > 0) {
      return Number(combo.timeline);
    }
    return convertTimelineToDays(
      combo.timelineValue,
      combo.timelineUnit || "day",
    );
  };

  const getComboNextTimelineDate = (combo) => {
    const timelineDays = getComboTimelineDays(combo);
    if (timelineDays <= 0) return null;
    if (combo.nextTimelineDate) {
      const stored = new Date(combo.nextTimelineDate);
      if (!Number.isNaN(stored.getTime())) return stored;
    }
    return computeNextTimelineDate(timelineDays);
  };

  const updateVariantComboTimeline = (comboIndex, updates) => {
    setVariantCombinations((prev) => {
      const next = [...prev];
      const combo = { ...next[comboIndex], ...updates };
      const timelineDays = convertTimelineToDays(
        combo.timelineValue,
        combo.timelineUnit || "day",
      );
      const nextTimelineDate =
        timelineDays > 0 ? computeNextTimelineDate(timelineDays) : null;
      next[comboIndex] = {
        ...combo,
        timeline: timelineDays > 0 ? timelineDays : null,
        nextTimelineDate: nextTimelineDate?.toISOString() ?? null,
        procurementReviewStatus: computeProcurementReviewStatus(
          timelineDays,
          nextTimelineDate,
        ),
      };
      return next;
    });
  };

  const onInvalid = (formErrors) => {
    showValidationAlert(collectFormErrors(formErrors));
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    clearValidationAlert();
    setSuccess("");

    try {
      if (!validateAttributesStep()) {
        setSubmitting(false);
        goToStep(3);
        return;
      }

      const selectedCombinations = variantCombinations.filter(
        (vc) => vc.selected,
      );

      const comboErrors = validateSelectedVariantCombinations();
      if (comboErrors.length > 0) {
        showValidationAlert(comboErrors);
        setSubmitting(false);
        goToStep(3);
        return;
      }

      const companyCodeErrors = isHodUser
        ? await validateCompanyProductCodeRows(companyProductCodes)
        : [];
      const supplierCodeErrors = isHodUser
        ? await validateSupplierProductCodeRows(supplierProductCodes)
        : [];
      if (companyCodeErrors.length > 0 || supplierCodeErrors.length > 0) {
        showValidationAlert([...companyCodeErrors, ...supplierCodeErrors]);
        setSubmitting(false);
        return;
      }

      if (selectedCombinations.length === 0) {
        showValidationAlert(["Select at least one variant combination."]);
        setSubmitting(false);
        goToStep(3);
        return;
      }

      let uploadedImages = [];

      const payload = {
        name: values.name,
        description: values.description || "",
        category: values.category,
        subcategory: values.subcategory || null,
        brand: values.brand || null,
        group: values.group,
        hsnNumber: values.hsnNumber.trim(),
        taxClause:
          (values.taxClause && values.taxClause.trim()) ||
          (values.gstPercentage !== "" && values.gstPercentage != null
            ? `${values.gstPercentage}% GST`
            : ""),
        gstPercentage:
          values.gstPercentage !== "" && values.gstPercentage != null
            ? parseFloat(values.gstPercentage)
            : undefined,
        defaultModelNumber: values.defaultModelNumber || "",
        hasVariants: true,
        variants: deriveVariantsFromSelectedCombinations(
          selectedCombinations,
          variants,
        ),
        images: uploadedImages,
        weight: 0,
        weightUnit: "g",
        dimensions: { length: 0, width: 0, height: 0 },
        dimensionUnit: "cm",
        tags: values.tags
          ? values.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        status: values.status,
        unit: values.unit,
        purchaseUnit: values.purchaseUnit || null,
        salesUnit: values.salesUnit || null,
        minStock:
          values.minStock !== "" && values.minStock != null
            ? parseInt(values.minStock, 10)
            : null,
        maxStock:
          values.maxStock !== "" && values.maxStock != null
            ? parseInt(values.maxStock, 10)
            : null,
        expiry: values.expiry || null,
      };

      if (isHodUser) {
        payload.companyProductCodes = companyProductCodes
          .filter((row) => row.industryId && row.code?.trim())
          .map((row) => ({
            industry: row.industryId,
            code: row.code.trim(),
          }));
        payload.supplierProductCodes = supplierProductCodes
          .filter((row) => row.supplierId && row.code?.trim())
          .map((row) => ({
            supplier: row.supplierId,
            code: row.code.trim(),
          }));
      }

      payload.variantCombinations = selectedCombinations.map((vc) => {
        const { selected: _selected, ...rest } = vc;
        const imageIds = (rest.images || []).map((img) =>
          typeof img === "object" && img?._id ? img._id : img,
        );
        let queryQuotationImageId =
          typeof rest.queryQuotationImageId === "object"
            ? rest.queryQuotationImageId?._id
            : rest.queryQuotationImageId;
        if (
          queryQuotationImageId &&
          !imageIds.some((id) => String(id) === String(queryQuotationImageId))
        ) {
          queryQuotationImageId = null;
        }
        return {
          ...rest,
          modelNumber: String(rest.modelNumber || "").trim(),
          price: parseFloat(rest.price),
          costPrice: parseFloat(rest.costPrice),
          isActive: rest.isActive !== false,
          images: imageIds,
          queryQuotationImageId: queryQuotationImageId || null,
          timelineValue:
            rest.timelineValue !== "" && rest.timelineValue != null
              ? Number(rest.timelineValue)
              : undefined,
          timelineUnit: rest.timelineUnit || "day",
          nextTimelineDate: rest.nextTimelineDate || undefined,
          procurementReviewStatus: rest.procurementReviewStatus || "idle",
        };
      });

      const payloadErrors = await validateProductPayload(payload);
      if (payloadErrors.length > 0) {
        showValidationAlert(payloadErrors);
        setSubmitting(false);
        return;
      }

      if (isEdit) {
        await productService.update(id, payload);
        toastSuccess("Product updated successfully");
        navigate("/products");
      } else {
        const created = await productService.create(payload);
        const createdProduct = created?.data?.data || created?.data;
        const productCode = createdProduct?.productCode;
        const variantCodes = createdProduct?.variantCombinations
          ?.map((vc) => vc.variantCode)
          .filter(Boolean);
        let msg = "Product created successfully.";
        if (productCode) msg += ` Product Code: ${productCode}`;
        if (variantCodes?.length > 0)
          msg += ` Variant codes: ${variantCodes.join(", ")}`;
        toastSuccess(msg);
        setTimeout(
          () =>
            navigate(
              createdProduct?._id
                ? `/products/${createdProduct._id}`
                : "/products",
            ),
          1500,
        );
      }
    } catch (err) {
      showValidationAlert(formatApiValidationErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  const renderPreviewRow = (label, value, options = {}) => {
    const { isLast = false, alignTop = false } = options;
    const borderClass = isLast ? "border-0" : "border-b border-border";
    return (
      <TableRow className={borderClass}>
        <TableHead
          scope="row"
          className={`bg-transparent py-3 font-normal text-muted-foreground ${alignTop ? "align-top" : ""}`}
          style={{ width: "32%", maxWidth: 220 }}
        >
          {label}
        </TableHead>
        <TableCell
          className={`break-words bg-transparent py-3 ${alignTop ? "align-top" : ""}`}
          style={alignTop ? { whiteSpace: "pre-wrap" } : undefined}
        >
          {value ?? PREVIEW_EMPTY}
        </TableCell>
      </TableRow>
    );
  };

  const renderCombinationPreviewCard = (combo, comboIndex) => {
    const timelineDays = getComboTimelineDays(combo);
    const nextReviewDate = getComboNextTimelineDate(combo);
    const reviewStatus =
      timelineDays > 0
        ? computeProcurementReviewStatus(timelineDays, nextReviewDate)
        : "idle";
    const variantCode = getDisplayVariantCode(combo);
    const queryImageId =
      typeof combo.queryQuotationImageId === "object"
        ? combo.queryQuotationImageId?._id
        : combo.queryQuotationImageId;
    const timelineUnitLabel = (unit) =>
      TIMELINE_UNIT_OPTIONS.find((option) => option.value === unit)?.label ||
      unit ||
      "day";

    return (
      <div key={getVariantComboKey(combo, comboIndex)}>
        <Card className="h-full border border-primary!">
          <CardHeader className="rounded-t-xl border-b border-border bg-muted px-4 py-2">
            <code className="mb-1 block text-sm text-primary!">
              {variantCode || PREVIEW_EMPTY}
            </code>
            <strong className="text-sm">
              {combo.optionValues
                ?.map(
                  (option) => `${option.variantName}: ${option.variantValue}`,
                )
                .join(" · ") || PREVIEW_EMPTY}
            </strong>
          </CardHeader>
          <CardContent className="px-4 py-3">
            {(combo.optionValues || []).length > 0 && (
              <div className="mb-3 text-sm">
                {(combo.optionValues || []).map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className="flex justify-between border-b border-border py-1"
                  >
                    <span className="text-muted-foreground">
                      {option.variantName}
                    </span>
                    <span className="ml-2 break-words text-right font-medium">
                      {formatPreviewText(option.variantValue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mb-3 text-sm">
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-muted-foreground">Status</span>
                <StatusLabel
                  status={combo.isActive !== false ? "active" : "inactive"}
                />
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-muted-foreground">Model Number</span>
                <span className="ml-2 break-words text-right">
                  {formatPreviewText(combo.modelNumber)}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-muted-foreground">Purchase Price</span>
                <span>
                  {combo.costPrice !== "" && combo.costPrice != null
                    ? combo.costPrice
                    : PREVIEW_EMPTY}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-muted-foreground">Selling Price</span>
                <span>
                  {combo.price !== "" && combo.price != null
                    ? combo.price
                    : PREVIEW_EMPTY}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-muted-foreground">
                  Procurement Timeline
                </span>
                <span className="ml-2 text-right">
                  {combo.timelineValue !== "" && combo.timelineValue != null
                    ? `${combo.timelineValue} ${timelineUnitLabel(combo.timelineUnit)}`
                    : PREVIEW_EMPTY}
                </span>
              </div>
              {timelineDays > 0 && (
                <div className="flex justify-between border-b border-border py-1">
                  <span className="text-muted-foreground">Stored as</span>
                  <span>
                    {timelineDays} day{timelineDays === 1 ? "" : "s"}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-border py-1">
                <span className="text-muted-foreground">Next Review Date</span>
                <span>
                  {nextReviewDate
                    ? formatDateInputValue(nextReviewDate)
                    : PREVIEW_EMPTY}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Review Status</span>
                <span className="capitalize">
                  {formatPreviewText(reviewStatus)}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm text-muted-foreground">Images</div>
              {(combo.images || []).length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  {PREVIEW_EMPTY}
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(combo.images || []).map((image, imageIndex) => {
                    const imageId =
                      typeof image === "object" && image?._id
                        ? image._id
                        : image;
                    const isQueryQuotation =
                      String(queryImageId || "") === String(imageId || "");
                    const imageUrl = getPreviewImageUrl(image);
                    if (!imageUrl) return null;
                    return (
                      <div
                        key={imageId || imageIndex}
                        className="flex flex-col items-center"
                        style={{ width: 72 }}
                      >
                        <div
                          className={`overflow-hidden rounded border border-border ${
                            isQueryQuotation ? "border-2 border-primary!" : ""
                          }`}
                          style={{ width: 64, height: 64 }}
                        >
                          <img
                            src={imageUrl}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        {isQueryQuotation && (
                          <span className="mt-1 text-sm">Query</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProductPreview = () => {
    const previewValues = watch();
    const filledCompanyCodes = companyProductCodes.filter(
      (row) => row.industryId && row.code?.trim(),
    );
    const filledSupplierCodes = supplierProductCodes.filter(
      (row) => row.supplierId && row.code?.trim(),
    );
    const selectedCombinations = variantCombinations.filter(
      (combo) => combo.selected,
    );
    const savedVariants = deriveVariantsFromSelectedCombinations(
      selectedCombinations,
      variants,
    );

    return (
      <>
        <Card className="mb-4">
          <SectionCardHeader icon={Package} title="Basic Information" />
          <CardContent style={sectionBodyStyle}>
            <Table style={{ tableLayout: "fixed" }}>
              <TableBody>
                {renderPreviewRow(
                  "Product Name",
                  formatPreviewText(previewValues.name),
                )}
                {renderPreviewRow(
                  "Group",
                  formatPreviewText(getSelectedGroupName()),
                )}
                {renderPreviewRow(
                  "Category",
                  formatPreviewText(getSelectedCategoryName()),
                )}
                {renderPreviewRow(
                  "Subcategory",
                  formatPreviewText(getSelectedSubcategoryName()),
                )}
                {renderPreviewRow(
                  "Status",
                  previewValues.status ? (
                    <StatusLabel status={previewValues.status} />
                  ) : (
                    PREVIEW_EMPTY
                  ),
                )}
                {renderPreviewRow(
                  "Description",
                  formatPreviewText(previewValues.description),
                  { isLast: true, alignTop: true },
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <SectionCardHeader icon={Percent} title="Tax & Accounting" />
          <CardContent style={sectionBodyStyle}>
            <Table style={{ tableLayout: "fixed" }}>
              <TableBody>
                {renderPreviewRow(
                  "GST",
                  previewValues.gstPercentage !== "" &&
                    previewValues.gstPercentage != null
                    ? `${previewValues.gstPercentage}%`
                    : "—",
                )}
                {renderPreviewRow(
                  "HSN Code",
                  formatPreviewText(previewValues.hsnNumber),
                )}
                {renderPreviewRow(
                  "Unit",
                  formatPreviewText(previewValues.unit),
                )}
                {renderPreviewRow(
                  "Purchase Unit",
                  formatPreviewText(previewValues.purchaseUnit),
                )}
                {renderPreviewRow(
                  "Sales Unit",
                  formatPreviewText(previewValues.salesUnit),
                  { isLast: true },
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <SectionCardHeader icon={Ruler} title="Attributes" />
          <CardContent style={sectionBodyStyle}>
            {savedVariants.length === 0 ? (
              <p className="mb-0 text-sm text-muted-foreground">
                {PREVIEW_EMPTY}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attribute</TableHead>
                      <TableHead>Options</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedVariants.map((attribute, attributeIndex) => (
                      <TableRow key={attributeIndex}>
                        <TableCell className="break-words font-medium">
                          {attribute.name}
                        </TableCell>
                        <TableCell className="break-words">
                          {(attribute.options || [])
                            .map((option) => String(option).trim())
                            .filter(Boolean)
                            .join(", ") || PREVIEW_EMPTY}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4">
          <SectionCardHeader icon={Boxes} title="Combinations" />
          <CardContent style={sectionBodyStyle}>
            {variantCombinations.length === 0 ? (
              <p className="mb-0 text-sm text-muted-foreground">
                {PREVIEW_EMPTY}
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {selectedCombinations.length} of {variantCombinations.length}{" "}
                  variant(s) selected
                </p>
                {selectedCombinations.length === 0 ? (
                  <p className="mb-0 text-sm text-muted-foreground">
                    {PREVIEW_EMPTY}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {selectedCombinations.map((combo, comboIndex) =>
                      renderCombinationPreviewCard(combo, comboIndex),
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4">
          <SectionCardHeader icon={Boxes} title="Inventory" />
          <CardContent style={sectionBodyStyle}>
            <Table style={{ tableLayout: "fixed" }}>
              <TableBody>
                {renderPreviewRow(
                  "Min Stock",
                  formatPreviewText(previewValues.minStock),
                )}
                {renderPreviewRow(
                  "Max Stock",
                  formatPreviewText(previewValues.maxStock),
                )}
                {renderPreviewRow(
                  "Expiry",
                  formatPreviewText(previewValues.expiry),
                  { isLast: true },
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {isHodUser && (
          <Card className="mb-4">
            <SectionCardHeader icon={Building2} title="Map Customer Code" />
            <CardContent style={sectionBodyStyle}>
              {filledCompanyCodes.length === 0 ? (
                <p className="mb-0 text-sm text-muted-foreground">
                  {PREVIEW_EMPTY}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Customer Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filledCompanyCodes.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          <TableCell className="break-words">
                            {formatPreviewText(row.industryLabel)}
                          </TableCell>
                          <TableCell className="break-words">
                            {formatPreviewText(row.code)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isHodUser && (
          <Card className="mb-4">
            <SectionCardHeader icon={Truck} title="Map Supplier Code" />
            <CardContent style={sectionBodyStyle}>
              {filledSupplierCodes.length === 0 ? (
                <p className="mb-0 text-sm text-muted-foreground">
                  {PREVIEW_EMPTY}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Supplier Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filledSupplierCodes.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          <TableCell className="break-words">
                            {formatPreviewText(row.supplierLabel)}
                          </TableCell>
                          <TableCell className="break-words">
                            {formatPreviewText(row.code)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading product..." />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <div className="mb-4">
        <BackButton fallback="/products" />
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {validationErrors.length === 1 ? (
              validationErrors[0]
            ) : (
              <ul className="mb-0 list-disc pl-4">
                {validationErrors.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="sticky top-0 mb-4" style={{ zIndex: 1040 }}>
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between">
              {productSteps.map((step) => {
                const status = getStepStatus(step.id);
                const isCompleted = status === "completed";
                const isActive = status === "active";
                return (
                  <div key={step.id} className="flex-1 text-center">
                    <div
                      className={`inline-flex items-center justify-center rounded-full border ${
                        isCompleted
                          ? "border-success! bg-success! text-success-foreground"
                          : isActive
                            ? "border-primary! bg-primary! text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground"
                      }`}
                      style={{ width: 36, height: 36 }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="mt-2 text-sm font-semibold">
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <Progress
              value={((currentStep - 1) / (totalSteps - 1 || 1)) * 100}
            />
          </CardContent>
        </Card>
      </div>

      {currentStep === 1 && (
        <>
          <Card className="mb-4">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-4 w-4 text-primary!" />
                </span>
                <CardTitle className="text-sm">Basic Information</CardTitle>
              </div>
              {!isEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={handleClearDraft}
                >
                  Clear saved data
                </Button>
              )}
            </CardHeader>
            <CardContent style={sectionBodyStyle}>
              <div className="mb-3">
                <Label className="mb-1.5 block">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Enter product name"
                  maxLength={100}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="mb-3">
                  <Label className="mb-1.5 block">
                    Group <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Type to search group…"
                    value={groupSearch}
                    onChange={handleGroupSearchChange}
                  />
                  {groupSearch && (
                    <div
                      className="mt-1 rounded-md border border-border bg-background"
                      style={{ maxHeight: "200px", overflowY: "auto" }}
                    >
                      {filteredGroups.length === 0 && (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          No matches
                        </div>
                      )}
                      {filteredGroups.map((g) => {
                        const groupId = g._id || g.id;
                        const isSelected = selectedGroup === groupId;
                        return (
                          <div
                            key={groupId}
                            className={`px-2 py-1 text-sm ${isSelected ? "bg-muted" : ""}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              const nextVal = groupId || "";
                              setValue("group", nextVal, {
                                shouldValidate: true,
                              });
                              setGroupSearch(g.name || "");
                              setValue("category", "", {
                                shouldValidate: true,
                              });
                              setValue("subcategory", "", {
                                shouldValidate: true,
                              });
                              setCategorySearch("");
                              setSubcategorySearch("");
                              setCategoryBrands([]);
                              setVariants((prev) =>
                                prev.map((attribute) =>
                                  attribute.name === "Brand"
                                    ? { ...attribute, options: [""] }
                                    : attribute,
                                ),
                              );
                            }}
                          >
                            {g.name}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {errors.group && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.group.message}
                    </p>
                  )}
                </div>
                <div className="mb-3">
                  <Label className="mb-1.5 block">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={
                      selectedGroup
                        ? "Type to search category..."
                        : "Select a group first"
                    }
                    value={categorySearch}
                    onChange={handleCategorySearchChange}
                    disabled={!selectedGroup}
                  />
                  {selectedGroup && categorySearch && (
                    <div
                      className="mt-1 rounded-md border border-border bg-background"
                      style={{ maxHeight: "200px", overflowY: "auto" }}
                    >
                      {filteredCategories.length === 0 && (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          {selectedGroup
                            ? "No categories in this group"
                            : "No matches"}
                        </div>
                      )}
                      {filteredCategories.map((cat) => {
                        const catId = cat._id || cat.id;
                        const isSelected = selectedCategory === catId;
                        return (
                          <div
                            key={catId}
                            className={`px-2 py-1 text-sm ${isSelected ? "bg-muted" : ""}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              const nextVal = catId || "";
                              setValue("category", nextVal, {
                                shouldValidate: true,
                              });
                              setCategorySearch(cat.name || "");
                              handleCategoryChange(nextVal);
                            }}
                          >
                            {cat.name}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {errors.category && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.category.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="mb-3">
                  <Label className="mb-1.5 block">Subcategory</Label>
                  <Input
                    placeholder={
                      selectedCategory
                        ? "Type to search subcategory..."
                        : "Select a category first"
                    }
                    value={subcategorySearch}
                    onChange={handleSubcategorySearchChange}
                    disabled={!selectedCategory || subcategories.length === 0}
                  />
                  {selectedCategory &&
                    subcategorySearch &&
                    subcategories.length > 0 && (
                      <div
                        className="mt-1 rounded-md border border-border bg-background"
                        style={{ maxHeight: "200px", overflowY: "auto" }}
                      >
                        {filteredSubcategories.length === 0 && (
                          <div className="px-2 py-1 text-sm text-muted-foreground">
                            No matches
                          </div>
                        )}
                        {filteredSubcategories.map((sub) => {
                          const subId = sub._id || sub.id;
                          const isSelected = selectedSubcategory === subId;
                          return (
                            <div
                              key={subId}
                              className={`px-2 py-1 text-sm ${isSelected ? "bg-muted" : ""}`}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                const nextVal = subId || "";
                                setValue("subcategory", nextVal, {
                                  shouldValidate: true,
                                });
                                setSubcategorySearch(sub.name || "");
                              }}
                            >
                              {sub.name}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  {errors.subcategory && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.subcategory.message}
                    </p>
                  )}
                </div>
                <div className="mb-3">
                  <Label className="mb-1.5 block">Status</Label>
                  <div className="flex h-9 items-center gap-3">
                    <input type="hidden" {...register("status")} />
                    <StatusLabel status={selectedStatus} />
                    <span className="text-xs text-muted-foreground">
                      New products require HOD approval to become active.
                    </span>
                  </div>
                  {errors.status && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.status.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <Label className="mb-1.5 block">Description</Label>
                <Textarea
                  rows={3}
                  placeholder="Product description"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          {renderStepNav()}
        </>
      )}

      {currentStep === 2 && (
        <>
          <Card className="mb-4">
            <SectionCardHeader icon={Percent} title="Tax & Accounting" />
            <CardContent style={sectionBodyStyle}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="mb-3">
                  <Label className="mb-1.5 block">
                    GST <span className="text-destructive">*</span>
                  </Label>
                  <GstRateSelect
                    fixedRates={[0, 5, 18, 25]}
                    allowCustom={false}
                    value={watch("gstPercentage") ?? ""}
                    onChange={(e) =>
                      setValue("gstPercentage", e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                  {errors.gstPercentage && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.gstPercentage.message}
                    </p>
                  )}
                </div>
                <div className="mb-3">
                  <Label className="mb-1.5 block">
                    HSN Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. 8471"
                    maxLength={25}
                    {...register("hsnNumber")}
                  />
                  {errors.hsnNumber && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.hsnNumber.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="mb-3">
                  <Label className="mb-1.5 block">
                    Unit <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="unit"
                    control={control}
                    render={({ field }) => (
                      <ProductUnitSelect
                        ref={field.ref}
                        name={field.name}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        required
                      />
                    )}
                  />
                  {errors.unit && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.unit.message}
                    </p>
                  )}
                </div>
                <div className="mb-3">
                  <Label className="mb-1.5 block">Purchase Unit</Label>
                  <Controller
                    name="purchaseUnit"
                    control={control}
                    render={({ field }) => (
                      <ProductUnitSelect
                        ref={field.ref}
                        name={field.name}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  {errors.purchaseUnit && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.purchaseUnit.message}
                    </p>
                  )}
                </div>
                <div className="mb-3">
                  <Label className="mb-1.5 block">Sales Unit</Label>
                  <Controller
                    name="salesUnit"
                    control={control}
                    render={({ field }) => (
                      <ProductUnitSelect
                        ref={field.ref}
                        name={field.name}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  {errors.salesUnit && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.salesUnit.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {renderStepNav()}
        </>
      )}

      {currentStep === 4 && (
        <>
          <Card className="mb-4">
            <SectionCardHeader icon={Boxes} title="Inventory" />
            <CardContent style={sectionBodyStyle}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="mb-3">
                  <Label className="mb-1.5 block">Min Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...register("minStock")}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E") {
                        e.preventDefault();
                      }
                    }}
                  />
                  {errors.minStock && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.minStock.message}
                    </p>
                  )}
                </div>
                <div className="mb-3">
                  <Label className="mb-1.5 block">Max Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...register("maxStock")}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E") {
                        e.preventDefault();
                      }
                    }}
                  />
                  {errors.maxStock && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.maxStock.message}
                    </p>
                  )}
                </div>
                <div className="mb-3">
                  <Label className="mb-1.5 block">Expiry</Label>
                  <Input
                    type="date"
                    min={getTodayDateInputValue()}
                    {...register("expiry")}
                  />
                  {errors.expiry && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.expiry.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {renderStepNav()}
        </>
      )}

      {currentStep === 3 && (
        <>
          <Card className="mb-4">
            <SectionCardHeader icon={Ruler} title="Attributes" />
            <CardContent style={sectionBodyStyle}>
              {variants.map((variant, vIndex) => (
                <Card key={vIndex} className="mb-3 border border-border">
                  <CardHeader className="flex flex-row items-center justify-between rounded-t-xl border-b border-border bg-muted px-4 py-2">
                    <div className="flex grow items-center gap-2">
                      <strong className="whitespace-nowrap">Attribute:</strong>
                      {customVariantInput[vIndex] ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-8"
                            value={variant.name}
                            onChange={(e) =>
                              updateVariantName(vIndex, e.target.value)
                            }
                            placeholder="Enter custom attribute name"
                            style={{ maxWidth: "200px" }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => {
                              setCustomVariantInput((prev) => ({
                                ...prev,
                                [vIndex]: false,
                              }));
                              setVariants((prev) => {
                                const next = [...prev];
                                next[vIndex] = { ...next[vIndex], name: "" };
                                return next;
                              });
                            }}
                            title="Back to dropdown"
                          >
                            &times;
                          </Button>
                        </div>
                      ) : (
                        <Select
                          className="h-8"
                          value={
                            VARIANT_TYPE_OPTIONS.some(
                              (o) => o.value === variant.name,
                            )
                              ? variant.name
                              : variant.name
                                ? "__custom__"
                                : ""
                          }
                          onChange={(e) =>
                            handleVariantTypeChange(vIndex, e.target.value)
                          }
                          style={{ maxWidth: "250px" }}
                        >
                          <option value="" disabled>
                            Select attribute type
                          </option>
                          {VARIANT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                          <option value="__custom__">+ Create New</option>
                        </Select>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => addSubVariant(vIndex)}
                        title="Add variant"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add Variant
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeVariant(vIndex)}
                        title="Remove attribute"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {variant.options.length > 0 && (
                    <CardContent className="p-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                        {variant.options.map((option, oIndex) => (
                          <div key={oIndex}>
                            <div className="h-full rounded border border-border bg-muted/50">
                              <div className="flex flex-col gap-2 p-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">
                                    Variant {oIndex + 1}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() =>
                                      removeSubVariant(vIndex, oIndex)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                {variant.name === "Brand" ? (
                                  <Select
                                    className="h-8"
                                    value={option}
                                    disabled={!selectedCategory}
                                    onChange={(e) =>
                                      updateSubVariantName(
                                        vIndex,
                                        oIndex,
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="" disabled>
                                      {selectedCategory
                                        ? "Select mapped brand"
                                        : "Select category first"}
                                    </option>
                                    {categoryBrands.map((brand) => (
                                      <option
                                        key={brand._id || brand.id}
                                        value={brand.name}
                                      >
                                        {brand.name}
                                      </option>
                                    ))}
                                  </Select>
                                ) : (
                                  <Input
                                    className="h-8"
                                    value={option}
                                    onChange={(e) =>
                                      updateSubVariantName(
                                        vIndex,
                                        oIndex,
                                        e.target.value,
                                      )
                                    }
                                    placeholder={`e.g., ${variant.name === "Color" ? "Red, Blue, Green" : variant.name === "Size" ? "S, M, L, XL" : "Option name"}`}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                  {variant.options.length === 0 && (
                    <CardContent className="py-3 text-center text-muted-foreground">
                      No variants yet. Click &quot;Add Variant&quot; to add
                      options like Red, Blue, Green.
                    </CardContent>
                  )}
                </Card>
              ))}

              <div className="mb-3">
                <Button variant="outline" type="button" onClick={addVariant}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Attribute
                </Button>
              </div>

              {/* Variants (combinations) – generate from attribute options, then upload images for each */}
              <Card className="mt-3 border-primary!">
                <CardHeader className="rounded-t-xl border-b border-border bg-muted">
                  <div>
                    <strong>Variants (combinations)</strong>
                    <small className="ml-2 text-muted-foreground">
                      Generate combinations, select the ones you need, then fill
                      their details and upload images.
                    </small>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {variantCombinations.length === 0 ? (
                    <div>
                      <p className="mb-2 text-muted-foreground">
                        Add attribute types and their options above (e.g. Color:
                        Red, Blue; Size: S, M). Then click below to generate all
                        variants.
                      </p>
                      <Button
                        type="button"
                        onClick={generateSubvariantsFromVariants}
                        disabled={
                          !variants.some(
                            (v) => v?.name && v?.options?.length > 0,
                          )
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Generate variants from attribute options
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {
                            variantCombinations.filter((vc) => vc.selected)
                              .length
                          }{" "}
                          of {variantCombinations.length} variant(s) selected
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={generateSubvariantsFromVariants}
                        >
                          Regenerate
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {variantCombinations.map((combo, cIdx) => (
                          <div key={getVariantComboKey(combo, cIdx)}>
                            <Card
                              className={`h-full border ${
                                combo.selected
                                  ? "border-primary!"
                                  : "border-border"
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="mb-2">
                                  <label
                                    htmlFor={`combo-select-${getVariantComboKey(combo, cIdx)}`}
                                    className="flex cursor-pointer items-start gap-2"
                                  >
                                    <Checkbox
                                      id={`combo-select-${getVariantComboKey(combo, cIdx)}`}
                                      className="mt-0.5"
                                      checked={!!combo.selected}
                                      onCheckedChange={() =>
                                        toggleVariantComboSelected(cIdx)
                                      }
                                    />
                                    <span className="flex flex-col gap-1">
                                      <strong className="text-sm">
                                        {combo.optionValues
                                          ?.map(
                                            (o) =>
                                              `${o.variantName}: ${o.variantValue}`,
                                          )
                                          .join(" · ") || "Variant"}
                                      </strong>
                                      {(combo.variantCode &&
                                        !String(combo.variantCode).includes(
                                          "?",
                                        )) ||
                                      productCode ? (
                                        <code className="text-sm text-primary!">
                                          {getDisplayVariantCode(combo)}
                                        </code>
                                      ) : null}
                                    </span>
                                  </label>
                                </div>
                                {combo.selected && (
                                  <>
                                    <div className="mb-2 flex flex-col gap-2">
                                      <div>
                                        <Label className="mb-1 block text-sm text-muted-foreground">
                                          Status
                                        </Label>
                                        <div className="flex h-9 items-center gap-3">
                                          <StatusToggle
                                            id={`combo-status-${getVariantComboKey(combo, cIdx)}`}
                                            checked={combo.isActive !== false}
                                            onCheckedChange={(checked) =>
                                              updateVariantComboField(
                                                cIdx,
                                                "isActive",
                                                checked,
                                              )
                                            }
                                            aria-label="Variant status"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <Label className="mb-1 block text-sm text-muted-foreground">
                                          Model Number{" "}
                                          <span className="text-destructive">
                                            *
                                          </span>
                                        </Label>
                                        <Input
                                          type="text"
                                          placeholder="Model number"
                                          value={combo.modelNumber ?? ""}
                                          onChange={(e) =>
                                            updateVariantComboField(
                                              cIdx,
                                              "modelNumber",
                                              e.target.value,
                                            )
                                          }
                                          className="h-8"
                                          maxLength={100}
                                          required
                                        />
                                      </div>
                                      <div>
                                        <Label className="mb-1 block text-sm text-muted-foreground">
                                          Purchase Price{" "}
                                          <span className="text-destructive">
                                            *
                                          </span>
                                        </Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="0"
                                          value={
                                            combo.costPrice !== undefined &&
                                            combo.costPrice !== ""
                                              ? combo.costPrice
                                              : ""
                                          }
                                          onChange={(e) =>
                                            updateVariantComboField(
                                              cIdx,
                                              "costPrice",
                                              e.target.value === ""
                                                ? ""
                                                : parseFloat(e.target.value),
                                            )
                                          }
                                          className="h-8"
                                          required
                                        />
                                      </div>
                                      <div>
                                        <Label className="mb-1 block text-sm text-muted-foreground">
                                          Selling Price{" "}
                                          <span className="text-destructive">
                                            *
                                          </span>
                                        </Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          placeholder="0"
                                          value={
                                            combo.price !== undefined &&
                                            combo.price !== ""
                                              ? combo.price
                                              : ""
                                          }
                                          onChange={(e) =>
                                            updateVariantComboField(
                                              cIdx,
                                              "price",
                                              e.target.value === ""
                                                ? ""
                                                : parseFloat(e.target.value),
                                            )
                                          }
                                          className="h-8"
                                          required
                                        />
                                      </div>
                                    </div>
                                    <div className="mb-2 flex flex-col gap-2">
                                      <div>
                                        <Label className="mb-1 block text-sm text-muted-foreground">
                                          Procurement Timeline
                                        </Label>
                                        <div className="flex gap-1">
                                          <Input
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="e.g. 2"
                                            value={combo.timelineValue ?? ""}
                                            onChange={(e) => {
                                              const raw = e.target.value;
                                              if (
                                                raw !== "" &&
                                                Number(raw) < 0
                                              ) {
                                                return;
                                              }
                                              updateVariantComboTimeline(cIdx, {
                                                timelineValue: raw,
                                              });
                                            }}
                                            className="h-8"
                                          />
                                          <Select
                                            className="h-8"
                                            style={{ maxWidth: "110px" }}
                                            value={combo.timelineUnit || "day"}
                                            onChange={(e) =>
                                              updateVariantComboTimeline(cIdx, {
                                                timelineUnit: e.target.value,
                                              })
                                            }
                                          >
                                            {TIMELINE_UNIT_OPTIONS.map(
                                              (opt) => (
                                                <option
                                                  key={opt.value}
                                                  value={opt.value}
                                                >
                                                  {opt.label}
                                                </option>
                                              ),
                                            )}
                                          </Select>
                                        </div>
                                        {getComboTimelineDays(combo) > 0 && (
                                          <div className="mt-1 text-sm text-muted-foreground">
                                            Stored as{" "}
                                            {getComboTimelineDays(combo)} day
                                            {getComboTimelineDays(combo) === 1
                                              ? ""
                                              : "s"}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <Label className="mb-1 block text-sm text-muted-foreground">
                                          Next Review Date
                                        </Label>
                                        <Input
                                          type="date"
                                          min={getTomorrowDateInputValue()}
                                          value={formatDateInputValue(
                                            getComboNextTimelineDate(combo),
                                          )}
                                          onChange={(e) => {
                                            const raw = e.target.value;
                                            if (!raw) {
                                              updateVariantComboField(
                                                cIdx,
                                                "nextTimelineDate",
                                                null,
                                              );
                                              return;
                                            }
                                            const selected = new Date(
                                              `${raw}T00:00:00`,
                                            );
                                            if (!isFutureDate(selected)) {
                                              toastError(
                                                "Next review date must be a future date",
                                              );
                                              return;
                                            }
                                            updateVariantComboField(
                                              cIdx,
                                              "nextTimelineDate",
                                              selected.toISOString(),
                                            );
                                          }}
                                          className="h-8"
                                        />
                                      </div>
                                      <div>
                                        <Label className="mb-1 block text-sm text-muted-foreground">
                                          Review Status
                                        </Label>
                                        <Input
                                          type="text"
                                          readOnly
                                          disabled
                                          value={
                                            getComboTimelineDays(combo) > 0
                                              ? computeProcurementReviewStatus(
                                                  getComboTimelineDays(combo),
                                                  getComboNextTimelineDate(
                                                    combo,
                                                  ),
                                                )
                                              : "idle"
                                          }
                                          className="h-8 capitalize"
                                        />
                                      </div>
                                    </div>
                                    <div className="mb-1">
                                      <Label className="mb-1 block text-sm text-muted-foreground">
                                        Images{" "}
                                        <span className="text-destructive">
                                          *
                                        </span>
                                      </Label>
                                    </div>
                                    <div className="flex flex-wrap items-start gap-2">
                                      {(combo.images || []).map((img, iIdx) => {
                                        const imageId =
                                          typeof img === "object" && img?._id
                                            ? img._id
                                            : img;
                                        const queryId =
                                          typeof combo.queryQuotationImageId ===
                                          "object"
                                            ? combo.queryQuotationImageId?._id
                                            : combo.queryQuotationImageId;
                                        const isQueryQuotation =
                                          String(queryId || "") ===
                                          String(imageId || "");
                                        return (
                                          <div
                                            key={imageId || iIdx}
                                            className="flex flex-col items-center"
                                            style={{ width: 72 }}
                                          >
                                            <div
                                              className={`relative rounded border ${
                                                isQueryQuotation
                                                  ? "border-2 border-primary!"
                                                  : "border-border"
                                              }`}
                                            >
                                              <img
                                                src={
                                                  typeof img === "object" &&
                                                  img?.path
                                                    ? getAssetsUrl(img.path)
                                                    : img
                                                }
                                                width={64}
                                                height={64}
                                                className="rounded object-cover"
                                              />
                                              <button
                                                type="button"
                                                className="absolute right-0 top-0 flex items-center justify-center rounded-full bg-background p-0 text-destructive"
                                                style={{
                                                  width: 22,
                                                  height: 22,
                                                  minWidth: 22,
                                                  fontSize: "1rem",
                                                  lineHeight: 1,
                                                  transform:
                                                    "translate(30%, -30%)",
                                                }}
                                                onClick={() =>
                                                  removeVariantComboImage(
                                                    cIdx,
                                                    iIdx,
                                                  )
                                                }
                                                title="Remove image"
                                              >
                                                &times;
                                              </button>
                                            </div>
                                            <label
                                              htmlFor={`query-quotation-${getVariantComboKey(combo, cIdx)}-${iIdx}`}
                                              className="mt-1 flex cursor-pointer items-center gap-1"
                                            >
                                              <input
                                                type="radio"
                                                name={`query-quotation-image-${getVariantComboKey(combo, cIdx)}`}
                                                id={`query-quotation-${getVariantComboKey(combo, cIdx)}-${iIdx}`}
                                                className="h-3.5 w-3.5 accent-primary"
                                                checked={isQueryQuotation}
                                                onChange={() =>
                                                  setVariantComboQueryQuotationImage(
                                                    cIdx,
                                                    imageId,
                                                  )
                                                }
                                              />
                                              <span className="text-sm">
                                                Query
                                              </span>
                                            </label>
                                          </div>
                                        );
                                      })}
                                      <div
                                        className="flex flex-col items-center"
                                        style={{ width: 72 }}
                                      >
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          ref={(el) => {
                                            comboFileInputRefs.current[cIdx] =
                                              el;
                                          }}
                                          className="hidden"
                                          onChange={(e) => {
                                            const files = e.target.files;
                                            if (files?.length)
                                              handleVariantComboImageUpload(
                                                cIdx,
                                                files,
                                              );
                                            e.target.value = "";
                                          }}
                                        />
                                        <button
                                          type="button"
                                          className="flex flex-col items-center justify-center rounded border-2 border-dashed border-primary! bg-muted text-primary!"
                                          style={{
                                            width: 64,
                                            height: 64,
                                            cursor: "pointer",
                                            padding: 4,
                                          }}
                                          onClick={() =>
                                            comboFileInputRefs.current[
                                              cIdx
                                            ]?.click()
                                          }
                                          title="Upload images"
                                        >
                                          <Plus className="h-4 w-4" />
                                          <span
                                            className="mt-1 text-center"
                                            style={{
                                              fontSize: "0.65rem",
                                              lineHeight: 1.2,
                                            }}
                                          >
                                            Upload
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          {renderStepNav()}
        </>
      )}

      {currentStep === 5 && isHodUser && (
        <>
          <Card className="mb-4">
            <SectionCardHeader icon={Building2} title="Map Customer Code" />
            <CardContent style={sectionBodyStyle}>
              {companyProductCodes.map((row, index) => (
                <div
                  key={index}
                  className="mb-3 grid grid-cols-1 items-end gap-4 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
                    <Label className="mb-1.5 block">Customer</Label>
                    <Input
                      placeholder="Type to search customer…"
                      value={row.search}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCompanyProductCodes((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  search: value,
                                  ...(item.industryLabel &&
                                  value !== item.industryLabel
                                    ? { industryId: "", industryLabel: "" }
                                    : {}),
                                }
                              : item,
                          ),
                        );
                      }}
                    />
                    {row.search &&
                      row.search !== row.industryLabel &&
                      (industryResultsByRow[index] || []).length > 0 && (
                        <div
                          className="mt-1 rounded-md border border-border bg-background"
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                          {(industryResultsByRow[index] || []).map(
                            (industry) => {
                              const indId = industry._id || industry.id;
                              return (
                                <div
                                  key={indId}
                                  className="px-2 py-1 text-sm hover:bg-muted"
                                  style={{ cursor: "pointer" }}
                                  onClick={() =>
                                    selectCompanyForRow(index, industry)
                                  }
                                >
                                  {industry.name}
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}
                  </div>
                  <div className="md:col-span-5">
                    <Label className="mb-1.5 block">Customer Code</Label>
                    <Input
                      placeholder="Enter customer code"
                      value={row.code}
                      onChange={(e) =>
                        updateCompanyProductCodeRow(
                          index,
                          "code",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => removeCompanyProductCodeRow(index)}
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                type="button"
                onClick={addCompanyProductCodeRow}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Customer Code
              </Button>
            </CardContent>
          </Card>
          {renderStepNav()}
        </>
      )}

      {currentStep === 6 && isHodUser && (
        <>
          <Card className="mb-4">
            <SectionCardHeader icon={Truck} title="Map Supplier Code" />
            <CardContent style={sectionBodyStyle}>
              {supplierProductCodes.map((row, index) => (
                <div
                  key={index}
                  className="mb-3 grid grid-cols-1 items-end gap-4 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
                    <Label className="mb-1.5 block">Supplier</Label>
                    <Input
                      placeholder="Type to search supplier…"
                      value={row.search}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSupplierProductCodes((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  search: value,
                                  ...(item.supplierLabel &&
                                  value !== item.supplierLabel
                                    ? { supplierId: "", supplierLabel: "" }
                                    : {}),
                                }
                              : item,
                          ),
                        );
                      }}
                    />
                    {row.search &&
                      row.search !== row.supplierLabel &&
                      (supplierResultsByRow[index] || []).length > 0 && (
                        <div
                          className="mt-1 rounded-md border border-border bg-background"
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                          {(supplierResultsByRow[index] || []).map(
                            (supplier) => {
                              const supplierId = supplier._id || supplier.id;
                              return (
                                <div
                                  key={supplierId}
                                  className="px-2 py-1 text-sm hover:bg-muted"
                                  style={{ cursor: "pointer" }}
                                  onClick={() =>
                                    selectSupplierForRow(index, supplier)
                                  }
                                >
                                  {supplier.name || supplier.shopname || "-"}
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}
                  </div>
                  <div className="md:col-span-5">
                    <Label className="mb-1.5 block">Supplier Code</Label>
                    <Input
                      placeholder="Enter supplier code"
                      value={row.code}
                      onChange={(e) =>
                        updateSupplierProductCodeRow(
                          index,
                          "code",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => removeSupplierProductCodeRow(index)}
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                type="button"
                onClick={addSupplierProductCodeRow}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Supplier Code
              </Button>
            </CardContent>
          </Card>
          {renderStepNav()}
        </>
      )}

      {currentStep === totalSteps && (
        <>
          {renderProductPreview()}
          {renderStepNav()}
        </>
      )}
    </form>
  );
};

export default ProductForm;
