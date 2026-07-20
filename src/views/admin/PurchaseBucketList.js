import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Store, Package } from "lucide-react";
import {
  Loader,
  TablePagination,
  FilterLockButton,
  DataTable,
  PageHeader,
  RowActions,
  PurchaseDetailDialog,
} from "../../components";
import { resolvePoProductId } from "../../components/PurchaseDetailDialog/PurchaseDetailDialog";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui";
import usePermissions from "../../hooks/usePermissions";
import purchaseBucketService from "../../services/purchaseBucketService";
import localPurchaseService from "../../services/localPurchaseService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const queryCodeLast4 = (code) => {
  const s = code != null ? String(code).trim() : "";
  if (!s) return null;
  return s.length <= 4 ? s : s.slice(-4);
};

const getPriorityRowBg = (priority) => {
  const p = String(priority || "medium").toLowerCase();
  switch (p) {
    case "low":
      return "#d4edda";
    case "medium":
      return "#ffe8cc";
    case "high":
      return "#f8d7da";
    default:
      return null;
  }
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  pending: { label: "Open", color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  hod_approval_pending: {
    label: "HOD Pending",
    color: "#d97706",
    bg: "#fffbeb",
    dot: "#f59e0b",
  },
  billing_request_raised: {
    label: "BR Raised",
    color: "#0891b2",
    bg: "#ecfeff",
    dot: "#06b6d4",
  },
  payment_request_raised: {
    label: "Payment Requested",
    color: "#0891b2",
    bg: "#ecfeff",
    dot: "#06b6d4",
  },
  finance_approved: {
    label: "Finance Approved",
    color: "#7c3aed",
    bg: "#f5f3ff",
    dot: "#8b5cf6",
  },
  billing_request_rejected: {
    label: "Rejected",
    color: "#dc2626",
    bg: "#fef2f2",
    dot: "#ef4444",
  },
  purchased: {
    label: "Purchased",
    color: "#16a34a",
    bg: "#f0fdf4",
    dot: "#22c55e",
  },
  inventory_received: {
    label: "Inventory Received",
    color: "#0369a1",
    bg: "#e0f2fe",
    dot: "#0ea5e9",
  },
  ready_for_dispatchment: {
    label: "Ready to Dispatch",
    color: "#15803d",
    bg: "#dcfce7",
    dot: "#22c55e",
  },
  delivered: {
    label: "Delivered",
    color: "#15803d",
    bg: "#f0fdf4",
    dot: "#22c55e",
  },
  po_closed: {
    label: "Sales Order Closed",
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  },
  submitted: {
    label: "Submitted",
    color: "#16a34a",
    bg: "#f0fdf4",
    dot: "#22c55e",
  },
};

const PRIORITY_CONFIG = {
  high: { label: "High", color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
  medium: { label: "Medium", color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  low: { label: "Low", color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
};

const Pill = ({ cfg }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      color: cfg.color,
      background: cfg.bg,
      border: `1.5px solid ${cfg.color}25`,
      whiteSpace: "nowrap",
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: cfg.dot,
        flexShrink: 0,
      }}
    />
    {cfg.label}
  </span>
);

const StatusPill = ({ status }) => {
  const raw =
    status != null && String(status).trim() !== ""
      ? String(status).trim()
      : "pending";
  const cfg = STATUS_CONFIG[raw] || {
    label: raw,
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  };
  return <Pill cfg={cfg} />;
};

const PriorityPill = ({ priority }) => {
  const raw =
    priority != null && String(priority).trim() !== ""
      ? String(priority).trim().toLowerCase()
      : "medium";
  const cfg = PRIORITY_CONFIG[raw] || {
    label: raw.charAt(0).toUpperCase() + raw.slice(1),
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  };
  return <Pill cfg={cfg} />;
};

const PURCHASE_BUCKET_FILTER_DEFAULTS = { priority: "" };

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object")
    return { list: [], total: 0, pendingCount: 0 };
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    pendingCount: block.pendingCount ?? 0,
  };
};

// ─── Brand tab (po_product purchase-bucket lines) ───────────────────────────────

