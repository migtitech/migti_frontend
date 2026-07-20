import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Download, Pencil } from "lucide-react";
import quotationService from "../../services/quotationService";
import areaService from "../../services/areaService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  Loader,
  TablePagination,
  FilterLockButton,
  DataTable,
  PageHeader,
  StatusBadge,
} from "../../components";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Spinner,
} from "../../components/ui";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole, isHodRole } from "../../hooks/usePermissions";
import { dateFormatter } from "../../utils/dateFormatter";

const mapQuotation = (q) => (q ? { ...q, id: q._id ?? q.id } : null);

const QUOTATION_FILTER_DEFAULTS = { status: "", dateFrom: "", dateTo: "" };

const formatInrAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const isHodApproved = (quotation) => quotation?.status === "hod_approved";
const hasAllProductsHodRatesApproved = (quotation) =>
  !!quotation?.allProductsHodRatesApproved;

const PDF_DOWNLOAD_BLOCKED_MESSAGE =
  "PDF export requires HOD quotation approval or all product HOD rates approved";
const PDF_DOWNLOAD_DISABLED_TITLE =
  "Download disabled until HOD approval or all product rates are HOD approved";

/** Quotation row is tied to a query when `queryId` is populated or is an ObjectId string */
const quotationHasQueryId = (quotation) => {
  const raw = quotation?.queryId;
  if (raw == null) return false;
  if (typeof raw === "object") {
    return Boolean(raw._id ?? raw.id);
  }
  return String(raw).trim().length > 0;
};

/** Items line count from `query_products` when a query exists; otherwise legacy products / items text */
const formatQuotationItemsLabel = (quotation) => {
  if (quotationHasQueryId(quotation)) {
    const n = Number(quotation.queryProductItemCount) || 0;
    return `${n} item(s)`;
  }
  if (Array.isArray(quotation.products) && quotation.products.length > 0) {
    return `${quotation.products.length} product(s)`;
  }
  const items = quotation.items?.substring(0, 50) || "";
  const suffix =
    quotation.items &&
    quotation.items.length > 50 &&
    !quotation.products?.length
      ? "..."
      : "";
  return `${items}${suffix}` || "—";
};

const formatRateSubmittedFulfilledCount = (quotation) => {
  if (!quotationHasQueryId(quotation)) return "—";
  return String(
    Number(quotation.queryProductRateSubmittedOrFulfilledCount) || 0,
  );
};

const QUOTATION_ROW_RATE_HIGHLIGHT_BG = "#e0f2fe";

const getSubmittedOrFulfilledRateRowBg = (quotation) => {
  if (!quotationHasQueryId(quotation)) return null;
  const rated =
    Number(quotation.queryProductRateSubmittedOrFulfilledCount) || 0;
  if (rated > 1) return QUOTATION_ROW_RATE_HIGHLIGHT_BG;
  return null;
};

const getQuotationCompanyName = (quotation) =>
  quotation.companyInfo?.name || quotation.customerName || "-";

const getQuotationDisplayCode = (quotation) =>
  quotation.quotationCode || `QT-${String(quotation.id).slice(-6)}`;

const renderQuotationInfo = (quotation) => {
  const companyEmail =
    quotation.companyInfo?.email || quotation.customerEmail || "";

  return (
    <>
      <strong>{getQuotationCompanyName(quotation)}</strong>
      <div style={{ fontSize: "87.5%" }}>
        {getQuotationDisplayCode(quotation)}
      </div>
      {companyEmail ? (
        <>
          <br />
          <small className="text-muted-foreground">{companyEmail}</small>
        </>
      ) : null}
    </>
  );
};

