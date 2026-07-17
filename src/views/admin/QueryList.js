import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import queryService from "../../services/queryService";
import areaService from "../../services/areaService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  Loader,
  TablePagination,
  FilterLockButton,
  DataTable,
  PageHeader,
  RowActions,
  StatusBadge,
} from "../../components";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions, {
  normalizeRole,
  canEditQuery,
} from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import {
  dateTimeFormatter,
  splitDateTimeParts,
} from "../../utils/dateFormatter";

const renderCreatedAtCell = (createdAt) => {
  if (!createdAt) return "-";
  const { date, time } = splitDateTimeParts(createdAt, "");
  return (
    <>
      {date}
      {time ? (
        <div className="text-sm text-muted-foreground">{time}</div>
      ) : null}
    </>
  );
};

const QUERY_FILTER_DEFAULTS = { status: "", dateFrom: "", dateTo: "" };
const QUERY_FILTER_LEGACY_KEYS = {
  lockedKey: "migti_queries_list_status_filter_locked",
  status: "migti_queries_list_status_filter",
};

const QUERY_ROW_RATE_HIGHLIGHT_BG = "#e0f2fe";

const getAvailableRateRowBg = (query) => {
  const available = Number(query?.queryProductRateAvailableCount) || 0;
  if (available > 1) return QUERY_ROW_RATE_HIGHLIGHT_BG;
  return null;
};

const QUERY_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "drafted", label: "Drafted" },
  { value: "convertedToQuotation", label: "Converted to Quotation" },
  { value: "closed", label: "Closed" },
];

const getQueryStatusVariant = (status) => {
  if (status === "closed") return "secondary";
  if (status === "convertedToQuotation") return "success";
  if (status === "progress") return "default";
  if (status && status.startsWith("followup")) return "warning";
  return "default";
};

const QueryStatusBadge = ({ status }) => (
  <StatusBadge variant={getQueryStatusVariant(status)}>
    {status || "pending"}
  </StatusBadge>
);

