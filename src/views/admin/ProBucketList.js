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
import { cilBasket, cilChevronRight, cilSearch } from "@coreui/icons";
import proBucketService from "../../services/proBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { Loader } from "../../components";

/** All listed first (default); Pending next so it's easy to pick. */
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "rate_submitted", label: "Rate submitted" },
  { value: "fulfilled", label: "Fulfilled" },
];

const sortPendingFirstThenNewest = (list) => {
  if (!Array.isArray(list) || list.length === 0) return list || [];
  return [...list].sort((a, b) => {
    const ap = a.status === "pending" ? 0 : 1;
    const bp = b.status === "pending" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
};

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

/** Human-readable age since `createdAt` — e.g. "just now", "45 min ago", "2d 5h ago". */
const queryCodeLast4 = (code) => {
  const s = code != null ? String(code).trim() : "";
  if (!s) return "—";
  return s.length <= 4 ? s : s.slice(-4);
};

const refName = (refVal) => {
  if (refVal == null || refVal === "") return "—";
  if (typeof refVal === "object") {
    if (refVal.name != null && String(refVal.name).trim() !== "")
      return String(refVal.name);
    return "—";
  }
  return String(refVal);
};

const formatDurationSinceCreated = (d) => {
  const t = d ? new Date(d).getTime() : NaN;
  if (Number.isNaN(t)) return "—";
  let sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 0) sec = 0;
  if (sec < 60) return "just now";
  const days = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (days >= 1) return h > 0 ? `${days}d ${h}h ago` : `${days}d ago`;
  if (h >= 1) return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  return `${m}m ago`;
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
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        proBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: status.trim() ? status.trim() : undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(sortPendingFirstThenNewest(p.list));
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
  }, [page, pageSize, searchDebounced, status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilBasket} className="text-primary" />
              <strong>Pro Bucket</strong>
            </div>
            {pendingCount > 0 && (
              <CBadge
                color="warning"
                className="px-2 py-1"
                style={{ fontSize: "0.8rem" }}
              >
                {pendingCount} pending
              </CBadge>
            )}
          </CCardHeader>
          <CCardBody>
            <CRow className="g-2 mb-3">
              <CCol xs={12} sm={12} md={5} lg={4}>
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
                    style={{ right: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}
                    size="sm"
                  />
                </div>
              </CCol>
              <CCol xs={12} sm={4} md={2} lg={2}>
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
              <CCol xs={12} sm="auto" className="d-flex align-items-end">
                <CButton
                  color="secondary"
                  variant="outline"
                  className="w-100 w-sm-auto"
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setPage(1);
                  }}
                >
                  Clear filters
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
                    <CCol key={row._id} xs={12} md={6} className="mb-3">
                      <CCard
                        className="h-100"
                        style={{
                          cursor: "pointer",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                          borderColor:
                            row.status === "pending"
                              ? "var(--cui-warning)"
                              : undefined,
                        }}
                        role="button"
                        onClick={() => navigate(`/pro-bucket/${row._id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/pro-bucket/${row._id}`);
                          }
                        }}
                        tabIndex={0}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.boxShadow =
                            "0 0 0 2px var(--cui-primary)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.boxShadow = "none")
                        }
                      >
                        <CCardHeader
                          className="d-flex justify-content-between align-items-center py-2 gap-2"
                          style={{ minHeight: "3rem" }}
                        >
                          <span
                            className="fw-semibold text-truncate"
                            style={{ minWidth: 0 }}
                            title={row.productName}
                          >
                            {row.productName}
                          </span>
                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            {statusBadge(row.status)}
                            <CIcon
                              icon={cilChevronRight}
                              size="sm"
                              className="text-body-secondary"
                            />
                          </div>
                        </CCardHeader>
                        <CCardBody className="py-2 small">
                          <div className="d-flex justify-content-between">
                            <span className="text-body-secondary">Query code</span>
                            <span
                              className="text-truncate ps-2 fw-medium font-monospace"
                              title={row.queryCode?.toString().trim() || ""}
                            >
                              {queryCodeLast4(row.queryCode)}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between mt-1">
                            <span className="text-body-secondary">Unit</span>
                            <span>{row.unit || "—"}</span>
                          </div>
                          <div className="d-flex justify-content-between mt-1">
                            <span className="text-body-secondary">Group</span>
                            <span
                              className="text-truncate ps-2"
                              title={refName(row.groupId)}
                            >
                              {refName(row.groupId)}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between mt-1">
                            <span className="text-body-secondary">Category</span>
                            <span
                              className="text-truncate ps-2"
                              title={refName(row.categoryId)}
                            >
                              {refName(row.categoryId)}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                            <span className="text-body-secondary">
                              Created
                            </span>
                            <span className="text-nowrap ps-1 small">
                              {formatDurationSinceCreated(row.createdAt)}
                            </span>
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))}
                </CRow>

                {total > pageSize && (
                  <div className="d-flex flex-column align-items-center mt-3 gap-2">
                    <span className="small text-body-secondary">
                      Page {page} of {totalPages}
                    </span>
                    <CPagination
                      align="center"
                      className="mb-0"
                      aria-label="Pro Bucket pages"
                    >
                      <CPaginationItem
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </CPaginationItem>
                      <CPaginationItem active aria-current="page">
                        {page}
                      </CPaginationItem>
                      <CPaginationItem
                        disabled={page >= totalPages}
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
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

export default ProBucketList;
