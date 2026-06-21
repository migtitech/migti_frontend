import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilMoney, cilUser, cilCalendar } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { Loader, TablePagination, FilterLockButton } from "../../components";
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
  hod_approval_pending: { label: "Pending", color: "warning" },
  hod_approved: { label: "Approved", color: "success" },
  hod_rejected: { label: "Rejected", color: "danger" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[String(status || "").toLowerCase()] || {
    label: status || "—",
    color: "secondary",
  };
  return <CBadge color={s.color}>{s.label}</CBadge>;
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
    <CRow>
      <CCol xs={12}>
        <CBreadcrumb className="mb-2">
          <CBreadcrumbItem href="#/dashboard">Home</CBreadcrumbItem>
          <CBreadcrumbItem active>Batch Billing Requests</CBreadcrumbItem>
        </CBreadcrumb>

        {/* Filters */}
        <CCard className="mb-3">
          <CCardBody className="py-3">
            <CRow className="g-3 align-items-end">
              <CCol md={3}>
                <CFormLabel className="mb-1 small fw-semibold">
                  Sales Order Code
                </CFormLabel>
                <CFormInput
                  size="sm"
                  placeholder="Search by Sales Order code"
                  value={filterPoCode}
                  onChange={(e) => setFilterPoCode(e.target.value)}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel className="mb-1 small fw-semibold">
                  Status
                </CFormLabel>
                <CFormSelect
                  size="sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="hod_approval_pending">Pending</option>
                  <option value="hod_approved">Approved</option>
                  <option value="hod_rejected">Rejected</option>
                </CFormSelect>
              </CCol>
              <CCol md="auto" className="d-flex align-items-end">
                <FilterLockButton
                  filtersLocked={filtersLocked}
                  onToggle={handleToggleFiltersLock}
                  pageLabel="Batch Billing Requests"
                />
              </CCol>
              {(filterPoCode || filterStatus) && (
                <CCol md="auto">
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="ghost"
                    onClick={() => {
                      setFilterPoCode("");
                      setFilterStatus("");
                    }}
                  >
                    Clear
                  </CButton>
                </CCol>
              )}
            </CRow>
          </CCardBody>
        </CCard>

        {/* Cards */}
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between">
            <span className="fw-semibold">
              <CIcon icon={cilMoney} className="me-2" />
              Billing Requests
            </span>
            {pagination.totalItems > 0 && (
              <span className="text-body-secondary small">
                {pagination.totalItems} total
              </span>
            )}
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <div className="text-center py-5">
                <Loader />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-5 text-body-secondary">
                No billing requests found.
              </div>
            ) : (
              <>
                <CRow className="g-3">
                  {rows.map((r) => {
                    const products = Array.isArray(r.products)
                      ? r.products
                      : [];
                    const total = totalAmount(products);
                    const createdByName =
                      r.createdBySnapshot?.name ||
                      r.createdBySnapshot?.fullName ||
                      "—";
                    const salesOrderLast4 = salesOrderCodesLast4Display(
                      r.poCode,
                    );
                    return (
                      <CCol key={r._id} xs={12} md={6} xl={4}>
                        <div
                          className="border rounded p-3 h-100 d-flex flex-column gap-2"
                          style={{
                            cursor: "pointer",
                            transition: "box-shadow 0.15s",
                          }}
                          onClick={() =>
                            navigate(`/batch-billing-requests/${r._id}`)
                          }
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.boxShadow =
                              "0 2px 12px rgba(0,0,0,0.12)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.boxShadow = "none")
                          }
                        >
                          {/* Header row */}
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <div>
                              <div
                                className="fw-semibold text-truncate"
                                style={{ maxWidth: 180 }}
                              >
                                {r.billingRequestCode || "—"}
                              </div>
                              {salesOrderLast4 && (
                                <div className="small text-body-secondary">
                                  Sales Order:{" "}
                                  <code className="small">
                                    {salesOrderLast4}
                                  </code>
                                </div>
                              )}
                            </div>
                            <StatusBadge status={r.status} />
                          </div>

                          {/* Stats row */}
                          <div className="d-flex gap-3 flex-wrap">
                            <div className="text-center">
                              <div className="fw-bold fs-5 lh-1">
                                {products.length}
                              </div>
                              <div
                                className="text-body-secondary"
                                style={{ fontSize: "0.72rem" }}
                              >
                                Products
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="fw-bold fs-5 lh-1">
                                ₹{fmtAmount(total)}
                              </div>
                              <div
                                className="text-body-secondary"
                                style={{ fontSize: "0.72rem" }}
                              >
                                Total Amount
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="d-flex align-items-center gap-2 flex-wrap mt-auto">
                            <span
                              className="d-flex align-items-center gap-1 text-body-secondary"
                              style={{ fontSize: "0.78rem" }}
                            >
                              <CIcon icon={cilUser} size="sm" />
                              {createdByName}
                            </span>
                            <span
                              className="d-flex align-items-center gap-1 text-body-secondary ms-auto"
                              style={{ fontSize: "0.78rem" }}
                            >
                              <CIcon icon={cilCalendar} size="sm" />
                              {dateFormatter(r.createdAt, "—")}
                            </span>
                          </div>

                          {r.statusRemark && (
                            <div
                              className="text-body-secondary border-top pt-2 mt-1"
                              style={{ fontSize: "0.78rem" }}
                            >
                              <span className="fw-medium">Remark:</span>{" "}
                              {r.statusRemark}
                            </div>
                          )}
                        </div>
                      </CCol>
                    );
                  })}
                </CRow>

                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  wrapperClassName="d-flex align-items-center justify-content-end mt-4"
                />
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default BatchBillingRequests;
