import React, { useEffect, useState, useMemo } from "react";
import dispatchmentBucketService from "../../services/dispatchmentBucketService";
import documentService from "../../services/documentService";
import { getAssetsUrl } from "../../api/endpoints";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import {
  DataTable,
  PageHeader,
  RowActions,
  TablePagination,
  FilterLockButton,
} from "../../components";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  Textarea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  Spinner,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import usePermissions from "../../hooks/usePermissions";
import { dateFormatter } from "../../utils/dateFormatter";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";
import { formatAreaDisplayOrDash } from "../../utils/areaDisplay";

const serverStatus = (d) => d?.status ?? d?.inventoryStatus;

const invStatus = (d) => String(serverStatus(d) || "pending");

const DISPATCHMENT_FILTER_DEFAULTS = { status: "", dateFrom: "", dateTo: "" };

/** All = both statuses; otherwise filter to one (matches API). */
const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "ready_for_dispatchment", label: "Ready for dispatchment" },
  { value: "delivered", label: "Delivered" },
];

const STATUS_LABELS = {
  inventory_received: "Inventory received",
  ready_for_dispatchment: "Ready for dispatchment",
  delivered: "Delivered",
  pending: "Pending",
  purchased: "Purchased",
};

const STATUS_VARIANTS = {
  inventory_received: "success",
  ready_for_dispatchment: "default",
  delivered: "secondary",
  pending: "warning",
  purchased: "secondary",
};

