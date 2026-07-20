import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Eye,
  ImageOff,
  Package,
  Hash,
  Percent,
  IndianRupee,
  Ruler,
  Flag,
  Plus,
} from "lucide-react";
import quotationService from "../../services/quotationService";
import purchaseOrderService from "../../services/purchaseOrderService";
import { getAssetsUrl } from "../../api/endpoints";
import {
  BackButton,
  GstRateSelect,
  Loader,
  PageHeader,
} from "../../components";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  Select,
  Label,
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Separator,
} from "../../components/ui";
import AuthImage from "../../components/AuthImage/AuthImage";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
import { toastError, toastSuccess } from "../../utils/toast";
import { useAuth, ROLES } from "../../context/AuthContext";
import usePermissions, {
  canConvertQuotationToPo,
  normalizeRole,
} from "../../hooks/usePermissions";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

const PRODUCT_PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const toNumberOrNull = (value) => {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const normalizeProductPriority = (value) => {
  const allowed = PRODUCT_PRIORITY_OPTIONS.map((option) => option.value);
  const normalized = String(value || "")
    .toLowerCase()
    .trim();
  return allowed.includes(normalized) ? normalized : "medium";
};

const formatVariantsText = (variants) => {
  if (!Array.isArray(variants) || !variants.length) return "";
  return variants
    .map((variant) => variant?.variantName || variant || "")
    .filter(Boolean)
    .join(", ");
};

const parseVariantsText = (text) =>
  String(text || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((variantName) => ({ variantName }));

/** Only pass YYYY-MM-DD dates to the API; quotation delivery text is ignored. */
const normalizeDispatchmentDateForApi = (value) => {
  if (value == null || value === "") return null;
  const datePart = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const parsed = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : datePart;
};

const getDocumentId = (img) => {
  if (!img) return null;
  if (typeof img === "object") return img._id ?? img.documentId ?? null;
  return typeof img === "string" && OBJECT_ID_RE.test(img) ? img : null;
};

const getImageUrl = (img) => {
  if (!img) return "";
  if (typeof img === "string") {
    return img.startsWith("http") ? img : getAssetsUrl(img);
  }
  if (typeof img === "object" && img?.path) {
    return img.path.startsWith("http") ? img.path : getAssetsUrl(img.path);
  }
  if (typeof img === "object" && img?.url) return img.url;
  return "";
};

const resolveProductImages = (product) => {
  const lineImages = Array.isArray(product?.images) ? product.images : [];
  if (lineImages.length > 0) return lineImages;
  const productRef =
    product?.product_id && typeof product.product_id === "object"
      ? product.product_id
      : null;
  return Array.isArray(productRef?.images) ? productRef.images : [];
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

const PRIORITY_BADGE_VARIANT = {
  high: "destructive",
  medium: "warning",
  low: "success",
};

const dash = (value) => {
  const text = String(value ?? "").trim();
  return text || "—";
};

/**
 * Read-only display fields for the detail panel. Falls back to placeholder
 * dummy data where the quotation line has nothing, so the view always looks
 * complete. Nothing here is sent to the backend.
 */
const getProductDisplay = (product, index) => {
  const priority = normalizeProductPriority(product?.priority);
  const variants = formatVariantsText(
    parseVariantsText(
      product?.variantsText ?? formatVariantsText(product?.variants),
    ),
  );
  return {
    productName: dash(product?.productName) || `Product ${index + 1}`,
    description:
      String(product?.description || "").trim() ||
      "No description provided for this product line.",
    quantity: Number(product?.quantity) || 0,
    unit: dash(product?.unit) === "—" ? "Nos" : product.unit,
    rate: Number(product?.rate) || 0,
    gstPercentage:
      product?.gstPercentage === "" || product?.gstPercentage == null
        ? 18
        : Number(product.gstPercentage),
    hsnNumber: dash(product?.hsnNumber) === "—" ? "0000" : product.hsnNumber,
    modelNumber: dash(product?.modelNumber),
    rawProductCode:
      dash(product?.rawProductCode) === "—"
        ? `PRD-${String(index + 1).padStart(4, "0")}`
        : product.rawProductCode,
    priority,
    priorityLabel:
      PRODUCT_PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ||
      "Medium",
    variants: variants || "Standard",
    remark: String(product?.remark || "").trim() || "No remark added.",
    total: getProductTotal(product),
  };
};

const toEditableProduct = (product) => {
  const images = resolveProductImages(product);
  return {
    ...product,
    productName: product?.productName || "",
    description: product?.description || "",
    quantity: product?.quantity ?? 1,
    unit: product?.unit || "",
    hsnNumber: product?.hsnNumber || "",
    modelNumber: product?.modelNumber || "",
    rawProductCode: String(product?.rawProductCode || "").trim(),
    gstPercentage: product?.gstPercentage ?? "",
    rate: product?.rate ?? "",
    remark: product?.remark || "",
    applyDiscount: !!product?.applyDiscount,
    discountPercentage: product?.discountPercentage ?? "",
    notAvailable: !!product?.notAvailable,
    notAvailableRemark: product?.notAvailableRemark || "",
    priority: normalizeProductPriority(product?.priority),
    variantsText: formatVariantsText(product?.variants),
    dispatchmentDate: normalizeDispatchmentDateForApi(
      product?.dispatchmentDate ?? product?.deliveryDate ?? null,
    ),
    images,
  };
};

const toProductPayload = (product, quotationLineIndex) => {
  const quantity = Number(product.quantity);
  const rate = toNumberOrNull(product.rate);
  const gst = toNumberOrNull(product.gstPercentage);
  const discountPct = product.applyDiscount
    ? toNumberOrNull(product.discountPercentage)
    : null;
  const beforeDiscount =
    (Number.isNaN(quantity) ? 0 : Math.max(0, quantity)) * (rate || 0);
  const discountAmount =
    product.applyDiscount && discountPct != null
      ? Math.max(0, beforeDiscount * (discountPct / 100))
      : null;
  const imageIds = Array.isArray(product.images)
    ? product.images
        .map((img) => {
          if (img && typeof img === "object" && img._id) return String(img._id);
          if (typeof img === "string" && OBJECT_ID_RE.test(img)) return img;
          return null;
        })
        .filter(Boolean)
    : [];
  return {
    productName: String(product.productName || "").trim(),
    description: String(product.description || ""),
    quantity: Number.isNaN(quantity) ? 0 : Math.max(0, quantity),
    unit: String(product.unit || ""),
    hsnNumber: String(product.hsnNumber || ""),
    modelNumber: String(product.modelNumber || ""),
    rawProductCode: String(product.rawProductCode || "").trim(),
    dispatchmentDate: normalizeDispatchmentDateForApi(product.dispatchmentDate),
    gstPercentage: gst,
    variants: parseVariantsText(product.variantsText),
    remark: String(product.remark || ""),
    product_id:
      product.product_id && typeof product.product_id === "object"
        ? String(product.product_id._id || "")
        : product.product_id || null,
    rate,
    images: imageIds,
    applyDiscount: !!product.applyDiscount,
    discountPercentage: discountPct,
    discountAmount,
    notAvailable: !!product.notAvailable,
    notAvailableRemark: String(product.notAvailableRemark || ""),
    priority: normalizeProductPriority(product.priority),
    quotationLineIndex,
  };
};

const validateSingleProduct = (row, lineNumber) => {
  if (!String(row.productName || "").trim()) {
    return `Product name is required for line ${lineNumber}`;
  }
  const qty = Number(row.quantity);
  if (row.quantity === "" || Number.isNaN(qty) || qty <= 0) {
    return `Quantity must be greater than 0 for line ${lineNumber}`;
  }
  return null;
};

const getQuotationSummaryAddresses = (quotation) => {
  const companyInfo = quotation?.companyInfo || {};
  const industry =
    quotation?.industry_id && typeof quotation.industry_id === "object"
      ? quotation.industry_id
      : {};
  const billingAddress =
    String(companyInfo.billingAddress || "").trim() ||
    String(industry.billingAddress || "").trim() ||
    "—";
  const shippingAddress =
    String(companyInfo.shippingAddress || "").trim() ||
    String(industry.shippingAddress || "").trim() ||
    "—";
  return { billingAddress, shippingAddress };
};

const EMPTY_DRAFT = {
  productName: "",
  quantity: 1,
  unit: "",
  rate: "",
  gstPercentage: "",
  priority: "medium",
  variantsText: "",
  description: "",
};

/**
 * Clean modal form to add a new product line (dummy / local only).
 * On save it hands a plain draft up to the parent, which appends it to the
 * list. No backend call is made here.
 */
const AddProductDialog = ({ onClose, onAdd }) => {
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const setField = (field, value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!String(draft.productName || "").trim()) {
      toastError("Product name is required");
      return;
    }
    const qty = Number(draft.quantity);
    if (draft.quantity === "" || Number.isNaN(qty) || qty <= 0) {
      toastError("Quantity must be greater than 0");
      return;
    }
    onAdd(draft);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add product
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 space-y-1.5 md:col-span-6">
            <Label>
              Product name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={draft.productName}
              placeholder="e.g. Steel Bracket"
              onChange={(e) => setField("productName", e.target.value)}
            />
          </div>
          <div className="col-span-12 space-y-1.5 md:col-span-3">
            <Label>
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              value={draft.quantity}
              onChange={(e) => setField("quantity", e.target.value)}
            />
          </div>
          <div className="col-span-12 space-y-1.5 md:col-span-3">
            <Label>Unit</Label>
            <ProductUnitSelect
              value={draft.unit}
              onChange={(e) => setField("unit", e.target.value)}
            />
          </div>
          <div className="col-span-12 space-y-1.5 md:col-span-3">
            <Label>Rate</Label>
            <Input
              type="number"
              min={0}
              value={draft.rate}
              onChange={(e) => setField("rate", e.target.value)}
            />
          </div>
          <div className="col-span-12 space-y-1.5 md:col-span-3">
            <Label>GST %</Label>
            <GstRateSelect
              value={draft.gstPercentage}
              onChange={(e) => setField("gstPercentage", e.target.value)}
            />
          </div>
          <div className="col-span-12 space-y-1.5 md:col-span-3">
            <Label>Priority</Label>
            <Select
              value={draft.priority}
              onChange={(e) => setField("priority", e.target.value)}
            >
              {PRODUCT_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-12 space-y-1.5 md:col-span-3">
            <Label>Variants (comma separated)</Label>
            <Input
              value={draft.variantsText}
              placeholder="e.g. Size M, Size L"
              onChange={(e) => setField("variantsText", e.target.value)}
            />
          </div>
          <div className="col-span-12 space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Add product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Small labelled read-only field for the detail view. */
const DetailField = ({ icon: Icon, label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

/**
 * Clean, self-contained product view + edit panel.
 * The top section is a read-only "view" of the product (dummy data fills any
 * blanks); the bottom section keeps the editable fields that feed the sales
 * order. Backend untouched.
 */
const ProductDetailDialog = ({
  index,
  product,
  confirmed,
  updating,
  onClose,
  onChange,
  onUpdate,
}) => {
  const display = getProductDisplay(product, index);
  const images = Array.isArray(product.images) ? product.images : [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {display.productName}
            <Badge variant={confirmed ? "success" : "warning"} className="ml-1">
              {confirmed ? "Updated" : "Pending update"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* ---- Read-only view ---- */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-4">
            {images.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                  <AuthImage
                    documentId={getDocumentId(images[0])}
                    fallbackUrl={getImageUrl(images[0])}
                    alt={display.productName}
                    className="h-full w-full"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                {images.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {images.slice(1, 5).map((img, i) => (
                      <div
                        key={getDocumentId(img) || i}
                        className="h-12 w-12 overflow-hidden rounded border border-border bg-muted"
                      >
                        <AuthImage
                          documentId={getDocumentId(img)}
                          fallbackUrl={getImageUrl(img)}
                          alt=""
                          className="h-full w-full"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
                <ImageOff className="h-8 w-8" />
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>

          <div className="col-span-12 grid grid-cols-2 gap-x-4 gap-y-3 sm:col-span-8">
            <DetailField
              icon={Hash}
              label="Product code"
              value={display.rawProductCode}
            />
            <DetailField
              icon={Package}
              label="Model number"
              value={display.modelNumber}
            />
            <DetailField
              icon={Hash}
              label="HSN number"
              value={display.hsnNumber}
            />
            <DetailField
              icon={Ruler}
              label="Quantity"
              value={`${display.quantity} ${display.unit}`}
            />
            <DetailField
              icon={IndianRupee}
              label="Rate"
              value={`₹${display.rate.toLocaleString("en-IN")}`}
            />
            <DetailField
              icon={Percent}
              label="GST"
              value={`${display.gstPercentage}%`}
            />
            <DetailField
              icon={Flag}
              label="Priority"
              value={
                <Badge variant={PRIORITY_BADGE_VARIANT[display.priority]}>
                  {display.priorityLabel}
                </Badge>
              }
            />
            <DetailField label="Variants" value={display.variants} />
            <div className="col-span-2">
              <DetailField
                label="Line total"
                value={
                  <span className="text-lg font-semibold text-foreground">
                    ₹{display.total.toLocaleString("en-IN")}
                  </span>
                }
              />
            </div>
          </div>

          <div className="col-span-12">
            <span className="text-xs font-medium text-muted-foreground">
              Description
            </span>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
              {display.description}
            </p>
          </div>
        </div>

        <Separator />

        {/* ---- Editable fields (feed the sales order) ---- */}
        <div>
          <h5 className="mb-3 text-sm font-semibold">Edit for sales order</h5>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 space-y-1.5 md:col-span-6">
              <Label>
                Product name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={product.productName || ""}
                disabled
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="col-span-12 space-y-1.5 md:col-span-3">
              <Label>
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={product.quantity}
                onChange={(e) => onChange(index, "quantity", e.target.value)}
              />
            </div>
            <div className="col-span-12 space-y-1.5 md:col-span-3">
              <Label>Unit</Label>
              <ProductUnitSelect
                value={product.unit || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="col-span-12 space-y-1.5 md:col-span-3">
              <Label>GST %</Label>
              <GstRateSelect
                value={product.gstPercentage}
                onChange={(e) =>
                  onChange(index, "gstPercentage", e.target.value)
                }
              />
            </div>
            <div className="col-span-12 space-y-1.5 md:col-span-3">
              <Label>Rate</Label>
              <Input
                type="number"
                min={0}
                value={product.rate}
                onChange={(e) => onChange(index, "rate", e.target.value)}
              />
            </div>
            <div className="col-span-12 space-y-1.5 md:col-span-3">
              <Label>Priority</Label>
              <Select
                value={product.priority || "medium"}
                onChange={(e) => onChange(index, "priority", e.target.value)}
              >
                {PRODUCT_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-12 space-y-1.5 md:col-span-3">
              <Label>Variants (comma separated)</Label>
              <Input
                value={product.variantsText || ""}
                placeholder="e.g. Size M, Size L"
                onChange={(e) =>
                  onChange(index, "variantsText", e.target.value)
                }
              />
            </div>
            <div className="col-span-12 space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={product.description || ""}
                onChange={(e) => onChange(index, "description", e.target.value)}
              />
            </div>
            <div className="col-span-12 space-y-1.5">
              <Label>Remark</Label>
              <Textarea
                rows={2}
                value={product.remark || ""}
                onChange={(e) => onChange(index, "remark", e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            disabled={updating}
            onClick={() => onUpdate(index)}
          >
            {updating ? (
              <>
                <Spinner size="sm" />
                Updating...
              </>
            ) : (
              "Update product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const FinalizeSalesOrder = () => {
  const { id: quotationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState(null);
  const [productsForm, setProductsForm] = useState([]);
  const [productConfirmed, setProductConfirmed] = useState([]);
  const [accordionResetKeys, setAccordionResetKeys] = useState([]);
  const [updatingProductIndex, setUpdatingProductIndex] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailIndex, setDetailIndex] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const userRole = user?.role || "";
  const currentUserRole = normalizeRole(userRole);
  const isHodUser =
    currentUserRole === normalizeRole(ROLES.HEAD_OF_DEPARTMENT) ||
    currentUserRole === "hod";
  const isSalesRole = currentUserRole.startsWith("sales");
  const canCreatePurchaseOrder =
    hasPermission("purchase_orders", "create") ||
    canConvertQuotationToPo(userRole);
  const canBypassPoHodApproval = isSalesRole || isHodUser;
  const isHodApprovedStatus = quotation?.status === "hod_approved";
  const canConvertToPo = isHodApprovedStatus || canBypassPoHodApproval;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!quotationId) return;
      setLoading(true);
      try {
        const quotationRes = await quotationService.getById(quotationId);
        const quotationData =
          quotationRes?.data?.data ?? quotationRes?.data ?? quotationRes;
        if (cancelled) return;
        if (!quotationData?.id && !quotationData?._id) {
          setQuotation(null);
          return;
        }
        setQuotation(quotationData);
        const sourceProducts = Array.isArray(quotationData.products)
          ? quotationData.products
          : [];
        setProductsForm(sourceProducts.map(toEditableProduct));
        setProductConfirmed(sourceProducts.map(() => false));
        setAccordionResetKeys(sourceProducts.map(() => 0));
      } catch (err) {
        if (!cancelled) {
          toastError(err?.message || "Failed to load quotation");
          setQuotation(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [quotationId]);

  const totalAmount = useMemo(
    () =>
      productsForm.reduce((sum, product, index) => {
        if (!productConfirmed[index]) return sum;
        return sum + getProductTotal(product);
      }, 0),
    [productsForm, productConfirmed],
  );

  const confirmedCount = useMemo(
    () => productConfirmed.filter(Boolean).length,
    [productConfirmed],
  );

  const anyProductConfirmed = confirmedCount > 0;

  const confirmedProductsPayload = useMemo(
    () =>
      productsForm
        .map((product, index) => ({ product, index }))
        .filter(({ index }) => productConfirmed[index])
        .map(({ product, index }) => toProductPayload(product, index)),
    [productsForm, productConfirmed],
  );

  const companyInfo = quotation?.companyInfo || {};
  const purchaseManagers = Array.isArray(companyInfo.purchaseManagers)
    ? companyInfo.purchaseManagers.filter(
        (manager) =>
          String(manager?.name || "").trim() ||
          String(manager?.phone || "").trim() ||
          String(manager?.email || "").trim(),
      )
    : [];
  const { billingAddress, shippingAddress } =
    getQuotationSummaryAddresses(quotation);

  const updateProductField = (index, field, value) => {
    setProductsForm((prev) =>
      prev.map((product, i) =>
        i === index ? { ...product, [field]: value } : product,
      ),
    );
    setProductConfirmed((prev) =>
      prev.map((confirmed, i) => (i === index ? false : confirmed)),
    );
  };

  /**
   * Adds a locally-created (dummy) product line. It behaves like any other
   * line: it shows in the grid but is only sent to the sales order once the
   * user hits "Update product". Nothing is saved to the backend here.
   */
  const handleAddProduct = (draft) => {
    const newLine = toEditableProduct({
      _id: `local-${Date.now()}`,
      productName: draft.productName,
      description: draft.description,
      quantity: draft.quantity,
      unit: draft.unit,
      rate: draft.rate,
      gstPercentage: draft.gstPercentage,
      priority: draft.priority,
      variants: parseVariantsText(draft.variantsText),
      images: [],
    });
    setProductsForm((prev) => [...prev, newLine]);
    setProductConfirmed((prev) => [...prev, false]);
    setAccordionResetKeys((prev) => [...prev, 0]);
    setAddModalVisible(false);
    toastSuccess("Product added to the list");
  };

  const updateProductRow = async (index) => {
    const row = productsForm[index];
    if (!row) return;
    const validationError = validateSingleProduct(row, index + 1);
    if (validationError) {
      toastError(validationError);
      return;
    }
    setUpdatingProductIndex(index);
    try {
      setProductConfirmed((prev) =>
        prev.map((confirmed, i) => (i === index ? true : confirmed)),
      );
      setAccordionResetKeys((prev) =>
        prev.map((resetKey, i) => (i === index ? resetKey + 1 : resetKey)),
      );
      toastSuccess(`Product line ${index + 1} updated`);
    } finally {
      setUpdatingProductIndex(null);
    }
  };

  const handleOpenConfirm = () => {
    if (!canCreatePurchaseOrder || !canConvertToPo) {
      toastError("Convert to Sales Order is available only after HOD approval");
      return;
    }
    if (!anyProductConfirmed) {
      toastError(
        "Update at least one product line before converting to sales order",
      );
      return;
    }
    for (const { product, index } of productsForm
      .map((row, rowIndex) => ({ product: row, index: rowIndex }))
      .filter(({ index }) => productConfirmed[index])) {
      const validationError = validateSingleProduct(product, index + 1);
      if (validationError) {
        toastError(validationError);
        return;
      }
    }
    setConfirmModalVisible(true);
  };

  const handleCreateSalesOrder = async () => {
    if (!quotationId || submitting) return;
    setSubmitting(true);
    try {
      const res = await purchaseOrderService.createFromQuotation(quotationId, {
        reuseExisting: false,
        products: confirmedProductsPayload,
      });
      const data = res?.data?.data ?? res?.data ?? res;
      const poId = data?._id || data?.id;
      if (!poId) {
        throw new Error("Sales order id not found in response");
      }
      toastSuccess("Sales order created");
      setConfirmModalVisible(false);
      navigate(`/po-bucket/${poId}`);
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create sales order",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading sales order preview..." />;
  }

  if (!quotation) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <h4 className="text-lg font-semibold">Quotation not found</h4>
          <Button onClick={() => navigate("/quotations")}>
            Back to Quotations
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Finalize Sales Order"
        description={
          <>
            From quotation{" "}
            <strong className="text-foreground">
              {quotation.quotationCode ||
                `QT-${String(quotation.id || quotation._id).slice(-6)}`}
            </strong>
            . Update the products you want in a new sales order, then convert.
            Each convert creates a separate sales order with only the updated
            lines.
          </>
        }
        actions={
          <BackButton
            fallback={`/quotations/${quotation.id || quotation._id}`}
          />
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company &amp; order summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <Label className="mb-0 text-xs text-muted-foreground">
                Company name
              </Label>
              <div className="font-semibold">{companyInfo.name || "—"}</div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label className="mb-0 text-xs text-muted-foreground">
                Purchase manager(s)
              </Label>
              {purchaseManagers.length ? (
                <div className="flex flex-col gap-2">
                  {purchaseManagers.map((manager, managerIndex) => (
                    <div key={managerIndex}>
                      <div className="font-semibold">{manager.name || "—"}</div>
                      {manager.phone ? (
                        <div className="text-sm text-muted-foreground">
                          {manager.phone}
                        </div>
                      ) : null}
                      {manager.email ? (
                        <div className="text-sm text-muted-foreground">
                          {manager.email}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div>—</div>
              )}
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label className="mb-0 text-xs text-muted-foreground">
                Billing address
              </Label>
              <div className="whitespace-pre-wrap">{billingAddress}</div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label className="mb-0 text-xs text-muted-foreground">
                Shipping address
              </Label>
              <div className="whitespace-pre-wrap">{shippingAddress}</div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="mb-0 text-xs text-muted-foreground">
                Freight charge
              </Label>
              <div>
                ₹{Number(quotation.freightCharge || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="mb-0 text-xs text-muted-foreground">
                Packing charge
              </Label>
              <div>
                ₹{Number(quotation.packingCharge || 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="mb-0 text-xs text-muted-foreground">
                Remark
              </Label>
              <div className="whitespace-pre-wrap">
                {quotation.remark || "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Products from quotation</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap rounded border border-border bg-background px-2 py-1 text-sm font-semibold text-muted-foreground">
              Updated: {confirmedCount}/{productsForm.length}
            </span>
            <Badge className="px-2 py-1">
              Selected total: ₹
              {Number(totalAmount || 0).toLocaleString("en-IN")}
            </Badge>
            <Button
              type="button"
              size="sm"
              onClick={() => setAddModalVisible(true)}
            >
              <Plus className="h-4 w-4" />
              Add product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!productsForm.length ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
              <span>No products on this quotation.</span>
              <Button type="button" onClick={() => setAddModalVisible(true)}>
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {productsForm.map((product, index) => {
                const images = Array.isArray(product.images)
                  ? product.images
                  : [];
                const cover = images[0];
                const confirmed = productConfirmed[index];
                return (
                  <button
                    type="button"
                    key={`${product._id || index}`}
                    onClick={() => setDetailIndex(index)}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="relative flex h-40 items-center justify-center overflow-hidden bg-muted">
                      {cover ? (
                        <AuthImage
                          documentId={getDocumentId(cover)}
                          fallbackUrl={getImageUrl(cover)}
                          alt={product.productName || "Product"}
                          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageOff className="h-7 w-7" />
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                      <Badge
                        variant={confirmed ? "success" : "warning"}
                        className="absolute left-2 top-2 shadow-sm"
                      >
                        {confirmed ? "Updated" : "Pending update"}
                      </Badge>
                      {images.length > 1 ? (
                        <span className="absolute bottom-2 right-2 rounded bg-background/85 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                          +{images.length - 1} more
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 font-semibold leading-tight">
                          <span className="text-muted-foreground">
                            {index + 1}.
                          </span>{" "}
                          {product.productName || "Unnamed product"}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>
                          Qty{" "}
                          <span className="font-medium text-foreground">
                            {product.quantity || 0}
                          </span>
                        </span>
                        <span>
                          Rate{" "}
                          <span className="font-medium text-foreground">
                            ₹{Number(product.rate || 0).toLocaleString("en-IN")}
                          </span>
                        </span>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-base font-semibold text-foreground">
                          ₹{getProductTotal(product).toLocaleString("en-IN")}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-80 group-hover:opacity-100">
                          <Eye className="h-4 w-4" />
                          View
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {anyProductConfirmed
            ? `${confirmedCount} product line(s) ready. A new sales order will be created with only these lines.`
            : "Update at least one product line before converting to sales order."}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(`/quotations/${quotation.id || quotation._id}`)
            }
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="success"
            disabled={
              !canCreatePurchaseOrder ||
              !canConvertToPo ||
              !anyProductConfirmed ||
              submitting
            }
            onClick={handleOpenConfirm}
          >
            Convert to sales order
          </Button>
        </div>
      </div>

      {addModalVisible ? (
        <AddProductDialog
          onClose={() => setAddModalVisible(false)}
          onAdd={handleAddProduct}
        />
      ) : null}

      {detailIndex != null && productsForm[detailIndex] ? (
        <ProductDetailDialog
          index={detailIndex}
          product={productsForm[detailIndex]}
          confirmed={!!productConfirmed[detailIndex]}
          updating={updatingProductIndex === detailIndex}
          onClose={() => setDetailIndex(null)}
          onChange={updateProductField}
          onUpdate={updateProductRow}
        />
      ) : null}

      <Dialog
        open={confirmModalVisible}
        onOpenChange={(o) => !o && !submitting && setConfirmModalVisible(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Sales Order?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A new sales order will be created with {confirmedCount} updated
            product line(s). Other quotation products will not be included. You
            can return later to create additional sales orders from this
            quotation.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setConfirmModalVisible(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="success"
              disabled={submitting}
              onClick={handleCreateSalesOrder}
            >
              {submitting ? (
                <>
                  <Spinner size="sm" />
                  Converting...
                </>
              ) : (
                "Yes, convert to sales order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinalizeSalesOrder;
