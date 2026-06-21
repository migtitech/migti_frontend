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
  CCloseButton,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCheckCircle } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import deliveryApprovalService from "../../services/deliveryApprovalService";
import { getAssetsUrl } from "../../api/endpoints";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { EyeIcon, Loader, TablePagination, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { dateFormatter } from "../../utils/dateFormatter";
import useAreaNameLookup from "../../hooks/useAreaNameLookup";

const DELIVERY_APPROVAL_FILTER_DEFAULTS = { dateFrom: "", dateTo: "" };

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

const dash = (value) => {
  if (value == null || value === "") return "—";
  return value;
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

const parseListResponse = (res) => {
  if (!res || typeof res !== "object") {
    return { list: [], total: 0, page: 1, pageSize: 20 };
  }
  const block = res.data;
  if (!block || typeof block !== "object") {
    return { list: [], total: 0, page: 1, pageSize: 20 };
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

const DetailField = ({ label, children, className = "" }) => (
  <div className={className}>
    <div
      className="text-body-secondary text-uppercase fw-semibold mb-1"
      style={{ fontSize: "0.68rem", letterSpacing: "0.04em" }}
    >
      {label}
    </div>
    <div className="text-break">{children ?? "—"}</div>
  </div>
);

const DetailSection = ({ title, children, className = "" }) => (
  <CCard className={`border shadow-sm ${className}`.trim()}>
    <CCardHeader className="py-2 px-3 bg-light fw-semibold small">
      {title}
    </CCardHeader>
    <CCardBody className="p-3">{children}</CCardBody>
  </CCard>
);

const DocumentPreview = ({ doc, title }) => {
  if (!doc || typeof doc !== "object") return null;
  const url = docOpenUrl(doc);
  if (!url) return null;
  const mime = String(doc.mimeType || "");
  const isImg = mime.startsWith("image/");
  const name = doc.originalName || "Open file";
  return (
    <div className="mb-3 pb-3 border-bottom">
      <div className="fw-semibold small mb-2">{title}</div>
      {isImg ? (
        <div className="mb-2">
          <img
            src={url}
            alt=""
            className="img-fluid rounded border"
            style={{ maxHeight: 200 }}
          />
        </div>
      ) : null}
      <CButton
        color="link"
        className="p-0"
        onClick={() => window.open(url, "_blank", "noopener")}
      >
        {name}
      </CButton>
    </div>
  );
};

const PurchaseManagerList = ({ managers = [] }) => {
  if (!managers.length) {
    return (
      <p className="text-body-secondary small mb-0">No contacts listed.</p>
    );
  }
  return (
    <div className="d-flex flex-column gap-2">
      {managers.map((pm, index) => (
        <div
          key={`${pm?.email || pm?.phone || pm?.name || "pm"}-${index}`}
          className="rounded border bg-body-tertiary px-3 py-2"
        >
          <div className="fw-semibold">{dash(pm?.name)}</div>
          {pm?.phone ? (
            <div className="small text-body-secondary">{pm.phone}</div>
          ) : null}
          {pm?.email ? (
            <div className="small text-body-secondary text-break">
              {pm.email}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const DeliveryApprovalDetail = ({ detail, approving, onApprove }) => {
  const { formatAreaOrDash } = useAreaNameLookup();
  const itemCompany = detail?.companyInfo;
  const purchaseManagers = Array.isArray(itemCompany?.purchaseManagers)
    ? itemCompany.purchaseManagers
    : [];
  const pbr = detail?.purchaseBillingRequestId;
  const lineStatus = serverStatus(detail);
  const hasDocuments =
    detail?.attachmentDocumentId ||
    detail?.receivingDocumentId ||
    (pbr &&
      typeof pbr === "object" &&
      (pbr.billDocumentId || pbr.proofDocumentId));

  return (
    <div className="d-flex flex-column gap-3 pb-2">
      <CCard className="border-0 bg-warning-subtle">
        <CCardBody className="p-3">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <div className="flex-grow-1 min-w-0">
              <h5 className="mb-1 text-break">{dash(detail.productName)}</h5>
              <div className="small text-body-secondary">
                Sales Order{" "}
                <span className="badge bg-dark font-monospace">
                  {dash(detail.poCode)}
                </span>
              </div>
            </div>
            <CBadge color="warning" className="align-self-start">
              Awaiting HOD approval
            </CBadge>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {statusBadge(lineStatus)}
            {detail.rawProductCode ? (
              <CBadge color="light" textColor="dark" className="font-monospace">
                {detail.rawProductCode}
              </CBadge>
            ) : null}
          </div>
        </CCardBody>
      </CCard>

      <DetailSection title="Product & sales order">
        <CRow className="g-3">
          <CCol xs={6}>
            <DetailField label="Product name">
              {dash(detail.productName)}
            </DetailField>
          </CCol>
          <CCol xs={6}>
            <DetailField label="Sales order code">
              <span className="badge bg-dark font-monospace">
                {dash(detail.poCode)}
              </span>
            </DetailField>
          </CCol>
          <CCol xs={6}>
            <DetailField label="Raw product code">
              {detail.rawProductCode ? (
                <code>{detail.rawProductCode}</code>
              ) : (
                "—"
              )}
            </DetailField>
          </CCol>
          <CCol xs={6}>
            <DetailField label="Line status">
              {statusBadge(lineStatus)}
            </DetailField>
          </CCol>
          <CCol xs={6}>
            <DetailField label="Dispatch date">
              {dateFormatter(detail.dispatchmentDate, "—")}
            </DetailField>
          </CCol>
          {detail.effectiveGroupName ? (
            <CCol xs={6}>
              <DetailField label="Product group">
                {detail.effectiveGroupName}
              </DetailField>
            </CCol>
          ) : null}
        </CRow>
      </DetailSection>

      <DetailSection title="Line details">
        <CRow className="g-3">
          <CCol xs={4} sm={3}>
            <DetailField label="Quantity">{dash(detail.quantity)}</DetailField>
          </CCol>
          <CCol xs={4} sm={3}>
            <DetailField label="Unit">{dash(detail.unit)}</DetailField>
          </CCol>
          <CCol xs={4} sm={3}>
            <DetailField label="HSN">{dash(detail.hsnNumber)}</DetailField>
          </CCol>
          <CCol xs={6} sm={3}>
            <DetailField label="GST %">
              {detail.gstPercentage != null ? `${detail.gstPercentage}%` : "—"}
            </DetailField>
          </CCol>
          <CCol xs={12} sm={6}>
            <DetailField label="Model / part #">
              {dash(detail.modelNumber)}
            </DetailField>
          </CCol>
          {detail.description ? (
            <CCol xs={12}>
              <DetailField label="Description">
                {detail.description}
              </DetailField>
            </CCol>
          ) : null}
          {detail.remark ? (
            <CCol xs={12}>
              <DetailField label="Line remark">{detail.remark}</DetailField>
            </CCol>
          ) : null}
        </CRow>
      </DetailSection>

      <DetailSection title="Company & delivery location">
        {itemCompany ? (
          <CRow className="g-3">
            <CCol xs={12}>
              <DetailField label="Company name">
                {dash(itemCompany.name)}
              </DetailField>
            </CCol>
            <CCol xs={12} sm={6}>
              <DetailField label="Area">
                {formatAreaOrDash(itemCompany.area)}
              </DetailField>
            </CCol>
            <CCol xs={12} sm={6}>
              <DetailField label="Location">
                {dash(itemCompany.location)}
              </DetailField>
            </CCol>
            <CCol xs={12}>
              <DetailField label="Address">
                {dash(itemCompany.address)}
              </DetailField>
            </CCol>
            {itemCompany.billingAddress ? (
              <CCol xs={12}>
                <DetailField label="Billing address">
                  {itemCompany.billingAddress}
                </DetailField>
              </CCol>
            ) : null}
            {itemCompany.shippingAddress ? (
              <CCol xs={12}>
                <DetailField label="Shipping address">
                  {itemCompany.shippingAddress}
                </DetailField>
              </CCol>
            ) : null}
          </CRow>
        ) : (
          <p className="text-body-secondary small mb-0">
            No company information.
          </p>
        )}
      </DetailSection>

      <DetailSection title="Purchase manager contacts">
        <PurchaseManagerList managers={purchaseManagers} />
      </DetailSection>

      <DetailSection title="Delivery proof & remarks">
        <CRow className="g-3 mb-0">
          <CCol xs={12}>
            <DetailField label="Receiving remark">
              {detail.receivingRemark ? (
                <span className="fst-italic">{detail.receivingRemark}</span>
              ) : (
                "—"
              )}
            </DetailField>
          </CCol>
        </CRow>
        {detail.receivingDocumentId ? (
          <div className="mt-3 pt-2 border-top">
            <DocumentPreview
              doc={detail.receivingDocumentId}
              title="Receiving / delivery proof"
            />
          </div>
        ) : (
          <p className="text-body-secondary small mb-0 mt-2">
            No delivery proof uploaded.
          </p>
        )}
      </DetailSection>

      {hasDocuments ? (
        <DetailSection title="Documents">
          <DocumentPreview
            doc={detail.attachmentDocumentId}
            title="Line attachment"
          />
          {pbr && typeof pbr === "object" ? (
            <>
              <div className="small text-body-secondary mb-3 pb-2 border-bottom">
                Linked billing request:{" "}
                <strong>{pbr.uniqueId || pbr._id || "—"}</strong>
                {pbr.status ? (
                  <>
                    {" "}
                    · <CBadge color="secondary">{pbr.status}</CBadge>
                  </>
                ) : null}
              </div>
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
        </DetailSection>
      ) : null}

      <div className="sticky-bottom pt-2 bg-body">
        <CButton
          color="success"
          className="w-100"
          disabled={approving}
          onClick={onApprove}
        >
          {approving ? (
            <>
              <CSpinner size="sm" className="me-2" /> Approving…
            </>
          ) : (
            <>
              <CIcon icon={cilCheckCircle} className="me-2" />
              Approve delivery (HOD)
            </>
          )}
        </CButton>
      </div>
    </div>
  );
};

const DeliveryApprovalList = () => {
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "delivery_approval",
    DELIVERY_APPROVAL_FILTER_DEFAULTS,
  );
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [from, setFrom] = useState(initialValues.dateFrom);
  const [to, setTo] = useState(initialValues.dateTo);
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

  useFilterLockPersist("delivery_approval", filtersLocked, {
    dateFrom: from,
    dateTo: to,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({ dateFrom: from, dateTo: to });
  };

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
              Delivered lines awaiting HOD sign-off
            </span>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3 align-items-end">
              <CCol xs={12} md={4}>
                <CFormLabel>Search</CFormLabel>
                <CFormInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Product name, sales order number, or raw code"
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
              <CCol xs={6} md={2} className="d-flex align-items-end">
                <FilterLockButton
                  filtersLocked={filtersLocked}
                  onToggle={handleToggleFiltersLock}
                  pageLabel="Delivery Approval"
                />
              </CCol>
            </CRow>

            {loading ? (
              <Loader />
            ) : (
              <>
                <div className="table-responsive">
                  <CTable
                    responsive
                    striped
                    hover
                    className="mb-0 align-middle"
                  >
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Product</CTableHeaderCell>
                        <CTableHeaderCell>Sales order</CTableHeaderCell>
                        <CTableHeaderCell>Raw code</CTableHeaderCell>
                        <CTableHeaderCell>Dispatch</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          Actions
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {rows.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell
                            colSpan={6}
                            className="text-body-secondary text-center py-4"
                          >
                            No lines awaiting HOD delivery approval.
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        rows.map((row) => (
                          <CTableRow key={row._id}>
                            <CTableDataCell>
                              <span className="fw-medium text-break d-block">
                                {row.productName || "—"}
                              </span>
                            </CTableDataCell>
                            <CTableDataCell>
                              <span className="badge bg-dark font-monospace">
                                {row.poCode || "—"}
                              </span>
                            </CTableDataCell>
                            <CTableDataCell>
                              {row.rawProductCode ? (
                                <code className="small">
                                  {row.rawProductCode}
                                </code>
                              ) : (
                                "—"
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              {dateFormatter(row.dispatchmentDate, "—")}
                            </CTableDataCell>
                            <CTableDataCell>
                              {statusBadge(serverStatus(row))}
                            </CTableDataCell>
                            <CTableDataCell className="text-end text-nowrap">
                              <CButton
                                size="sm"
                                color="primary"
                                variant="outline"
                                onClick={() => openDetail(row._id)}
                              >
                                <EyeIcon size={16} className="me-1" />
                                View
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>
                </div>

                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  wrapperClassName="d-flex justify-content-center mt-4"
                  align="center"
                />
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
        style={{ width: "min(100vw, 540px)" }}
      >
        <COffcanvasHeader className="border-bottom">
          <COffcanvasTitle className="h6 mb-0">Delivery review</COffcanvasTitle>
          <CCloseButton className="ms-2" onClick={closeDetail} />
        </COffcanvasHeader>
        <COffcanvasBody className="bg-body-tertiary">
          {detailLoading ? (
            <div className="text-center py-5">
              <CSpinner />
            </div>
          ) : !detail ? (
            <p className="text-body-secondary mb-0">No data available.</p>
          ) : (
            <DeliveryApprovalDetail
              detail={detail}
              approving={approving}
              onApprove={approve}
            />
          )}
        </COffcanvasBody>
      </COffcanvas>
    </CRow>
  );
};

export default DeliveryApprovalList;