const QueryList = () => {
  const MOBILE_BREAKPOINT = 576;
  const navigate = useNavigate();
  const { canDelete, canUpdate } = usePermissions();
  const { user } = useAuth();
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "queries_list",
    QUERY_FILTER_DEFAULTS,
    QUERY_FILTER_LEGACY_KEYS,
  );
  const [queries, setQueries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialValues.status);
  const [dateFrom, setDateFrom] = useState(initialValues.dateFrom);
  const [dateTo, setDateTo] = useState(initialValues.dateTo);
  const [pageNumber, setPageNumber] = useState(1);

  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    id: null,
  });
  const [isMobileView, setIsMobileView] = useState(false);

  const fetchQueries = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        pageNumber,
        pageSize,
        search: searchDebounced.trim() || undefined,
        status: statusFilter || undefined,
        areaIds: selectedAreaId || undefined,
        dateFrom: dateFrom.trim() || undefined,
        dateTo: dateTo.trim() || undefined,
      };
      if (isSalesRole) {
        const storedUser = JSON.parse(
          localStorage.getItem("migticrm_user") || "{}",
        );
        const userZoneIds = storedUser?.zoneIds;
        if (Array.isArray(userZoneIds) && userZoneIds.length) {
          params.zoneIds = userZoneIds.join(",");
        } else if (typeof userZoneIds === "string" && userZoneIds) {
          params.zoneIds = userZoneIds;
        }
      }
      const res = await withMinimumDelay(() => queryService.getAll(params));
      const data = res?.data || res;
      const result = data?.data ?? data;
      setQueries(result?.queries || []);
      setPagination(result?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load queries");
      setError(err?.message || "Failed to load queries");
      setQueries([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const [searchDebounced, setSearchDebounced] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;
    const fetchAreas = async () => {
      try {
        const allAreas = [];
        let pageNumber = 1;
        let hasNextPage = true;

        while (hasNextPage) {
          const res = await areaService.getAll({ pageNumber, pageSize: 100 });
          const data = res?.data || res;
          const pagePayload = data || {};
          const pageAreas = pagePayload?.areas || [];
          const pagePagination = pagePayload?.pagination || {};
          allAreas.push(...pageAreas);
          hasNextPage = Boolean(pagePagination?.hasNextPage);
          pageNumber += 1;
        }

        if (cancelled) return;
        setAreas(allAreas);
      } catch {
        if (cancelled) return;
        setAreas([]);
        setSelectedAreaId("");
      }
    };
    fetchAreas();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPageNumber(1);
  }, [searchDebounced, statusFilter, selectedAreaId, dateFrom, dateTo]);

  useFilterLockPersist("queries_list", filtersLocked, {
    status: statusFilter,
    dateFrom,
    dateTo,
  });

  useEffect(() => {
    fetchQueries();
  }, [
    pageNumber,
    pageSize,
    searchDebounced,
    statusFilter,
    selectedAreaId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (!dateFrom) return;
    setDateTo((prev) => {
      if (prev && prev < dateFrom) return "";
      return prev;
    });
  }, [dateFrom]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (event) => setIsMobileView(event.matches);
    setIsMobileView(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }
    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ status: statusFilter, dateFrom, dateTo });
  };

  const handleDeleteClick = (queryId) => {
    setConfirmDelete({ visible: true, id: queryId });
  };

  const handleDeleteConfirm = async () => {
    const queryId = confirmDelete.id;
    setConfirmDelete({ visible: false, id: null });
    if (queryId == null) return;
    try {
      await queryService.delete(queryId);
      toastSuccess("Query deleted successfully");
      fetchQueries();
    } catch (err) {
      toastError(err?.message || "Failed to delete query");
    }
  };

  const pag = pagination;
  const totalPages = pag?.totalPages ?? 1;
  const currentPage = pag?.currentPage ?? 1;

  const renderQuotationLinks = (q, block) =>
    Array.isArray(q.convertedQuotations) && q.convertedQuotations.length > 0
      ? q.convertedQuotations.map((ref, idx) => {
          const qid = ref.quotationId?._id ?? ref.quotationId;
          const code = ref.quotationCode || qid || "—";
          const link = (
            <span
              role="link"
              tabIndex={0}
              className="text-primary! underline"
              onClick={(e) => {
                e.stopPropagation();
                if (qid) navigate(`/quotations/${qid}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (qid) navigate(`/quotations/${qid}`);
                }
              }}
            >
              {code}
            </span>
          );
          return block ? (
            <div key={String(qid)}>{link}</div>
          ) : (
            <span key={String(qid || idx)}>
              {link}
              {idx < q.convertedQuotations.length - 1 ? ", " : ""}
            </span>
          );
        })
      : "—";

  const columns = useMemo(
    () => [
      {
        key: "index",
        label: "S No",
        width: 64,
        toggleable: false,
        exportable: false,
        render: (_row, index) => (currentPage - 1) * pageSize + index + 1,
      },
      {
        key: "queryCode",
        label: "Query code",
        exportValue: (q) => q.queryCode || "—",
        render: (q) => (
          <span className="whitespace-nowrap font-semibold">
            {q.queryCode || "—"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        exportValue: (q) => q.status || "pending",
        render: (q) => <QueryStatusBadge status={q.status} />,
      },
      {
        key: "company",
        label: "Company",
        exportValue: (q) => q.companyInfo?.name || "-",
        render: (q) => (
          <>
            <strong>{q.companyInfo?.name || "-"}</strong>
            {(q.companyInfo?.purchaseManagers?.length > 0
              ? (q.companyInfo.purchaseManagers || [])
                  .map((m) => m.name || m.phone)
                  .filter(Boolean)
                  .join(", ")
              : q.companyInfo?.purchase_manager_name ||
                q.companyInfo?.purchase_manager_phone) && (
              <div className="text-sm text-muted-foreground">
                {q.companyInfo?.purchaseManagers?.length > 0
                  ? q.companyInfo.purchaseManagers.map((pm, index) => (
                      <div key={index}>
                        {pm.name} {pm.phone ? `(${pm.phone})` : ""}
                      </div>
                    ))
                  : "-"}
              </div>
            )}
          </>
        ),
      },
      {
        key: "products",
        label: "Products",
        exportValue: (q) =>
          q.products?.length ? `${q.products.length} item(s)` : "-",
        render: (q) =>
          q.products?.length ? `${q.products.length} item(s)` : "-",
      },
      {
        key: "rateAvailable",
        label: "Rate available",
        exportValue: (q) =>
          String(Number(q.queryProductRateAvailableCount) || 0),
        render: (q) => String(Number(q.queryProductRateAvailableCount) || 0),
      },
      {
        key: "quotationNo",
        label: "Quotation no.",
        exportValue: (q) =>
          Array.isArray(q.convertedQuotations)
            ? q.convertedQuotations
                .map(
                  (ref) =>
                    ref.quotationCode ||
                    ref.quotationId?._id ||
                    ref.quotationId,
                )
                .join(", ")
            : "—",
        render: (q) => (
          <div className="text-sm">{renderQuotationLinks(q, true)}</div>
        ),
      },
      {
        key: "date",
        label: "Date",
        exportValue: (q) =>
          q.createdAt ? dateTimeFormatter(q.createdAt, "") : "-",
        render: (q) => renderCreatedAtCell(q.createdAt),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        toggleable: false,
        exportable: false,
        stopRowClick: true,
        render: (q) => (
          <RowActions
            onView={() => navigate(`/queries/${q._id || q.id}`)}
            onEdit={
              canEditQuery(user?.role, q.status, canUpdate("queries"))
                ? () => navigate(`/queries/edit/${q._id || q.id}`)
                : undefined
            }
            onDelete={
              canDelete("queries")
                ? () => handleDeleteClick(q._id || q.id)
                : undefined
            }
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, currentPage, pageSize, user],
  );

  return (
    <div>
      <PageHeader
        title="Queries"
        description="Track customer queries and their conversion to quotations."
        actions={
          <Button onClick={() => navigate("/queries/new")}>
            <Plus className="h-4 w-4" />
            Add Query
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
        <div className="md:col-span-3">
          <Filtered searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm text-muted-foreground">From date</Label>
          <Input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm text-muted-foreground">To date</Label>
          <Input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm text-muted-foreground">Status</Label>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {QUERY_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        {!isSalesRole && (
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm text-muted-foreground">Zones</Label>
            <Select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
            >
              <option value="">All Zones</option>
              {areas.map((a) => {
                const id = String(a._id || a.id);
                return (
                  <option key={id} value={id}>
                    {a.name}
                    {a.city ? ` - ${a.city}` : ""}
                  </option>
                );
              })}
            </Select>
          </div>
        )}
        <div className="flex items-end md:col-span-1">
          <FilterLockButton
            filtersLocked={filtersLocked}
            onToggle={handleToggleFiltersLock}
            pageLabel="Queries"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="p-5 text-center">
          <Loader message="Loading queries..." />
        </div>
      ) : (
        <>
          {isMobileView ? (
            <div>
              {queries?.length > 0 ? (
                queries.map((q, index) => {
                  const rowRateBg = getAvailableRateRowBg(q);
                  return (
                    <Card
                      key={q._id || q.id}
                      className="mb-3 cursor-pointer"
                      style={
                        rowRateBg ? { backgroundColor: rowRateBg } : undefined
                      }
                      onClick={() => navigate(`/queries/${q._id || q.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              #{(currentPage - 1) * pageSize + index + 1}
                            </div>
                            <strong>{q.queryCode || "—"}</strong>
                          </div>
                          <QueryStatusBadge status={q.status} />
                        </div>
                        <div className="mb-1 text-sm">
                          <strong>Company:</strong> {q.companyInfo?.name || "-"}
                        </div>
                        <div className="mb-1 text-sm">
                          <strong>Products:</strong>{" "}
                          {q.products?.length
                            ? `${q.products.length} item(s)`
                            : "-"}
                        </div>
                        <div className="mb-1 text-sm">
                          <strong>Rate available:</strong>{" "}
                          {String(
                            Number(q.queryProductRateAvailableCount) || 0,
                          )}
                        </div>
                        <div className="mb-1 text-sm">
                          <strong>Quotation no.:</strong>{" "}
                          {renderQuotationLinks(q, false)}
                        </div>
                        <div className="mb-2 text-sm">
                          <strong>Date:</strong>{" "}
                          {q.createdAt
                            ? dateTimeFormatter(q.createdAt, "")
                            : "-"}
                        </div>
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RowActions
                            className="justify-start"
                            onView={() => navigate(`/queries/${q._id || q.id}`)}
                            onEdit={
                              canEditQuery(
                                user?.role,
                                q.status,
                                canUpdate("queries"),
                              )
                                ? () =>
                                    navigate(`/queries/edit/${q._id || q.id}`)
                                : undefined
                            }
                            onDelete={() => handleDeleteClick(q._id || q.id)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  No queries found.
                </div>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={queries}
              rowKey={(q) => q._id || q.id}
              onRowClick={(q) => navigate(`/queries/${q._id || q.id}`)}
              showSearch={false}
              exportFileName="queries"
              emptyTitle="No queries found"
              rowStyle={(q) => {
                const bg = getAvailableRateRowBg(q);
                return bg ? { backgroundColor: bg } : undefined;
              }}
            />
          )}

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPageNumber}
            showRange
            totalItems={pagination?.totalItems ?? 0}
            itemsPerPage={pagination?.itemsPerPage ?? 10}
          />
        </>
      )}

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Query?"
        message="Are you sure you want to delete this query? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default QueryList;
