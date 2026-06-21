import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilCommentSquare,
  cilHistory,
  cilReload,
  cilUser,
  cilX,
} from "@coreui/icons";
import quotationFollowupService from "../../services/quotationFollowupService";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const QUOTATION_FOLLOWUP_FILTER_DEFAULTS = {
  quotationCode: "",
  companyName: "",
  followupStatus: "",
};

const resolveFollowupCount = (row) => {
  const count = Number(row?.followupCount) || 0;
  if (count > 0) return count;
  const historyLen = Array.isArray(row?.followupHistory)
    ? row.followupHistory.length
    : 0;
  if (historyLen > 0) return historyLen;
  return row?.followupStatus === "followed_up" ? 1 : 0;
};

const isOverdue = (followupDateStr, row) => {
  if (resolveFollowupCount(row) > 0) return false;
  if (row?.followupStatus === "closed") return false;
  if (!followupDateStr) return false;
  const due = new Date(followupDateStr);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
};

const followupStatusLabel = (row) => {
  const count = resolveFollowupCount(row);
  if (row?.followupStatus === "closed") return "Closed";
  if (count > 0) return `Followed up ${count}`;
  return "Pending";
};

const followupStatusColor = (row) => {
  const count = resolveFollowupCount(row);
  if (row?.followupStatus === "closed") return "secondary";
  if (count > 0) return "success";
  return "warning";
};

const sortHistoryNewestFirst = (history = []) =>
  [...history].sort(
    (a, b) =>
      (Number(b.sequence) || 0) - (Number(a.sequence) || 0) ||
      new Date(b.followedUpAt || 0) - new Date(a.followedUpAt || 0),
  );

const DEBOUNCE_MS = 400;

