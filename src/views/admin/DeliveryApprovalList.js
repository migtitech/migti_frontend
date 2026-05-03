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
import { cilCheckCircle } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import deliveryApprovalService from "../../services/deliveryApprovalService";
import { getAssetsUrl } from "../../api/endpoints";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader } from "../../components";

const serverStatus = (d) => d?.status ?? d?.inventoryStatus;

const STATUS_LABELS = {
  inventory_received: "Inventory received",
  ready_for_dispatchment: "Ready for dispatchment",
  delivered: "Delivered",
  pending: "Pending",
  purchased: "Purchased",
};

const STATUS_COLORS = {
  inventory_received: "success",
  ready_for_dispatchment: "primary",
  delivered: "info",
  pending: "warning",
  purchased: "info",
};

const statusBadge = (s) => {
  if (s === undefined || s === null || s === "")
    return (
      <CBadge color="light" className="text-dark">
        —
      </CBadge>
    );
  const v = String(s).trim();
  if (STATUS_LABELS[v]) {
    return (
      <CBadge color={STATUS_COLORS[v] || "secondary"}>
        {STATUS_LABELS[v]}
      </CBadge>
    );
  }
  const readable = v
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return <CBadge color="secondary">{readable}</CBadge>;
};

const formatDateDdMmYyyy = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const formatAddress = (c) => {
  if (!c || typeof c !== "object") return "—";
  const parts = [
    c.name,
    [c.area, c.location].filter(Boolean).join(", "),
    c.address,
  ].filter((p) => p && String(p).trim());
  return parts.length ? parts.join(" · ") : "—";
};

const formatPm = (c) => {
  const pms = c?.purchaseManagers;
  if (!Array.isArray(pms) || !pms.length) return "—";
  return pms
    .map((pm) => {
      const bits = [pm?.name, pm?.phone, pm?.email].filter(
        (x) => x && String(x).trim(),
      );
      return bits.join(" · ");
    })
    .filter(Boolean)
    .join(" | ");
};

