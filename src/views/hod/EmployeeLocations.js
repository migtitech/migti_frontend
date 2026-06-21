import React, { useCallback, useEffect, useState } from "react";
import { TablePagination } from "../../components";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import employeeLocationService from "../../services/employeeLocationService";
import { toastError } from "../../utils/toast";
import { dateTimeFormatter } from "../../utils/dateFormatter";

const EmployeeLocations = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyModal, setHistoryModal] = useState({
    visible: false,
    employee: null,
  });
  const [historyRows, setHistoryRows] = useState([]);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeLocationService.getTeamLatest();
      const list = res?.data?.employees || [];
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      toastError(err?.message || "Failed to load team locations");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const loadHistory = useCallback(async (employeeId, page) => {
    if (!employeeId) return;
    setHistoryLoading(true);
    try {
      const res = await employeeLocationService.getHistoryBinned({
        employeeId,
        pageNumber: page,
        pageSize: 10,
        intervalMinutes: 30,
      });
      setHistoryRows(res?.data?.locations || []);
      setHistoryPagination(res?.data?.pagination || null);
    } catch (err) {
      toastError(err?.message || "Failed to load location history");
      setHistoryRows([]);
      setHistoryPagination(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = (employee) => {
    setHistoryModal({ visible: true, employee });
    setHistoryPage(1);
  };

  const closeHistory = () => {
    setHistoryModal({ visible: false, employee: null });
    setHistoryRows([]);
    setHistoryPagination(null);
  };

  useEffect(() => {
    if (!historyModal.visible || !historyModal.employee) return;
    const id = historyModal.employee.employeeId || historyModal.employee._id;
    loadHistory(id, historyPage);
  }, [historyPage, historyModal.visible, historyModal.employee, loadHistory]);

  const totalHistoryPages = historyPagination?.totalPages || 1;
  const currentHistoryPage = historyPagination?.currentPage || historyPage;

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Employee locations</strong>
            <div className="small text-body-secondary mt-1">
              Last reported position per employee. History uses one checkpoint
              per 30-minute window (latest reading in each window).
            </div>
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <div className="text-center py-5">
                <CSpinner />
              </div>
            ) : (
              <div className="table-responsive">
                <CTable hover align="middle" className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">Name</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Latitude</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Longitude</CTableHeaderCell>
                      <CTableHeaderCell scope="col">City</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Locality</CTableHeaderCell>
                      <CTableHeaderCell scope="col">
                        Last fetched
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Actions
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rows.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell
                          colSpan={7}
                          className="text-center text-body-secondary"
                        >
                          No employees found.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      rows.map((row) => {
                        const loc = row.lastLocation;
                        const id = row.employeeId || row._id;
                        return (
                          <CTableRow key={String(id)}>
                            <CTableDataCell>{row.name || "—"}</CTableDataCell>
                            <CTableDataCell>
                              {loc?.latitude != null
                                ? Number(loc.latitude).toFixed(6)
                                : "—"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {loc?.longitude != null
                                ? Number(loc.longitude).toFixed(6)
                                : "—"}
                            </CTableDataCell>
                            <CTableDataCell>{loc?.city || "—"}</CTableDataCell>
                            <CTableDataCell>
                              {loc?.locality || "—"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {dateTimeFormatter(loc?.fetchedAt, "—")}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CButton
                                color="primary"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openHistory({ ...row, employeeId: id })
                                }
                              >
                                View
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        );
                      })
                    )}
                  </CTableBody>
                </CTable>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal
        visible={historyModal.visible}
        onClose={closeHistory}
        size="lg"
        scrollable
      >
        <CModalHeader>
          <strong>Location history</strong>
          {historyModal.employee?.name ? (
            <span className="ms-2 text-body-secondary fw-normal">
              — {historyModal.employee.name}
            </span>
          ) : null}
        </CModalHeader>
        <CModalBody>
          {historyLoading ? (
            <div className="text-center py-4">
              <CSpinner />
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <CTable hover align="middle" className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">Latitude</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Longitude</CTableHeaderCell>
                      <CTableHeaderCell scope="col">City</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Locality</CTableHeaderCell>
                      <CTableHeaderCell scope="col">
                        Date &amp; time
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {historyRows.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell
                          colSpan={5}
                          className="text-center text-body-secondary"
                        >
                          No history for this employee yet.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      historyRows.map((h) => (
                        <CTableRow key={String(h._id)}>
                          <CTableDataCell>
                            {h.latitude != null
                              ? Number(h.latitude).toFixed(6)
                              : "—"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {h.longitude != null
                              ? Number(h.longitude).toFixed(6)
                              : "—"}
                          </CTableDataCell>
                          <CTableDataCell>{h.city || "—"}</CTableDataCell>
                          <CTableDataCell>{h.locality || "—"}</CTableDataCell>
                          <CTableDataCell>
                            {dateTimeFormatter(h.fetchedAt, "—")}
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              </div>
              <TablePagination
                currentPage={currentHistoryPage}
                totalPages={totalHistoryPages}
                onPageChange={setHistoryPage}
                showRange
                totalItems={historyPagination?.totalItems ?? 0}
                itemsPerPage={historyPagination?.itemsPerPage ?? 10}
              />
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={closeHistory}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  );
};

export default EmployeeLocations;
