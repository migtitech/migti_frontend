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
  CPagination,
  CPaginationItem,
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBasket, cilSearch } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import proBucketService from "../../services/proBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { Loader } from "../../components";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "rate_submitted", label: "Rate submitted" },
  { value: "fulfilled", label: "Fulfilled" },
];

const statusBadge = (s) => {
  switch (s) {
    case "pending":
      return <CBadge color="warning">Pending</CBadge>;
    case "rate_submitted":
      return <CBadge color="info">Rate submitted</CBadge>;
    case "fulfilled":
      return <CBadge color="success">Fulfilled</CBadge>;
    default:
      return <CBadge color="secondary">{s || "—"}</CBadge>;
  }
};

/** Elapsed time since `createdAt` as dd:hh:mm:ss (days, hours, minutes, seconds). */
const formatDurationSinceCreated = (d) => {
  const t = d ? new Date(d).getTime() : NaN;
  if (Number.isNaN(t)) return "—";
  let sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 0) sec = 0;
  const days = Math.floor(sec / 86400);
  sec %= 86400;
  const h = Math.floor(sec / 3600);
  sec %= 3600;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return [days, h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
};

/** API: { success, data: { data, total, pendingCount, page, pageSize } } (axios body = response) */
const parseListResponse = (res) => {
  if (!res) {
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

const ProBucketList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState("pending");
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
        proBucketService.list({
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
      toastError(e?.message || "Failed to load Pro Bucket");
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
          <CCardBody>
            <CBreadcrumb className="mb-0">
              <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
              <CBreadcrumbItem active>Pro Bucket</CBreadcrumbItem>
            </CBreadcrumb>
          </CCardBody>
        </CCard>

        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilBasket} className="text-primary" />
              <strong>Pro Bucket</strong>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-3 small">
              <span>
                <span className="text-body-secondary me-1">Pending items:</span>
                <strong>{pendingCount}</strong>
              </span>
            </div>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              <CCol xs={12} md={4} lg={3}>
                <CFormLabel className="mb-1">Search</CFormLabel>
                <div className="position-relative">
                  <CFormInput
                    placeholder="Product or query code"
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
              <CCol xs={6} sm={4} md={2} lg={2}>
                <CFormLabel className="mb-1">From (query date)</CFormLabel>
                <CFormInput
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </CCol>
              <CCol xs={6} sm={4} md={2} lg={2}>
                <CFormLabel className="mb-1">To (query date)</CFormLabel>
                <CFormInput
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </CCol>
              <CCol xs={6} sm={4} md={2} lg={2}>
                <CFormLabel className="mb-1">Status</CFormLabel>
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
              <CCol
                xs={6}
                sm={4}
                md={2}
                lg={1}
                className="d-flex align-items-end"
              >
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatus("pending");
                    setFrom("");
                    setTo("");
                    setPage(1);
                  }}
                >
                  Clear
                </CButton>
              </CCol>
            </CRow>

            {loading ? (
              <Loader />
            ) : (
              <>
                <CRow>
                  {rows.length === 0 && (
                    <CCol xs={12}>
                      <p className="text-body-secondary mb-0">
                        No items found.
                      </p>
                    </CCol>
                  )}
                  {rows.map((row) => (
                    <CCol key={row._id} md={6} className="mb-3">
                      <CCard
                        className="h-100 shadow-sm"
                        style={{ cursor: "pointer" }}
                        role="button"
                        onClick={() => navigate(`/pro-bucket/${row._id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/pro-bucket/${row._id}`);
                          }
                        }}
                        tabIndex={0}
                      >
                        <CCardHeader className="d-flex justify-content-between align-items-center py-2">
                          <span
                            className="text-truncate fw-semibold"
                            title={row.productName}
                          >
                            {row.productName}
                          </span>
                          {statusBadge(row.status)}
                        </CCardHeader>
                        <CCardBody className="py-2 small">
                          <div className="d-flex justify-content-between">
                            <span className="text-body-secondary">Unit</span>
                            <span>{row.unit || "—"}</span>
                          </div>
                          <div className="d-flex justify-content-between mt-1">
                            <span className="text-body-secondary">HSN</span>
                            <span className="text-truncate ps-2">
                              {row.hsnNumber?.toString().trim() || "—"}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between mt-1">
                            <span className="text-body-secondary">
                              Model number
                            </span>
                            <span
                              className="text-truncate ps-2"
                              title={row.modelNumber || ""}
                            >
                              {row.modelNumber?.toString().trim() || "—"}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between mt-1">
                            <span className="text-body-secondary">
                              Time since created
                            </span>
                            <span className="text-nowrap ps-1 font-monospace small">
                              {formatDurationSinceCreated(row.createdAt)}
                            </span>
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))}
                </CRow>

                {total > pageSize && (
                  <CPagination
                    align="center"
                    className="mt-3"
                    aria-label="Pro Bucket pages"
                  >
                    <CPaginationItem
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </CPaginationItem>
                    <CPaginationItem active>{page}</CPaginationItem>
                    <CPaginationItem
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default ProBucketList;
