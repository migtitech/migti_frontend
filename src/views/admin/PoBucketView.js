import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Separator,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "../../components/ui";
import { getAssetsUrl } from "../../api/endpoints";
import purchaseOrderService from "../../services/purchaseOrderService";
import quotationService from "../../services/quotationService";
import productService from "../../services/productService";
import SalesOrderComparison, {
  matchQuotationLine,
} from "./poBucket/SalesOrderComparison";
import ProductDetailModal from "./poBucket/ProductDetailModal";
import documentService from "../../services/documentService";
import employeeService from "../../services/employeeService";
import areaService from "../../services/areaService";
import {
  BackButton,
  GstRateSelect,
  Loader,
  PageHeader,
} from "../../components";
import AuthImage from "../../components/AuthImage/AuthImage";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateMediumFormatter } from "../../utils/dateFormatter";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole, isBackOfficeRole } from "../../hooks/usePermissions";

/** `status` on `po_products` (read-only here; not stored on purchase order) */
const lineInventoryStatusBadge = (inv) => {
  const s = String(inv || "pending");
  switch (s) {
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "billing_request_raised":
      return <Badge variant="info">BR Raised</Badge>;
    case "finance_approved":
      return <Badge variant="success">Finance Approved</Badge>;
    case "purchased":
      return <Badge variant="info">Purchased</Badge>;
    case "inventory_received":
      return <Badge variant="success">Received</Badge>;
    case "ready_for_dispatchment":
      return <Badge variant="default">Ready dispatch</Badge>;
    case "po_closed":
      return <Badge variant="secondary">Sales Order closed</Badge>;
    default:
      return <Badge variant="secondary">{s}</Badge>;
  }
};

const PRODUCT_PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const normalizeProductPriority = (value) => {
  const allowed = PRODUCT_PRIORITY_OPTIONS.map((o) => o.value);
  const s = String(value || "")
    .toLowerCase()
    .trim();
  return allowed.includes(s) ? s : "medium";
};

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/** PO bucket HOD Approve: visible only for Head of Department (not legacy `hod`). */
const isHeadOfDepartmentRole = (role) => {
  const r = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return r === "head_of_department";
};

/** Product list Actions + Add New Product: HOD only (head_of_department or legacy `hod`). */
const isHodRole = (role) => {
  const r = normalizeRole(role);
  return r === "head_of_department" || r === "hod";
};

const normalizeDocId = (value) => {
  if (value == null) return "";
  if (typeof value === "object" && value._id != null) {
    const s = String(value._id);
    return OBJECT_ID_RE.test(s) ? s : "";
  }
  const s = String(value).trim();
  return OBJECT_ID_RE.test(s) ? s : "";
};

const isImageMime = (mime) => !!mime && /^image\//i.test(String(mime));

const openPoLineDocument = (doc) => {
  const path = doc?.path || "";
  if (!path) return;
  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : getAssetsUrl(path);
  window.open(url, "_blank", "noopener");
};

/** Thumbnail + open link for po_product line documents (image / payment / receiving proof). */
const renderPoLineDocumentCell = (doc) => {
  if (!doc || !doc._id) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const path = doc.path || "";
  const looksLikeImagePath = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(path);
  const showThumb = isImageMime(doc.mimeType) || looksLikeImagePath;
  return (
    <div className="flex flex-col items-start gap-1 py-1">
      {showThumb ? (
        <AuthImage
          documentId={String(doc._id)}
          fallbackUrl={path ? getAssetsUrl(path) : ""}
          alt=""
          className="rounded border border-border bg-muted"
          style={{ width: 52, height: 52, objectFit: "cover" }}
        />
      ) : null}
      <Button
        variant="link"
        type="button"
        className="h-auto whitespace-nowrap p-0 text-sm"
        disabled={!path}
        onClick={() => openPoLineDocument(doc)}
      >
        Open
      </Button>
    </div>
  );
};

const emptyProduct = {
  productName: "",
  description: "",
  quantity: 1,
  unit: "",
  dispatchmentDate: "",
  gstPercentage: "",
  remark: "",
  rate: "",
  priority: "medium",
  product_id: null,
  images: [],
  hsnNumber: "",
  modelNumber: "",
  applyDiscount: false,
  discountPercentage: "",
};

const applyCatalogProductToNewForm = (product, setNewProductForm) => {
  if (!product) return;
  const imageDocs = (product.images || [])
    .map((img) => {
      if (typeof img === "object" && img?._id) {
        return { _id: img._id, path: img.path || "" };
      }
      if (typeof img === "string" && OBJECT_ID_RE.test(img)) {
        return { _id: img, path: "" };
      }
      return null;
    })
    .filter(Boolean);

  setNewProductForm({
    ...emptyProduct,
    productName: product.name || "",
    description: product.shortDescription || product.description || "",
    quantity: 1,
    unit: (product.unit && String(product.unit).trim()) || "",
    rate:
      product.price != null && !Number.isNaN(Number(product.price))
        ? String(product.price)
        : "",
    gstPercentage:
      product.gstPercentage != null &&
      !Number.isNaN(Number(product.gstPercentage))
        ? String(product.gstPercentage)
        : "",
    product_id: product._id || product.id || null,
    images: imageDocs,
    hsnNumber: product.hsnNumber || "",
    modelNumber: product.defaultModelNumber || product.modelNumber || "",
  });
};

