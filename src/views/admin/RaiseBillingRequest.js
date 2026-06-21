import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilArrowLeft,
  cilCamera,
  cilCheckCircle,
  cilCloudUpload,
  cilSearch,
  cilTrash,
  cilWarning,
} from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBucketService from "../../services/purchaseBucketService";
import billingRequestService from "../../services/billingRequestService";
import supplierService from "../../services/supplierService";
import documentService from "../../services/documentService";
import AuthImage from "../../components/AuthImage/AuthImage";
import { getAssetsUrl } from "../../api/endpoints";
import { toastError } from "../../utils/toast";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const parseProductQuantity = (product) => {
  const quantity = Number(product?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
};

const calcLineAmount = (quantity, rate) => {
  const parsedRate = Number(rate);
  if (quantity == null || !Number.isFinite(parsedRate) || parsedRate <= 0) {
    return null;
  }
  return quantity * parsedRate;
};

const formatInr = (value) =>
  value == null || Number.isNaN(Number(value))
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const docImageUrl = (doc) => {
  if (!doc || typeof doc !== "object") return null;
  const { path, mimeType } = doc;
  if (!path) return null;
  if (
    (mimeType && /^image\//i.test(mimeType)) ||
    /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(path))
  )
    return getAssetsUrl(path);
  return null;
};

const extractUploadedDocument = (response) =>
  (response?.data?.documents ??
    response?.documents ??
    response?.data?.data?.documents ??
    [])[0];

// ─── constants ───────────────────────────────────────────────────────────────

const STEP = { SEARCH: 1, FILL: 2, PAYMENT: 3, REVIEW: 4 };

const blankForm = () => ({
  photos: [], // [{ docId, url }]
  uploadingPhoto: false,
  rate: "",
  errors: {},
});

const SUPPLIER_PAGE_SIZE = 10;

const supplierOptionLabel = (supplier) => {
  if (!supplier) return "—";
  const name = supplier.name || supplier.shopname || "Unnamed supplier";
  return supplier.shopname &&
    supplier.name &&
    supplier.shopname !== supplier.name
    ? `${supplier.name} — ${supplier.shopname}`
    : name;
};

const normalizeSupplierBankDetails = (bankDetails) => {
  const src = bankDetails && typeof bankDetails === "object" ? bankDetails : {};
  return {
    accountNumber: src.accountNumber || "",
    ifscCode: src.ifscCode || "",
    bankName: src.bankName || "",
    accountHolderName: src.accountHolderName || "",
    upiDetails: src.upiDetails || "",
  };
};

const buildSupplierSnapshot = (supplier) => {
  if (!supplier || typeof supplier !== "object") return null;
  return {
    _id: supplier._id ? String(supplier._id) : undefined,
    name: supplier.name || "",
    shopname: supplier.shopname || "",
    address: supplier.address || "",
    phone_1: supplier.phone_1 || "",
    email: supplier.email || "",
    gst: supplier.gst || "",
    bankDetails: normalizeSupplierBankDetails(supplier.bankDetails),
  };
};

// ─── sub-components ──────────────────────────────────────────────────────────

/** Horizontal numbered step indicator */
const StepBar = ({ current }) => {
  const labels = [
    "Find Product",
    "Add Details",
    "Payment Info",
    "Review & Submit",
  ];
  return (
    <div className="d-flex align-items-center justify-content-center mb-4 px-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            <div
              className="d-flex flex-column align-items-center"
              style={{ minWidth: 64 }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  background: done ? "#198754" : active ? "#0d6efd" : "#e9ecef",
                  color: done || active ? "#fff" : "#6c757d",
                  transition: "background 0.25s",
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : n}
              </div>
              <div
                className="mt-1 text-center"
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 400,
                  color: active ? "#0d6efd" : done ? "#198754" : "#6c757d",
                  lineHeight: 1.2,
                }}
              >
                {label}
              </div>
            </div>
            {i < 3 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: current > n ? "#198754" : "#dee2e6",
                  margin: "0 4px",
                  marginBottom: 18,
                  transition: "background 0.25s",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Upload button with icon + label */
const UploadBtn = ({
  icon,
  label,
  color = "primary",
  onClick,
  disabled,
  loading,
}) => (
  <CButton
    color={color}
    variant="outline"
    className="w-100 d-flex flex-column align-items-center justify-content-center gap-1 py-3 rounded"
    style={{ minHeight: 80 }}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading ? (
      <CSpinner size="sm" />
    ) : (
      <CIcon icon={icon} style={{ fontSize: 24 }} />
    )}
    <span style={{ fontSize: 12, fontWeight: 500 }}>
      {loading ? "Uploading…" : label}
    </span>
  </CButton>
);

/** Inline field error */
const FieldError = ({ msg }) =>
  msg ? (
    <div
      className="d-flex align-items-center gap-1 mt-1"
      style={{ color: "#dc3545", fontSize: 12 }}
    >
      <CIcon icon={cilWarning} style={{ fontSize: 13 }} />
      {msg}
    </div>
  ) : null;

/** Product search result card */
const ProductCard = ({ row, inCart, onSelect }) => (
  <div
    role={inCart ? undefined : "button"}
    tabIndex={inCart ? undefined : 0}
    onClick={() => !inCart && onSelect(row)}
    onKeyDown={(e) =>
      !inCart && (e.key === "Enter" || e.key === " ") && onSelect(row)
    }
    style={{
      border: `1.5px solid ${inCart ? "#198754" : "#dee2e6"}`,
      borderRadius: 10,
      padding: "12px 14px",
      cursor: inCart ? "default" : "pointer",
      background: inCart ? "#f0faf4" : "#fff",
      opacity: inCart ? 0.75 : 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      transition: "border-color 0.15s",
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontWeight: 600,
          fontSize: 14,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {fmt(row.productName)}
      </div>
      <div style={{ fontSize: 12, color: "#6c757d", marginTop: 2 }}>
        Sales Order: <strong>{fmt(row.poCode)}</strong>
        {row.quantity
          ? ` · Qty: ${row.quantity}${row.unit ? " " + row.unit : ""}`
          : ""}
      </div>
    </div>
    {inCart ? (
      <CBadge color="success" style={{ flexShrink: 0 }}>
        Added ✓
      </CBadge>
    ) : (
      <CButton color="primary" size="sm" style={{ flexShrink: 0 }}>
        Select →
      </CButton>
    )}
  </div>
);

/** Cart item card */
const CartCard = ({ item, idx, onRemove }) => (
  <div
    style={{
      border: "1.5px solid #dee2e6",
      borderRadius: 10,
      padding: "12px 14px",
      background: "#fff",
    }}
  >
    <div className="d-flex align-items-start gap-3">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {fmt(item.product.productName)}
        </div>
        <div style={{ fontSize: 12, color: "#6c757d", marginTop: 2 }}>
          Sales Order: {fmt(item.product.poCode)}
          {item.product.quantity
            ? ` · Qty: ${item.product.quantity}${item.product.unit ? " " + item.product.unit : ""}`
            : ""}
        </div>
        {item.photos.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-2">
            {item.photos.map((p, i) => (
              <AuthImage
                key={p.docId || i}
                documentId={p.docId}
                fallbackUrl={p.url}
                alt=""
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid #dee2e6",
                }}
              />
            ))}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 16px",
            marginTop: 6,
            fontSize: 13,
          }}
        >
          <span>
            <span style={{ color: "#6c757d" }}>Qty: </span>
            <strong>{fmt(item.product.quantity)}</strong>
          </span>
          <span>
            <span style={{ color: "#6c757d" }}>Unit: </span>
            <strong>{fmt(item.product.unit)}</strong>
          </span>
          <span>
            <span style={{ color: "#6c757d" }}>Rate: </span>
            <strong>{formatInr(item.rate)}</strong>
          </span>
          <span>
            <span style={{ color: "#6c757d" }}>Amount: </span>
            <strong>{formatInr(item.amount)}</strong>
          </span>
        </div>
      </div>
      <CButton
        color="danger"
        variant="ghost"
        size="sm"
        style={{ flexShrink: 0 }}
        onClick={() => onRemove(idx)}
        title="Remove"
      >
        <CIcon icon={cilTrash} />
      </CButton>
    </div>
  </div>
);

