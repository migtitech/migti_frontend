import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import {
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { Button, Input, Label, Select } from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";

const BILLING_REQUEST_FILTER_DEFAULTS = {
  poCode: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const fmtAmount = (n) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

const totalAmount = (products) =>
  Array.isArray(products)
    ? products.reduce(
        (s, p) => s + (typeof p.amount === "number" ? p.amount : 0),
        0,
      )
    : 0;

const STATUS_MAP = {
  hod_approval_pending: { label: "Pending", variant: "warning" },
  hod_approved: { label: "Approved", variant: "success" },
  hod_rejected: { label: "Rejected", variant: "destructive" },
};

const getStatusMeta = (status) =>
  STATUS_MAP[String(status || "").toLowerCase()] || {
    label: status || "—",
    variant: "secondary",
  };

const unwrap = (res) => {
  const inner = res?.data ?? res;
  return inner?.data ?? inner;
};

const BillingRequestList = ({
  basePath = "/billing-requests",
  pageTitle = "Billing Requests",
}) => {
  const navigate = useNavigate();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "billing_requests",
    BILLING_REQUEST_FILTER_DEFAULTS,
  );

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterPoCode, setFilterPoCode] = useState(initialValues.poCode);
  const [filterPoCodeDebounced, setFilterPoCodeDebounced] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialValues.status);
  const [from, setFrom] = useState(initialValues.dateFrom);
  const [to, setTo] = useState(initialValues.dateTo);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilterPoCodeDebounced(filterPoCode), 400);
    return () => clearTimeout(t);
  }, [filterPoCode]);

  useEffect(() => {
    setPage(1);
  }, [filterPoCodeDebounced, filterStatus, from, to]);

  useFilterLockPersist("billing_requests", filtersLocked, {
    poCode: filterPoCode,
    status: filterStatus,
    dateFrom: from,
    dateTo: to,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      poCode: filterPoCode,
      status: filterStatus,
      dateFrom: from,
      dateTo: to,
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        billingRequestBatchService.list({
          pageNumber: page,
          pageSize,
          poCode: filterPoCodeDebounced.trim() || undefined,
          status: filterStatus || undefined,
          dateFrom: from || undefined,
          dateTo: to || undefined,
        }),
      );
      const data = unwrap(res);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setPagination(
        data?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: pageSize,
        },
      );
    } catch (e) {
      toastError(e?.message || "Failed to load billing requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filterPoCodeDebounced, filterStatus, from, to]);

  const columns = useMemo(
    () => [
      {
        key: "billingRequestCode",
        label: "BR Code",
        sortable: true,
        exportValue: (r) => r.billingRequestCode || "—",
        render: (r) => <code>{r.billingRequestCode || "—"}</code>,
      },
      {
        key: "poCode",
        label: "Sales Order Code",
        sortable: true,
        exportValue: (r) => r.poCode || "—",
        render: (r) => <code>{r.poCode || "—"}</code>,
      },
      {
        key: "products",
        label: "Products",
        sortValue: (r) => (Array.isArray(r.products) ? r.products.length : 0),
        exportValue: (r) => (Array.isArray(r.products) ? r.products.length : 0),
        render: (r) => (Array.isArray(r.products) ? r.products.length : 0),
      },
      {
        key: "totalAmount",
        label: "Total Amount",
        sortValue: (r) =>
          totalAmount(Array.isArray(r.products) ? r.products : []),
        exportValue: (r) =>
          fmtAmount(totalAmount(Array.isArray(r.products) ? r.products : [])),
        render: (r) =>
          fmtAmount(totalAmount(Array.isArray(r.products) ? r.products : [])),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (r) => getStatusMeta(r.status).label,
        exportValue: (r) => getStatusMeta(r.status).label,
        render: (r) => {
          const meta = getStatusMeta(r.status);
          return <StatusBadge variant={meta.variant} status={meta.label} />;
        },
      },
      {
        key: "raisedBy",
        label: "Raised by",
        exportValue: (r) =>
          r.createdBySnapshot?.name || r.createdBySnapshot?.fullName || "—",
        render: (r) =>
          r.createdBySnapshot?.name || r.createdBySnapshot?.fullName || "—",
      },
      {
        key: "date",
        label: "Date",
        sortValue: (r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0),
        exportValue: (r) => fmtDate(r.createdAt),
        render: (r) => fmtDate(r.createdAt),
      },
      {
        key: "actions",
        label: "Action",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (r) => (
          <RowActions onView={() => navigate(`${basePath}/${r._id}`)} />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, basePath],
  );

  const hasFilters = filterPoCode || filterStatus || from || to;

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description="Review billing requests raised for approval."
        actions={
          pagination.totalItems > 0 && (
            <span className="text-sm text-muted-foreground">
              {pagination.totalItems} total
            </span>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Label className="mb-1.5 block">Sales Order Code</Label>
          <Input
            placeholder="Search by Sales Order code"
            value={filterPoCode}
            onChange={(e) => setFilterPoCode(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Label className="mb-1.5 block">Status</Label>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="hod_approval_pending">Pending</option>
            <option value="hod_approved">Approved</option>
            <option value="hod_rejected">Rejected</option>
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Label className="mb-1.5 block">From date</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Label className="mb-1.5 block">To date</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <FilterLockButton
          filtersLocked={filtersLocked}
          onToggle={handleToggleFiltersLock}
          pageLabel={pageTitle}
        />
        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterPoCode("");
              setFilterStatus("");
              setFrom("");
              setTo("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        loading={loading}
        showSearch={false}
        exportFileName="billing-requests"
        emptyTitle="No billing requests found"
        emptyMessage="No billing requests match the current filters."
      />

      <TablePagination
        currentPage={pagination?.currentPage ?? page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        showRange
        totalItems={pagination?.totalItems ?? 0}
        itemsPerPage={pagination?.itemsPerPage ?? pageSize}
      />
    </div>
  );
};

export default BillingRequestList;
