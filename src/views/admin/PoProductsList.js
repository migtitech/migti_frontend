import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { List, Plus, Search } from "lucide-react";
import { poProductsBucketService } from "../../services/deliveryApprovalService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import {
  Loader,
  TablePagination,
  FilterLockButton,
  PageHeader,
  DataTable,
  RowActions,
  StatusBadge,
} from "../../components";
import { Badge, Button, Input, Label, Select } from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { dateFormatter } from "../../utils/dateFormatter";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";

const PO_PRODUCTS_FILTER_DEFAULTS = {
  deliverySubStatus: "all",
  dateFrom: "",
  dateTo: "",
};

const DELIVERY_SUB_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "hod_approval_pending", label: "HOD Approval Pending" },
  { value: "delivery_approved_by_hod", label: "Delivery Approved by HOD" },
];

const LINE_STATUS_VARIANTS = {
  hod_approval_pending: "destructive",
  pending: "warning",
  purchased: "secondary",
  inventory_received: "default",
  ready_for_dispatchment: "default",
  delivered: "success",
  finance_approved: "success",
  po_closed: "secondary",
  payment_request_raised: "secondary",
  billing_request_raised: "secondary",
  billing_request_rejected: "destructive",
};

const LINE_STATUS_LABELS = {
  billing_request_raised: "BR Raised",
};

const lineStatusText = (s) => {
  if (s === "hod_approval_pending") return "HOD Approval Pending";
  if (LINE_STATUS_LABELS[s]) return LINE_STATUS_LABELS[s];
  return s
    ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";
};

const lineStatusBadge = (s) => (
  <StatusBadge
    variant={LINE_STATUS_VARIANTS[s] || "secondary"}
    status={lineStatusText(s)}
  />
);

const PRIORITY_VARIANTS = {
  low: "success",
  medium: "warning",
  high: "destructive",
};

const priorityBadge = (priority) => {
  const p = String(priority || "medium").toLowerCase();
  return (
    <StatusBadge
      variant={PRIORITY_VARIANTS[p] || "secondary"}
      status={p.replace(/\b\w/g, (c) => c.toUpperCase())}
    />
  );
};

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object")
    return { list: [], total: 0, page: 1, pageSize: 20 };
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const PoProductsList = () => {
  const navigate = useNavigate();
  const { formatArea } = useAreaNameLookup();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "po_products",
    PO_PRODUCTS_FILTER_DEFAULTS,
  );

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterDeliverySubStatus, setFilterDeliverySubStatus] = useState(
    initialValues.deliverySubStatus,
  );
  const [from, setFrom] = useState(initialValues.dateFrom);
  const [to, setTo] = useState(initialValues.dateTo);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, filterDeliverySubStatus, from, to]);

  useFilterLockPersist("po_products", filtersLocked, {
    deliverySubStatus: filterDeliverySubStatus,
    dateFrom: from,
    dateTo: to,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      deliverySubStatus: filterDeliverySubStatus,
      dateFrom: from,
      dateTo: to,
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        poProductsBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          deliverySubStatus: filterDeliverySubStatus,
          from: from || undefined,
          to: to || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
    } catch (e) {
      toastError(e?.message || "Failed to load Sales Order products");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, filterDeliverySubStatus, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleClear = () => {
    setSearch("");
    setFilterDeliverySubStatus("all");
    setFrom("");
    setTo("");
    setPage(1);
  };

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
        key: "productName",
        label: "Product Name",
        render: (row) => (
          <div>
            <div className="font-semibold">{row.productName || "—"}</div>
            {row.rawProductCode && (
              <div className="font-mono text-xs text-muted-foreground">
                {row.rawProductCode}
              </div>
            )}
            {row.hsnNumber && (
              <div className="text-xs text-muted-foreground">
                HSN: <span className="font-medium">{row.hsnNumber}</span>
              </div>
            )}
          </div>
        ),
        exportValue: (row) => row.productName || "—",
      },
      {
        key: "poCode",
        label: "Sales Order Code",
        render: (row) => (
          <Badge variant="secondary" className="font-mono">
            {row.poCode || "—"}
          </Badge>
        ),
        exportValue: (row) => row.poCode || "—",
      },
      {
        key: "unit",
        label: "Unit",
        width: 70,
        align: "center",
        render: (row) => row.unit || "—",
      },
      {
        key: "quantity",
        label: "Qty",
        width: 70,
        align: "center",
        render: (row) => row.quantity ?? "—",
      },
      {
        key: "company",
        label: "Company",
        render: (row) => {
          const areaLabel = formatArea(row.companyInfo?.area);
          return (
            <div className="text-sm">
              {row.companyInfo?.name || "—"}
              {areaLabel ? (
                <div className="text-muted-foreground">{areaLabel}</div>
              ) : null}
            </div>
          );
        },
        exportValue: (row) => row.companyInfo?.name || "—",
      },
      {
        key: "dispatchmentDate",
        label: "Dispatch Date",
        width: 120,
        align: "center",
        render: (row) => dateFormatter(row.dispatchmentDate, "—"),
        exportValue: (row) => dateFormatter(row.dispatchmentDate, "—"),
      },
      {
        key: "priority",
        label: "Priority",
        width: 100,
        sortValue: (row) => String(row.priority || "medium"),
        exportValue: (row) => String(row.priority || "medium"),
        render: (row) => priorityBadge(row.priority),
      },
      {
        key: "status",
        label: "Status",
        width: 130,
        sortValue: (row) => lineStatusText(row.status),
        exportValue: (row) => lineStatusText(row.status),
        render: (row) => lineStatusBadge(row.status),
      },
      {
        key: "actions",
        label: "Action",
        width: 70,
        align: "center",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (row) => (
          <RowActions
            viewLabel="View / Edit"
            onView={() => navigate(`/po-products/${row._id || row.id}`)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, navigate, formatArea],
  );

  return (
    <div>
      <PageHeader
        title="Sales Order Products"
        description="Track Sales Order line items across delivery approval and fulfillment stages."
        actions={
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary!" />
            <Badge variant="secondary">Total: {total}</Badge>
            <Button onClick={() => navigate("/po-products/add")}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Product name, Sales Order code, raw code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="w-56">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            Delivery Status
          </Label>
          <Select
            value={filterDeliverySubStatus}
            onChange={(e) => setFilterDeliverySubStatus(e.target.value)}
          >
            {DELIVERY_SUB_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
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
          pageLabel="Sales Order Products"
        />
        <Button variant="outline" onClick={handleClear}>
          Clear
        </Button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row._id || row.id}
            onRowClick={(row) => navigate(`/po-products/${row._id || row.id}`)}
            showSearch={false}
            exportFileName="sales-order-products"
            emptyTitle="No Sales Order products"
            emptyMessage="No Sales Order products found."
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
              ariaLabel="Sales Order Products pages"
              wrapperClassName="mt-3 flex flex-col items-center gap-2"
            />
          )}
        </>
      )}
    </div>
  );
};

export default PoProductsList;
