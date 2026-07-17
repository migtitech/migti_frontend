import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Clipboard, CloudDownload } from "lucide-react";
import localPurchaseService from "../../services/localPurchaseService";
import areaService from "../../services/areaService";
import {
  Loader,
  TablePagination,
  FilterLockButton,
  PageHeader,
  DataTable,
  RowActions,
  StatusBadge,
} from "../../components";
import {
  Badge,
  Button,
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
import { toastError } from "../../utils/toast";
import { getAssetsUrl } from "../../api/endpoints";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const LOCAL_PURCHASE_FILTER_DEFAULTS = { status: "", zoneId: "" };

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

const statusText = (status) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "submitted":
      return "Submitted";
    default:
      return status || "—";
  }
};

const formatEmployee = (emp) => {
  if (!emp || typeof emp !== "object") return "—";
  return (
    emp.email?.trim() || emp.companyEmail?.trim() || emp.name?.trim() || "—"
  );
};

const salesOrderCodeLast4 = (code) => {
  const codeText = code != null ? String(code).trim() : "";
  if (!codeText) return null;
  return codeText.length <= 4 ? codeText : codeText.slice(-4);
};

const fileUrl = (path) => {
  if (!path) return "";
  if (
    typeof path === "string" &&
    (path.startsWith("http://") || path.startsWith("https://"))
  ) {
    return path;
  }
  return getAssetsUrl(path);
};

const resolveDocPath = (doc) => {
  if (!doc) return "";
  if (typeof doc === "string") return doc;
  return doc.path || doc.url || "";
};

const docFileName = (doc, fallback) => {
  if (!doc || typeof doc !== "object") return fallback;
  return doc.name || doc.originalName || fallback;
};

