import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCloudDownload, cilPencil, cilPlus } from "@coreui/icons";
import employeeSalaryService from "../../services/employeeSalaryService";
import { Loader } from "../../components";
import { toastError } from "../../utils/toast";
import { downloadSalarySlipPdf } from "../../utils/salarySlipPdf";

const formatAmount = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "—");

const SalaryManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeSalaryService.getAll({
        pageSize: 100,
        month: monthFilter || undefined,
        search: search || undefined,
      });
      const data = res?.data?.data ?? res?.data ?? {};
      setRecords(data.employeeSalaries ?? []);
    } catch (err) {
      toastError(err?.message || "Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  }, [monthFilter, search]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const monthOptions = useMemo(() => {
    const months = [...new Set(records.map((r) => r.month).filter(Boolean))];
    return months.sort((a, b) => new Date(`1 ${b}`) - new Date(`1 ${a}`));
  }, [records]);

  const handleDownload = async (record) => {
    const id = record._id || record.id;
    if (!id) return;
    setDownloadingId(id);
    try {
      await downloadSalarySlipPdf(id, record);
    } catch (err) {
      toastError(err?.message || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <strong>Salary Management</strong>
            <CButton
              color="primary"
              onClick={() => navigate("/salary-management/generate")}
            >
              <CIcon icon={cilPlus} className="me-1" />
              Generate Salary Slip
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-4">
              <CCol md={4}>
                <CFormSelect
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                >
                  <option value="">All months</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormInput
                  placeholder="Search employee name or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </CCol>
            </CRow>

            {loading ? (
              <div className="text-center py-5">
                <Loader message="Loading salary slips..." />
              </div>
            ) : records.length === 0 ? (
              <p className="text-muted mb-0">No salary slips generated yet.</p>
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Month</CTableHeaderCell>
                    <CTableHeaderCell>Employee</CTableHeaderCell>
                    <CTableHeaderCell>Employee ID</CTableHeaderCell>
                    <CTableHeaderCell>Pay Date</CTableHeaderCell>
                    <CTableHeaderCell>Net Pay</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">
                      Actions
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {records.map((record) => {
                    const id = record._id || record.id;
                    const snap = record.employeeSnapshot || {};
                    return (
                      <CTableRow key={id}>
                        <CTableDataCell>{record.month}</CTableDataCell>
                        <CTableDataCell>{snap.name || "—"}</CTableDataCell>
                        <CTableDataCell>{snap.idnumber || "—"}</CTableDataCell>
                        <CTableDataCell>
                          {formatDate(record.payDate)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {formatAmount(record.netPay)}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CButton
                            color="light"
                            size="sm"
                            className="me-1"
                            title="Edit"
                            onClick={() =>
                              navigate(`/salary-management/edit/${id}`)
                            }
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="primary"
                            size="sm"
                            variant="outline"
                            title="Download PDF"
                            disabled={downloadingId === id}
                            onClick={() => handleDownload(record)}
                          >
                            <CIcon icon={cilCloudDownload} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    );
                  })}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default SalaryManagement;
