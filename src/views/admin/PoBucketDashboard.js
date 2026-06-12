import React, { useEffect, useRef, useState } from "react";
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
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilTrash } from "@coreui/icons";
import purchaseOrderService from "../../services/purchaseOrderService";
import { Loader, EyeIcon } from "../../components";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole } from "../../hooks/usePermissions";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "hod_approved", label: "HOD approved" },
  { value: "cancelled", label: "Cancelled" },
  { value: "closed", label: "Closed" },
];

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const formatInrAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getStatusBadge = (status) => {
  switch (status) {
    case "draft":
      return <CBadge color="secondary">Draft</CBadge>;
    case "confirmed":
      return <CBadge color="info">Confirmed</CBadge>;
    case "fulfilled":
      return <CBadge color="success">Fulfilled</CBadge>;
    case "cancelled":
      return <CBadge color="danger">Cancelled</CBadge>;
    case "closed":
      return <CBadge color="dark">Closed</CBadge>;
    case "hod_approved":
      return <CBadge color="success">HOD approved</CBadge>;
    default:
      return <CBadge color="secondary">{status || "-"}</CBadge>;
  }
};

const isHodRole = (role) => {
  const r = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return r === "head_of_department" || r === "hod";
};

/** PIN required on PO Bucket before HOD can close a purchase order (UI gate). */
const PO_CLOSE_SECRET_PIN = "2003";

const PoBucketDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hodUser = isHodRole(user?.role);
  const isSalesRole = normalizeRole(user?.role).startsWith("sales");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  /** Single modal: confirm message first, then PIN (avoids CoreUI firing onClose when swapping modals). */
  const [poCloseModalOpen, setPoCloseModalOpen] = useState(false);
  const [poCloseStep, setPoCloseStep] = useState("confirm");
  const [closePinInput, setClosePinInput] = useState("");
  const [closing, setClosing] = useState(false);
  const pendingClosePoIdRef = useRef(null);
  const latestFetchIdRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchDebounced, statusFilter]);

  useEffect(() => {
    const fetchData = async () => {
      const fetchId = Date.now();
      latestFetchIdRef.current = fetchId;
      setLoading(true);
      try {
        const res = await withMinimumDelay(() =>
          purchaseOrderService.getAll({
            pageNumber,
            pageSize,
            search: searchDebounced.trim() || undefined,
            status: statusFilter || undefined,
            ...((() => {
              if (!isSalesRole) return {};
              const storedUser = JSON.parse(localStorage.getItem("migticrm_user") || "{}");
              const userZoneIds = storedUser?.zoneIds;
              if (Array.isArray(userZoneIds) && userZoneIds.length)
                return { zoneIds: userZoneIds.join(",") };
              if (typeof userZoneIds === "string" && userZoneIds)
                return { zoneIds: userZoneIds };
              return {};
            })()),
          }),
        );
        const data = res?.data || res;
        const result = data?.data ?? data;
        if (latestFetchIdRef.current !== fetchId) return;
        setRows(result?.purchaseOrders || []);
        setPagination(result?.pagination || null);
      } catch (err) {
        if (latestFetchIdRef.current !== fetchId) return;
        toastError(err?.message || "Failed to load sales orders");
        setRows([]);
        setPagination(null);
      } finally {
        if (latestFetchIdRef.current === fetchId) setLoading(false);
      }
    };
    fetchData();
  }, [pageNumber, pageSize, searchDebounced, statusFilter, isSalesRole]);

  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? pageNumber;
  const totalItems = pagination?.totalItems ?? rows.length;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const resetClosePoFlow = () => {
    pendingClosePoIdRef.current = null;
    setClosePinInput("");
    setPoCloseStep("confirm");
    setPoCloseModalOpen(false);
  };

  const openCloseConfirm = (po, e) => {
    e?.stopPropagation?.();
    pendingClosePoIdRef.current = po._id || po.id || null;
    setClosePinInput("");
    setPoCloseStep("confirm");
    setPoCloseModalOpen(true);
  };

  const handlePoCloseModalDismiss = () => {
    if (closing) return;
    resetClosePoFlow();
  };

  const handleConfirmedCloseAfterPin = () => {
    const trimmed = String(closePinInput || "").trim();
    if (trimmed !== PO_CLOSE_SECRET_PIN) {
      toastError("Incorrect PIN. Sales order was not closed.");
      return;
    }
    const id = pendingClosePoIdRef.current;
    if (!id) return;
    resetClosePoFlow();
    setClosing(true);
    void (async () => {
      try {
        await purchaseOrderService.hodClose(id);
        toastSuccess("Sales order closed");
        const res = await purchaseOrderService.getAll({
          pageNumber,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: statusFilter || undefined,
        });
        const data = res?.data || res;
        const result = data?.data ?? data;
        setRows(result?.purchaseOrders || []);
        setPagination(result?.pagination || null);
      } catch (err) {
        toastError(err?.message || "Failed to close sales order");
      } finally {
        setClosing(false);
      }
    })();
  };

  return (
    <CRow>
      <CCol xs={12}>
        <CModal
          alignment="center"
          visible={poCloseModalOpen}
          onClose={handlePoCloseModalDismiss}
          backdrop="static"
        >
          <CModalHeader>
            <CModalTitle>
              {poCloseStep === "confirm"
                ? "Close sales order?"
                : "Enter secret PIN"}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            {poCloseStep === "confirm" ? (
              <p className="mb-0">
                This sales order will be marked closed and all product lines
                will be set to Sales Order closed. Click Continue, then enter the secret
                PIN to confirm.
              </p>
            ) : (
              <>
                <CFormLabel htmlFor="po-close-pin" className="mb-2">
                  PIN required to close this sales order
                </CFormLabel>
                <CFormInput
                  id="po-close-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="PIN"
                  value={closePinInput}
                  disabled={closing}
                  autoFocus
                  onChange={(e) => setClosePinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!closing) handleConfirmedCloseAfterPin();
                    }
                  }}
                />
              </>
            )}
          </CModalBody>
          <CModalFooter className="d-flex flex-wrap gap-2 justify-content-end">
            {poCloseStep === "confirm" ? (
              <>
                <CButton
                  color="secondary"
                  variant="outline"
                  disabled={closing}
                  onClick={handlePoCloseModalDismiss}
                >
                  Cancel
                </CButton>
                <CButton
                  color="danger"
                  disabled={closing}
                  onClick={() => setPoCloseStep("pin")}
                >
                  Continue
                </CButton>
              </>
            ) : (
              <>
                <CButton
                  color="secondary"
                  variant="outline"
                  disabled={closing}
                  onClick={() => {
                    setPoCloseStep("confirm");
                    setClosePinInput("");
                  }}
                >
                  Back
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  disabled={closing}
                  onClick={handlePoCloseModalDismiss}
                >
                  Cancel
                </CButton>
                <CButton
                  color="danger"
                  disabled={closing}
                  onClick={handleConfirmedCloseAfterPin}
                >
                  Close Sales Order
                </CButton>
              </>
            )}
          </CModalFooter>
        </CModal>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Sales Order Bucket</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3 g-2 align-items-end">
              <CCol xs={12} md={4}>
                <CFormLabel className="mb-1 small text-body-secondary">
                  Search
                </CFormLabel>
                <CFormInput
                  value={searchTerm}
                  placeholder="Search Sales Order code, company, product"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </CCol>
              <CCol xs={12} md={3}>
                <CFormLabel className="mb-1 small text-body-secondary">
                  Status
                </CFormLabel>
                <CFormSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12} md={2}>
                <CFormLabel className="mb-1 small text-body-secondary">
                  Rows per page
                </CFormLabel>
                <CFormSelect
                  value={pageSize}
                  onChange={(e) => {
                    const next = Number(e.target.value) || 10;
                    setPageSize(next);
                    setPageNumber(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </CFormSelect>
              </CCol>
            </CRow>
            {loading && <Loader />}
            <CTable hover responsive bordered>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>S No</CTableHeaderCell>
                  <CTableHeaderCell>Sales Order Number</CTableHeaderCell>
                  <CTableHeaderCell>Company</CTableHeaderCell>
                  <CTableHeaderCell>Products</CTableHeaderCell>
                  <CTableHeaderCell>Total Amount</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.length > 0 ? (
                  rows.map((po, index) => {
                    const poId = po._id || po.id;
                    const st = String(po.status || "").toLowerCase();
                    const canShowClose =
                      hodUser && st !== "closed" && st !== "cancelled";
                    return (
                      <CTableRow
                        key={poId}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/po-bucket/${poId}`)}
                      >
                        <CTableDataCell>
                          {(currentPage - 1) * pageSize + index + 1}
                        </CTableDataCell>
                        <CTableDataCell>
                          <strong>{po.poCode || "-"}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          {po.companyInfo?.name || "-"}
                        </CTableDataCell>
                        <CTableDataCell>
                          {Array.isArray(po.products) ? po.products.length : 0}{" "}
                          item(s)
                        </CTableDataCell>
                        <CTableDataCell>
                          ₹{formatInrAmount(po.totalAmount)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {getStatusBadge(po.status)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {po.createdAt
                            ? formatDateDdMmYyyy(po.createdAt)
                            : "-"}
                        </CTableDataCell>
                        <CTableDataCell onClick={(e) => e.stopPropagation()}>
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <CButton
                              color="info"
                              variant="ghost"
                              size="sm"
                              title="View"
                              onClick={() => navigate(`/po-bucket/${poId}`)}
                            >
                              <EyeIcon />
                            </CButton>
                            {canShowClose ? (
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                title="Close Sales Order"
                                disabled={closing}
                                onClick={(e) => openCloseConfirm(po, e)}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            ) : null}
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    );
                  })
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan={8} className="text-center">
                      {!loading && "No sales orders found."}
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="small text-medium-emphasis">
                  Showing {startItem}-{endItem} of {totalItems}
                </div>
                <CPagination className="mb-0">
                  <CPaginationItem
                    disabled={loading || currentPage <= 1}
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </CPaginationItem>
                  <CPaginationItem active>
                    {currentPage} / {totalPages}
                  </CPaginationItem>
                  <CPaginationItem
                    disabled={loading || currentPage >= totalPages}
                    onClick={() =>
                      setPageNumber((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default PoBucketDashboard;
