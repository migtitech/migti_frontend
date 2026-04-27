import React, { useEffect, useState } from "react";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
  CCloseButton,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilMoney } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import purchaseBillingRequestService from "../../services/purchaseBillingRequestService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader } from "../../components";
import usePermissions from "../../hooks/usePermissions";

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const statusBadge = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "approved") return <CBadge color="success">Approved</CBadge>;
  if (v === "rejected") return <CBadge color="danger">Rejected</CBadge>;
  if (v === "pending") return <CBadge color="warning">Pending</CBadge>;
  return <CBadge color="secondary">{s || "—"}</CBadge>;
};

const unwrapPayload = (res) => {
  const inner = res?.data ?? res;
  return inner?.data ?? inner;
};

const BillingRequestList = () => {
  const { canUpdate } = usePermissions();
  const canAct = canUpdate("request");

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [poCode, setPoCode] = useState("");
  const [poCodeDebounced, setPoCodeDebounced] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPoCodeDebounced(poCode), 400);
    return () => clearTimeout(t);
  }, [poCode]);

  useEffect(() => {
    setPage(1);
  }, [poCodeDebounced, from, to]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        purchaseBillingRequestService.list({
          pageNumber: page,
          pageSize,
          poCode: poCodeDebounced.trim() || undefined,
          dateFrom: from || undefined,
          dateTo: to || undefined,
        }),
      );
      const data = unwrapPayload(res);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setPagination(
        data?.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: pageSize,
        },
      );
    } catch (e) {
      toastError(e?.message || "Failed to load billing requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, poCodeDebounced, from, to]);

  const openDetail = async (id) => {
    setDetailId(id);
    setDetailOpen(true);
    setDetail(null);
    setRemarkDraft("");
    setDetailLoading(true);
    try {
      const res = await purchaseBillingRequestService.getById(id);
      const d = unwrapPayload(res);
      setDetail(d);
      setRemarkDraft(String(d?.statusRemark || ""));
    } catch (e) {
      toastError(e?.message || "Failed to load details");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId(null);
    setDetail(null);
    setRemarkDraft("");
  };

  const onSaveRemark = async () => {
    if (!detailId || !canAct) return;
    setSavingRemark(true);
    try {
      const res = await purchaseBillingRequestService.saveRemark(
        detailId,
        remarkDraft,
      );
      const d = unwrapPayload(res);
      if (d) {
        setDetail((prev) => (prev ? { ...prev, ...d } : d));
        setRemarkDraft(String(d.statusRemark || ""));
      }
      toastSuccess("Remark saved");
      load();
    } catch (e) {
      toastError(e?.message || "Could not save remark");
    } finally {
      setSavingRemark(false);
    }
  };

  const onApprove = async () => {
    if (!detailId || !canAct) return;
    setApproving(true);
    try {
      const res = await purchaseBillingRequestService.approve(
        detailId,
        remarkDraft,
      );
      const d = unwrapPayload(res);
      if (d) {
        setDetail((prev) => (prev ? { ...prev, ...d } : d));
        setRemarkDraft(String(d.statusRemark || ""));
      }
      toastSuccess("Billing request approved");
      load();
    } catch (e) {
      toastError(e?.message || "Could not approve");
    } finally {
      setApproving(false);
    }
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const isPending = String(detail?.status || "").toLowerCase() === "pending";

  return (
    <CRow>
      <CCol xs={12}>
        <CBreadcrumb className="mb-2">
          <CBreadcrumbItem href="#/dashboard">Home</CBreadcrumbItem>
          <CBreadcrumbItem active>Billing request</CBreadcrumbItem>
        </CBreadcrumb>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between">
            <span>
              <CIcon icon={cilMoney} className="me-2" />
              Billing request
            </span>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              <CCol md={4}>
                <CFormLabel>PO number</CFormLabel>
                <CFormInput
                  placeholder="Search by PO number"
                  value={poCode}
                  onChange={(e) => setPoCode(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>From date</CFormLabel>
                <CFormInput
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>To date</CFormLabel>
                <CFormInput
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </CCol>
            </CRow>

            {loading ? (
              <div className="text-center py-5">
                <Loader />
              </div>
            ) : (
              <>
                <CTable align="middle" responsive hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">PO</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Company</CTableHeaderCell>
                      <CTableHeaderCell scope="col">
                        Product / line
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col">Amount</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Raised</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Action
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
                          No billing requests found.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      rows.map((r) => (
                        <CTableRow key={r._id}>
                          <CTableDataCell>
                            <code>{r.poCode || "—"}</code>
                          </CTableDataCell>
                          <CTableDataCell>
                            {r.companyName || "—"}
                          </CTableDataCell>
                          <CTableDataCell>
                            <div>{r.productName || "—"}</div>
                            <small className="text-body-secondary">
                              Line {r.lineIndex}
                            </small>
                          </CTableDataCell>
                          <CTableDataCell>
                            {typeof r.amount === "number"
                              ? r.amount.toLocaleString()
                              : "—"}
                          </CTableDataCell>
                          <CTableDataCell>
                            {statusBadge(r.status)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatDateDdMmYyyy(r.createdAt)}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            <CButton
                              size="sm"
                              color="primary"
                              variant="outline"
                              onClick={() => openDetail(r._id)}
                            >
                              View
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
                {pagination.totalItems > 0 && (
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
                    <span className="text-body-secondary small">
                      {pagination.totalItems} total
                    </span>
                    <CPagination className="mb-0">
                      <CPaginationItem
                        disabled={page <= 1}
                        onClick={() => page > 1 && setPage(page - 1)}
                        style={{ cursor: page <= 1 ? "default" : "pointer" }}
                      >
                        Prev
                      </CPaginationItem>
                      <CPaginationItem active>{page}</CPaginationItem>
                      <CPaginationItem
                        disabled={page >= totalPages}
                        onClick={() => page < totalPages && setPage(page + 1)}
                        style={{
                          cursor: page >= totalPages ? "default" : "pointer",
                        }}
                      >
                        Next
                      </CPaginationItem>
                    </CPagination>
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <COffcanvas
        placement="end"
        visible={detailOpen}
        onHide={closeDetail}
        scroll
      >
        <COffcanvasHeader className="d-flex align-items-center justify-content-between">
          <COffcanvasTitle>Billing request</COffcanvasTitle>
          <CCloseButton className="ms-2" onClick={closeDetail} />
        </COffcanvasHeader>
        <COffcanvasBody>
          {detailLoading ? (
            <div className="text-center py-5">
              <CSpinner />
            </div>
          ) : !detail ? (
            <p className="text-body-secondary">No data.</p>
          ) : (
            <>
              <p className="mb-1">
                <strong>PO:</strong> <code>{detail.poCode || "—"}</code>
              </p>
              <p className="mb-1">
                <strong>Status:</strong> {statusBadge(detail.status)}
              </p>
              <p className="mb-1">
                <strong>Amount:</strong>{" "}
                {typeof detail.amount === "number"
                  ? detail.amount.toLocaleString()
                  : "—"}
              </p>
              <p className="mb-1">
                <strong>Raised:</strong> {formatDateDdMmYyyy(detail.createdAt)}{" "}
                ·{" "}
                <span className="text-body-secondary">
                  {detail.createdByName || "—"}
                </span>
              </p>
              <p className="mb-3">
                <strong>Product:</strong> {detail.productName || "—"}{" "}
                <span className="text-body-secondary">
                  (line {detail.lineIndex})
                </span>
              </p>

              {detail.billDocument?.url ? (
                <p className="mb-3">
                  <strong>Bill:</strong>{" "}
                  <a
                    href={detail.billDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {detail.billDocument.originalName || "Open attachment"}
                  </a>
                </p>
              ) : null}

              {detail.approvedAt ? (
                <p className="mb-2 small text-body-secondary">
                  Approved {formatDateDdMmYyyy(detail.approvedAt)}
                  {detail.approvedBy?.name
                    ? ` · ${detail.approvedBy.name}`
                    : ""}
                </p>
              ) : null}

              <CFormLabel>Remark (stored on request)</CFormLabel>
              <CFormTextarea
                rows={4}
                value={remarkDraft}
                onChange={(e) => setRemarkDraft(e.target.value)}
                disabled={!canAct || !isPending}
                placeholder={
                  isPending ? "Add a remark" : "Not editable (not pending)"
                }
                className="mb-2"
              />
              {canAct && isPending && (
                <div className="d-flex flex-column gap-2">
                  <CButton
                    color="secondary"
                    disabled={savingRemark}
                    onClick={onSaveRemark}
                  >
                    {savingRemark ? "Saving…" : "Save remark"}
                  </CButton>
                  <CButton
                    color="success"
                    disabled={approving}
                    onClick={onApprove}
                  >
                    {approving ? "Approving…" : "Approve"}
                  </CButton>
                </div>
              )}
            </>
          )}
        </COffcanvasBody>
      </COffcanvas>
    </CRow>
  );
};

export default BillingRequestList;
