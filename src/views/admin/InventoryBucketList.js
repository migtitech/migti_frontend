import React, { useEffect, useMemo, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import inventoryBucketService from "../../services/inventoryBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
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
  Spinner,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import usePermissions from "../../hooks/usePermissions";
import { dateFormatter } from "../../utils/dateFormatter";

const INVENTORY_BUCKET_FILTER_DEFAULTS = {
  status: "",
  dateFrom: "",
  dateTo: "",
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "purchased", label: "Purchased" },
  { value: "inventory_received", label: "Inventory received" },
  { value: "ready_for_dispatchment", label: "Ready for dispatchment" },
  { value: "delivered", label: "Delivered" },
  { value: "finance_approved", label: "Finance approved" },
];

/** Use the same `status` field the list/detail APIs return (legacy `inventoryStatus` fallback). */
const serverStatus = (d) => d?.status ?? d?.inventoryStatus;

const invStatus = (d) => {
  return String(serverStatus(d) || "pending");
};

const STATUS_LABELS = {
  pending: "Pending",
  purchased: "Purchased",
  inventory_received: "Received",
  ready_for_dispatchment: "Ready for dispatchment",
  delivered: "Delivered",
  open: "Open",
  payment_request_raised: "Payment request raised",
  finance_approved: "Finance approved",
};

const STATUS_VARIANTS = {
  pending: "warning",
  purchased: "secondary",
  inventory_received: "success",
  ready_for_dispatchment: "default",
  delivered: "secondary",
  open: "secondary",
  payment_request_raised: "secondary",
  finance_approved: "secondary",
};

