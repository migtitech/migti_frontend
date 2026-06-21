import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  CBadge,
  CButton,
  CSpinner,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilSearch, cilX } from "@coreui/icons";
import rateMasterService from "../../services/rateMasterService";
import { Loader } from "../../components";
import { toastError } from "../../utils/toast";
import { dateFormatter } from "../../utils/dateFormatter";

const PAGE_SIZE = 25;

const TYPE_CONFIG = {
  procurement: { label: "Procurement", color: "info" },
  quoted: { label: "Quoted", color: "primary" },
  po: { label: "Sales Order", color: "warning" },
  billing: { label: "Billing", color: "success" },
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount)))
    return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount));
};

// Best-effort supplier label from the mixed supplierSnapshot.
const getSupplierLabel = (row) => {
  const snap = row?.supplierSnapshot;
  if (!snap || typeof snap !== "object") return "-";
  const name = snap.name || snap.shopname || snap.supplierName || "";
  const shop =
    snap.shopname && snap.shopname !== name ? ` (${snap.shopname})` : "";
  return name ? `${name}${shop}` : "-";
};

const RateMaster = () => {
  // --- Search / selection ---
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");

  // --- Summary ---
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // --- Rates list (chunked) ---
  const [typeFilter, setTypeFilter] = useState("");
  const [rates, setRates] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const dropdownRef = useRef(null);
  const sentinelRef = useRef(null);
  const requestIdRef = useRef(0);

  // Close typeahead on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced product-code typeahead
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await rateMasterService.searchCodes({
          search: search.trim(),
          limit: 10,
        });
        const data = res?.data || res;
        setResults(data?.codes || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRates = useCallback(
    async (code, type, pageNum, { append } = { append: false }) => {
      if (!code) return;
      const reqId = ++requestIdRef.current;
      if (append) setLoadingMore(true);
      else setLoadingRates(true);
      try {
        const res = await rateMasterService.getRates({
          productCode: code,
          ...(type ? { type } : {}),
          page: pageNum,
          limit: PAGE_SIZE,
        });
        // Drop stale responses (code/type changed mid-flight)
        if (reqId !== requestIdRef.current) return;
        const data = res?.data || res;
        const items = data?.items || [];
        setRates((prev) => (append ? [...prev, ...items] : items));
        setPagination(data?.pagination || null);
        setPage(pageNum);
      } catch (err) {
        if (reqId === requestIdRef.current) {
          toastError(err?.message || "Failed to load rates");
        }
      } finally {
        if (reqId === requestIdRef.current) {
          setLoadingRates(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  const loadCode = useCallback(
    async (code) => {
      const trimmed = String(code || "").trim();
      if (!trimmed) return;
      setSelectedCode(trimmed);
      setSearch(trimmed);
      setShowDropdown(false);
      setTypeFilter("");
      setRates([]);
      setPagination(null);

      setLoadingSummary(true);
      try {
        const res = await rateMasterService.getSummary(trimmed);
        setSummary((res?.data || res) ?? null);
      } catch (err) {
        setSummary(null);
        toastError(err?.message || "Failed to load rate summary");
      } finally {
        setLoadingSummary(false);
      }

      await fetchRates(trimmed, "", 1, { append: false });
    },
    [fetchRates],
  );

  // Re-fetch first page when the type filter changes
  const handleTypeFilter = useCallback(
    (type) => {
      setTypeFilter(type);
      setRates([]);
      setPagination(null);
      fetchRates(selectedCode, type, 1, { append: false });
    },
    [selectedCode, fetchRates],
  );

  const handleLoadMore = useCallback(() => {
    if (!pagination?.hasMore || loadingRates || loadingMore) return;
    fetchRates(selectedCode, typeFilter, page + 1, { append: true });
  }, [
    pagination,
    loadingRates,
    loadingMore,
    selectedCode,
    typeFilter,
    page,
    fetchRates,
  ]);

  // Infinite scroll: auto-load next chunk when sentinel enters view
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  const clearSelection = () => {
    setSelectedCode("");
    setSearch("");
    setSummary(null);
    setRates([]);
    setPagination(null);
    setTypeFilter("");
  };

  const typeButtons = useMemo(() => {
    const byType = summary?.byType || {};
    return [
      { key: "", label: "All", count: summary?.total ?? 0, color: "dark" },
      ...Object.keys(TYPE_CONFIG).map((key) => ({
        key,
        label: TYPE_CONFIG[key].label,
        count: byType[key]?.count ?? 0,
        color: TYPE_CONFIG[key].color,
      })),
    ];
  }, [summary]);

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Rate Master</strong>
            <span className="text-muted ms-2 small">
              Search a product code to view every captured rate
            </span>
          </CCardHeader>
          <CCardBody>
            {/* Product code search */}
            <div
              ref={dropdownRef}
              style={{ position: "relative", maxWidth: 520 }}
            >
              <CInputGroup className="mb-1">
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Type a product code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadCode(search);
                  }}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                />
                {searching && (
                  <CInputGroupText>
                    <CSpinner size="sm" />
                  </CInputGroupText>
                )}
                {selectedCode && (
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={clearSelection}
                    title="Clear"
                  >
                    <CIcon icon={cilX} />
                  </CButton>
                )}
              </CInputGroup>
              <div className="text-muted small mb-3">
                Only codes that have captured rates are suggested. Press Enter
                to search the typed code.
              </div>

              {showDropdown && results.length > 0 && (
                <CListGroup
                  style={{
                    position: "absolute",
                    top: "calc(100% - 1.25rem)",
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    maxHeight: 260,
                    overflowY: "auto",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  {results.map((r) => (
                    <CListGroupItem
                      key={r.productCode}
                      onClick={() => loadCode(r.productCode)}
                      style={{ cursor: "pointer" }}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <strong>{r.productCode}</strong>
                      <CBadge color="info">{r.count} rates</CBadge>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )}

              {showDropdown &&
                results.length === 0 &&
                !searching &&
                search.trim() && (
                  <CListGroup
                    style={{
                      position: "absolute",
                      top: "calc(100% - 1.25rem)",
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    <CListGroupItem className="text-muted text-center">
                      No matching product codes
                    </CListGroupItem>
                  </CListGroup>
                )}
            </div>

            {/* Summary + rates */}
            {selectedCode && (
              <>
                {loadingSummary ? (
                  <Loader message="Loading summary..." />
                ) : (
                  summary && (
                    <>
                      <CRow className="g-3 mb-3">
                        <CCol xs={6} md={3}>
                          <div className="border rounded p-3 h-100">
                            <div className="text-muted small">Total Rates</div>
                            <div className="fs-5 fw-bold">{summary.total}</div>
                          </div>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <div className="border rounded p-3 h-100">
                            <div className="text-muted small">Lowest Rate</div>
                            <div className="fs-5 fw-bold text-success">
                              {formatCurrency(summary.minRate)}
                            </div>
                          </div>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <div className="border rounded p-3 h-100">
                            <div className="text-muted small">Highest Rate</div>
                            <div className="fs-5 fw-bold text-danger">
                              {formatCurrency(summary.maxRate)}
                            </div>
                          </div>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <div className="border rounded p-3 h-100">
                            <div className="text-muted small">Product Code</div>
                            <div className="fs-5 fw-bold">
                              {summary.productCode}
                            </div>
                          </div>
                        </CCol>
                      </CRow>

                      {/* Type filter chips */}
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {typeButtons.map((b) => (
                          <CButton
                            key={b.key || "all"}
                            size="sm"
                            color={b.color}
                            variant={
                              typeFilter === b.key ? undefined : "outline"
                            }
                            onClick={() => handleTypeFilter(b.key)}
                          >
                            {b.label}
                            <CBadge color="light" className="ms-2 text-dark">
                              {b.count}
                            </CBadge>
                          </CButton>
                        ))}
                      </div>
                    </>
                  )
                )}

                {/* Rates table (chunked) */}
                {loadingRates ? (
                  <Loader message="Loading rates..." />
                ) : (
                  <>
                    <CTable hover responsive bordered align="middle">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell style={{ width: 50 }}>
                            #
                          </CTableHeaderCell>
                          <CTableHeaderCell>Type</CTableHeaderCell>
                          <CTableHeaderCell>Rate</CTableHeaderCell>
                          <CTableHeaderCell>Unit</CTableHeaderCell>
                          <CTableHeaderCell>Source Code</CTableHeaderCell>
                          <CTableHeaderCell>Supplier</CTableHeaderCell>
                          <CTableHeaderCell>Captured On</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {rates.map((row, index) => {
                          const cfg = TYPE_CONFIG[row.type] || {
                            label: row.type,
                            color: "secondary",
                          };
                          return (
                            <CTableRow key={row._id}>
                              <CTableDataCell>{index + 1}</CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={cfg.color}>{cfg.label}</CBadge>
                              </CTableDataCell>
                              <CTableDataCell>
                                <strong>{formatCurrency(row.rate)}</strong>
                              </CTableDataCell>
                              <CTableDataCell>{row.unit || "-"}</CTableDataCell>
                              <CTableDataCell>
                                {row.sourceCode || "-"}
                              </CTableDataCell>
                              <CTableDataCell>
                                {getSupplierLabel(row)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {dateFormatter(
                                  row.updatedAt || row.createdAt,
                                  "-",
                                )}
                              </CTableDataCell>
                            </CTableRow>
                          );
                        })}
                        {rates.length === 0 && (
                          <CTableRow>
                            <CTableDataCell
                              colSpan={7}
                              className="text-center text-muted"
                            >
                              No rates captured for this product code.
                            </CTableDataCell>
                          </CTableRow>
                        )}
                      </CTableBody>
                    </CTable>

                    {/* Infinite scroll sentinel + manual fallback */}
                    {pagination?.hasMore && (
                      <div ref={sentinelRef} className="text-center py-3">
                        {loadingMore ? (
                          <CSpinner size="sm" />
                        ) : (
                          <CButton
                            color="primary"
                            variant="outline"
                            size="sm"
                            onClick={handleLoadMore}
                          >
                            Load more
                          </CButton>
                        )}
                      </div>
                    )}

                    {pagination && (
                      <div className="text-muted small text-center">
                        Showing {rates.length} of {pagination.total} rates
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default RateMaster;