// ─── main component ──────────────────────────────────────────────────────────

const RaiseBillingRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectPoProductId = searchParams.get("poProductId")?.trim() || "";
  const backTarget = preselectPoProductId
    ? `/purchase-bucket/${preselectPoProductId}`
    : "/purchase-bucket";
  const topRef = useRef(null);
  const preselectHandledRef = useRef(false);

  const [step, setStep] = useState(STEP.SEARCH);

  // step 1 – search
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  // step 2 – fill
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(blankForm());

  // step 4 – review
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCode, setSubmittedCode] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierSearchDebounced, setSupplierSearchDebounced] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierError, setSupplierError] = useState("");

  // file refs
  const photoGalleryRef = useRef(null);
  const photoCameraRef = useRef(null);

  const scrollTop = () =>
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const goTo = (s) => {
    setStep(s);
    setTimeout(scrollTop, 50);
  };

  // debounce product search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setSupplierSearchDebounced(supplierSearch), 350);
    return () => clearTimeout(t);
  }, [supplierSearch]);

  const loadSuppliers = useCallback(async (searchQuery) => {
    setSuppliersLoading(true);
    try {
      const res = await supplierService.getAll({
        pageNumber: 1,
        pageSize: SUPPLIER_PAGE_SIZE,
        search: searchQuery?.trim() || undefined,
      });
      const data = res?.data || res;
      const list = Array.isArray(data?.suppliers) ? data.suppliers : [];
      setSuppliers(list);
      return list;
    } catch (e) {
      toastError(e?.message || "Failed to load suppliers.");
      setSuppliers([]);
      return [];
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step !== STEP.REVIEW || cart.length === 0) return;
    loadSuppliers(supplierSearchDebounced);
  }, [step, cart.length, supplierSearchDebounced, loadSuppliers]);

  const supplierById = useMemo(() => {
    const map = new Map();
    suppliers.forEach((supplier) => map.set(String(supplier._id), supplier));
    return map;
  }, [suppliers]);

  const supplierSelectOptions = useMemo(() => {
    if (!selectedSupplierId) return suppliers;
    const selected = supplierById.get(String(selectedSupplierId));
    if (!selected) return suppliers;
    const inList = suppliers.some(
      (supplier) => String(supplier._id) === String(selectedSupplierId),
    );
    return inList ? suppliers : [selected, ...suppliers];
  }, [suppliers, selectedSupplierId, supplierById]);

  // fetch open purchase-bucket items (all by default; narrows when user searches)
  useEffect(() => {
    const q = searchDebounced.trim();
    let dead = false;
    setSearching(true);
    purchaseBucketService
      .list({
        ...(q ? { search: q } : {}),
        pageSize: q ? 30 : 100,
        status: "open",
      })
      .then((res) => {
        if (!dead) setResults(res?.data?.data ?? []);
      })
      .catch(() => {
        if (!dead) setResults([]);
      })
      .finally(() => {
        if (!dead) setSearching(false);
      });
    return () => {
      dead = true;
    };
  }, [searchDebounced]);

  const patchForm = (patch) => setForm((f) => ({ ...f, ...patch }));

  const buildFormForProduct = (row) => {
    const attachment = row?.attachmentDocumentId;
    const attachmentId =
      attachment && typeof attachment === "object"
        ? attachment._id
        : attachment;
    const existingUrl = docImageUrl(attachment);
    if (attachmentId && existingUrl) {
      return {
        ...blankForm(),
        photos: [{ docId: String(attachmentId), url: existingUrl }],
      };
    }
    return blankForm();
  };

  // Pre-select product when opened from purchase bucket detail page
  useEffect(() => {
    if (!preselectPoProductId || preselectHandledRef.current) return;
    preselectHandledRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await purchaseBucketService.getById(preselectPoProductId);
        const row = res?.data?.data ?? res?.data;
        if (cancelled || !row?._id) {
          if (!cancelled) toastError("Product not found.");
          return;
        }
        if (cart.some((c) => c.product._id === row._id)) {
          goTo(STEP.REVIEW);
          return;
        }
        setProduct(row);
        setForm(buildFormForProduct(row));
        goTo(STEP.FILL);
      } catch (e) {
        if (!cancelled) toastError(e?.message || "Could not load product.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preselectPoProductId]);

  // ── step 1: select product
  const selectProduct = (row) => {
    if (cart.some((c) => c.product._id === row._id)) {
      toastError("This product is already in the list.");
      return;
    }
    setProduct(row);
    setForm(blankForm());
    goTo(STEP.FILL);
  };

  // ── step 2: uploads
  const uploadPhoto = async (file) => {
    patchForm({ uploadingPhoto: true });
    const localPreview = URL.createObjectURL(file);
    try {
      const up = await documentService.uploadAttachments([file]);
      const doc = extractUploadedDocument(up);
      if (!doc?._id) throw new Error("Upload did not return a document.");
      await purchaseBucketService.setLineAttachment(product._id, {
        attachmentDocumentId: String(doc._id),
      });
      const url =
        localPreview ||
        docImageUrl({ ...doc, mimeType: doc.mimeType || file.type }) ||
        "";
      setForm((f) => ({
        ...f,
        photos: [...f.photos, { docId: String(doc._id), url }],
        uploadingPhoto: false,
        errors: { ...f.errors, photo: undefined },
      }));
    } catch (e) {
      URL.revokeObjectURL(localPreview);
      toastError(e?.message || "Photo upload failed.");
      patchForm({ uploadingPhoto: false });
    }
  };

  const removePhoto = (idx) => {
    setForm((f) => {
      const photo = f.photos[idx];
      if (photo?.url?.startsWith("blob:")) URL.revokeObjectURL(photo.url);
      return { ...f, photos: f.photos.filter((_, i) => i !== idx) };
    });
  };

  const onFileChange = (ref, handler) => (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) handler(f);
  };

  const onMultiFileChange = (handler) => async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const f of files) await handler(f);
  };

  // ── step 2: validate photos → go to payment step
  const nextToPayment = () => {
    if (form.photos.length === 0) {
      patchForm({
        errors: { photo: "At least one product photo is required." },
      });
      document
        .getElementById("rbr-field-photo")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    patchForm({ errors: {} });
    goTo(STEP.PAYMENT);
  };

  // ── step 3: validate payment & add to cart
  const addToCart = () => {
    const errs = {};
    const rate = Number(form.rate);
    const quantity = parseProductQuantity(product);
    const lineAmount = calcLineAmount(quantity, rate);

    if (!form.rate || Number.isNaN(rate) || rate <= 0) {
      errs.rate = "Enter a valid rate greater than zero.";
    } else if (quantity == null) {
      errs.rate = "Product quantity is missing; cannot calculate amount.";
    } else if (lineAmount == null || lineAmount <= 0) {
      errs.rate = "Could not calculate amount from quantity and rate.";
    }

    if (Object.keys(errs).length) {
      patchForm({ errors: errs });
      document
        .getElementById("rbr-payment-rate")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        product,
        photos: form.photos,
        rate,
        amount: lineAmount,
      },
    ]);
    setProduct(null);
    setForm(blankForm());
    setSubmitErrors([]);
    goTo(STEP.REVIEW);
  };

  // ── step 3: submit all as one batch billing request
  const raiseAll = async () => {
    if (!selectedSupplierId) {
      setSupplierError("Please select a supplier before submitting.");
      document
        .getElementById("rbr-supplier-select")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const selectedSupplier =
      supplierById.get(String(selectedSupplierId)) ||
      supplierSelectOptions.find(
        (supplier) => String(supplier._id) === String(selectedSupplierId),
      );
    const supplierSnapshot = buildSupplierSnapshot(selectedSupplier);
    if (!supplierSnapshot) {
      setSupplierError(
        "Selected supplier is no longer available. Choose again.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitErrors([]);
    setSupplierError("");
    try {
      const payload = cart.map((item) => ({
        poProductId: item.product._id,
        productImageDocIds: item.photos.map((p) => p.docId),
        amount: item.amount,
        supplierSnapshot,
      }));
      const res = await billingRequestService.create(payload);
      const code = res?.data?.data?.billingRequestCode || "";
      setSubmitted(true);
      setSubmittedCode(code);
      setCart([]);
      setSelectedSupplierId("");
      setSupplierSearch("");
      setSupplierError("");
      scrollTop();
    } catch (e) {
      setSubmitErrors([
        {
          name: "Request",
          msg: e?.message || "Failed to create billing request",
        },
      ]);
      toastError(e?.message || "Failed to create billing request");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const productQuantity = parseProductQuantity(product);
  const previewLineAmount = calcLineAmount(productQuantity, form.rate);
  const hasValidRate =
    form.rate && !Number.isNaN(Number(form.rate)) && Number(form.rate) > 0;
  const paymentStepComplete =
    hasValidRate && previewLineAmount != null && previewLineAmount > 0;

  return (
    <div ref={topRef}>
      <CRow>
        <CCol xs={12}>
          {/* breadcrumb bar */}
          <CCard className="mb-3">
            <CCardBody className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
              <CBreadcrumb className="mb-0">
                <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
                <CBreadcrumbItem href="#/purchase-bucket">
                  Purchase Bucket
                </CBreadcrumbItem>
                <CBreadcrumbItem active>Raise Billing Request</CBreadcrumbItem>
              </CBreadcrumb>
              <CButton
                color="secondary"
                variant="ghost"
                onClick={() => navigate(backTarget)}
              >
                <CIcon icon={cilArrowLeft} className="me-1" size="sm" />
                Back
              </CButton>
            </CCardBody>
          </CCard>

          {/* step indicator */}
          <StepBar current={step} />

          {/* ─── SUCCESS ────────────────────────────────────────────────── */}
          {submitted && (
            <CCard>
              <CCardBody className="text-center py-5">
                <div style={{ fontSize: 56 }}>🎉</div>
                <h5 className="mt-3 mb-1">Billing request raised!</h5>
                {submittedCode && (
                  <div
                    className="d-inline-block px-3 py-1 rounded mb-3 mt-1"
                    style={{
                      background: "#edf2ff",
                      border: "1.5px solid #0d6efd40",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#0d6efd",
                      letterSpacing: 1,
                    }}
                  >
                    {submittedCode}
                  </div>
                )}
                <p
                  className="text-body-secondary mb-4"
                  style={{ fontSize: 14 }}
                >
                  All products have been submitted for HOD approval. The
                  po_products status has been updated to{" "}
                  <strong>BR Raised</strong>.
                </p>
                <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
                  <CButton color="primary" onClick={() => navigate(backTarget)}>
                    Go to Purchase Bucket
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setSubmittedCode("");
                      setSubmitErrors([]);
                      setSelectedSupplierId("");
                      setSupplierSearch("");
                      setSupplierError("");
                      goTo(STEP.SEARCH);
                    }}
                  >
                    Raise Another
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* ─── STEP 1: SEARCH ─────────────────────────────────────────── */}
          {!submitted && step === STEP.SEARCH && (
            <CCard>
              <CCardBody style={{ paddingBottom: 24 }}>
                <h6 className="mb-1" style={{ fontWeight: 700 }}>
                  Select a product
                </h6>
                <p
                  className="text-body-secondary mb-3"
                  style={{ fontSize: 13 }}
                >
                  Open purchase bucket items are listed below. Use search to
                  narrow by sales order or product name.
                </p>

                <div className="position-relative mb-3">
                  <CIcon
                    icon={cilSearch}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#6c757d",
                      pointerEvents: "none",
                    }}
                  />
                  <CFormInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Sales Order number or product name…"
                    style={{ paddingLeft: 36 }}
                    autoFocus
                  />
                </div>

                {/* searching spinner */}
                {searching && (
                  <div className="d-flex align-items-center gap-2 text-body-secondary small py-3">
                    <CSpinner size="sm" /> Searching…
                  </div>
                )}

                {/* no open items */}
                {!searching && !search.trim() && results.length === 0 && (
                  <div
                    className="text-center py-5 text-body-secondary"
                    style={{ fontSize: 13 }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                    No open purchase bucket items available
                  </div>
                )}

                {/* no search matches */}
                {!searching && search.trim() && results.length === 0 && (
                  <div
                    className="text-center py-4 text-body-secondary"
                    style={{ fontSize: 13 }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                    No products found for "{search}"
                  </div>
                )}

                {/* suggestions */}
                {results.length > 0 && (
                  <div>
                    <div
                      className="mb-2"
                      style={{
                        fontSize: 12,
                        color: "#6c757d",
                        fontWeight: 600,
                      }}
                    >
                      {search.trim()
                        ? "Search results"
                        : "Open purchase bucket items"}
                    </div>
                    <div className="d-flex flex-column gap-2">
                      {results.map((row) => (
                        <ProductCard
                          key={row._id}
                          row={row}
                          inCart={cart.some((c) => c.product._id === row._id)}
                          onSelect={selectProduct}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* cart hint when results are showing */}
                {cart.length > 0 && (
                  <div
                    className="d-flex align-items-center justify-content-between mt-4 p-3 rounded"
                    style={{
                      background: "#edf2ff",
                      border: "1.5px solid #0d6efd30",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {cart.length} product{cart.length > 1 ? "s" : ""} ready to
                      submit
                    </span>
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => goTo(STEP.REVIEW)}
                    >
                      Review & Submit →
                    </CButton>
                  </div>
                )}
              </CCardBody>
            </CCard>
          )}

          {/* ─── STEP 2: FILL DETAILS ───────────────────────────────────── */}
          {!submitted && step === STEP.FILL && product && (
            <div>
              {/* selected product header */}
              <div
                className="d-flex align-items-center gap-3 p-3 mb-3 rounded"
                style={{
                  background: "#edf2ff",
                  border: "1.5px solid #0d6efd40",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmt(product.productName)}
                  </div>
                  <div style={{ fontSize: 12, color: "#0d6efd", marginTop: 2 }}>
                    Sales Order: {fmt(product.poCode)}
                    {product.quantity
                      ? ` · Qty: ${product.quantity}${product.unit ? " " + product.unit : ""}`
                      : ""}
                  </div>
                </div>
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setProduct(null);
                    goTo(STEP.SEARCH);
                  }}
                >
                  Change
                </CButton>
              </div>

              {/* ① Product Photos */}
              <CCard className="mb-3" id="rbr-field-photo">
                <CCardBody>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background:
                          form.photos.length > 0 ? "#198754" : "#0d6efd",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {form.photos.length > 0 ? "✓" : "1"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        Product Photos{" "}
                        <span style={{ color: "#dc3545" }}>*</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6c757d" }}>
                        Upload one or more clear photos of the product
                      </div>
                    </div>
                  </div>

                  {form.photos.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {form.photos.map((p, i) => (
                        <div
                          key={p.docId || i}
                          style={{ position: "relative" }}
                        >
                          <AuthImage
                            documentId={p.docId}
                            fallbackUrl={p.url}
                            alt=""
                            style={{
                              width: 80,
                              height: 80,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1.5px solid #dee2e6",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "#dc3545",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={photoGalleryRef}
                    className="d-none"
                    onChange={onMultiFileChange(uploadPhoto)}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={photoCameraRef}
                    className="d-none"
                    onChange={onFileChange(photoCameraRef, uploadPhoto)}
                  />

                  <CRow className="g-2">
                    <CCol xs={6}>
                      <UploadBtn
                        icon={cilCamera}
                        label="Take Photo"
                        color="info"
                        loading={form.uploadingPhoto}
                        onClick={() => photoCameraRef.current?.click()}
                      />
                    </CCol>
                    <CCol xs={6}>
                      <UploadBtn
                        icon={cilCloudUpload}
                        label="Upload Photos"
                        color="primary"
                        loading={form.uploadingPhoto}
                        onClick={() => photoGalleryRef.current?.click()}
                      />
                    </CCol>
                  </CRow>
                  {form.photos.length > 0 && (
                    <div
                      className="d-flex align-items-center gap-1 mt-2"
                      style={{ color: "#198754", fontSize: 12 }}
                    >
                      <CIcon icon={cilCheckCircle} style={{ fontSize: 13 }} />
                      {form.photos.length} photo
                      {form.photos.length !== 1 ? "s" : ""} added — tap above to
                      add more
                    </div>
                  )}
                  <FieldError msg={form.errors.photo} />
                </CCardBody>
              </CCard>

              {/* sticky next bar */}
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  background: "#fff",
                  borderTop: "1.5px solid #dee2e6",
                  padding: "12px 0",
                  marginTop: 8,
                  zIndex: 10,
                }}
              >
                <CRow className="g-2">
                  <CCol xs={6}>
                    <CButton
                      color="secondary"
                      variant="outline"
                      className="w-100"
                      onClick={() => {
                        setProduct(null);
                        goTo(STEP.SEARCH);
                      }}
                    >
                      ← Back to Search
                    </CButton>
                  </CCol>
                  <CCol xs={6}>
                    <CButton
                      color="primary"
                      className="w-100"
                      disabled={form.uploadingPhoto}
                      onClick={nextToPayment}
                    >
                      {form.uploadingPhoto ? (
                        <span className="d-inline-flex align-items-center gap-2">
                          <CSpinner size="sm" /> Uploading…
                        </span>
                      ) : (
                        "Next → Payment Info"
                      )}
                    </CButton>
                  </CCol>
                </CRow>
              </div>
            </div>
          )}

          {/* ─── STEP 3: PAYMENT INFO ───────────────────────────────────── */}
          {!submitted && step === STEP.PAYMENT && product && (
            <div>
              {/* selected product header */}
              <div
                className="d-flex align-items-center gap-3 p-3 mb-3 rounded"
                style={{
                  background: "#edf2ff",
                  border: "1.5px solid #0d6efd40",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmt(product.productName)}
                  </div>
                  <div style={{ fontSize: 12, color: "#0d6efd", marginTop: 2 }}>
                    Sales Order: {fmt(product.poCode)} · {form.photos.length}{" "}
                    photo{form.photos.length !== 1 ? "s" : ""} attached
                  </div>
                </div>
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  onClick={() => goTo(STEP.FILL)}
                >
                  ← Edit Photos
                </CButton>
              </div>

              {/* Payment details */}
              <CCard className="mb-3" id="rbr-payment-rate">
                <CCardBody>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: paymentStepComplete ? "#198754" : "#0d6efd",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {paymentStepComplete ? "✓" : "1"}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Payment Details
                    </div>
                  </div>
                  <CRow className="g-3">
                    <CCol xs={6} md={3}>
                      <CFormLabel className="fw-semibold">Quantity</CFormLabel>
                      <CFormInput
                        readOnly
                        disabled
                        value={
                          product?.quantity != null && product?.quantity !== ""
                            ? String(product.quantity)
                            : "—"
                        }
                        style={{ background: "#f8f9fa" }}
                      />
                    </CCol>
                    <CCol xs={6} md={3}>
                      <CFormLabel className="fw-semibold">Unit</CFormLabel>
                      <CFormInput
                        readOnly
                        disabled
                        value={product?.unit ? String(product.unit) : "—"}
                        style={{ background: "#f8f9fa" }}
                      />
                    </CCol>
                    <CCol xs={6} md={3}>
                      <CFormLabel className="fw-semibold">
                        Rate <span style={{ color: "#dc3545" }}>*</span>
                      </CFormLabel>
                      <div className="position-relative">
                        <div
                          style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontWeight: 700,
                            color: "#495057",
                            fontSize: 16,
                            pointerEvents: "none",
                          }}
                        >
                          ₹
                        </div>
                        <CFormInput
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.rate}
                          onChange={(e) =>
                            patchForm({
                              rate: e.target.value,
                              errors: { ...form.errors, rate: undefined },
                            })
                          }
                          style={{
                            paddingLeft: 28,
                            fontSize: 18,
                            fontWeight: 600,
                          }}
                        />
                      </div>
                      <FieldError msg={form.errors.rate} />
                    </CCol>
                    <CCol xs={6} md={3}>
                      <CFormLabel className="fw-semibold">Amount</CFormLabel>
                      <div className="position-relative">
                        <div
                          style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontWeight: 700,
                            color: "#495057",
                            fontSize: 16,
                            pointerEvents: "none",
                          }}
                        >
                          ₹
                        </div>
                        <CFormInput
                          readOnly
                          disabled
                          value={
                            previewLineAmount != null
                              ? previewLineAmount.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : "—"
                          }
                          style={{
                            paddingLeft: 28,
                            fontSize: 18,
                            fontWeight: 600,
                            background: "#f8f9fa",
                          }}
                        />
                      </div>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>

              {/* sticky add-to-list bar */}
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  background: "#fff",
                  borderTop: "1.5px solid #dee2e6",
                  padding: "12px 0",
                  marginTop: 8,
                  zIndex: 10,
                }}
              >
                <CRow className="g-2">
                  <CCol xs={6}>
                    <CButton
                      color="secondary"
                      variant="outline"
                      className="w-100"
                      onClick={() => goTo(STEP.FILL)}
                    >
                      ← Back to Photos
                    </CButton>
                  </CCol>
                  <CCol xs={6}>
                    <CButton
                      color="success"
                      className="w-100"
                      onClick={addToCart}
                    >
                      Add to List →
                    </CButton>
                  </CCol>
                </CRow>
              </div>
            </div>
          )}

          {/* ─── STEP 3: REVIEW ─────────────────────────────────────────── */}
          {!submitted && step === STEP.REVIEW && (
            <div>
              {/* error banner */}
              {submitErrors.length > 0 && (
                <CAlert color="danger" className="mb-3">
                  <strong>Some requests failed. Fix and try again:</strong>
                  <ul className="mb-0 mt-1 ps-3 small">
                    {submitErrors.map((e, i) => (
                      <li key={i}>
                        <strong>{e.name}</strong>: {e.msg}
                      </li>
                    ))}
                  </ul>
                </CAlert>
              )}

              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h6 className="mb-0" style={{ fontWeight: 700 }}>
                    Review your list
                    <CBadge color="primary" className="ms-2">
                      {cart.length}
                    </CBadge>
                  </h6>
                  <div style={{ fontSize: 12, color: "#6c757d", marginTop: 2 }}>
                    Check everything below before submitting
                  </div>
                </div>
                <CButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  onClick={() => goTo(STEP.SEARCH)}
                >
                  + Add Another
                </CButton>
              </div>

              {cart.length === 0 ? (
                <CCard>
                  <CCardBody
                    className="text-center py-5 text-body-secondary"
                    style={{ fontSize: 13 }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                    No products added yet.{" "}
                    <span
                      role="button"
                      style={{ color: "#0d6efd", cursor: "pointer" }}
                      onClick={() => goTo(STEP.SEARCH)}
                    >
                      Go back to search →
                    </span>
                  </CCardBody>
                </CCard>
              ) : (
                <>
                  <CCard className="mb-3" id="rbr-supplier-select">
                    <CCardBody>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: selectedSupplierId
                              ? "#198754"
                              : "#0d6efd",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {selectedSupplierId ? "✓" : "1"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            Select supplier{" "}
                            <span style={{ color: "#dc3545" }}>*</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#6c757d" }}>
                            Search and choose the supplier for this billing
                            request
                          </div>
                        </div>
                      </div>

                      <CRow className="g-2 align-items-end">
                        <CCol xs={12} md={5}>
                          <CFormLabel className="fw-semibold mb-1">
                            Search supplier
                          </CFormLabel>
                          <div className="position-relative">
                            <CIcon
                              icon={cilSearch}
                              style={{
                                position: "absolute",
                                left: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#6c757d",
                                pointerEvents: "none",
                              }}
                            />
                            <CFormInput
                              value={supplierSearch}
                              onChange={(e) =>
                                setSupplierSearch(e.target.value)
                              }
                              placeholder="Name, shop, phone, email, GST…"
                              style={{ paddingLeft: 36 }}
                            />
                          </div>
                          {supplierSearch.trim() && !suppliersLoading && (
                            <div
                              style={{ fontSize: 12, color: "#6c757d" }}
                              className="mt-1"
                            >
                              {suppliers.length} supplier
                              {suppliers.length !== 1 ? "s" : ""} found
                            </div>
                          )}
                        </CCol>
                        <CCol xs={12} md={7}>
                          <CFormLabel className="fw-semibold mb-1">
                            Supplier
                          </CFormLabel>
                          <div className="d-flex align-items-center gap-2">
                            <CFormSelect
                              value={selectedSupplierId}
                              onChange={(e) => {
                                setSelectedSupplierId(e.target.value);
                                setSupplierError("");
                              }}
                              disabled={suppliersLoading}
                              style={{ flex: 1 }}
                            >
                              <option value="">
                                {suppliersLoading
                                  ? "Loading suppliers…"
                                  : supplierSelectOptions.length
                                    ? "— Select supplier —"
                                    : "No suppliers found — change search"}
                              </option>
                              {supplierSelectOptions.map((supplier) => (
                                <option
                                  key={supplier._id}
                                  value={String(supplier._id)}
                                >
                                  {supplierOptionLabel(supplier)}
                                </option>
                              ))}
                            </CFormSelect>
                            {suppliersLoading && <CSpinner size="sm" />}
                          </div>
                          {!suppliersLoading &&
                            !supplierSearch.trim() &&
                            supplierSelectOptions.length > 0 && (
                              <div
                                style={{ fontSize: 12, color: "#6c757d" }}
                                className="mt-1"
                              >
                                Showing first {SUPPLIER_PAGE_SIZE} suppliers.
                                Use search to find more.
                              </div>
                            )}
                        </CCol>
                      </CRow>
                      <FieldError msg={supplierError} />
                    </CCardBody>
                  </CCard>

                  <div className="d-flex flex-column gap-3 mb-3">
                    {cart.map((item, idx) => (
                      <CartCard
                        key={idx}
                        item={item}
                        idx={idx}
                        onRemove={(i) => {
                          setCart((p) => p.filter((_, j) => j !== i));
                          if (cart.length === 1) goTo(STEP.SEARCH);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* total summary */}
              {cart.length > 0 && (
                <div
                  className="d-flex align-items-center justify-content-between p-3 rounded mb-3"
                  style={{
                    background: "#f8f9fa",
                    border: "1.5px solid #dee2e6",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Total amount</span>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>
                    {formatInr(
                      cart.reduce((sum, item) => sum + item.amount, 0),
                    )}
                  </span>
                </div>
              )}

              {/* sticky submit bar */}
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  background: "#fff",
                  borderTop: "1.5px solid #dee2e6",
                  padding: "12px 0",
                  zIndex: 10,
                }}
              >
                <CRow className="g-2">
                  <CCol xs={5}>
                    <CButton
                      color="secondary"
                      variant="outline"
                      className="w-100"
                      disabled={submitting}
                      onClick={() => goTo(STEP.SEARCH)}
                    >
                      ← Add More
                    </CButton>
                  </CCol>
                  <CCol xs={7}>
                    <CButton
                      color="primary"
                      className="w-100"
                      disabled={submitting || cart.length === 0}
                      onClick={raiseAll}
                    >
                      {submitting ? (
                        <span className="d-inline-flex align-items-center gap-2">
                          <CSpinner size="sm" /> Submitting…
                        </span>
                      ) : (
                        `Raise Request (${cart.length})`
                      )}
                    </CButton>
                  </CCol>
                </CRow>
              </div>
            </div>
          )}
        </CCol>
      </CRow>
    </div>
  );
};

export default RaiseBillingRequest;