const getTodayInputDate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** Dispatchment may be today or any future calendar day (YYYY-MM-DD string compare). */
const isTodayOrFutureDispatchDate = (value) => {
  if (!value) return true;
  return value >= getTodayInputDate();
};

const formatDispatchmentDateDisplay = (value) => {
  if (!value) return "—";
  const datePart = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "—";
  const parsed = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return datePart;
  return dateMediumFormatter(parsed);
};

const buildDispatchmentDateByLineIndex = (poProductLines) => {
  const map = new Map();
  (poProductLines || []).forEach((row) => {
    if (row?.dispatchmentDate) {
      map.set(Number(row.lineIndex), String(row.dispatchmentDate).slice(0, 10));
    }
  });
  return map;
};

const mapProductsFormFromPo = (products, poProductLines) => {
  const dispatchmentByLineIndex =
    buildDispatchmentDateByLineIndex(poProductLines);
  return Array.isArray(products)
    ? products.map((product, index) => {
        const editable = toEditableProduct(product);
        const dispatchmentFromPoProduct = dispatchmentByLineIndex.get(index);
        if (dispatchmentFromPoProduct) {
          editable.dispatchmentDate = dispatchmentFromPoProduct;
        }
        return editable;
      })
    : [];
};

/** When `companyInfo.area` is an ObjectId, we show the zone (area) name but save the id if unchanged. */
const emptyCompanyAreaMeta = () => ({ areaId: "", resolvedName: "" });

