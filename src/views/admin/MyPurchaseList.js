import React, { useCallback, useEffect, useRef, useState } from "react";
import { ShoppingCart, CloudUpload, MapPin } from "lucide-react";
import localPurchaseService from "../../services/localPurchaseService";
import areaService from "../../services/areaService";
import documentService from "../../services/documentService";
import {
  Loader,
  TablePagination,
  FilterLockButton,
  PageHeader,
  StatusBadge,
} from "../../components";
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Textarea,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const MY_PURCHASE_FILTER_DEFAULTS = { status: "", zoneId: "" };

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
];

const statusBadge = (status) => {
  switch (status) {
    case "pending":
      return <StatusBadge variant="warning" status="Pending" />;
    case "submitted":
      return <StatusBadge variant="success" status="Submitted" />;
    default:
      return <StatusBadge variant="secondary" status={status || "—"} />;
  }
};

const imgSrc = (path) => {
  if (!path) return "";
  if (
    typeof path === "string" &&
    (path.startsWith("http://") || path.startsWith("https://"))
  ) {
    return path;
  }
  return getAssetsUrl(path);
};

const resolveImagePath = (img) => {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.path || img.url || "";
};

const isImageDoc = (doc) => {
  const mime = String(doc?.mimeType || doc?.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const path = resolveImagePath(doc).toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(path);
};

const toGalleryItems = (docs) =>
  (Array.isArray(docs) ? docs : [])
    .map((doc, idx) => ({
      doc,
      url: imgSrc(resolveImagePath(doc)),
      key: doc?._id || doc?.documentId || idx,
    }))
    .filter((item) => item.url);

const ImageGallery = ({ items, alt = "Image", emptyLabel }) => {
  const images = items.filter((item) => isImageDoc(item.doc));
  if (!images.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground"
        style={{ minHeight: 120 }}
      >
        {emptyLabel || "No image available"}
      </div>
    );
  }
  return (
    <div
      className="flex gap-2 overflow-auto pb-1"
      style={{ scrollSnapType: "x mandatory" }}
    >
      {images.map((img) => (
        <a
          key={img.key}
          href={img.url}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0"
          style={{ scrollSnapAlign: "start" }}
        >
          <img
            src={img.url}
            alt={alt}
            className="rounded-xl border border-border bg-muted/40"
            style={{
              width: "min(100%, 320px)",
              height: "clamp(160px, 38vw, 260px)",
              objectFit: "contain",
            }}
          />
        </a>
      ))}
    </div>
  );
};

const extractUploadedDocuments = (res) => {
  const block = res?.data ?? res;
  if (Array.isArray(block?.documents)) return block.documents;
  if (Array.isArray(block?.data?.documents)) return block.data.documents;
  if (Array.isArray(block)) return block;
  return [];
};

const extractApiErrorMessage = (err, fallback) => {
  const fromData = err?.data?.error ?? err?.data?.errors ?? err?.errors;
  if (Array.isArray(fromData) && fromData.length) return fromData.join(", ");
  if (typeof fromData === "string" && fromData.trim()) return fromData.trim();
  if (err?.message) return err.message;
  return fallback;
};

const resolveAssignmentId = (row) => {
  if (!row || typeof row !== "object") return "";
  const raw = row._id ?? row.id;
  if (raw == null || raw === "") return "";
  if (typeof raw === "object" && raw.$oid) return String(raw.$oid);
  return String(raw);
};

const formatPurchaseZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const unwrapPayload = (res) => res?.data?.data ?? res?.data;

const unwrapLocalPurchase = (res) => {
  const block = res?.data ?? res;
  if (block && typeof block === "object") {
    if (resolveAssignmentId(block)) return block;
    if (
      block.data &&
      typeof block.data === "object" &&
      resolveAssignmentId(block.data)
    ) {
      return block.data;
    }
  }
  return null;
};

const DetailRow = ({ label, value, mono = false }) => {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="border-b border-border py-2">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`text-sm ${mono ? "font-mono" : ""}`}
        style={{ wordBreak: "break-word" }}
      >
        {value}
      </div>
    </div>
  );
};

