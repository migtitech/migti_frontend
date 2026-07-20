import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  UploadCloud,
  Tag,
  AlertTriangle,
  XCircle,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Spinner,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
} from "../../components/ui";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import documentService from "../../services/documentService";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader, BackButton } from "../../components";
import { dateFormatter } from "../../utils/dateFormatter";

const fmtAmount = (n) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

const formatSupplierSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    return { title: "", lines: [] };
  }
  const title =
    snapshot.name || snapshot.shopname || snapshot.companyName || "";
  const lines = [
    snapshot.shopname &&
      snapshot.name &&
      snapshot.shopname !== snapshot.name &&
      snapshot.shopname,
    snapshot.phone_1 && `Phone: ${snapshot.phone_1}`,
    snapshot.gst && `GST: ${snapshot.gst}`,
    snapshot.address && `Address: ${snapshot.address}`,
  ].filter(Boolean);
  return { title, lines };
};

const unwrap = (res) => {
  const inner = res?.data ?? res;
  return inner?.data ?? inner;
};

const BATCH_STATUS_MAP = {
  hod_approval_pending: {
    label: "Pending Approval",
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  hod_approved: { label: "HOD Approved", color: "#16a34a", bg: "#f0fdf4" },
  hod_rejected: { label: "HOD Rejected", color: "#dc2626", bg: "#fef2f2" },
  finance_approved: {
    label: "Finance Approved",
    color: "#2563eb",
    bg: "#eff6ff",
  },
};

const HOD_STATUS_CONFIG = {
  approved: {
    label: "HOD Approved",
    color: "#16a34a",
    bg: "#f0fdf4",
    icon: CheckCircle2,
  },
  rejected: {
    label: "HOD Rejected",
    color: "#dc2626",
    bg: "#fef2f2",
    icon: XCircle,
  },
};

const BatchStatusPill = ({ status }) => {
  const s = BATCH_STATUS_MAP[String(status || "").toLowerCase()];
  if (!s) return <Badge variant="secondary">{status || "—"}</Badge>;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        border: `1.5px solid ${s.color}30`,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};

const HodStatusPill = ({ status }) => {
  if (!status) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          color: "#92400e",
          background: "#fffbeb",
          border: "1.5px solid #f59e0b40",
        }}
      >
        Pending Review
      </span>
    );
  }
  const s = HOD_STATUS_CONFIG[status];
  if (!s) return <Badge variant="secondary">{status}</Badge>;
  const Icon = s.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        border: `1.5px solid ${s.color}30`,
      }}
    >
      <Icon style={{ width: 13, height: 13 }} />
      {s.label}
    </span>
  );
};

const openDocWithAuth = async (docId, setLoadingId) => {
  if (!docId) return;
  setLoadingId(String(docId));
  try {
    const response = await axiosClient.get(DOCUMENTS.SERVE(docId), {
      responseType: "blob",
    });
    const blob = response.data ?? response;
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch {
    toastError("Could not load document. Please try again.");
  } finally {
    setLoadingId(null);
  }
};

const StatBox = ({ label, value, accent }) => (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      padding: "12px 14px",
      borderRadius: 10,
      background: accent ? "#eff6ff" : "#f8fafc",
      border: "1px solid #e2e8f0",
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#64748b",
        fontWeight: 500,
        marginBottom: 2,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: accent ? "#2563eb" : "#1e293b",
      }}
    >
      {value}
    </div>
  </div>
);

