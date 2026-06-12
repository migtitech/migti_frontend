import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
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
import documentService from "../../services/documentService";
import { toastError } from "../../utils/toast";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const assetUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:7200/api")
    .replace(/\/api\/?$/i, "")
    .replace(/\/$/, "");
  return `${base}/assets/${path}`;
};

const docImageUrl = (doc) => {
  if (!doc || typeof doc !== "object") return null;
  const { path, mimeType } = doc;
  if (!path) return null;
  if (
    (mimeType && /^image\//i.test(mimeType)) ||
    /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(path))
  )
    return assetUrl(path);
  return null;
};

// ─── constants ───────────────────────────────────────────────────────────────

const STEP = { SEARCH: 1, FILL: 2, PAYMENT: 3, REVIEW: 4 };

const blankForm = () => ({
  photos: [], // [{ docId, url }]
  uploadingPhoto: false,
  amount: "",
  errors: {},
});

// ─── sub-components ──────────────────────────────────────────────────────────

/** Horizontal numbered step indicator */
const StepBar = ({ current }) => {
  const labels = ["Find Product", "Add Details", "Payment Info", "Review & Submit"];
  return (
    <div className="d-flex align-items-center justify-content-center mb-4 px-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            <div className="d-flex flex-column align-items-center" style={{ minWidth: 64 }}>
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
const UploadBtn = ({ icon, label, color = "primary", onClick, disabled, loading }) => (
  <CButton
    color={color}
    variant="outline"
    className="w-100 d-flex flex-column align-items-center justify-content-center gap-1 py-3 rounded"
    style={{ minHeight: 80 }}
    onClick={onClick}
    disabled={disabled || loading}
  >
    {loading
      ? <CSpinner size="sm" />
      : <CIcon icon={icon} style={{ fontSize: 24 }} />}
    <span style={{ fontSize: 12, fontWeight: 500 }}>{loading ? "Uploading…" : label}</span>
  </CButton>
);


/** Inline field error */
const FieldError = ({ msg }) =>
  msg ? (
    <div className="d-flex align-items-center gap-1 mt-1" style={{ color: "#dc3545", fontSize: 12 }}>
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
    onKeyDown={(e) => !inCart && (e.key === "Enter" || e.key === " ") && onSelect(row)}
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
        {row.quantity ? ` · Qty: ${row.quantity}${row.unit ? " " + row.unit : ""}` : ""}
      </div>
    </div>
    {inCart ? (
      <CBadge color="success" style={{ flexShrink: 0 }}>Added ✓</CBadge>
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
              <img
                key={i}
                src={p.url}
                alt=""
                style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #dee2e6" }}
              />
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 6, fontSize: 13 }}>
          <span>
            <span style={{ color: "#6c757d" }}>Amount: </span>
            <strong>₹{Number(item.amount).toLocaleString("en-IN")}</strong>
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
  const topRef = useRef(null);

  const [step, setStep] = useState(STEP.SEARCH);

  // step 1 – search
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  // step 2 – fill
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(blankForm());

  // step 3 – review
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCode, setSubmittedCode] = useState("");

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

  // fetch product search
  useEffect(() => {
    const q = searchDebounced.trim();
    if (!q) { setResults([]); return; }
    let dead = false;
    setSearching(true);
    purchaseBucketService
      .list({ search: q, pageSize: 30, status: 'open' })
      .then((res) => { if (!dead) setResults(res?.data?.data ?? []); })
      .catch(() => { if (!dead) setResults([]); })
      .finally(() => { if (!dead) setSearching(false); });
    return () => { dead = true; };
  }, [searchDebounced]);

  const patchForm = (patch) => setForm((f) => ({ ...f, ...patch }));

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
    try {
      const up = await documentService.uploadAttachments([file]);
      const doc = (up?.data?.documents ?? up?.documents ?? [])[0];
      if (!doc?._id) throw new Error("Upload did not return a document.");
      await purchaseBucketService.setLineAttachment(product._id, {
        attachmentDocumentId: String(doc._id),
      });
      const url = docImageUrl(doc) || "";
      setForm((f) => ({
        ...f,
        photos: [...f.photos, { docId: String(doc._id), url }],
        uploadingPhoto: false,
        errors: { ...f.errors, photo: undefined },
      }));
    } catch (e) {
      toastError(e?.message || "Photo upload failed.");
      patchForm({ uploadingPhoto: false });
    }
  };

  const removePhoto = (idx) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
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
      patchForm({ errors: { photo: "At least one product photo is required." } });
      document.getElementById("rbr-field-photo")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    patchForm({ errors: {} });
    goTo(STEP.PAYMENT);
  };

  // ── step 3: validate payment & add to cart
  const addToCart = () => {
    const errs = {};
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0)
      errs.amount = "Enter a valid amount greater than zero.";

    if (Object.keys(errs).length) {
      patchForm({ errors: errs });
      const firstKey = Object.keys(errs)[0];
      document
        .getElementById(`rbr-payment-${firstKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        product,
        photos: form.photos,
        amount: amt,
      },
    ]);
    setProduct(null);
    setForm(blankForm());
    setSubmitErrors([]);
    goTo(STEP.REVIEW);
  };

  // ── step 3: submit all as one batch billing request
  const raiseAll = async () => {
    setSubmitting(true);
    setSubmitErrors([]);
    try {
      const payload = cart.map((item) => ({
        poProductId: item.product._id,
        productImageDocIds: item.photos.map((p) => p.docId),
        amount: item.amount,
      }));
      const res = await billingRequestService.create(payload);
      const code = res?.data?.data?.billingRequestCode || "";
      setSubmitted(true);
      setSubmittedCode(code);
      setCart([]);
      scrollTop();
    } catch (e) {
      setSubmitErrors([
        { name: "Request", msg: e?.message || "Failed to create billing request" },
      ]);
      toastError(e?.message || "Failed to create billing request");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div ref={topRef}>
      <CRow>
        <CCol xs={12}>

          {/* breadcrumb bar */}
          <CCard className="mb-3">
            <CCardBody className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
              <CBreadcrumb className="mb-0">
                <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
                <CBreadcrumbItem href="#/purchase-bucket">Purchase Bucket</CBreadcrumbItem>
                <CBreadcrumbItem active>Raise Billing Request</CBreadcrumbItem>
              </CBreadcrumb>
              <CButton color="secondary" variant="ghost" onClick={() => navigate("/purchase-bucket")}>
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
                <p className="text-body-secondary mb-4" style={{ fontSize: 14 }}>
                  All products have been submitted for HOD approval. The
                  po_products status has been updated to{" "}
                  <strong>hod_approval_pending</strong>.
                </p>
                <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
                  <CButton color="primary" onClick={() => navigate("/purchase-bucket")}>
                    Go to Purchase Bucket
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setSubmittedCode("");
                      setSubmitErrors([]);
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
                <h6 className="mb-1" style={{ fontWeight: 700 }}>Search for a product</h6>


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

                {/* empty state */}
                {!searching && !search.trim() && (
                  <div
                    className="text-center py-5 text-body-secondary"
                    style={{ fontSize: 13 }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                    Start typing to search for products
                  </div>
                )}

                {/* no results */}
                {!searching && search.trim() && results.length === 0 && (
                  <div className="text-center py-4 text-body-secondary" style={{ fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                    No products found for "{search}"
                  </div>
                )}

                {/* results */}
                {results.length > 0 && (
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
                )}

                {/* cart hint when results are showing */}
                {cart.length > 0 && (
                  <div
                    className="d-flex align-items-center justify-content-between mt-4 p-3 rounded"
                    style={{ background: "#edf2ff", border: "1.5px solid #0d6efd30" }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {cart.length} product{cart.length > 1 ? "s" : ""} ready to submit
                    </span>
                    <CButton color="primary" size="sm" onClick={() => goTo(STEP.REVIEW)}>
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
                style={{ background: "#edf2ff", border: "1.5px solid #0d6efd40" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fmt(product.productName)}
                  </div>
                  <div style={{ fontSize: 12, color: "#0d6efd", marginTop: 2 }}>
                    Sales Order: {fmt(product.poCode)}
                    {product.quantity ? ` · Qty: ${product.quantity}${product.unit ? " " + product.unit : ""}` : ""}
                  </div>
                </div>
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setProduct(null); goTo(STEP.SEARCH); }}
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
                        width: 24, height: 24, borderRadius: "50%",
                        background: form.photos.length > 0 ? "#198754" : "#0d6efd",
                        color: "#fff", fontSize: 12, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {form.photos.length > 0 ? "✓" : "1"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        Product Photos <span style={{ color: "#dc3545" }}>*</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6c757d" }}>
                        Upload one or more clear photos of the product
                      </div>
                    </div>
                  </div>

                  {form.photos.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {form.photos.map((p, i) => (
                        <div key={i} style={{ position: "relative" }}>
                          <img
                            src={p.url}
                            alt=""
                            style={{
                              width: 80, height: 80,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1.5px solid #dee2e6",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            style={{
                              position: "absolute", top: -6, right: -6,
                              width: 20, height: 20,
                              borderRadius: "50%",
                              background: "#dc3545",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input type="file" accept="image/*" multiple ref={photoGalleryRef} className="d-none"
                    onChange={onMultiFileChange(uploadPhoto)} />
                  <input type="file" accept="image/*" capture="environment" ref={photoCameraRef} className="d-none"
                    onChange={onFileChange(photoCameraRef, uploadPhoto)} />

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
                    <div className="d-flex align-items-center gap-1 mt-2" style={{ color: "#198754", fontSize: 12 }}>
                      <CIcon icon={cilCheckCircle} style={{ fontSize: 13 }} />
                      {form.photos.length} photo{form.photos.length !== 1 ? "s" : ""} added — tap above to add more
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
                      onClick={() => { setProduct(null); goTo(STEP.SEARCH); }}
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
                style={{ background: "#edf2ff", border: "1.5px solid #0d6efd40" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fmt(product.productName)}
                  </div>
                  <div style={{ fontSize: 12, color: "#0d6efd", marginTop: 2 }}>
                    Sales Order: {fmt(product.poCode)} · {form.photos.length} photo{form.photos.length !== 1 ? "s" : ""} attached
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

              {/* Amount */}
              <CCard className="mb-3" id="rbr-payment-amount">
                <CCardBody>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: form.amount && Number(form.amount) > 0 ? "#198754" : "#0d6efd",
                        color: "#fff", fontSize: 12, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {form.amount && Number(form.amount) > 0 ? "✓" : "1"}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Amount <span style={{ color: "#dc3545" }}>*</span>
                    </div>
                  </div>
                  <div className="position-relative">
                    <div
                      style={{
                        position: "absolute", left: 12, top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 700, color: "#495057", fontSize: 16,
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
                      value={form.amount}
                      onChange={(e) => patchForm({ amount: e.target.value, errors: { ...form.errors, amount: undefined } })}
                      style={{ paddingLeft: 28, fontSize: 18, fontWeight: 600 }}
                    />
                  </div>
                  <FieldError msg={form.errors.amount} />
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
                    <CButton color="success" className="w-100" onClick={addToCart}>
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
                    <CBadge color="primary" className="ms-2">{cart.length}</CBadge>
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
                  <CCardBody className="text-center py-5 text-body-secondary" style={{ fontSize: 13 }}>
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
              )}


              {/* total summary */}
              {cart.length > 0 && (
                <div
                  className="d-flex align-items-center justify-content-between p-3 rounded mb-3"
                  style={{ background: "#f8f9fa", border: "1.5px solid #dee2e6" }}
                >
                  <span style={{ fontWeight: 600 }}>Total amount</span>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>
                    ₹{cart.reduce((s, i) => s + i.amount, 0).toLocaleString("en-IN")}
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