const BrandPurchaseTab = ({ onView }) => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "purchase_bucket",
    PURCHASE_BUCKET_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [priority, setPriority] = useState(initialValues.priority);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, priority]);

  useFilterLockPersist("purchase_bucket", filtersLocked, { priority });

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          priority: priority.trim() || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
      setPendingCount(p.pendingCount);
    } catch (e) {
      toastError(e?.message || "Failed to load Purchase Bucket");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchDebounced, priority]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const handleClearFilters = () => {
    setSearch("");
    setPriority("");
    setPage(1);
  };

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "#",
        width: 50,
        align: "center",
        toggleable: false,
        exportable: false,
        render: (_row, idx) => (page - 1) * pageSize + idx + 1,
      },
      {
        key: "productName",
        label: "Product Name",
        exportValue: (row) => fmt(row.productName),
        render: (row) => (
          <div>
            <div className="font-semibold">{fmt(row.productName)}</div>
            {row.rawProductCode && (
              <div className="font-mono text-sm text-muted-foreground">
                {row.rawProductCode}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "poCode",
        label: "Sales Order Code",
        exportValue: (row) => queryCodeLast4(row.poCode) || "—",
        render: (row) => {
          const code = queryCodeLast4(row.poCode);
          return code ? (
            <Badge
              variant="default"
              className="font-mono"
              title={row.poCode ? String(row.poCode).trim() : undefined}
            >
              {code}
            </Badge>
          ) : (
            "—"
          );
        },
      },
      {
        key: "queryCode",
        label: "Query Code",
        exportValue: (row) => queryCodeLast4(row.queryCode) || "—",
        render: (row) => {
          const code = queryCodeLast4(row.queryCode);
          return code ? (
            <Badge
              variant="secondary"
              className="font-mono"
              title={row.queryCode ? String(row.queryCode).trim() : undefined}
            >
              {code}
            </Badge>
          ) : (
            "—"
          );
        },
      },
      {
        key: "targetRate",
        label: "Target Rate",
        width: 110,
        align: "right",
        exportValue: (row) =>
          row.targetRate != null
            ? `₹${Number(row.targetRate).toLocaleString("en-IN")}`
            : "—",
        render: (row) =>
          row.targetRate != null ? (
            <span className="font-semibold text-primary">
              ₹{Number(row.targetRate).toLocaleString("en-IN")}
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "quantity",
        label: "Qty",
        width: 90,
        align: "center",
        exportValue: (row) =>
          `${row.quantity ?? "—"}${row.unit ? ` ${row.unit}` : ""}`,
        render: (row) => (
          <span className="font-semibold">
            {row.quantity ?? "—"}
            {row.unit ? (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {row.unit}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "dispatchmentDate",
        label: "Dispatch Date",
        width: 120,
        align: "center",
        exportValue: (row) => dateFormatter(row.dispatchmentDate, "—"),
        render: (row) => dateFormatter(row.dispatchmentDate, "—"),
      },
      {
        key: "status",
        label: "Status",
        exportValue: (row) =>
          STATUS_CONFIG[String(row.status || "").trim()]?.label ||
          row.status ||
          "Open",
        render: (row) => <StatusPill status={row.status} />,
      },
      {
        key: "priority",
        label: "Priority",
        width: 100,
        exportValue: (row) =>
          PRIORITY_CONFIG[String(row.priority || "medium").toLowerCase()]
            ?.label ||
          row.priority ||
          "Medium",
        render: (row) => <PriorityPill priority={row.priority} />,
      },
      {
        key: "actions",
        label: "Action",
        width: 60,
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (row) => (
          <RowActions
            onView={() => onView(row)}
            viewLabel="View purchase details"
          />
        ),
      },
    ],
    [page, pageSize, onView],
  );

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:items-end">
        <div className="space-y-1.5">
          <Label>Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Product name or Sales Order code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <FilterLockButton
            filtersLocked={filtersLocked}
            onToggle={() => toggleFiltersLock({ priority })}
            pageLabel="Purchase Bucket"
          />
        </div>
        <div className="flex items-end gap-3">
          {pendingCount > 0 && !loading && (
            <Badge variant="default">{pendingCount} open</Badge>
          )}
          {(search || priority) && (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Loader message="Loading brand purchases…" />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id}
            showSearch={false}
            exportFileName="brand-purchase"
            emptyTitle="No items found"
            emptyMessage="Try changing filters or search."
            rowStyle={(row) => {
              const bg = getPriorityRowBg(row.priority);
              return bg ? { backgroundColor: bg } : undefined;
            }}
          />

          {total > pageSize && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showRange
              totalItems={total}
              itemsPerPage={pageSize}
              align="center"
              ariaLabel="Brand purchase pages"
              wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
            />
          )}
        </>
      )}
    </>
  );
};

// ─── Local tab (local_purchase assignments) ─────────────────────────────────────

const LOCAL_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
];

