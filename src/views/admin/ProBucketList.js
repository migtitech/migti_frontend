import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import proBucketService from "../../services/proBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import {
  Loader,
  TablePagination,
  FilterLockButton,
  PageHeader,
  StatusBadge,
  EmptyState,
} from "../../components";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  Card,
  CardHeader,
  CardContent,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";

const PRO_BUCKET_FILTER_DEFAULTS = { status: "" };

/** All listed first (default); Pending next so it's easy to pick. */
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "rate_submitted", label: "Rate submitted" },
  { value: "fulfilled", label: "Fulfilled" },
];

const sortPendingFirstThenNewest = (list) => {
  if (!Array.isArray(list) || list.length === 0) return list || [];
  return [...list].sort((a, b) => {
    const ap = a.status === "pending" ? 0 : 1;
    const bp = b.status === "pending" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
};

const statusBadge = (s) => {
  switch (s) {
    case "pending":
      return <StatusBadge variant="warning">Pending</StatusBadge>;
    case "rate_submitted":
      return <StatusBadge variant="default">Rate submitted</StatusBadge>;
    case "fulfilled":
      return <StatusBadge variant="success">Fulfilled</StatusBadge>;
    default:
      return <StatusBadge variant="secondary">{s || "—"}</StatusBadge>;
  }
};

/** Human-readable age since `createdAt` — e.g. "just now", "45 min ago", "2d 5h ago". */
const queryCodeLast4 = (code) => {
  const s = code != null ? String(code).trim() : "";
  if (!s) return "—";
  return s.length <= 4 ? s : s.slice(-4);
};

const refName = (refVal) => {
  if (refVal == null || refVal === "") return "—";
  if (typeof refVal === "object") {
    if (refVal.name != null && String(refVal.name).trim() !== "")
      return String(refVal.name);
    return "—";
  }
  return String(refVal);
};

const formatDurationSinceCreated = (d) => {
  const t = d ? new Date(d).getTime() : NaN;
  if (Number.isNaN(t)) return "—";
  let sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 0) sec = 0;
  if (sec < 60) return "just now";
  const days = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (days >= 1) return h > 0 ? `${days}d ${h}h ago` : `${days}d ago`;
  if (h >= 1) return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  return `${m}m ago`;
};

/** API: { success, data: { data, total, pendingCount, page, pageSize } } (axios body = response) */
const parseListResponse = (res) => {
  if (!res) {
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

const ProBucketList = () => {
  const navigate = useNavigate();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "pro_bucket",
    PRO_BUCKET_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState(initialValues.status);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, status]);

  useFilterLockPersist("pro_bucket", filtersLocked, {
    status,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        proBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: status.trim() ? status.trim() : undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(sortPendingFirstThenNewest(p.list));
      setTotal(p.total);
      setPendingCount(p.pendingCount);
    } catch (e) {
      toastError(e?.message || "Failed to load Pro Bucket");
      setRows([]);
      setTotal(0);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, searchDebounced, status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  return (
    <div>
      <PageHeader
        title="Pro Bucket"
        description="Products awaiting rates and fulfilment across your queries."
        actions={
          pendingCount > 0 && (
            <Badge variant="warning" className="px-2.5 py-1 text-sm">
              {pendingCount} pending
            </Badge>
          )
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:items-end">
        <div className="space-y-1.5">
          <Label>Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Product or query code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
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
            pageLabel="Pro Bucket"
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          {rows.length === 0 ? (
            <EmptyState title="No items found" />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {rows.map((row) => (
                <Card
                  key={row._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/pro-bucket/${row._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/pro-bucket/${row._id}`);
                    }
                  }}
                  className={cn(
                    "cursor-pointer transition-shadow hover:ring-2 hover:ring-primary",
                    row.status === "pending" && "border-warning!",
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between gap-2 border-b px-4 py-2">
                    <span
                      className="min-w-0 truncate font-semibold"
                      title={row.productName}
                    >
                      {row.productName}
                    </span>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {statusBadge(row.status)}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Query code</span>
                      <span
                        className="truncate pl-2 font-mono font-medium"
                        title={row.queryCode?.toString().trim() || ""}
                      >
                        {queryCodeLast4(row.queryCode)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-muted-foreground">Unit</span>
                      <span>{row.unit || "—"}</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-muted-foreground">Group</span>
                      <span
                        className="truncate pl-2"
                        title={refName(row.groupId)}
                      >
                        {refName(row.groupId)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <span
                        className="truncate pl-2"
                        title={refName(row.categoryId)}
                      >
                        {refName(row.categoryId)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                      <span className="text-muted-foreground">Created</span>
                      <span className="whitespace-nowrap pl-1">
                        {formatDurationSinceCreated(row.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            align="center"
            ariaLabel="Pro Bucket pages"
            wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
          />
        </>
      )}
    </div>
  );
};

export default ProBucketList;
