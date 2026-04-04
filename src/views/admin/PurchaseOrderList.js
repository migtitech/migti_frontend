import React, { useEffect, useRef, useState } from "react";
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
  CSpinner,
  CPagination,
  CPaginationItem,
} from "@coreui/react";
import { EyeIcon } from "../../components";
import purchaseOrderService from "../../services/purchaseOrderService";
import Filtered from "../../filtered/Filtered";
import { Loader } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";

const mapPo = (row) => (row ? { ...row, id: row._id ?? row.id } : null);

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

const PurchaseOrderList = () => {
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

  const fetchRows = async () => {
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
      const list = (result?.purchaseOrders || []).map(mapPo);
      setRows(list);
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
      toastError(err?.message || "Failed to load purchase orders");
      setRows([]);
      setPagination(null);
    } finally {
      if (latestFetchIdRef.current === fetchId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRows();
  }, [pageNumber, pageSize, searchDebounced, statusFilter]);

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
        return <CBadge color="secondary">{status || "Draft"}</CBadge>;
    }
  };

  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? pageNumber;
  const totalItems = pagination?.totalItems ?? rows.length;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <CRow style={{ zoom: "0.8" }}>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Purchase orders</strong>
            <div className="small text-body-secondary">
              Created from quotations; same line items and totals as the source
              quote.
            </div>
          </CCardHeader>

          <CCardBody>
            <CRow className="mb-3 g-2 align-items-end">
              <CCol xs={12} sm={6} md={6} lg={4}>
                <label className="form-label small text-body-secondary mb-1">
                  Search
                </label>
                <Filtered
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />
              </CCol>
              <CCol xs={12} sm={6} md={6} lg={4}>
                <label className="form-label small text-body-secondary mb-1">
                  Status
                </label>
                <CFormSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-100"
                  aria-label="Filter by status"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} sm={6} md={6} lg={2}>
                <label className="form-label small text-body-secondary mb-1">
                  Rows per page
                </label>
                <CFormSelect
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
                </CFormSelect>
              </CCol>
            </CRow>
            {loading && <Loader />}
            <CTable hover responsive bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>S No</CTableHeaderCell>
                  <CTableHeaderCell>PO No.</CTableHeaderCell>
                  <CTableHeaderCell>Quotation</CTableHeaderCell>
                  <CTableHeaderCell>Company</CTableHeaderCell>
                  <CTableHeaderCell>Products / Items</CTableHeaderCell>
                  <CTableHeaderCell>Total amount</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {rows && rows.length > 0 ? (
                  rows.map((po, index) => {
                    const qCode =
                      typeof po.quotationId === "object" &&
                      po.quotationId?.quotationCode
                        ? po.quotationId.quotationCode
                        : "–";
                    return (
                      <CTableRow
                        key={po.id}
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <CTableDataCell>
                          {(currentPage - 1) * pageSize + index + 1}
                        </CTableDataCell>
                        <CTableDataCell>
                          <strong>
                            {po.poCode || `PO-${String(po.id).slice(-6)}`}
                          </strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <small>{qCode}</small>
                        </CTableDataCell>
                        <CTableDataCell>
                          <strong>{po.companyInfo?.name || "–"}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <small>
                            {Array.isArray(po.products) &&
                            po.products.length > 0
                              ? `${po.products.length} product(s)`
                              : "–"}
                          </small>
                        </CTableDataCell>
                        <CTableDataCell>
                          ₹{po.totalAmount?.toLocaleString() || "0"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {getStatusBadge(po.status)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {po.createdAt
                            ? new Date(po.createdAt).toLocaleDateString()
                            : "–"}
                        </CTableDataCell>
                        <CTableDataCell onClick={(e) => e.stopPropagation()}>
                          <CButton
                            color="info"
                            variant="ghost"
                            size="sm"
                            title="View"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/purchase-orders/${po.id}`);
                            }}
                          >
                            <EyeIcon />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    );
                  })
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={9} className="text-center">
                      {!loading &&
                        (rows?.length === 0
                          ? "No purchase orders yet. Open a quotation and use “Create purchase order”."
                          : "No purchase orders match your search.")}
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
            {totalPages > 1 && (
              <>
                <div className="small text-body-secondary text-center mt-2">
                  Showing {startItem}-{endItem} of {totalItems}
                </div>
                <CPagination className="mt-2 justify-content-center">
                  <CPaginationItem
                    disabled={loading || currentPage <= 1}
                    onClick={() => setPageNumber(1)}
                  >
                    First
                  </CPaginationItem>
                  <CPaginationItem
                    disabled={loading || currentPage <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </CPaginationItem>
                  <CPaginationItem active>
                    {loading ? (
                      <CSpinner size="sm" />
                    ) : (
                      `${currentPage} / ${totalPages}`
                    )}
                  </CPaginationItem>
                  <CPaginationItem
                    disabled={loading || currentPage >= totalPages}
                    onClick={() =>
                      setPageNumber((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </CPaginationItem>
                  <CPaginationItem
                    disabled={loading || currentPage >= totalPages}
                    onClick={() => setPageNumber(totalPages)}
                  >
                    Last
                  </CPaginationItem>
                </CPagination>
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default PurchaseOrderList;
