import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CPagination,
  CPaginationItem,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBasket } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBucketService from "../../services/purchaseBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { Loader } from "../../components";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "payment_request_raised", label: "Payment request raised" },
  { value: "finance_approved", label: "Finance approved" },
  { value: "purchased", label: "Purchased" },
];

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const cellText = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "—";
    }
  }
  return String(v);
};

/** Matches list API `status` (see purchaseBucket.service list pipeline). */
const purchaseBucketStatusBadge = (raw) => {
  const s =
    raw != null && String(raw).trim() !== "" ? String(raw).trim() : "pending";
  switch (s) {
    case "purchased":
      return <CBadge color="success">Purchased</CBadge>;
    case "finance_approved":
      return <CBadge color="dark">Finance approved</CBadge>;
    case "payment_request_raised":
      return <CBadge color="info">Payment request raised</CBadge>;
    case "billing_request_rejected":
      return <CBadge color="danger">Billing request rejected</CBadge>;
    case "inventory_received":
      return <CBadge color="primary">Inventory received</CBadge>;
    case "ready_for_dispatchment":
      return <CBadge color="success">Ready for dispatch</CBadge>;
    case "delivered":
      return <CBadge color="success">Delivered</CBadge>;
    case "po_closed":
      return <CBadge color="secondary">PO closed</CBadge>;
    case "pending":
      return <CBadge color="warning">Open</CBadge>;
    default:
      return <CBadge color="secondary">{s}</CBadge>;
  }
};

const parseListResponse = (res) => {
  if (!res || typeof res !== "object") {
    return {
      list: [],
      total: 0,
      pendingCount: 0,
      page: 1,
      pageSize: 20,
    };
  }
  const block = res.data;
  if (!block || typeof block !== "object") {
    return {
      list: [],
      total: 0,
      pendingCount: 0,
      page: 1,
      pageSize: 20,
    };
  }
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    pendingCount: block.pendingCount ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const PurchaseBucketList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState("open");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, status, from, to]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: status.trim() ? status.trim() : undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
      setPendingCount(p.pendingCount);
    } catch (e) {
      toastError(e?.message || "Failed to load Purchase Bucket");
      setRows([]);
      setTotal(0);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, searchDebounced, status, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <CBreadcrumb className="mb-0">
              <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
              <CBreadcrumbItem active>Purchase Bucket</CBreadcrumbItem>
            </CBreadcrumb>
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader className="d-flex flex-wrap align-items-center gap-2">
            <CIcon icon={cilBasket} className="text-primary" />
            <strong>Purchase Bucket</strong>
            {pendingCount > 0 && (
              <CBadge color="warning" className="ms-1">
                {pendingCount} open
              </CBadge>
            )}
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              <CCol xs={12} md={4}>
                <CFormLabel>Search</CFormLabel>
                <CFormInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Product or PO code"
                />
              </CCol>
              <CCol xs={6} md={2}>
                <CFormLabel>From</CFormLabel>
                <CFormInput
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </CCol>
              <CCol xs={6} md={2}>
                <CFormLabel>To</CFormLabel>
                <CFormInput
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </CCol>
              <CCol xs={6} md={2}>
                <CFormLabel>Status</CFormLabel>
                <CFormSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            {loading ? (
              <Loader />
            ) : (
              <>
                <p className="small text-body-secondary mb-2 d-none d-md-block">
                  Click a row to open line details.
                </p>
                <p className="small text-body-secondary mb-2 d-md-none">
                  Tap a card to open line details.
                </p>
                {rows.length === 0 ? (
                  <div className="text-body-secondary">
                    No PO lines in your groups.
                  </div>
                ) : (
                  <>
                    <div className="table-responsive d-none d-md-block">
                      <CTable
                        hover
                        bordered
                        striped
                        align="middle"
                        className="mb-0 small"
                      >
                        <CTableHead className="table-light">
                          <CTableRow>
                            <CTableHeaderCell>PO code</CTableHeaderCell>
                            <CTableHeaderCell>Product name</CTableHeaderCell>
                            <CTableHeaderCell className="text-nowrap">
                              Qty
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-nowrap">
                              Dispatchment date
                            </CTableHeaderCell>
                            <CTableHeaderCell className="text-nowrap">
                              Status
                            </CTableHeaderCell>
                            <CTableHeaderCell>Unit</CTableHeaderCell>
                            <CTableHeaderCell className="text-nowrap">
                              HSN number
                            </CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {rows.map((row, idx) => (
                            <CTableRow
                              key={row._id || idx}
                              role="button"
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                navigate(`/purchase-bucket/${row._id}`)
                              }
                            >
                              <CTableDataCell className="text-nowrap">
                                {cellText(row.poCode)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {cellText(row.productName)}
                              </CTableDataCell>
                              <CTableDataCell className="text-nowrap">
                                {cellText(row.quantity)}
                              </CTableDataCell>
                              <CTableDataCell className="text-nowrap">
                                {formatDateDdMmYyyy(row.dispatchmentDate)}
                              </CTableDataCell>
                              <CTableDataCell className="text-nowrap">
                                {purchaseBucketStatusBadge(row.status)}
                              </CTableDataCell>
                              <CTableDataCell className="text-nowrap">
                                {cellText(row.unit)}
                              </CTableDataCell>
                              <CTableDataCell className="text-nowrap">
                                {cellText(row.hsnNumber)}
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </div>

                    <CRow className="g-3 d-md-none">
                      {rows.map((row, idx) => (
                        <CCol xs={12} key={row._id || idx}>
                          <CCard
                            className="shadow-sm border h-100"
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              navigate(`/purchase-bucket/${row._id}`)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(`/purchase-bucket/${row._id}`);
                              }
                            }}
                          >
                            <CCardBody className="py-3">
                              <div className="fw-semibold text-primary mb-3">
                                {cellText(row.poCode)}
                              </div>
                              <dl className="row mb-0 small g-2">
                                <dt className="col-5 text-body-secondary">
                                  Product
                                </dt>
                                <dd className="col-7 mb-2 text-break">
                                  {cellText(row.productName)}
                                </dd>
                                <dt className="col-5 text-body-secondary">
                                  Qty
                                </dt>
                                <dd className="col-7 mb-2">
                                  {cellText(row.quantity)}
                                </dd>
                                <dt className="col-5 text-body-secondary">
                                  Dispatchment
                                </dt>
                                <dd className="col-7 mb-2">
                                  {formatDateDdMmYyyy(row.dispatchmentDate)}
                                </dd>
                                <dt className="col-5 text-body-secondary">
                                  Status
                                </dt>
                                <dd className="col-7 mb-2">
                                  {purchaseBucketStatusBadge(row.status)}
                                </dd>
                                <dt className="col-5 text-body-secondary">
                                  Unit
                                </dt>
                                <dd className="col-7 mb-2">
                                  {cellText(row.unit)}
                                </dd>
                                <dt className="col-5 text-body-secondary">
                                  HSN
                                </dt>
                                <dd className="col-7 mb-0">
                                  {cellText(row.hsnNumber)}
                                </dd>
                              </dl>
                            </CCardBody>
                          </CCard>
                        </CCol>
                      ))}
                    </CRow>
                  </>
                )}

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <CPagination
                      align="center"
                      aria-label="Purchase bucket pages"
                    >
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

export default PurchaseBucketList;
