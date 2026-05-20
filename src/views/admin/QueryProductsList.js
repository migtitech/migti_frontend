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
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
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
import { cilSearch, cilList } from "@coreui/icons";
import proBucketService from "../../services/proBucketService";
import groupService from "../../services/groupService";
import categoryService from "../../services/categoryService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError } from "../../utils/toast";
import { sortAlphabetically } from "../../utils/sort";
import { Loader, EyeIcon } from "../../components";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "rate_submitted", label: "Rate Submitted" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "approval_pending", label: "Approval Pending" },
];

const statusBadge = (s) => {
  switch (s) {
    case "pending":
      return <CBadge color="warning">Pending</CBadge>;
    case "rate_submitted":
      return <CBadge color="info">Rate Submitted</CBadge>;
    case "fulfilled":
      return <CBadge color="success">Fulfilled</CBadge>;
    case "approval_pending":
      return <CBadge color="secondary">Approval Pending</CBadge>;
    default:
      return (
        <CBadge color="light" textColor="dark">
          {s || "—"}
        </CBadge>
      );
  }
};

const resolveUrl = (img) => {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (img.signedUrl) return img.signedUrl;
  if (img.url) return img.url;
  if (img.path) return img.path;
  return null;
};

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object") {
    return { list: [], total: 0, page: 1, pageSize: 20 };
  }
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const QueryProductsList = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  /* filters */
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  /* dropdown meta */
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);

  /* image preview modal */
  const [imgModal, setImgModal] = useState({ visible: false, images: [], title: "" });

  /* ── debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, filterStatus, filterGroupId, filterCategoryId]);

  /* ── load groups / categories once ── */
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [grpRes, catRes] = await Promise.all([
          groupService.getAll({ pageSize: 100 }),
          categoryService.getAll({ pageSize: 100 }),
        ]);
        setGroups(sortAlphabetically(
          Array.isArray(grpRes?.data?.groups)
            ? grpRes.data.groups
            : Array.isArray(grpRes?.data)
            ? grpRes.data
            : [],
        ));
        setCategories(sortAlphabetically(
          Array.isArray(catRes?.data?.categories)
            ? catRes.data.categories
            : Array.isArray(catRes?.data)
            ? catRes.data
            : [],
        ));
      } catch {
        /* non-critical */
      }
    };
    loadMeta();
  }, []);

  /* ── fetch list ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        proBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: filterStatus || undefined,
          groupId: filterGroupId || undefined,
          categoryId: filterCategoryId || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
    } catch (e) {
      toastError(e?.message || "Failed to load query products");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, filterStatus, filterGroupId, filterCategoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleClear = () => {
    setSearch("");
    setFilterStatus("");
    setFilterGroupId("");
    setFilterCategoryId("");
    setPage(1);
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilList} className="text-primary" />
                <strong>Query Products</strong>
              </div>
              <span className="small text-body-secondary">
                Total: <strong>{total}</strong>
              </span>
            </CCardHeader>

            <CCardBody>
              {/* ── Filters ── */}
              <CRow className="g-3 mb-3">
                <CCol xs={12} md={4} lg={3}>
                  <CFormLabel className="mb-1">Search</CFormLabel>
                  <div className="position-relative">
                    <CFormInput
                      placeholder="Product name, query code, raw code, unit, HSN…"
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
                  <CFormLabel className="mb-1">Status</CFormLabel>
                  <CFormSelect
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol xs={6} sm={4} md={2} lg={2}>
                  <CFormLabel className="mb-1">Group</CFormLabel>
                  <CFormSelect
                    value={filterGroupId}
                    onChange={(e) => setFilterGroupId(e.target.value)}
                  >
                    <option value="">All Groups</option>
                    {groups.map((g) => (
                      <option key={g._id || g.id} value={g._id || g.id}>
                        {g.name}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol xs={6} sm={4} md={2} lg={2}>
                  <CFormLabel className="mb-1">Category</CFormLabel>
                  <CFormSelect
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol xs={6} sm={4} md={2} lg={1} className="d-flex align-items-end">
                  <CButton color="secondary" variant="outline" onClick={handleClear}>
                    Clear
                  </CButton>
                </CCol>
              </CRow>

              {/* ── Table ── */}
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
                          <CTableHeaderCell style={{ minWidth: 120 }}>Query Code</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 70 }}>Unit</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 70 }}>Qty</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 110 }}>Images</CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 160 }}>Group / Category</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 130 }}>Status</CTableHeaderCell>
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
                              No query products found.
                            </CTableDataCell>
                          </CTableRow>
                        ) : (
                          rows.map((row, idx) => {
                            const group =
                              row.groupId && typeof row.groupId === "object"
                                ? row.groupId
                                : null;
                            const category =
                              row.categoryId && typeof row.categoryId === "object"
                                ? row.categoryId
                                : null;
                            const images = Array.isArray(row.images) ? row.images : [];
                            const firstImgUrl = images.length > 0 ? resolveUrl(images[0]) : null;

                            return (
                              <CTableRow key={row._id || row.id}>
                                {/* S.No */}
                                <CTableDataCell className="text-center fw-semibold text-body-secondary">
                                  {(page - 1) * pageSize + idx + 1}
                                </CTableDataCell>

                                {/* Product Name */}
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

                                {/* Query Code */}
                                <CTableDataCell>
                                  <span className="badge bg-dark font-monospace">
                                    {row.queryCode || "—"}
                                  </span>
                                </CTableDataCell>

                                {/* Unit */}
                                <CTableDataCell className="text-center">
                                  {row.unit || "—"}
                                </CTableDataCell>

                                {/* Qty */}
                                <CTableDataCell className="text-center fw-semibold">
                                  {row.quantity ?? "—"}
                                </CTableDataCell>

                                {/* Images */}
                                <CTableDataCell className="text-center">
                                  {images.length > 0 ? (
                                    <div
                                      style={{ cursor: "pointer" }}
                                      className="d-flex flex-column align-items-center gap-1"
                                      onClick={() =>
                                        setImgModal({
                                          visible: true,
                                          images,
                                          title: row.productName || "Images",
                                        })
                                      }
                                      title={`View ${images.length} image(s)`}
                                    >
                                      {firstImgUrl && (
                                        <img
                                          src={firstImgUrl}
                                          alt={row.productName}
                                          style={{
                                            width: 52,
                                            height: 52,
                                            objectFit: "cover",
                                            borderRadius: 6,
                                            border: "1px solid #dee2e6",
                                          }}
                                          onError={(e) => { e.target.style.display = "none"; }}
                                        />
                                      )}
                                      <CBadge color="secondary" style={{ fontSize: "0.68rem" }}>
                                        {images.length} img
                                      </CBadge>
                                    </div>
                                  ) : (
                                    <span className="text-body-secondary small">—</span>
                                  )}
                                </CTableDataCell>

                                {/* Group / Category */}
                                <CTableDataCell>
                                  <div className="d-flex flex-column gap-1">
                                    {group ? (
                                      <CBadge color="primary" style={{ fontWeight: 500 }}>
                                        {group.name}
                                      </CBadge>
                                    ) : (
                                      <span className="small text-body-secondary">No group</span>
                                    )}
                                    {category ? (
                                      <CBadge color="info" style={{ fontWeight: 500 }}>
                                        {category.name}
                                      </CBadge>
                                    ) : (
                                      <span className="small text-body-secondary">No category</span>
                                    )}
                                  </div>
                                </CTableDataCell>

                                {/* Status */}
                                <CTableDataCell>{statusBadge(row.status)}</CTableDataCell>

                                {/* Action */}
                                <CTableDataCell className="text-center">
                                  <CButton
                                    color="info"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      navigate(`/query-products/${row._id || row.id}`)
                                    }
                                    title="View / Edit"
                                  >
                                    <EyeIcon />
                                  </CButton>
                                </CTableDataCell>
                              </CTableRow>
                            );
                          })
                        )}
                      </CTableBody>
                    </CTable>
                  </div>

                  {/* ── Pagination ── */}
                  {total > pageSize && (
                    <div className="d-flex flex-column align-items-center mt-3 gap-2">
                      <span className="small text-body-secondary">
                        Showing {Math.min((page - 1) * pageSize + 1, total)}–
                        {Math.min(page * pageSize, total)} of {total}
                      </span>
                      <CPagination align="center" className="mb-0" aria-label="Query Products pages">
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

      {/* ── Image gallery modal (thumbnail quick-view from list) ── */}
      <CModal
        visible={imgModal.visible}
        onClose={() => setImgModal({ visible: false, images: [], title: "" })}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>
            {imgModal.title} — {imgModal.images.length} image
            {imgModal.images.length !== 1 ? "s" : ""}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="d-flex flex-wrap gap-3">
            {imgModal.images.map((img, i) => {
              const url = resolveUrl(img);
              const name =
                typeof img === "object" && img !== null
                  ? img.name || `Image ${i + 1}`
                  : `Image ${i + 1}`;
              return (
                <div key={i} className="border rounded overflow-hidden shadow-sm" style={{ width: 160 }}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={name}
                        style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    </a>
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center bg-light text-body-secondary small"
                      style={{ height: 140 }}
                    >
                      No preview
                    </div>
                  )}
                  <div className="px-2 py-1 small text-truncate border-top bg-white" title={name}>
                    {name}
                  </div>
                </div>
              );
            })}
          </div>
        </CModalBody>
      </CModal>
    </>
  );
};

export default QueryProductsList;
