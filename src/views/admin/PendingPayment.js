import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilArrowLeft } from "@coreui/icons";
import { getAssetsUrl } from "../../api/endpoints";
import purchaseOrderService from "../../services/purchaseOrderService";
import { useAuth } from "../../context/AuthContext";
import { Loader, TablePagination } from "../../components";
import { toastError } from "../../utils/toast";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === "object") return response.data;
  return response || {};
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const PAYMENT_DUE_DAYS = 35;

const computePaymentDueDate = (createdAt) => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + PAYMENT_DUE_DAYS);
  return d;
};

const PAYMENT_STATUS_BADGE = {
  none: { label: "No payment", color: "secondary" },
  partial_payment_received: { label: "Partial", color: "warning" },
  full_payment_received: { label: "Full", color: "success" },
};

const PAYMENT_AMOUNT_TOLERANCE = 0.01;

/** Hide POs that are fully paid (total ≈ received or no pending balance). */
const isPoFullyPaid = (row) => {
  if (String(row?.paymentReceivedStatus || "") === "full_payment_received") {
    return true;
  }
  const fin = row?.financials || {};
  const total = Number(fin.grandTotal) || 0;
  const received = Number(fin.totalPaid) || 0;
  const remaining = Number(fin.remainingAmount);
  if (!Number.isNaN(remaining) && remaining <= PAYMENT_AMOUNT_TOLERANCE) {
    return true;
  }
  if (
    total > PAYMENT_AMOUNT_TOLERANCE &&
    Math.abs(total - received) <= PAYMENT_AMOUNT_TOLERANCE
  ) {
    return true;
  }
  return false;
};