const renderClientPendingAmount = (quotation) => {
  const isOverdue = !!quotation?.clientPaymentOverdue;

  return (
    <span className="inline-flex items-center gap-2">
      <span>₹{formatInrAmount(quotation.clientPendingAmount)}</span>
      <span
        title={isOverdue ? "Payment overdue" : "Payment not overdue"}
        aria-label={isOverdue ? "Payment overdue" : "Payment not overdue"}
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: isOverdue ? "#dc3545" : "#198754",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
    </span>
  );
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafted" },
  { value: "partial", label: "Partially Fulfilled" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "ready", label: "Ready" },
  { value: "sentToClient", label: "Sent to Client" },
  { value: "poReceived", label: "Sales Order Received" },
  { value: "followup01", label: "Follow-up 01" },
  { value: "followup02", label: "Follow-up 02" },
  { value: "closed", label: "Closed" },
];

const getStatusBadge = (status) => {
  switch (status) {
    case "draft":
      return <StatusBadge variant="secondary">Draft</StatusBadge>;
    case "partial":
      return <StatusBadge variant="warning">Partially Fulfilled</StatusBadge>;
    case "fulfilled":
      return <StatusBadge variant="default">Fulfilled</StatusBadge>;
    case "hod_approved":
      return <StatusBadge variant="success">Approved</StatusBadge>;
    case "sent":
    case "sentToClient":
      return <StatusBadge variant="default">Sent</StatusBadge>;
    case "accepted":
      return <StatusBadge variant="success">Accepted</StatusBadge>;
    case "rejected":
      return <StatusBadge variant="destructive">Rejected</StatusBadge>;
    case "expired":
      return <StatusBadge variant="warning">Expired</StatusBadge>;
    default:
      return <StatusBadge variant="secondary">{status || "Draft"}</StatusBadge>;
  }
};