const parseListResponse = (res) => {
  if (!res || typeof res !== "object") {
    return {
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };
  }
  const block = res.data;
  if (!block || typeof block !== "object") {
    return {
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };
  }
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const docOpenUrl = (doc) => {
  if (!doc || typeof doc !== "object") return "";
  const p = doc.path || doc.url;
  return p ? getAssetsUrl(p) : "";
};

const DocumentPreview = ({ doc, title }) => {
  if (!doc || typeof doc !== "object") return null;
  const url = docOpenUrl(doc);
  if (!url) return null;
  const mime = String(doc.mimeType || "");
  const isImg = mime.startsWith("image/");
  const name = doc.originalName || "Open file";
  return (
    <div className="mb-3">
      <CFormLabel className="fw-semibold">{title}</CFormLabel>
      {isImg ? (
        <div className="mb-2">
          <img
            src={url}
            alt=""
            className="img-fluid rounded border"
            style={{ maxHeight: 260 }}
          />
        </div>
      ) : null}
      <CButton
        color="link"
        className="p-0 d-block"
        onClick={() => window.open(url, "_blank", "noopener")}
      >
        {name}
      </CButton>
    </div>
  );
};

const DeliveryApprovalList = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, from, to]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        deliveryApprovalService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
    } catch (e) {
      toastError(e?.message || "Failed to load delivery approval queue");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, searchDebounced, from, to]);

  const openDetail = async (id) => {
    setDetailId(id);
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await deliveryApprovalService.getById(id);
      const doc = res?.data;
      setDetail(
        doc && typeof doc === "object" && !Array.isArray(doc) ? doc : null,
      );
    } catch (e) {
      toastError(e?.message || "Failed to load line");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId(null);
    setDetail(null);
  };

  const approve = async () => {
    if (!detailId) return;
    setApproving(true);
    try {
      const res = await deliveryApprovalService.approveDelivery(detailId);
      const payload = res?.data;
      if (payload && payload.success === false) {
        toastError(payload?.message || "Update failed");
        return;
      }
      toastSuccess("Delivery approved by HOD");
      closeDetail();
      await load();
    } catch (e) {
      toastError(e?.message || "Update failed");
    } finally {
      setApproving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const itemCompany = detail?.companyInfo;
  const pbr = detail?.purchaseBillingRequestId;

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-3">
          <CCardBody className="py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <CBreadcrumb className="mb-0">
              <CBreadcrumbItem href="#/">Home</CBreadcrumbItem>
              <CBreadcrumbItem active>Delivery approval</CBreadcrumbItem>
            </CBreadcrumb>
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader className="d-flex flex-wrap align-items-center gap-2">
            <CIcon icon={cilCheckCircle} className="text-primary" />
            <strong>Delivery approval</strong>
            <span className="text-body-secondary small">
              Lines marked delivered and awaiting HOD sign-off (
              <code>hod_approval_pending</code>)
            </span>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              <CCol xs={12} md={4}>
                <CFormLabel>Search</CFormLabel>
                <CFormInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Product name, PO number, or raw product code"
                />
              </CCol>
              <CCol xs={6} md={2}>
                <CFormLabel>From</CFormLabel>
                <CFormInput
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </CCol>
              <CCol xs={6} md={2}>
                <CFormLabel>To</CFormLabel>
                <CFormInput
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </CCol>
            </CRow>

            {loading ? (
              <Loader />
            ) : (
              <>
                <CTable responsive striped hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Product</CTableHeaderCell>
                      <CTableHeaderCell>PO number</CTableHeaderCell>
                      <CTableHeaderCell>Raw code</CTableHeaderCell>
                      <CTableHeaderCell>Company & address</CTableHeaderCell>
                      <CTableHeaderCell>Purchase manager</CTableHeaderCell>
                      <CTableHeaderCell>Dispatch</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Delivery sub-status</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">
                        Actions
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rows.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell
                          colSpan={9}
                          className="text-body-secondary"
                        >
                          No lines awaiting HOD delivery approval.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      rows.map((row) => (
                        <CTableRow key={row._id}>
                          <CTableDataCell>
                            <span className="text-break">
                              {row.productName || "—"}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>{row.poCode || "—"}</CTableDataCell>
                          <CTableDataCell>
                            {row.rawProductCode ? (
                              <code>{row.rawProductCode}</code>
                            ) : (
                              "—"
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <small
                              className="text-break d-block"
                              style={{ maxWidth: 280 }}
                            >
                              {formatAddress(row.companyInfo)}
                            </small>
                          </CTableDataCell>
                          <CTableDataCell>
                            <small
                              className="text-break d-block"
                              style={{ maxWidth: 220 }}
                            >
                              {formatPm(row.companyInfo)}
                            </small>
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatDateDdMmYyyy(row.dispatchmentDate)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {statusBadge(serverStatus(row))}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color="warning">HOD approval pending</CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-end text-nowrap">
                            <CButton
                              size="sm"
                              color="secondary"
                              variant="ghost"
                              onClick={() => openDetail(row._id)}
                            >
                              View
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-center mt-4">
                    <CPagination align="center" aria-label="Delivery approval pages">
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
          <COffcanvasTitle>PO line — delivery approval</COffcanvasTitle>
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
              <h6 className="mb-3">Product &amp; PO</h6>
              <p className="mb-1">
                <strong>Product:</strong> {detail.productName || "—"}
              </p>
              <p className="mb-1">
                <strong>PO number:</strong> {detail.poCode || "—"}
              </p>
              <p className="mb-1">
                <strong>Raw product code:</strong>{" "}
                {detail.rawProductCode ? (
                  <code>{detail.rawProductCode}</code>
                ) : (
                  "—"
                )}
              </p>
              <p className="mb-1">
                <strong>Status:</strong> {statusBadge(serverStatus(detail))}
              </p>
              <p className="mb-1">
                <strong>Delivery sub-status:</strong>{" "}
                <CBadge color="warning">HOD approval pending</CBadge>
              </p>
              <p className="mb-3">
                <strong>Dispatchment date:</strong>{" "}
                {formatDateDdMmYyyy(detail.dispatchmentDate)}
              </p>

              <h6 className="mb-2">Company</h6>
              {itemCompany ? (
                <>
                  <p className="mb-1">
                    <strong>Name:</strong> {itemCompany.name || "—"}
                  </p>
                  <p className="mb-1">
                    <strong>Area / location:</strong>{" "}
                    {[itemCompany.area, itemCompany.location]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                  <p className="mb-1">
                    <strong>Address:</strong> {itemCompany.address || "—"}
                  </p>
                </>
              ) : (
                <p className="text-body-secondary">—</p>
              )}

              <h6 className="mb-2 mt-3">Purchase manager contacts</h6>
              {itemCompany &&
              Array.isArray(itemCompany.purchaseManagers) &&
              itemCompany.purchaseManagers.length ? (
                <ul className="ps-3">
                  {itemCompany.purchaseManagers.map((pm, i) => (
                    <li key={i} className="mb-1">
                      {[pm.name, pm.phone, pm.email]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-secondary">—</p>
              )}

              <h6 className="mb-2 mt-3">Line</h6>
              <p className="mb-1 small text-body-secondary">
                Qty: {detail.quantity ?? "—"} {detail.unit || ""}
              </p>
              {detail.description ? (
                <p className="mb-0 small">
                  <strong>Description:</strong> {detail.description}
                </p>
              ) : null}

              <div className="mt-4 pt-3 border-top">
                <h6 className="mb-3">Documents &amp; proof</h6>
                <DocumentPreview
                  doc={detail.attachmentDocumentId}
                  title="Line attachment (product / line image)"
                />
                {detail.receivingRemark ? (
                  <p className="mb-2 small">
                    <strong>Receiving remark:</strong> {detail.receivingRemark}
                  </p>
                ) : null}
                <DocumentPreview
                  doc={detail.receivingDocumentId}
                  title="Receiving / delivery proof"
                />
                {pbr && typeof pbr === "object" ? (
                  <>
                    <p className="small text-body-secondary mb-2">
                      Linked purchase billing request:{" "}
                      <strong>{pbr.uniqueId || pbr._id || "—"}</strong> (
                      {pbr.status || "—"})
                    </p>
                    <DocumentPreview
                      doc={pbr.billDocumentId}
                      title="Billing — bill document"
                    />
                    <DocumentPreview
                      doc={pbr.proofDocumentId}
                      title="Billing — proof document"
                    />
                  </>
                ) : null}
              </div>

              <div className="mt-4 pt-3 border-top">
                <CButton
                  color="success"
                  className="w-100"
                  disabled={approving}
                  onClick={approve}
                >
                  {approving ? (
                    <>
                      <CSpinner size="sm" className="me-2" /> Saving…
                    </>
                  ) : (
                    "Approve delivery (HOD)"
                  )}
                </CButton>
              </div>
            </>
          )}
        </COffcanvasBody>
      </COffcanvas>
    </CRow>
  );
};

export default DeliveryApprovalList;