const statusLabelText = (s) => {
  if (s === undefined || s === null || s === "") return "—";
  const v = String(s).trim();
  if (STATUS_LABELS[v]) return STATUS_LABELS[v];
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusBadge = (s) => {
  if (s === undefined || s === null || s === "")
    return <StatusBadge variant="secondary" status="—" />;
  const v = String(s).trim();
  return (
    <StatusBadge
      variant={STATUS_VARIANTS[v] || "secondary"}
      status={statusLabelText(v)}
    />
  );
};

const parseListResponse = (res) => {
  if (!res || typeof res !== "object") {
    return {
      list: [],
      total: 0,
      pendingCount: 0,
      page: 1,
      pageSize: 20,
    };
  }
  const block = res.data;
  if (!block || typeof block !== "object") {
    return {
      list: [],
      total: 0,
      pendingCount: 0,
      page: 1,
      pageSize: 20,
    };
  }
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    pendingCount: block.pendingCount ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const InventoryBucketList = () => {
  const { canUpdate } = usePermissions();
  const canMark = canUpdate("inventory_bucket");
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "inventory_bucket",
    INVENTORY_BUCKET_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState(initialValues.status);
  const [from, setFrom] = useState(initialValues.dateFrom);
  const [to, setTo] = useState(initialValues.dateTo);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, status, from, to]);

  useFilterLockPersist("inventory_bucket", filtersLocked, {
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
        inventoryBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: status.trim() ? status.trim() : undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
      setPendingCount(p.pendingCount);
    } catch (e) {
      toastError(e?.message || "Failed to load inventory bucket");
      setRows([]);
      setTotal(0);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, searchDebounced, status, from, to]);

  const openDetail = async (id) => {
    setDetailId(id);
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await inventoryBucketService.getById(id);
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
  };

  const onMarkReceived = async () => {
    if (!detailId || !detail) return;
    const st = invStatus(detail);
    if (st === "ready_for_dispatchment") {
      toastError("Already at final step for this line");
      return;
    }
    if (st === "inventory_received") {
      toastError("Already marked as received");
      return;
    }
    if (st !== "purchased") {
      toastError(
        "Mark as received is only available when line status is Purchased.",
      );
      return;
    }
    setMarking(true);
    try {
      await inventoryBucketService.markInventoryReceived(detailId);
      const res = await inventoryBucketService.getById(detailId);
      const doc = res?.data;
      if (doc) setDetail(doc);
      toastSuccess("Marked as inventory received");
      load();
    } catch (e) {
      toastError(e?.message || "Update failed");
    } finally {
      setMarking(false);
    }
  };

  const onMarkReadyForDispatchment = async () => {
    if (!detailId || !detail) return;
    if (invStatus(detail) !== "inventory_received") {
      toastError("Mark as received first");
      return;
    }
    setMarking(true);
    try {
      await inventoryBucketService.markReadyForDispatchment(detailId);
      const res = await inventoryBucketService.getById(detailId);
      const doc = res?.data;
      if (doc) setDetail(doc);
      toastSuccess("Marked ready for dispatchment");
      load();
    } catch (e) {
      toastError(e?.message || "Update failed");
    } finally {
      setMarking(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const columns = useMemo(
    () => [
      {
        key: "productName",
        label: "Product",
        render: (row) => (
          <span className="break-words">{row.productName || "—"}</span>
        ),
        exportValue: (row) => row.productName || "—",
      },
      {
        key: "poCode",
        label: "Sales Order number",
        render: (row) => row.poCode || "—",
      },
      {
        key: "rawProductCode",
        label: "Raw code",
        render: (row) =>
          row.rawProductCode ? (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {row.rawProductCode}
            </code>
          ) : (
            "—"
          ),
        exportValue: (row) => row.rawProductCode || "—",
      },
      {
        key: "dispatchmentDate",
        label: "Dispatch",
        render: (row) => dateFormatter(row.dispatchmentDate, "—"),
        exportValue: (row) => dateFormatter(row.dispatchmentDate, "—"),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (row) => statusLabelText(serverStatus(row)),
        exportValue: (row) => statusLabelText(serverStatus(row)),
        render: (row) => statusBadge(serverStatus(row)),
      },
      {
        key: "actions",
        label: "",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (row) => <RowActions onView={() => openDetail(row._id)} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div>
      <PageHeader
        title="Inventory bucket"
        description="Track Sales Order lines from purchase through inventory receipt and dispatch readiness."
        actions={
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-primary!" />
            {pendingCount > 0 && (
              <Badge variant="warning">{pendingCount} pending</Badge>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            Search
          </Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Product name, Sales Order number, or raw product code"
          />
        </div>
        <div className="w-52">
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
            From
          </Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            To
          </Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel="Inventory bucket"
        />
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id}
            showSearch={false}
            exportFileName="inventory-bucket"
            emptyTitle="No Sales Order lines"
            emptyMessage="No Sales Order lines in your groups."
          />
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            wrapperClassName="mt-4 flex justify-center"
            ariaLabel="Inventory bucket pages"
            align="center"
          />
        </>
      )}

      <Sheet open={detailOpen} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Line details</SheetTitle>
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
                <h6 className="mb-3 text-sm font-semibold">
                  Product & Sales Order
                </h6>
                <p className="mb-1 text-sm">
                  <strong>Product:</strong> {detail.productName || "—"}
                </p>
                <p className="mb-1 text-sm">
                  <strong>Sales Order number:</strong> {detail.poCode || "—"}
                </p>
                <p className="mb-1 text-sm">
                  <strong>Raw product code:</strong>{" "}
                  {detail.rawProductCode ? (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {detail.rawProductCode}
                    </code>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="mb-1 flex items-center gap-2 text-sm">
                  <strong>Status:</strong> {statusBadge(serverStatus(detail))}
                </p>
                <p className="mb-3 text-sm">
                  <strong>Dispatchment date:</strong>{" "}
                  {dateFormatter(detail.dispatchmentDate, "—")}
                </p>

                <h6 className="mb-2 mt-3 text-sm font-semibold">Line</h6>
                <p className="mb-1 text-sm text-muted-foreground">
                  Qty: {detail.quantity ?? "—"} {detail.unit || ""}
                </p>
                {detail.description ? (
                  <p className="mb-0 text-sm">
                    <strong>Description:</strong> {detail.description}
                  </p>
                ) : null}

                {canMark &&
                  !["inventory_received", "ready_for_dispatchment"].includes(
                    invStatus(detail),
                  ) && (
                    <Button
                      className="mt-4 w-full"
                      disabled={marking || invStatus(detail) !== "purchased"}
                      onClick={onMarkReceived}
                      title={
                        invStatus(detail) !== "purchased"
                          ? "Mark as received is only available when line status is Purchased."
                          : undefined
                      }
                    >
                      {marking ? "Updating…" : "Marked as received"}
                    </Button>
                  )}

                {canMark && invStatus(detail) === "inventory_received" && (
                  <>
                    <p className="mb-2 mt-4 text-sm text-muted-foreground">
                      Inventory received. You can mark this line ready for
                      dispatchment when appropriate.
                    </p>
                    <Button
                      className="w-full"
                      disabled={marking}
                      onClick={onMarkReadyForDispatchment}
                    >
                      {marking ? "Updating…" : "Mark ready for dispatchment"}
                    </Button>
                  </>
                )}

                {invStatus(detail) === "ready_for_dispatchment" && (
                  <p className="mb-0 mt-4 text-sm text-muted-foreground">
                    This line is marked ready for dispatchment.
                  </p>
                )}
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default InventoryBucketList;
