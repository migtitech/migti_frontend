import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clipboard, Eye, Inbox, Search } from "lucide-react";
import proBucketService from "../../services/proBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { dateMediumFormatter } from "../../utils/dateFormatter";
import {
  DataTable,
  PageHeader,
  StatusBadge,
  TablePagination,
} from "../../components";
import {
  Badge,
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../components/ui";

const TABS = [
  { value: "pending", label: "Pending", icon: Clipboard },
  { value: "rate_submitted", label: "Rate Submitted", icon: Inbox },
  { value: "fulfilled", label: "Fulfilled", icon: CheckCircle2 },
];

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

const refName = (refVal) => {
  if (refVal == null || refVal === "") return "—";
  if (typeof refVal === "object") {
    if (refVal.name != null && String(refVal.name).trim() !== "")
      return String(refVal.name);
    return "—";
  }
  return String(refVal);
};

const dash = (v) => {
  if (v == null) return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  if (typeof v === "number" && Number.isNaN(v)) return "—";
  return v;
};

const formatDateTime = (d) => dateMediumFormatter(d);

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

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object") {
    return { list: [], total: 0, pendingCount: 0 };
  }
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    pendingCount: block.pendingCount ?? 0,
  };
};

const BrandProcurementList = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    pending: 0,
    rate_submitted: 0,
    fulfilled: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  /* per-tab totals for the count badges (light head requests) */
  useEffect(() => {
    let alive = true;
    const loadCounts = async () => {
      const results = await Promise.allSettled(
        TABS.map((t) =>
          proBucketService.list({ page: 1, pageSize: 1, status: t.value }),
        ),
      );
      if (!alive) return;
      const next = { pending: 0, rate_submitted: 0, fulfilled: 0 };
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          next[TABS[i].value] = parseListResponse(r.value).total || 0;
        }
      });
      setCounts(next);
    };
    loadCounts();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          proBucketService.list({
            page,
            pageSize,
            search: searchDebounced.trim() || undefined,
            status: activeTab,
          }),
        );
        if (!alive) return;
        const p = parseListResponse(res);
        setRows(p.list);
        setTotal(p.total);
      } catch (e) {
        if (!alive) return;
        toastError(e?.message || "Failed to load brand procurement items");
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [page, pageSize, searchDebounced, activeTab]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const openDetail = (row) => navigate(`/pro-bucket/${row._id}`);

  const columns = [
    {
      key: "index",
      label: "#",
      width: 56,
      toggleable: false,
      exportable: false,
      render: (_row, index) => (page - 1) * pageSize + index + 1,
    },
    {
      key: "productName",
      label: "Product",
      sortable: true,
      render: (row) => (
        <span
          className="block max-w-[16rem] truncate font-medium text-foreground"
          title={row.productName || ""}
        >
          {dash(row.productName)}
        </span>
      ),
    },
    {
      key: "queryCode",
      label: "Query Code",
      sortable: true,
      sortValue: (row) => row.queryCode?.toString().trim() || "",
      exportValue: (row) => row.queryCode?.toString().trim() || "",
      render: (row) => (
        <span className="font-mono text-sm">
          {dash(row.queryCode?.toString().trim())}
        </span>
      ),
    },
    {
      key: "quantity",
      label: "Qty",
      align: "right",
      sortable: true,
      sortValue: (row) => Number(row.quantity) || 0,
      render: (row) => dash(row.quantity),
    },
    {
      key: "unit",
      label: "Unit",
      sortable: true,
      render: (row) => dash(row.unit),
    },
    {
      key: "hsnNumber",
      label: "HSN",
      render: (row) => dash(row.hsnNumber),
    },
    {
      key: "modelNumber",
      label: "Model / Part #",
      render: (row) => dash(row.modelNumber),
    },
    {
      key: "gstPercentage",
      label: "GST %",
      align: "right",
      render: (row) =>
        row.gstPercentage != null && row.gstPercentage !== ""
          ? `${row.gstPercentage}`
          : "—",
    },
    {
      key: "groupId",
      label: "Group",
      sortable: true,
      sortValue: (row) => refName(row.groupId),
      exportValue: (row) => refName(row.groupId),
      render: (row) => (
        <span
          className="block max-w-[12rem] truncate"
          title={refName(row.groupId)}
        >
          {refName(row.groupId)}
        </span>
      ),
    },
    {
      key: "categoryId",
      label: "Category",
      sortable: true,
      sortValue: (row) => refName(row.categoryId),
      exportValue: (row) => refName(row.categoryId),
      render: (row) => (
        <span
          className="block max-w-[12rem] truncate"
          title={refName(row.categoryId)}
        >
          {refName(row.categoryId)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      exportValue: (row) => row.status || "",
      render: (row) => statusBadge(row.status),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      sortValue: (row) =>
        row.createdAt ? new Date(row.createdAt).getTime() : 0,
      exportValue: (row) => formatDateTime(row.createdAt),
      render: (row) => (
        <span
          className="whitespace-nowrap"
          title={formatDateTime(row.createdAt)}
        >
          {formatDurationSinceCreated(row.createdAt)}
        </span>
      ),
    },
    {
      key: "view",
      label: "View",
      align: "center",
      toggleable: false,
      exportable: false,
      stopRowClick: true,
      render: (row) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="View full details"
          aria-label="View full details"
          onClick={() => openDetail(row)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Brand Procurement"
        description="Brand procurement items in a detailed table — click any row to view the product's full information."
        actions={
          counts.pending > 0 && (
            <Badge variant="warning" className="px-2.5 py-1 text-sm">
              {counts.pending} pending
            </Badge>
          )
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value}>
                <Icon className="mr-2 h-4 w-4" />
                {t.label}
                <Badge
                  variant={
                    t.value === "pending" && counts[t.value] > 0
                      ? "warning"
                      : "secondary"
                  }
                  className="ml-1.5 px-1.5 text-[0.68rem]"
                  title={`${counts[t.value]} item(s)`}
                >
                  {counts[t.value]}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:items-end">
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
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
          >
            Clear search
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row._id}
        loading={loading}
        showSearch={false}
        onRowClick={openDetail}
        emptyTitle="No items found"
        emptyMessage="No brand procurement items in this stage."
        exportFileName="brand-procurement"
        rowClassName={(row) =>
          row.status === "pending" ? "bg-warning/5" : undefined
        }
      />

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        align="center"
        ariaLabel="Brand Procurement pages"
        wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
      />
    </div>
  );
};

export default BrandProcurementList;
