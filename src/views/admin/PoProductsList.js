import React, { useEffect, useState, useCallback } from "react";
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
  CPagination,
  CPaginationItem,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilSearch, cilList, cilPlus } from "@coreui/icons";
import { poProductsBucketService } from "../../services/deliveryApprovalService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { Loader, EyeIcon } from "../../components";

const DELIVERY_SUB_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "hod_approval_pending", label: "HOD Approval Pending" },
  { value: "delivery_approved_by_hod", label: "Delivery Approved by HOD" },
];

const LINE_STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "hod_approval_pending", label: "HOD Approval Pending" },
  { value: "pending", label: "Pending" },
  { value: "purchased", label: "Purchased" },
  { value: "inventory_received", label: "Inventory Received" },
  { value: "ready_for_dispatchment", label: "Ready for Dispatchment" },
  { value: "delivered", label: "Delivered" },
  { value: "finance_approved", label: "Finance Approved" },
  { value: "po_closed", label: "PO Closed" },
];

const deliverySubStatusBadge = (s) => {
  switch (s) {
    case "hod_approval_pending":
      return <CBadge color="danger">HOD Approval Pending</CBadge>;
    case "delivery_approved_by_hod":
      return <CBadge color="success">Approved by HOD</CBadge>;
    default:
      return s ? (
        <CBadge color="secondary">{s.replace(/_/g, " ")}</CBadge>
      ) : (
        <span className="text-body-secondary small">—</span>
      );
  }
};

