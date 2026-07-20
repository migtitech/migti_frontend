import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Wallet,
  MoreHorizontal,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Textarea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui";
import { BackButton } from "../../components";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import supplierService from "../../services/supplierService";
import documentService from "../../services/documentService";
import axiosClient from "../../api/axiosClient";
import { DOCUMENTS } from "../../api/endpoints";
import { toastError, toastSuccess } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const fmtAmount = (n) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

const fmtField = (value) => {
  const text = value != null ? String(value).trim() : "";
  return text || "—";
};

const SUPPLIER_BANK_DETAIL_FIELDS = [
  { key: "accountHolderName", label: "Account Holder Name" },
  { key: "accountNumber", label: "Account Number" },
  { key: "bankName", label: "Bank Name" },
  { key: "ifscCode", label: "IFSC Code" },
  { key: "upiDetails", label: "UPI Details" },
];

const normalizeSupplierBankDetails = (bankDetails) => {
  const src = bankDetails && typeof bankDetails === "object" ? bankDetails : {};
  return {
    accountHolderName: src.accountHolderName || "",
    accountNumber: src.accountNumber || "",
    bankName: src.bankName || "",
    ifscCode: src.ifscCode || "",
    upiDetails: src.upiDetails || "",
  };
};

const supplierSnapshotTitle = (snapshot) =>
  snapshot?.name || snapshot?.shopname || snapshot?.companyName || "Supplier";

const formatSupplierSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    return { title: "—", lines: [] };
  }
  const title =
    snapshot.name || snapshot.shopname || snapshot.companyName || "—";
  const lines = [
    snapshot.shopname &&
      snapshot.name &&
      snapshot.shopname !== snapshot.name &&
      snapshot.shopname,
    snapshot.phone_1 && `Phone: ${snapshot.phone_1}`,
    snapshot.gst && `GST: ${snapshot.gst}`,
    snapshot.address && `Address: ${snapshot.address}`,
    snapshot.email && `Email: ${snapshot.email}`,
  ].filter(Boolean);
  return { title, lines };
};

const SupplierDetailsCell = ({
  snapshot,
  showBankDetailsAction,
  onShowBankDetails,
}) => {
  const { title, lines } = formatSupplierSnapshot(snapshot);
  if (title === "—" && lines.length === 0) return "—";
  return (
    <div className="min-w-40">
      <div className="font-medium">{title}</div>
      {lines.map((line) => (
        <div key={line} className="text-xs leading-tight text-muted-foreground">
          {line}
        </div>
      ))}
      {showBankDetailsAction && (
        <Button
          type="button"
          size="sm"
          variant="link"
          className="mt-1 h-auto p-0 text-xs"
          onClick={onShowBankDetails}
        >
          Show bank details
        </Button>
      )}
    </div>
  );
};

const STATUS_MAP = {
  hod_approval_pending: { label: "Pending", color: "warning" },
  hod_approved: { label: "HOD Approved", color: "success" },
  hod_rejected: { label: "Rejected", color: "destructive" },
  finance_approved: { label: "Finance Approved", color: "info" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[String(status || "").toLowerCase()] || {
    label: status || "—",
    color: "secondary",
  };
  return <Badge variant={s.color}>{s.label}</Badge>;
};

const unwrap = (res) => {
  const inner = res?.data ?? res;
  return inner?.data ?? inner;
};

const openDocWithAuth = async (docId, setLoadingKey) => {
  if (!docId) return;
  setLoadingKey(docId);
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
    setLoadingKey(null);
  }
};

const HOD_PRODUCT_STATUS_MAP = {
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "destructive" },
};

const HodProductBadge = ({ status }) => {
  if (!status) return <Badge variant="secondary">Pending</Badge>;
  const s = HOD_PRODUCT_STATUS_MAP[status] || {
    label: status,
    color: "secondary",
  };
  return <Badge variant={s.color}>{s.label}</Badge>;
};