const LocalPurchaseTab = ({ onView }) => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        localPurchaseService.list({
          page,
          pageSize,
          status: status.trim() || undefined,
        }),
      );
      const block = res?.data;
      setRows(Array.isArray(block?.data) ? block.data : []);
      setTotal(Number(block?.total) || 0);
    } catch (e) {
      toastError(e?.message || "Failed to load local purchases");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "#",
        width: 50,
        align: "center",
        toggleable: false,
        exportable: false,
        render: (_row, idx) => (page - 1) * pageSize + idx + 1,
      },
      {
        key: "product",
        label: "Product Name",
        exportValue: (row) => row.productSnapshot?.productName || "—",
        render: (row) => {
          const snap = row.productSnapshot || {};
          return (
            <div>
              <div className="font-semibold">{fmt(snap.productName)}</div>
              {snap.rawProductCode && (
                <div className="font-mono text-sm text-muted-foreground">
                  {snap.rawProductCode}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "poCode",
        label: "Sales Order Code",
        exportValue: (row) =>
          queryCodeLast4(row.poCode || row.productSnapshot?.poCode) || "—",
        render: (row) => {
          const code = queryCodeLast4(
            row.poCode || row.productSnapshot?.poCode,
          );
          return code ? (
            <Badge variant="default" className="font-mono">
              {code}
            </Badge>
          ) : (
            "—"
          );
        },
      },
      {
        key: "qty",
        label: "Qty",
        width: 90,
        align: "center",
        exportValue: (row) => {
          const snap = row.productSnapshot || {};
          return `${snap.quantity ?? "—"}${snap.unit ? ` ${snap.unit}` : ""}`;
        },
        render: (row) => {
          const snap = row.productSnapshot || {};
          return (
            <span className="font-semibold">
              {snap.quantity ?? "—"}
              {snap.unit ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {snap.unit}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        key: "zone",
        label: "Zone",
        exportValue: (row) =>
          row.zoneId && typeof row.zoneId === "object"
            ? row.zoneId.name || "—"
            : "—",
        render: (row) =>
          row.zoneId && typeof row.zoneId === "object" ? (
            <span className="text-sm">
              {row.zoneId.name || "—"}
              {row.zoneId.city ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {row.zoneId.city}
                </span>
              ) : null}
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "status",
        label: "Status",
        width: 120,
        exportValue: (row) =>
          STATUS_CONFIG[String(row.status || "").trim()]?.label ||
          row.status ||
          "Pending",
        render: (row) => <StatusPill status={row.status} />,
      },
      {
        key: "createdAt",
        label: "Assigned On",
        width: 120,
        align: "center",
        exportValue: (row) => dateFormatter(row.createdAt, "—"),
        render: (row) => dateFormatter(row.createdAt, "—"),
      },
      {
        key: "actions",
        label: "Action",
        width: 60,
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (row) => (
          <RowActions
            onView={() => onView(row)}
            viewLabel="View purchase details"
          />
        ),
      },
    ],
    [page, pageSize, onView],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48 space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {LOCAL_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        {status && (
          <Button variant="outline" onClick={() => setStatus("")}>
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <Loader message="Loading local purchases…" />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id}
            showSearch={false}
            exportFileName="local-purchase"
            emptyTitle="No local purchases"
            emptyMessage="No local purchase assignments found."
          />

          {total > pageSize && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showRange
              totalItems={total}
              itemsPerPage={pageSize}
              align="center"
              ariaLabel="Local purchase pages"
              wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
            />
          )}
        </>
      )}
    </>
  );
};

// ─── component ────────────────────────────────────────────────────────────────

const PurchaseBucketList = () => {
  const navigate = useNavigate();
  const { canUpdate } = usePermissions();
  const canRaiseBilling = canUpdate("purchase_bucket");

  const [tab, setTab] = useState("brand");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [detailSource, setDetailSource] = useState("brand");

  const openDetail = (row, source) => {
    setDetailRow(row);
    setDetailSource(source);
    setDetailOpen(true);
  };

  const onViewBrand = useMemo(() => (row) => openDetail(row, "brand"), []);
  const onViewLocal = useMemo(() => (row) => openDetail(row, "local"), []);

  return (
    <div>
      <PageHeader
        title="Purchase Bucket"
        description="Track purchase requests — split into Brand and Local — through billing, approval, and dispatch."
        actions={
          <Button
            onClick={() => navigate("/purchase-bucket/raise-billing-request")}
          >
            <Plus className="h-4 w-4" />
            Raise Billing Request
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="brand">
            <Store className="mr-1.5 h-4 w-4" />
            Brand Purchase
          </TabsTrigger>
          <TabsTrigger value="local">
            <Package className="mr-1.5 h-4 w-4" />
            Local Purchase
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brand" className="mt-4">
          <BrandPurchaseTab onView={onViewBrand} />
        </TabsContent>

        <TabsContent value="local" className="mt-4">
          <LocalPurchaseTab onView={onViewLocal} />
        </TabsContent>
      </Tabs>

      <PurchaseDetailDialog
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) setDetailRow(null);
        }}
        poProductId={resolvePoProductId(detailRow)}
        fallback={detailRow}
        source={detailSource}
        canRaise={canRaiseBilling}
      />
    </div>
  );
};

export default PurchaseBucketList;
