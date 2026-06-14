import React, { useCallback, useEffect, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CNav,
  CNavItem,
  CNavLink,
  CPagination,
  CPaginationItem,
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
import { cilArrowLeft, cilX } from "@coreui/icons";
import { getAssetsUrl } from "../../api/endpoints";
import documentService from "../../services/documentService";
import poPaymentService from "../../services/poPaymentService";
import purchaseOrderService from "../../services/purchaseOrderService";
import usePermissions from "../../hooks/usePermissions";
import { ROLE_LABELS } from "../../context/AuthContext";
import { Loader } from "../../components";
import { toastError, toastSuccess } from "../../utils/toast";

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === "object") return response.data;
  return response || {};
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getTodayInputDate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatEmployeeRole = (role) => {
  if (!role) return "—";
  const key = String(role).trim();
  return ROLE_LABELS[key] || key.replace(/_/g, " ");
};

const PAYMENT_STATUS_BADGE = {
  none: { label: "No payment", color: "secondary" },
  partial_payment_received: { label: "Partial", color: "warning" },
  full_payment_received: { label: "Full", color: "success" },
};

const PoPaymentSidebar = () => {
  const { canUpdate } = usePermissions();
  const canAddPayment = canUpdate("po_payment");

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

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    remark: "",
    paidAt: getTodayInputDate(),
  });

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
        toastError(err?.message || "Failed to load sales orders");
        setRows([]);
      } finally {
        setLoadingList(false);
      }
    },
    [searchDebounced],
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

  const onOpenAdd = () => {
    setForm({
      amount: "",
      remark: "",
      paidAt: getTodayInputDate(),
    });
    setProofFile(null);
    setAddOpen(true);
  };

  const onSubmitPayment = async () => {
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toastError("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      let paymentProofDocumentId = null;
      if (proofFile) {
        setUploading(true);
        const ures = await documentService.uploadAttachments([proofFile]);
        const pld = ures?.data || ures;
        const docs = pld?.data?.documents || pld?.documents || [];
        const first = docs[0];
        const docId = first?._id || first?.id;
        if (!docId) {
          toastError("Could not upload proof file");
          setUploading(false);
          setSaving(false);
          return;
        }
        paymentProofDocumentId = String(docId);
        setUploading(false);
      }

      const time =
        form.paidAt && form.paidAt.length >= 8
          ? new Date(form.paidAt + "T12:00:00.000Z").toISOString()
          : new Date().toISOString();
      const res = await poPaymentService.appendLedger(selectedId, {
        amount,
        remark: (form.remark || "").trim(),
        paidAt: time,
        paymentProofDocumentId,
      });
      const u = unwrapResponse(res);
      if (u?.success === false) {
        toastError(u?.message || "Failed");
        return;
      }
      toastSuccess("Payment recorded");
      setAddOpen(false);
      setProofFile(null);
      loadDetail(selectedId);
      loadList(pagination.currentPage);
    } catch (err) {
      toastError(err?.message || "Failed to add payment");
    } finally {
      setSaving(false);
    }
  };

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
                  <h4 className="mb-1">Sales Order payment</h4>
                  <p className="text-body-secondary small mb-0">
                    Track and record company payments against sales orders.
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
                        <CTableHeaderCell>Payment</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          {" "}
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {rows.length === 0 && !loadingList && (
                        <CTableRow>
                          <CTableDataCell
                            colSpan={7}
                            className="text-center text-body-secondary"
                          >
                            No sales orders
                          </CTableDataCell>
                        </CTableRow>
                      )}
                      {rows.map((row) => {
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
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-end mt-3">
                      <CPagination
                        align="end"
                        className="mb-0"
                        aria-label="Sales Order pages"
                      >
                        <CPaginationItem
                          disabled={page <= 1}
                          onClick={() => page > 1 && setPage((p) => p - 1)}
                        >
                          Previous
                        </CPaginationItem>
                        <CPaginationItem active>
                          {page} / {totalPages}
                        </CPaginationItem>
                        <CPaginationItem
                          disabled={page >= totalPages}
                          onClick={() =>
                            page < totalPages && setPage((p) => p + 1)
                          }
                        >
                          Next
                        </CPaginationItem>
                      </CPagination>
                    </div>
                  )}
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
                            active={detailTab === "employee"}
                            onClick={() => setDetailTab("employee")}
                            style={{ cursor: "pointer" }}
                          >
                            Employee
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
                                Date of Sales Order received
                              </div>
                              <div>
                                {formatDate(
                                  detail.poReceivedDate || detail.createdAt,
                                )}
                              </div>
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
                      {detailTab === "employee" && (
                        <div>
                          {(() => {
                            const sales = detail.salesEmployeeId;
                            const created = detail.created_by;
                            const snap = detail.assigned_employee;
                            const salesId =
                              sales &&
                              typeof sales === "object" &&
                              (sales._id || sales.id)
                                ? String(sales._id || sales.id)
                                : null;
                            const createdId =
                              created &&
                              typeof created === "object" &&
                              (created._id || created.id)
                                ? String(created._id || created.id)
                                : null;
                            const rows = [];
                            if (sales && typeof sales === "object") {
                              rows.push({
                                key: "sales",
                                label: "Sales employee",
                                name: sales.name,
                                role: sales.role,
                                phone: sales.phone,
                                email: sales.email,
                              });
                            }
                            if (
                              created &&
                              typeof created === "object" &&
                              (!salesId || !createdId || salesId !== createdId)
                            ) {
                              rows.push({
                                key: "created",
                                label: "Created by",
                                name: created.name,
                                role: created.role,
                                phone: created.phone,
                                email: created.email,
                              });
                            }
                            const snapName =
                              snap && typeof snap === "object"
                                ? snap.name || snap.employeeName
                                : null;
                            const hasSnap =
                              snap &&
                              typeof snap === "object" &&
                              (snapName ||
                                snap.phone ||
                                snap.email ||
                                snap.role);
                            if (hasSnap) {
                              rows.push({
                                key: "snapshot",
                                label: "Assigned (snapshot)",
                                name: snapName || "—",
                                role: snap.role,
                                phone: snap.phone,
                                email: snap.email,
                              });
                            }
                            if (rows.length === 0) {
                              return (
                                <p className="text-body-secondary mb-0">
                                  No employee information on this sales order.
                                </p>
                              );
                            }
                            return (
                              <CTable responsive bordered className="mb-0">
                                <CTableHead>
                                  <CTableRow>
                                    <CTableHeaderCell>
                                      Employee
                                    </CTableHeaderCell>
                                    <CTableHeaderCell>Name</CTableHeaderCell>
                                    <CTableHeaderCell>Role</CTableHeaderCell>
                                    <CTableHeaderCell>Phone</CTableHeaderCell>
                                    <CTableHeaderCell>Email</CTableHeaderCell>
                                  </CTableRow>
                                </CTableHead>
                                <CTableBody>
                                  {rows.map((r) => (
                                    <CTableRow key={r.key}>
                                      <CTableDataCell className="text-body-secondary small">
                                        {r.label}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {r.name || "—"}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {formatEmployeeRole(r.role)}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {r.phone || "—"}
                                      </CTableDataCell>
                                      <CTableDataCell>
                                        {r.email || "—"}
                                      </CTableDataCell>
                                    </CTableRow>
                                  ))}
                                </CTableBody>
                              </CTable>
                            );
                          })()}
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
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Payment ledger (company)</h6>
                            {canAddPayment && (
                              <CButton
                                color="primary"
                                size="sm"
                                onClick={onOpenAdd}
                              >
                                Add payment
                              </CButton>
                            )}
                          </div>
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
                                    No payments recorded yet. Use &quot;Add
                                    payment&quot; to record the first entry.
                                  </CTableDataCell>
                                </CTableRow>
                              )}
                              {ledgers.map((L) => (
                                <CTableRow
                                  key={L._id || `${L.paidAt}-${L.amount}`}
                                >
                                  <CTableDataCell>
                                    {formatDateTime(L.paidAt)}
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
      {addOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 1080, pointerEvents: "all" }}
        >
          <button
            type="button"
            className="position-absolute top-0 start-0 w-100 h-100 border-0 p-0"
            style={{ background: "rgba(0,0,0,0.4)", cursor: "pointer" }}
            aria-label="Close overlay"
            onClick={() => !saving && setAddOpen(false)}
          />
          <div
            className="position-absolute top-0 h-100 bg-body border-start shadow d-flex flex-column"
            style={{
              right: 0,
              width: "min(100%, 480px)",
              zIndex: 1,
            }}
          >
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
              <span className="fw-semibold">Add payment</span>
              <CButton
                color="secondary"
                variant="ghost"
                size="sm"
                onClick={() => !saving && setAddOpen(false)}
                className="p-0"
                aria-label="Close"
              >
                <CIcon icon={cilX} />
              </CButton>
            </div>
            <div className="flex-grow-1 p-3 overflow-auto">
              <CFormLabel>Amount (₹)</CFormLabel>
              <CFormInput
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                className="mb-3"
              />
              <CFormLabel>Payment date</CFormLabel>
              <CFormInput
                type="date"
                value={form.paidAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paidAt: e.target.value }))
                }
                className="mb-3"
              />
              <CFormLabel>Remark</CFormLabel>
              <CFormTextarea
                value={form.remark}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remark: e.target.value }))
                }
                className="mb-3"
                rows={2}
              />
              <CFormLabel>Payment proof (optional)</CFormLabel>
              <CFormInput
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  setProofFile(e?.target?.files?.[0] || null);
                }}
                className="mb-3"
              />
              {uploading && <div className="mb-2 small">Uploading…</div>}
              <CButton
                color="primary"
                disabled={saving}
                onClick={onSubmitPayment}
              >
                {saving ? "Saving…" : "Save payment"}
              </CButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoPaymentSidebar;
