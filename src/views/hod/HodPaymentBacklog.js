import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilMoney, cilBuilding, cilReload, cilX } from "@coreui/icons";
import poPaymentBacklogService from "../../services/poPaymentBacklogService";
import { toastError } from "../../utils/toast";
import { Loader, TablePagination } from "../../components";
import { dateFormatter } from "../../utils/dateFormatter";

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const isDueSoon = (dueDateStr) => {
  if (!dueDateStr) return false;
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
};

const isOverdue = (dueDateStr) => {
  if (!dueDateStr) return false;
  return new Date(dueDateStr) < new Date();
};

const getDueBadge = (dueDate, isSettled) => {
  if (isSettled) return { color: "success", label: "Settled" };
  if (isOverdue(dueDate)) return { color: "danger", label: "Overdue" };
  if (isDueSoon(dueDate)) return { color: "warning", label: "Due soon" };
  return { color: "info", label: "Pending" };
};

const DEBOUNCE_MS = 400;

const HodPaymentBacklog = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20,
  });
  const [analytics, setAnalytics] = useState({
    totalPendingAmount: 0,
    totalCompaniesWithPending: 0,
  });
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    poNumber: "",
    salesPersonName: "",
    clientName: "",
    dateFrom: "",
    dateTo: "",
    is_settled: "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceTimer = useRef(null);

  const onFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedFilters(next);
      setPage(1);
    }, DEBOUNCE_MS);
  };

  const clearFilters = () => {
    const empty = {
      poNumber: "",
      salesPersonName: "",
      clientName: "",
      dateFrom: "",
      dateTo: "",
      is_settled: "",
    };
    setFilters(empty);
    clearTimeout(debounceTimer.current);
    setDebouncedFilters(empty);
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  const loadData = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        const params = {
          pageNumber,
          pageSize: 20,
        };
        if (debouncedFilters.poNumber)
          params.poNumber = debouncedFilters.poNumber;
        if (debouncedFilters.salesPersonName)
          params.salesPersonName = debouncedFilters.salesPersonName;
        if (debouncedFilters.clientName)
          params.clientName = debouncedFilters.clientName;
        if (debouncedFilters.dateFrom)
          params.dateFrom = debouncedFilters.dateFrom;
        if (debouncedFilters.dateTo) params.dateTo = debouncedFilters.dateTo;
        if (debouncedFilters.is_settled !== "")
          params.is_settled = debouncedFilters.is_settled;

        const res = await poPaymentBacklogService.list(params);
        const payload = res?.data?.data ?? res?.data ?? res;

        setRows(payload?.items || []);
        setPagination(
          payload?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            pageSize: 20,
          },
        );
        if (payload?.analytics) {
          setAnalytics(payload.analytics);
        }
      } catch (err) {
        toastError(err?.message || "Failed to load payment backlog");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [debouncedFilters],
  );

  useEffect(() => {
    loadData(page);
  }, [page, loadData]);

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="position-relative">
      {loading && <Loader />}

      {/* Analytics Cards */}
      <CRow className="g-3 mb-4">
        <CCol sm={6} lg={4}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: "rgba(220, 53, 69, 0.1)",
                }}
              >
                <CIcon
                  icon={cilMoney}
                  style={{ color: "#dc3545", width: 22, height: 22 }}
                />
              </div>
              <div>
                <div className="text-body-secondary small fw-medium text-uppercase tracking-wide">
                  Total Pending Amount
                </div>
                <div className="fs-5 fw-bold text-danger mt-1">
                  {formatAmount(analytics.totalPendingAmount)}
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol sm={6} lg={4}>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardBody className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: "rgba(13, 110, 253, 0.1)",
                }}
              >
                <CIcon
                  icon={cilBuilding}
                  style={{ color: "#0d6efd", width: 22, height: 22 }}
                />
              </div>
              <div>
                <div className="text-body-secondary small fw-medium text-uppercase tracking-wide">
                  Companies with Pending
                </div>
                <div className="fs-5 fw-bold text-primary mt-1">
                  {analytics.totalCompaniesWithPending}
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Main Table Card */}
      <CCard>
        <CCardBody>
          <div className="d-flex justify-content-between flex-wrap align-items-start mb-4">
            <div>
              <h4 className="mb-1">Payment Backlog</h4>
              <p className="text-body-secondary small mb-0">
                All HOD-approved Sales Order payment obligations pending
                settlement.
              </p>
            </div>
            <CButton
              color="secondary"
              variant="ghost"
              size="sm"
              onClick={() => loadData(page)}
              disabled={loading}
              title="Refresh"
            >
              <CIcon icon={cilReload} />
            </CButton>
          </div>

          {/* Filters */}
          <CCard className="mb-4 bg-body-tertiary border-0">
            <CCardBody className="py-3">
              <CRow className="g-3 align-items-end">
                <CCol sm={6} lg={3}>
                  <CFormLabel className="small fw-medium mb-1">
                    Sales Order Number
                  </CFormLabel>
                  <CFormInput
                    size="sm"
                    placeholder="Search Sales Order number…"
                    value={filters.poNumber}
                    onChange={(e) => onFilterChange("poNumber", e.target.value)}
                  />
                </CCol>

                <CCol sm={6} lg={3}>
                  <CFormLabel className="small fw-medium mb-1">
                    Sales Person
                  </CFormLabel>
                  <CFormInput
                    size="sm"
                    placeholder="Search sales person name…"
                    value={filters.salesPersonName}
                    onChange={(e) =>
                      onFilterChange("salesPersonName", e.target.value)
                    }
                  />
                </CCol>

                <CCol sm={6} lg={3}>
                  <CFormLabel className="small fw-medium mb-1">
                    Client Name
                  </CFormLabel>
                  <CFormInput
                    size="sm"
                    placeholder="Search client name…"
                    value={filters.clientName}
                    onChange={(e) =>
                      onFilterChange("clientName", e.target.value)
                    }
                  />
                </CCol>

                <CCol sm={6} lg={3}>
                  <CFormLabel className="small fw-medium mb-1">
                    Status
                  </CFormLabel>
                  <select
                    className="form-select form-select-sm"
                    value={filters.is_settled}
                    onChange={(e) =>
                      onFilterChange("is_settled", e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="false">Pending</option>
                    <option value="true">Settled</option>
                  </select>
                </CCol>

                <CCol sm={6} lg={3}>
                  <CFormLabel className="small fw-medium mb-1">
                    Date From
                  </CFormLabel>
                  <CFormInput
                    size="sm"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                  />
                </CCol>

                <CCol sm={6} lg={3}>
                  <CFormLabel className="small fw-medium mb-1">
                    Date To
                  </CFormLabel>
                  <CFormInput
                    size="sm"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onFilterChange("dateTo", e.target.value)}
                  />
                </CCol>

                {hasActiveFilters && (
                  <CCol sm={6} lg={3} className="d-flex align-items-end">
                    <CButton
                      color="secondary"
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="d-flex align-items-center gap-1"
                    >
                      <CIcon icon={cilX} />
                      Clear filters
                    </CButton>
                  </CCol>
                )}
              </CRow>
            </CCardBody>
          </CCard>

          {/* Results count */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="small text-body-secondary">
              {loading
                ? "Loading…"
                : `${pagination.totalItems ?? 0} record${(pagination.totalItems ?? 0) !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Table */}
          <CTable align="middle" className="mb-0" hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Sales Order Number</CTableHeaderCell>
                <CTableHeaderCell>Client</CTableHeaderCell>
                <CTableHeaderCell>Sales Person</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                <CTableHeaderCell>Created</CTableHeaderCell>
                <CTableHeaderCell>Due Date</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {!loading && rows.length === 0 && (
                <CTableRow>
                  <CTableDataCell
                    colSpan={7}
                    className="text-center text-body-secondary py-5"
                  >
                    No backlog entries found
                    {hasActiveFilters ? " for the current filters" : ""}.
                  </CTableDataCell>
                </CTableRow>
              )}
              {loading && rows.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={7} className="text-center py-5">
                    <CSpinner size="sm" className="me-2" />
                    Loading…
                  </CTableDataCell>
                </CTableRow>
              )}
              {rows.map((row) => {
                const poCode =
                  row.po_snapshot?.poCode || row.po_snapshot?.po_number || "—";
                const clientName = row.clients_snapshot?.name || "—";
                const salesPerson = row.employeeId?.name || "—";
                const badge = getDueBadge(row.due_date, row.is_settled);

                return (
                  <CTableRow key={row._id}>
                    <CTableDataCell className="fw-medium">
                      {poCode}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div>{clientName}</div>
                      {row.clients_snapshot?.location && (
                        <div className="small text-body-secondary">
                          {row.clients_snapshot.location}
                        </div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div>{salesPerson}</div>
                      {row.employeeId?.role && (
                        <div className="small text-body-secondary">
                          {String(row.employeeId.role).replace(/_/g, " ")}
                        </div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {formatAmount(row.amount)}
                    </CTableDataCell>
                    <CTableDataCell className="small text-body-secondary">
                      {dateFormatter(row.createdAt, "—")}
                    </CTableDataCell>
                    <CTableDataCell>
                      <span
                        className={
                          !row.is_settled && isOverdue(row.due_date)
                            ? "text-danger fw-medium"
                            : !row.is_settled && isDueSoon(row.due_date)
                              ? "text-warning fw-medium"
                              : ""
                        }
                      >
                        {dateFormatter(row.due_date, "—")}
                      </span>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={badge.color}>{badge.label}</CBadge>
                    </CTableDataCell>
                  </CTableRow>
                );
              })}
            </CTableBody>
          </CTable>

          {/* Pagination */}
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            wrapperClassName="d-flex justify-content-center mt-4"
            align="center"
          />
        </CCardBody>
      </CCard>
    </div>
  );
};

export default HodPaymentBacklog;
