import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft, cilSearch } from "@coreui/icons";
import { poProductsBucketService } from "../../services/deliveryApprovalService";
import { toastError } from "../../utils/toast";

const parseListResponse = (res) => {
  const block = res?.data;
  if (!block || typeof block !== "object") return [];
  return Array.isArray(block.data) ? block.data : [];
};

const PoProductAdd = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const [poCode, setPoCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searchedCode, setSearchedCode] = useState("");

  /* ── close dropdown on outside click ── */
  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /* ── fetch suggestions as user types ── */
  useEffect(() => {
    const term = poCode.trim();
    if (!term) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const t = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const res = await poProductsBucketService.poCodeSuggestions(term);
        const list = res?.data ?? [];
        setSuggestions(Array.isArray(list) ? list : []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [poCode]);

  const handleSelectSuggestion = (code) => {
    setPoCode(code);
    setShowSuggestions(false);
    doSearch(code);
  };

  const doSearch = useCallback(async (code) => {
    const term = (code ?? poCode).trim();
    if (!term) return;
    setLoading(true);
    setSearched(false);
    setSearchedCode(term);
    try {
      const res = await poProductsBucketService.list({
        search: term,
        deliverySubStatus: "all",
        pageSize: 100,
      });
      setProducts(parseListResponse(res));
      setSearched(true);
    } catch (e) {
      toastError(e?.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [poCode]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      doSearch();
    }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  return (
    <CRow>
      <CCol xs={12}>
        <div className="d-flex align-items-center gap-2 mb-3">
          <CButton color="secondary" variant="ghost" onClick={() => navigate("/po-products")}>
            <CIcon icon={cilArrowLeft} className="me-1" />
            Back
          </CButton>
          <h5 className="mb-0 fw-semibold">Add PO Product</h5>
        </div>

        <CCard className="mb-4">
          <CCardHeader><strong>Search by PO Code</strong></CCardHeader>
          <CCardBody>
            <CRow className="g-3 align-items-end">
              <CCol xs={12} md={5}>
                <CFormLabel>PO Code</CFormLabel>
                <div className="position-relative" ref={wrapperRef}>
                  <CFormInput
                    placeholder="Type PO code…"
                    value={poCode}
                    onChange={(e) => setPoCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    autoFocus
                    autoComplete="off"
                  />

                  {/* Spinner inside input */}
                  {suggestLoading && (
                    <CSpinner
                      size="sm"
                      className="position-absolute"
                      style={{ right: 10, top: 10, opacity: 0.5 }}
                    />
                  )}

                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <ul
                      className="list-unstyled mb-0 border rounded shadow-sm bg-white position-absolute w-100"
                      style={{ zIndex: 1050, top: "calc(100% + 2px)" }}
                    >
                      {suggestions.map((s) => (
                        <li
                          key={s}
                          onMouseDown={() => handleSelectSuggestion(s)}
                          className="px-3 py-2 font-monospace small"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f4ff")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CCol>

              <CCol xs="auto">
                <CButton
                  color="primary"
                  onClick={() => { setShowSuggestions(false); doSearch(); }}
                  disabled={loading || !poCode.trim()}
                >
                  {loading ? (
                    <CSpinner size="sm" className="me-2" />
                  ) : (
                    <CIcon icon={cilSearch} className="me-1" />
                  )}
                  Search
                </CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {searched && (
          <>
            {products.length === 0 ? (
              <div className="text-center text-body-secondary py-5">
                No products found for <strong>{searchedCode}</strong>.
              </div>
            ) : (
              <>
                <p className="text-body-secondary small mb-3">
                  {products.length} product{products.length !== 1 ? "s" : ""} found for{" "}
                  <strong>{searchedCode}</strong> — click one to add it.
                </p>
                <CRow className="g-3">
                  {products.map((p) => (
                    <CCol key={p._id} xs={12} sm={6} md={4} lg={3}>
                      <div
                        onClick={() => navigate("/po-products/create", { state: { product: p } })}
                        className="border rounded p-3 h-100 d-flex flex-column gap-1"
                        style={{ cursor: "pointer", transition: "box-shadow 0.15s" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.boxShadow = "0 0 0 2px #0d6efd")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.boxShadow = "none")
                        }
                      >
                        <div className="fw-semibold text-truncate" title={p.productName}>
                          {p.productName || "—"}
                        </div>
                        {p.rawProductCode && (
                          <div className="small font-monospace text-body-secondary text-truncate">
                            {p.rawProductCode}
                          </div>
                        )}
                        <div className="small text-body-secondary mt-auto pt-2 d-flex justify-content-between">
                          <span>
                            Qty: <strong>{p.quantity ?? "—"}</strong>
                            {p.unit ? ` ${p.unit}` : ""}
                          </span>
                          <span
                            className="badge bg-dark font-monospace"
                            style={{ fontSize: "0.65rem" }}
                          >
                            {p.poCode || "—"}
                          </span>
                        </div>
                      </div>
                    </CCol>
                  ))}
                </CRow>
              </>
            )}
          </>
        )}
      </CCol>
    </CRow>
  );
};

export default PoProductAdd;