const BillingRequestView = ({
  basePath = "/billing-requests",
  pageTitle = "Billing Requests",
  showProductAction = false,
}) => {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [docLoadingKey, setDocLoadingKey] = useState(null);

  // Finance approve offcanvas state
  const [actionOpen, setActionOpen] = useState(false);
  const [financeRemark, setFinanceRemark] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofFileName, setProofFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Per-product HOD action offcanvas state
  const [productActionOpen, setProductActionOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [hodRemark, setHodRemark] = useState("");
  const [hodSubmitting, setHodSubmitting] = useState(false);

  const [bankDetailsOpen, setBankDetailsOpen] = useState(false);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(false);
  const [bankDetailsSupplier, setBankDetailsSupplier] = useState(null);
  const [bankDetails, setBankDetails] = useState(() =>
    normalizeSupplierBankDetails(),
  );

  const showSupplierBankDetails = !showProductAction;

  const reload = () => {
    if (!id) return;
    billingRequestBatchService
      .getById(id)
      .then((res) => setDetail(unwrap(res)))
      .catch(() => {});
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    billingRequestBatchService
      .getById(id)
      .then((res) => setDetail(unwrap(res)))
      .catch((e) => toastError(e?.message || "Failed to load billing request"))
      .finally(() => setLoading(false));
  }, [id]);

  const openAction = () => {
    setFinanceRemark("");
    setPaidAmount("");
    setProofFile(null);
    setProofFileName("");
    setActionOpen(true);
  };

  const onProofFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProofFile(file);
    setProofFileName(file.name);
  };

  const openProductAction = (product) => {
    setSelectedProduct(product);
    setHodRemark("");
    setProductActionOpen(true);
  };

  const closeProductAction = () => {
    if (hodSubmitting) return;
    setProductActionOpen(false);
    setSelectedProduct(null);
    setHodRemark("");
  };

  const onHodProductAction = async (action) => {
    if (!selectedProduct?._id) return;
    setHodSubmitting(true);
    try {
      const res = await billingRequestBatchService.hodProductAction(
        id,
        String(selectedProduct._id),
        { action, remark: hodRemark.trim() },
      );
      const updated = unwrap(res);
      if (updated) setDetail(updated);
      toastSuccess(
        action === "approved" ? "Product approved" : "Product rejected",
      );
      closeProductAction();
    } catch (e) {
      toastError(e?.message || "Failed to process action.");
    } finally {
      setHodSubmitting(false);
    }
  };

  const closeBankDetails = () => {
    if (bankDetailsLoading) return;
    setBankDetailsOpen(false);
    setBankDetailsSupplier(null);
    setBankDetails(normalizeSupplierBankDetails());
  };

  const openSupplierBankDetails = async (snapshot) => {
    if (!snapshot || typeof snapshot !== "object") {
      toastError("No supplier linked to this product.");
      return;
    }

    setBankDetailsSupplier(snapshot);
    setBankDetails(normalizeSupplierBankDetails(snapshot.bankDetails));
    setBankDetailsOpen(true);
    setBankDetailsLoading(true);

    try {
      const supplierId = snapshot._id ? String(snapshot._id) : "";
      if (supplierId) {
        const res = await supplierService.getById(supplierId);
        const data = res?.data || res;
        setBankDetails(normalizeSupplierBankDetails(data?.bankDetails));
        setBankDetailsSupplier((prev) => ({
          ...(prev || {}),
          name: data?.name || prev?.name,
          shopname: data?.shopname || prev?.shopname,
        }));
      }
    } catch (e) {
      toastError(e?.message || "Could not load latest supplier bank details.");
    } finally {
      setBankDetailsLoading(false);
    }
  };

  const onSubmitFinanceApprove = async () => {
    if (!isPaidAmountValid) return;

    setSubmitting(true);
    try {
      let paymentProofDocId = null;
      if (proofFile) {
        const up = await documentService.uploadAttachments([proofFile]);
        const docs =
          up?.data?.documents ||
          up?.documents ||
          up?.data?.data?.documents ||
          [];
        const first = docs[0];
        if (!first?._id) {
          toastError("Proof upload failed — no document ID returned.");
          return;
        }
        paymentProofDocId = String(first._id);
      }

      const res = await billingRequestBatchService.financeApprove(id, {
        financeRemark: financeRemark.trim(),
        paidAmount: paidAmount !== "" ? Number(paidAmount) : null,
        paymentProofDocId,
      });
      const updated = unwrap(res);
      if (updated) setDetail(updated);
      toastSuccess("Finance approval submitted successfully");
      setActionOpen(false);
      reload();
    } catch (e) {
      toastError(e?.message || "Failed to submit finance approval.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!detail) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-16">
          <p className="text-muted-foreground">Billing request not found.</p>
          <BackButton fallback={basePath} />
        </CardContent>
      </Card>
    );
  }

  const products = Array.isArray(detail.products) ? detail.products : [];
  const grandTotal = products.reduce(
    (s, p) => s + (typeof p.amount === "number" ? p.amount : 0),
    0,
  );
  const parsedPaidAmount = paidAmount.trim() !== "" ? Number(paidAmount) : null;
  const isPaidAmountValid =
    parsedPaidAmount != null &&
    Number.isFinite(parsedPaidAmount) &&
    Math.round(parsedPaidAmount * 100) === Math.round(grandTotal * 100);
  const createdByName =
    detail.createdBySnapshot?.name || detail.createdBySnapshot?.fullName || "—";
  const reviewedByName =
    detail.reviewedBySnapshot?.name ||
    detail.reviewedBySnapshot?.fullName ||
    null;

  return (
    <div>
      <div>
        <nav className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <a href="#/dashboard" className="hover:text-foreground">
            Home
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <a href={`#${basePath}`} className="hover:text-foreground">
            {pageTitle}
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">
            {detail.billingRequestCode || "Detail"}
          </span>
        </nav>

        <div className="mb-3 flex items-center justify-between">
          <BackButton fallback={basePath} />
          <Button type="button" size="sm" onClick={openAction}>
            <MoreHorizontal className="h-4 w-4" />
            Action
          </Button>
        </div>

        {/* Summary card */}
        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {detail.billingRequestCode || "Billing Request"}
            </CardTitle>
            <StatusBadge status={detail.status} />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Sales Order Code
                </div>
                <div className="font-medium">
                  <code>{detail.poCode || "—"}</code>
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Raised by
                </div>
                <div className="font-medium">{createdByName}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Raised on
                </div>
                <div className="font-medium">
                  {dateFormatter(detail.createdAt, "—")}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Total amount
                </div>
                <div className="font-bold">{fmtAmount(grandTotal)}</div>
              </div>
              {reviewedByName && (
                <>
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">
                      Reviewed by
                    </div>
                    <div className="font-medium">{reviewedByName}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">
                      Reviewed at
                    </div>
                    <div className="font-medium">
                      {dateFormatter(detail.reviewedAt, "—")}
                    </div>
                  </div>
                </>
              )}
              {detail.statusRemark && (
                <div className="col-span-2 md:col-span-4">
                  <div className="mb-1 text-sm text-muted-foreground">
                    Remark
                  </div>
                  <div className="font-medium">{detail.statusRemark}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment proof — shown when finance approved */}
        {detail.status === "finance_approved" && (
          <Card className="mb-4 border-success/50">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-success/50 bg-success-muted">
              <CheckCircle className="h-4 w-4 text-success!" />
              <span className="font-bold text-success!">Payment Approved</span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                {detail.paidAmount != null && (
                  <div>
                    <div className="mb-1 text-muted-foreground">
                      Paid Amount
                    </div>
                    <div className="text-base font-bold text-success!">
                      {fmtAmount(detail.paidAmount)}
                    </div>
                  </div>
                )}
                {detail.financeApprovedBySnapshot && (
                  <div>
                    <div className="mb-1 text-muted-foreground">
                      Approved by
                    </div>
                    <div className="font-medium">
                      {detail.financeApprovedBySnapshot.name ||
                        detail.financeApprovedBySnapshot.fullName ||
                        "—"}
                    </div>
                  </div>
                )}
                {detail.financeApprovedAt && (
                  <div>
                    <div className="mb-1 text-muted-foreground">
                      Approved on
                    </div>
                    <div className="font-medium">
                      {dateFormatter(detail.financeApprovedAt, "—")}
                    </div>
                  </div>
                )}
                {detail.financeRemark && (
                  <div className="col-span-2 md:col-span-4">
                    <div className="mb-1 text-muted-foreground">
                      Finance Remark
                    </div>
                    <div className="font-medium">{detail.financeRemark}</div>
                  </div>
                )}
                {detail.paymentProofDocId && (
                  <div className="col-span-2 md:col-span-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!!docLoadingKey}
                      onClick={() =>
                        openDocWithAuth(String(detail.paymentProofDocId), (k) =>
                          setDocLoadingKey(
                            k ? `proof-${detail.paymentProofDocId}` : null,
                          ),
                        )
                      }
                    >
                      {docLoadingKey === `proof-${detail.paymentProofDocId}` ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          Opening…
                        </>
                      ) : (
                        "View Payment Proof"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products table */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({products.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {products.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No products found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Qty / Unit</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Remark</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p, idx) => {
                      const imgDocId = p.productImageDocId
                        ? String(p.productImageDocId)
                        : null;
                      const billDocId = p.billDocId
                        ? String(p.billDocId)
                        : null;
                      const imgKey = imgDocId ? `img-${imgDocId}` : null;
                      const billKey = billDocId ? `bill-${billDocId}` : null;
                      return (
                        <TableRow key={p._id || idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            {p.productName || "—"}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">
                              {p.rawProductCode || "—"}
                            </code>
                          </TableCell>
                          <TableCell>
                            {p.quantity != null
                              ? `${p.quantity}${p.unit ? ` ${p.unit}` : ""}`
                              : "—"}
                          </TableCell>
                          <TableCell>{fmtAmount(p.amount)}</TableCell>
                          <TableCell>
                            <SupplierDetailsCell
                              snapshot={p.supplierSnapshot}
                              showBankDetailsAction={
                                showSupplierBankDetails && !!p.supplierSnapshot
                              }
                              onShowBankDetails={() =>
                                openSupplierBankDetails(p.supplierSnapshot)
                              }
                            />
                          </TableCell>
                          <TableCell
                            className="max-w-[200px] truncate"
                            title={p.remark || undefined}
                          >
                            {p.remark || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {showProductAction && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openProductAction(p)}
                                >
                                  Action
                                </Button>
                              )}
                              {imgDocId && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={docLoadingKey === imgKey}
                                  onClick={() =>
                                    openDocWithAuth(imgDocId, (k) =>
                                      setDocLoadingKey(k ? imgKey : null),
                                    )
                                  }
                                >
                                  {docLoadingKey === imgKey ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    "View Image"
                                  )}
                                </Button>
                              )}
                              {billDocId && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={docLoadingKey === billKey}
                                  onClick={() =>
                                    openDocWithAuth(billDocId, (k) =>
                                      setDocLoadingKey(k ? billKey : null),
                                    )
                                  }
                                >
                                  {docLoadingKey === billKey ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    "View Bill"
                                  )}
                                </Button>
                              )}
                              {!showProductAction &&
                                !imgDocId &&
                                !billDocId && (
                                  <span className="text-sm text-muted-foreground">
                                    —
                                  </span>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4} className="text-right">
                        Grand Total
                      </TableCell>
                      <TableCell>{fmtAmount(grandTotal)}</TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier bank details offcanvas */}
      <Sheet
        open={bankDetailsOpen}
        onOpenChange={(o) => !o && closeBankDetails()}
      >
        <SheetContent side="right" className="w-full sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>Supplier Bank Details</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {bankDetailsSupplier && (
              <div className="mb-3 rounded-lg border border-border bg-muted p-3">
                <div className="font-medium">
                  {supplierSnapshotTitle(bankDetailsSupplier)}
                </div>
                {bankDetailsSupplier.shopname &&
                  bankDetailsSupplier.name &&
                  bankDetailsSupplier.shopname !== bankDetailsSupplier.name && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {bankDetailsSupplier.shopname}
                    </div>
                  )}
              </div>
            )}

            {bankDetailsLoading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {SUPPLIER_BANK_DETAIL_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <div className="mb-1 text-sm text-muted-foreground">
                      {label}
                    </div>
                    <div className="font-medium">
                      {fmtField(bankDetails[key])}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Per-product HOD Action Offcanvas */}
      <Sheet
        open={productActionOpen}
        onOpenChange={(o) => !o && closeProductAction()}
      >
        <SheetContent side="right" className="w-full sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Product Action</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-3">
            {selectedProduct && (
              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="font-medium">
                  {selectedProduct.productName || "—"}
                </div>
                {selectedProduct.rawProductCode && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    Code: <code>{selectedProduct.rawProductCode}</code>
                  </div>
                )}
                <div className="mt-1 text-sm text-muted-foreground">
                  Amount: {fmtAmount(selectedProduct.amount)}
                </div>
                <div className="mt-2">
                  <span className="mr-2 text-sm text-muted-foreground">
                    Current status:
                  </span>
                  <HodProductBadge status={selectedProduct.hodStatus} />
                </div>
              </div>
            )}

            <div>
              <Label className="mb-1 font-medium">Remark</Label>
              <Textarea
                rows={4}
                placeholder="Add a remark (optional)"
                value={hodRemark}
                onChange={(e) => setHodRemark(e.target.value)}
                disabled={hodSubmitting}
              />
            </div>

            <div className="mt-auto flex gap-2 border-t border-border pt-3">
              <Button
                type="button"
                className="flex-1"
                disabled={hodSubmitting}
                onClick={() => onHodProductAction("approved")}
              >
                {hodSubmitting ? <Spinner size="sm" /> : "Approve"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={hodSubmitting}
                onClick={() => onHodProductAction("rejected")}
              >
                {hodSubmitting ? <Spinner size="sm" /> : "Reject"}
              </Button>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Finance Approve Offcanvas */}
      <Sheet
        open={actionOpen}
        onOpenChange={(o) => !o && !submitting && setActionOpen(false)}
      >
        <SheetContent side="right" className="w-full sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>Finance Approval</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-3">
            <div>
              <Label className="mb-1 font-medium">Remark</Label>
              <Textarea
                rows={3}
                placeholder="Add a remark (optional)"
                value={financeRemark}
                onChange={(e) => setFinanceRemark(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div>
              <Label className="mb-1 font-medium">Paid Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter paid amount"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                disabled={submitting}
                aria-invalid={parsedPaidAmount != null && !isPaidAmountValid}
              />
              <div className="mt-1 text-sm text-muted-foreground">
                Total amount: {fmtAmount(grandTotal)}
              </div>
              {parsedPaidAmount != null && !isPaidAmountValid && (
                <div className="mt-1 text-sm text-destructive">
                  Paid amount must equal the total amount.
                </div>
              )}
            </div>

            <div>
              <Label className="mb-1 font-medium">Payment Proof</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={onProofFileChange}
                disabled={submitting}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {proofFileName ? "Change File" : "Upload Proof"}
                </Button>
                {proofFileName && (
                  <span
                    className="max-w-[200px] truncate text-sm text-muted-foreground"
                    title={proofFileName}
                  >
                    {proofFileName}
                  </span>
                )}
              </div>
            </div>

            {isPaidAmountValid && (
              <div className="mt-auto border-t border-border pt-3">
                <Button
                  type="button"
                  className="w-full"
                  disabled={submitting}
                  onClick={onSubmitFinanceApprove}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" />
                      Submitting…
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BillingRequestView;
