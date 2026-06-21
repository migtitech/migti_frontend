import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
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
import {
  EyeIcon,
  Loader,
  TablePagination,
  FilterLockButton,
} from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import QuoteLogsSidebar from "./QuoteLogsSidebar";

const QUERY_PRODUCTS_FILTER_DEFAULTS = {
  status: "",
  groupId: "",
  categoryId: "",
};

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

const normalizeQueryCode = (code) => String(code || "").trim();

const QUERY_CODE_FILTER_PAGE_SIZE = 100;

const QueryProductsList = () => {
  const navigate = useNavigate();
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "query_products",
    QUERY_PRODUCTS_FILTER_DEFAULTS,
  );

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  /* filters */
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialValues.status);
  const [filterGroupId, setFilterGroupId] = useState(initialValues.groupId);
  const [filterCategoryId, setFilterCategoryId] = useState(
    initialValues.categoryId,
  );
  const [selectedQueryCodes, setSelectedQueryCodes] = useState(() => new Set());

  /* dropdown meta */
  const [groups, setGroups] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const filteredCategories = filterGroupId
    ? allCategories.filter((c) => {
        const gId =
          c.group && typeof c.group === "object"
            ? c.group._id || c.group.id
            : c.group;
        return String(gId || "") === String(filterGroupId);
      })
    : allCategories;

  /* image preview modal */
  const [imgModal, setImgModal] = useState({
    visible: false,
    images: [],
    title: "",
  });

  const [quoteLogsOpen, setQuoteLogsOpen] = useState(false);

  /* ── debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const selectedQueryCodesKey = [...selectedQueryCodes].sort().join(",");
  const isQueryCodeFilterActive = selectedQueryCodesKey.length > 0;
  const effectivePageSize = isQueryCodeFilterActive
    ? QUERY_CODE_FILTER_PAGE_SIZE
    : pageSize;

  useEffect(() => {
    setPage(1);
  }, [
    searchDebounced,
    filterStatus,
    filterGroupId,
    filterCategoryId,
    selectedQueryCodesKey,
  ]);

  useFilterLockPersist("query_products", filtersLocked, {
    status: filterStatus,
    groupId: filterGroupId,
    categoryId: filterCategoryId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      status: filterStatus,
      groupId: filterGroupId,
      categoryId: filterCategoryId,
    });
  };

  /* ── load groups / categories once ── */
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [grpRes, catRes] = await Promise.all([
          groupService.getAll({ pageSize: 100 }),
          categoryService.getAllCategories(),
        ]);
        setGroups(
          sortAlphabetically(
            Array.isArray(grpRes?.data?.groups)
              ? grpRes.data.groups
              : Array.isArray(grpRes?.data)
                ? grpRes.data
                : [],
          ),
        );
        setAllCategories(
          sortAlphabetically(
            Array.isArray(catRes?.data?.categories)
              ? catRes.data.categories
              : Array.isArray(catRes?.data)
                ? catRes.data
                : [],
          ),
        );
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
          pageSize: effectivePageSize,
          search: searchDebounced.trim() || undefined,
          status: filterStatus || undefined,
          groupId: filterGroupId || undefined,
          categoryId: filterCategoryId || undefined,
          queryCodes: isQueryCodeFilterActive
            ? selectedQueryCodesKey
            : undefined,
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
  }, [
    page,
    effectivePageSize,
    searchDebounced,
    filterStatus,
    filterGroupId,
    filterCategoryId,
    isQueryCodeFilterActive,
    selectedQueryCodesKey,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

  const toggleQueryCode = (code) => {
    const normalized = normalizeQueryCode(code);
    if (!normalized) return;
    setSelectedQueryCodes((prev) => {
      const next = new Set(prev);
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return next;
    });
  };

  const clearQueryCodeFilter = () => {
    setSelectedQueryCodes(new Set());
  };

  const handleClear = () => {
    setSearch("");
    setFilterStatus("");
    setFilterGroupId("");
    setFilterCategoryId("");
    setSelectedQueryCodes(new Set());
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
              <div className="d-flex flex-wrap align-items-center gap-2">
                <CButton
                  color="dark"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuoteLogsOpen((prev) => !prev)}
                >
                  {quoteLogsOpen ? "Hide Quote Logs" : "Show Quote Logs"}
                </CButton>
                <span className="small text-body-secondary">
                  Total: <strong>{total}</strong>
                </span>
              </div>
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
                    onChange={(e) => {
                      const newGroupId = e.target.value;
                      const catStillValid = allCategories.some((c) => {
                        if ((c._id || c.id) !== filterCategoryId) return false;
                        if (!newGroupId) return true;
                        const gId =
                          c.group && typeof c.group === "object"
                            ? c.group._id || c.group.id
                            : c.group;
                        return String(gId || "") === String(newGroupId);
                      });
                      setFilterGroupId(newGroupId);
                      if (!catStillValid) setFilterCategoryId("");
                    }}
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
                  <CFormLabel className="mb-1">
                    Category
                    {filterGroupId && (
                      <span className="ms-1 small text-body-secondary">
                        ({filteredCategories.length})
                      </span>
                    )}
                  </CFormLabel>
                  <CFormSelect
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {filteredCategories.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name}
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
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="Query Products"
                  />
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
                    onClick={handleClear}
                  >
                    Clear
                  </CButton>
                </CCol>
              </CRow>

              {isQueryCodeFilterActive && (
                <div className="alert alert-info py-2 px-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <span className="small mb-0">
                    Showing all products for query code
                    {selectedQueryCodesKey.split(",").length !== 1
                      ? "s"
                      : ""}:{" "}
                    {selectedQueryCodesKey.split(",").map((code) => (
                      <span
                        key={code}
                        className="badge bg-dark font-monospace ms-1"
                      >
                        {code}
                      </span>
                    ))}
                  </span>
                  <CButton
                    color="info"
                    variant="outline"
                    size="sm"
                    onClick={clearQueryCodeFilter}
                  >
                    Clear query filter
                  </CButton>
                </div>
              )}

              {/* ── Table ── */}
              {loading ? (
                <Loader />
              ) : (
                <>
                  <div className="table-responsive">
                    <CTable hover bordered className="mb-0" align="middle">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell style={{ width: 50 }}>
                            S.No
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 190 }}>
                            Product Name
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 120 }}>
                            Query Code
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 70 }}>
                            Unit
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 70 }}>
                            Qty
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 110 }}>
                            Images
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ minWidth: 160 }}>
                            Group / Category
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 130 }}>
                            Status
                          </CTableHeaderCell>
                          <CTableHeaderCell style={{ width: 60 }}>
                            Action
                          </CTableHeaderCell>
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
                              row.categoryId &&
                              typeof row.categoryId === "object"
                                ? row.categoryId
                                : null;
                            const images = Array.isArray(row.images)
                              ? row.images
                              : [];
                            const firstImgUrl =
                              images.length > 0 ? resolveUrl(images[0]) : null;
                            const queryCode = normalizeQueryCode(row.queryCode);
                            const isQueryCodeSelected =
                              queryCode && selectedQueryCodes.has(queryCode);

                            return (
                              <CTableRow key={row._id || row.id}>
                                {/* S.No */}
                                <CTableDataCell className="text-center fw-semibold text-body-secondary">
                                  {(page - 1) * effectivePageSize + idx + 1}
                                </CTableDataCell>

                                {/* Product Name */}
                                <CTableDataCell>
                                  <div className="fw-semibold">
                                    {row.productName || "—"}
                                  </div>
                                  {row.rawProductCode && (
                                    <div className="small font-monospace text-body-secondary">
                                      {row.rawProductCode}
                                    </div>
                                  )}
                                  {row.hsnNumber && (
                                    <div className="small text-body-secondary">
                                      HSN:{" "}
                                      <span className="fw-medium">
                                        {row.hsnNumber}
                                      </span>
                                    </div>
                                  )}
                                </CTableDataCell>

                                {/* Query Code */}
                                <CTableDataCell>
                                  <div className="d-flex align-items-center gap-2">
                                    <CFormCheck
                                      checked={Boolean(isQueryCodeSelected)}
                                      disabled={!queryCode}
                                      onChange={() =>
                                        toggleQueryCode(queryCode)
                                      }
                                      aria-label={
                                        queryCode
                                          ? `Show all products for query code ${queryCode}`
                                          : "No query code"
                                      }
                                    />
                                    <span className="badge bg-dark font-monospace">
                                      {queryCode || "—"}
                                    </span>
                                  </div>
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
                                          onError={(e) => {
                                            e.target.style.display = "none";
                                          }}
                                        />
                                      )}
                                      <CBadge
                                        color="secondary"
                                        style={{ fontSize: "0.68rem" }}
                                      >
                                        {images.length} img
                                      </CBadge>
                                    </div>
                                  ) : (
                                    <span className="text-body-secondary small">
                                      —
                                    </span>
                                  )}
                                </CTableDataCell>

                                {/* Group / Category */}
                                <CTableDataCell>
                                  <div className="d-flex flex-column gap-1">
                                    {group ? (
                                      <CBadge
                                        color="primary"
                                        style={{ fontWeight: 500 }}
                                      >
                                        {group.name}
                                      </CBadge>
                                    ) : (
                                      <span className="small text-body-secondary">
                                        No group
                                      </span>
                                    )}
                                    {category ? (
                                      <CBadge
                                        color="info"
                                        style={{ fontWeight: 500 }}
                                      >
                                        {category.name}
                                      </CBadge>
                                    ) : (
                                      <span className="small text-body-secondary">
                                        No category
                                      </span>
                                    )}
                                  </div>
                                </CTableDataCell>

                                {/* Status */}
                                <CTableDataCell>
                                  {statusBadge(row.status)}
                                </CTableDataCell>

                                {/* Action */}
                                <CTableDataCell className="text-center">
                                  <CButton
                                    color="info"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      navigate(
                                        `/query-products/${row._id || row.id}`,
                                      )
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
                  <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    disabled={loading}
                    showRange
                    totalItems={total}
                    itemsPerPage={effectivePageSize}
                    align="center"
                    ariaLabel="Query Products pages"
                    wrapperClassName="d-flex flex-column align-items-center mt-3 gap-2"
                  />
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
                <div
                  key={i}
                  className="border rounded overflow-hidden shadow-sm"
                  style={{ width: 160 }}
                >
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={name}
                        style={{
                          width: "100%",
                          height: 140,
                          objectFit: "cover",
                          display: "block",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
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
                  <div
                    className="px-2 py-1 small text-truncate border-top bg-white"
                    title={name}
                  >
                    {name}
                  </div>
                </div>
              );
            })}
          </div>
        </CModalBody>
      </CModal>

      <QuoteLogsSidebar
        isOpen={quoteLogsOpen}
        onToggle={() => setQuoteLogsOpen((prev) => !prev)}
        showFloatingToggle={false}
      />
    </>
  );
};

export default QueryProductsList;