const statusLabel = (s) => {
  if (s === undefined || s === null || s === "") return "—";
  const v = String(s).trim();
  if (STATUS_LABELS[v]) return STATUS_LABELS[v];
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusBadge = (s) => {
  if (s === undefined || s === null || s === "")
    return <Badge variant="outline">—</Badge>;
  const v = String(s).trim();
  if (STATUS_LABELS[v]) {
    return (
      <Badge variant={STATUS_VARIANTS[v] || "secondary"}>
        {STATUS_LABELS[v]}
      </Badge>
    );
  }
  const readable = v
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant="secondary">{readable}</Badge>;
};

const formatAddress = (companyInfo, areaLookup) => {
  if (!companyInfo || typeof companyInfo !== "object") return "—";
  const areaLabel = formatAreaDisplayOrDash(companyInfo.area, areaLookup, "");
  const parts = [
    companyInfo.name,
    [areaLabel, companyInfo.location].filter(Boolean).join(", "),
    companyInfo.address,
  ].filter((part) => part && String(part).trim());
  return parts.length ? parts.join(" · ") : "—";
};

const formatPm = (c) => {
  const pms = c?.purchaseManagers;
  if (!Array.isArray(pms) || !pms.length) return "—";
  return pms
    .map((pm) => {
      const bits = [pm?.name, pm?.phone, pm?.email].filter(
        (x) => x && String(x).trim(),
      );
      return bits.join(" · ");
    })
    .filter(Boolean)
    .join(" | ");
};

const parseListResponse = (res) => {
  if (!res || typeof res !== "object") {
    return {
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };
  }
  const block = res.data;
  if (!block || typeof block !== "object") {
    return {
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };
  }
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const DispatchmentList = () => {
  const { canUpdate } = usePermissions();
  const { lookup, formatAreaWithLocation } = useAreaNameLookup();
  const canAct = canUpdate("dispatchment");
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "dispatchment_list",
    DISPATCHMENT_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [from, setFrom] = useState(initialValues.dateFrom);
  const [to, setTo] = useState(initialValues.dateTo);
  const [status, setStatus] = useState(initialValues.status);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [receivingRemark, setReceivingRemark] = useState("");
  const [receivingFile, setReceivingFile] = useState(null);

  useEffect(() => {
    if (detailOpen && detailId) {
      setReceivingRemark("");
      setReceivingFile(null);
    }
  }, [detailOpen, detailId]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, from, to, status]);

  useFilterLockPersist("dispatchment_list", filtersLocked, {
    status,
    dateFrom: from,
    dateTo: to,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status, dateFrom: from, dateTo: to });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        dispatchmentBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          status: status.trim() ? status.trim() : undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
    } catch (e) {
      toastError(e?.message || "Failed to load dispatchment queue");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchDebounced, from, to, status]);

  const openDetail = async (id) => {
    setDetailId(id);
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await dispatchmentBucketService.getById(id);
      const doc = res?.data;
      setDetail(
        doc && typeof doc === "object" && !Array.isArray(doc) ? doc : null,
      );
    } catch (e) {
      toastError(e?.message || "Failed to load line");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId(null);
    setDetail(null);
    setReceivingRemark("");
    setReceivingFile(null);
  };

  const markDeliveredFromDetail = async () => {
    if (!detailId || !canAct) return;
    if (!receivingFile) {
      toastError(
        "Upload a receiving proof image (photo or gallery) before marking delivered.",
      );
      return;
    }
    setDelivering(true);
    try {
      const ures = await documentService.uploadAttachments([receivingFile]);
      const pld = ures?.data || ures;
      const docs = pld?.data?.documents || pld?.documents || [];
      const first = docs[0];
      const docId = first?._id || first?.id;
      if (!docId) {
        toastError("Could not upload receiving proof");
        return;
      }
      const receivingDocumentId = String(docId);
      const res = await dispatchmentBucketService.markDelivered(detailId, {
        receivingDocumentId,
        receivingRemark: (receivingRemark || "").trim(),
      });
      const payload = res?.data;
      if (payload && payload.success === false) {
        toastError(payload?.message || "Update failed");
        return;
      }
      toastSuccess(
        "Marked as delivered — pending HOD approval in Delivery approval",
      );
      closeDetail();
      await load();
    } catch (e) {
      toastError(e?.message || "Update failed");
    } finally {
      setDelivering(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const itemCompany = detail?.companyInfo;

  const columns = useMemo(
    () => [
      {
        key: "productName",
        label: "Product",
        sortable: true,
        exportValue: (row) => row.productName || "—",
        render: (row) => (
          <span className="break-words">{row.productName || "—"}</span>
        ),
      },
      {
        key: "poCode",
        label: "Sales Order number",
        sortable: true,
        render: (row) => row.poCode || "—",
      },
      {
        key: "rawProductCode",
        label: "Raw code",
        exportValue: (row) => row.rawProductCode || "—",
        render: (row) =>
          row.rawProductCode ? <code>{row.rawProductCode}</code> : "—",
      },
      {
        key: "company",
        label: "Company & address",
        exportValue: (row) => formatAddress(row.companyInfo, lookup),
        render: (row) => (
          <small className="block max-w-[280px] break-words text-muted-foreground">
            {formatAddress(row.companyInfo, lookup)}
          </small>
        ),
      },
      {
        key: "purchaseManager",
        label: "Purchase manager",
        exportValue: (row) => formatPm(row.companyInfo),
        render: (row) => (
          <small className="block max-w-[220px] break-words text-muted-foreground">
            {formatPm(row.companyInfo)}
          </small>
        ),
      },
      {
        key: "dispatchmentDate",
        label: "Dispatch",
        sortValue: (row) => row.dispatchmentDate,
        exportValue: (row) => dateFormatter(row.dispatchmentDate, "—"),
        render: (row) => dateFormatter(row.dispatchmentDate, "—"),
      },
      {
        key: "status",
        label: "Status (po_product)",
        sortValue: (row) => statusLabel(serverStatus(row)),
        exportValue: (row) => statusLabel(serverStatus(row)),
        render: (row) => statusBadge(serverStatus(row)),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (row) => <RowActions onView={() => openDetail(row._id)} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lookup],
  );

  return (
    <div>
      <PageHeader
        title="Dispatchment"
        description="Sales Order lines ready for dispatchment or delivered — use status to filter."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-72">
          <Label className="mb-1.5 block">Search</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Product name, Sales Order number, or raw product code"
          />
        </div>
        <div className="w-full sm:w-56">
          <Label className="mb-1.5 block">Status</Label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Label className="mb-1.5 block">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Label className="mb-1.5 block">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel="Dispatchment"
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        onRowClick={(row) => openDetail(row._id)}
        showSearch={false}
        exportFileName="dispatchment"
        emptyTitle="No lines match"
        emptyMessage="Lines appear here when marked ready for dispatchment or after delivery."
      />

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        wrapperClassName="d-flex justify-content-center mt-4"
        align="center"
      />

      <Sheet open={detailOpen} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Sales Order line (po_product)</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {detailLoading ? (
              <div className="py-10 text-center">
                <Spinner />
              </div>
            ) : !detail ? (
              <p className="text-muted-foreground">No data.</p>
            ) : (
              <>
                <h6 className="mb-3 font-semibold">
                  Product &amp; Sales Order
                </h6>
                <p className="mb-1">
                  <strong>Product:</strong> {detail.productName || "—"}
                </p>
                <p className="mb-1">
                  <strong>Sales Order number:</strong> {detail.poCode || "—"}
                </p>
                <p className="mb-1">
                  <strong>Raw product code:</strong>{" "}
                  {detail.rawProductCode ? (
                    <code>{detail.rawProductCode}</code>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="mb-1">
                  <strong>Status:</strong> {statusBadge(serverStatus(detail))}
                </p>
                <p className="mb-3">
                  <strong>Dispatchment date:</strong>{" "}
                  {dateFormatter(detail.dispatchmentDate, "—")}
                </p>

                <h6 className="mb-2 font-semibold">Company</h6>
                {itemCompany ? (
                  <>
                    <p className="mb-1">
                      <strong>Name:</strong> {itemCompany.name || "—"}
                    </p>
                    <p className="mb-1">
                      <strong>Area / location:</strong>{" "}
                      {formatAreaWithLocation(
                        itemCompany.area,
                        itemCompany.location,
                      ) || "—"}
                    </p>
                    <p className="mb-1">
                      <strong>Address:</strong> {itemCompany.address || "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}

                <h6 className="mb-2 mt-3 font-semibold">
                  Purchase manager contacts
                </h6>
                {itemCompany &&
                Array.isArray(itemCompany.purchaseManagers) &&
                itemCompany.purchaseManagers.length ? (
                  <ul className="ps-3 list-disc pl-5">
                    {itemCompany.purchaseManagers.map((pm, i) => (
                      <li key={i} className="mb-1">
                        {[pm.name, pm.phone, pm.email]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">—</p>
                )}

                <h6 className="mb-2 mt-3 font-semibold">Line</h6>
                <p className="mb-1 text-sm text-muted-foreground">
                  Qty: {detail.quantity ?? "—"} {detail.unit || ""}
                </p>
                {detail.description ? (
                  <p className="mb-0 text-sm">
                    <strong>Description:</strong> {detail.description}
                  </p>
                ) : null}

                {(detail.receivingRemark ||
                  (detail.receivingDocumentId &&
                    typeof detail.receivingDocumentId === "object" &&
                    detail.receivingDocumentId.path)) && (
                  <div className="mt-4 border-t border-border pt-3">
                    <h6 className="mb-2 font-semibold">Receiving (stored)</h6>
                    {detail.receivingRemark ? (
                      <p className="mb-2 text-sm">
                        <strong>Remark:</strong> {detail.receivingRemark}
                      </p>
                    ) : null}
                    {detail.receivingDocumentId &&
                    typeof detail.receivingDocumentId === "object" &&
                    detail.receivingDocumentId.path ? (
                      <Button
                        variant="link"
                        className="h-auto p-0 align-baseline"
                        onClick={() =>
                          window.open(
                            getAssetsUrl(detail.receivingDocumentId.path),
                            "_blank",
                            "noopener",
                          )
                        }
                      >
                        Open receiving proof
                      </Button>
                    ) : null}
                  </div>
                )}

                {canAct && invStatus(detail) === "ready_for_dispatchment" && (
                  <div className="mt-4 border-t border-border pt-3">
                    <h6 className="mb-3 font-semibold">Mark delivered</h6>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Upload an image as receiving / delivery proof (required),
                      optionally add a remark, then confirm. Saved on the Sales
                      Order line (<code>po_products</code>).
                    </p>
                    <Label>
                      Receiving proof (image)
                      <span className="ml-1 text-destructive" aria-hidden>
                        *
                      </span>
                    </Label>
                    <div className="mb-3 mt-1.5 flex flex-wrap items-center gap-2">
                      <Input
                        type="file"
                        id="dispatch-recv-img-gallery"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e?.target?.files?.[0] || null;
                          e.target.value = "";
                          setReceivingFile(f);
                        }}
                      />
                      <Input
                        type="file"
                        id="dispatch-recv-img-camera"
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const f = e?.target?.files?.[0] || null;
                          e.target.value = "";
                          setReceivingFile(f);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() =>
                          document
                            .getElementById("dispatch-recv-img-gallery")
                            ?.click()
                        }
                      >
                        Choose image
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() =>
                          document
                            .getElementById("dispatch-recv-img-camera")
                            ?.click()
                        }
                      >
                        Take photo
                      </Button>
                      {receivingFile ? (
                        <span className="text-sm text-muted-foreground">
                          {receivingFile.name}
                        </span>
                      ) : (
                        <span className="text-sm text-warning!">
                          Required before marking delivered
                        </span>
                      )}
                    </div>
                    <Label className="mb-1.5 block">Remark</Label>
                    <Textarea
                      value={receivingRemark}
                      onChange={(e) => setReceivingRemark(e.target.value)}
                      rows={3}
                      className="mb-3"
                      placeholder="Delivery / receiving notes…"
                    />
                    <Button
                      disabled={delivering || !receivingFile}
                      onClick={markDeliveredFromDetail}
                    >
                      {delivering ? (
                        <>
                          <Spinner size="sm" className="mr-2" /> Saving…
                        </>
                      ) : (
                        "Mark delivered"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DispatchmentList;
