import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  UploadCloud,
  Search,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Spinner,
} from "../../components/ui";
import { PageHeader, BackButton } from "../../components";
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
    <div className="mb-4 flex items-center justify-center px-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            <div
              className="flex flex-col items-center"
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
const UploadBtn = ({ icon: Icon, label, onClick, disabled, loading }) => (
  <Button
    type="button"
    variant="outline"
    className="flex w-full flex-col items-center justify-center gap-1 rounded py-3"
    style={{ minHeight: 80 }}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading ? (
      <Spinner size="sm" />
    ) : (
      <Icon style={{ width: 24, height: 24 }} />
    )}
    <span style={{ fontSize: 12, fontWeight: 500 }}>
      {loading ? "Uploading…" : label}
    </span>
  </Button>
);

/** Inline field error */
const FieldError = ({ msg }) =>
  msg ? (
    <div
      className="mt-1 flex items-center gap-1 text-destructive"
      style={{ fontSize: 12 }}
    >
      <AlertTriangle style={{ width: 13, height: 13 }} />
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
    className={
      inCart
        ? "border-[1.5px] border-success! bg-success-muted"
        : "border-[1.5px] border-border bg-background"
    }
    style={{
      borderRadius: 10,
      padding: "12px 14px",
      cursor: inCart ? "default" : "pointer",
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
      <div
        className="text-muted-foreground"
        style={{ fontSize: 12, marginTop: 2 }}
      >
        Sales Order: <strong>{fmt(row.poCode)}</strong>
        {row.quantity
          ? ` · Qty: ${row.quantity}${row.unit ? " " + row.unit : ""}`
          : ""}
      </div>
    </div>
    {inCart ? (
      <Badge variant="success" style={{ flexShrink: 0 }}>
        Added ✓
      </Badge>
    ) : (
      <Button type="button" size="sm" style={{ flexShrink: 0 }}>
        Select →
      </Button>
    )}
  </div>
);

/** Cart item card */
const CartCard = ({ item, idx, onRemove }) => (
  <div
    className="border-[1.5px] border-border bg-background"
    style={{
      borderRadius: 10,
      padding: "12px 14px",
    }}
  >
    <div className="flex items-start gap-3">
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
        <div
          className="text-muted-foreground"
          style={{ fontSize: 12, marginTop: 2 }}
        >
          Sales Order: {fmt(item.product.poCode)}
          {item.product.quantity
            ? ` · Qty: ${item.product.quantity}${item.product.unit ? " " + item.product.unit : ""}`
            : ""}
        </div>
        {item.photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.photos.map((p, i) => (
              <AuthImage
                key={p.docId || i}
                documentId={p.docId}
                fallbackUrl={p.url}
                alt=""
                className="border border-border"
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "cover",
                  borderRadius: 6,
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
            <span className="text-muted-foreground">Qty: </span>
            <strong>{fmt(item.product.quantity)}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">Unit: </span>
            <strong>{fmt(item.product.unit)}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">Rate: </span>
            <strong>{formatInr(item.rate)}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">Amount: </span>
            <strong>{formatInr(item.amount)}</strong>
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        style={{ flexShrink: 0 }}
        onClick={() => onRemove(idx)}
        title="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
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
      <div className="mb-4">
        <BackButton fallback={backTarget} />
      </div>

      <PageHeader
        title="Raise Billing Request"
        description="Purchase Bucket · Raise Billing Request"
      />

      {/* step indicator */}
      <StepBar current={step} />

      {/* ─── SUCCESS ────────────────────────────────────────────────── */}
      {submitted && (
        <Card>
          <CardContent className="py-5 text-center">
            <div style={{ fontSize: 56 }}>🎉</div>
            <h5 className="mb-1 mt-3">Billing request raised!</h5>
            {submittedCode && (
              <div
                className="mb-3 mt-1 inline-block rounded px-3 py-1 bg-accent border-[1.5px] border-primary/40 text-primary!"
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: 1,
                }}
              >
                {submittedCode}
              </div>
            )}
            <p className="mb-4 text-muted-foreground" style={{ fontSize: 14 }}>
              All products have been submitted for HOD approval. The po_products
              status has been updated to <strong>BR Raised</strong>.
            </p>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Button type="button" onClick={() => navigate(backTarget)}>
                Go to Purchase Bucket
              </Button>
              <Button
                type="button"
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
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 1: SEARCH ─────────────────────────────────────────── */}
      {!submitted && step === STEP.SEARCH && (
        <Card>
          <CardContent style={{ paddingBottom: 24 }}>
            <h6 className="mb-1" style={{ fontWeight: 700 }}>
              Select a product
            </h6>
            <p className="mb-3 text-muted-foreground" style={{ fontSize: 13 }}>
              Open purchase bucket items are listed below. Use search to narrow
              by sales order or product name.
            </p>

            <div className="relative mb-3">
              <Search
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  pointerEvents: "none",
                }}
                className="text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sales Order number or product name…"
                style={{ paddingLeft: 36 }}
                autoFocus
              />
            </div>

            {/* searching spinner */}
            {searching && (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Spinner size="sm" /> Searching…
              </div>
            )}

            {/* no open items */}
            {!searching && !search.trim() && results.length === 0 && (
              <div
                className="py-5 text-center text-muted-foreground"
                style={{ fontSize: 13 }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                No open purchase bucket items available
              </div>
            )}

            {/* no search matches */}
            {!searching && search.trim() && results.length === 0 && (
              <div
                className="py-4 text-center text-muted-foreground"
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
                  className="mb-2 text-muted-foreground"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {search.trim()
                    ? "Search results"
                    : "Open purchase bucket items"}
                </div>
                <div className="flex flex-col gap-2">
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
              <div className="mt-4 flex items-center justify-between rounded p-3 bg-accent border-[1.5px] border-primary/30">
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {cart.length} product{cart.length > 1 ? "s" : ""} ready to
                  submit
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => goTo(STEP.REVIEW)}
                >
                  Review & Submit →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── STEP 2: FILL DETAILS ───────────────────────────────────── */}
      {!submitted && step === STEP.FILL && product && (
        <div>
          {/* selected product header */}
          <div className="mb-3 flex items-center gap-3 rounded p-3 bg-accent border-[1.5px] border-primary/40">
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
              <div
                className="text-primary!"
                style={{ fontSize: 12, marginTop: 2 }}
              >
                Sales Order: {fmt(product.poCode)}
                {product.quantity
                  ? ` · Qty: ${product.quantity}${product.unit ? " " + product.unit : ""}`
                  : ""}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setProduct(null);
                goTo(STEP.SEARCH);
              }}
            >
              Change
            </Button>
          </div>

          {/* ① Product Photos */}
          <Card className="mb-3" id="rbr-field-photo">
            <CardContent>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={
                    form.photos.length > 0
                      ? "bg-success! text-success-foreground"
                      : "bg-primary! text-primary-foreground"
                  }
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
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
                    Product Photos <span className="text-destructive">*</span>
                  </div>
                  <div
                    className="text-muted-foreground"
                    style={{ fontSize: 12 }}
                  >
                    Upload one or more clear photos of the product
                  </div>
                </div>
              </div>

              {form.photos.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {form.photos.map((p, i) => (
                    <div key={p.docId || i} style={{ position: "relative" }}>
                      <AuthImage
                        documentId={p.docId}
                        fallbackUrl={p.url}
                        alt=""
                        className="border-[1.5px] border-border"
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="bg-destructive text-destructive-foreground"
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
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
                className="hidden"
                onChange={onMultiFileChange(uploadPhoto)}
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={photoCameraRef}
                className="hidden"
                onChange={onFileChange(photoCameraRef, uploadPhoto)}
              />

              <div className="grid grid-cols-2 gap-2">
                <UploadBtn
                  icon={Camera}
                  label="Take Photo"
                  loading={form.uploadingPhoto}
                  onClick={() => photoCameraRef.current?.click()}
                />
                <UploadBtn
                  icon={UploadCloud}
                  label="Upload Photos"
                  loading={form.uploadingPhoto}
                  onClick={() => photoGalleryRef.current?.click()}
                />
              </div>
              {form.photos.length > 0 && (
                <div
                  className="mt-2 flex items-center gap-1 text-success!"
                  style={{ fontSize: 12 }}
                >
                  <CheckCircle2 style={{ width: 13, height: 13 }} />
                  {form.photos.length} photo
                  {form.photos.length !== 1 ? "s" : ""} added — tap above to add
                  more
                </div>
              )}
              <FieldError msg={form.errors.photo} />
            </CardContent>
          </Card>

          {/* sticky next bar */}
          <div
            className="bg-background border-t-[1.5px] border-border"
            style={{
              position: "sticky",
              bottom: 0,
              padding: "12px 0",
              marginTop: 8,
              zIndex: 10,
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setProduct(null);
                  goTo(STEP.SEARCH);
                }}
              >
                ← Back to Search
              </Button>
              <Button
                type="button"
                className="w-full"
                disabled={form.uploadingPhoto}
                onClick={nextToPayment}
              >
                {form.uploadingPhoto ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" /> Uploading…
                  </span>
                ) : (
                  "Next → Payment Info"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: PAYMENT INFO ───────────────────────────────────── */}
      {!submitted && step === STEP.PAYMENT && product && (
        <div>
          {/* selected product header */}
          <div className="mb-3 flex items-center gap-3 rounded p-3 bg-accent border-[1.5px] border-primary/40">
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
              <div
                className="text-primary!"
                style={{ fontSize: 12, marginTop: 2 }}
              >
                Sales Order: {fmt(product.poCode)} · {form.photos.length} photo
                {form.photos.length !== 1 ? "s" : ""} attached
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => goTo(STEP.FILL)}
            >
              ← Edit Photos
            </Button>
          </div>

          {/* Payment details */}
          <Card className="mb-3" id="rbr-payment-rate">
            <CardContent>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={
                    paymentStepComplete
                      ? "bg-success! text-success-foreground"
                      : "bg-primary! text-primary-foreground"
                  }
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <Label className="font-semibold">Quantity</Label>
                  <Input
                    readOnly
                    disabled
                    value={
                      product?.quantity != null && product?.quantity !== ""
                        ? String(product.quantity)
                        : "—"
                    }
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label className="font-semibold">Unit</Label>
                  <Input
                    readOnly
                    disabled
                    value={product?.unit ? String(product.unit) : "—"}
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label className="font-semibold">
                    Rate <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 700,
                        fontSize: 16,
                        pointerEvents: "none",
                      }}
                      className="text-secondary-foreground"
                    >
                      ₹
                    </div>
                    <Input
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
                </div>
                <div>
                  <Label className="font-semibold">Amount</Label>
                  <div className="relative">
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 700,
                        fontSize: 16,
                        pointerEvents: "none",
                      }}
                      className="text-secondary-foreground"
                    >
                      ₹
                    </div>
                    <Input
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
                      className="bg-muted"
                      style={{
                        paddingLeft: 28,
                        fontSize: 18,
                        fontWeight: 600,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* sticky add-to-list bar */}
          <div
            className="bg-background border-t-[1.5px] border-border"
            style={{
              position: "sticky",
              bottom: 0,
              padding: "12px 0",
              marginTop: 8,
              zIndex: 10,
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => goTo(STEP.FILL)}
              >
                ← Back to Photos
              </Button>
              <Button
                type="button"
                variant="success"
                className="w-full"
                onClick={addToCart}
              >
                Add to List →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: REVIEW ─────────────────────────────────────────── */}
      {!submitted && step === STEP.REVIEW && (
        <div>
          {/* error banner */}
          {submitErrors.length > 0 && (
            <Alert variant="destructive" className="mb-3">
              <AlertDescription>
                <strong>Some requests failed. Fix and try again:</strong>
                <ul className="mb-0 mt-1 pl-3 text-sm">
                  {submitErrors.map((e, i) => (
                    <li key={i}>
                      <strong>{e.name}</strong>: {e.msg}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-3 flex items-center justify-between">
            <div>
              <h6 className="mb-0" style={{ fontWeight: 700 }}>
                Review your list
                <Badge className="ms-2 ml-2">{cart.length}</Badge>
              </h6>
              <div
                className="text-muted-foreground"
                style={{ fontSize: 12, marginTop: 2 }}
              >
                Check everything below before submitting
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goTo(STEP.SEARCH)}
            >
              + Add Another
            </Button>
          </div>

          {cart.length === 0 ? (
            <Card>
              <CardContent
                className="py-5 text-center text-muted-foreground"
                style={{ fontSize: 13 }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                No products added yet.{" "}
                <span
                  role="button"
                  className="text-primary!"
                  style={{ cursor: "pointer" }}
                  onClick={() => goTo(STEP.SEARCH)}
                >
                  Go back to search →
                </span>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-3" id="rbr-supplier-select">
                <CardContent>
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={
                        selectedSupplierId
                          ? "bg-success! text-success-foreground"
                          : "bg-primary! text-primary-foreground"
                      }
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
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
                        <span className="text-destructive">*</span>
                      </div>
                      <div
                        className="text-muted-foreground"
                        style={{ fontSize: 12 }}
                      >
                        Search and choose the supplier for this billing request
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
                    <div className="md:col-span-5">
                      <Label className="mb-1 font-semibold">
                        Search supplier
                      </Label>
                      <div className="relative">
                        <Search
                          style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 16,
                            height: 16,
                            pointerEvents: "none",
                          }}
                          className="text-muted-foreground"
                        />
                        <Input
                          value={supplierSearch}
                          onChange={(e) => setSupplierSearch(e.target.value)}
                          placeholder="Name, shop, phone, email, GST…"
                          style={{ paddingLeft: 36 }}
                        />
                      </div>
                      {supplierSearch.trim() && !suppliersLoading && (
                        <div
                          style={{ fontSize: 12 }}
                          className="mt-1 text-muted-foreground"
                        >
                          {suppliers.length} supplier
                          {suppliers.length !== 1 ? "s" : ""} found
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-7">
                      <Label className="mb-1 font-semibold">Supplier</Label>
                      <div className="flex items-center gap-2">
                        <Select
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
                        </Select>
                        {suppliersLoading && <Spinner size="sm" />}
                      </div>
                      {!suppliersLoading &&
                        !supplierSearch.trim() &&
                        supplierSelectOptions.length > 0 && (
                          <div
                            style={{ fontSize: 12 }}
                            className="mt-1 text-muted-foreground"
                          >
                            Showing first {SUPPLIER_PAGE_SIZE} suppliers. Use
                            search to find more.
                          </div>
                        )}
                    </div>
                  </div>
                  <FieldError msg={supplierError} />
                </CardContent>
              </Card>

              <div className="mb-3 flex flex-col gap-3">
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
            <div className="mb-3 flex items-center justify-between rounded p-3 bg-muted border-[1.5px] border-border">
              <span style={{ fontWeight: 600 }}>Total amount</span>
              <span style={{ fontWeight: 700, fontSize: 18 }}>
                {formatInr(cart.reduce((sum, item) => sum + item.amount, 0))}
              </span>
            </div>
          )}

          {/* sticky submit bar */}
          <div
            className="bg-background border-t-[1.5px] border-border"
            style={{
              position: "sticky",
              bottom: 0,
              padding: "12px 0",
              zIndex: 10,
            }}
          >
            <div className="grid grid-cols-12 gap-2">
              <Button
                type="button"
                variant="outline"
                className="col-span-5 w-full"
                disabled={submitting}
                onClick={() => goTo(STEP.SEARCH)}
              >
                ← Add More
              </Button>
              <Button
                type="button"
                className="col-span-7 w-full"
                disabled={submitting || cart.length === 0}
                onClick={raiseAll}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" /> Submitting…
                  </span>
                ) : (
                  `Raise Request (${cart.length})`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RaiseBillingRequest;
