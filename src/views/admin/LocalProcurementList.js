import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingBasket, Clipboard, Users } from "lucide-react";
import localProcurementService from "../../services/localProcurementService";
import areaService from "../../services/areaService";
import documentService from "../../services/documentService";
import ProductUnitSelect from "../../components/ProductUnitSelect/ProductUnitSelect";
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
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter } from "../../utils/dateFormatter";
import { useAuth, ROLES } from "../../context/AuthContext";

const LOCAL_PROCUREMENT_FILTER_DEFAULTS = {
  status: "",
  dateFrom: "",
  dateTo: "",
  zoneId: "",
};

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
  )
    return path;
  return getAssetsUrl(path);
};

const resolveImagePath = (img) => {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.path || img.url || "";
};

const sanitizeRateInput = (raw) => {
  if (raw === "" || raw == null) return "";
  const t = String(raw).replace(/[^\d.]/g, "");
  if (t === "") return "";
  const dot = t.indexOf(".");
  if (dot === -1) return t;
  return t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, "");
};

const latestRate = (row) => {
  const rates = Array.isArray(row?.rates) ? row.rates : [];
  if (rates.length) return rates[rates.length - 1];
  if (row?.status === "submitted") {
    return {
      supplier: row.supplier,
      price: row.rate,
      rate: row.rate,
      unit: row.unit,
      remark: row.remark,
    };
  }
  return null;
};

const formatProcurementZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const unwrapPayload = (res) => res?.data?.data ?? res?.data;

