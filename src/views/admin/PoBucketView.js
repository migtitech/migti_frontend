import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CTabContent,
  CTabPane,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CSpinner,
  CAlert,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilPlus, cilTrash, cilX } from "@coreui/icons";
import { getAssetsUrl } from "../../api/endpoints";
import purchaseOrderService from "../../services/purchaseOrderService";
import documentService from "../../services/documentService";
import employeeService from "../../services/employeeService";
import areaService from "../../services/areaService";
import { Loader } from "../../components";
import AuthImage from "../../components/AuthImage/AuthImage";
import { toastError, toastSuccess } from "../../utils/toast";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole } from "../../hooks/usePermissions";

/** `status` on `po_products` (read-only here; not stored on purchase order) */
const lineInventoryStatusBadge = (inv) => {
  const s = String(inv || "pending");
  switch (s) {
    case "pending":
      return <CBadge color="warning">Pending</CBadge>;
    case "inventory_received":
      return <CBadge color="success">Received</CBadge>;
    case "ready_for_dispatchment":
      return <CBadge color="primary">Ready dispatch</CBadge>;
    case "po_closed":
      return <CBadge color="dark">Sales Order closed</CBadge>;
    default:
      return <CBadge color="secondary">{s}</CBadge>;
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
    return <span className="text-body-secondary small">—</span>;
  }
  const path = doc.path || "";
  const looksLikeImagePath = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(path);
  const showThumb = isImageMime(doc.mimeType) || looksLikeImagePath;
  return (
    <div className="d-flex flex-column align-items-start gap-1 py-1">
      {showThumb ? (
        <AuthImage
          documentId={String(doc._id)}
          fallbackUrl={path ? getAssetsUrl(path) : ""}
          alt=""
          className="rounded border bg-light"
          style={{ width: 52, height: 52, objectFit: "cover" }}
        />
      ) : null}
      <CButton
        color="link"
        className="p-0 small align-baseline text-nowrap"
        disabled={!path}
        onClick={() => openPoLineDocument(doc)}
      >
        Open
      </CButton>
    </div>
  );
};