const QuotationFollowupDashboard = () => {
  const location = useLocation();
  const isHodView = location.pathname === "/followup-dashboard";
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "quotation_followup",
    QUOTATION_FOLLOWUP_FILTER_DEFAULTS,
  );
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [zoneSalesPersons, setZoneSalesPersons] = useState([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 20,
  });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    quotationCode: initialValues.quotationCode,
    companyName: initialValues.companyName,
    followupStatus: initialValues.followupStatus,
  });
  const [debouncedFilters, setDebouncedFilters] = useState({
    quotationCode: initialValues.quotationCode,
    companyName: initialValues.companyName,
    followupStatus: initialValues.followupStatus,
  });
  const debounceTimer = useRef(null);

  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [remarkText, setRemarkText] = useState("");
  const [submittingRemark, setSubmittingRemark] = useState(false);

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
    const empty = { quotationCode: "", companyName: "", followupStatus: "" };
    setFilters(empty);
    clearTimeout(debounceTimer.current);
    setDebouncedFilters(empty);
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  useFilterLockPersist("quotation_followup", filtersLocked, {
    quotationCode: filters.quotationCode,
    companyName: filters.companyName,
    followupStatus: filters.followupStatus,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      quotationCode: filters.quotationCode,
      companyName: filters.companyName,
      followupStatus: filters.followupStatus,
    });
  };

  const loadData = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        const params = { pageNumber, pageSize: 20 };
        if (debouncedFilters.quotationCode)
          params.quotationCode = debouncedFilters.quotationCode;
        if (debouncedFilters.companyName)
          params.companyName = debouncedFilters.companyName;
        if (debouncedFilters.followupStatus)
          params.followupStatus = debouncedFilters.followupStatus;
        if (!isHodView) params.includeZoneSalesPersons = true;

        const res = await quotationFollowupService.list(params);
        const payload = res?.data?.data ?? res?.data ?? res;

        setRows(payload?.items || []);
        setZoneSalesPersons(payload?.zoneSalesPersons || []);
        setOverdueCount(payload?.overdueCount || 0);
        setPagination(
          payload?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            pageSize: 20,
          },
        );
      } catch (err) {
        toastError(err?.message || "Failed to load quotation follow-ups");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [debouncedFilters, isHodView],
  );

  useEffect(() => {
    loadData(page);
  }, [page, loadData]);

  const openRemarkModal = (row) => {
    setSelectedRow(row);
    setRemarkText("");
    setRemarkModalOpen(true);
  };

  const closeRemarkModal = () => {
    setRemarkModalOpen(false);
    setSelectedRow(null);
    setRemarkText("");
  };

  const openHistoryModal = (row) => {
    setSelectedRow(row);
    setHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setHistoryModalOpen(false);
    setSelectedRow(null);
  };

  const submitRemark = async () => {
    if (!selectedRow?._id) return;
    const trimmed = remarkText.trim();
    if (!trimmed) {
      toastError("Please enter a remark");
      return;
    }
    setSubmittingRemark(true);
    try {
      await quotationFollowupService.updateRemark(selectedRow._id, trimmed);
      toastSuccess("Follow-up remark saved");
      closeRemarkModal();
      loadData(page);
    } catch (err) {
      toastError(err?.message || "Failed to save remark");
    } finally {
      setSubmittingRemark(false);
    }
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="position-relative">
      {loading && <Loader />}

      {!isHodView && zoneSalesPersons.length > 0 && (
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center gap-2">
            <CIcon icon={cilUser} />
            <strong>Sales persons in your zone</strong>
          </CCardHeader>
          <CCardBody>
            <div className="d-flex flex-wrap gap-2">
              {zoneSalesPersons.map((person) => (
                <CBadge
                  key={person._id}
                  color="info"
                  className="py-2 px-3"
                  style={{ fontSize: "0.85rem" }}
                >
                  {person.name}
                  {person.phone ? ` · ${person.phone}` : ""}
                </CBadge>
              ))}
            </div>
          </CCardBody>
        </CCard>
      )}

      {isHodView && overdueCount > 0 && (
        <CRow className="mb-3">
          <CCol>
            <CBadge color="warning" className="py-2 px-3">
              {overdueCount} overdue follow-up{overdueCount !== 1 ? "s" : ""}
            </CBadge>
          </CCol>
        </CRow>
      )}

      <CCard>
        <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <strong>
            {isHodView ? "Follow-up Dashboard" : "Quotation Follow-up"}
          </strong>
          <CButton
            color="light"
            size="sm"
            onClick={() => loadData(page)}
            disabled={loading}
          >
            <CIcon icon={cilReload} className="me-1" />
            Refresh
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3 mb-4 align-items-end">
            <CCol xs={12} sm={6} md={4}>
              <CFormLabel>Quotation code</CFormLabel>
              <CFormInput
                value={filters.quotationCode}
                placeholder="Search code"
                onChange={(e) =>
                  onFilterChange("quotationCode", e.target.value)
                }
              />
            </CCol>
            <CCol xs={12} sm={6} md={4}>
              <CFormLabel>Company</CFormLabel>
              <CFormInput
                value={filters.companyName}
                placeholder="Search company"
                onChange={(e) => onFilterChange("companyName", e.target.value)}
              />
            </CCol>
            <CCol xs={12} sm={6} md={3}>
              <CFormLabel>Follow-up status</CFormLabel>
              <CFormSelect
                value={filters.followupStatus}
                onChange={(e) =>
                  onFilterChange("followupStatus", e.target.value)
                }
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="followed_up">Followed up</option>
                <option value="closed">Closed</option>
              </CFormSelect>
            </CCol>
            <CCol xs={12} sm={6} md={1} className="d-flex align-items-end">
              <FilterLockButton
                filtersLocked={filtersLocked}
                onToggle={handleToggleFiltersLock}
                pageLabel="Quotation Follow-up"
              />
            </CCol>
            <CCol xs={12} sm={6} md={1} className="d-flex align-items-end">
              {hasActiveFilters && (
                <CButton color="light" onClick={clearFilters}>
                  <CIcon icon={cilX} />
                </CButton>
              )}
            </CCol>
          </CRow>

          <div className="table-responsive">
            <CTable hover responsive bordered align="middle">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Quotation</CTableHeaderCell>
                  <CTableHeaderCell>Company</CTableHeaderCell>
                  <CTableHeaderCell>Zone</CTableHeaderCell>
                  <CTableHeaderCell>Sales person</CTableHeaderCell>
                  <CTableHeaderCell>Quotation status</CTableHeaderCell>
                  <CTableHeaderCell>Follow-up date</CTableHeaderCell>
                  <CTableHeaderCell>Follow-up status</CTableHeaderCell>
                  <CTableHeaderCell>Remark</CTableHeaderCell>
                  <CTableHeaderCell>History</CTableHeaderCell>
                  <CTableHeaderCell>Action</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={10} className="text-center py-4">
                      No follow-ups found
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  rows.map((row) => {
                    const followupCount = resolveFollowupCount(row);
                    const overdue = isOverdue(row.followup_date, row);
                    const rowStyle =
                      isHodView && overdue
                        ? { backgroundColor: "#ffe8cc" }
                        : undefined;

                    return (
                      <CTableRow key={row._id} style={rowStyle}>
                        <CTableDataCell>
                          {row.quotationId ? (
                            <Link to={`/quotations/${row.quotationId}`}>
                              {row.quotationCode || "—"}
                            </Link>
                          ) : (
                            row.quotationCode || "—"
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {row.companyName || row.industry_id?.name || "—"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {row.zoneId?.name || "—"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {row.salesEmployeeId?.name || "—"}
                        </CTableDataCell>
                        <CTableDataCell>{row.status || "—"}</CTableDataCell>
                        <CTableDataCell>
                          {dateFormatter(row.followup_date, "—")}
                          {overdue && (
                            <CBadge color="warning" className="ms-2">
                              Overdue
                            </CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={followupStatusColor(row)}>
                            {followupStatusLabel(row)}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell style={{ maxWidth: 220 }}>
                          {row.remark || "—"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {followupCount > 0 ? (
                            <CButton
                              color="info"
                              size="sm"
                              variant="ghost"
                              onClick={() => openHistoryModal(row)}
                            >
                              <CIcon icon={cilHistory} className="me-1" />
                              View ({followupCount})
                            </CButton>
                          ) : (
                            "—"
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="primary"
                            size="sm"
                            variant="outline"
                            onClick={() => openRemarkModal(row)}
                          >
                            <CIcon icon={cilCommentSquare} className="me-1" />
                            Remark
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    );
                  })
                )}
              </CTableBody>
            </CTable>
          </div>

          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            wrapperClassName="d-flex justify-content-center mt-4"
            align="center"
          />
        </CCardBody>
      </CCard>

      <CModal visible={remarkModalOpen} onClose={closeRemarkModal}>
        <CModalHeader>
          <CModalTitle>
            Follow-up #{resolveFollowupCount(selectedRow || {}) + 1}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedRow && (
            <>
              <p className="text-body-secondary small mb-2">
                Quotation: <strong>{selectedRow.quotationCode}</strong>
              </p>
              {selectedRow.remark ? (
                <p className="text-body-secondary small mb-3">
                  Latest remark: <em>{selectedRow.remark}</em>
                </p>
              ) : null}
            </>
          )}
          <CFormTextarea
            rows={4}
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Enter remark for this follow-up"
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeRemarkModal}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={submitRemark}
            disabled={submittingRemark}
          >
            {submittingRemark ? "Saving..." : "Save follow-up"}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={historyModalOpen} onClose={closeHistoryModal} size="lg">
        <CModalHeader>
          <CModalTitle>Follow-up history</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedRow && (
            <p className="text-body-secondary small mb-3">
              Quotation: <strong>{selectedRow.quotationCode}</strong>
              {selectedRow.companyName ? (
                <> · {selectedRow.companyName}</>
              ) : null}
            </p>
          )}
          {sortHistoryNewestFirst(selectedRow?.followupHistory || []).length ===
          0 ? (
            <p className="text-center text-body-secondary py-3">
              No follow-up history yet
            </p>
          ) : (
            <div className="table-responsive">
              <CTable hover bordered align="middle" className="mb-0">
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>#</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>By</CTableHeaderCell>
                    <CTableHeaderCell>Remark</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {sortHistoryNewestFirst(
                    selectedRow?.followupHistory || [],
                  ).map((entry) => (
                    <CTableRow key={entry._id || entry.sequence}>
                      <CTableDataCell>
                        <CBadge color="success">
                          Followed up {entry.sequence}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        {dateTimeFormatter(entry.followedUpAt, "—")}
                      </CTableDataCell>
                      <CTableDataCell>
                        {entry.followedUpBy?.name || "—"}
                      </CTableDataCell>
                      <CTableDataCell>{entry.remark || "—"}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeHistoryModal}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default QuotationFollowupDashboard;