const QuotationList = () => {
  const MOBILE_BREAKPOINT = 576;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
  const isHodUser = isHodRole(user?.role);
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "quotations_list",
    QUOTATION_FILTER_DEFAULTS,
  );
  const [quotations, setQuotations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialValues.status);
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [dateFrom, setDateFrom] = useState(initialValues.dateFrom);
  const [dateTo, setDateTo] = useState(initialValues.dateTo);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [exportingPdfId, setExportingPdfId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    quotation: null,
  });
  const [deletingId, setDeletingId] = useState(null);
  const latestFetchIdRef = useRef(0);
  const [isMobileView, setIsMobileView] = useState(false);

  const canDownloadQuotationPdf = (quotation) =>
    isSalesRole ||
    isHodApproved(quotation) ||
    hasAllProductsHodRatesApproved(quotation);

  const handleDownloadPdf = async (e, quotation) => {
    e?.stopPropagation();
    if (!quotation?.id) return;
    if (!canDownloadQuotationPdf(quotation)) {
      toastError(PDF_DOWNLOAD_BLOCKED_MESSAGE);
      return;
    }
    setExportingPdfId(quotation.id);
    try {
      const response = await quotationService.exportPdf(quotation.id);
      const blob = response?.data;
      if (!blob || !(blob instanceof Blob)) {
        toastError("Invalid PDF response");
        return;
      }
      const contentType =
        response?.headers?.["content-type"] || blob.type || "";
      if (blob.size < 100 || contentType.includes("json")) {
        const text = await blob.text();
        const err = text
          ? (() => {
              try {
                const j = JSON.parse(text);
                return j?.message || j?.error?.detail || text;
              } catch {
                return text;
              }
            })()
          : "Invalid PDF response";
        toastError(err);
        return;
      }
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation-${quotation.quotationCode || quotation.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toastSuccess("PDF downloaded");
    } catch (err) {
      toastError(err?.message || "Failed to export PDF");
    } finally {
      setExportingPdfId(null);
    }
  };

  const handleDeleteQuotationConfirm = async () => {
    const q = confirmDelete.quotation;
    const qid = q?.id || q?._id;
    if (!qid) {
      setConfirmDelete({ visible: false, quotation: null });
      return;
    }
    setDeletingId(qid);
    try {
      await quotationService.delete(qid);
      toastSuccess("Quotation deleted successfully");
      setConfirmDelete({ visible: false, quotation: null });
      fetchQuotations();
    } catch (err) {
      toastError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete quotation",
      );
    } finally {
      setDeletingId(null);
    }
  };

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
          const payload = data || {};
          const pageAreas = payload?.areas || [];
          const pagePagination = payload?.pagination || {};
          allAreas.push(...pageAreas);
          hasNextPage = Boolean(pagePagination?.hasNextPage);
          pageNumber += 1;
        }
        if (cancelled) return;
        setAreas(allAreas);
      } catch {
        if (cancelled) return;
        setAreas([]);
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

  useFilterLockPersist("quotations_list", filtersLocked, {
    status: statusFilter,
    dateFrom,
    dateTo,
  });

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

  const fetchQuotations = async () => {
    const fetchId = Date.now();
    latestFetchIdRef.current = fetchId;
    setLoading(true);
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
      const res = await withMinimumDelay(() => quotationService.getAll(params));
      const data = res?.data || res;
      const result = data?.data ?? data;
      if (latestFetchIdRef.current !== fetchId) return;
      const list = (result?.quotations || []).map(mapQuotation);
      setQuotations(list);
      setPagination(result?.pagination || null);
      const serverPage = result?.pagination?.currentPage;
      const serverTotalPages = result?.pagination?.totalPages;
      if (
        Number.isInteger(serverPage) &&
        Number.isInteger(serverTotalPages) &&
        serverTotalPages > 0 &&
        serverPage > serverTotalPages
      ) {
        setPageNumber(serverTotalPages);
      }
    } catch (err) {
      if (latestFetchIdRef.current !== fetchId) return;
      toastError(err?.message || "Failed to load quotations");
      setQuotations([]);
      setPagination(null);
    } finally {
      if (latestFetchIdRef.current === fetchId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [
    pageNumber,
    pageSize,
    searchDebounced,
    statusFilter,
    selectedAreaId,
    dateFrom,
    dateTo,
  ]);

  const filteredQuotations = quotations;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? pageNumber;
  const totalItems = pagination?.totalItems ?? filteredQuotations.length;

  const renderQuotationActions = (quotation) => (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-primary"
        title="View"
        aria-label="View"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/quotations/${quotation.id}`);
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-success"
        title={
          canDownloadQuotationPdf(quotation)
            ? "Download PDF"
            : PDF_DOWNLOAD_DISABLED_TITLE
        }
        aria-label="Download PDF"
        disabled={
          exportingPdfId === quotation.id || !canDownloadQuotationPdf(quotation)
        }
        onClick={(e) => handleDownloadPdf(e, quotation)}
      >
        {exportingPdfId === quotation.id ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-primary"
        title="Edit"
        aria-label="Edit"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/quotations/edit/${quotation.id}`);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );

  const columns = useMemo(
    () => {
      const cols = [
        {
          key: "index",
          label: "#",
          width: 64,
          toggleable: false,
          exportable: false,
          render: (_row, index) => (currentPage - 1) * pageSize + index + 1,
        },
        {
          key: "info",
          label: "Quotation info",
          exportValue: (q) =>
            `${getQuotationCompanyName(q)} / ${getQuotationDisplayCode(q)}`,
          render: (q) => renderQuotationInfo(q),
        },
        {
          key: "items",
          label: "Products / Items",
          exportValue: (q) => formatQuotationItemsLabel(q),
          render: (q) => <small>{formatQuotationItemsLabel(q)}</small>,
        },
        {
          key: "rate",
          label: "Rate submitted / fulfilled",
          exportValue: (q) => formatRateSubmittedFulfilledCount(q),
          render: (q) => <small>{formatRateSubmittedFulfilledCount(q)}</small>,
        },
        {
          key: "totalAmount",
          label: "Total Amount",
          exportValue: (q) => formatInrAmount(q.totalAmount),
          render: (q) => `₹${formatInrAmount(q.totalAmount)}`,
        },
      ];

      if (isHodUser) {
        cols.push({
          key: "pendingAmount",
          label: "Pending amount",
          exportValue: (q) => formatInrAmount(q.clientPendingAmount),
          render: (q) => renderClientPendingAmount(q),
        });
      }

      cols.push(
        {
          key: "status",
          label: "Status",
          exportValue: (q) => q.status || "Draft",
          render: (q) => getStatusBadge(q.status),
        },
        {
          key: "date",
          label: "Date",
          exportValue: (q) =>
            q.createdAt ? dateFormatter(q.createdAt, "") : "-",
          render: (q) => (q.createdAt ? dateFormatter(q.createdAt, "") : "-"),
        },
        {
          key: "actions",
          label: "Actions",
          align: "right",
          toggleable: false,
          exportable: false,
          stopRowClick: true,
          render: (q) => renderQuotationActions(q),
        },
      );

      return cols;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, currentPage, pageSize, isHodUser, exportingPdfId],
  );

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Manage customer quotations, approvals, and PDF exports."
      />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
        <div className="space-y-1.5 md:col-span-3">
          <Label className="text-sm text-muted-foreground">Search</Label>
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
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
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
            pageLabel="Quotations"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm text-muted-foreground">Rows per page</Label>
          <Select
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value) || 10;
              setPageSize(next);
              setPageNumber(1);
            }}
            aria-label="Rows per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </Select>
        </div>
      </div>

      {loading && <Loader />}

      {isMobileView ? (
        <div>
          {filteredQuotations && filteredQuotations.length > 0 ? (
            filteredQuotations.map((quotation, index) => {
              const rowRateBg = getSubmittedOrFulfilledRateRowBg(quotation);
              return (
                <Card
                  key={quotation.id}
                  className="mb-3 cursor-pointer"
                  style={rowRateBg ? { backgroundColor: rowRateBg } : undefined}
                  onClick={() => navigate(`/quotations/${quotation.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          #{(currentPage - 1) * pageSize + index + 1}
                        </div>
                        {renderQuotationInfo(quotation)}
                      </div>
                      <div>{getStatusBadge(quotation.status)}</div>
                    </div>
                    <div className="mb-1 text-sm">
                      <strong>Products / Items:</strong>{" "}
                      {formatQuotationItemsLabel(quotation)}
                    </div>
                    <div className="mb-1 text-sm">
                      <strong>Rate submitted / fulfilled:</strong>{" "}
                      {formatRateSubmittedFulfilledCount(quotation)}
                    </div>
                    <div className="mb-1 text-sm">
                      <strong>Total Amount:</strong> ₹
                      {formatInrAmount(quotation.totalAmount)}
                    </div>
                    {isHodUser ? (
                      <div className="mb-1 text-sm">
                        <strong>Pending amount:</strong>{" "}
                        {renderClientPendingAmount(quotation)}
                      </div>
                    ) : null}
                    <div className="mb-2 text-sm">
                      <strong>Date:</strong>{" "}
                      {quotation.createdAt
                        ? dateFormatter(quotation.createdAt, "")
                        : "-"}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      {renderQuotationActions(quotation)}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              {!loading &&
                (quotations?.length === 0
                  ? "No quotations available."
                  : "No quotations match your search.")}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredQuotations}
          rowKey={(q) => q.id}
          onRowClick={(q) => navigate(`/quotations/${q.id}`)}
          showSearch={false}
          exportFileName="quotations"
          emptyTitle="No quotations available"
          emptyMessage="No quotations match your search."
          rowStyle={(q) => {
            const bg = getSubmittedOrFulfilledRateRowBg(q);
            return bg ? { backgroundColor: bg } : undefined;
          }}
        />
      )}

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPageNumber}
        disabled={loading}
        showRange
        totalItems={totalItems}
        itemsPerPage={pageSize}
        wrapperClassName="d-flex justify-content-between align-items-center mt-2"
      />

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() =>
          !deletingId && setConfirmDelete({ visible: false, quotation: null })
        }
        onConfirm={handleDeleteQuotationConfirm}
        title="Delete Quotation?"
        message={
          confirmDelete.quotation?.quotationCode
            ? `Permanently remove quotation ${confirmDelete.quotation.quotationCode}? This cannot be undone.`
            : "Permanently remove this quotation? This cannot be undone."
        }
        confirmText={deletingId ? "Deleting…" : "Delete"}
        cancelText="Cancel"
      />
    </div>
  );
};

export default QuotationList;
