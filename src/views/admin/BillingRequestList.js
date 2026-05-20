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
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilMoney } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import billingRequestBatchService from "../../services/billingRequestBatchService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { Loader } from "../../components";

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

const BillingRequestList = ({
  basePath = "/billing-requests",
  pageTitle = "Billing Requests",
}) => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterPoCode, setFilterPoCode] = useState("");
  const [filterPoCodeDebounced, setFilterPoCodeDebounced] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilterPoCodeDebounced(filterPoCode), 400);
    return () => clearTimeout(t);
  }, [filterPoCode]);

  useEffect(() => {
    setPage(1);
  }, [filterPoCodeDebounced, filterStatus, from, to]);

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
  }, [page, pageSize, filterPoCodeDebounced, filterStatus, from, to]);

  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <CRow>
      <CCol xs={12}>
        <CBreadcrumb className="mb-2">
          <CBreadcrumbItem href="#/dashboard">Home</CBreadcrumbItem>
          <CBreadcrumbItem active>{pageTitle}</CBreadcrumbItem>
        </CBreadcrumb>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between">
            <span>
              <CIcon icon={cilMoney} className="me-2" />
              {pageTitle}
            </span>
            {pagination.totalItems > 0 && (
              <span className="text-body-secondary small">
                {pagination.totalItems} total
              </span>
            )}
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              <CCol md={3}>
                <CFormLabel>PO Code</CFormLabel>
                <CFormInput
                  placeholder="Search by PO code"
                  value={filterPoCode}
                  onChange={(e) => setFilterPoCode(e.target.value)}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Status</CFormLabel>
                <CFormSelect
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="hod_approval_pending">Pending</option>
                  <option value="hod_approved">Approved</option>
                  <option value="hod_rejected">Rejected</option>
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>From date</CFormLabel>
                <CFormInput
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>To date</CFormLabel>
                <CFormInput
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </CCol>
              {(filterPoCode || filterStatus || from || to) && (
                <CCol md="auto" className="d-flex align-items-end">
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="ghost"
                    onClick={() => {
                      setFilterPoCode("");
                      setFilterStatus("");
                      setFrom("");
                      setTo("");
                    }}
                  >
                    Clear
                  </CButton>
                </CCol>
              )}
            </CRow>

            {loading ? (
              <div className="text-center py-5">
                <Loader />
              </div>
            ) : (
              <>
                <CTable align="middle" responsive hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">BR Code</CTableHeaderCell>
                      <CTableHeaderCell scope="col">PO Code</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Products</CTableHeaderCell>
                      <CTableHeaderCell scope="col">
                        Total Amount
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Raised by</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Date</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Action
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rows.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell
                          colSpan={8}
                          className="text-center text-body-secondary"
                        >
                          No billing requests found.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      rows.map((r) => {
                        const products = Array.isArray(r.products)
                          ? r.products
                          : [];
                        const createdByName =
                          r.createdBySnapshot?.name ||
                          r.createdBySnapshot?.fullName ||
                          "—";
                        return (
                          <CTableRow key={r._id}>
                            <CTableDataCell>
                              <code>{r.billingRequestCode || "—"}</code>
                            </CTableDataCell>
                            <CTableDataCell>
                              <code>{r.poCode || "—"}</code>
                            </CTableDataCell>
                            <CTableDataCell>{products.length}</CTableDataCell>
                            <CTableDataCell>
                              {fmtAmount(totalAmount(products))}
                            </CTableDataCell>
                            <CTableDataCell>
                              <StatusBadge status={r.status} />
                            </CTableDataCell>
                            <CTableDataCell>{createdByName}</CTableDataCell>
                            <CTableDataCell>
                              {fmtDate(r.createdAt)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CButton
                                size="sm"
                                color="primary"
                                variant="outline"
                                onClick={() =>
                                  navigate(`${basePath}/${r._id}`)
                                }
                              >
                                View
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        );
                      })
                    )}
                  </CTableBody>
                </CTable>
                {pagination.totalItems > 0 && (
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
                    <span className="text-body-secondary small">
                      {pagination.totalItems} total
                    </span>
                    <CPagination className="mb-0">
                      <CPaginationItem
                        disabled={page <= 1}
                        onClick={() => page > 1 && setPage(page - 1)}
                        style={{ cursor: page <= 1 ? "default" : "pointer" }}
                      >
                        Prev
                      </CPaginationItem>
                      <CPaginationItem active>{page}</CPaginationItem>
                      <CPaginationItem
                        disabled={page >= totalPages}
                        onClick={() => page < totalPages && setPage(page + 1)}
                        style={{
                          cursor: page >= totalPages ? "default" : "pointer",
                        }}
                      >
                        Next
                      </CPaginationItem>
                    </CPagination>
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default BillingRequestList;