const PendingPayment = () => {
  const { user } = useAuth();
  const { formatArea } = useAreaNameLookup();
  const employeeId = user?._id || user?.id;

  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState("info");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  const loadList = useCallback(
    async (pageNumber = 1) => {
      setLoadingList(true);
      try {
        const res = await purchaseOrderService.getAll({
          pageNumber,
          pageSize: 10,
          search: searchDebounced || undefined,
          employeeId: employeeId || undefined,
        });
        const payload = unwrapResponse(res);
        const data = payload?.data || payload;
        setRows(data?.purchaseOrders || []);
        setPagination(
          data?.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
          },
        );
      } catch (err) {
        toastError(err?.message || "Failed to load assigned sales orders");
        setRows([]);
      } finally {
        setLoadingList(false);
      }
    },
    [searchDebounced, employeeId],
  );

  useEffect(() => {
    loadList(page);
  }, [page, loadList]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetail(true);
    try {
      const res = await purchaseOrderService.getById(id);
      const payload = unwrapResponse(res);
      setDetail(payload?.data || payload);
    } catch (err) {
      toastError(err?.message || "Failed to load Sales Order");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      setDetailTab("info");
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const visibleRows = useMemo(
    () => rows.filter((row) => !isPoFullyPaid(row)),
    [rows],
  );

  const f = detail?.financials;
  const totalPages = pagination?.totalPages || 1;
  const st = String(detail?.paymentReceivedStatus || "none");
  const stBadge = PAYMENT_STATUS_BADGE[st] || PAYMENT_STATUS_BADGE.none;
  const ledgers = detail?.poPayment?.ledgers || [];

  return (
    <div className="position-relative">
      {loadingList && !selectedId && <Loader />}
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody>
              <div className="d-flex justify-content-between flex-wrap align-items-center mb-3">
                <div>
                  <h4 className="mb-1">Pending payment</h4>
                  <p className="text-body-secondary small mb-0">
                    Sales orders assigned to you, with received and pending
                    amounts from the Sales Order payment ledger.
                  </p>
                </div>
              </div>

              {!selectedId ? (
                <>
                  <CFormInput
                    className="mb-3"
                    placeholder="Search Sales Order code, company, product…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <CTable align="middle" className="mb-0" hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Sales Order</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          Total (incl. GST)
                        </CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          Received
                        </CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          Pending
                        </CTableHeaderCell>
                        <CTableHeaderCell>Due date</CTableHeaderCell>
                        <CTableHeaderCell>Payment</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          {" "}
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {visibleRows.length === 0 && !loadingList && (
                        <CTableRow>
                          <CTableDataCell
                            colSpan={8}
                            className="text-center text-body-secondary"
                          >
                            No sales orders with pending payment
                          </CTableDataCell>
                        </CTableRow>
                      )}
                      {visibleRows.map((row) => {
                        const fin = row?.financials || {};
                        const pst = String(
                          row?.paymentReceivedStatus || "none",
                        );
                        const b =
                          PAYMENT_STATUS_BADGE[pst] ||
                          PAYMENT_STATUS_BADGE.none;
                        return (
                          <CTableRow
                            key={row._id || row.id}
                            className="cursor-pointer"
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              setSelectedId(String(row._id || row.id))
                            }
                          >
                            <CTableDataCell className="fw-medium">
                              {row.poCode || "—"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {row.companyInfo?.name || "—"}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {formatAmount(fin.grandTotal)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {formatAmount(fin.totalPaid)}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {formatAmount(fin.remainingAmount)}
                            </CTableDataCell>
                            <CTableDataCell>
                              {dateFormatter(
                                computePaymentDueDate(row.createdAt),
                                "—",
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={b.color}>{b.label}</CBadge>
                            </CTableDataCell>
                            <CTableDataCell className="text-end text-primary">
                              View
                            </CTableDataCell>
                          </CTableRow>
                        );
                      })}
                    </CTableBody>
                  </CTable>
                  <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    wrapperClassName="d-flex justify-content-center mt-4"
                    align="center"
                  />
                </>
              ) : (
                <div>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <CButton
                      color="secondary"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedId(null);
                        setDetail(null);
                        loadList(page);
                      }}
                    >
                      <CIcon icon={cilArrowLeft} className="me-1" />
                      All Sales Orders
                    </CButton>
                    {loadingDetail ? (
                      <CSpinner size="sm" />
                    ) : (
                      <strong>{detail?.poCode || "—"}</strong>
                    )}
                    <CBadge color={stBadge.color}>{stBadge.label}</CBadge>
                  </div>
                  {loadingDetail ? (
                    <Loader />
                  ) : !detail ? (
                    <p className="text-body-secondary">Not found</p>
                  ) : (
                    <>
                      <CNav variant="tabs" className="mb-3">
                        <CNavItem>
                          <CNavLink
                            active={detailTab === "info"}
                            onClick={() => setDetailTab("info")}
                            style={{ cursor: "pointer" }}
                          >
                            Info
                          </CNavLink>
                        </CNavItem>
                        <CNavItem>
                          <CNavLink
                            active={detailTab === "payment"}
                            onClick={() => setDetailTab("payment")}
                            style={{ cursor: "pointer" }}
                          >
                            Payment
                          </CNavLink>
                        </CNavItem>
                      </CNav>
                      {detailTab === "info" && (
                        <div>
                          <CRow className="g-3 mb-3">
                            <CCol md={6}>
                              <div className="text-body-secondary small">
                                Company
                              </div>
                              <div>{detail.companyInfo?.name || "—"}</div>
                            </CCol>
                            <CCol md={6}>
                              <div className="text-body-secondary small">
                                Status
                              </div>
                              <div>{String(detail.status || "—")}</div>
                            </CCol>
                            <CCol md={6}>
                              <div className="text-body-secondary small">
                                Location / area
                              </div>
                              <div>
                                {(() => {
                                  const areaLabel = formatArea(
                                    detail.companyInfo?.area,
                                  );
                                  return (
                                    <>
                                      {detail.companyInfo?.location || "—"}
                                      {areaLabel ? ` · ${areaLabel}` : ""}
                                    </>
                                  );
                                })()}
                              </div>
                            </CCol>
                            <CCol md={6}>
                              <div className="text-body-secondary small">
                                Expected delivery
                              </div>
                              <div>
                                {detail.expectedDeliveryDate
                                  ? dateTimeFormatter(
                                      detail.expectedDeliveryDate,
                                      "-",
                                    )
                                  : "—"}
                              </div>
                            </CCol>
                            <CCol md={12}>
                              <div className="text-body-secondary small">
                                Remark
                              </div>
                              <div>{detail.remark || "—"}</div>
                            </CCol>
                          </CRow>
                          <h6>Products</h6>
                          <CTable size="sm" responsive bordered>
                            <CTableHead>
                              <CTableRow>
                                <CTableHeaderCell>Product</CTableHeaderCell>
                                <CTableHeaderCell className="text-end">
                                  Qty
                                </CTableHeaderCell>
                                <CTableHeaderCell className="text-end">
                                  Rate
                                </CTableHeaderCell>
                                <CTableHeaderCell>Unit</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {(detail.products || []).map((p) => (
                                <CTableRow key={p._id || p.rawProductCode}>
                                  <CTableDataCell>
                                    {p.productName || "—"}
                                  </CTableDataCell>
                                  <CTableDataCell className="text-end">
                                    {p.quantity ?? "—"}
                                  </CTableDataCell>
                                  <CTableDataCell className="text-end">
                                    {p.rate != null
                                      ? formatAmount(p.rate)
                                      : "—"}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {p.unit || "—"}
                                  </CTableDataCell>
                                </CTableRow>
                              ))}
                            </CTableBody>
                          </CTable>
                          <h6 className="mt-4">Attachment (Sales Order)</h6>
                          {detail.attachmentDocumentId &&
                          detail.attachmentDocumentId.path ? (
                            <CButton
                              color="link"
                              className="p-0"
                              onClick={() =>
                                window.open(
                                  getAssetsUrl(
                                    detail.attachmentDocumentId.path,
                                  ),
                                  "_blank",
                                  "noopener",
                                )
                              }
                            >
                              {detail.attachmentDocumentId.originalName ||
                                "View attachment"}
                            </CButton>
                          ) : (
                            <span className="text-body-secondary">—</span>
                          )}
                        </div>
                      )}
                      {detailTab === "payment" && (
                        <div>
                          <CRow className="g-3 mb-4">
                            <CCol sm={4}>
                              <CCard className="h-100">
                                <CCardBody>
                                  <div className="text-body-secondary small">
                                    Total amount
                                  </div>
                                  <div className="fs-5 fw-semibold">
                                    {formatAmount(f?.grandTotal)}
                                  </div>
                                </CCardBody>
                              </CCard>
                            </CCol>
                            <CCol sm={4}>
                              <CCard className="h-100">
                                <CCardBody>
                                  <div className="text-body-secondary small">
                                    Amount received
                                  </div>
                                  <div className="fs-5 fw-semibold text-success">
                                    {formatAmount(f?.totalPaid)}
                                  </div>
                                </CCardBody>
                              </CCard>
                            </CCol>
                            <CCol sm={4}>
                              <CCard className="h-100">
                                <CCardBody>
                                  <div className="text-body-secondary small">
                                    Pending
                                  </div>
                                  <div className="fs-5 fw-semibold text-warning">
                                    {formatAmount(f?.remainingAmount)}
                                  </div>
                                </CCardBody>
                              </CCard>
                            </CCol>
                          </CRow>
                          <h6 className="mb-2">Payment ledger (company)</h6>
                          <CTable responsive bordered>
                            <CTableHead>
                              <CTableRow>
                                <CTableHeaderCell>Date</CTableHeaderCell>
                                <CTableHeaderCell className="text-end">
                                  Amount
                                </CTableHeaderCell>
                                <CTableHeaderCell>Remark</CTableHeaderCell>
                                <CTableHeaderCell>Proof</CTableHeaderCell>
                                <CTableHeaderCell>Recorded by</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {ledgers.length === 0 && (
                                <CTableRow>
                                  <CTableDataCell
                                    colSpan={5}
                                    className="text-center text-body-secondary"
                                  >
                                    No payments recorded yet.
                                  </CTableDataCell>
                                </CTableRow>
                              )}
                              {ledgers.map((L) => (
                                <CTableRow
                                  key={L._id || `${L.paidAt}-${L.amount}`}
                                >
                                  <CTableDataCell>
                                    {dateTimeFormatter(L.paidAt, "-")}
                                  </CTableDataCell>
                                  <CTableDataCell className="text-end text-success fw-medium">
                                    {formatAmount(L.amount)}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {L.remark || "—"}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {L.paymentProofDocumentId?.path ? (
                                      <CButton
                                        color="link"
                                        size="sm"
                                        className="p-0"
                                        onClick={() =>
                                          window.open(
                                            getAssetsUrl(
                                              L.paymentProofDocumentId.path,
                                            ),
                                            "_blank",
                                            "noopener",
                                          )
                                        }
                                      >
                                        Open
                                      </CButton>
                                    ) : (
                                      "—"
                                    )}
                                  </CTableDataCell>
                                  <CTableDataCell>
                                    {L.recordedBy?.name ||
                                      (L.recordedBy && String(L.recordedBy)) ||
                                      "—"}
                                  </CTableDataCell>
                                </CTableRow>
                              ))}
                            </CTableBody>
                          </CTable>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default PendingPayment;
