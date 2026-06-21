import React, { useEffect, useMemo, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilX } from "@coreui/icons";
import rateLogService from "../../services/rateLogService";
import { dateFormatter } from "../../utils/dateFormatter";

const sidebarWidth = 380;

const formatMoney = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0.00";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const QuoteLogsSidebar = ({
  refreshKey = 0,
  isOpen = false,
  onToggle = () => {},
  showFloatingToggle = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [industryOptions, setIndustryOptions] = useState([]);
  const [industrySearchText, setIndustrySearchText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [industryName, setIndustryName] = useState("");

  const fetchLogs = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await rateLogService.getAll({
        pageNumber: 1,
        pageSize: 100,
        search: searchText,
        industryName,
      });
      const data = res?.data ?? res;
      const result = data?.data ?? data;
      setLogs(result?.items || []);
      setIndustryOptions(result?.filters?.industries || []);
    } catch (_err) {
      if (!silent) {
        setLogs([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, industryName]);

  useEffect(() => {
    fetchLogs({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs({ silent: true });
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, industryName]);

  const logCount = useMemo(() => logs.length, [logs]);
  const visibleIndustryOptions = useMemo(() => {
    const normalizedSearch = industrySearchText.trim().toLowerCase();
    const filtered = !normalizedSearch
      ? industryOptions
      : industryOptions.filter((name) =>
          name.toLowerCase().includes(normalizedSearch),
        );
    return filtered.slice(0, 20);
  }, [industryOptions, industrySearchText]);

  return (
    <>
      {showFloatingToggle && (
        <div
          style={{
            position: "fixed",
            right: isOpen ? sidebarWidth + 12 : 12,
            bottom: 16,
            zIndex: 3000,
            transition: "right 0.2s ease",
          }}
        >
          <CButton color="primary" onClick={onToggle}>
            {isOpen ? "Hide Quote Logs" : "Show Quote Logs"}
          </CButton>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          right: isOpen ? 0 : -sidebarWidth,
          width: sidebarWidth,
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #dee2e6",
          boxShadow: "0 0 16px rgba(0,0,0,0.08)",
          zIndex: 2999,
          transition: "right 0.2s ease",
          padding: 12,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Quote Logs</h6>
          <div className="d-flex align-items-center gap-2">
            <CBadge color="info">{logCount}</CBadge>
            <CButton
              color="light"
              size="sm"
              className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
              style={{ width: 26, height: 26 }}
              onClick={onToggle}
              title="Close"
            >
              <CIcon icon={cilX} size="sm" />
            </CButton>
          </div>
        </div>

        <div className="mb-2">
          <CFormLabel className="small mb-1">Search</CFormLabel>
          <CFormInput
            size="sm"
            placeholder="Product, variants, description"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <CFormLabel className="small mb-1">Search client</CFormLabel>
          <CFormInput
            size="sm"
            placeholder="Type to search industries"
            value={industrySearchText}
            onChange={(e) => setIndustrySearchText(e.target.value)}
            className="mb-2"
          />
          <CFormLabel className="small mb-1">Client</CFormLabel>
          <CFormSelect
            size="sm"
            value={industryName}
            onChange={(e) => setIndustryName(e.target.value)}
          >
            <option value="">All clients</option>
            {visibleIndustryOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </CFormSelect>
          <div className="small text-muted mt-1">
            Showing {visibleIndustryOptions.length} of {industryOptions.length}{" "}
            clients
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div className="text-center py-4">
              <CSpinner size="sm" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-muted small mb-0">No rate logs found.</p>
          ) : (
            logs.map((log) => (
              <CCard
                key={log._id || `${log.product_title}-${log.created_at}`}
                className="mb-2"
              >
                <CCardBody className="py-2 px-2">
                  <div className="fw-semibold">
                    {log.product_title || "Untitled product"}
                  </div>
                  <div className="text-muted small">
                    {log.description || "No description"}
                  </div>
                  <div className="small mt-1">
                    <strong>Variants:</strong>{" "}
                    {(log.variants || []).join(", ") || "—"}
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="small text-muted">
                      {log.industry_name || "Unknown client"}
                    </span>
                    <span className="fw-bold text-primary">
                      Rs {formatMoney(log.amount)}
                      {log.unit ? ` / ${log.unit}` : ""}
                    </span>
                  </div>
                  <div className="small text-muted mt-1">
                    <strong>Date:</strong> {dateFormatter(log.created_at, "—")}
                  </div>
                </CCardBody>
              </CCard>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default QuoteLogsSidebar;