const lineStatusBadge = (s) => {
  if (s === "hod_approval_pending")
    return <CBadge color="danger">HOD Approval Pending</CBadge>;
  const map = {
    pending: "warning",
    purchased: "info",
    inventory_received: "primary",
    ready_for_dispatchment: "primary",
    delivered: "success",
    finance_approved: "success",
    po_closed: "dark",
    payment_request_raised: "info",
    billing_request_rejected: "danger",
  };
  const label = s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
  return <CBadge color={map[s] || "secondary"}>{label}</CBadge>;
};

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object") return { list: [], total: 0, page: 1, pageSize: 20 };
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const PoProductsList = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterDeliverySubStatus, setFilterDeliverySubStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, filterDeliverySubStatus, from, to]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        poProductsBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          deliverySubStatus: filterDeliverySubStatus,
          from: from || undefined,
          to: to || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
    } catch (e) {
      toastError(e?.message || "Failed to load PO products");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, filterDeliverySubStatus, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleClear = () => {
    setSearch("");
    setFilterDeliverySubStatus("all");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilList} className="text-primary" />
              <strong>PO Products</strong>
            </div>
            <span className="small text-body-secondary">
              Total: <strong>{total}</strong>
            </span>
          </CCardHeader>

          <CCardBody>
            {/* Filters */}
            <CRow className="g-3 mb-3">
              <CCol xs={12} md={4} lg={3}>
                <CFormLabel className="mb-1">Search</CFormLabel>
                <div className="position-relative">
                  <CFormInput
                    placeholder="Product name, PO code, raw code…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <CIcon
                    icon={cilSearch}
                    className="position-absolute"
                    style={{ right: 10, top: 10, opacity: 0.4 }}
                    size="sm"
                  />
                </div>
              </CCol>

              <CCol xs={6} sm={4} md={3} lg={2}>
                <CFormLabel className="mb-1">Delivery Status</CFormLabel>
                <CFormSelect
                  value={filterDeliverySubStatus}
                  onChange={(e) => setFilterDeliverySubStatus(e.target.value)}
                >
                  {DELIVERY_SUB_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xs={6} sm={4} md={2} lg={2}>
                <CFormLabel className="mb-1">From</CFormLabel>
                <CFormInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </CCol>

              <CCol xs={6} sm={4} md={2} lg={2}>
                <CFormLabel className="mb-1">To</CFormLabel>
                <CFormInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </CCol>

              <CCol xs={6} sm={4} md={2} lg={1} className="d-flex align-items-end">
                <CButton color="secondary" variant="outline" onClick={handleClear}>
                  Clear
                </CButton>
              </CCol>

              <CCol xs={6} sm={4} md={2} lg={2} className="d-flex align-items-end">
                <CButton
                  color="primary"
                  onClick={() => navigate("/po-products/add")}
                >
                  <CIcon icon={cilPlus} className="me-1" />
                  Add Product
                </CButton>
              </CCol>
            </CRow>

            {loading ? (
              <Loader />
            ) : (
              <>
                <div className="table-responsive">
                  <CTable hover bordered className="mb-0" align="middle">
                    <CTableHead color="light">
                      <CTableRow>
                        <CTableHeaderCell style={{ width: 50 }}>S.No</CTableHeaderCell>
                        <CTableHeaderCell style={{ minWidth: 190 }}>Product Name</CTableHeaderCell>
                        <CTableHeaderCell style={{ minWidth: 120 }}>PO Code</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: 70 }}>Unit</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: 70 }}>Qty</CTableHeaderCell>
                        <CTableHeaderCell style={{ minWidth: 160 }}>Company</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: 110 }}>Dispatch Date</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 120 }}>Status</CTableHeaderCell>
                        <CTableHeaderCell style={{ width: 60 }}>Action</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>

                    <CTableBody>
                      {rows.length === 0 ? (
                        <CTableRow>
                            <CTableDataCell
                            colSpan={9}
                            className="text-center text-body-secondary py-4"
                          >
                            No PO products found.
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        rows.map((row, idx) => (
                          <CTableRow key={row._id || row.id}>
                            <CTableDataCell className="text-center fw-semibold text-body-secondary">
                              {(page - 1) * pageSize + idx + 1}
                            </CTableDataCell>

                            <CTableDataCell>
                              <div className="fw-semibold">{row.productName || "—"}</div>
                              {row.rawProductCode && (
                                <div className="small font-monospace text-body-secondary">
                                  {row.rawProductCode}
                                </div>
                              )}
                              {row.hsnNumber && (
                                <div className="small text-body-secondary">
                                  HSN: <span className="fw-medium">{row.hsnNumber}</span>
                                </div>
                              )}
                            </CTableDataCell>

                            <CTableDataCell>
                              <span className="badge bg-dark font-monospace">
                                {row.poCode || "—"}
                              </span>
                            </CTableDataCell>

                            <CTableDataCell className="text-center">
                              {row.unit || "—"}
                            </CTableDataCell>

                            <CTableDataCell className="text-center fw-semibold">
                              {row.quantity ?? "—"}
                            </CTableDataCell>

                            <CTableDataCell>
                              <div className="small">
                                {row.companyInfo?.name || "—"}
                                {row.companyInfo?.area && (
                                  <div className="text-body-secondary">{row.companyInfo.area}</div>
                                )}
                              </div>
                            </CTableDataCell>

                            <CTableDataCell className="text-center">
                              {formatDateDdMmYyyy(row.dispatchmentDate)}
                            </CTableDataCell>

                            <CTableDataCell>{lineStatusBadge(row.status)}</CTableDataCell>

                            <CTableDataCell className="text-center">
                              <CButton
                                color="info"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(`/po-products/${row._id || row.id}`)
                                }
                                title="View / Edit"
                              >
                                <EyeIcon />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>
                </div>

                {total > pageSize && (
                  <div className="d-flex flex-column align-items-center mt-3 gap-2">
                    <span className="small text-body-secondary">
                      Showing {Math.min((page - 1) * pageSize + 1, total)}–
                      {Math.min(page * pageSize, total)} of {total}
                    </span>
                    <CPagination align="center" className="mb-0" aria-label="PO Products pages">
                      <CPaginationItem
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </CPaginationItem>
                      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                        let p;
                        if (totalPages <= 7) p = i + 1;
                        else if (page <= 4) p = i + 1;
                        else if (page >= totalPages - 3) p = totalPages - 6 + i;
                        else p = page - 3 + i;
                        return (
                          <CPaginationItem key={p} active={p === page} onClick={() => setPage(p)}>
                            {p}
                          </CPaginationItem>
                        );
                      })}
                      <CPaginationItem
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

export default PoProductsList;
