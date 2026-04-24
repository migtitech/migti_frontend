import React, { useEffect, useState } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
} from "@coreui/react";
import rateLogService from "../../services/rateLogService";

const formatMoney = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0.00";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const QuoteLogsView = () => {
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [industryName, setIndustryName] = useState("");
  const [industrySearchText, setIndustrySearchText] = useState("");
  const [logs, setLogs] = useState([]);
  const [industryOptions, setIndustryOptions] = useState([]);

  const fetchLogs = async () => {
    setLoading(true);
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
      setLogs([]);
      setIndustryOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, industryName]);

  const visibleIndustryOptions = (() => {
    const normalizedSearch = industrySearchText.trim().toLowerCase();
    const filtered = !normalizedSearch
      ? industryOptions
      : industryOptions.filter((name) =>
          name.toLowerCase().includes(normalizedSearch),
        );
    return filtered.slice(0, 20);
  })();

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Quote Logs</strong>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={8}>
              <CFormLabel>Search</CFormLabel>
              <CFormInput
                placeholder="Search by product title, description, variants"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </CCol>
            <CCol md={4}>
              <CFormLabel>Search client</CFormLabel>
              <CFormInput
                placeholder="Type to search clients"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
                className="mb-2"
              />
              <CFormLabel>Client</CFormLabel>
              <CFormSelect
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
                Showing {visibleIndustryOptions.length} of{" "}
                {industryOptions.length} clients
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>
          <strong>Log Entries</strong>
        </CCardHeader>
        <CCardBody style={{ maxHeight: "65vh", overflowY: "auto" }}>
          {loading ? (
            <div className="text-center py-4">
              <CSpinner />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-muted mb-0">No quote logs found.</p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {logs.map((log) => (
                <div key={log._id} className="border rounded p-3 bg-white">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="fw-semibold">
                        {log.product_title || "Untitled product"}
                      </div>
                      <div className="small text-muted">
                        {log.description || "No description"}
                      </div>
                    </div>
                    <div className="fw-bold text-primary">
                      Rs {formatMoney(log.amount)}
                      {log.unit ? ` / ${log.unit}` : ""}
                    </div>
                  </div>
                  <div className="small mt-2">
                    <strong>Variants:</strong>{" "}
                    {(log.variants || []).join(", ") || "—"}
                  </div>
                  <div className="small text-muted mt-1">
                    <strong>Client:</strong> {log.industry_name || "Unknown"} |{" "}
                    <strong>Created:</strong> {formatDate(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  );
};

export default QuoteLogsView;