const toNumberOrNull = (value) => {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const getProductTotal = (product) => {
  const qty = Number(product?.quantity) || 0;
  const rate = Number(product?.rate) || 0;
  const beforeDiscount = qty * rate;
  const discount =
    product?.applyDiscount && product?.discountPercentage !== ""
      ? (beforeDiscount * Number(product.discountPercentage || 0)) / 100
      : 0;

  return Math.max(0, beforeDiscount - discount);
};

const toProductPayload = (p) => {
  const quantity = Number(p.quantity);
  const rate = toNumberOrNull(p.rate);
  const gst = toNumberOrNull(p.gstPercentage);
  const discountPct = p.applyDiscount
    ? toNumberOrNull(p.discountPercentage)
    : null;
  const beforeDiscount =
    (Number.isNaN(quantity) ? 0 : Math.max(0, quantity)) * (rate || 0);
  const discountAmount =
    p.applyDiscount && discountPct != null
      ? Math.max(0, beforeDiscount * (discountPct / 100))
      : null;
  const imageIds = Array.isArray(p.images)
    ? p.images
        .map((img) => {
          if (img && typeof img === "object" && img._id) return String(img._id);
          if (typeof img === "string" && OBJECT_ID_RE.test(img)) return img;
          return null;
        })
        .filter(Boolean)
    : [];
  return {
    productName: String(p.productName || "").trim(),
    description: String(p.description || ""),
    quantity: Number.isNaN(quantity) ? 0 : Math.max(0, quantity),
    unit: String(p.unit || ""),
    hsnNumber: String(p.hsnNumber || ""),
    modelNumber: String(p.modelNumber || ""),
    dispatchmentDate: p.dispatchmentDate || null,
    gstPercentage: gst,
    variants: Array.isArray(p.variants) ? p.variants : [],
    remark: String(p.remark || ""),
    product_id:
      p.product_id && typeof p.product_id === "object"
        ? String(p.product_id._id || "")
        : p.product_id || null,
    rate,
    images: imageIds,
    applyDiscount: !!p.applyDiscount,
    discountPercentage: discountPct,
    discountAmount,
    notAvailable: !!p.notAvailable,
    notAvailableRemark: String(p.notAvailableRemark || ""),
    priority: normalizeProductPriority(p.priority),
  };
};

const toEditableProduct = (p) => ({
  ...p,
  quantity: p.quantity ?? 1,
  gstPercentage: p.gstPercentage ?? "",
  rate: p.rate ?? "",
  discountPercentage: p.discountPercentage ?? "",
  applyDiscount: !!p.applyDiscount,
  dispatchmentDate: p.dispatchmentDate
    ? String(p.dispatchmentDate).slice(0, 10)
    : "",
  priority: normalizeProductPriority(p.priority),
});

const poAttachmentStateFromPo = (data) => {
  const att = data?.attachmentDocumentId;
  if (att && typeof att === "object" && att._id) {
    return {
      documentId: String(att._id),
      meta: {
        path: att.path || "",
        mimeType: att.mimeType || "",
        originalName: att.originalName || "",
      },
    };
  }
  return { documentId: "", meta: null };
};

const PoBucketView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProducts, setSavingProducts] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [poProductLineStatuses, setPoProductLineStatuses] = useState([]);
  const [quotation, setQuotation] = useState(null);
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState(null);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    area: "",
    location: "",
    address: "",
    purchaseManagerName: "",
    purchaseManagerPhone: "",
    purchaseManagerEmail: "",
  });
  const [productsForm, setProductsForm] = useState([]);
  const [newProductForm, setNewProductForm] = useState(emptyProduct);
  const [addProductSidebarOpen, setAddProductSidebarOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [dispatchmentDateForAll, setDispatchmentDateForAll] = useState("");
  const [poAttachment, setPoAttachment] = useState({
    documentId: "",
    meta: null,
  });
  const [savingPoAttachment, setSavingPoAttachment] = useState(false);
  const [poAttachmentUploading, setPoAttachmentUploading] = useState(false);
  /** `po_products` lines from API (read-only) */
  const [poProductStatusBundle, setPoProductStatusBundle] = useState(null);
  const [poProductStatusLoading, setPoProductStatusLoading] = useState(false);
  const [assignEmployeeOptions, setAssignEmployeeOptions] = useState([]);
  const [assignEmployeesLoading, setAssignEmployeesLoading] = useState(false);
  const [assignSelectValue, setAssignSelectValue] = useState("");
  const [savingAssignedEmployee, setSavingAssignedEmployee] = useState(false);
  const [hodApproving, setHodApproving] = useState(false);
  const companyAreaMetaRef = useRef(emptyCompanyAreaMeta());
  const poId = purchaseOrder?._id || purchaseOrder?.id;
  const quotationId = useMemo(() => {
    const q = purchaseOrder?.quotationId;
    if (!q) return "";
    if (typeof q === "object") return String(q._id || q.id || "");
    return String(q);
  }, [purchaseOrder?.quotationId]);
  const poClosed =
    String(purchaseOrder?.status || "").toLowerCase() === "closed";
  const headOfDepartmentUser = isHeadOfDepartmentRole(user?.role);
  const canManageProductList = isHodRole(user?.role);
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
  const canEditProductPriority = !isSalesRole && !isBackOfficeRole(user?.role);
  const companyInfoReadOnly = true;
  const poStatusNorm = String(purchaseOrder?.status || "").toLowerCase();
  const poHodApproved = poStatusNorm === "hod_approved";
  const canShowHodApprove =
    headOfDepartmentUser &&
    poId &&
    !poClosed &&
    !poHodApproved &&
    poStatusNorm !== "cancelled";

  const serverAttachmentId = useMemo(
    () => normalizeDocId(purchaseOrder?.attachmentDocumentId),
    [purchaseOrder?.attachmentDocumentId],
  );
  const localAttachmentId = useMemo(
    () => normalizeDocId(poAttachment?.documentId),
    [poAttachment?.documentId],
  );
  const poAttachmentIsDirty = localAttachmentId !== serverAttachmentId;
  const poAttachmentActionsLocked =
    savingPoAttachment || poAttachmentUploading || poClosed;
  const canSavePoAttachment = poAttachmentIsDirty && !poAttachmentActionsLocked;
  const canUploadPoAttachment =
    !localAttachmentId && !poAttachmentActionsLocked;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await purchaseOrderService.getById(id);
        const data = res?.data?.data ?? res?.data ?? res;
        if (cancelled) return;
        setPurchaseOrder(data || null);
        setPoAttachment(poAttachmentStateFromPo(data));
        const ci = data?.companyInfo || {};
        const pm = Array.isArray(ci.purchaseManagers)
          ? ci.purchaseManagers[0] || {}
          : {};
        const rawArea = String(ci.area ?? "").trim();
        const areaIsObjectId = OBJECT_ID_RE.test(rawArea);
        companyAreaMetaRef.current = emptyCompanyAreaMeta();
        setCompanyForm({
          name: ci.name || "",
          area: areaIsObjectId ? "" : rawArea,
          location: ci.location || "",
          address: ci.address || "",
          purchaseManagerName: pm.name || "",
          purchaseManagerPhone: pm.phone || "",
          purchaseManagerEmail: pm.email || "",
        });
        if (areaIsObjectId) {
          companyAreaMetaRef.current = {
            areaId: rawArea,
            resolvedName: "",
          };
          try {
            const areaRes = await areaService.getById(rawArea);
            const a = areaRes?.data?.data ?? areaRes?.data ?? areaRes ?? null;
            const zoneName = String(a?.name ?? "").trim();
            if (!cancelled) {
              companyAreaMetaRef.current = {
                areaId: rawArea,
                resolvedName: zoneName,
              };
              setCompanyForm((prev) => ({
                ...prev,
                area: zoneName || "",
              }));
            }
          } catch {
            if (!cancelled) {
              companyAreaMetaRef.current = emptyCompanyAreaMeta();
              setCompanyForm((prev) => ({
                ...prev,
                area: "",
              }));
            }
          }
        }
        setProductsForm(
          mapProductsFormFromPo(data?.products, data?.poProductLineStatuses),
        );
        setPoProductLineStatuses(
          Array.isArray(data?.poProductLineStatuses)
            ? data.poProductLineStatuses
            : [],
        );
        const ae = data?.assigned_employee;
        const aid = ae?._id != null ? String(ae._id) : "";
        setAssignSelectValue(aid);
      } catch (err) {
        if (!cancelled) {
          toastError(err?.message || "Failed to load sales order");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load the originating quotation for the comparison view.
  useEffect(() => {
    if (!quotationId) {
      setQuotation(null);
      return undefined;
    }
    let cancelled = false;
    setQuotationLoading(true);
    (async () => {
      try {
        const res = await quotationService.getById(quotationId);
        const data = res?.data?.data ?? res?.data ?? res;
        if (!cancelled) setQuotation(data || null);
      } catch (err) {
        if (!cancelled) {
          toastError(err?.message || "Failed to load quotation for comparison");
          setQuotation(null);
        }
      } finally {
        if (!cancelled) setQuotationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quotationId]);

  useEffect(() => {
    if (!addProductSidebarOpen) return undefined;
    const query = productSearchQuery.trim();
    if (query.length < 2) {
      setProductSearchResults([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setProductSearchLoading(true);
      try {
        const res = await productService.getAll({
          pageNumber: 1,
          pageSize: 20,
          status: "hod_approved",
          search: query,
        });
        const inner = res?.data ?? res;
        const products = inner?.data?.products || inner?.products || [];
        if (!cancelled) setProductSearchResults(products);
      } catch {
        if (!cancelled) setProductSearchResults([]);
      } finally {
        if (!cancelled) setProductSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [productSearchQuery, addProductSidebarOpen]);

  const openAddProductSidebar = () => {
    setNewProductForm(emptyProduct);
    setProductSearchQuery("");
    setProductSearchResults([]);
    setAddProductSidebarOpen(true);
  };

  const closeAddProductSidebar = () => {
    setAddProductSidebarOpen(false);
    setProductSearchQuery("");
    setProductSearchResults([]);
  };

  const handleSelectCatalogProduct = async (productSummary) => {
    const productId = productSummary?._id || productSummary?.id;
    if (!productId) return;
    try {
      const res = await productService.getById(productId);
      const product = res?.data?.data ?? res?.data ?? res;
      applyCatalogProductToNewForm(product, setNewProductForm);
      setProductSearchQuery(product?.name || productSummary?.name || "");
      setProductSearchResults([]);
      toastSuccess("Product details loaded");
    } catch (err) {
      toastError(err?.message || "Failed to load product");
    }
  };

  const totalAmount = useMemo(
    () => productsForm.reduce((sum, p) => sum + getProductTotal(p), 0),
    [productsForm],
  );

  /** po_product line docs keyed by lineIndex (for id + status in the detail modal). */
  const poLineByIndex = useMemo(() => {
    const m = new Map();
    const lines = poProductStatusBundle?.lines;
    if (Array.isArray(lines)) {
      lines.forEach((line, i) => {
        const key = line?.lineIndex != null ? Number(line.lineIndex) : i;
        m.set(key, line);
      });
    }
    return m;
  }, [poProductStatusBundle]);

  const openProductModal = (index) => setProductModalIndex(index);
  const closeProductModal = () => setProductModalIndex(null);

  const modalSoProduct =
    productModalIndex != null ? productsForm[productModalIndex] : null;
  const modalQuotationProduct = useMemo(() => {
    if (!modalSoProduct) return null;
    return matchQuotationLine(
      modalSoProduct,
      Array.isArray(quotation?.products) ? quotation.products : [],
    );
  }, [modalSoProduct, quotation]);

  const lineInventoryByIndex = useMemo(() => {
    const m = new Map();
    (poProductLineStatuses || []).forEach((row) => {
      const s = row.status ?? row.inventoryStatus;
      m.set(Number(row.lineIndex), String(s || "pending"));
    });
    return m;
  }, [poProductLineStatuses]);

  const dispatchmentDateByLineIndex = useMemo(
    () => buildDispatchmentDateByLineIndex(poProductLineStatuses),
    [poProductLineStatuses],
  );

  const allLinesHavePoDispatchDate =
    productsForm.length > 0 &&
    productsForm.every((_, index) => dispatchmentDateByLineIndex.has(index));

  const loadPoProductStatusLines = useCallback(async () => {
    if (!id) {
      setPoProductStatusBundle(null);
      return;
    }
    setPoProductStatusLoading(true);
    try {
      const res = await purchaseOrderService.listPoProductLines({
        purchaseOrderId: id,
      });
      const bundle = res?.data?.data ?? res?.data ?? res;
      setPoProductStatusBundle(
        bundle && typeof bundle === "object" && Array.isArray(bundle.lines)
          ? bundle
          : null,
      );
    } catch (err) {
      toastError(err?.message || "Failed to load product status from server");
      setPoProductStatusBundle(null);
    } finally {
      setPoProductStatusLoading(false);
    }
  }, [id]);

  const refreshAfterUpdate = async () => {
    const res = await purchaseOrderService.getById(id);
    const data = res?.data?.data ?? res?.data ?? res;
    setPurchaseOrder(data || null);
    setPoProductLineStatuses(
      Array.isArray(data?.poProductLineStatuses)
        ? data.poProductLineStatuses
        : [],
    );
    setPoAttachment(poAttachmentStateFromPo(data));
    setProductsForm(
      mapProductsFormFromPo(data?.products, data?.poProductLineStatuses),
    );
    const ae = data?.assigned_employee;
    setAssignSelectValue(ae?._id != null ? String(ae._id) : "");
    await loadPoProductStatusLines();
  };

  const handleHodApprove = async () => {
    if (!poId || !canShowHodApprove) return;
    setHodApproving(true);
    try {
      await purchaseOrderService.hodApprove(poId);
      toastSuccess("Sales order marked HOD approved");
      await refreshAfterUpdate();
    } catch (err) {
      toastError(err?.message || "HOD approve failed");
    } finally {
      setHodApproving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadEmployees = async () => {
      setAssignEmployeesLoading(true);
      try {
        const merged = [];
        let page = 1;
        let hasNext = true;
        while (hasNext && page <= 40) {
          const res = await employeeService.getAll({
            pageNumber: page,
            pageSize: 100,
            roleKeywords: "sales,hod",
          });
          const payload = res?.data?.data ?? res?.data ?? res;
          const batch = payload?.employees ?? [];
          merged.push(...batch);
          hasNext = !!payload?.pagination?.hasNextPage;
          page += 1;
        }
        if (!cancelled) setAssignEmployeeOptions(merged);
      } catch (err) {
        if (!cancelled) {
          toastError(err?.message || "Failed to load employees");
          setAssignEmployeeOptions([]);
        }
      } finally {
        if (!cancelled) setAssignEmployeesLoading(false);
      }
    };
    loadEmployees();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAssignEmployeePayload = useMemo(() => {
    if (!assignSelectValue) return null;
    const found = assignEmployeeOptions.find(
      (e) => String(e?._id || e?.id) === assignSelectValue,
    );
    if (found) {
      const { password: _p, ...rest } = found;
      return rest;
    }
    const snap = purchaseOrder?.assigned_employee;
    if (snap && String(snap._id || "") === assignSelectValue) {
      const { password: _p, ...rest } = snap;
      return rest;
    }
    return null;
  }, [
    assignSelectValue,
    assignEmployeeOptions,
    purchaseOrder?.assigned_employee,
  ]);

  const assignEmployeeDirty = useMemo(() => {
    const cur = purchaseOrder?.assigned_employee;
    const curId = cur?._id != null ? String(cur._id) : "";
    return String(assignSelectValue || "") !== curId;
  }, [assignSelectValue, purchaseOrder?.assigned_employee]);

  const saveAssignedEmployee = async () => {
    if (poClosed) {
      toastError("This sales order is closed and cannot be edited.");
      return;
    }
    if (!poId) {
      toastError("Sales order id not found");
      return;
    }
    if (assignSelectValue && !selectedAssignEmployeePayload) {
      toastError(
        "Could not resolve employee details. Reload the page and try again.",
      );
      return;
    }
    setSavingAssignedEmployee(true);
    try {
      await purchaseOrderService.update(poId, {
        assigned_employee: assignSelectValue
          ? selectedAssignEmployeePayload
          : null,
      });
      toastSuccess(
        assignSelectValue ? "Assigned employee saved" : "Assignment cleared",
      );
      await refreshAfterUpdate();
    } catch (err) {
      toastError(err?.message || "Failed to save assignment");
    } finally {
      setSavingAssignedEmployee(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void loadPoProductStatusLines();
  }, [id, loadPoProductStatusLines]);

  const saveProducts = async (
    nextProducts,
    successMessage = "Product list updated",
  ) => {
    if (poClosed) {
      toastError("This sales order is closed and cannot be edited.");
      return;
    }
    if (!poId) {
      toastError("Sales order id not found");
      return;
    }
    setSavingProducts(true);
    try {
      const payloadProducts = nextProducts.map(toProductPayload);
      await purchaseOrderService.update(poId, {
        products: payloadProducts,
      });
      toastSuccess(successMessage);
      await refreshAfterUpdate();
    } catch (err) {
      toastError(err?.message || "Failed to update product list");
    } finally {
      setSavingProducts(false);
    }
  };

  const updateProductField = (index, field, value) => {
    if (poClosed) return;
    setProductsForm((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const removeProduct = async (index) => {
    const next = productsForm.filter((_, i) => i !== index);
    await saveProducts(next, "Product deleted");
  };

  const updateSingleProduct = async (index) => {
    const row = productsForm[index];
    if (!row) return;
    if (!String(row.productName || "").trim()) {
      toastError("Product name is required");
      return;
    }
    if (
      !dispatchmentDateByLineIndex.has(index) &&
      !isTodayOrFutureDispatchDate(row.dispatchmentDate)
    ) {
      toastError("Dispatch date must be today or a future date");
      return;
    }
    await saveProducts(productsForm, "Product updated");
  };

  const applyDispatchmentDateToAll = () => {
    if (poClosed) return;
    if (!dispatchmentDateForAll) {
      setProductsForm((prev) =>
        prev.map((product, index) =>
          dispatchmentDateByLineIndex.has(index)
            ? product
            : { ...product, dispatchmentDate: "" },
        ),
      );
      return;
    }
    if (!isTodayOrFutureDispatchDate(dispatchmentDateForAll)) {
      toastError("Dispatch date must be today or a future date");
      return;
    }
    setProductsForm((prev) =>
      prev.map((product, index) => {
        if (dispatchmentDateByLineIndex.has(index)) {
          return product;
        }
        return { ...product, dispatchmentDate: dispatchmentDateForAll };
      }),
    );
  };

  const savePriorities = async () => {
    await saveProducts(productsForm, "Priorities saved");
  };

  const openPoAttachment = (meta) => {
    const raw = meta?.path;
    const url =
      raw && (raw.startsWith("http://") || raw.startsWith("https://"))
        ? raw
        : raw
          ? getAssetsUrl(raw)
          : "";
    if (!url) {
      toastError("File link unavailable.");
      return;
    }
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      toastError("Pop-up blocked. Allow pop-ups to open the file.");
    }
  };

  const onPoDocumentFile = async (e) => {
    if (poClosed) return;
    const input = e?.target;
    const file = input?.files?.[0];
    if (input) input.value = "";
    if (!file) return;
    setPoAttachmentUploading(true);
    try {
      const res = await documentService.uploadAttachments([file]);
      const payload = res?.data || res;
      const docs = payload?.data?.documents || payload?.documents || [];
      const first = docs[0];
      const docId = first?._id || first?.id;
      if (!docId) {
        toastError("Upload failed");
        return;
      }
      setPoAttachment({
        documentId: String(docId),
        meta: {
          path: first?.path || "",
          mimeType: first?.mimeType || file.type || "",
          originalName: first?.originalName || file.name || "",
        },
      });
      toastSuccess("File uploaded — save to store on this sales order");
    } catch (err) {
      toastError(err?.message || "Failed to upload attachment");
    } finally {
      setPoAttachmentUploading(false);
    }
  };

  const clearPoAttachment = () => {
    if (poClosed) return;
    setPoAttachment({ documentId: "", meta: null });
  };

  const savePoAttachment = async () => {
    if (poClosed) {
      toastError("This sales order is closed and cannot be edited.");
      return;
    }
    if (!poId) {
      toastError("Sales order id not found");
      return;
    }
    setSavingPoAttachment(true);
    try {
      const attachmentDocumentId =
        poAttachment.documentId && OBJECT_ID_RE.test(poAttachment.documentId)
          ? poAttachment.documentId
          : null;
      await purchaseOrderService.update(poId, { attachmentDocumentId });
      toastSuccess("Attachment saved");
      await refreshAfterUpdate();
    } catch (err) {
      toastError(err?.message || "Failed to save attachment");
    } finally {
      setSavingPoAttachment(false);
    }
  };

  const addNewProduct = async () => {
    if (poClosed) {
      toastError("This sales order is closed and cannot be edited.");
      return;
    }
    if (!String(newProductForm.productName || "").trim()) {
      toastError("Product name is required");
      return;
    }
    const qty = Number(newProductForm.quantity);
    if (newProductForm.quantity === "" || Number.isNaN(qty) || qty <= 0) {
      toastError("Quantity is required and must be greater than 0");
      return;
    }
    const rate = Number(newProductForm.rate);
    if (newProductForm.rate === "" || Number.isNaN(rate) || rate <= 0) {
      toastError("Rate is required and must be greater than 0");
      return;
    }
    if (!isTodayOrFutureDispatchDate(newProductForm.dispatchmentDate)) {
      toastError("Dispatch date must be today or a future date");
      return;
    }
    const next = [...productsForm, toEditableProduct(newProductForm)];
    setNewProductForm(emptyProduct);
    await saveProducts(next);
    closeAddProductSidebar();
  };

  if (loading) {
    return <Loader />;
  }

  if (!purchaseOrder) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Sales order not found</h4>
          <Button type="button" onClick={() => navigate("/po-bucket")}>
            Back to Sales Orders
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <BackButton fallback="/po-bucket" />
      </div>

      <PageHeader title={purchaseOrder.poCode || "Sales Order"} />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Sales Order Details</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {poHodApproved ? (
              <Badge variant="success">HOD approved</Badge>
            ) : null}
            {canShowHodApprove ? (
              <Button
                type="button"
                size="sm"
                disabled={hodApproving}
                onClick={() => void handleHodApprove()}
              >
                {hodApproving ? "Approving…" : "HOD Approve"}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {poClosed ? (
            <Alert className="mb-3">
              <AlertDescription>
                This sales order is <strong>closed</strong>. Editing is
                disabled.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-8">
            <section className="scroll-mt-4">
              <h5 className="mb-3 text-lg font-semibold">
                Quotation vs Sales Order
              </h5>
              <Alert variant="info" className="mb-3">
                <AlertDescription>
                  Side-by-side of what was quoted vs this sales order. Click any
                  product to see full details, margin, supplier rates, and to
                  assign it for procurement.
                </AlertDescription>
              </Alert>
              <SalesOrderComparison
                quotation={quotation}
                quotationLoading={quotationLoading}
                products={productsForm}
                onOpenProduct={openProductModal}
              />
            </section>

            <Separator />

            <section className="scroll-mt-4">
              <h5 className="mb-3 text-lg font-semibold">
                Company Information
              </h5>
              <Alert variant="info" className="mb-3">
                <AlertDescription>
                  Company information is view-only.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={companyForm.name}
                    readOnly={companyInfoReadOnly}
                    disabled={companyInfoReadOnly}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Area</Label>
                  <Input
                    value={companyForm.area}
                    readOnly={companyInfoReadOnly}
                    disabled={companyInfoReadOnly}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        area: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    value={companyForm.location}
                    readOnly={companyInfoReadOnly}
                    disabled={companyInfoReadOnly}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={companyForm.address}
                    readOnly={companyInfoReadOnly}
                    disabled={companyInfoReadOnly}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Purchase Manager Name</Label>
                  <Input
                    value={companyForm.purchaseManagerName}
                    readOnly={companyInfoReadOnly}
                    disabled={companyInfoReadOnly}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        purchaseManagerName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Manager Phone</Label>
                  <Input
                    value={companyForm.purchaseManagerPhone}
                    readOnly={companyInfoReadOnly}
                    disabled={companyInfoReadOnly}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        purchaseManagerPhone: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Manager Email</Label>
                  <Input
                    type="email"
                    value={companyForm.purchaseManagerEmail}
                    readOnly={companyInfoReadOnly}
                    disabled={companyInfoReadOnly}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        purchaseManagerEmail: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section className="scroll-mt-4">
              <h5 className="mb-3 text-lg font-semibold">Product List</h5>
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 rounded-t-xl bg-muted/50">
                  <CardTitle>Product List</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <span className="whitespace-nowrap rounded border border-border bg-background px-2 py-1 text-sm font-semibold text-muted-foreground">
                      Total: {productsForm.length}
                    </span>
                    <Badge className="px-2 py-1">
                      Total Amount: ₹
                      {Number(totalAmount || 0).toLocaleString("en-IN")}
                    </Badge>
                    {!allLinesHavePoDispatchDate ? (
                      <>
                        <Input
                          type="date"
                          min={getTodayInputDate()}
                          value={dispatchmentDateForAll}
                          readOnly={poClosed}
                          disabled={poClosed}
                          onChange={(e) =>
                            setDispatchmentDateForAll(e.target.value)
                          }
                          placeholder="Dispatch date"
                          className="h-8 w-auto min-w-[170px] text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={poClosed}
                          onClick={applyDispatchmentDateToAll}
                        >
                          Set for all
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Line status</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="min-w-[110px]">GST %</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Dispatch Date</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Remark</TableHead>
                        {canManageProductList ? (
                          <TableHead>Actions</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsForm.map((p, index) => (
                        <TableRow key={p._id || index}>
                          <TableCell className="font-semibold">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Input
                                className="h-8 text-sm"
                                value={p.productName || ""}
                                readOnly={poClosed}
                                onChange={(e) =>
                                  updateProductField(
                                    index,
                                    "productName",
                                    e.target.value,
                                  )
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 whitespace-nowrap px-2 text-xs"
                                title="View full details"
                                onClick={() => openProductModal(index)}
                              >
                                Details
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {lineInventoryByIndex.has(index) ? (
                              lineInventoryStatusBadge(
                                lineInventoryByIndex.get(index),
                              )
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-sm"
                              type="number"
                              min={0}
                              value={p.quantity}
                              readOnly={poClosed}
                              onChange={(e) =>
                                updateProductField(
                                  index,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <GstRateSelect
                              selectClassName="h-8 text-sm"
                              value={p.gstPercentage}
                              disabled={poClosed}
                              onChange={(e) =>
                                updateProductField(
                                  index,
                                  "gstPercentage",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-sm"
                              type="number"
                              min={0}
                              value={p.rate}
                              readOnly={poClosed}
                              onChange={(e) =>
                                updateProductField(
                                  index,
                                  "rate",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {dispatchmentDateByLineIndex.has(index) ? (
                              <span className="whitespace-nowrap text-sm font-semibold">
                                {formatDispatchmentDateDisplay(
                                  dispatchmentDateByLineIndex.get(index),
                                )}
                              </span>
                            ) : (
                              <Input
                                className="h-8 text-sm"
                                type="date"
                                min={getTodayInputDate()}
                                value={p.dispatchmentDate || ""}
                                readOnly={poClosed}
                                onChange={(e) =>
                                  updateProductField(
                                    index,
                                    "dispatchmentDate",
                                    e.target.value,
                                  )
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-semibold">
                            ₹{getProductTotal(p).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>
                            <Textarea
                              rows={1}
                              className="min-h-9 text-sm"
                              value={p.remark || ""}
                              readOnly={poClosed}
                              onChange={(e) =>
                                updateProductField(
                                  index,
                                  "remark",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                          {canManageProductList ? (
                            <TableCell className="whitespace-nowrap">
                              <Button
                                type="button"
                                size="sm"
                                className="mr-2"
                                onClick={() => updateSingleProduct(index)}
                                disabled={savingProducts || poClosed}
                              >
                                Update
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeProduct(index)}
                                disabled={savingProducts || poClosed}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            <Separator />

            <section className="scroll-mt-4">
              <h5 className="mb-3 text-lg font-semibold">Product Status</h5>
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 rounded-t-xl bg-muted/50">
                  <div>
                    <CardTitle>Sales Order product line status</CardTitle>
                    {purchaseOrder?.poCode && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        Sales Order: {purchaseOrder.poCode}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={poProductStatusLoading}
                    onClick={() => void loadPoProductStatusLines()}
                  >
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="pt-3">
                  {poProductStatusLoading ? (
                    <div className="flex items-center gap-2 py-4 text-muted-foreground">
                      <Spinner size="sm" />
                      <span>Loading from po_products…</span>
                    </div>
                  ) : !poProductStatusBundle ||
                    poProductStatusBundle.lines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No po_products rows for this sales order. Save the product
                      list or sync the Sales Order to generate lines.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Raw code</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Product image</TableHead>
                          {!isSalesRole ? (
                            <>
                              <TableHead>Payment proof</TableHead>
                              <TableHead>Receiving proof</TableHead>
                            </>
                          ) : null}
                          <TableHead>Status (po_product)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poProductStatusBundle.lines.map((row, i) => (
                          <TableRow
                            key={
                              row._id != null ? String(row._id) : `line-${i}`
                            }
                          >
                            <TableCell className="font-semibold">
                              {row.lineIndex != null
                                ? Number(row.lineIndex) + 1
                                : i + 1}
                            </TableCell>
                            <TableCell>{row.productName || "—"}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {row.rawProductCode || "—"}
                            </TableCell>
                            <TableCell>{row.quantity ?? "—"}</TableCell>
                            <TableCell>{row.unit || "—"}</TableCell>
                            <TableCell className="align-top">
                              {renderPoLineDocumentCell(
                                row.productImageDocument,
                              )}
                            </TableCell>
                            {!isSalesRole ? (
                              <>
                                <TableCell className="align-top">
                                  {renderPoLineDocumentCell(
                                    row.paymentProofDocument,
                                  )}
                                </TableCell>
                                <TableCell className="align-top">
                                  {renderPoLineDocumentCell(
                                    row.receivingProofDocument,
                                  )}
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell className="whitespace-nowrap">
                              {lineInventoryStatusBadge(row.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </CardContent>
      </Card>

      <ProductDetailModal
        open={productModalIndex != null}
        onClose={closeProductModal}
        quotationId={quotationId}
        soProduct={modalSoProduct}
        quotationProduct={modalQuotationProduct}
        poProductLine={
          productModalIndex != null
            ? poLineByIndex.get(productModalIndex)
            : null
        }
        purchaseOrder={purchaseOrder}
        totalCount={productsForm.length}
        position={productModalIndex != null ? productModalIndex + 1 : 0}
        onPrev={
          productModalIndex != null && productModalIndex > 0
            ? () => setProductModalIndex((i) => Math.max(0, i - 1))
            : null
        }
        onNext={
          productModalIndex != null &&
          productModalIndex < productsForm.length - 1
            ? () =>
                setProductModalIndex((i) =>
                  Math.min(productsForm.length - 1, i + 1),
                )
            : null
        }
      />
    </div>
  );
};

export default PoBucketView;