const emptyProduct = {
  productName: "",
  description: "",
  quantity: 1,
  unit: "",
  hsnNumber: "",
  modelNumber: "",
  dispatchmentDate: "",
  gstPercentage: "",
  remark: "",
  rate: "",
  applyDiscount: false,
  discountPercentage: "",
  priority: "medium",
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
  const [activeTab, setActiveTab] = useState("company");
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
  const poClosed =
    String(purchaseOrder?.status || "").toLowerCase() === "closed";
  const headOfDepartmentUser = isHeadOfDepartmentRole(user?.role);
  const canManageProductList = isHodRole(user?.role);
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
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
                area: zoneName || rawArea,
              }));
            }
          } catch {
            if (!cancelled) {
              companyAreaMetaRef.current = emptyCompanyAreaMeta();
              setCompanyForm((prev) => ({
                ...prev,
                area: rawArea,
              }));
            }
          }
        }
        setProductsForm(
          Array.isArray(data?.products)
            ? data.products.map(toEditableProduct)
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

  const totalAmount = useMemo(
    () => productsForm.reduce((sum, p) => sum + getProductTotal(p), 0),
    [productsForm],
  );

  const lineInventoryByIndex = useMemo(() => {
    const m = new Map();
    (poProductLineStatuses || []).forEach((row) => {
      const s = row.status ?? row.inventoryStatus;
      m.set(Number(row.lineIndex), String(s || "pending"));
    });
    return m;
  }, [poProductLineStatuses]);

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
      Array.isArray(data?.products) ? data.products.map(toEditableProduct) : [],
    );
    const ae = data?.assigned_employee;
    setAssignSelectValue(ae?._id != null ? String(ae._id) : "");
    if (activeTab === "productStatus") {
      await loadPoProductStatusLines();
    }
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
    if (activeTab !== "productStatus" || !id) return;
    void loadPoProductStatusLines();
  }, [activeTab, id, loadPoProductStatusLines]);

  useEffect(() => {
    if (isSalesRole && activeTab === "priority") {
      setActiveTab("company");
    }
  }, [isSalesRole, activeTab]);

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
    if (!isTodayOrFutureDispatchDate(row.dispatchmentDate)) {
      toastError("Dispatchment date must be today or a future date");
      return;
    }
    await saveProducts(productsForm, "Product updated");
  };

  const applyDispatchmentDateToAll = () => {
    if (poClosed) return;
    if (!dispatchmentDateForAll) {
      setProductsForm((prev) =>
        prev.map((p) => ({ ...p, dispatchmentDate: "" })),
      );
      return;
    }
    if (!isTodayOrFutureDispatchDate(dispatchmentDateForAll)) {
      toastError("Dispatchment date must be today or a future date");
      return;
    }
    setProductsForm((prev) =>
      prev.map((p) => ({ ...p, dispatchmentDate: dispatchmentDateForAll })),
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
      toastError("Dispatchment date must be today or a future date");
      return;
    }
    const next = [...productsForm, toEditableProduct(newProductForm)];
    setNewProductForm(emptyProduct);
    await saveProducts(next);
    setAddProductSidebarOpen(false);
  };

  if (loading) {
    return <Loader />;
  }

  if (!purchaseOrder) {
    return (
      <CCard>
        <CCardBody>Sales order not found.</CCardBody>
      </CCard>
    );
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="d-flex justify-content-between align-items-center">
            <div>
              <strong>{purchaseOrder.poCode || "Sales Order"}</strong>
            </div>
            <CButton
              color="secondary"
              variant="ghost"
              onClick={() => navigate("/po-bucket")}
            >
              <CIcon icon={cilArrowLeft} className="me-1" />
              Back
            </CButton>
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <strong>Sales Order Details</strong>
            <div className="d-flex flex-wrap align-items-center gap-2">
              {poHodApproved ? (
                <CBadge color="success">HOD approved</CBadge>
              ) : null}
              {canShowHodApprove ? (
                <CButton
                  color="success"
                  size="sm"
                  disabled={hodApproving}
                  onClick={() => void handleHodApprove()}
                >
                  {hodApproving ? "Approving…" : "HOD Approve"}
                </CButton>
              ) : null}
            </div>
          </CCardHeader>
          <CCardBody>
            {poClosed ? (
              <CAlert color="dark" className="mb-3">
                This sales order is <strong>closed</strong>. Editing is
                disabled.
              </CAlert>
            ) : null}
            <CNav variant="tabs" className="mb-3">
              <CNavItem>
                <CNavLink
                  active={activeTab === "company"}
                  onClick={() => setActiveTab("company")}
                  style={{ cursor: "pointer" }}
                >
                  Company Information
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === "products"}
                  onClick={() => setActiveTab("products")}
                  style={{ cursor: "pointer" }}
                >
                  Product List
                </CNavLink>
              </CNavItem>
              {!isSalesRole ? (
                <CNavItem>
                  <CNavLink
                    active={activeTab === "priority"}
                    onClick={() => setActiveTab("priority")}
                    style={{ cursor: "pointer" }}
                  >
                    Priority
                  </CNavLink>
                </CNavItem>
              ) : null}
              <CNavItem>
                <CNavLink
                  active={activeTab === "productStatus"}
                  onClick={() => setActiveTab("productStatus")}
                  style={{ cursor: "pointer" }}
                >
                  Product status
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === "assignEmployee"}
                  onClick={() => setActiveTab("assignEmployee")}
                  style={{ cursor: "pointer" }}
                >
                  Assign employee
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === "attachment"}
                  onClick={() => setActiveTab("attachment")}
                  style={{ cursor: "pointer" }}
                >
                  Attachment
                </CNavLink>
              </CNavItem>
            </CNav>

            <CTabContent>
              <CTabPane visible={activeTab === "company"}>
                <CAlert color="info" className="mb-3">
                  Company information is view-only.
                </CAlert>
                <CRow className="g-3">
                  <CCol md={6}>
                    <CFormLabel>Name</CFormLabel>
                    <CFormInput
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
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Area</CFormLabel>
                    <CFormInput
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
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Location</CFormLabel>
                    <CFormInput
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
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Address</CFormLabel>
                    <CFormInput
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
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Purchase Manager Name</CFormLabel>
                    <CFormInput
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
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Purchase Manager Phone</CFormLabel>
                    <CFormInput
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
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel>Purchase Manager Email</CFormLabel>
                    <CFormInput
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
                  </CCol>
                </CRow>
              </CTabPane>

              <CTabPane visible={activeTab === "products"}>
                <CCard className="mb-4 border-0 shadow-sm">
                  <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light">
                    <strong>Product List</strong>
                    <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
                      <span className="text-nowrap fw-semibold text-secondary px-2 py-1 rounded border bg-white">
                        Total: {productsForm.length}
                      </span>
                      <CBadge color="primary" className="px-2 py-1">
                        Total Amount: ₹
                        {Number(totalAmount || 0).toLocaleString("en-IN")}
                      </CBadge>
                      <div className="d-flex align-items-center gap-2">
                        <CFormInput
                          size="sm"
                          type="date"
                          min={getTodayInputDate()}
                          value={dispatchmentDateForAll}
                          readOnly={poClosed}
                          disabled={poClosed}
                          onChange={(e) =>
                            setDispatchmentDateForAll(e.target.value)
                          }
                          placeholder="Dispatchment date"
                          style={{ minWidth: 170 }}
                        />
                        <CButton
                          size="sm"
                          color="secondary"
                          variant="outline"
                          disabled={poClosed}
                          onClick={applyDispatchmentDateToAll}
                        >
                          Set for all
                        </CButton>
                      </div>
                      {canManageProductList ? (
                        <CButton
                          color="success"
                          size="sm"
                          className="d-inline-flex align-items-center"
                          disabled={poClosed}
                          onClick={() => setAddProductSidebarOpen(true)}
                        >
                          <CIcon icon={cilPlus} className="me-1" />
                          Add New Product
                        </CButton>
                      ) : null}
                    </div>
                  </CCardHeader>
                  <CCardBody className="pt-3">
                    <CTable hover responsive bordered align="middle">
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>S No</CTableHeaderCell>
                          <CTableHeaderCell>Product</CTableHeaderCell>
                          <CTableHeaderCell>
                            Line status (Sales Order product)
                          </CTableHeaderCell>
                          <CTableHeaderCell>Qty</CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 110 }}>
                            GST %
                          </CTableHeaderCell>
                          <CTableHeaderCell>Rate</CTableHeaderCell>
                          <CTableHeaderCell>Dispatchment Date</CTableHeaderCell>
                          <CTableHeaderCell>Total Amount</CTableHeaderCell>
                          <CTableHeaderCell>Remark</CTableHeaderCell>
                          {canManageProductList ? (
                            <CTableHeaderCell>Actions</CTableHeaderCell>
                          ) : null}
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {productsForm.map((p, index) => (
                          <CTableRow key={p._id || index}>
                            <CTableDataCell className="fw-semibold">
                              {index + 1}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CFormInput
                                size="sm"
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
                            </CTableDataCell>
                            <CTableDataCell className="text-nowrap">
                              {lineInventoryByIndex.has(index) ? (
                                lineInventoryStatusBadge(
                                  lineInventoryByIndex.get(index),
                                )
                              ) : (
                                <span className="text-body-secondary small">
                                  —
                                </span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CFormInput
                                size="sm"
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
                            </CTableDataCell>
                            <CTableDataCell style={{ minWidth: 110 }}>
                              <CFormInput
                                size="sm"
                                type="number"
                                min={0}
                                max={100}
                                value={p.gstPercentage}
                                readOnly={poClosed}
                                style={{ minWidth: 100, width: "100%" }}
                                onChange={(e) =>
                                  updateProductField(
                                    index,
                                    "gstPercentage",
                                    e.target.value,
                                  )
                                }
                              />
                            </CTableDataCell>
                            <CTableDataCell>
                              <CFormInput
                                size="sm"
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
                            </CTableDataCell>
                            <CTableDataCell>
                              <CFormInput
                                size="sm"
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
                            </CTableDataCell>
                            <CTableDataCell className="text-nowrap fw-semibold">
                              ₹{getProductTotal(p).toLocaleString("en-IN")}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CFormTextarea
                                rows={1}
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
                            </CTableDataCell>
                            {canManageProductList ? (
                              <CTableDataCell className="text-nowrap">
                                <CButton
                                  color="primary"
                                  size="sm"
                                  className="me-2"
                                  onClick={() => updateSingleProduct(index)}
                                  disabled={savingProducts || poClosed}
                                >
                                  Update
                                </CButton>
                                <CButton
                                  color="danger"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeProduct(index)}
                                  disabled={savingProducts || poClosed}
                                >
                                  <CIcon icon={cilTrash} />
                                </CButton>
                              </CTableDataCell>
                            ) : null}
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </CCardBody>
                </CCard>
              </CTabPane>

              {!isSalesRole ? (
                <CTabPane visible={activeTab === "priority"}>
                  <CCard className="mb-4 border-0 shadow-sm">
                    <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light">
                      <strong>Product priority</strong>
                      <CButton
                        color="primary"
                        size="sm"
                        disabled={
                          savingProducts ||
                          productsForm.length === 0 ||
                          poClosed
                        }
                        onClick={savePriorities}
                      >
                        {savingProducts ? "Saving..." : "Save priorities"}
                      </CButton>
                    </CCardHeader>
                    <CCardBody className="pt-3">
                      {productsForm.length === 0 ? (
                        <p className="text-body-secondary mb-0">
                          No products on this sales order.
                        </p>
                      ) : (
                        <CTable hover responsive bordered align="middle">
                          <CTableHead>
                            <CTableRow>
                              <CTableHeaderCell>S No</CTableHeaderCell>
                              <CTableHeaderCell>Product</CTableHeaderCell>
                              <CTableHeaderCell>Qty</CTableHeaderCell>
                              <CTableHeaderCell>Priority</CTableHeaderCell>
                            </CTableRow>
                          </CTableHead>
                          <CTableBody>
                            {productsForm.map((p, index) => (
                              <CTableRow key={p._id || index}>
                                <CTableDataCell className="fw-semibold">
                                  {index + 1}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {p.productName || "—"}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {p.quantity ?? "—"}
                                </CTableDataCell>
                                <CTableDataCell style={{ maxWidth: 220 }}>
                                  <CFormSelect
                                    size="sm"
                                    value={normalizeProductPriority(
                                      p.priority,
                                    )}
                                    disabled={poClosed}
                                    onChange={(e) =>
                                      updateProductField(
                                        index,
                                        "priority",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    {PRODUCT_PRIORITY_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </CFormSelect>
                                </CTableDataCell>
                              </CTableRow>
                            ))}
                          </CTableBody>
                        </CTable>
                      )}
                    </CCardBody>
                  </CCard>
                </CTabPane>
              ) : null}

              <CTabPane visible={activeTab === "productStatus"}>
                <CCard className="mb-4 border-0 shadow-sm">
                  <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light">
                    <div>
                      <strong>Sales Order product line status</strong>
                      {purchaseOrder?.poCode && (
                        <div className="text-body-secondary small mt-1">
                          Sales Order: {purchaseOrder.poCode}
                        </div>
                      )}
                    </div>
                    <CButton
                      color="secondary"
                      size="sm"
                      variant="outline"
                      disabled={poProductStatusLoading}
                      onClick={() => void loadPoProductStatusLines()}
                    >
                      Refresh
                    </CButton>
                  </CCardHeader>
                  <CCardBody className="pt-3">
                    {poProductStatusLoading ? (
                      <div className="d-flex align-items-center gap-2 py-4 text-body-secondary">
                        <CSpinner size="sm" />
                        <span>Loading from po_products…</span>
                      </div>
                    ) : !poProductStatusBundle ||
                      poProductStatusBundle.lines.length === 0 ? (
                      <p className="text-body-secondary mb-0">
                        No po_products rows for this sales order. Save the
                        product list or sync the Sales Order to generate lines.
                      </p>
                    ) : (
                      <CTable hover responsive bordered align="middle">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>S No</CTableHeaderCell>
                            <CTableHeaderCell>Product</CTableHeaderCell>
                            <CTableHeaderCell>Raw code</CTableHeaderCell>
                            <CTableHeaderCell>Qty</CTableHeaderCell>
                            <CTableHeaderCell>Unit</CTableHeaderCell>
                            <CTableHeaderCell>Product image</CTableHeaderCell>
                            {!isSalesRole ? (
                              <>
                                <CTableHeaderCell>Payment proof</CTableHeaderCell>
                                <CTableHeaderCell>
                                  Receiving proof
                                </CTableHeaderCell>
                              </>
                            ) : null}
                            <CTableHeaderCell>
                              Status (po_product)
                            </CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {poProductStatusBundle.lines.map((row, i) => (
                            <CTableRow
                              key={
                                row._id != null ? String(row._id) : `line-${i}`
                              }
                            >
                              <CTableDataCell className="fw-semibold">
                                {row.lineIndex != null
                                  ? Number(row.lineIndex) + 1
                                  : i + 1}
                              </CTableDataCell>
                              <CTableDataCell>
                                {row.productName || "—"}
                              </CTableDataCell>
                              <CTableDataCell className="text-nowrap text-body-secondary small">
                                {row.rawProductCode || "—"}
                              </CTableDataCell>
                              <CTableDataCell>
                                {row.quantity ?? "—"}
                              </CTableDataCell>
                              <CTableDataCell>{row.unit || "—"}</CTableDataCell>
                              <CTableDataCell className="align-top">
                                {renderPoLineDocumentCell(
                                  row.productImageDocument,
                                )}
                              </CTableDataCell>
                              {!isSalesRole ? (
                                <>
                                  <CTableDataCell className="align-top">
                                    {renderPoLineDocumentCell(
                                      row.paymentProofDocument,
                                    )}
                                  </CTableDataCell>
                                  <CTableDataCell className="align-top">
                                    {renderPoLineDocumentCell(
                                      row.receivingProofDocument,
                                    )}
                                  </CTableDataCell>
                                </>
                              ) : null}
                              <CTableDataCell className="text-nowrap">
                                {lineInventoryStatusBadge(row.status)}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    )}
                  </CCardBody>
                </CCard>
              </CTabPane>

              <CTabPane visible={activeTab === "assignEmployee"}>
                <CCard className="mb-4 border-0 shadow-sm">
                  <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light">
                    <strong>Assign employee</strong>
                    {canManageProductList ? (
                      <CButton
                        color="primary"
                        size="sm"
                        disabled={
                          savingAssignedEmployee ||
                          !assignEmployeeDirty ||
                          (assignSelectValue &&
                            !selectedAssignEmployeePayload) ||
                          poClosed
                        }
                        onClick={saveAssignedEmployee}
                      >
                        {savingAssignedEmployee
                          ? "Saving..."
                          : "Save assignment"}
                      </CButton>
                    ) : null}
                  </CCardHeader>
                  <CCardBody className="pt-3">
                    <CRow className="g-3">
                      <CCol md={8} lg={6}>
                        <CFormLabel>Employee (sales / HOD roles)</CFormLabel>
                        <CFormSelect
                          value={assignSelectValue}
                          disabled={assignEmployeesLoading || poClosed}
                          onChange={(e) => setAssignSelectValue(e.target.value)}
                        >
                          <option value="">
                            {assignEmployeesLoading
                              ? "Loading employees…"
                              : "— None —"}
                          </option>
                          {assignEmployeeOptions.map((emp) => {
                            const eid = String(emp?._id || emp?.id || "");
                            const label = emp?.email || "—";
                            return (
                              <option key={eid || label} value={eid}>
                                {label}
                              </option>
                            );
                          })}
                        </CFormSelect>
                        <div className="small text-body-secondary mt-2">
                          Stores a full snapshot of the selected employee on
                          this sales order.
                        </div>
                      </CCol>
                      {purchaseOrder?.assigned_employee &&
                      typeof purchaseOrder.assigned_employee === "object" ? (
                        <CCol xs={12}>
                          <div className="border rounded p-3 bg-light small">
                            <div className="fw-semibold mb-2">
                              Current snapshot (saved)
                            </div>
                            <div className="row g-2">
                              {[
                                ["Name", purchaseOrder.assigned_employee.name],
                                [
                                  "Email",
                                  purchaseOrder.assigned_employee.email,
                                ],
                                [
                                  "Phone",
                                  purchaseOrder.assigned_employee.phone,
                                ],
                                ["Role", purchaseOrder.assigned_employee.role],
                                [
                                  "Designation",
                                  purchaseOrder.assigned_employee.designation,
                                ],
                              ].map(([k, v]) => (
                                <div className="col-md-4" key={k}>
                                  <span className="text-body-secondary">
                                    {k}:{" "}
                                  </span>
                                  {v != null && v !== "" ? String(v) : "—"}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CCol>
                      ) : null}
                    </CRow>
                  </CCardBody>
                </CCard>
              </CTabPane>

              <CTabPane visible={activeTab === "attachment"}>
                <CCard className="mb-4 border-0 shadow-sm">
                  <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light">
                    <strong>Sales order attachment</strong>
                    {canManageProductList ? (
                      <CButton
                        color="primary"
                        size="sm"
                        disabled={!canSavePoAttachment}
                        onClick={savePoAttachment}
                      >
                        {savingPoAttachment ? "Saving..." : "Save attachment"}
                      </CButton>
                    ) : null}
                  </CCardHeader>
                  <CCardBody className="pt-3">
                    <div
                      className="d-flex flex-column gap-3"
                      style={{ maxWidth: 480 }}
                    >
                      {poAttachment.meta?.path || poAttachment.documentId ? (
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          {isImageMime(poAttachment.meta?.mimeType) &&
                          poAttachment.meta?.path ? (
                            <button
                              type="button"
                              className="p-0 border-0 bg-transparent"
                              title="Open"
                              onClick={() =>
                                openPoAttachment(poAttachment.meta)
                              }
                              style={{ cursor: "pointer" }}
                            >
                              <img
                                src={
                                  poAttachment.meta.path.startsWith("http")
                                    ? poAttachment.meta.path
                                    : getAssetsUrl(poAttachment.meta.path)
                                }
                                alt=""
                                style={{
                                  width: 48,
                                  height: 48,
                                  objectFit: "cover",
                                  borderRadius: 4,
                                  border: "1px solid #dee2e6",
                                }}
                              />
                            </button>
                          ) : null}
                          <span
                            className="small text-truncate"
                            style={{ maxWidth: 220 }}
                            title={poAttachment.meta?.originalName || ""}
                          >
                            {poAttachment.meta?.originalName ||
                              (poAttachment.documentId ? "File" : "")}
                          </span>
                          {poAttachment.meta?.path ? (
                            <CButton
                              color="link"
                              className="p-0 small"
                              onClick={() =>
                                openPoAttachment(poAttachment.meta)
                              }
                            >
                              Open
                            </CButton>
                          ) : null}
                          <CButton
                            color="danger"
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={clearPoAttachment}
                            disabled={poAttachmentActionsLocked}
                          >
                            Remove
                          </CButton>
                        </div>
                      ) : (
                        <span className="text-body-secondary small">
                          No file attached to this sales order yet.
                        </span>
                      )}
                      <div className="d-flex align-items-center gap-2">
                        <CFormInput
                          type="file"
                          size="sm"
                          id="po-level-attachment-input"
                          className="d-none"
                          accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,.xls"
                          onChange={onPoDocumentFile}
                          disabled={!canUploadPoAttachment}
                        />
                        <CButton
                          color="secondary"
                          variant="outline"
                          size="sm"
                          type="button"
                          disabled={!canUploadPoAttachment}
                          onClick={() =>
                            document
                              .getElementById("po-level-attachment-input")
                              ?.click()
                          }
                        >
                          {poAttachmentUploading ? (
                            <>
                              <CSpinner size="sm" className="me-1" />
                              Uploading…
                            </>
                          ) : (
                            "Upload file"
                          )}
                        </CButton>
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              </CTabPane>
            </CTabContent>
          </CCardBody>
        </CCard>
      </CCol>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: addProductSidebarOpen ? 0 : -430,
          width: 430,
          maxWidth: "100%",
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #dee2e6",
          boxShadow: "0 0 16px rgba(0,0,0,0.08)",
          zIndex: 2999,
          transition: "right 0.2s ease",
          padding: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Add New Product</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => setAddProductSidebarOpen(false)}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Product name *</CFormLabel>
              <CFormInput
                value={newProductForm.productName}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    productName: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea
                rows={3}
                value={newProductForm.description}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Qty *</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={newProductForm.quantity}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Unit</CFormLabel>
              <ProductUnitSelect
                value={newProductForm.unit}
                disabled={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    unit: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Rate *</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={newProductForm.rate}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    rate: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>GST %</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                max={100}
                value={newProductForm.gstPercentage}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    gstPercentage: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Dispatchment Date</CFormLabel>
              <CFormInput
                type="date"
                min={getTodayInputDate()}
                value={newProductForm.dispatchmentDate}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    dispatchmentDate: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>HSN Number</CFormLabel>
              <CFormInput
                value={newProductForm.hsnNumber}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    hsnNumber: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={6}>
              <CFormLabel>Model Number</CFormLabel>
              <CFormInput
                value={newProductForm.modelNumber}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    modelNumber: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Remark</CFormLabel>
              <CFormInput
                value={newProductForm.remark}
                readOnly={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    remark: e.target.value,
                  }))
                }
              />
            </CCol>
            <CCol xs={12}>
              <CFormCheck
                label="Apply discount"
                checked={!!newProductForm.applyDiscount}
                disabled={poClosed}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    applyDiscount: e.target.checked,
                  }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Discount %</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                max={100}
                disabled={poClosed || !newProductForm.applyDiscount}
                value={newProductForm.discountPercentage}
                onChange={(e) =>
                  setNewProductForm((prev) => ({
                    ...prev,
                    discountPercentage: e.target.value,
                  }))
                }
              />
            </CCol>
          </CRow>
        </div>

        <div className="d-flex justify-content-end gap-2 pt-3">
          <CButton
            color="secondary"
            onClick={() => setAddProductSidebarOpen(false)}
          >
            Cancel
          </CButton>
          <CButton color="success" disabled={poClosed} onClick={addNewProduct}>
            Add Product
          </CButton>
        </div>
      </div>
    </CRow>
  );
};

export default PoBucketView;