const BatchBillingRequestDetail = () => {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [docLoadingId, setDocLoadingId] = useState(null);
  const [purchasingId, setPurchasingId] = useState(null);

  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [resubmitProduct, setResubmitProduct] = useState(null);
  const [resubmitBillFile, setResubmitBillFile] = useState(null);
  const [resubmitBillName, setResubmitBillName] = useState("");
  const [resubmitPhotoFile, setResubmitPhotoFile] = useState(null);
  const [resubmitPhotoName, setResubmitPhotoName] = useState("");
  const [resubmitAmount, setResubmitAmount] = useState("");
  const [resubmitRemark, setResubmitRemark] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  const billInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    billingRequestBatchService
      .getById(id)
      .then((res) => setDetail(unwrap(res)))
      .catch((e) => toastError(e?.message || "Failed to load billing request"))
      .finally(() => setLoading(false));
  }, [id]);

  const onMarkPurchased = async (productId) => {
    setPurchasingId(productId);
    try {
      const res = await billingRequestBatchService.markProductPurchased(
        id,
        productId,
      );
      const updated = unwrap(res);
      if (updated) setDetail(updated);
      toastSuccess("Product marked as purchased");
    } catch (e) {
      toastError(e?.message || "Failed to mark product as purchased.");
    } finally {
      setPurchasingId(null);
    }
  };

  const openResubmit = (product) => {
    setResubmitProduct(product);
    setResubmitBillFile(null);
    setResubmitBillName("");
    setResubmitPhotoFile(null);
    setResubmitPhotoName("");
    setResubmitAmount(
      typeof product.amount === "number" ? String(product.amount) : "",
    );
    setResubmitRemark(product.remark || "");
    setResubmitOpen(true);
  };

  const closeResubmit = () => {
    if (resubmitting) return;
    setResubmitOpen(false);
    setResubmitProduct(null);
  };

  const onBillFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResubmitBillFile(file);
    setResubmitBillName(file.name);
  };

  const onPhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResubmitPhotoFile(file);
    setResubmitPhotoName(file.name);
  };

  const onSubmitResubmit = async () => {
    const hasPrevBill = !!resubmitProduct?.billDocId;
    const hasPrevPhoto = !!resubmitProduct?.productImageDocId;

    if (!resubmitBillFile && !hasPrevBill) {
      toastError("Please upload the bill document.");
      return;
    }
    if (!resubmitPhotoFile && !hasPrevPhoto) {
      toastError("Please upload the product photo.");
      return;
    }
    if (
      !resubmitAmount ||
      Number.isNaN(Number(resubmitAmount)) ||
      Number(resubmitAmount) <= 0
    ) {
      toastError("Please enter a valid amount.");
      return;
    }
    setResubmitting(true);
    try {
      let billDocId = String(resubmitProduct.billDocId);
      if (resubmitBillFile) {
        const billUp = await documentService.uploadAttachments([
          resubmitBillFile,
        ]);
        const billDocs =
          billUp?.data?.documents ||
          billUp?.documents ||
          billUp?.data?.data?.documents ||
          [];
        const billDoc = billDocs[0];
        if (!billDoc?._id) {
          toastError("Bill upload failed — no document ID returned.");
          return;
        }
        billDocId = String(billDoc._id);
      }

      let productImageDocId = resubmitProduct.productImageDocId
        ? String(resubmitProduct.productImageDocId)
        : null;
      if (resubmitPhotoFile) {
        const photoUp = await documentService.uploadAttachments([
          resubmitPhotoFile,
        ]);
        const photoDocs =
          photoUp?.data?.documents ||
          photoUp?.documents ||
          photoUp?.data?.data?.documents ||
          [];
        const photoDoc = photoDocs[0];
        if (photoDoc?._id) productImageDocId = String(photoDoc._id);
      }

      const res = await billingRequestBatchService.resubmitProduct(
        id,
        String(resubmitProduct._id),
        {
          billDocId,
          productImageDocId,
          amount: Number(resubmitAmount),
          remark: resubmitRemark.trim(),
        },
      );
      const updated = unwrap(res);
      if (updated) setDetail(updated);
      toastSuccess("Product resubmitted successfully");
      closeResubmit();
    } catch (e) {
      toastError(e?.message || "Failed to resubmit product.");
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Loader />
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <p className="text-body-secondary">Billing request not found.</p>
        <BackButton fallback="/batch-billing-requests" />
      </div>
    );
  }

  const products = Array.isArray(detail.products) ? detail.products : [];
  const grandTotal = products.reduce(
    (s, p) => s + (typeof p.amount === "number" ? p.amount : 0),
    0,
  );
  return (
    <div>
      <div>
        {/* Page header */}
        <div className="mb-3 rounded-3 p-3 bg-muted border border-border">
          <div className="flex items-center gap-2 mb-2">
            <BackButton
              fallback="/batch-billing-requests"
              style={{ flexShrink: 0 }}
            />
            <div style={{ minWidth: 0, flex: 1 }} />
            <BatchStatusPill status={detail.status} />
          </div>

          {/* Stats row */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <StatBox
              label={
                <>
                  <Tag className="me-1" style={{ width: 13, height: 13 }} />
                  Products
                </>
              }
              value={products.length}
            />
            <StatBox
              label="Total Amount"
              value={fmtAmount(grandTotal)}
              accent
            />
          </div>

          {detail.statusRemark && (
            <div
              className="mt-3 rounded-md p-2 flex gap-2 items-start bg-warning-muted border border-warning/40"
              style={{ fontSize: 13 }}
            >
              <AlertTriangle
                className="text-warning!"
                style={{
                  width: 15,
                  height: 15,
                  marginTop: 1,
                  flexShrink: 0,
                }}
              />
              <span className="text-warning!">
                <strong>Overall Remark:</strong> {detail.statusRemark}
              </span>
            </div>
          )}

          {/* Payment proof — shown when finance approved */}
          {detail.status === "finance_approved" && (
            <div className="mt-3 rounded-md p-3 flex flex-col gap-2 bg-success-muted border border-success!">
              <div
                className="text-success!"
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                <CheckCircle2
                  className="me-2"
                  style={{ width: 15, height: 15 }}
                />
                Payment Approved
              </div>
              <div className="flex flex-wrap gap-3" style={{ fontSize: 13 }}>
                {detail.paidAmount != null && (
                  <div>
                    <span className="text-muted-foreground">Paid Amount: </span>
                    <span className="text-success!" style={{ fontWeight: 700 }}>
                      {fmtAmount(detail.paidAmount)}
                    </span>
                  </div>
                )}
                {detail.financeApprovedBySnapshot && (
                  <div>
                    <span className="text-muted-foreground">Approved by: </span>
                    <span style={{ fontWeight: 600 }}>
                      {detail.financeApprovedBySnapshot.name ||
                        detail.financeApprovedBySnapshot.fullName ||
                        "—"}
                    </span>
                  </div>
                )}
                {detail.financeApprovedAt && (
                  <div>
                    <span className="text-muted-foreground">On: </span>
                    <span style={{ fontWeight: 600 }}>
                      {dateFormatter(detail.financeApprovedAt, "—")}
                    </span>
                  </div>
                )}
              </div>
              {detail.financeRemark && (
                <div className="text-success!" style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>Finance remark: </span>
                  {detail.financeRemark}
                </div>
              )}
              {detail.paymentProofDocId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                  disabled={!!docLoadingId}
                  onClick={() =>
                    openDocWithAuth(
                      String(detail.paymentProofDocId),
                      setDocLoadingId,
                    )
                  }
                >
                  {docLoadingId === String(detail.paymentProofDocId) ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Opening…
                    </>
                  ) : (
                    "View Payment Proof"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Products */}
        <div
          className="flex items-center justify-between mb-2 px-1"
          style={{ fontSize: 14 }}
        >
          <span className="fw-semibold text-foreground">
            <Tag className="me-1" style={{ width: 13, height: 13 }} />
            Products ({products.length})
          </span>
          <span className="text-muted-foreground" style={{ fontWeight: 600 }}>
            {fmtAmount(grandTotal)}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-5 rounded-3 bg-muted border border-dashed border-border text-muted-foreground">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {products.map((p, idx) => {
              const isRejected = p.hodStatus === "rejected";
              const isApproved = p.hodStatus === "approved";
              const supplierDetails = formatSupplierSnapshot(
                p.supplierSnapshot,
              );
              const isDocLoading = docLoadingId === String(p.billDocId);

              return (
                <Card
                  key={p._id || idx}
                  className={`h-100 mb-0 border ${isRejected ? "border-destructive" : isApproved ? "border-success!" : "border-border"}`}
                  style={{
                    borderWidth: 1.5,
                    borderRadius: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                >
                  {/* Colored top bar */}
                  <div
                    className={
                      isRejected
                        ? "bg-destructive"
                        : isApproved
                          ? "bg-success!"
                          : "bg-warning!"
                    }
                    style={{
                      height: 4,
                    }}
                  />

                  <CardContent className="p-3 flex flex-col gap-2">
                    {/* Name + amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          className="fw-bold text-foreground"
                          style={{
                            fontSize: 15,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.productName || `Product ${idx + 1}`}
                        </div>
                        {p.rawProductCode && (
                          <div
                            className="text-primary!"
                            style={{
                              fontSize: 11,
                              fontFamily: "monospace",
                              marginTop: 1,
                            }}
                          >
                            {p.rawProductCode}
                          </div>
                        )}
                      </div>
                      <div
                        className="text-foreground"
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {fmtAmount(p.amount)}
                      </div>
                    </div>

                    {/* Qty + Supplier chips */}
                    <div className="flex flex-wrap gap-2">
                      {p.quantity != null && (
                        <span
                          className="bg-muted text-muted-foreground"
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontWeight: 500,
                          }}
                        >
                          Qty: {p.quantity}
                          {p.unit ? ` ${p.unit}` : ""}
                        </span>
                      )}
                      {supplierDetails.title && (
                        <div
                          className="bg-muted text-muted-foreground border border-border"
                          style={{
                            fontSize: 12,
                            padding: "6px 8px",
                            borderRadius: 6,
                          }}
                        >
                          <div className="fw-semibold">
                            {supplierDetails.title}
                          </div>
                          {supplierDetails.lines.map((line) => (
                            <div key={line} style={{ marginTop: 2 }}>
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Product remark */}
                    {p.remark && (
                      <div
                        className="text-muted-foreground"
                        style={{ fontSize: 12 }}
                      >
                        <span className="fw-medium text-muted-foreground">
                          Note:{" "}
                        </span>
                        {p.remark}
                      </div>
                    )}

                    {/* View bill button */}
                    {p.billDocId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!docLoadingId}
                        onClick={() =>
                          openDocWithAuth(String(p.billDocId), setDocLoadingId)
                        }
                        style={{
                          alignSelf: "flex-start",
                          fontSize: 12,
                          borderRadius: 6,
                        }}
                      >
                        {isDocLoading ? (
                          <>
                            <Spinner size="sm" className="me-1" />
                            Loading…
                          </>
                        ) : (
                          "View Bill"
                        )}
                      </Button>
                    )}

                    {/* HOD status */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                      <span
                        className="text-muted-foreground"
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        HOD Status
                      </span>
                      <HodStatusPill status={p.hodStatus} />
                    </div>

                    {/* Mark Purchased — only when finance approved */}
                    {detail.status === "finance_approved" &&
                      (p.isPurchased ? (
                        <div
                          className="flex items-center gap-2 rounded-md p-2 bg-success-muted border border-success! text-success!"
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 style={{ width: 15, height: 15 }} />
                          Purchased
                          {p.purchasedAt && (
                            <span
                              className="text-muted-foreground"
                              style={{
                                fontWeight: 400,
                                marginLeft: "auto",
                              }}
                            >
                              {dateFormatter(p.purchasedAt, "—")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="w-100"
                          style={{ borderRadius: 8, fontWeight: 600 }}
                          disabled={purchasingId === String(p._id)}
                          onClick={() => onMarkPurchased(String(p._id))}
                        >
                          {purchasingId === String(p._id) ? (
                            <>
                              <Spinner size="sm" className="me-1" />
                              Marking…
                            </>
                          ) : (
                            "Mark as Purchased"
                          )}
                        </Button>
                      ))}

                    {/* Rejected panel */}
                    {isRejected && (
                      <div className="rounded-md p-3 flex flex-col gap-2 bg-destructive/10 border border-destructive/30">
                        <div
                          className="flex items-center gap-2 text-destructive"
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          <AlertTriangle style={{ width: 15, height: 15 }} />
                          Rejection Reason
                        </div>
                        <div
                          className="text-destructive"
                          style={{
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          {p.hodRemark || "No reason provided."}
                        </div>
                        {p.hodReviewedBySnapshot && (
                          <div
                            className="text-destructive"
                            style={{ fontSize: 11 }}
                          >
                            —{" "}
                            {p.hodReviewedBySnapshot.name ||
                              p.hodReviewedBySnapshot.fullName ||
                              ""}
                            {p.hodReviewedAt
                              ? `, ${dateFormatter(p.hodReviewedAt, "—")}`
                              : ""}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="w-100 mt-1"
                          style={{ borderRadius: 8, fontWeight: 600 }}
                          onClick={() => openResubmit(p)}
                        >
                          <UploadCloud
                            className="me-2"
                            style={{ width: 15, height: 15 }}
                          />
                          Upload Again
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Resubmit drawer */}
      <Sheet
        open={resubmitOpen}
        onOpenChange={(o) => {
          if (!o) closeResubmit();
        }}
      >
        <SheetContent
          side="right"
          showClose={false}
          className="w-[min(460px,100vw)] max-w-none p-0"
        >
          <SheetHeader
            className="flex-row items-center justify-between border-b border-border"
            style={{ padding: "16px 20px" }}
          >
            <SheetTitle
              className="text-foreground"
              style={{ fontSize: 16, fontWeight: 700 }}
            >
              Upload Information Again
            </SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeResubmit}
              disabled={resubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <SheetBody
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {resubmitProduct && (
              <>
                {/* Product summary */}
                <div className="rounded-md p-3 bg-muted border border-border">
                  <div
                    className="text-foreground"
                    style={{ fontSize: 15, fontWeight: 700 }}
                  >
                    {resubmitProduct.productName || "Product"}
                  </div>
                  {resubmitProduct.rawProductCode && (
                    <div
                      className="text-primary!"
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        marginTop: 2,
                      }}
                    >
                      {resubmitProduct.rawProductCode}
                    </div>
                  )}
                  {resubmitProduct.hodRemark && (
                    <div className="mt-2 rounded-md p-2 flex gap-2 items-start bg-destructive/10 border border-destructive/30">
                      <AlertTriangle
                        className="text-destructive"
                        style={{
                          width: 14,
                          height: 14,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />
                      <div
                        className="text-destructive"
                        style={{
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        <strong>Rejected:</strong> {resubmitProduct.hodRemark}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bill upload */}
                <div>
                  <Label
                    className="text-secondary-foreground"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Bill / Invoice <span className="text-destructive">*</span>
                  </Label>
                  {resubmitProduct.billDocId && (
                    <button
                      type="button"
                      onClick={() =>
                        openDocWithAuth(
                          String(resubmitProduct.billDocId),
                          setDocLoadingId,
                        )
                      }
                      disabled={!!docLoadingId}
                      className="border border-primary/30 bg-accent text-accent-foreground"
                      style={{
                        width: "100%",
                        marginBottom: 8,
                        padding: "10px 14px",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      <UploadCloud
                        style={{ width: 15, height: 15, flexShrink: 0 }}
                      />
                      {docLoadingId === String(resubmitProduct.billDocId)
                        ? "Opening…"
                        : "View previously uploaded bill"}
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    ref={billInputRef}
                    className="d-none"
                    onChange={onBillFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => billInputRef.current?.click()}
                    disabled={resubmitting}
                    className={
                      resubmitBillFile
                        ? "border-2 border-success! bg-success-muted text-success!"
                        : "border-2 border-dashed border-border bg-muted text-muted-foreground"
                    }
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 10,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      fontWeight: 500,
                      transition: "all 0.15s",
                    }}
                  >
                    {resubmitBillFile ? (
                      <CheckCircle2
                        style={{ width: 20, height: 20, flexShrink: 0 }}
                      />
                    ) : (
                      <UploadCloud
                        style={{ width: 20, height: 20, flexShrink: 0 }}
                      />
                    )}
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {resubmitBillFile
                        ? resubmitBillName
                        : "Upload new bill / invoice"}
                    </span>
                  </button>
                </div>

                {/* Photo upload */}
                <div>
                  <Label
                    className="text-secondary-foreground"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Product Photo <span className="text-destructive">*</span>
                  </Label>
                  {resubmitProduct.productImageDocId && (
                    <button
                      type="button"
                      onClick={() =>
                        openDocWithAuth(
                          String(resubmitProduct.productImageDocId),
                          setDocLoadingId,
                        )
                      }
                      disabled={!!docLoadingId}
                      className="border border-primary/30 bg-accent text-accent-foreground"
                      style={{
                        width: "100%",
                        marginBottom: 8,
                        padding: "10px 14px",
                        borderRadius: 8,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      <UploadCloud
                        style={{ width: 15, height: 15, flexShrink: 0 }}
                      />
                      {docLoadingId ===
                      String(resubmitProduct.productImageDocId)
                        ? "Opening…"
                        : "View previously uploaded photo"}
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={photoInputRef}
                    className="d-none"
                    onChange={onPhotoFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={resubmitting}
                    className={
                      resubmitPhotoFile
                        ? "border-2 border-success! bg-success-muted text-success!"
                        : "border-2 border-dashed border-border bg-muted text-muted-foreground"
                    }
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: 10,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      fontWeight: 500,
                      transition: "all 0.15s",
                    }}
                  >
                    {resubmitPhotoFile ? (
                      <CheckCircle2
                        style={{ width: 20, height: 20, flexShrink: 0 }}
                      />
                    ) : (
                      <UploadCloud
                        style={{ width: 20, height: 20, flexShrink: 0 }}
                      />
                    )}
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {resubmitPhotoFile
                        ? resubmitPhotoName
                        : "Upload new product photo"}
                    </span>
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <Label
                    className="text-secondary-foreground"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Amount (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={resubmitAmount}
                    onChange={(e) => setResubmitAmount(e.target.value)}
                    disabled={resubmitting}
                    style={{ borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                {/* Remark */}
                <div>
                  <Label
                    className="text-secondary-foreground"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Remark{" "}
                    <span
                      className="text-muted-foreground"
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                      }}
                    >
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    rows={3}
                    placeholder="Add a note for the reviewer…"
                    value={resubmitRemark}
                    onChange={(e) => setResubmitRemark(e.target.value)}
                    disabled={resubmitting}
                    style={{ borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2" style={{ marginTop: "auto" }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeResubmit}
                    disabled={resubmitting}
                    style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={onSubmitResubmit}
                    disabled={resubmitting}
                    style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
                  >
                    {resubmitting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Submitting…
                      </>
                    ) : (
                      "Resubmit"
                    )}
                  </Button>
                </div>
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BatchBillingRequestDetail;
