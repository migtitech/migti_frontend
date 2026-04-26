import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CListGroup,
  CListGroupItem,
  CSpinner,
  CAlert,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CProgress,
  CProgressBar,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CImage,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilArrowLeft,
  cilPlus,
  cilTrash,
  cilPencil,
  cilSearch,
  cilCheckCircle,
  cilX,
} from "@coreui/icons";
import queryService from "../../services/queryService";
import industryService from "../../services/industryService";
import areaService from "../../services/areaService";
import subZoneService from "../../services/subZoneService";
import queryNewProductService from "../../services/queryNewProductService";
import groupService from "../../services/groupService";
import categoryService from "../../services/categoryService";
import documentService from "../../services/documentService";
import { useAuth } from "../../context/AuthContext";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import { getAssetsUrl, getAssetsBaseUrl, DOCUMENTS } from "../../api/endpoints";
import QueryNewProductFindSidebar from "./QueryNewProductFindSidebar";

const INITIAL_COMPANY = {
  name: "",
  area: "",
  subZoneId: "",
  location: "",
  address: "",
  purchaseManagers: [],
};

const mapPurchaseManagers = (list) =>
  (list || []).map((pm) => ({
    name: pm?.name || "",
    phone: pm?.phone || "",
    email: pm?.email || "",
  }));

const INITIAL_VARIANT = { variantName: "" };

const INITIAL_PRODUCT = {
  productName: "",
  quantity: "",
  unit: "",
  hsnNumber: "",
  modelNumber: "",
  gstPercentage: null,
  variants: [],
  remark: "",
  description: "",
  product_id: null,
  productCode: "",
  /** From shared product sequence (e.g. mig1000); set when new product is saved to `query_new_product` or from server. */
  rawProductCode: "",
  /** Ritems sequence (QTRK1000) from `query_new_product` on mark-as-new; shown on the line. */
  query_tracking_code: "",
  groupId: "",
  categoryId: "",
  isNewProduct: true,
  images: [],
  /** Set when the row was prefilled from an existing `query_new_product` (skip re-create on save). */
  sourceQueryNewProductId: null,
};

const STEPS = [
  { id: 1, label: "Company Information" },
  { id: 2, label: "Products" },
  { id: 3, label: "Preview" },
];

const DRAFT_STORAGE_KEY = "migticrm_query_draft";
const MAX_PRODUCT_IMAGES = 3;

const QueryForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  // Company section – industry search & snapshot (stored in query, editable)
  const [industrySearch, setIndustrySearch] = useState("");
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [industrySearchResults, setIndustrySearchResults] = useState([]);
  const [industrySearchLoading, setIndustrySearchLoading] = useState(false);
  const [industryId, setIndustryId] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(INITIAL_COMPANY);
  const [areas, setAreas] = useState([]);
  const [querySubZones, setQuerySubZones] = useState([]);
  const companyDropdownRef = useRef(null);

  // Products – form for add/edit one, then table of all added
  const [products, setProducts] = useState([]);
  const [formProduct, setFormProduct] = useState({ ...INITIAL_PRODUCT });
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [findProductSidebarOpen, setFindProductSidebarOpen] = useState(false);

  const quantityInputRef = useRef(null);
  const [imagesModal, setImagesModal] = useState({
    visible: false,
    images: [],
  });
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [productImagePreviews, setProductImagePreviews] = useState([]);
  const [addingProductToQuery, setAddingProductToQuery] = useState(false);
  const [productGroups, setProductGroups] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  /** For table labels: top-level (parent null) categories; loaded with pagination (API caps 100 per page) */
  const [allTableCategories, setAllTableCategories] = useState([]);
  /** categoryId (string) -> name for rows not in allTableCategories / productCategories (e.g. subcategories) */
  const [categoryNameById, setCategoryNameById] = useState({});

  const getAreaId = (area) =>
    (typeof area === "object" ? area?._id : area) || "";

  const getSubZoneId = (sz) => (typeof sz === "object" ? sz?._id : sz) || "";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const aid = companyInfo.area;
      if (!aid) {
        setQuerySubZones([]);
        return;
      }
      try {
        const res = await subZoneService.listByZone(aid);
        const data = res?.data?.data || res?.data || res;
        const list = data?.subZones || [];
        if (!cancelled) setQuerySubZones(list || []);
      } catch {
        if (!cancelled) setQuerySubZones([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [companyInfo.area]);

  const goToStep = (step) => {
    if (step < 1 || step > STEPS.length) return;
    setCurrentStep(step);
  };

  // Load draft from localStorage for new query (not edit)
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.companyInfo) setCompanyInfo(draft.companyInfo);
      if (draft.industryId) setIndustryId(draft.industryId);
      if (typeof draft.currentStep === "number")
        setCurrentStep(draft.currentStep);
      if (typeof draft.industrySearch === "string")
        setIndustrySearch(draft.industrySearch);
      if (Array.isArray(draft.products)) setProducts(draft.products);
    } catch {
      // ignore corrupt draft
    }
  }, [isEdit]);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await areaService.getAll({ pageSize: 100 });
        const data = res?.data || res;
        setAreas(data?.areas || []);
      } catch {
        setAreas([]);
      }
    };
    fetchAreas();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await groupService.getAll({ pageNumber: 1, pageSize: 100 });
        const data = res?.data || res;
        if (!cancelled) setProductGroups(data?.groups || []);
      } catch {
        if (!cancelled) setProductGroups([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const merged = [];
      const pageSize = 100;
      try {
        let page = 1;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const res = await categoryService.getAll({
            pageNumber: page,
            pageSize,
            parent: "null",
          });
          const data = res?.data || res;
          const list = data?.categories || [];
          merged.push(...list);
          if (list.length < pageSize) hasMore = false;
          else page += 1;
        }
        if (!cancelled) setAllTableCategories(merged);
      } catch {
        if (!cancelled) setAllTableCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Resolve category labels for added products when id is not in the paginated list (e.g. subcategory or new root past old cache). */
  useEffect(() => {
    const inLists = (sid) =>
      allTableCategories.some(
        (x) => String(x._id || x.id) === sid,
      ) ||
      productCategories.some(
        (x) => String(x._id || x.id) === sid,
      ) ||
      Boolean(categoryNameById[sid]);

    const ids = new Set();
    for (const p of products) {
      const c = p?.categoryId;
      if (c == null || c === "") continue;
      if (typeof c === "object" && c?.name) continue;
      const sid = String(
        typeof c === "object" && c?._id ? c._id : c,
      ).trim();
      if (!/^[a-f0-9]{24}$/i.test(sid)) continue;
      if (inLists(sid)) continue;
      ids.add(sid);
    }
    if (ids.size === 0) return;
    let cancelled = false;
    (async () => {
      const updates = {};
      await Promise.all(
        [...ids].map(async (sid) => {
          try {
            const res = await categoryService.getById(sid);
            const data = res?.data || res;
            const cat = data?.data ?? data;
            if (cat?.name) updates[sid] = cat.name;
          } catch {
            // ignore
          }
        }),
      );
      if (!cancelled && Object.keys(updates).length > 0) {
        setCategoryNameById((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [products, allTableCategories, productCategories, categoryNameById]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const gid = formProduct.groupId;
      const params = { pageNumber: 1, pageSize: 100, parent: "null" };
      if (gid) params.group = gid;
      try {
        const res = await categoryService.getAll(params);
        const data = res?.data || res;
        if (!cancelled) setProductCategories(data?.categories || []);
      } catch {
        if (!cancelled) setProductCategories([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [formProduct.groupId]);

  // Auto-save draft to localStorage whenever relevant state changes (for new query only)
  useEffect(() => {
    if (isEdit) return;
    try {
      const draft = {
        companyInfo,
        industryId,
        industrySearch,
        products,
        currentStep,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
  }, [companyInfo, industryId, industrySearch, products, currentStep, isEdit]);

  // Industry search – top 5 matches
  const fetchIndustrySearch = useCallback(async (term) => {
    if (!term?.trim()) {
      setIndustrySearchResults([]);
      return;
    }
    setIndustrySearchLoading(true);
    try {
      const res = await industryService.getAll({
        search: term.trim(),
        pageSize: 5,
      });
      const data = res?.data || res;
      setIndustrySearchResults(data?.industries || []);
    } catch {
      setIndustrySearchResults([]);
    } finally {
      setIndustrySearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchIndustrySearch(industrySearch), 300);
    return () => clearTimeout(t);
  }, [industrySearch, fetchIndustrySearch]);

  const handleSelectIndustry = async (industry) => {
    const indId = industry._id || industry.id;
    setIndustryId(indId);
    setIndustrySearch(
      (industry.name || "") +
        (industry.location ? ` (${industry.location})` : ""),
    );
    setIndustryDropdownOpen(false);
    try {
      const res = await industryService.getById(indId);
      const data = res?.data || res;
      const areaVal = data?.area;
      setCompanyInfo({
        name: data?.name || "",
        area: getAreaId(areaVal) || "",
        subZoneId: getSubZoneId(data?.subZoneId) || "",
        location: data?.location || "",
        address: data?.address || "",
        purchaseManagers: mapPurchaseManagers(data?.purchaseManagers),
      });
    } catch {
      setCompanyInfo({
        name: industry?.name || "",
        area: getAreaId(industry?.area) || "",
        subZoneId: getSubZoneId(industry?.subZoneId) || "",
        location: industry?.location || "",
        address: industry?.address || "",
        purchaseManagers: mapPurchaseManagers(industry?.purchaseManagers),
      });
    }
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 200);
  };

  const handleClearIndustry = () => {
    setIndustryId(null);
    setIndustrySearch("");
    setCompanyInfo(INITIAL_COMPANY);
  };

  const applyQueryNewProductFromLibrary = (q) => {
    if (!q) return;
    const imageDocs = (q.images || [])
      .map((img) => {
        if (typeof img === "object" && img?._id) {
          return { _id: img._id, path: img.path || "" };
        }
        if (typeof img === "string" && /^[a-fA-F0-9]{24}$/.test(img)) {
          return { _id: img, path: "" };
        }
        return null;
      })
      .filter(Boolean);
    setFormProduct({
      productName: q.name || "",
      quantity: 1,
      unit: (q.unit && String(q.unit).trim()) || "pcs",
      hsnNumber: q.hsnNumber || "",
      modelNumber: q.modelNumber || "",
      gstPercentage: null,
      variants: (q.variants || []).map((v) => ({
        variantName: String(v),
      })),
      remark: "",
      description: q.description || "",
      product_id: null,
      productCode: "",
      isNewProduct: true,
      images: imageDocs,
      sourceQueryNewProductId: q._id || null,
    });
    setEditingProductIndex(null);
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    setProductImagePreviews([]);
    setProductImageFiles([]);
    setTimeout(() => {
      if (quantityInputRef.current) {
        quantityInputRef.current.focus();
      }
    }, 0);
    toastSuccess("Product details loaded. Review and save to add to the list.");
  };

  const clearProductForm = () => {
    setFormProduct({ ...INITIAL_PRODUCT });
    setEditingProductIndex(null);
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    setProductImagePreviews([]);
    setProductImageFiles([]);
  };

  const saveProduct = async () => {
    if (!formProduct.productName?.trim()) {
      toastError("Product name is required");
      return;
    }
    if (
      formProduct.quantity === "" ||
      formProduct.quantity === null ||
      Number.isNaN(Number(formProduct.quantity))
    ) {
      toastError("Quantity is required");
      return;
    }

    setAddingProductToQuery(true);
    try {
      let uploadedDocs = [];
      if (productImageFiles.length > 0) {
        try {
          const res = await documentService.uploadImages(productImageFiles);
          const payload = res?.data || res;
          const docs = payload?.data?.documents || payload?.documents || [];
          uploadedDocs = docs.map((d) => ({
            _id: d._id || d.id,
            path: d.path || d.url || "",
          }));
        } catch (err) {
          toastError(err?.message || "Failed to upload images");
          return;
        }
      }

      let createdQueryNewProduct = null;
      if (
        formProduct.isNewProduct &&
        !formProduct.productCode &&
        !formProduct.sourceQueryNewProductId
      ) {
        try {
          const newPayload = {
            name: (formProduct.productName || "").trim(),
            description: (formProduct.description || "").trim(),
            unit: (formProduct.unit || "").trim(),
            hsnNumber: (formProduct.hsnNumber || "").trim(),
            modelNumber: (formProduct.modelNumber || "").trim(),
            groupId: formProduct.groupId || null,
            categoryId: formProduct.categoryId || null,
            qty: (() => {
              const n = Number(formProduct.quantity);
              if (Number.isFinite(n) && n >= 0)
                return Number.isInteger(n) ? n : Math.max(0, Math.floor(n));
              return 1;
            })(),
            variants: (formProduct.variants || [])
              .map((v) => (v.variantName || "").trim())
              .filter(Boolean),
            images: uploadedDocs.map((d) => d._id),
          };
          if (newPayload.name) {
            const res = await queryNewProductService.create(newPayload);
            createdQueryNewProduct = res?.data;
          }
        } catch (err) {
          toastError(err?.message || "Failed to save new product");
          return;
        }
      }

      const codeAndRefFromNew =
        createdQueryNewProduct && createdQueryNewProduct._id
          ? {
              rawProductCode: createdQueryNewProduct.rawProductCode || "",
              query_tracking_code:
                createdQueryNewProduct.query_tracking_code || "",
              sourceQueryNewProductId: createdQueryNewProduct._id,
              groupId: formProduct.groupId || "",
              categoryId: formProduct.categoryId || "",
            }
          : {};

      const mergedImages = (formProduct.images || [])
        .concat(uploadedDocs)
        .slice(0, MAX_PRODUCT_IMAGES);
      const cleanedVariants = (formProduct.variants || [])
        .map((v) => ({ variantName: (v?.variantName || "").trim() }))
        .filter((v) => v.variantName);

      const productsToAdd =
        cleanedVariants.length > 0
          ? cleanedVariants.map((variant) => ({
              ...formProduct,
              ...codeAndRefFromNew,
              variants: [{ ...variant }],
              images: mergedImages,
            }))
          : [
              {
                ...formProduct,
                ...codeAndRefFromNew,
                images: mergedImages,
              },
            ];

      setProducts((prev) => [...prev, ...productsToAdd]);
      clearProductForm();
      toastSuccess(
        productsToAdd.length > 1
          ? `${productsToAdd.length} products added to list (one per variant)`
          : "Product added to list",
      );
    } finally {
      setAddingProductToQuery(false);
    }
  };

  const updateProductInList = async () => {
    if (editingProductIndex == null || !formProduct.productName?.trim()) {
      if (!formProduct.productName?.trim())
        toastError("Product name is required");
      return;
    }
    if (
      formProduct.quantity === "" ||
      formProduct.quantity === null ||
      Number.isNaN(Number(formProduct.quantity))
    ) {
      toastError("Quantity is required");
      return;
    }
    let uploadedDocs = [];
    if (productImageFiles.length > 0) {
      try {
        const res = await documentService.uploadImages(productImageFiles);
        const payload = res?.data || res;
        const docs = payload?.data?.documents || payload?.documents || [];
        uploadedDocs = docs.map((d) => ({
          _id: d._id || d.id,
          path: d.path || d.url || "",
        }));
      } catch (err) {
        toastError(err?.message || "Failed to upload images");
      }
    }

    const updatedProduct = {
      ...formProduct,
      images: (formProduct.images || [])
        .concat(uploadedDocs)
        .slice(0, MAX_PRODUCT_IMAGES),
    };

    setProducts((prev) => {
      const next = [...prev];
      next[editingProductIndex] = updatedProduct;
      return next;
    });
    clearProductForm();
    toastSuccess("Product updated");
  };

  const editProductFromTable = (index) => {
    const p = products[index];
    productImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    setProductImagePreviews([]);
    setProductImageFiles([]);
    setFormProduct({
      productName: p.productName || "",
      quantity: p.quantity ?? 1,
      unit: p.unit || "",
      hsnNumber: p.hsnNumber || "",
      modelNumber: p.modelNumber || "",
      gstPercentage: p.gstPercentage ?? null,
      variants: (p.variants || []).map((v) => ({
        variantName: v.variantName || "",
      })),
      remark: p.remark || "",
      description: p.description || "",
      product_id: p.product_id || null,
      productCode: p.productCode || "",
      rawProductCode: p.rawProductCode || "",
      query_tracking_code: p.query_tracking_code || "",
      groupId: (p.groupId && (p.groupId._id || p.groupId)) || "",
      categoryId: (p.categoryId && (p.categoryId._id || p.categoryId)) || "",
      isNewProduct: p.isNewProduct ?? !p.productCode,
      images: p.images || [],
      sourceQueryNewProductId: p.sourceQueryNewProductId || null,
    });
    setEditingProductIndex(index);
  };

  const deleteProductFromTable = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
    if (editingProductIndex === index) {
      clearProductForm();
    } else if (editingProductIndex != null && editingProductIndex > index) {
      setEditingProductIndex((prev) => prev - 1);
    }
    toastSuccess("Product removed from list");
  };

  const updateFormProduct = (field, value) => {
    setFormProduct((prev) => ({ ...prev, [field]: value }));
  };

  const addVariant = () => {
    setFormProduct((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), { ...INITIAL_VARIANT }],
    }));
  };

  const removeVariant = (variantIndex) => {
    setFormProduct((prev) => {
      const v = prev.variants || [];
      return { ...prev, variants: v.filter((_, i) => i !== variantIndex) };
    });
  };

  const updateVariant = (variantIndex, field, value) => {
    setFormProduct((prev) => {
      const variants = [...(prev.variants || [])];
      variants[variantIndex] = { ...variants[variantIndex], [field]: value };
      return { ...prev, variants };
    });
  };

  const removeSelectedUploadImage = (index) => {
    setProductImageFiles((prev) => prev.filter((_, i) => i !== index));
    setProductImagePreviews((prev) => {
      const urlToRemove = prev[index];
      if (urlToRemove) {
        try {
          URL.revokeObjectURL(urlToRemove);
        } catch {
          // ignore revoke errors
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingProductImage = (index) => {
    setFormProduct((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const getImageDisplayUrl = (img) => {
    if (!img) return "";
    if (typeof img === "string") {
      if (/^[a-fA-F0-9]{24}$/.test(img))
        return `${getAssetsBaseUrl()}${DOCUMENTS.SERVE(img)}`;
      return getAssetsUrl(img);
    }
    if (img.path || img.url) return getAssetsUrl(img.path || img.url);
    if (img._id && /^[a-fA-F0-9]{24}$/.test(String(img._id))) {
      return `${getAssetsBaseUrl()}${DOCUMENTS.SERVE(String(img._id))}`;
    }
    return "";
  };

  // Load for edit
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await withMinimumDelay(() => queryService.getById(id));
        const data = res?.data || res;
        const q = data?.data ?? data;
        if (!q) throw new Error("Query not found");
        if (q.status === "closed") {
          toastError("This query is closed and cannot be edited");
          navigate(`/queries/${id}`);
          return;
        }

        const ci = q.companyInfo || {};
        let managers = (ci.purchaseManagers || []).map((m) => ({
          name: m?.name || "",
          phone: m?.phone || "",
          email: m?.email || "",
        }));
        if (
          managers.length === 0 &&
          (ci.purchase_manager_name || ci.purchase_manager_phone)
        ) {
          managers = [
            {
              name: ci.purchase_manager_name || "",
              phone: ci.purchase_manager_phone || "",
              email: ci.email || "",
            },
          ];
        }
        setCompanyInfo({
          name: ci.name || "",
          area: getAreaId(ci.area) || ci.area || "",
          subZoneId: (ci.subZoneId && String(ci.subZoneId).trim()) || "",
          location: ci.location || "",
          address: ci.address || "",
          purchaseManagers: managers,
        });
        setIndustryId(q.industry_id?._id || q.industry_id || null);
        setIndustrySearch(q.industry_id?.name || ci.name || "");

        const prods = q.products?.length
          ? q.products.map((p) => ({
              productName: p.productName || "",
              quantity: p.quantity ?? 1,
              unit: p.unit || "",
              hsnNumber: p.hsnNumber || "",
              modelNumber: p.modelNumber || "",
              gstPercentage: p.gstPercentage ?? null,
              variants: (p.variants || []).map((v) => ({
                variantName: v.variantName || "",
              })),
              remark: p.remark || "",
              description: p.description || "",
              product_id: p.product_id?._id || p.product_id || null,
              productCode:
                (p.product_id &&
                  typeof p.product_id === "object" &&
                  p.product_id.productCode) ||
                p.productCode ||
                "",
              rawProductCode: p.rawProductCode || "",
              query_tracking_code: p.query_tracking_code || "",
              groupId: (p.groupId && (p.groupId._id || p.groupId)) || "",
              categoryId: (p.categoryId && (p.categoryId._id || p.categoryId)) || "",
              isNewProduct: p.isNewProduct ?? !p.productCode,
              images: Array.isArray(p.images) ? p.images : [],
              sourceQueryNewProductId: p.sourceQueryNewProductId || null,
            }))
          : [];
        setProducts(prods);
      } catch (err) {
        toastError(err?.message || "Failed to load query");
        setError(err?.message || "Failed to load query");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, navigate]);

  const getCreatedBy = () => {
    try {
      const stored = localStorage.getItem("migticrm_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?._id || parsed?.id;
      }
    } catch {}
    return user?._id || user?.id;
  };

  const handleNextFromCompany = () => {
    if (!companyInfo?.name?.trim()) {
      toastError("Company / Client name is required");
      return;
    }
    if ((companyInfo.name || "").length > 100) {
      toastError("Company name must be at most 100 characters");
      return;
    }
    const managers = companyInfo?.purchaseManagers || [];
    for (const m of managers) {
      if ((m?.name || "").length > 100) {
        toastError("Purchase manager name must be at most 100 characters");
        return;
      }
      const pm = (m?.phone || "").trim();
      if (pm && !/^\d{10}$/.test(pm)) {
        toastError(
          `Purchase manager "${m?.name || "Unknown"}" phone must be exactly 10 digits`,
        );
        return;
      }
    }
    if ((companyInfo.address || "").length > 500) {
      toastError("Address must be at most 500 characters");
      return;
    }
    goToStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextFromProducts = () => {
    const validProducts = products.filter((p) => (p.productName || "").trim());
    if (validProducts.length === 0) {
      toastError(
        "Add at least one product using the form above and click Save",
      );
      return;
    }
    goToStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openImagesModal = (product) => {
    const urls = (product?.images || [])
      .map((img) => (typeof img === "string" ? img : img?.path || ""))
      .filter(Boolean);
    if (!urls.length) return;
    setImagesModal({ visible: true, images: urls });
  };

  const renderProductImagesCell = (p) => {
    const imgs = Array.isArray(p?.images) ? p.images : [];
    if (imgs.length === 0) return "–";
    const displayUrl = (img) =>
      getAssetsUrl(typeof img === "string" ? img : img?.path || "");
    return (
      <div
        role="button"
        tabIndex={0}
        className="d-inline-flex align-items-center gap-1 flex-wrap"
        style={{ cursor: "pointer", maxWidth: 140 }}
        onClick={() => openImagesModal(p)}
        onKeyDown={(e) => e.key === "Enter" && openImagesModal(p)}
        aria-label={`View ${imgs.length} image(s)`}
      >
        {imgs.slice(0, 2).map((img, idx) => (
          <div
            key={idx}
            className="rounded overflow-hidden border flex-shrink-0"
            style={{ width: 36, height: 36 }}
          >
            <CImage
              src={displayUrl(img)}
              alt=""
              className="w-100 h-100"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
        {imgs.length > 2 && (
          <div
            className="d-flex align-items-center justify-content-center rounded border bg-light flex-shrink-0 text-primary small fw-bold"
            style={{ width: 36, height: 36, fontSize: "0.75rem" }}
          >
            +{imgs.length - 2}
          </div>
        )}
      </div>
    );
  };

  const getAreaLabel = () => {
    const areaId = companyInfo.area;
    if (!areaId) return "";
    const match = areas.find((a) => (a._id || a.id) === areaId);
    if (!match) return "";
    return `${match.name}${match.city ? ` - ${match.city}` : ""}`;
  };

  const getSubZoneLabel = () => {
    const sid = companyInfo.subZoneId;
    if (!sid) return "";
    const match = querySubZones.find(
      (s) => String(s._id || s.id) === String(sid),
    );
    if (!match) return sid;
    return `${match.subZoneCode ? `${match.subZoneCode} — ` : ""}${match.name || ""}`;
  };

  const resolveGroupName = (id) => {
    if (id != null && typeof id === "object" && id?.name) return id.name;
    if (id == null || id === "") return "–";
    const sid = String(
      typeof id === "object" && id?._id ? id._id : id,
    );
    const g = productGroups.find(
      (x) => String(x._id || x.id) === sid,
    );
    return g?.name || "–";
  };
  const resolveCategoryName = (id) => {
    if (id != null && typeof id === "object" && id?.name) return id.name;
    if (id == null || id === "") return "–";
    const sid = String(
      typeof id === "object" && id?._id ? id._id : id,
    );
    if (!sid) return "–";
    const c =
      allTableCategories.find(
        (x) => String(x._id || x.id) === sid,
      ) ||
      productCategories.find(
        (x) => String(x._id || x.id) === sid,
      );
    if (c?.name) return c.name;
    if (categoryNameById[sid]) return categoryNameById[sid];
    return "–";
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "active";
    return "upcoming";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyInfo?.name?.trim()) {
      toastError("Company / Client name is required");
      return;
    }
    if ((companyInfo.name || "").length > 100) {
      toastError("Company name must be at most 100 characters");
      return;
    }
    const managers = companyInfo?.purchaseManagers || [];
    for (const m of managers) {
      if ((m?.name || "").length > 100) {
        toastError("Purchase manager name must be at most 100 characters");
        return;
      }
      const pm = (m?.phone || "").trim();
      if (pm && !/^\d{10}$/.test(pm)) {
        toastError(
          `Purchase manager "${m?.name || "Unknown"}" phone must be exactly 10 digits`,
        );
        return;
      }
    }
    if ((companyInfo.address || "").length > 500) {
      toastError("Address must be at most 500 characters");
      return;
    }
    const validProducts = products.filter((p) => (p.productName || "").trim());
    if (validProducts.length === 0) {
      toastError(
        "Add at least one product using the form above and click Save",
      );
      return;
    }
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const qty = Number(p.quantity);
      if (Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
        toastError(
          `Product "${(p.productName || "").trim() || i + 1}": quantity must be a whole number 0 or more`,
        );
        return;
      }
      const gst = p.gstPercentage;
      if (gst != null && (typeof gst !== "number" || gst < 0 || gst > 100)) {
        toastError(
          `Product "${(p.productName || "").trim() || i + 1}": GST % must be between 0 and 100`,
        );
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        companyInfo: {
          ...companyInfo,
          area: companyInfo.area || "",
          subZoneId: companyInfo.subZoneId || "",
          purchaseManagers: (companyInfo.purchaseManagers || [])
            .map((m) => ({
              name: (m?.name || "").trim(),
              phone: (m?.phone || "").trim(),
              email: (m?.email || "").trim(),
            }))
            .filter((m) => m.name || m.phone),
        },
        industry_id: industryId || null,
        products: products
          .map((p) => ({
            productName: p.productName?.trim() || "",
            quantity: Number(p.quantity) ?? 1,
            unit: (p.unit && String(p.unit).trim()) || "",
            hsnNumber: (p.hsnNumber && String(p.hsnNumber).trim()) || "",
            modelNumber: (p.modelNumber && String(p.modelNumber).trim()) || "",
            gstPercentage:
              typeof p.gstPercentage === "number" ? p.gstPercentage : null,
            variants: (p.variants || [])
              .map((v) => ({
                variantName:
                  (v.variantName && String(v.variantName).trim()) || "",
              }))
              .filter((v) => v.variantName),
            remark: p.remark?.trim() || "",
            description: p.description?.trim() || "",
            product_id: p.product_id || null,
            groupId: p.groupId || null,
            categoryId: p.categoryId || null,
            rawProductCode: (p.rawProductCode && String(p.rawProductCode).trim()) || "",
            query_tracking_code:
              (p.query_tracking_code && String(p.query_tracking_code).trim()) || "",
            images: (p.images || [])
              .map((img) => {
                if (typeof img === "object" && img?._id) return img._id;
                if (typeof img === "string" && /^[a-fA-F0-9]{24}$/.test(img))
                  return img;
                return null;
              })
              .filter(Boolean),
          }))
          .filter((p) => p.productName),
        created_by: isEdit ? undefined : getCreatedBy(),
      };
      if (isEdit) {
        await queryService.update(id, payload);
        toastSuccess("Query updated successfully");
      } else {
        await queryService.create(payload);
        toastSuccess("Query created successfully");
      }
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      navigate("/queries");
    } catch (err) {
      toastError(err?.message || "Failed to save query");
      setError(err?.message || "Failed to save query");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    navigate("/queries");
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Loader message="Loading query..." />
      </div>
    );
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton
            color="light"
            onClick={() => navigate("/queries")}
            className="me-2"
          >
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back to Queries
          </CButton>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError("")}>
          {error}
        </CAlert>
      )}

      <div
        className="mb-4 sticky-top"
        style={{ top: 0, zIndex: 1040, backgroundColor: "#f8f9fa" }}
      >
        <CCard>
          <CCardBody>
            <div className="d-flex justify-content-between align-items-center mb-3">
              {STEPS.map((step) => {
                const status = getStepStatus(step.id);
                const isCompleted = status === "completed";
                const isActive = status === "active";
                const isProductsStep = step.id === 2;
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
                    <div className="mt-2 small fw-semibold d-flex justify-content-center align-items-center gap-1">
                      <span>{step.label}</span>
                      {isProductsStep && (
                        <CBadge color="primary" className="ms-1">
                          {products.length}
                        </CBadge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <CProgress thin color="primary">
              <CProgressBar
                value={((currentStep - 1) / (STEPS.length - 1 || 1)) * 100}
              />
            </CProgress>
          </CCardBody>
        </CCard>
      </div>

      <CForm onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <>
            {/* 1. Company Information */}
            <CCard className="mb-4">
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <strong>1. Company Information</strong>
                {!isEdit && (
                  <CButton
                    color="secondary"
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem(DRAFT_STORAGE_KEY);
                      } catch {
                        // ignore
                      }
                      setCompanyInfo({ ...INITIAL_COMPANY });
                      setIndustryId(null);
                      setIndustrySearch("");
                      setProducts([]);
                      setCurrentStep(1);
                      toastSuccess("Saved query form data cleared");
                    }}
                  >
                    Clear saved data
                  </CButton>
                )}
              </CCardHeader>
              <CCardBody>
                <div
                  className="mb-3 position-relative"
                  ref={companyDropdownRef}
                >
                  <CFormLabel>
                    Client / Company name (search & select)
                  </CFormLabel>
                  <CFormInput
                    type="text"
                    value={industrySearch}
                    onChange={(e) => setIndustrySearch(e.target.value)}
                    onFocus={() => setIndustryDropdownOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setIndustryDropdownOpen(false), 200)
                    }
                    placeholder="Type to see best 5 matches..."
                    autoComplete="off"
                  />
                  {industryId && (
                    <div className="mt-2">
                      <CButton
                        color="link"
                        size="sm"
                        type="button"
                        onClick={handleClearIndustry}
                      >
                        Clear selection
                      </CButton>
                    </div>
                  )}
                  {industryDropdownOpen && (
                    <div
                      className="position-absolute w-100 bg-white border rounded mt-1 shadow-sm"
                      style={{ zIndex: 10, maxHeight: 280, overflowY: "auto" }}
                    >
                      <CListGroup flush>
                        {industrySearchLoading && (
                          <CListGroupItem className="text-muted">
                            Searching...
                          </CListGroupItem>
                        )}
                        {!industrySearchLoading &&
                          industrySearchResults.length === 0 &&
                          industrySearch.trim() && (
                            <CListGroupItem className="text-muted">
                              No matches. Enter details manually below.
                            </CListGroupItem>
                          )}
                        {!industrySearchLoading &&
                          industrySearchResults.map((ind) => (
                            <CListGroupItem
                              key={ind._id || ind.id}
                              component="button"
                              type="button"
                              className="text-start"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectIndustry(ind);
                              }}
                            >
                              <div className="fw-semibold">{ind.name}</div>
                              {ind.location && (
                                <div className="text-muted small">
                                  {ind.location}
                                </div>
                              )}
                            </CListGroupItem>
                          ))}
                      </CListGroup>
                    </div>
                  )}
                </div>

                <CFormLabel className="mt-3">
                  Editable company details (stored in query only)
                </CFormLabel>
                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Company name (max 100 characters)</CFormLabel>
                      <CFormInput
                        value={companyInfo.name}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({
                            ...c,
                            name: e.target.value.slice(0, 100),
                          }))
                        }
                        placeholder="Company / Client name"
                        maxLength={100}
                      />
                      <div className="form-text text-muted small">
                        {(companyInfo.name || "").length}/100
                      </div>
                    </div>
                  </CCol>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Zone</CFormLabel>
                      <CFormSelect
                        value={companyInfo.area}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({
                            ...c,
                            area: e.target.value,
                            subZoneId: "",
                          }))
                        }
                      >
                        <option value="">Select zone</option>
                        {areas.map((a) => (
                          <option key={a._id || a.id} value={a._id || a.id}>
                            {a.name}
                            {a.city ? ` - ${a.city}` : ""}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                </CRow>
                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Sub-zone</CFormLabel>
                      <CFormSelect
                        value={companyInfo.subZoneId || ""}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({
                            ...c,
                            subZoneId: e.target.value,
                          }))
                        }
                        disabled={
                          !companyInfo.area || querySubZones.length === 0
                        }
                      >
                        <option value="">
                          {!companyInfo.area
                            ? "Select a zone first"
                            : querySubZones.length === 0
                              ? "No sub-zones (optional)"
                              : "Optional"}
                        </option>
                        {querySubZones.map((sz) => {
                          const sid = sz._id || sz.id;
                          return (
                            <option key={sid} value={sid}>
                              {(sz.subZoneCode ? `${sz.subZoneCode} — ` : "") +
                                (sz.name || "")}
                            </option>
                          );
                        })}
                      </CFormSelect>
                    </div>
                  </CCol>
                </CRow>
                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Location URL</CFormLabel>
                      <CFormInput
                        value={companyInfo.location}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({
                            ...c,
                            location: e.target.value,
                          }))
                        }
                        placeholder="Location URL"
                      />
                    </div>
                  </CCol>
                </CRow>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <CFormLabel className="mb-0">Purchase managers</CFormLabel>
                    <CButton
                      color="primary"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setCompanyInfo((c) => ({
                          ...c,
                          purchaseManagers: [
                            ...(c.purchaseManagers || []),
                            { name: "", phone: "", email: "" },
                          ],
                        }))
                      }
                    >
                      <CIcon icon={cilPlus} className="me-1" />
                      Add purchase manager
                    </CButton>
                  </div>
                  {(companyInfo.purchaseManagers || []).length > 0 ? (
                    <div className="border rounded p-2">
                      {(companyInfo.purchaseManagers || []).map((m, idx) => (
                        <CRow key={idx} className="align-items-end mb-2 g-2">
                          <CCol md={3}>
                            <CFormInput
                              value={m.name || ""}
                              onChange={(e) =>
                                setCompanyInfo((c) => {
                                  const next = [...(c.purchaseManagers || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    name: e.target.value.slice(0, 100),
                                  };
                                  return { ...c, purchaseManagers: next };
                                })
                              }
                              placeholder="Name (max 100)"
                              maxLength={100}
                            />
                          </CCol>
                          <CCol md={3}>
                            <CFormInput
                              value={m.phone || ""}
                              onChange={(e) =>
                                setCompanyInfo((c) => {
                                  const next = [...(c.purchaseManagers || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    phone: e.target.value,
                                  };
                                  return { ...c, purchaseManagers: next };
                                })
                              }
                              placeholder="Phone"
                            />
                          </CCol>
                          <CCol md={4}>
                            <CFormInput
                              type="email"
                              value={m.email || ""}
                              onChange={(e) =>
                                setCompanyInfo((c) => {
                                  const next = [...(c.purchaseManagers || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    email: e.target.value,
                                  };
                                  return { ...c, purchaseManagers: next };
                                })
                              }
                              placeholder="Email"
                            />
                          </CCol>
                          <CCol md={2}>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() =>
                                setCompanyInfo((c) => ({
                                  ...c,
                                  purchaseManagers: (
                                    c.purchaseManagers || []
                                  ).filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CCol>
                        </CRow>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small mb-0">
                      Click &quot;Add purchase manager&quot; to add contact(s).
                      Or select an industry to load from.
                    </p>
                  )}
                </div>
                <CRow>
                  <CCol xs={12}>
                    <div className="mb-3">
                      <CFormLabel>Address (max 500 characters)</CFormLabel>
                      <CFormTextarea
                        rows={2}
                        value={companyInfo.address}
                        onChange={(e) =>
                          setCompanyInfo((c) => ({
                            ...c,
                            address: e.target.value.slice(0, 500),
                          }))
                        }
                        placeholder="Address"
                        maxLength={500}
                      />
                      <div className="form-text text-muted small">
                        {(companyInfo.address || "").length}/500
                      </div>
                    </div>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
            <div className="d-flex justify-content-end mb-4">
              <CButton
                color="warning"
                type="button"
                onClick={handleNextFromCompany}
              >
                Next: Products
              </CButton>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            {/* 2. Products – add/edit form + table */}
            <CCard className="mb-4">
              <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <strong>2. Products</strong>
                  <div className="text-muted small fw-normal mt-1">
                    Open the library to search by name, description, or HSN and
                    import a product into the form.
                  </div>
                </div>
                <CButton
                  color="primary"
                  size="sm"
                  className="align-self-start"
                  onClick={() => setFindProductSidebarOpen((v) => !v)}
                >
                  <CIcon icon={cilSearch} className="me-1" />
                  Find Product
                </CButton>
              </CCardHeader>
              <CCardBody>
                <CCard className="mb-4 position-relative">
                  {addingProductToQuery && (
                    <div
                      className="position-absolute top-0 start-0 end-0 bottom-0 rounded d-flex align-items-center justify-content-center bg-white bg-opacity-75"
                      style={{ zIndex: 10 }}
                      aria-hidden="true"
                    />
                  )}
                  <CCardHeader className="py-2">
                    <strong>
                      {editingProductIndex != null
                        ? "Edit product"
                        : "Add product"}
                    </strong>
                  </CCardHeader>
                  <CCardBody>
                    <CRow>
                      <CCol md={4}>
                        <div className="mb-3">
                          <CFormLabel>Product name</CFormLabel>
                          <CFormInput
                            value={formProduct.productName}
                            onChange={(e) =>
                              updateFormProduct("productName", e.target.value)
                            }
                            placeholder="Product name"
                          />
                        </div>
                      </CCol>
                      <CCol md={3}>
                        <div className="mb-3">
                          <CFormLabel>Quantity (number)</CFormLabel>
                          <CFormInput
                            type="number"
                            min={0}
                            value={formProduct.quantity}
                            onChange={(e) =>
                              updateFormProduct("quantity", e.target.value)
                            }
                            placeholder="Quantity"
                            required
                            ref={quantityInputRef}
                          />
                        </div>
                      </CCol>
                      <CCol md={3}>
                        <div className="mb-3">
                          <CFormLabel>Unit</CFormLabel>
                          <CFormInput
                            value={formProduct.unit || ""}
                            onChange={(e) =>
                              updateFormProduct("unit", e.target.value)
                            }
                            placeholder="pcs, kg, etc."
                          />
                        </div>
                      </CCol>
                      <CCol md={2}>
                        <div className="mb-3">
                          <CFormLabel>New product</CFormLabel>
                          <div
                            className="d-inline-flex align-items-center"
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              updateFormProduct(
                                "isNewProduct",
                                !formProduct.isNewProduct,
                              )
                            }
                          >
                            <CFormCheck
                              id="new-product-check"
                              checked={!!formProduct.isNewProduct}
                              onChange={(e) =>
                                updateFormProduct(
                                  "isNewProduct",
                                  e.target.checked,
                                )
                              }
                              label="Mark as new"
                              style={{ cursor: "pointer" }}
                            />
                          </div>
                        </div>
                      </CCol>
                    </CRow>
                    <CRow>
                      <CCol md={6}>
                        <div className="mb-3">
                          <CFormLabel>Group (optional)</CFormLabel>
                          <CFormSelect
                            value={formProduct.groupId || ""}
                            onChange={(e) =>
                              setFormProduct((prev) => ({
                                ...prev,
                                groupId: e.target.value,
                                categoryId: "",
                              }))
                            }
                            aria-label="Group"
                          >
                            <option value="">Select group</option>
                            {productGroups.map((g) => (
                              <option key={g._id} value={g._id}>
                                {g.name}
                              </option>
                            ))}
                          </CFormSelect>
                        </div>
                      </CCol>
                      <CCol md={6}>
                        <div className="mb-3">
                          <CFormLabel>Category (optional)</CFormLabel>
                          <CFormSelect
                            value={formProduct.categoryId || ""}
                            onChange={(e) =>
                              updateFormProduct("categoryId", e.target.value)
                            }
                            disabled={!formProduct.groupId}
                            aria-label="Category"
                          >
                            <option value="">
                              {formProduct.groupId
                                ? "Select category"
                                : "Select a group first"}
                            </option>
                            {productCategories.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                          </CFormSelect>
                        </div>
                      </CCol>
                    </CRow>
                    {formProduct.productCode && (
                      <CRow className="mb-2">
                        <CCol md={4}>
                          <div className="mb-3">
                            <CFormLabel>Product code (catalog)</CFormLabel>
                            <CFormInput
                              value={formProduct.productCode}
                              disabled
                              readOnly
                            />
                          </div>
                        </CCol>
                      </CRow>
                    )}
                    <CRow>
                      <CCol md={6}>
                        <div className="mb-3">
                          <CFormLabel>HSN Number (optional)</CFormLabel>
                          <CFormInput
                            value={formProduct.hsnNumber || ""}
                            onChange={(e) =>
                              updateFormProduct("hsnNumber", e.target.value)
                            }
                            placeholder="HSN Number"
                          />
                        </div>
                      </CCol>
                      <CCol md={6}>
                        <div className="mb-3">
                          <CFormLabel>Model Number (optional)</CFormLabel>
                          <CFormInput
                            value={formProduct.modelNumber || ""}
                            onChange={(e) =>
                              updateFormProduct("modelNumber", e.target.value)
                            }
                            placeholder="Model Number"
                          />
                        </div>
                      </CCol>
                    </CRow>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <CFormLabel className="mb-0">Variants</CFormLabel>
                        <CButton
                          color="primary"
                          size="sm"
                          type="button"
                          onClick={addVariant}
                        >
                          <CIcon icon={cilPlus} className="me-1" />
                          Add variant
                        </CButton>
                      </div>
                      {(formProduct.variants || []).length > 0 ? (
                        (formProduct.variants || []).map((v, vIdx) => (
                          <CRow key={vIdx} className="mb-2 align-items-end">
                            <CCol md={8}>
                              <CFormInput
                                value={v.variantName || ""}
                                onChange={(e) =>
                                  updateVariant(
                                    vIdx,
                                    "variantName",
                                    e.target.value,
                                  )
                                }
                                placeholder="Variant name"
                              />
                            </CCol>
                            <CCol md={2}>
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => removeVariant(vIdx)}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </CCol>
                          </CRow>
                        ))
                      ) : (
                        <p className="text-muted small mb-0">
                          No variants. Click &quot;Add variant&quot; to add.
                        </p>
                      )}
                    </div>
                    <div className="mb-3">
                      <CFormLabel>Remark</CFormLabel>
                      <CFormTextarea
                        rows={2}
                        value={formProduct.remark}
                        onChange={(e) =>
                          updateFormProduct("remark", e.target.value)
                        }
                        placeholder="Remark"
                      />
                    </div>
                    <div className="mb-3">
                      <CFormLabel>Product description</CFormLabel>
                      <CFormTextarea
                        rows={2}
                        value={formProduct.description}
                        onChange={(e) =>
                          updateFormProduct("description", e.target.value)
                        }
                        placeholder="Product description (e.g. from catalog)"
                      />
                    </div>
                    <div className="mb-3">
                      <CFormLabel>Images (optional)</CFormLabel>
                      <CFormInput
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          const existingCount = Array.isArray(
                            formProduct.images,
                          )
                            ? formProduct.images.length
                            : 0;
                          const remainingSlots =
                            MAX_PRODUCT_IMAGES -
                            existingCount -
                            productImageFiles.length;

                          if (remainingSlots <= 0) {
                            toastError(
                              `Only ${MAX_PRODUCT_IMAGES} images allowed per product`,
                            );
                            e.target.value = "";
                            return;
                          }

                          const acceptedFiles = files.slice(0, remainingSlots);
                          if (acceptedFiles.length < files.length) {
                            toastError(
                              `Only ${MAX_PRODUCT_IMAGES} images allowed. Extra images were ignored.`,
                            );
                          }

                          setProductImageFiles((prev) => [
                            ...prev,
                            ...acceptedFiles,
                          ]);
                          const previews = acceptedFiles.map((file) =>
                            URL.createObjectURL(file),
                          );
                          setProductImagePreviews((prev) => [
                            ...prev,
                            ...previews,
                          ]);
                          e.target.value = "";
                        }}
                      />
                      {Array.isArray(formProduct.images) &&
                        formProduct.images.length > 0 && (
                          <div className="mt-2">
                            <div className="small text-muted mb-1">
                              Existing images
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                              {formProduct.images.map((img, idx) => {
                                const imageUrl = getImageDisplayUrl(img);
                                if (!imageUrl) return null;
                                return (
                                  <div
                                    key={`existing-${idx}`}
                                    className="position-relative border rounded overflow-hidden"
                                    style={{ width: 64, height: 64 }}
                                  >
                                    <CImage
                                      src={imageUrl}
                                      alt={`Existing ${idx + 1}`}
                                      width={64}
                                      height={64}
                                      className="w-100 h-100"
                                      style={{ objectFit: "cover" }}
                                    />
                                    <CButton
                                      color="danger"
                                      size="sm"
                                      shape="rounded-pill"
                                      className="position-absolute d-flex align-items-center justify-content-center p-0"
                                      style={{
                                        top: 2,
                                        right: 2,
                                        width: 18,
                                        height: 18,
                                        minWidth: 18,
                                      }}
                                      onClick={() =>
                                        removeExistingProductImage(idx)
                                      }
                                      title="Remove existing image"
                                      type="button"
                                    >
                                      <CIcon icon={cilX} size="sm" />
                                    </CButton>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      {productImagePreviews.length > 0 && (
                        <div className="mt-2">
                          <div className="small text-muted mb-1">
                            New uploads
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {productImagePreviews.map((src, idx) => (
                              <div
                                key={idx}
                                className="position-relative border rounded overflow-hidden"
                                style={{ width: 64, height: 64 }}
                              >
                                <CImage
                                  src={src}
                                  alt={`Preview ${idx + 1}`}
                                  width={64}
                                  height={64}
                                  className="w-100 h-100"
                                  style={{ objectFit: "cover" }}
                                />
                                <CButton
                                  color="danger"
                                  size="sm"
                                  shape="rounded-pill"
                                  className="position-absolute d-flex align-items-center justify-content-center p-0"
                                  style={{
                                    top: 2,
                                    right: 2,
                                    width: 18,
                                    height: 18,
                                    minWidth: 18,
                                  }}
                                  onClick={() => removeSelectedUploadImage(idx)}
                                  title="Remove image"
                                  type="button"
                                >
                                  <CIcon icon={cilX} size="sm" />
                                </CButton>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="form-text">
                        {Math.min(
                          MAX_PRODUCT_IMAGES,
                          (formProduct.images || []).length +
                            productImageFiles.length,
                        )}
                        /{MAX_PRODUCT_IMAGES} images selected
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      {editingProductIndex != null ? (
                        <CButton
                          color="primary"
                          type="button"
                          onClick={updateProductInList}
                          disabled={addingProductToQuery}
                        >
                          Update
                        </CButton>
                      ) : (
                        <CButton
                          color="primary"
                          type="button"
                          onClick={saveProduct}
                          disabled={addingProductToQuery}
                        >
                          {addingProductToQuery ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Adding...
                            </>
                          ) : (
                            "Add Product to Query"
                          )}
                        </CButton>
                      )}
                      {editingProductIndex != null && (
                        <CButton
                          color="secondary"
                          type="button"
                          onClick={clearProductForm}
                        >
                          Cancel
                        </CButton>
                      )}
                    </div>
                  </CCardBody>
                </CCard>

                <div className="mt-3">
                  <strong className="d-block mb-2">Added products</strong>
                  {products.length === 0 ? (
                    <p className="text-muted small mb-0">
                      No products added yet. Fill the form above and click Save
                      to add.
                    </p>
                  ) : (
                    <CTable responsive hover bordered>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>S.No.</CTableHeaderCell>
                          <CTableHeaderCell>Product name</CTableHeaderCell>
                          <CTableHeaderCell>Group</CTableHeaderCell>
                          <CTableHeaderCell>Category</CTableHeaderCell>
                          <CTableHeaderCell>Quantity</CTableHeaderCell>
                          <CTableHeaderCell>Unit</CTableHeaderCell>
                          <CTableHeaderCell>Variants</CTableHeaderCell>
                          <CTableHeaderCell>HSN Number</CTableHeaderCell>
                          <CTableHeaderCell>GST %</CTableHeaderCell>
                          <CTableHeaderCell>Description</CTableHeaderCell>
                          <CTableHeaderCell>Remark</CTableHeaderCell>
                          <CTableHeaderCell>Images</CTableHeaderCell>
                          <CTableHeaderCell className="text-end">
                            Actions
                          </CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {products.map((p, index) => (
                          <CTableRow key={index}>
                            <CTableDataCell>{index + 1}</CTableDataCell>
                            <CTableDataCell>
                              {p.productName || "–"}
                            </CTableDataCell>
                            <CTableDataCell className="small text-break">
                              {resolveGroupName(p.groupId)}
                            </CTableDataCell>
                            <CTableDataCell className="small text-break">
                              {resolveCategoryName(p.categoryId)}
                            </CTableDataCell>
                            <CTableDataCell>{p.quantity ?? "–"}</CTableDataCell>
                            <CTableDataCell>{p.unit || "–"}</CTableDataCell>
                            <CTableDataCell>
                              {(p.variants || []).length > 0
                                ? (p.variants || [])
                                    .map((v) => v.variantName || "–")
                                    .join(", ")
                                : "–"}
                            </CTableDataCell>
                            <CTableDataCell className="small">
                              {p.hsnNumber || "–"}
                            </CTableDataCell>
                            <CTableDataCell className="small">
                              {typeof p.gstPercentage === "number"
                                ? `${p.gstPercentage}%`
                                : "–"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {(p.description || "").slice(0, 40)}
                              {(p.description || "").length > 40 ? "…" : ""}
                            </CTableDataCell>
                            <CTableDataCell>
                              {(p.remark || "").slice(0, 40)}
                              {(p.remark || "").length > 40 ? "…" : ""}
                            </CTableDataCell>
                            <CTableDataCell>
                              {renderProductImagesCell(p)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CButton
                                color="primary"
                                variant="ghost"
                                size="sm"
                                className="me-1"
                                onClick={() => editProductFromTable(index)}
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteProductFromTable(index)}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                </div>
              </CCardBody>
            </CCard>

            <div className="d-flex justify-content-between mb-4">
              <CButton
                color="secondary"
                type="button"
                onClick={() => goToStep(1)}
              >
                Back to Company
              </CButton>
              <CButton
                color="warning"
                type="button"
                onClick={handleNextFromProducts}
              >
                Next: Preview
              </CButton>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            {/* 3. Preview */}
            <CCard className="mb-4">
              <CCardHeader>
                <strong>3. Preview</strong>
              </CCardHeader>
              <CCardBody>
                <CAlert color="info" className="mb-4">
                  Review the company information and products. This screen is
                  read-only. Use the Back buttons to edit before saving the
                  query.
                </CAlert>

                <h6 className="mb-3">Company Information</h6>
                <CCard className="mb-3">
                  <CCardBody>
                    <CRow className="mb-3">
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Client / Company</strong>
                          <div>{industrySearch || companyInfo.name || "–"}</div>
                        </div>
                      </CCol>
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Zone</strong>
                          <div>{getAreaLabel() || "–"}</div>
                        </div>
                      </CCol>
                    </CRow>
                    <CRow className="mb-3">
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Sub-zone</strong>
                          <div>{getSubZoneLabel() || "–"}</div>
                        </div>
                      </CCol>
                    </CRow>
                    <CRow>
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Location URL</strong>
                          <div>{companyInfo.location || "–"}</div>
                        </div>
                      </CCol>
                      <CCol md={6}>
                        <div className="mb-2">
                          <strong>Address</strong>
                          <div>{companyInfo.address || "–"}</div>
                        </div>
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>

                <div className="mb-4">
                  <strong>Purchase Managers</strong>
                  {(companyInfo.purchaseManagers || []).length === 0 ? (
                    <p className="text-muted small mb-0">
                      No purchase managers added.
                    </p>
                  ) : (
                    <CTable responsive size="sm" bordered className="mt-2">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Name</CTableHeaderCell>
                          <CTableHeaderCell>Phone</CTableHeaderCell>
                          <CTableHeaderCell>Email</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {(companyInfo.purchaseManagers || []).map((m, idx) => (
                          <CTableRow key={idx}>
                            <CTableDataCell>{m.name || "–"}</CTableDataCell>
                            <CTableDataCell>{m.phone || "–"}</CTableDataCell>
                            <CTableDataCell>{m.email || "–"}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                </div>

                <h6 className="mb-3">Products</h6>
                {products.length === 0 ? (
                  <p className="text-muted small mb-0">
                    No products added. Go back to add at least one product.
                  </p>
                ) : (
                  <CTable responsive hover bordered>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>S.No.</CTableHeaderCell>
                        <CTableHeaderCell>Product name</CTableHeaderCell>
                        <CTableHeaderCell>Group</CTableHeaderCell>
                        <CTableHeaderCell>Category</CTableHeaderCell>
                        <CTableHeaderCell>Quantity</CTableHeaderCell>
                        <CTableHeaderCell>Unit</CTableHeaderCell>
                        <CTableHeaderCell>Variants</CTableHeaderCell>
                        <CTableHeaderCell>HSN Number</CTableHeaderCell>
                        <CTableHeaderCell>GST %</CTableHeaderCell>
                        <CTableHeaderCell>Description</CTableHeaderCell>
                        <CTableHeaderCell>Remark</CTableHeaderCell>
                        <CTableHeaderCell>Images</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {products.map((p, index) => (
                        <CTableRow key={index}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell>
                            {p.productName || "–"}
                          </CTableDataCell>
                          <CTableDataCell className="small text-break">
                            {resolveGroupName(p.groupId)}
                          </CTableDataCell>
                          <CTableDataCell className="small text-break">
                            {resolveCategoryName(p.categoryId)}
                          </CTableDataCell>
                          <CTableDataCell>{p.quantity ?? "–"}</CTableDataCell>
                          <CTableDataCell>{p.unit || "–"}</CTableDataCell>
                          <CTableDataCell>
                            {(p.variants || []).length > 0
                              ? (p.variants || [])
                                  .map((v) => v.variantName || "–")
                                  .join(", ")
                              : "–"}
                          </CTableDataCell>
                          <CTableDataCell className="small">
                            {p.hsnNumber || "–"}
                          </CTableDataCell>
                          <CTableDataCell className="small">
                            {typeof p.gstPercentage === "number"
                              ? `${p.gstPercentage}%`
                              : "–"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {(p.description || "").slice(0, 80)}
                            {(p.description || "").length > 80 ? "…" : ""}
                          </CTableDataCell>
                          <CTableDataCell>
                            {(p.remark || "").slice(0, 80)}
                            {(p.remark || "").length > 80 ? "…" : ""}
                          </CTableDataCell>
                          <CTableDataCell>
                            {renderProductImagesCell(p)}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>

            <div className="d-flex justify-content-between mb-4">
              <CButton
                color="secondary"
                type="button"
                onClick={() => goToStep(2)}
              >
                Back to Products
              </CButton>
            </div>
          </>
        )}

        <CCard className="mb-4">
          <CCardBody className="d-flex justify-content-end gap-2">
            <CButton color="secondary" type="button" onClick={handleCancel}>
              Cancel
            </CButton>
            {currentStep === 3 && (
              <CButton color="primary" type="submit" disabled={submitting}>
                {submitting && <CSpinner size="sm" className="me-2" />}
                {isEdit ? "Update Query" : "Save Query"}
              </CButton>
            )}
          </CCardBody>
        </CCard>
      </CForm>

      <QueryNewProductFindSidebar
        isOpen={findProductSidebarOpen}
        onToggle={() => setFindProductSidebarOpen((v) => !v)}
        showFloatingToggle={false}
        onSelectProduct={(p) => {
          applyQueryNewProductFromLibrary(p);
          setFindProductSidebarOpen(false);
        }}
      />

      <CModal
        visible={imagesModal.visible}
        onClose={() => setImagesModal({ visible: false, images: [] })}
        size="lg"
      >
        <CModalHeader closeButton>
          <CModalTitle>Product Images</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {imagesModal.images.length === 0 ? (
            <p className="text-muted mb-0">No images available.</p>
          ) : (
            <div className="d-flex flex-wrap gap-3 justify-content-start">
              {imagesModal.images.map((path, idx) => (
                <div
                  key={`${path}-${idx}`}
                  className="border rounded p-1 bg-white"
                  style={{ maxWidth: 200 }}
                >
                  <CImage
                    src={getAssetsUrl(path)}
                    alt={`Product ${idx + 1}`}
                    className="w-100"
                    style={{ objectFit: "contain", maxHeight: 200 }}
                  />
                </div>
              ))}
            </div>
          )}
        </CModalBody>
      </CModal>
    </>
  );
};

export default QueryForm;
