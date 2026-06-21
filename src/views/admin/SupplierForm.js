import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CBadge,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft } from "@coreui/icons";
import supplierService from "../../services/supplierService";
import categoryService from "../../services/categoryService";
import branchService from "../../services/branchService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";
import useBranchContext from "../../hooks/useBranchContext";
import { IFSC_PATTERN, MSG } from "../../utils/validation";

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
  const catalogInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(getSupplierSchema()),
    defaultValues,
    mode: "onBlur",
  });

  const selectedCategories = watch("categories") || [];
  const includeBankDetails = watch("includeBankDetails");

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
      });
      if (data?.catalog?.url) {
        setCatalogPreview(data.catalog);
      } else {
        setCatalogPreview(null);
      }
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
      } else {
        const {
          bankDetails,
          includeBankDetails: withBankDetails,
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

  return (
    <CForm onSubmit={handleSubmit(onSubmit)}>
      <CRow className="mb-3">
        <CCol>
          <CButton
            color="light"
            onClick={() => navigate("/suppliers")}
            className="me-2"
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Suppliers
          </CButton>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError("")}>
          {error}
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <strong>{isEdit ? "Edit Supplier" : "Add Supplier"}</strong>
            {isEdit && (
              <small className="text-muted d-block mt-1">
                Only address, mobile numbers, categories, remark and bank
                details can be updated.
              </small>
            )}
          </div>
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
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Name *</CFormLabel>
                <CFormInput
                  {...register("name")}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                />
                {errors.name && (
                  <div className="text-danger small mt-1">
                    {errors.name.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Shop Name</CFormLabel>
                <CFormInput
                  {...register("shopname")}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                />
                {errors.shopname && (
                  <div className="text-danger small mt-1">
                    {errors.shopname.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Email</CFormLabel>
                <CFormInput
                  type="email"
                  {...register("email")}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                />
                {errors.email && (
                  <div className="text-danger small mt-1">
                    {errors.email.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Phone 1</CFormLabel>
                <CFormInput {...register("phone_1")} placeholder="10 digits" />
                {errors.phone_1 && (
                  <div className="text-danger small mt-1">
                    {errors.phone_1.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Phone 2</CFormLabel>
                <CFormInput {...register("phone_2")} placeholder="10 digits" />
                {errors.phone_2 && (
                  <div className="text-danger small mt-1">
                    {errors.phone_2.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>Other Contact</CFormLabel>
                <CFormInput
                  {...register("other_contact")}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                />
                {errors.other_contact && (
                  <div className="text-danger small mt-1">
                    {errors.other_contact.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Label</CFormLabel>
                <CFormInput
                  {...register("label")}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                />
                {errors.label && (
                  <div className="text-danger small mt-1">
                    {errors.label.message}
                  </div>
                )}
              </div>
            </CCol>
            <CCol md={3}>
              <div className="mb-3">
                <CFormLabel>Shop Location</CFormLabel>
                <CFormInput
                  {...register("shop_location")}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                />
                {errors.shop_location && (
                  <div className="text-danger small mt-1">
                    {errors.shop_location.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={6}>
              <div className="mb-3">
                <CFormLabel>GST Number</CFormLabel>
                <CFormInput
                  placeholder="e.g. 22AABCU9603R1ZX"
                  maxLength={15}
                  {...register("gst")}
                  readOnly={isEdit}
                  disabled={isEdit}
                  className={isEdit ? "bg-light" : ""}
                />
                {errors.gst && (
                  <div className="text-danger small mt-1">
                    {errors.gst.message}
                  </div>
                )}
                <small className="text-muted">
                  15-character GSTIN (optional)
                </small>
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Categories</CFormLabel>
                <CFormInput
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                <div
                  className="border rounded p-2 mt-2"
                  style={{
                    maxHeight: 200,
                    overflowY: "auto",
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "0.35rem 1rem",
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
                          className="form-check d-flex align-items-center gap-2 mb-0"
                          style={{ cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            id={inputId}
                            className="form-check-input"
                            checked={checked}
                            onChange={() => toggleCategory(cat._id)}
                          />
                          <span className="form-check-label">{cat.name}</span>
                        </label>
                      );
                    })
                  ) : (
                    <small
                      className="text-muted"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      No categories found
                    </small>
                  )}
                </div>
                {selectedCategoryBadges.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    {selectedCategoryBadges.map((cat) => (
                      <CBadge color="info" key={cat.id}>
                        {cat.name}
                      </CBadge>
                    ))}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Address</CFormLabel>
                <CFormTextarea rows={3} {...register("address")} />
                {errors.address && (
                  <div className="text-danger small mt-1">
                    {errors.address.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Remark</CFormLabel>
                <CFormTextarea rows={2} {...register("remark")} />
                {errors.remark && (
                  <div className="text-danger small mt-1">
                    {errors.remark.message}
                  </div>
                )}
              </div>
            </CCol>
          </CRow>

          <CRow className="mb-2">
            <CCol md={12}>
              <CFormCheck
                id="includeBankDetails"
                label="Include bank details"
                checked={Boolean(includeBankDetails)}
                onChange={(e) =>
                  handleIncludeBankDetailsChange(e.target.checked)
                }
              />
            </CCol>
          </CRow>

          {includeBankDetails && (
            <>
              <CRow>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="accountHolderName">
                      Account Holder Name *
                    </CFormLabel>
                    <CFormInput
                      id="accountHolderName"
                      {...register("bankDetails.accountHolderName")}
                      invalid={!!errors.bankDetails?.accountHolderName}
                    />
                    <CFormFeedback invalid>
                      {errors.bankDetails?.accountHolderName?.message}
                    </CFormFeedback>
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="accountNumber">
                      Account Number *
                    </CFormLabel>
                    <CFormInput
                      id="accountNumber"
                      inputMode="numeric"
                      {...register("bankDetails.accountNumber")}
                      invalid={!!errors.bankDetails?.accountNumber}
                    />
                    <CFormFeedback invalid>
                      {errors.bankDetails?.accountNumber?.message}
                    </CFormFeedback>
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="bankName">Bank Name *</CFormLabel>
                    <CFormInput
                      id="bankName"
                      {...register("bankDetails.bankName")}
                      invalid={!!errors.bankDetails?.bankName}
                    />
                    <CFormFeedback invalid>
                      {errors.bankDetails?.bankName?.message}
                    </CFormFeedback>
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="ifscCode">IFSC Code *</CFormLabel>
                    <CFormInput
                      id="ifscCode"
                      {...register("bankDetails.ifscCode")}
                      invalid={!!errors.bankDetails?.ifscCode}
                    />
                    <CFormFeedback invalid>
                      {errors.bankDetails?.ifscCode?.message}
                    </CFormFeedback>
                  </div>
                </CCol>
              </CRow>
              <CRow>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel htmlFor="upiDetails">UPI Details *</CFormLabel>
                    <CFormInput
                      id="upiDetails"
                      {...register("bankDetails.upiDetails")}
                      invalid={!!errors.bankDetails?.upiDetails}
                    />
                    <CFormFeedback invalid>
                      {errors.bankDetails?.upiDetails?.message}
                    </CFormFeedback>
                  </div>
                </CCol>
              </CRow>
            </>
          )}

          <CRow>
            <CCol md={12}>
              <div className="mb-3">
                <CFormLabel>Catalog (PDF, Excel, or Images)</CFormLabel>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <input
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
                    className="form-control"
                    style={{ maxWidth: 280 }}
                  />
                  {catalogUploading && <CSpinner size="sm" />}
                  {isEdit && catalogPreview?.url && (
                    <div className="text-muted small">
                      <a
                        href={catalogPreview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {catalogPreview.fileName || "View catalog"}
                      </a>
                      {catalogPreview.uploadedAt && (
                        <span className="ms-2">
                          uploaded{" "}
                          {dateTimeFormatter(catalogPreview.uploadedAt, "—")}
                        </span>
                      )}
                    </div>
                  )}
                  {!isEdit && newCatalogFile && (
                    <div className="text-muted small">
                      Selected file: <strong>{newCatalogFile.name}</strong>
                    </div>
                  )}
                </div>
                <small className="text-muted">
                  Stored in S3. Supports PDF, Excel, or images. For new
                  suppliers, the catalog is uploaded after the supplier is
                  created.
                </small>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardBody className="d-flex justify-content-end gap-2">
          <CButton color="secondary" onClick={() => navigate("/suppliers")}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={submitting}>
            {submitting ? (
              <CSpinner size="sm" />
            ) : isEdit ? (
              "Update Supplier"
            ) : (
              "Create Supplier"
            )}
          </CButton>
        </CCardBody>
      </CCard>
    </CForm>
  );
};

export default SupplierForm;
