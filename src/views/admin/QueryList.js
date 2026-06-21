import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge,
  CFormSelect,
  CFormInput,
  CFormLabel,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilPlus, cilPencil, cilTrash } from "@coreui/icons";
import { EyeIcon } from "../../components";
import queryService from "../../services/queryService";
import areaService from "../../services/areaService";
import Filtered from "../../filtered/Filtered";
import {
  ConfirmDialog,
  Loader,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastSuccess, toastError } from "../../utils/toast";
import usePermissions, {
  normalizeRole,
  canEditQuery,
} from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import {
  dateFormatter,
  dateTimeFormatter,
  splitDateTimeParts,
} from "../../utils/dateFormatter";

const renderCreatedAtCell = (createdAt) => {
  if (!createdAt) return "-";
  const { date, time } = splitDateTimeParts(createdAt, "");
  return (
    <>
      {date}
      {time ? <div className="text-muted small">{time}</div> : null}
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

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Queries</strong>
              <CButton color="primary" onClick={() => navigate("/queries/new")}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Query
              </CButton>
            </CCardHeader>

            <CCardBody>
              <CRow className="mb-3 g-2 align-items-end">
                <CCol md={3}>
                  <Filtered
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="mb-1 small text-muted">
                    From date
                  </CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="mb-1 small text-muted">
                    To date
                  </CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </CCol>
                <CCol md={2}>
                  <div>
                    <CFormLabel className="mb-1 small text-muted">
                      Status
                    </CFormLabel>
                    <CFormSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      {QUERY_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </div>
                </CCol>
                {!isSalesRole && (
                  <CCol md={3}>
                    <div>
                      <CFormLabel className="mb-1 small text-muted">
                        Zones
                      </CFormLabel>
                      <CFormSelect
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
                      </CFormSelect>
                    </div>
                  </CCol>
                )}{" "}
                <CCol md={2} className="d-flex align-items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="Queries"
                  />
                </CCol>
              </CRow>

              {error && <div className="text-danger small mb-2">{error}</div>}

              {loading ? (
                <div className="text-center p-5">
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
                            <CCard
                              key={q._id || q.id}
                              className="mb-3 border"
                              style={{
                                cursor: "pointer",
                                ...(rowRateBg && {
                                  backgroundColor: rowRateBg,
                                }),
                              }}
                              onClick={() =>
                                navigate(`/queries/${q._id || q.id}`)
                              }
                            >
                              <CCardBody>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <div className="small text-muted">
                                      #
                                      {(currentPage - 1) * pageSize + index + 1}
                                    </div>
                                    <strong>{q.queryCode || "—"}</strong>
                                  </div>
                                  <div>
                                    <CBadge
                                      color={
                                        q.status === "closed"
                                          ? "secondary"
                                          : q.status === "convertedToQuotation"
                                            ? "success"
                                            : q.status === "progress"
                                              ? "primary"
                                              : q.status &&
                                                  q.status.startsWith(
                                                    "followup",
                                                  )
                                                ? "warning"
                                                : "info"
                                      }
                                    >
                                      {q.status || "pending"}
                                    </CBadge>
                                  </div>
                                </div>
                                <div className="small mb-1">
                                  <strong>Company:</strong>{" "}
                                  {q.companyInfo?.name || "-"}
                                </div>
                                <div className="small mb-1">
                                  <strong>Products:</strong>{" "}
                                  {q.products?.length
                                    ? `${q.products.length} item(s)`
                                    : "-"}
                                </div>
                                <div className="small mb-1">
                                  <strong>Rate available:</strong>{" "}
                                  {String(
                                    Number(q.queryProductRateAvailableCount) ||
                                      0,
                                  )}
                                </div>
                                <div className="small mb-1">
                                  <strong>Quotation no.:</strong>{" "}
                                  {Array.isArray(q.convertedQuotations) &&
                                  q.convertedQuotations.length > 0
                                    ? q.convertedQuotations.map((ref, idx) => {
                                        const qid =
                                          ref.quotationId?._id ??
                                          ref.quotationId;
                                        const code =
                                          ref.quotationCode || qid || "—";
                                        return (
                                          <span key={String(qid || idx)}>
                                            <span
                                              role="link"
                                              tabIndex={0}
                                              className="text-primary text-decoration-underline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (qid)
                                                  navigate(
                                                    `/quotations/${qid}`,
                                                  );
                                              }}
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === "Enter" ||
                                                  e.key === " "
                                                ) {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  if (qid)
                                                    navigate(
                                                      `/quotations/${qid}`,
                                                    );
                                                }
                                              }}
                                            >
                                              {code}
                                            </span>
                                            {idx <
                                            q.convertedQuotations.length - 1
                                              ? ", "
                                              : ""}
                                          </span>
                                        );
                                      })
                                    : "—"}
                                </div>
                                <div className="small mb-2">
                                  <strong>Date:</strong>{" "}
                                  {q.createdAt
                                    ? dateTimeFormatter(q.createdAt, "")
                                    : "-"}
                                </div>
                                <div className="d-flex gap-2">
                                  <CButton
                                    color="info"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/queries/${q._id || q.id}`);
                                    }}
                                    title="View"
                                  >
                                    <EyeIcon />
                                  </CButton>
                                  {canEditQuery(
                                    user?.role,
                                    q.status,
                                    canUpdate("queries"),
                                  ) && (
                                    <CButton
                                      color="warning"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/queries/edit/${q._id || q.id}`,
                                        );
                                      }}
                                      title="Edit"
                                    >
                                      <CIcon icon={cilPencil} />
                                    </CButton>
                                  )}
                                  <CButton
                                    color="danger"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(q._id || q.id);
                                    }}
                                    title="Delete"
                                  >
                                    <CIcon icon={cilTrash} />
                                  </CButton>
                                </div>
                              </CCardBody>
                            </CCard>
                          );
                        })
                      ) : (
                        <div className="text-center text-muted py-4">
                          No queries found.
                        </div>
                      )}
                    </div>
                  ) : (
                    <CTable hover responsive bordered>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>S No</CTableHeaderCell>
                          <CTableHeaderCell>Query code</CTableHeaderCell>
                          <CTableHeaderCell>Status</CTableHeaderCell>
                          <CTableHeaderCell>Company</CTableHeaderCell>
                          <CTableHeaderCell>Products</CTableHeaderCell>
                          <CTableHeaderCell>Rate available</CTableHeaderCell>
                          <CTableHeaderCell>Quotation no.</CTableHeaderCell>
                          <CTableHeaderCell>Date</CTableHeaderCell>
                          <CTableHeaderCell>Actions</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {queries?.length > 0 ? (
                          queries.map((q, index) => {
                            const rowRateBg = getAvailableRateRowBg(q);
                            return (
                              <CTableRow
                                key={q._id || q.id}
                                style={{
                                  cursor: "pointer",
                                  ...(rowRateBg && {
                                    "--cui-table-bg": rowRateBg,
                                    backgroundColor: rowRateBg,
                                  }),
                                }}
                                onClick={() =>
                                  navigate(`/queries/${q._id || q.id}`)
                                }
                              >
                                <CTableDataCell>
                                  {(currentPage - 1) * pageSize + index + 1}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <strong>{q.queryCode || "—"}</strong>
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CBadge
                                    color={
                                      q.status === "closed"
                                        ? "secondary"
                                        : q.status === "convertedToQuotation"
                                          ? "success"
                                          : q.status === "progress"
                                            ? "primary"
                                            : q.status &&
                                                q.status.startsWith("followup")
                                              ? "warning"
                                              : "info"
                                    }
                                  >
                                    {q.status || "pending"}
                                  </CBadge>
                                </CTableDataCell>
                                <CTableDataCell>
                                  <strong>{q.companyInfo?.name || "-"}</strong>
                                  {(q.companyInfo?.purchaseManagers?.length > 0
                                    ? (q.companyInfo.purchaseManagers || [])
                                        .map((m) => m.name || m.phone)
                                        .filter(Boolean)
                                        .join(", ")
                                    : q.companyInfo?.purchase_manager_name ||
                                      q.companyInfo
                                        ?.purchase_manager_phone) && (
                                    <div className="text-muted small">
                                      {q.companyInfo?.purchaseManagers?.length >
                                      0
                                        ? q.companyInfo.purchaseManagers.map(
                                            (pm, index) => (
                                              <div key={index}>
                                                {pm.name}{" "}
                                                {pm.phone
                                                  ? `(${pm.phone})`
                                                  : ""}
                                              </div>
                                            ),
                                          )
                                        : "-"}
                                    </div>
                                  )}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {q.products?.length
                                    ? `${q.products.length} item(s)`
                                    : "-"}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {String(
                                    Number(q.queryProductRateAvailableCount) ||
                                      0,
                                  )}
                                </CTableDataCell>
                                <CTableDataCell className="small">
                                  {Array.isArray(q.convertedQuotations) &&
                                  q.convertedQuotations.length > 0
                                    ? q.convertedQuotations.map((ref) => {
                                        const qid =
                                          ref.quotationId?._id ??
                                          ref.quotationId;
                                        const code =
                                          ref.quotationCode || qid || "—";
                                        return (
                                          <div key={String(qid)}>
                                            <span
                                              role="link"
                                              tabIndex={0}
                                              className="text-primary text-decoration-underline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (qid)
                                                  navigate(
                                                    `/quotations/${qid}`,
                                                  );
                                              }}
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === "Enter" ||
                                                  e.key === " "
                                                ) {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  if (qid)
                                                    navigate(
                                                      `/quotations/${qid}`,
                                                    );
                                                }
                                              }}
                                            >
                                              {code}
                                            </span>
                                          </div>
                                        );
                                      })
                                    : "—"}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {renderCreatedAtCell(q.createdAt)}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <CButton
                                    color="info"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/queries/${q._id || q.id}`);
                                    }}
                                    title="View"
                                  >
                                    <EyeIcon />
                                  </CButton>
                                  {canEditQuery(
                                    user?.role,
                                    q.status,
                                    canUpdate("queries"),
                                  ) && (
                                    <CButton
                                      color="warning"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/queries/edit/${q._id || q.id}`,
                                        );
                                      }}
                                      title="Edit"
                                    >
                                      <CIcon icon={cilPencil} />
                                    </CButton>
                                  )}
                                  {canDelete("queries") && (
                                    <CButton
                                      color="danger"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(q._id || q.id);
                                      }}
                                      title="Delete"
                                    >
                                      <CIcon icon={cilTrash} />
                                    </CButton>
                                  )}
                                </CTableDataCell>
                              </CTableRow>
                            );
                          })
                        ) : (
                          <CTableRow>
                            <CTableDataCell colSpan={9} className="text-center">
                              No queries found.
                            </CTableDataCell>
                          </CTableRow>
                        )}
                      </CTableBody>
                    </CTable>
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
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <ConfirmDialog
        visible={confirmDelete.visible}
        onClose={() => setConfirmDelete({ visible: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Query?"
        message="Are you sure you want to delete this query? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};

export default QueryList;
