import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import {
  Loader,
  TablePagination,
  FilterLockButton,
  DataTable,
  PageHeader,
  RowActions,
} from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { Badge, Button, Input, Label, Select } from "../../components/ui";
import purchaseBucketService from "../../services/purchaseBucketService";
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
};

const PRIORITY_CONFIG = {
  high: { label: "High", color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
  medium: { label: "Medium", color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  low: { label: "Low", color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
};

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

// ─── component ────────────────────────────────────────────────────────────────

const PurchaseBucketList = () => {
  const navigate = useNavigate();
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

  useFilterLockPersist("purchase_bucket", filtersLocked, {
    priority,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ priority });
  };

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
        label: "S.No",
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
        key: "unit",
        label: "Unit",
        width: 70,
        align: "center",
        exportValue: (row) => row.unit || "—",
        render: (row) => row.unit || "—",
      },
      {
        key: "quantity",
        label: "Qty",
        width: 70,
        align: "center",
        exportValue: (row) => row.quantity ?? "—",
        render: (row) => (
          <span className="font-semibold">{row.quantity ?? "—"}</span>
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
          <RowActions onView={() => navigate(`/purchase-bucket/${row._id}`)} />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, page, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Purchase Bucket"
        description="Track purchase requests through billing, approval, and dispatch."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {pendingCount > 0 && !loading && (
              <Badge variant="default">{pendingCount} open</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Total: <strong className="text-foreground">{total}</strong>
            </span>
            <Button
              onClick={() => navigate("/purchase-bucket/raise-billing-request")}
            >
              <Plus className="h-4 w-4" />
              Raise Billing Request
            </Button>
          </div>
        }
      />

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
            onToggle={handleToggleFiltersLock}
            pageLabel="Purchase Bucket"
          />
        </div>
        <div className="flex items-end">
          {(search || priority) && (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Loader message="Loading purchase bucket…" />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id}
            showSearch={false}
            exportFileName="purchase-bucket"
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
              ariaLabel="Purchase Bucket pages"
              wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
            />
          )}
        </>
      )}
    </div>
  );
};

export default PurchaseBucketList;
