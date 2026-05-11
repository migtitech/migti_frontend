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
import documentService from "../../services/documentService";
import { getAssetsUrl } from "../../api/endpoints";
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

const isImageMime = (mime) => !!mime && /^image\//i.test(String(mime));

/** Preview URL for PO line `attachmentDocumentId` when it is an image. */
const lineProductImageUrl = (att) => {
  if (!att || typeof att !== "object") return null;
  const path = att.path;
  if (!path) return null;
  if (
    isImageMime(att.mimeType) ||
    /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(path))
  ) {
    return path.startsWith("http://") || path.startsWith("https://")
      ? path
      : getAssetsUrl(path);
  }
  return null;
};

const BillingRequestList = () => {
  const { canUpdate } = usePermissions();
  const canAct = canUpdate("billing_request");

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
  const [rejecting, setRejecting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

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

  const onUploadProof = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !detailId || !canAct) return;
    setUploadingProof(true);
    try {
      const up = await documentService.uploadAttachments([file]);
      const docs = up?.data?.documents || up?.documents || [];
      const first = docs[0];
      if (!first?._id) {
        toastError("Upload did not return a document id");
        return;
      }
      const res = await purchaseBillingRequestService.setProof(
        detailId,
        String(first._id),
      );
      const d = unwrapPayload(res);
      if (d) setDetail(d);
      toastSuccess("Proof saved");
      load();
    } catch (err) {
      toastError(err?.message || "Could not save proof");
    } finally {
      setUploadingProof(false);
    }
  };

  const onClearProof = async () => {
    if (!detailId || !canAct) return;
    setUploadingProof(true);
    try {
      const res = await purchaseBillingRequestService.setProof(detailId, null);
      const d = unwrapPayload(res);
      if (d) setDetail(d);
      toastSuccess("Proof removed");
      load();
    } catch (err) {
      toastError(err?.message || "Could not remove proof");
    } finally {
      setUploadingProof(false);
    }
  };

  const onApprove = async () => {
    if (!detailId || !canAct) return;
    if (!proofDocIsImage(detail?.proofDocument)) {
      toastError(
        "Upload a payment proof image before approving this billing request.",
      );
      return;
    }
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

  const onReject = async () => {
    if (!detailId || !canAct) return;
    if (remarkWordCount < 10) {
      toastError("Reject remark must contain at least 10 words.");
      return;
    }
    setRejecting(true);
    try {
      const res = await purchaseBillingRequestService.reject(
        detailId,
        remarkDraft,
      );
      const d = unwrapPayload(res);
      if (d) {
        setDetail((prev) => (prev ? { ...prev, ...d } : d));
        setRemarkDraft(String(d.statusRemark || ""));
      }
      toastSuccess("Billing request rejected");
      load();
    } catch (e) {
      toastError(e?.message || "Could not reject");
    } finally {
      setRejecting(false);
    }
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const isPending = String(detail?.status || "").toLowerCase() === "pending";
  const proofDocIsImage = (p) => {
    if (!p?.url) return false;
    if (isImageMime(p.mimeType)) return true;
    return /\.(jpe?g|png|gif|webp|bmp)$/i.test(String(p.originalName || ""));
  };
  const hasPaymentProof = proofDocIsImage(detail?.proofDocument);
  const remarkWordCount = String(remarkDraft || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const canReject = remarkWordCount >= 10;

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

              {(() => {
                const att = detail.poProductId?.attachmentDocumentId;
                const imgSrc = lineProductImageUrl(att);
                if (imgSrc) {
                  return (
                    <div className="mb-3">
                      <div className="small text-body-secondary mb-1">
                        Product image (PO line)
                      </div>
                      <img
                        src={imgSrc}
                        alt="Product"
                        className="rounded border"
                        style={{ maxHeight: 200, maxWidth: "100%" }}
                      />
                    </div>
                  );
                }
                if (att?.path) {
                  const href =
                    typeof att.path === "string" &&
                    att.path.startsWith("http")
                      ? att.path
                      : getAssetsUrl(att.path);
                  return (
                    <p className="mb-3 small">
                      <strong>Product attachment:</strong>{" "}
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {att.originalName || "Open file"}
                      </a>
                    </p>
                  );
                }
                return null;
              })()}

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

              <div className="mb-3">
                <div className="small text-body-secondary mb-1">
                  Payment proof (image)
                  {isPending ? (
                    <span className="text-danger ms-1" aria-hidden>
                      *
                    </span>
                  ) : null}
                  {isPending ? (
                    <span className="visually-hidden">
                      {" "}
                      required before approval
                    </span>
                  ) : null}
                </div>
                {detail.proofDocument?.url &&
                isImageMime(detail.proofDocument.mimeType) ? (
                  <div className="mb-2">
                    <img
                      src={detail.proofDocument.url}
                      alt={detail.proofDocument.originalName || "Proof"}
                      className="rounded border"
                      style={{ maxHeight: 200, maxWidth: "100%" }}
                    />
                  </div>
                ) : null}
                {detail.proofDocument?.url ? (
                  <p className="mb-2 small">
                    <a
                      href={detail.proofDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {detail.proofDocument.originalName || "Open proof"}
                    </a>
                  </p>
                ) : null}
                {canAct ? (
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <CFormInput
                      type="file"
                      id="br-proof-file"
                      className="d-none"
                      accept="image/*"
                      disabled={uploadingProof || !isPending}
                      onChange={onUploadProof}
                    />
                    <CButton
                      color="primary"
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={uploadingProof || !isPending}
                      onClick={() =>
                        document.getElementById("br-proof-file")?.click()
                      }
                    >
                      {uploadingProof ? "Working…" : "Upload proof"}
                    </CButton>
                    {detail.proofDocument?.url && isPending ? (
                      <CButton
                        color="danger"
                        variant="ghost"
                        size="sm"
                        type="button"
                        disabled={uploadingProof}
                        onClick={onClearProof}
                      >
                        Remove proof
                      </CButton>
                    ) : null}
                    {uploadingProof ? (
                      <CSpinner size="sm" className="ms-1" />
                    ) : null}
                  </div>
                ) : null}
              </div>

              {detail.approvedAt ? (
                <p className="mb-2 small text-body-secondary">
                  Approved {formatDateDdMmYyyy(detail.approvedAt)}
                  {detail.approvedBy?.name
                    ? ` · ${detail.approvedBy.name}`
                    : ""}
                </p>
              ) : null}

              <CFormLabel>Remark</CFormLabel>
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
                <>
                  <CButton
                    color="secondary"
                    className="mb-2 w-100"
                    disabled={savingRemark}
                    onClick={onSaveRemark}
                  >
                    {savingRemark ? "Saving…" : "Save remark"}
                  </CButton>
                  <CRow className="g-2">
                    <CCol xs={6}>
                      <CButton
                        color="success"
                        className="w-100"
                        disabled={approving || rejecting || !hasPaymentProof}
                        onClick={onApprove}
                      >
                        {approving ? "Approving…" : "Approve"}
                      </CButton>
                    </CCol>
                    <CCol xs={6}>
                      <CButton
                        color="danger"
                        className="w-100"
                        disabled={approving || rejecting || !canReject}
                        onClick={onReject}
                        title={
                          !canReject
                            ? "Add a remark with at least 10 words to reject"
                            : undefined
                        }
                      >
                        {rejecting ? "Rejecting…" : "Reject"}
                      </CButton>
                    </CCol>
                  </CRow>
                </>
              )}
            </>
          )}
        </COffcanvasBody>
      </COffcanvas>
    </CRow>
  );
};

export default BillingRequestList;
