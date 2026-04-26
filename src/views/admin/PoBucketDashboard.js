import React, { useEffect, useRef, useState } from "react";
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
import { EyeIcon } from "../../components";
import purchaseOrderService from "../../services/purchaseOrderService";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const formatInrAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getStatusBadge = (status) => {
  switch (status) {
    case "draft":
      return <CBadge color="secondary">Draft</CBadge>;
    case "confirmed":
      return <CBadge color="info">Confirmed</CBadge>;
    case "fulfilled":
      return <CBadge color="success">Fulfilled</CBadge>;
    case "cancelled":
      return <CBadge color="danger">Cancelled</CBadge>;
    default:
      return <CBadge color="secondary">{status || "-"}</CBadge>;
  }
};

const PoBucketDashboard = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const latestFetchIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchDebounced, statusFilter]);

  useEffect(() => {
    const fetchData = async () => {
      const fetchId = Date.now();
      latestFetchIdRef.current = fetchId;
      setLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          purchaseOrderService.getAll({
            pageNumber,
            pageSize,
            search: searchDebounced.trim() || undefined,
            status: statusFilter || undefined,
          }),
        );
        const data = res?.data || res;
        const result = data?.data ?? data;
        if (latestFetchIdRef.current !== fetchId) return;
        setRows(result?.purchaseOrders || []);
        setPagination(result?.pagination || null);
      } catch (err) {
        if (latestFetchIdRef.current !== fetchId) return;
        toastError(err?.message || "Failed to load purchase orders");
        setRows([]);
        setPagination(null);
      } finally {
        if (latestFetchIdRef.current === fetchId) setLoading(false);
      }
    };
    fetchData();
  }, [pageNumber, pageSize, searchDebounced, statusFilter]);

  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? pageNumber;
  const totalItems = pagination?.totalItems ?? rows.length;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>PO Bucket</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3 g-2 align-items-end">
              <CCol xs={12} md={4}>
                <CFormLabel className="mb-1 small text-body-secondary">
                  Search
                </CFormLabel>
                <CFormInput
                  value={searchTerm}
                  placeholder="Search PO code, company, product"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel className="mb-1 small text-body-secondary">
                  Status
                </CFormLabel>
                <CFormSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={2}>
                <CFormLabel className="mb-1 small text-body-secondary">
                  Rows per page
                </CFormLabel>
                <CFormSelect
                  value={pageSize}
                  onChange={(e) => {
                    const next = Number(e.target.value) || 10;
                    setPageSize(next);
                    setPageNumber(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </CFormSelect>
              </CCol>
            </CRow>
            {loading && <Loader />}
            <CTable hover responsive bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>S No</CTableHeaderCell>
                  <CTableHeaderCell>PO Number</CTableHeaderCell>
                  <CTableHeaderCell>Company</CTableHeaderCell>
                  <CTableHeaderCell>Products</CTableHeaderCell>
                  <CTableHeaderCell>Total Amount</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.length > 0 ? (
                  rows.map((po, index) => (
                    <CTableRow
                      key={po._id || po.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/po-bucket/${po._id || po.id}`)}
                    >
                      <CTableDataCell>
                        {(currentPage - 1) * pageSize + index + 1}
                      </CTableDataCell>
                      <CTableDataCell>
                        <strong>{po.poCode || "-"}</strong>
                      </CTableDataCell>
                      <CTableDataCell>
                        {po.companyInfo?.name || "-"}
                      </CTableDataCell>
                      <CTableDataCell>
                        {Array.isArray(po.products) ? po.products.length : 0}{" "}
                        item(s)
                      </CTableDataCell>
                      <CTableDataCell>
                        ₹{formatInrAmount(po.totalAmount)}
                      </CTableDataCell>
                      <CTableDataCell>
                        {getStatusBadge(po.status)}
                      </CTableDataCell>
                      <CTableDataCell>
                        {po.createdAt ? formatDateDdMmYyyy(po.createdAt) : "-"}
                      </CTableDataCell>
                      <CTableDataCell onClick={(e) => e.stopPropagation()}>
                        <CButton
                          color="info"
                          variant="ghost"
                          size="sm"
                          title="View"
                          onClick={() =>
                            navigate(`/po-bucket/${po._id || po.id}`)
                          }
                        >
                          <EyeIcon />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={8} className="text-center">
                      {!loading && "No purchase orders found."}
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="small text-medium-emphasis">
                  Showing {startItem}-{endItem} of {totalItems}
                </div>
                <CPagination className="mb-0">
                  <CPaginationItem
                    disabled={loading || currentPage <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </CPaginationItem>
                  <CPaginationItem active>
                    {currentPage} / {totalPages}
                  </CPaginationItem>
                  <CPaginationItem
                    disabled={loading || currentPage >= totalPages}
                    onClick={() =>
                      setPageNumber((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default PoBucketDashboard;