const isImageDoc = (doc) => {
  const mime = String(doc?.mimeType || doc?.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const path = resolveDocPath(doc).toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(path);
};

const triggerDownload = async (url, filename) => {
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename || "download";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const formatPurchaseZone = (zone) => {
  if (!zone || typeof zone !== "object") return "—";
  const name = zone.name?.trim() || "";
  const city = zone.city?.trim() || "";
  if (name && city) return `${name} (${city})`;
  return name || city || "—";
};

const unwrapPayload = (res) => res?.data?.data ?? res?.data;

const DownloadButton = ({ url, filename, label = "Download" }) => {
  if (!url) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-primary"
      title={label}
      aria-label={label}
      onClick={() => triggerDownload(url, filename)}
    >
      <CloudDownload className="h-4 w-4" />
    </Button>
  );
};

const LocalPurchaseList = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "local_purchase",
    LOCAL_PURCHASE_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [status, setStatus] = useState(initialValues.status);
  const [zoneId, setZoneId] = useState(initialValues.zoneId);
  const [marketZones, setMarketZones] = useState([]);
  const [marketZonesLoading, setMarketZonesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

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
      toastError(e?.message || "Failed to load local purchase assignments");
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

  useFilterLockPersist("local_purchase", filtersLocked, {
    status,
    zoneId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status, zoneId });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const openDetail = (row) => {
    setActiveRow(row);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setActiveRow(null);
  };

  const snap = activeRow?.productSnapshot || {};
  const billUrl = activeRow?.bill?.path ? fileUrl(activeRow.bill.path) : "";
  const billName = docFileName(activeRow?.bill, "bill");
  const submissionRemark =
    activeRow?.submissionRemark ||
    (String(activeRow?.status || "").toLowerCase() === "submitted"
      ? activeRow?.remark
      : "") ||
    "";
  const productImages = (
    Array.isArray(activeRow?.productImages) ? activeRow.productImages : []
  ).map((doc, idx) => ({
    doc,
    url: fileUrl(resolveDocPath(doc)),
    name: docFileName(doc, `product-image-${idx + 1}`),
    key: doc?._id || doc?.documentId || idx,
  }));

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "S.No",
        width: 56,
        align: "center",
        toggleable: false,
        exportable: false,
        render: (_row, idx) => (page - 1) * pageSize + idx + 1,
      },
      {
        key: "product",
        label: "Product",
        render: (row) => {
          const rowSnap = row.productSnapshot || {};
          return (
            <div>
              <div className="font-semibold">{rowSnap.productName || "—"}</div>
              {rowSnap.rawProductCode && (
                <div className="font-mono text-xs text-muted-foreground">
                  {rowSnap.rawProductCode}
                </div>
              )}
            </div>
          );
        },
        exportValue: (row) => row.productSnapshot?.productName || "—",
      },
      {
        key: "salesOrderCode",
        label: "Sales Order Code",
        render: (row) => {
          const rowSnap = row.productSnapshot || {};
          const salesOrderCode = row.poCode || rowSnap.poCode;
          const display = salesOrderCodeLast4(salesOrderCode);
          return display ? (
            <Badge
              variant="secondary"
              className="font-mono"
              title={salesOrderCode ? String(salesOrderCode).trim() : undefined}
            >
              {display}
            </Badge>
          ) : (
            "—"
          );
        },
        exportValue: (row) =>
          salesOrderCodeLast4(row.poCode || row.productSnapshot?.poCode) || "—",
      },
      {
        key: "qty",
        label: "Qty",
        width: 90,
        align: "center",
        render: (row) => {
          const rowSnap = row.productSnapshot || {};
          return `${rowSnap.quantity ?? "—"}${
            rowSnap.unit ? ` ${rowSnap.unit}` : ""
          }`;
        },
      },
      {
        key: "employee",
        label: "Assigned Employee",
        render: (row) =>
          formatEmployee(
            row.employeeId && typeof row.employeeId === "object"
              ? row.employeeId
              : null,
          ),
        exportValue: (row) =>
          formatEmployee(
            row.employeeId && typeof row.employeeId === "object"
              ? row.employeeId
              : null,
          ),
      },
      {
        key: "submission",
        label: "Submission",
        exportable: false,
        render: (row) => {
          const rowRemark =
            row.submissionRemark ||
            (String(row.status || "").toLowerCase() === "submitted"
              ? row.remark
              : "") ||
            "";
          const imageCount = Array.isArray(row.productImages)
            ? row.productImages.length
            : 0;
          const hasBill = Boolean(row.bill?.path);
          return String(row.status || "").toLowerCase() === "submitted" ? (
            <div className="text-sm">
              {rowRemark ? (
                <div className="mb-1 max-w-[180px] truncate" title={rowRemark}>
                  {rowRemark}
                </div>
              ) : (
                <div className="mb-1 text-muted-foreground">No remark</div>
              )}
              <div className="text-muted-foreground">
                {hasBill ? "Bill" : "No bill"}
                {imageCount ? ` · ${imageCount} image(s)` : " · No images"}
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        width: 110,
        sortValue: (row) => statusText(row.status),
        exportValue: (row) => statusText(row.status),
        render: (row) => statusBadge(row.status),
      },
      {
        key: "createdAt",
        label: "Assigned On",
        width: 120,
        align: "center",
        render: (row) => dateFormatter(row.createdAt, "—"),
        exportValue: (row) => dateFormatter(row.createdAt, "—"),
      },
      {
        key: "actions",
        label: "Action",
        width: 120,
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (row) => <RowActions onView={() => openDetail(row)} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Local Purchase"
        description="Track local purchase assignments and review submitted bills and images."
        actions={
          <div className="flex items-center gap-2">
            <Clipboard className="h-5 w-5 text-primary!" />
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
          pageLabel="Local Purchase"
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
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id}
            showSearch={false}
            exportFileName="local-purchase"
            emptyTitle="No assignments"
            emptyMessage="No local purchase assignments found."
          />
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            showRange
            totalItems={total}
            itemsPerPage={pageSize}
            align="center"
            ariaLabel="Local purchase pages"
            wrapperClassName="mt-3 flex flex-col items-center gap-2"
          />
        </>
      )}

      <Sheet open={detailOpen} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {activeRow && (
            <>
              <SheetHeader>
                <SheetTitle>Submission details</SheetTitle>
                <SheetDescription className="truncate" title={snap.productName}>
                  {snap.productName || "Product"}
                </SheetDescription>
                <div className="pt-1">{statusBadge(activeRow.status)}</div>
              </SheetHeader>

              <SheetBody>
                <div className="mb-3 text-sm">
                  <div className="text-muted-foreground">Assigned employee</div>
                  <div className="font-semibold">
                    {formatEmployee(
                      activeRow.employeeId &&
                        typeof activeRow.employeeId === "object"
                        ? activeRow.employeeId
                        : null,
                    )}
                  </div>
                </div>

                {String(activeRow.status || "").toLowerCase() !==
                "submitted" ? (
                  <p className="text-sm text-muted-foreground">
                    Not submitted yet.
                  </p>
                ) : (
                  <>
                    <div className="mb-3 rounded-lg border border-border bg-muted/40 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Remark
                      </div>
                      <div className="break-words text-sm">
                        {submissionRemark || "—"}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Submitted on{" "}
                        {dateTimeFormatter(activeRow.submittedAt, "—")}
                      </div>
                    </div>

                    <div className="mb-3 rounded-lg border border-border p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Bill
                        </div>
                        {billUrl ? (
                          <DownloadButton
                            url={billUrl}
                            filename={billName}
                            label="Download bill"
                          />
                        ) : null}
                      </div>
                      {billUrl ? (
                        isImageDoc(activeRow.bill) ? (
                          <div className="flex items-start gap-2">
                            <img
                              src={billUrl}
                              alt={billName}
                              className="rounded-lg border border-border"
                              style={{
                                maxWidth: 120,
                                maxHeight: 120,
                                objectFit: "contain",
                              }}
                            />
                            <span className="break-words text-sm">
                              {billName}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 break-words text-sm">
                              {billName}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => triggerDownload(billUrl, billName)}
                            >
                              <CloudDownload className="h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No bill uploaded
                        </span>
                      )}
                    </div>

                    <div className="rounded-lg border border-border p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Product images
                      </div>
                      {productImages.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          No product images uploaded
                        </span>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {productImages.map((img) => (
                            <div
                              key={img.key}
                              className="flex items-start gap-2 rounded-lg border border-border p-2"
                            >
                              {isImageDoc(img.doc) ? (
                                <img
                                  src={img.url}
                                  alt={img.name}
                                  className="shrink-0 rounded-lg border border-border"
                                  style={{
                                    width: 72,
                                    height: 72,
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <div
                                  className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
                                  style={{ width: 72, height: 72 }}
                                >
                                  File
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="break-words text-sm">
                                  {img.name}
                                </div>
                                <DownloadButton
                                  url={img.url}
                                  filename={img.name}
                                  label={`Download ${img.name}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </SheetBody>

              <SheetFooter>
                <Button type="button" variant="outline" onClick={closeDetail}>
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LocalPurchaseList;
