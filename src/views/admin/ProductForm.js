import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CFormCheck,
  CFormSwitch,
  CAlert,
  CImage,
  CSpinner,
  CProgress,
  CProgressBar,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilPlus,
  cilTrash,
  cilArrowLeft,
  cilArrowRight,
  cilCheckCircle,
} from "@coreui/icons";
import productService from "../../services/productService";
import categoryService from "../../services/categoryService";
import subcategoryService from "../../services/subcategoryService";
import brandService from "../../services/brandService";
import groupService from "../../services/groupService";
import industryService from "../../services/industryService";
import supplierService from "../../services/supplierService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
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
} from "../../utils/procurementTimeline";
import { buildVariantCode, getOptionValuesKey } from "../../utils/variantCode";
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
  status: "active",
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
    steps.push({ id: 5, label: "Map Client Code" });
    steps.push({ id: 6, label: "Map Supplier Code" });
  }
  return steps;
};

const STEP_FIELD_GROUPS = {
  1: ["name", "group", "category", "status", "description", "subcategory"],
  2: ["taxClause", "hsnNumber", "unit", "purchaseUnit", "salesUnit"],
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

  const sectionHeaderStyle = { padding: "1rem 1.5rem", fontSize: "1.1rem" };
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

    if (currentStep === 5 && isHodUser) {
      const companyCodeErrors =
        await validateCompanyProductCodeRows(companyProductCodes);
      if (companyCodeErrors.length > 0) {
        showValidationAlert(companyCodeErrors);
        return;
      }
    }

    goToStep(currentStep + 1);
  };

  const renderStepNav = () => (
    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-2 mb-4">
      {currentStep > 1 ? (
        <CButton
          color="secondary"
          type="button"
          onClick={() => goToStep(currentStep - 1)}
        >
          <CIcon icon={cilArrowLeft} className="me-1" />
          Back
        </CButton>
      ) : (
        <span />
      )}
      <div className="d-flex gap-2 ms-sm-auto">
        <CButton
          color="light"
          type="button"
          onClick={() => navigate("/products")}
        >
          Cancel
        </CButton>
        {currentStep < totalSteps ? (
          <CButton color="primary" type="button" onClick={handleNextStep}>
            Next
            <CIcon icon={cilArrowRight} className="ms-1" />
          </CButton>
        ) : (
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? <CSpinner size="sm" className="me-2" /> : null}
            {isEdit ? "Update Product" : "Create Product"}
          </CButton>
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
        groupService.getAll({ pageNumber: 1, pageSize: 100 }),
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
        const params = { pageNumber: 1, pageSize: 100, parent: "null" };
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
          status: product.status === "inactive" ? "inactive" : "active",
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
      toastError(err?.message || "Failed to fetch product");
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

  const handleStatusToggle = (checked) => {
    setValue("status", checked ? "active" : "inactive", {
      shouldValidate: true,
    });
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
      next[comboIndex] = { ...next[comboIndex], [field]: value };
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

      let uploadedImages = [];

      const payload = {
        name: values.name,
        description: values.description || "",
        category: values.category,
        subcategory: values.subcategory || null,
        brand: values.brand || null,
        group: values.group,
        hsnNumber: values.hsnNumber.trim(),
        taxClause: values.taxClause.trim(),
        gstPercentage:
          values.gstPercentage !== "" && values.gstPercentage != null
            ? parseFloat(values.gstPercentage)
            : 0,
        defaultModelNumber: values.defaultModelNumber || "",
        hasVariants: true,
        variants,
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

      const selectedCombinations = variantCombinations.filter(
        (vc) => vc.selected,
      );
      if (selectedCombinations.length > 0) {
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
            modelNumber: rest.modelNumber || "",
            price:
              rest.price !== "" && rest.price != null
                ? parseFloat(rest.price)
                : 0,
            costPrice:
              rest.costPrice !== "" && rest.costPrice != null
                ? parseFloat(rest.costPrice)
                : 0,
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
      } else {
        payload.variantCombinations = [];
      }

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

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading product..." />
      </div>
    );
  }

  return (
    <CForm
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      style={{ fontSize: "1.1rem" }}
    >
      <CRow className="mb-3">
        <CCol>
          <CButton
            color="light"
            onClick={() => navigate("/products")}
            className="me-2"
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Products
          </CButton>
        </CCol>
      </CRow>

      {validationErrors.length > 0 && (
        <CAlert color="danger" dismissible onClose={clearValidationAlert}>
          {validationErrors.length === 1 ? (
            validationErrors[0]
          ) : (
            <ul className="mb-0 ps-3">
              {validationErrors.map((msg, index) => (
                <li key={index}>{msg}</li>
              ))}
            </ul>
          )}
        </CAlert>
      )}
      {success && (
        <CAlert color="success" dismissible onClose={() => setSuccess("")}>
          {success}
        </CAlert>
      )}

      <div
        className="mb-4 sticky-top"
        style={{ top: 0, zIndex: 1040, backgroundColor: "#f8f9fa" }}
      >
        <CCard>
          <CCardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              {productSteps.map((step) => {
                const status = getStepStatus(step.id);
                const isCompleted = status === "completed";
                const isActive = status === "active";
                return (
                  <div key={step.id} className="text-center flex-fill">
                    <div
                      className={`d-inline-flex align-items-center justify-content-center rounded-circle border ${
                        isCompleted
                          ? "bg-success text-white border-success"
                          : isActive
                            ? "bg-primary text-white border-primary"
                            : "bg-light text-muted border-secondary"
                      }`}
                      style={{ width: 36, height: 36 }}
                    >
                      {isCompleted ? <CIcon icon={cilCheckCircle} /> : step.id}
                    </div>
                    <div className="mt-2 small fw-semibold">{step.label}</div>
                  </div>
                );
              })}
            </div>
            <CProgress thin color="primary">
              <CProgressBar
                value={((currentStep - 1) / (totalSteps - 1 || 1)) * 100}
              />
            </CProgress>
          </CCardBody>
        </CCard>
      </div>

      {currentStep === 1 && (
        <>
          <CCard className="mb-4">
            <CCardHeader
              style={sectionHeaderStyle}
              className="d-flex justify-content-between align-items-center"
            >
              <strong>Basic Information</strong>
              {!isEdit && (
                <CButton
                  color="secondary"
                  size="sm"
                  variant="outline"
                  onClick={handleClearDraft}
                >
                  Clear saved data
                </CButton>
              )}
            </CCardHeader>
            <CCardBody style={sectionBodyStyle}>
              <CRow>
                <CCol md={12}>
                  <div className="mb-3">
                    <CFormLabel>
                      Product Name <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      placeholder="Enter product name"
                      {...register("name")}
                    />
                    {errors.name && (
                      <div className="text-danger small mt-1">
                        {errors.name.message}
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel>
                      Group <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      placeholder="Type to search group..."
                      value={groupSearch}
                      onChange={handleGroupSearchChange}
                    />
                    {groupSearch && (
                      <div
                        className="border rounded mt-1 bg-white"
                        style={{ maxHeight: "200px", overflowY: "auto" }}
                      >
                        {filteredGroups.length === 0 && (
                          <div className="px-2 py-1 text-muted small">
                            No matches
                          </div>
                        )}
                        {filteredGroups.map((g) => {
                          const groupId = g._id || g.id;
                          const isSelected = selectedGroup === groupId;
                          return (
                            <div
                              key={groupId}
                              className={`px-2 py-1 small ${isSelected ? "bg-light" : ""}`}
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
                      <div className="text-danger small mt-1">
                        {errors.group.message}
                      </div>
                    )}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel className="mb-0">
                      Category <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
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
                        className="border rounded mt-1 bg-white"
                        style={{ maxHeight: "200px", overflowY: "auto" }}
                      >
                        {filteredCategories.length === 0 && (
                          <div className="px-2 py-1 text-muted small">
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
                              className={`px-2 py-1 small ${isSelected ? "bg-light" : ""}`}
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
                      <div className="text-danger small mt-1">
                        {errors.category.message}
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel className="mb-0">Subcategory</CFormLabel>
                    <CFormInput
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
                          className="border rounded mt-1 bg-white"
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                          {filteredSubcategories.length === 0 && (
                            <div className="px-2 py-1 text-muted small">
                              No matches
                            </div>
                          )}
                          {filteredSubcategories.map((sub) => {
                            const subId = sub._id || sub.id;
                            const isSelected = selectedSubcategory === subId;
                            return (
                              <div
                                key={subId}
                                className={`px-2 py-1 small ${isSelected ? "bg-light" : ""}`}
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
                      <div className="text-danger small mt-1">
                        {errors.subcategory.message}
                      </div>
                    )}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel>
                      Status <span className="text-danger">*</span>
                    </CFormLabel>
                    <div className="crud-form-status-toggle">
                      <input type="hidden" {...register("status")} />
                      <CFormSwitch
                        id="product-status"
                        checked={selectedStatus === "active"}
                        onChange={(event) =>
                          handleStatusToggle(event.target.checked)
                        }
                        aria-label="Product status"
                      />
                      <span
                        className={`crud-form-status-toggle__badge ${
                          selectedStatus === "active"
                            ? "crud-form-status-toggle__badge--active"
                            : "crud-form-status-toggle__badge--inactive"
                        }`}
                      >
                        {selectedStatus === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {errors.status && (
                      <div className="text-danger small mt-1">
                        {errors.status.message}
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol md={12}>
                  <div className="mb-3">
                    <CFormLabel>Description</CFormLabel>
                    <CFormTextarea
                      rows={3}
                      placeholder="Product description"
                      {...register("description")}
                    />
                    {errors.description && (
                      <div className="text-danger small mt-1">
                        {errors.description.message}
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
          {renderStepNav()}
        </>
      )}

      {currentStep === 2 && (
        <>
          <CCard className="mb-4">
            <CCardHeader style={sectionHeaderStyle}>
              <strong>Tax &amp; Accounting</strong>
            </CCardHeader>
            <CCardBody style={sectionBodyStyle}>
              <CRow>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel>
                      GST <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      placeholder="e.g., 18% GST"
                      {...register("taxClause")}
                    />
                    {errors.taxClause && (
                      <div className="text-danger small mt-1">
                        {errors.taxClause.message}
                      </div>
                    )}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel>
                      HSN Code <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      placeholder="e.g., 8471"
                      {...register("hsnNumber")}
                    />
                    {errors.hsnNumber && (
                      <div className="text-danger small mt-1">
                        {errors.hsnNumber.message}
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>
                      Unit <span className="text-danger">*</span>
                    </CFormLabel>
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
                      <div className="text-danger small mt-1">
                        {errors.unit.message}
                      </div>
                    )}
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>Purchase Unit</CFormLabel>
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
                      <div className="text-danger small mt-1">
                        {errors.purchaseUnit.message}
                      </div>
                    )}
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>Sales Unit</CFormLabel>
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
                      <div className="text-danger small mt-1">
                        {errors.salesUnit.message}
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
          {renderStepNav()}
        </>
      )}

      {currentStep === 4 && (
        <>
          <CCard className="mb-4">
            <CCardHeader style={sectionHeaderStyle}>
              <strong>Inventory</strong>
            </CCardHeader>
            <CCardBody style={sectionBodyStyle}>
              <CRow>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>Min Stock</CFormLabel>
                    <CFormInput
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      {...register("minStock")}
                    />
                    {errors.minStock && (
                      <div className="text-danger small mt-1">
                        {errors.minStock.message}
                      </div>
                    )}
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>Max Stock</CFormLabel>
                    <CFormInput
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      {...register("maxStock")}
                    />
                    {errors.maxStock && (
                      <div className="text-danger small mt-1">
                        {errors.maxStock.message}
                      </div>
                    )}
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>Expiry</CFormLabel>
                    <CFormInput type="date" {...register("expiry")} />
                    {errors.expiry && (
                      <div className="text-danger small mt-1">
                        {errors.expiry.message}
                      </div>
                    )}
                  </div>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
          {renderStepNav()}
        </>
      )}

      {currentStep === 3 && (
        <>
          <CCard className="mb-4">
            <CCardHeader style={sectionHeaderStyle}>
              <strong>Attributes</strong>
            </CCardHeader>
            <CCardBody style={sectionBodyStyle}>
              {variants.map((variant, vIndex) => (
                <CCard key={vIndex} className="mb-3 border">
                  <CCardHeader className="bg-light d-flex justify-content-between align-items-center py-2">
                    <div className="d-flex align-items-center gap-2 flex-grow-1">
                      <strong className="text-nowrap">Attribute:</strong>
                      {customVariantInput[vIndex] ? (
                        <div className="d-flex align-items-center gap-1">
                          <CFormInput
                            size="sm"
                            value={variant.name}
                            onChange={(e) =>
                              updateVariantName(vIndex, e.target.value)
                            }
                            placeholder="Enter custom attribute name"
                            style={{ maxWidth: "200px" }}
                            autoFocus
                          />
                          <CButton
                            color="secondary"
                            variant="ghost"
                            size="sm"
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
                          </CButton>
                        </div>
                      ) : (
                        <CFormSelect
                          size="sm"
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
                        </CFormSelect>
                      )}
                    </div>
                    <div className="d-flex gap-1">
                      <CButton
                        color="primary"
                        variant="ghost"
                        size="sm"
                        onClick={() => addSubVariant(vIndex)}
                        title="Add variant"
                      >
                        <CIcon icon={cilPlus} className="me-1" />
                        Add Variant
                      </CButton>
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(vIndex)}
                        title="Remove attribute"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                  </CCardHeader>
                  {variant.options.length > 0 && (
                    <CCardBody className="p-2">
                      <CRow className="g-2">
                        {variant.options.map((option, oIndex) => (
                          <CCol key={oIndex} xs={12} sm={6} md={3}>
                            <div
                              className="border rounded h-100"
                              style={{ backgroundColor: "#fafafa" }}
                            >
                              <div className="d-flex flex-column gap-2 p-2">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="text-muted small">
                                    Variant {oIndex + 1}
                                  </span>
                                  <CButton
                                    color="danger"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeSubVariant(vIndex, oIndex)
                                    }
                                  >
                                    <CIcon icon={cilTrash} />
                                  </CButton>
                                </div>
                                {variant.name === "Brand" ? (
                                  <CFormSelect
                                    size="sm"
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
                                  </CFormSelect>
                                ) : (
                                  <CFormInput
                                    size="sm"
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
                          </CCol>
                        ))}
                      </CRow>
                    </CCardBody>
                  )}
                  {variant.options.length === 0 && (
                    <CCardBody className="text-muted text-center py-3">
                      No variants yet. Click &quot;Add Variant&quot; to add
                      options like Red, Blue, Green.
                    </CCardBody>
                  )}
                </CCard>
              ))}

              <div className="mb-3">
                <CButton color="light" onClick={addVariant}>
                  <CIcon icon={cilPlus} className="me-1" />
                  Add Attribute
                </CButton>
              </div>

              {/* Variants (combinations) – generate from attribute options, then upload images for each */}
              <CCard className="mt-3 border-primary">
                <CCardHeader className="bg-light">
                  <strong>Variants (combinations)</strong>
                  <small className="text-muted ms-2">
                    Generate combinations, select the ones you need, then fill
                    their details and upload images.
                  </small>
                </CCardHeader>
                <CCardBody>
                  {variantCombinations.length === 0 ? (
                    <div>
                      <p className="text-muted mb-2">
                        Add attribute types and their options above (e.g. Color:
                        Red, Blue; Size: S, M). Then click below to generate all
                        variants.
                      </p>
                      <CButton
                        color="primary"
                        onClick={generateSubvariantsFromVariants}
                        disabled={
                          !variants.some(
                            (v) => v?.name && v?.options?.length > 0,
                          )
                        }
                      >
                        <CIcon icon={cilPlus} className="me-1" />
                        Generate variants from attribute options
                      </CButton>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 d-flex justify-content-between align-items-center">
                        <span className="text-muted">
                          {
                            variantCombinations.filter((vc) => vc.selected)
                              .length
                          }{" "}
                          of {variantCombinations.length} variant(s) selected
                        </span>
                        <CButton
                          color="secondary"
                          size="sm"
                          onClick={generateSubvariantsFromVariants}
                        >
                          Regenerate
                        </CButton>
                      </div>
                      <CRow className="g-3">
                        {variantCombinations.map((combo, cIdx) => (
                          <CCol
                            key={getVariantComboKey(combo, cIdx)}
                            xs={12}
                            sm={6}
                            lg={3}
                          >
                            <CCard
                              className={`h-100 border ${
                                combo.selected ? "border-primary" : ""
                              }`}
                            >
                              <CCardBody className="py-2">
                                <div className="mb-2">
                                  <CFormCheck
                                    id={`combo-select-${getVariantComboKey(combo, cIdx)}`}
                                    checked={!!combo.selected}
                                    onChange={() =>
                                      toggleVariantComboSelected(cIdx)
                                    }
                                    label={
                                      <span className="d-flex flex-column gap-1">
                                        <strong className="small">
                                          {combo.optionValues
                                            ?.map(
                                              (o) =>
                                                `${o.variantName}: ${o.variantValue}`,
                                            )
                                            .join(" · ") || "Variant"}
                                        </strong>
                                        {(combo.variantCode ||
                                          combo.optionValues?.length > 0) && (
                                          <code className="text-primary small">
                                            {combo.variantCode ||
                                              buildVariantCode(
                                                productCode,
                                                combo.optionValues,
                                              )}
                                          </code>
                                        )}
                                      </span>
                                    }
                                  />
                                </div>
                                {combo.selected && (
                                  <>
                                    <div className="row g-2 mb-2">
                                      <div className="col-12">
                                        <CFormLabel className="small text-muted">
                                          Status
                                        </CFormLabel>
                                        <div className="crud-form-status-toggle">
                                          <CFormSwitch
                                            id={`combo-status-${getVariantComboKey(combo, cIdx)}`}
                                            checked={combo.isActive !== false}
                                            onChange={(e) =>
                                              updateVariantComboField(
                                                cIdx,
                                                "isActive",
                                                e.target.checked,
                                              )
                                            }
                                            aria-label="Variant status"
                                          />
                                          <span
                                            className={`crud-form-status-toggle__badge ${
                                              combo.isActive !== false
                                                ? "crud-form-status-toggle__badge--active"
                                                : "crud-form-status-toggle__badge--inactive"
                                            }`}
                                          >
                                            {combo.isActive !== false
                                              ? "Active"
                                              : "Inactive"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="col-12">
                                        <CFormLabel className="small text-muted">
                                          Model Number
                                        </CFormLabel>
                                        <CFormInput
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
                                          className="form-control form-control-sm"
                                          maxLength={100}
                                        />
                                      </div>
                                      <div className="col-12">
                                        <CFormLabel className="small text-muted">
                                          Purchase Price
                                        </CFormLabel>
                                        <CFormInput
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
                                          className="form-control form-control-sm"
                                        />
                                      </div>
                                      <div className="col-12">
                                        <CFormLabel className="small text-muted">
                                          Selling Price
                                        </CFormLabel>
                                        <CFormInput
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
                                          className="form-control form-control-sm"
                                        />
                                      </div>
                                    </div>
                                    <div className="row g-2 mb-2">
                                      <div className="col-12">
                                        <CFormLabel className="small text-muted">
                                          Procurement Timeline
                                        </CFormLabel>
                                        <div className="d-flex gap-1">
                                          <CFormInput
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="e.g., 2"
                                            value={combo.timelineValue ?? ""}
                                            onChange={(e) =>
                                              updateVariantComboTimeline(cIdx, {
                                                timelineValue: e.target.value,
                                              })
                                            }
                                            className="form-control form-control-sm"
                                          />
                                          <CFormSelect
                                            size="sm"
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
                                          </CFormSelect>
                                        </div>
                                        {getComboTimelineDays(combo) > 0 && (
                                          <div className="text-muted small mt-1">
                                            Stored as{" "}
                                            {getComboTimelineDays(combo)} day
                                            {getComboTimelineDays(combo) === 1
                                              ? ""
                                              : "s"}
                                          </div>
                                        )}
                                      </div>
                                      <div className="col-12">
                                        <CFormLabel className="small text-muted">
                                          Next Review Date
                                        </CFormLabel>
                                        <CFormInput
                                          type="date"
                                          readOnly
                                          disabled
                                          value={formatDateInputValue(
                                            getComboNextTimelineDate(combo),
                                          )}
                                          className="form-control form-control-sm"
                                        />
                                      </div>
                                      <div className="col-12">
                                        <CFormLabel className="small text-muted">
                                          Review Status
                                        </CFormLabel>
                                        <CFormInput
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
                                          className="form-control form-control-sm text-capitalize"
                                        />
                                      </div>
                                    </div>
                                    <div className="mb-1">
                                      <CFormLabel className="small text-muted mb-1">
                                        Images
                                      </CFormLabel>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2 align-items-start">
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
                                            className="d-flex flex-column align-items-center"
                                            style={{ width: 72 }}
                                          >
                                            <div
                                              className={`position-relative rounded border ${
                                                isQueryQuotation
                                                  ? "border-primary border-2"
                                                  : ""
                                              }`}
                                            >
                                              <CImage
                                                src={
                                                  typeof img === "object" &&
                                                  img?.path
                                                    ? getAssetsUrl(img.path)
                                                    : img
                                                }
                                                width={64}
                                                height={64}
                                                className="object-fit-cover rounded"
                                              />
                                              <CButton
                                                color="danger"
                                                size="sm"
                                                variant="ghost"
                                                className="position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center bg-white rounded-circle"
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
                                              </CButton>
                                            </div>
                                            <CFormCheck
                                              type="radio"
                                              name={`query-quotation-image-${getVariantComboKey(combo, cIdx)}`}
                                              id={`query-quotation-${getVariantComboKey(combo, cIdx)}-${iIdx}`}
                                              className="mt-1"
                                              checked={isQueryQuotation}
                                              onChange={() =>
                                                setVariantComboQueryQuotationImage(
                                                  cIdx,
                                                  imageId,
                                                )
                                              }
                                              label={
                                                <span className="small">
                                                  Query
                                                </span>
                                              }
                                            />
                                          </div>
                                        );
                                      })}
                                      <div
                                        className="d-flex flex-column align-items-center"
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
                                          className="d-none"
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
                                          className="d-flex flex-column align-items-center justify-content-center rounded border border-primary border-2 border-dashed bg-light text-primary"
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
                                          <CIcon icon={cilPlus} />
                                          <span
                                            className="text-center mt-1"
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
                              </CCardBody>
                            </CCard>
                          </CCol>
                        ))}
                      </CRow>
                    </>
                  )}
                </CCardBody>
              </CCard>
            </CCardBody>
          </CCard>
          {renderStepNav()}
        </>
      )}

      {currentStep === 5 && isHodUser && (
        <>
          <CCard className="mb-4">
            <CCardHeader style={sectionHeaderStyle}>
              <strong>Map Client Code</strong>
            </CCardHeader>
            <CCardBody style={sectionBodyStyle}>
              {companyProductCodes.map((row, index) => (
                <CRow key={index} className="align-items-end mb-3">
                  <CCol md={5}>
                    <CFormLabel>Client</CFormLabel>
                    <CFormInput
                      placeholder="Type to search client..."
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
                          className="border rounded mt-1 bg-white"
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                          {(industryResultsByRow[index] || []).map(
                            (industry) => {
                              const indId = industry._id || industry.id;
                              return (
                                <div
                                  key={indId}
                                  className="px-2 py-1 small"
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
                  </CCol>
                  <CCol md={5}>
                    <CFormLabel>Client Code</CFormLabel>
                    <CFormInput
                      placeholder="Enter client code"
                      value={row.code}
                      onChange={(e) =>
                        updateCompanyProductCodeRow(
                          index,
                          "code",
                          e.target.value,
                        )
                      }
                    />
                  </CCol>
                  <CCol md={2}>
                    <CButton
                      color="danger"
                      variant="outline"
                      className="w-100"
                      onClick={() => removeCompanyProductCodeRow(index)}
                      title="Remove row"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CCol>
                </CRow>
              ))}
              <CButton color="light" onClick={addCompanyProductCodeRow}>
                <CIcon icon={cilPlus} className="me-1" />
                Add Client Code
              </CButton>
            </CCardBody>
          </CCard>
          {renderStepNav()}
        </>
      )}

      {currentStep === 6 && isHodUser && (
        <>
          <CCard className="mb-4">
            <CCardHeader style={sectionHeaderStyle}>
              <strong>Map Supplier Code</strong>
            </CCardHeader>
            <CCardBody style={sectionBodyStyle}>
              {supplierProductCodes.map((row, index) => (
                <CRow key={index} className="align-items-end mb-3">
                  <CCol md={5}>
                    <CFormLabel>Supplier</CFormLabel>
                    <CFormInput
                      placeholder="Type to search supplier..."
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
                          className="border rounded mt-1 bg-white"
                          style={{ maxHeight: "200px", overflowY: "auto" }}
                        >
                          {(supplierResultsByRow[index] || []).map(
                            (supplier) => {
                              const supplierId = supplier._id || supplier.id;
                              return (
                                <div
                                  key={supplierId}
                                  className="px-2 py-1 small"
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
                  </CCol>
                  <CCol md={5}>
                    <CFormLabel>Supplier Code</CFormLabel>
                    <CFormInput
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
                  </CCol>
                  <CCol md={2}>
                    <CButton
                      color="danger"
                      variant="outline"
                      className="w-100"
                      onClick={() => removeSupplierProductCodeRow(index)}
                      title="Remove row"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CCol>
                </CRow>
              ))}
              <CButton color="light" onClick={addSupplierProductCodeRow}>
                <CIcon icon={cilPlus} className="me-1" />
                Add Supplier Code
              </CButton>
            </CCardBody>
          </CCard>
          {renderStepNav()}
        </>
      )}
    </CForm>
  );
};

export default ProductForm;