const LocalProcurementList = () => {
  const { user } = useAuth();
  const isLocalPro =
    String(user?.role || "").toLowerCase() === ROLES.LOCAL_PROCUREMENT;

  const pageTitle = isLocalPro ? "My Pro Bucket" : "Local Pro";
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "local_procurement",
    LOCAL_PROCUREMENT_FILTER_DEFAULTS,
  );

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [status, setStatus] = useState(initialValues.status);
  const [fromDate, setFromDate] = useState(initialValues.dateFrom);
  const [toDate, setToDate] = useState(initialValues.dateTo);
  const [zoneId, setZoneId] = useState(initialValues.zoneId);
  const [marketZones, setMarketZones] = useState([]);
  const [marketZonesLoading, setMarketZonesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [submitPanelOpen, setSubmitPanelOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [supplier, setSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState("");
  const [remark, setRemark] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        localProcurementService.list({
          page,
          pageSize,
          status: status.trim() || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          zoneId: zoneId.trim() || undefined,
        }),
      );
      const block = res?.data;
      setRows(Array.isArray(block?.data) ? block.data : []);
      setTotal(Number(block?.total) || 0);
    } catch (e) {
      toastError(e?.message || "Failed to load local procurement items");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, fromDate, toDate, zoneId]);

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
  }, [status, fromDate, toDate, zoneId]);

  useFilterLockPersist("local_procurement", filtersLocked, {
    status,
    dateFrom: fromDate,
    dateTo: toDate,
    zoneId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      status,
      dateFrom: fromDate,
      dateTo: toDate,
      zoneId,
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const canSubmitRow = useMemo(
    () => (row) => {
      if (row?.status !== "pending") return false;
      if (
        user?.role === ROLES.SUPER_ADMIN ||
        user?.role === ROLES.ADMIN ||
        user?.role === ROLES.HEAD_OF_DEPARTMENT
      ) {
        return true;
      }
      if (isLocalPro) {
        const uid = user?.id || user?._id;
        return (
          uid && String(row?.employeeId?._id || row?.employeeId) === String(uid)
        );
      }
      return false;
    },
    [user, isLocalPro],
  );

  const openSubmitPanel = (row) => {
    setActiveRow(row);
    setSupplier("");
    setPrice("");
    setRate("");
    setUnit(row?.productSnapshot?.unit || "");
    setRemark("");
    setImageFiles([]);
    setSubmitPanelOpen(true);
  };

  const closeSubmitPanel = () => {
    if (submitting || uploadingImages) return;
    setSubmitPanelOpen(false);
    setActiveRow(null);
    setImageFiles([]);
  };

  const handleSubmit = async () => {
    if (!activeRow?._id) return;
    if (!supplier.trim()) {
      toastError("Supplier is required");
      return;
    }
    if (rate === "" || Number.isNaN(Number(rate)) || Number(rate) < 0) {
      toastError("Enter a valid rate ≥ 0");
      return;
    }
    if (price !== "" && (Number.isNaN(Number(price)) || Number(price) < 0)) {
      toastError("Enter a valid price ≥ 0");
      return;
    }

    setSubmitting(true);
    try {
      let images = [];
      if (imageFiles.length) {
        setUploadingImages(true);
        const uploadRes = await documentService.uploadImages(imageFiles);
        const docs =
          uploadRes?.data?.documents ||
          uploadRes?.documents ||
          uploadRes?.data ||
          [];
        images = (Array.isArray(docs) ? docs : [])
          .filter((d) => d?._id)
          .map((d) => ({ documentId: d._id }));
        setUploadingImages(false);
      }

      await localProcurementService.submit(activeRow._id, {
        supplier: supplier.trim(),
        price: price !== "" ? Number(price) : undefined,
        rate: Number(rate),
        unit: unit || "",
        remark: remark || "",
        images,
      });
      toastSuccess("Submitted successfully");
      closeSubmitPanel();
      load();
    } catch (e) {
      toastError(e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description="Review procurement assignments and submit supplier rates."
        actions={
          <div className="flex items-center gap-2">
            {isLocalPro ? (
              <ShoppingBasket className="h-5 w-5 text-primary!" />
            ) : (
              <Clipboard className="h-5 w-5 text-primary!" />
            )}
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
        <div className="w-40">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            From date
          </Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            To date
          </Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
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
                {formatProcurementZone(zone)}
              </option>
            ))}
          </Select>
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel={pageTitle}
        />
        <Button
          variant="outline"
          onClick={() => {
            setStatus("");
            setFromDate("");
            setToDate("");
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
          {isLocalPro
            ? "No assignments in your bucket yet."
            : "No local procurement assignments found."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const snap = row.productSnapshot || {};
            const firstImage = Array.isArray(snap.images)
              ? snap.images[0]
              : null;
            const src = imgSrc(resolveImagePath(firstImage));
            const submitted = latestRate(row);
            const submissionImages = Array.isArray(row.images)
              ? row.images
              : [];

            return (
              <Card key={row._id} className="flex h-full flex-col shadow-sm">
                {src ? (
                  <div
                    className="flex items-center justify-center border-b border-border bg-muted"
                    style={{ height: 140 }}
                  >
                    <img
                      src={src}
                      alt={snap.productName || "Product"}
                      style={{
                        maxHeight: 130,
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                ) : null}
                <CardContent className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h6
                        className="mb-1 truncate text-base font-semibold"
                        title={snap.productName}
                      >
                        {snap.productName || "Product"}
                      </h6>
                      <div className="text-sm text-muted-foreground">
                        {row.queryCode || snap.queryCode || "—"}
                      </div>
                    </div>
                    {statusBadge(row.status)}
                  </div>

                  <div className="mb-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Qty:</span>{" "}
                      {snap.quantity ?? "—"} {snap.unit || ""}
                    </div>
                    {snap.categoryName && (
                      <div>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        {snap.categoryName}
                      </div>
                    )}
                    {row.zoneId && (
                      <div>
                        <span className="text-muted-foreground">Zone:</span>{" "}
                        {formatProcurementZone(row.zoneId)}
                      </div>
                    )}
                  </div>

                  {!isLocalPro && (
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{row.employeeId?.name || "Unassigned"}</span>
                    </div>
                  )}

                  {row.assignmentRemark && (
                    <div className="mb-2 break-words text-sm">
                      <span className="text-muted-foreground">
                        Assignment note:
                      </span>{" "}
                      {row.assignmentRemark}
                    </div>
                  )}

                  {submitted && (
                    <div className="mb-2 border-t border-border pt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Supplier:</span>{" "}
                        {submitted.supplier || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price:</span> ₹{" "}
                        {submitted.price ?? submitted.rate ?? "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rate:</span> ₹{" "}
                        {submitted.rate ?? "—"} / {submitted.unit || "—"}
                      </div>
                      {submitted.remark && (
                        <div className="break-words">
                          <span className="text-muted-foreground">Remark:</span>{" "}
                          {submitted.remark}
                        </div>
                      )}
                      {submissionImages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {submissionImages.map((img) => {
                            const thumb = imgSrc(resolveImagePath(img));
                            if (!thumb) return null;
                            return (
                              <a
                                key={img._id || img.documentId || thumb}
                                href={thumb}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={thumb}
                                  alt={img.name || "Upload"}
                                  className="rounded border border-border"
                                  style={{
                                    width: 48,
                                    height: 48,
                                    objectFit: "cover",
                                  }}
                                />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-auto text-sm text-muted-foreground">
                    Assigned {dateFormatter(row.createdAt, "—")}
                  </div>

                  {canSubmitRow(row) && (
                    <Button
                      size="sm"
                      className="mt-2 self-start"
                      onClick={() => openSubmitPanel(row)}
                    >
                      Submit rate
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        wrapperClassName="mt-4 flex justify-center"
        align="center"
      />

      <Sheet
        open={submitPanelOpen}
        onOpenChange={(o) => {
          if (!o) closeSubmitPanel();
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-sm"
          onInteractOutside={(e) => {
            if (submitting || uploadingImages) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (submitting || uploadingImages) e.preventDefault();
          }}
        >
          <SheetHeader>
            <SheetTitle>Submit rate</SheetTitle>
            {activeRow?.productSnapshot?.productName && (
              <SheetDescription className="truncate">
                {activeRow.productSnapshot.productName}
              </SheetDescription>
            )}
          </SheetHeader>

          <SheetBody className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Supplier <span className="text-destructive">*</span>
              </Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Price</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(sanitizeRateInput(e.target.value))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Rate <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(sanitizeRateInput(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <ProductUnitSelect
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remark</Label>
              <Input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Images</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setImageFiles(Array.from(e?.target?.files || []))
                }
              />
              {imageFiles.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {imageFiles.length} file(s) selected
                </div>
              )}
            </div>
          </SheetBody>

          <SheetFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeSubmitPanel}
              disabled={submitting || uploadingImages}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploadingImages}
            >
              {submitting || uploadingImages ? "Submitting…" : "Submit"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LocalProcurementList;
