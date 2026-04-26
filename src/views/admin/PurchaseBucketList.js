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

/** Uses API `status` only (list endpoint normalizes payment-raised into `status`). */
const statusFromRow = (row) => {
  const s = row?.status;
  if (s != null && String(s).trim() !== "") return String(s).trim();
  return "pending";
};

const lineStatusBadge = (s) => {
  switch (s) {
    case "purchased":
      return <CBadge color="success">Purchased</CBadge>;
    case "finance_approved":
      return <CBadge color="dark">Finance approved</CBadge>;
    case "payment_request_raised":
      return <CBadge color="info">Payment request raised</CBadge>;
    case "inventory_received":
      return <CBadge color="primary">Inventory received</CBadge>;
    case "ready_for_dispatchment":
      return <CBadge color="success">Ready for dispatch</CBadge>;
    case "pending":
    default:
      return (
        <CBadge color="warning">
          {s && s !== "pending" ? s : "Pending"}
        </CBadge>
      );
  }
};

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
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
                <CFormLabel>Status</CFormLabel>
                <CFormSelect value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </CFormSelect>
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
                <CFormInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </CCol>
            </CRow>

            {loading ? (
              <Loader />
            ) : (
              <>
                <CRow className="g-3">
                  {rows.length === 0 ? (
                    <CCol xs={12} className="text-body-secondary">
                      No PO lines in your groups.
                    </CCol>
                  ) : (
                    rows.map((row) => (
                      <CCol key={row._id} xs={12} sm={6} lg={4}>
                        <CCard
                          className="h-100 shadow-sm cursor-pointer border"
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/purchase-bucket/${row._id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate(`/purchase-bucket/${row._id}`);
                            }
                          }}
                        >
                          <CCardBody className="d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                              <strong className="text-break">{row.productName || "—"}</strong>
                              {lineStatusBadge(statusFromRow(row))}
                            </div>
                            <div className="text-body-secondary small mb-1">
                              PO: <span className="text-dark">{row.poCode || "—"}</span>
                            </div>
                            <div className="text-body-secondary small mb-1">
                              Company:{" "}
                              <span className="text-dark">
                                {row.companyInfo?.name || "—"}
                              </span>
                            </div>
                            <div className="mt-auto pt-2 small">
                              <span className="text-body-secondary">Dispatch: </span>
                              <strong>{formatDateDdMmYyyy(row.dispatchmentDate)}</strong>
                            </div>
                            <div className="small text-body-secondary mt-1">
                              Qty: {row.quantity ?? "—"} {row.unit || ""}
                            </div>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    ))
                  )}
                </CRow>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <CPagination align="center" aria-label="Purchase bucket pages">
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
                        style={{ cursor: page >= totalPages ? "default" : "pointer" }}
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
