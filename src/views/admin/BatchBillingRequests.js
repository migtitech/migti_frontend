import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, User, Calendar } from "lucide-react";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { dateFormatter } from "../../utils/dateFormatter";

const BATCH_BILLING_FILTER_DEFAULTS = { poCode: "", status: "" };

const fmtAmount = (n) =>
  typeof n === "number" ? n.toLocaleString("en-IN") : "—";

const salesOrderCodeLast4 = (code) => {
  const codeText = code != null ? String(code).trim() : "";
  if (!codeText) return null;
  return codeText.length <= 4 ? codeText : codeText.slice(-4);
};

const salesOrderCodesLast4Display = (poCodesText) => {
  const salesOrderCodes = String(poCodesText || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  if (salesOrderCodes.length === 0) return null;
  return salesOrderCodes.map((code) => salesOrderCodeLast4(code)).join(", ");
};

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

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[String(status || "").toLowerCase()] || {
    label: status || "—",
    variant: "secondary",
  };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

const unwrap = (res) => {
  const inner = res?.data ?? res;
  return inner?.data ?? inner;
};

const BatchBillingRequests = () => {
  const navigate = useNavigate();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "batch_billing_requests",
    BATCH_BILLING_FILTER_DEFAULTS,
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
  const [loading, setLoading] = useState(false);

  const [filterPoCode, setFilterPoCode] = useState(initialValues.poCode);
  const [filterPoCodeDebounced, setFilterPoCodeDebounced] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialValues.status);
  const [filterFrom] = useState("");
  const [filterTo] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setFilterPoCodeDebounced(filterPoCode), 400);
    return () => clearTimeout(t);
  }, [filterPoCode]);

  useEffect(() => {
    setPage(1);
  }, [filterPoCodeDebounced, filterStatus]);

  useFilterLockPersist("batch_billing_requests", filtersLocked, {
    poCode: filterPoCode,
    status: filterStatus,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ poCode: filterPoCode, status: filterStatus });
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
          dateFrom: filterFrom || undefined,
          dateTo: filterTo || undefined,
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
  }, [
    page,
    pageSize,
    filterPoCodeDebounced,
    filterStatus,
    filterFrom,
    filterTo,
  ]);

  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <div>
      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sales Order Code</Label>
              <Input
                placeholder="Search by Sales Order code"
                value={filterPoCode}
                onChange={(e) => setFilterPoCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
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
            <div className="flex items-end">
              <FilterLockButton
                filtersLocked={filtersLocked}
                onToggle={handleToggleFiltersLock}
                pageLabel="Batch Billing Requests"
              />
            </div>
            {(filterPoCode || filterStatus) && (
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFilterPoCode("");
                    setFilterStatus("");
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Billing Requests
          </CardTitle>
          {pagination.totalItems > 0 && (
            <span className="text-sm text-muted-foreground">
              {pagination.totalItems} total
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <Loader />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No billing requests found.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((r) => {
                  const products = Array.isArray(r.products) ? r.products : [];
                  const total = totalAmount(products);
                  const createdByName =
                    r.createdBySnapshot?.name ||
                    r.createdBySnapshot?.fullName ||
                    "—";
                  const salesOrderLast4 = salesOrderCodesLast4Display(r.poCode);
                  return (
                    <button
                      key={r._id}
                      type="button"
                      className="flex h-full flex-col gap-2 rounded-lg border border-border p-4 text-left transition-shadow hover:shadow-md"
                      onClick={() =>
                        navigate(`/batch-billing-requests/${r._id}`)
                      }
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="max-w-[180px] truncate font-semibold text-foreground">
                            {r.billingRequestCode || "—"}
                          </div>
                          {salesOrderLast4 && (
                            <div className="text-sm text-muted-foreground">
                              Sales Order:{" "}
                              <code className="text-sm">{salesOrderLast4}</code>
                            </div>
                          )}
                        </div>
                        <StatusBadge status={r.status} />
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold leading-none">
                            {products.length}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Products
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold leading-none">
                            ₹{fmtAmount(total)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total Amount
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-auto flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          {createdByName}
                        </span>
                        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {dateFormatter(r.createdAt, "—")}
                        </span>
                      </div>

                      {r.statusRemark && (
                        <div className="mt-1 border-t border-border pt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Remark:</span>{" "}
                          {r.statusRemark}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                wrapperClassName="flex items-center justify-end mt-6"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchBillingRequests;