const MyPurchaseList = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "my_purchase",
    MY_PURCHASE_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [status, setStatus] = useState(initialValues.status);
  const [zoneId, setZoneId] = useState(initialValues.zoneId);
  const [marketZones, setMarketZones] = useState([]);
  const [marketZonesLoading, setMarketZonesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [billFile, setBillFile] = useState(null);
  const [productImageFiles, setProductImageFiles] = useState([]);
  const [submissionRemark, setSubmissionRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const activeAssignmentIdRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        localPurchaseService.list({
          page,
          pageSize,
          status: status.trim() || undefined,
          zoneId: zoneId.trim() || undefined,
        }),
      );
      const block = res?.data;
      setRows(Array.isArray(block?.data) ? block.data : []);
      setTotal(Number(block?.total) || 0);
    } catch (e) {
      toastError(e?.message || "Failed to load purchase assignments");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, zoneId]);

  useEffect(() => {
    let cancelled = false;
    const loadMarketZones = async () => {
      setMarketZonesLoading(true);
      try {
        const res = await areaService.getAll({
          pageNumber: 1,
          pageSize: 100,
          areaType: "market",
        });
        if (cancelled) return;
        const zonesPayload = unwrapPayload(res);
        const zoneRows = zonesPayload?.areas || [];
        setMarketZones(
          (zoneRows || []).map((zone) => ({
            ...zone,
            id: zone._id || zone.id,
          })),
        );
      } catch (e) {
        if (!cancelled) {
          toastError(e?.message || "Failed to load zones");
          setMarketZones([]);
        }
      } finally {
        if (!cancelled) setMarketZonesLoading(false);
      }
    };
    loadMarketZones();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status, zoneId]);

  useFilterLockPersist("my_purchase", filtersLocked, {
    status,
    zoneId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status, zoneId });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const closeDetail = () => {
    if (detailLoading || submitting || uploading) return;
    setDetailOpen(false);
    setDetail(null);
    setBillFile(null);
    setProductImageFiles([]);
    setSubmissionRemark("");
    setSubmitError("");
    activeAssignmentIdRef.current = "";
  };

  const openDetail = async (row) => {
    const assignmentId = resolveAssignmentId(row);
    if (!assignmentId) return;

    activeAssignmentIdRef.current = assignmentId;
    setDetailOpen(true);
    setDetail({ ...row, _id: assignmentId });
    setBillFile(null);
    setProductImageFiles([]);
    setSubmissionRemark("");
    setSubmitError("");
    setDetailLoading(true);
    try {
      const res = await localPurchaseService.getById(assignmentId);
      const doc = unwrapLocalPurchase(res);
      if (doc) {
        setDetail((prev) => ({
          ...(prev || {}),
          ...doc,
          _id: resolveAssignmentId(doc) || assignmentId,
        }));
      }
    } catch (e) {
      toastError(e?.message || "Failed to load product details");
    } finally {
      setDetailLoading(false);
    }
  };

  const uploadAttachmentPayload = async () => {
    let billDocumentId;
    if (billFile) {
      const billUploadRes = await documentService.uploadAttachments([billFile]);
      const billDoc = extractUploadedDocuments(billUploadRes).find(
        (d) => d?._id,
      );
      if (!billDoc?._id) {
        throw new Error("Failed to upload bill");
      }
      billDocumentId = String(billDoc._id);
    }

    let productImages = [];
    if (productImageFiles.length) {
      const imageUploadRes =
        await documentService.uploadImages(productImageFiles);
      productImages = extractUploadedDocuments(imageUploadRes)
        .filter((d) => d?._id)
        .map((d) => ({ documentId: String(d._id) }));
      if (!productImages.length) {
        throw new Error("Failed to upload product images");
      }
    }

    return { billDocumentId, productImages };
  };

  const handleSubmitPurchase = async () => {
    setSubmitError("");
    const assignmentId =
      resolveAssignmentId(detail) || activeAssignmentIdRef.current;
    if (!assignmentId) {
      setSubmitError("Assignment not found. Close and reopen this item.");
      return;
    }
    if (String(detail?.status || "").toLowerCase() === "submitted") {
      setSubmitError("This assignment is already submitted.");
      return;
    }

    setSubmitting(true);
    setUploading(true);
    try {
      const { billDocumentId, productImages } = await uploadAttachmentPayload();
      const payload = {
        productImages,
        remark: submissionRemark.trim(),
      };
      if (billDocumentId) payload.billDocumentId = billDocumentId;

      const res = await localPurchaseService.submit(assignmentId, payload);
      const submitted = unwrapLocalPurchase(res);
      if (submitted) {
        setDetail((prev) => ({
          ...(prev || {}),
          ...submitted,
          _id: resolveAssignmentId(submitted) || assignmentId,
        }));
      }
      toastSuccess("Marked as submitted");
      setBillFile(null);
      setProductImageFiles([]);
      setSubmissionRemark("");
      setSubmitError("");
      load();
    } catch (e) {
      const message = extractApiErrorMessage(e, "Failed to submit purchase");
      setSubmitError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleUpdateAttachments = async () => {
    setSubmitError("");
    const assignmentId =
      resolveAssignmentId(detail) || activeAssignmentIdRef.current;
    if (!assignmentId) {
      setSubmitError("Assignment not found. Close and reopen this item.");
      return;
    }
    if (!billFile && productImageFiles.length === 0) {
      setSubmitError("Select a new bill and/or product image(s) to upload.");
      return;
    }

    setSubmitting(true);
    setUploading(true);
    try {
      const { billDocumentId, productImages } = await uploadAttachmentPayload();
      const payload = {};
      if (billDocumentId) payload.billDocumentId = billDocumentId;
      if (productImages.length) payload.productImages = productImages;

      const res = await localPurchaseService.updateAttachments(
        assignmentId,
        payload,
      );
      const updated = unwrapLocalPurchase(res);
      if (updated) {
        setDetail((prev) => ({
          ...(prev || {}),
          ...updated,
          _id: resolveAssignmentId(updated) || assignmentId,
        }));
      }
      toastSuccess("Bill and images updated");
      setBillFile(null);
      setProductImageFiles([]);
      setSubmitError("");
      load();
    } catch (e) {
      const message = extractApiErrorMessage(
        e,
        "Failed to update bill or images",
      );
      setSubmitError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const snap = detail?.productSnapshot || {};
  const isPending =
    String(detail?.status || "pending").toLowerCase() !== "submitted";
  const referenceImages = toGalleryItems(detail?.productImagesFromQuery);
  const submittedProductImages = toGalleryItems(detail?.productImages);
  const billUrl = detail?.bill?.path ? imgSrc(detail.bill.path) : "";

  return (
    <div>
      <PageHeader
        title="My Purchase"
        description="View your purchase assignments and submit bills, images, and remarks."
        actions={
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary!" />
            <Badge variant="secondary">{total} total</Badge>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            Status
          </Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            Zone
          </Label>
          <Select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            disabled={marketZonesLoading}
          >
            <option value="">All zones</option>
            {marketZones.map((zone) => (
              <option key={zone.id} value={String(zone.id)}>
                {formatPurchaseZone(zone)}
              </option>
            ))}
          </Select>
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel="My Purchase"
        />
        <Button
          variant="outline"
          onClick={() => {
            setStatus("");
            setZoneId("");
            setPage(1);
          }}
        >
          Clear filters
        </Button>
      </div>

      {loading ? (
        <Loader message="Loading assignments…" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No purchase assignments yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => {
              const cardSnap = row.productSnapshot || {};

              return (
                <Card
                  key={resolveAssignmentId(row) || row._id}
                  className="flex h-full cursor-pointer flex-col shadow-sm transition-colors hover:bg-accent/50"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDetail(row);
                    }
                  }}
                >
                  <CardContent className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h6
                          className="mb-1 truncate text-base font-semibold"
                          title={cardSnap.productName}
                        >
                          {cardSnap.productName || "Product"}
                        </h6>
                        <div className="font-mono text-sm text-muted-foreground">
                          {row.queryCode || cardSnap.queryCode || "—"}
                        </div>
                      </div>
                      {statusBadge(row.status)}
                    </div>

                    <div className="mb-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Sales Order Code:
                        </span>{" "}
                        <span className="font-mono font-semibold">
                          {row.poCode || cardSnap.poCode || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Qty:</span>{" "}
                        {cardSnap.quantity ?? "—"} {cardSnap.unit || ""}
                      </div>
                      {cardSnap.rawProductCode && (
                        <div>
                          <span className="text-muted-foreground">Code:</span>{" "}
                          <span className="font-mono">
                            {cardSnap.rawProductCode}
                          </span>
                        </div>
                      )}
                      {row.zoneId && (
                        <div>
                          <span className="text-muted-foreground">Zone:</span>{" "}
                          {formatPurchaseZone(row.zoneId)}
                        </div>
                      )}
                    </div>

                    {(row.assignmentRemark || row.remark) && (
                      <div className="mb-2 truncate break-words text-sm">
                        <span className="text-muted-foreground">Note:</span>{" "}
                        {row.assignmentRemark || row.remark}
                      </div>
                    )}

                    <div className="mt-auto border-t border-border pt-2 text-sm text-primary!">
                      Tap for full details
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            showRange
            totalItems={total}
            itemsPerPage={pageSize}
            align="center"
            ariaLabel="My purchase pages"
            wrapperClassName="mt-3 flex flex-col items-center gap-2"
          />
        </>
      )}

      <Dialog
        open={detailOpen}
        onOpenChange={(o) => {
          if (!o) closeDetail();
        }}
      >
        <DialogContent
          className="max-w-xl"
          showClose={!(detailLoading || submitting || uploading)}
          onInteractOutside={(e) => {
            if (detailLoading || submitting || uploading) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (detailLoading || submitting || uploading) e.preventDefault();
          }}
        >
          {detail && (
            <>
              <DialogHeader className="flex-col items-start gap-1.5">
                <DialogTitle>Product Details</DialogTitle>
                <DialogDescription
                  className="truncate"
                  title={snap.productName}
                >
                  {snap.productName || "Product"}
                </DialogDescription>
                <div className="pt-1">{statusBadge(detail.status)}</div>
              </DialogHeader>

              <div className="space-y-3">
                {detailLoading ? (
                  <Loader message="Loading product…" />
                ) : (
                  <>
                    {referenceImages.length > 0 ? (
                      <div className="mb-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Product reference
                        </div>
                        <ImageGallery
                          items={referenceImages}
                          alt={snap.productName || "Product"}
                        />
                      </div>
                    ) : (
                      <div
                        className="mb-3 flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground"
                        style={{ minHeight: 160 }}
                      >
                        No reference product image
                      </div>
                    )}

                    <div className="mb-3 rounded-lg border border-border bg-muted/40 p-3">
                      <DetailRow
                        label="Product name"
                        value={snap.productName}
                      />
                      <DetailRow
                        label="Product code"
                        value={snap.rawProductCode}
                        mono
                      />
                      <DetailRow
                        label="Query code"
                        value={detail.queryCode || snap.queryCode}
                        mono
                      />
                      <DetailRow
                        label="Sales Order code"
                        value={detail.poCode || snap.poCode}
                        mono
                      />
                      <DetailRow
                        label="Quantity"
                        value={
                          snap.quantity != null
                            ? `${snap.quantity}${
                                snap.unit ? ` ${snap.unit}` : ""
                              }`
                            : null
                        }
                      />
                      <DetailRow label="Unit" value={snap.unit} />
                      <DetailRow label="HSN" value={snap.hsnNumber} mono />
                      <DetailRow label="Model" value={snap.modelNumber} />
                      <DetailRow
                        label="GST %"
                        value={
                          snap.gstPercentage != null
                            ? `${snap.gstPercentage}%`
                            : null
                        }
                      />
                      <DetailRow
                        label="Dispatch date"
                        value={dateFormatter(snap.dispatchmentDate, "—")}
                      />
                      <DetailRow label="Description" value={snap.description} />
                      <DetailRow label="Product remark" value={snap.remark} />
                    </div>

                    <div className="mb-3 rounded-lg border border-border p-3">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        ASSIGNMENT
                      </div>
                      <DetailRow
                        label="Assignment remark"
                        value={detail.assignmentRemark || detail.remark}
                      />
                      <DetailRow
                        label="Zone"
                        value={formatPurchaseZone(detail.zoneId)}
                      />
                      <DetailRow
                        label="Assigned on"
                        value={dateTimeFormatter(detail.createdAt, "—")}
                      />
                      {detail.locationLink && (
                        <div className="py-2">
                          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Location link
                          </div>
                          <a
                            href={detail.locationLink}
                            target="_blank"
                            rel="noreferrer"
                            className="break-words text-sm text-primary! underline"
                          >
                            {detail.locationLink}
                          </a>
                        </div>
                      )}
                    </div>

                    {!isPending && (
                      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          SUBMISSION
                        </div>
                        <DetailRow
                          label="Submitted on"
                          value={dateTimeFormatter(detail.submittedAt, "—")}
                        />
                        <DetailRow
                          label="Submission remark"
                          value={detail.submissionRemark}
                        />
                        <div className="border-b border-border py-2">
                          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Bill
                          </div>
                          {billUrl ? (
                            <a
                              href={billUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                              })}
                            >
                              View bill
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        <div className="pt-2">
                          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Submitted product images
                          </div>
                          <ImageGallery
                            items={submittedProductImages}
                            alt="Submitted product"
                            emptyLabel="No submitted product images"
                          />
                        </div>
                      </div>
                    )}

                    {!isPending && (
                      <div className="mb-3 rounded-lg border border-border p-3">
                        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          RE-UPLOAD BILL / IMAGES
                        </div>
                        <p className="mb-3 text-sm text-muted-foreground">
                          Choose a new bill and/or product images. Only the
                          files you select will be replaced.
                        </p>
                        <Label htmlFor="local-purchase-bill-reupload">
                          Bill
                        </Label>
                        <Input
                          id="local-purchase-bill-reupload"
                          type="file"
                          accept="image/*,.pdf"
                          className="mb-3 mt-1.5"
                          disabled={submitting || uploading}
                          onChange={(e) => {
                            setBillFile(e.target.files?.[0] || null);
                            setSubmitError("");
                          }}
                        />
                        {billFile && (
                          <div className="mb-3 text-sm text-muted-foreground">
                            Selected: {billFile.name}
                          </div>
                        )}

                        <Label htmlFor="local-purchase-product-images-reupload">
                          Product images
                        </Label>
                        <Input
                          id="local-purchase-product-images-reupload"
                          type="file"
                          accept="image/*"
                          multiple
                          className="mb-2 mt-1.5"
                          disabled={submitting || uploading}
                          onChange={(e) => {
                            setProductImageFiles(
                              Array.from(e.target.files || []),
                            );
                            setSubmitError("");
                          }}
                        />
                        {productImageFiles.length > 0 && (
                          <div className="mb-3 text-sm text-muted-foreground">
                            {productImageFiles.length} image(s) selected
                          </div>
                        )}

                        {submitError ? (
                          <Alert variant="destructive" className="mb-3">
                            <AlertDescription>{submitError}</AlertDescription>
                          </Alert>
                        ) : null}

                        <Button
                          type="button"
                          className="w-full"
                          onClick={handleUpdateAttachments}
                          disabled={submitting || uploading}
                        >
                          <CloudUpload className="h-4 w-4" />
                          {submitting || uploading
                            ? "Uploading…"
                            : "Update bill / images"}
                        </Button>
                      </div>
                    )}

                    {isPending && (
                      <div className="mb-3 rounded-lg border border-border p-3">
                        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          SUBMIT PURCHASE
                        </div>
                        <Label htmlFor="local-purchase-bill">Bill</Label>
                        <Input
                          id="local-purchase-bill"
                          type="file"
                          accept="image/*,.pdf"
                          className="mb-3 mt-1.5"
                          onChange={(e) => {
                            setBillFile(e.target.files?.[0] || null);
                            setSubmitError("");
                          }}
                        />
                        {billFile && (
                          <div className="mb-3 text-sm text-muted-foreground">
                            Selected: {billFile.name}
                          </div>
                        )}

                        <Label htmlFor="local-purchase-product-images">
                          Product images
                        </Label>
                        <Input
                          id="local-purchase-product-images"
                          type="file"
                          accept="image/*"
                          multiple
                          className="mb-2 mt-1.5"
                          onChange={(e) => {
                            setProductImageFiles(
                              Array.from(e.target.files || []),
                            );
                            setSubmitError("");
                          }}
                        />
                        {productImageFiles.length > 0 && (
                          <div className="mb-3 text-sm text-muted-foreground">
                            {productImageFiles.length} image(s) selected
                          </div>
                        )}

                        <Label htmlFor="local-purchase-submission-remark">
                          Remark
                        </Label>
                        <Textarea
                          id="local-purchase-submission-remark"
                          rows={2}
                          value={submissionRemark}
                          onChange={(e) => setSubmissionRemark(e.target.value)}
                          placeholder="Optional note about this purchase…"
                          className="mb-3 mt-1.5"
                        />

                        {submitError ? (
                          <Alert variant="destructive" className="mb-3">
                            <AlertDescription>{submitError}</AlertDescription>
                          </Alert>
                        ) : null}

                        <Button
                          type="button"
                          className="w-full"
                          onClick={handleSubmitPurchase}
                          disabled={submitting || uploading}
                        >
                          <CloudUpload className="h-4 w-4" />
                          {submitting || uploading
                            ? "Submitting…"
                            : "Mark submitted"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!detailLoading && (
                <DialogFooter className="flex-col gap-2">
                  {detail.locationLink ? (
                    <a
                      className={buttonVariants({
                        variant: isPending ? "outline" : "default",
                        className: "w-full",
                      })}
                      href={detail.locationLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="h-4 w-4" />
                      Open location
                    </a>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={closeDetail}
                    disabled={submitting || uploading}
                  >
                    Close
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPurchaseList;
