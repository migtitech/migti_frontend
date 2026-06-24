import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft } from "@coreui/icons";
import quotationService from "../../services/quotationService";
import purchaseOrderService from "../../services/purchaseOrderService";
import { getAssetsUrl } from "../../api/endpoints";
import { Loader } from "../../components";
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
      <CCard>
        <CCardBody className="text-center py-5">
          <h4>Quotation not found</h4>
          <CButton color="primary" onClick={() => navigate("/quotations")}>
            Back to Quotations
          </CButton>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <>
      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody className="p-3 p-md-4">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h4 className="mb-1">Finalize Sales Order</h4>
              <div className="text-muted small">
                From quotation{" "}
                <strong>
                  {quotation.quotationCode ||
                    `QT-${String(quotation.id || quotation._id).slice(-6)}`}
                </strong>
              </div>
              <div className="text-muted small mt-1">
                Update the products you want in a new sales order, then convert.
                Each convert creates a separate sales order with only the
                updated lines.
              </div>
            </div>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() =>
                navigate(`/quotations/${quotation.id || quotation._id}`)
              }
              className="d-inline-flex align-items-center"
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back to Quotation
            </CButton>
          </div>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader>
          <strong>Company &amp; order summary</strong>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CFormLabel className="text-muted small mb-0">
                Company name
              </CFormLabel>
              <div className="fw-semibold">{companyInfo.name || "—"}</div>
            </CCol>
            <CCol md={6}>
              <CFormLabel className="text-muted small mb-0">
                Purchase manager(s)
              </CFormLabel>
              {purchaseManagers.length ? (
                <div className="d-flex flex-column gap-2">
                  {purchaseManagers.map((manager, managerIndex) => (
                    <div key={managerIndex}>
                      <div className="fw-semibold">{manager.name || "—"}</div>
                      {manager.phone ? (
                        <div className="small text-muted">{manager.phone}</div>
                      ) : null}
                      {manager.email ? (
                        <div className="small text-muted">{manager.email}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div>—</div>
              )}
            </CCol>
            <CCol md={6}>
              <CFormLabel className="text-muted small mb-0">
                Billing address
              </CFormLabel>
              <div style={{ whiteSpace: "pre-wrap" }}>{billingAddress}</div>
            </CCol>
            <CCol md={6}>
              <CFormLabel className="text-muted small mb-0">
                Shipping address
              </CFormLabel>
              <div style={{ whiteSpace: "pre-wrap" }}>{shippingAddress}</div>
            </CCol>
            <CCol md={4}>
              <CFormLabel className="text-muted small mb-0">
                Freight charge
              </CFormLabel>
              <div>
                ₹{Number(quotation.freightCharge || 0).toLocaleString("en-IN")}
              </div>
            </CCol>
            <CCol md={4}>
              <CFormLabel className="text-muted small mb-0">
                Packing charge
              </CFormLabel>
              <div>
                ₹{Number(quotation.packingCharge || 0).toLocaleString("en-IN")}
              </div>
            </CCol>
            <CCol md={4}>
              <CFormLabel className="text-muted small mb-0">Remark</CFormLabel>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {quotation.remark || "—"}
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light">
          <strong>Products from quotation</strong>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="text-nowrap fw-semibold text-secondary px-2 py-1 rounded border bg-white">
              Updated: {confirmedCount}/{productsForm.length}
            </span>
            <CBadge color="primary" className="px-2 py-1">
              Selected total: ₹
              {Number(totalAmount || 0).toLocaleString("en-IN")}
            </CBadge>
          </div>
        </CCardHeader>
        <CCardBody className="pt-3">
          {!productsForm.length ? (
            <div className="text-center text-muted py-4">
              No products on this quotation.
            </div>
          ) : (
            <CAccordion flush>
              {productsForm.map((product, index) => (
                <CAccordionItem
                  itemKey={String(index)}
                  key={`${product._id || index}-${accordionResetKeys[index] || 0}`}
                >
                  <CAccordionHeader>
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 w-100 pe-3">
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="fw-semibold">{index + 1}.</span>
                        <span>{product.productName || "Unnamed product"}</span>
                        <span className="text-muted small">
                          Qty {product.quantity} · ₹
                          {getProductTotal(product).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <CBadge
                        color={productConfirmed[index] ? "success" : "warning"}
                      >
                        {productConfirmed[index] ? "Updated" : "Pending update"}
                      </CBadge>
                    </div>
                  </CAccordionHeader>
                  <CAccordionBody>
                    <CRow className="g-3">
                      <CCol md={6}>
                        <CFormLabel>
                          Product name <span className="text-danger">*</span>
                        </CFormLabel>
                        <CFormInput
                          value={product.productName || ""}
                          disabled
                          readOnly
                          className="bg-light"
                        />
                      </CCol>
                      <CCol xs={12}>
                        <CFormLabel>Description</CFormLabel>
                        <CFormTextarea
                          rows={2}
                          value={product.description || ""}
                          onChange={(e) =>
                            updateProductField(
                              index,
                              "description",
                              e.target.value,
                            )
                          }
                        />
                      </CCol>
                      <CCol md={3}>
                        <CFormLabel>
                          Quantity <span className="text-danger">*</span>
                        </CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          value={product.quantity}
                          onChange={(e) =>
                            updateProductField(
                              index,
                              "quantity",
                              e.target.value,
                            )
                          }
                        />
                      </CCol>
                      <CCol md={3}>
                        <CFormLabel>Unit</CFormLabel>
                        <ProductUnitSelect
                          value={product.unit || ""}
                          disabled
                          className="bg-light"
                        />
                      </CCol>
                      <CCol md={3}>
                        <CFormLabel>GST %</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          max={100}
                          value={product.gstPercentage}
                          onChange={(e) =>
                            updateProductField(
                              index,
                              "gstPercentage",
                              e.target.value,
                            )
                          }
                        />
                      </CCol>
                      <CCol md={3}>
                        <CFormLabel>Rate</CFormLabel>
                        <CFormInput
                          type="number"
                          min={0}
                          value={product.rate}
                          onChange={(e) =>
                            updateProductField(index, "rate", e.target.value)
                          }
                        />
                      </CCol>
                      <CCol md={3}>
                        <CFormLabel>Priority</CFormLabel>
                        <CFormSelect
                          value={product.priority || "medium"}
                          onChange={(e) =>
                            updateProductField(
                              index,
                              "priority",
                              e.target.value,
                            )
                          }
                        >
                          {PRODUCT_PRIORITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol xs={12} md={6}>
                        <CFormLabel>Variants (comma separated)</CFormLabel>
                        <CFormInput
                          value={product.variantsText || ""}
                          placeholder="e.g. Size M, Size L"
                          onChange={(e) =>
                            updateProductField(
                              index,
                              "variantsText",
                              e.target.value,
                            )
                          }
                        />
                      </CCol>
                      <CCol xs={12}>
                        <CFormLabel>Images</CFormLabel>
                        {Array.isArray(product.images) &&
                        product.images.length > 0 ? (
                          <div className="d-flex flex-wrap gap-2">
                            {product.images.map((img, imageIndex) => (
                              <div
                                key={getDocumentId(img) || imageIndex}
                                className="rounded border bg-light overflow-hidden"
                                style={{ width: 72, height: 72 }}
                              >
                                <AuthImage
                                  documentId={getDocumentId(img)}
                                  fallbackUrl={getImageUrl(img)}
                                  alt=""
                                  className="w-100 h-100"
                                  style={{ objectFit: "cover" }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-muted small">No images</div>
                        )}
                      </CCol>
                      <CCol xs={12}>
                        <CFormLabel>Remark</CFormLabel>
                        <CFormTextarea
                          rows={2}
                          value={product.remark || ""}
                          onChange={(e) =>
                            updateProductField(index, "remark", e.target.value)
                          }
                        />
                      </CCol>
                      <CCol xs={12} className="d-flex justify-content-end">
                        <CButton
                          color="primary"
                          disabled={updatingProductIndex === index}
                          onClick={() => updateProductRow(index)}
                        >
                          {updatingProductIndex === index ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Updating...
                            </>
                          ) : (
                            "Update product"
                          )}
                        </CButton>
                      </CCol>
                    </CRow>
                  </CAccordionBody>
                </CAccordionItem>
              ))}
            </CAccordion>
          )}
        </CCardBody>
      </CCard>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <span className="text-muted small">
          {anyProductConfirmed
            ? `${confirmedCount} product line(s) ready. A new sales order will be created with only these lines.`
            : "Update at least one product line before converting to sales order."}
        </span>
        <div className="d-flex gap-2">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() =>
              navigate(`/quotations/${quotation.id || quotation._id}`)
            }
          >
            Cancel
          </CButton>
          <CButton
            color="success"
            disabled={
              !canCreatePurchaseOrder ||
              !canConvertToPo ||
              !anyProductConfirmed ||
              submitting
            }
            onClick={handleOpenConfirm}
          >
            Convert to sales order
          </CButton>
        </div>
      </div>

      <CModal
        visible={confirmModalVisible}
        onClose={() => !submitting && setConfirmModalVisible(false)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>Convert to sales order?</CModalTitle>
        </CModalHeader>
        <CModalBody>
          A new sales order will be created with {confirmedCount} updated
          product line(s). Other quotation products will not be included. You
          can return later to create additional sales orders from this
          quotation.
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            disabled={submitting}
            onClick={() => setConfirmModalVisible(false)}
          >
            Cancel
          </CButton>
          <CButton
            color="success"
            disabled={submitting}
            onClick={handleCreateSalesOrder}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Converting...
              </>
            ) : (
              "Yes, convert to sales order"
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default FinalizeSalesOrder;
