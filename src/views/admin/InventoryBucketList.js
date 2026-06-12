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
  CFormSelect,
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
import { cilBasket } from "@coreui/icons";
import { CBreadcrumb, CBreadcrumbItem } from "@coreui/react";
import inventoryBucketService from "../../services/inventoryBucketService";
import { withMinimumDelay } from "../../utils/withMinimumDelay";
import { toastError, toastSuccess } from "../../utils/toast";
import { Loader } from "../../components";
import usePermissions from "../../hooks/usePermissions";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "purchased", label: "Purchased" },
  { value: "inventory_received", label: "Inventory received" },
  { value: "ready_for_dispatchment", label: "Ready for dispatchment" },
  { value: "delivered", label: "Delivered" },
  { value: "finance_approved", label: "Finance approved" },
];

/** Use the same `status` field the list/detail APIs return (legacy `inventoryStatus` fallback). */
const serverStatus = (d) => d?.status ?? d?.inventoryStatus;

const invStatus = (d) => {
  return String(serverStatus(d) || "pending");
};

const STATUS_LABELS = {
  pending: "Pending",
  purchased: "Purchased",
  inventory_received: "Received",
  ready_for_dispatchment: "Ready for dispatchment",
  delivered: "Delivered",
  open: "Open",
  payment_request_raised: "Payment request raised",
  finance_approved: "Finance approved",
};

const STATUS_COLORS = {
  pending: "warning",
  purchased: "info",
  inventory_received: "success",
  ready_for_dispatchment: "primary",
  delivered: "info",
  open: "secondary",
  payment_request_raised: "info",
  finance_approved: "dark",
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

const parseListResponse = (res) => {
  if (!res || typeof res !== "object") {
    return {
      list: [],
      total: 0,
      pendingCount: 0,
      page: 1,
      pageSize: 20,
    };
  }
  const block = res.data;
  if (!block || typeof block !== "object") {
    return {
      list: [],
      total: 0,
      pendingCount: 0,
      page: 1,
      pageSize: 20,
    };
  }
  return {
    list: Array.isArray(block.data) ? block.data : [],
    total: block.total ?? 0,
    pendingCount: block.pendingCount ?? 0,
    page: block.page ?? 1,
    pageSize: block.pageSize ?? 20,
  };
};

const InventoryBucketList = () => {
  const { canUpdate } = usePermissions();
  const canMark = canUpdate("inventory_bucket");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, status, from, to]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await withMinimumDelay(() =>
        inventoryBucketService.list({
          page,
          pageSize,
          search: searchDebounced.trim() || undefined,
          status: status.trim() ? status.trim() : undefined,
          from: from || undefined,
          to: to || undefined,
        }),
      );
      const p = parseListResponse(res);
      setRows(p.list);
      setTotal(p.total);
      setPendingCount(p.pendingCount);
    } catch (e) {
      toastError(e?.message || "Failed to load inventory bucket");
      setRows([]);
      setTotal(0);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, searchDebounced, status, from, to]);

  const openDetail = async (id) => {
    setDetailId(id);
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await inventoryBucketService.getById(id);
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

  const onMarkReceived = async () => {
    if (!detailId || !detail) return;
    const st = invStatus(detail);
    if (st === "ready_for_dispatchment") {
      toastError("Already at final step for this line");
      return;
    }
    if (st === "inventory_received") {
      toastError("Already marked as received");
      return;
    }
    if (st !== "purchased") {
      toastError(
        "Mark as received is only available when line status is Purchased.",
      );
      return;
    }
    setMarking(true);
    try {
      await inventoryBucketService.markInventoryReceived(detailId);
      const res = await inventoryBucketService.getById(detailId);
      const doc = res?.data;
      if (doc) setDetail(doc);
      toastSuccess("Marked as inventory received");
      load();
    } catch (e) {
      toastError(e?.message || "Update failed");
    } finally {
      setMarking(false);
    }
  };

  const onMarkReadyForDispatchment = async () => {
    if (!detailId || !detail) return;
    if (invStatus(detail) !== "inventory_received") {
      toastError("Mark as received first");
      return;
    }
    setMarking(true);
    try {
      await inventoryBucketService.markReadyForDispatchment(detailId);
      const res = await inventoryBucketService.getById(detailId);
      const doc = res?.data;
      if (doc) setDetail(doc);
      toastSuccess("Marked ready for dispatchment");
      load();
    } catch (e) {
      toastError(e?.message || "Update failed");
    } finally {
      setMarking(false);
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
              <CBreadcrumbItem active>Inventory bucket</CBreadcrumbItem>
            </CBreadcrumb>
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader className="d-flex flex-wrap align-items-center gap-2">
            <CIcon icon={cilBasket} className="text-primary" />
            <strong>Inventory bucket</strong>
            {pendingCount > 0 && (
              <CBadge color="warning" className="ms-1">
                {pendingCount} pending
              </CBadge>
            )}
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              <CCol xs={12} md={4}>
                <CFormLabel>Search</CFormLabel>
                <CFormInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Product name, Sales Order number, or raw product code"
                />
              </CCol>
              <CCol xs={6} md={2}>
                <CFormLabel>Status</CFormLabel>
                <CFormSelect
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </CFormSelect>
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
                      <CTableHeaderCell>Sales Order number</CTableHeaderCell>
                      <CTableHeaderCell>Raw code</CTableHeaderCell>
                      <CTableHeaderCell>Dispatch</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">
                        {" "}
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {rows.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell
                          colSpan={6}
                          className="text-body-secondary"
                        >
                          No Sales Order lines in your groups.
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
                            {formatDateDdMmYyyy(row.dispatchmentDate)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {statusBadge(serverStatus(row))}
                          </CTableDataCell>
                          <CTableDataCell className="text-end">
                            <CButton
                              size="sm"
                              color="primary"
                              variant="outline"
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
                    <CPagination
                      align="center"
                      aria-label="Inventory bucket pages"
                    >
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
          <COffcanvasTitle>Line details</COffcanvasTitle>
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
              <h6 className="mb-3">Product & Sales Order</h6>
              <p className="mb-1">
                <strong>Product:</strong> {detail.productName || "—"}
              </p>
              <p className="mb-1">
                <strong>Sales Order number:</strong> {detail.poCode || "—"}
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
              <p className="mb-3">
                <strong>Dispatchment date:</strong>{" "}
                {formatDateDdMmYyyy(detail.dispatchmentDate)}
              </p>

              <h6 className="mb-2 mt-3">Line</h6>
              <p className="mb-1 small text-body-secondary">
                Qty: {detail.quantity ?? "—"} {detail.unit || ""}
              </p>
              {detail.description ? (
                <p className="mb-0 small">
                  <strong>Description:</strong> {detail.description}
                </p>
              ) : null}

              {canMark &&
                !["inventory_received", "ready_for_dispatchment"].includes(
                  invStatus(detail),
                ) && (
                  <CButton
                    className="mt-4 w-100"
                    color="success"
                    disabled={marking || invStatus(detail) !== "purchased"}
                    onClick={onMarkReceived}
                    title={
                      invStatus(detail) !== "purchased"
                        ? "Mark as received is only available when line status is Purchased."
                        : undefined
                    }
                  >
                    {marking ? "Updating…" : "Marked as received"}
                  </CButton>
                )}

              {canMark && invStatus(detail) === "inventory_received" && (
                <>
                  <p className="mt-4 mb-2 text-body-secondary small">
                    Inventory received. You can mark this line ready for
                    dispatchment when appropriate.
                  </p>
                  <CButton
                    className="w-100"
                    color="primary"
                    disabled={marking}
                    onClick={onMarkReadyForDispatchment}
                  >
                    {marking ? "Updating…" : "Mark ready for dispatchment"}
                  </CButton>
                </>
              )}

              {invStatus(detail) === "ready_for_dispatchment" && (
                <p className="mt-4 mb-0 text-body-secondary small">
                  This line is marked ready for dispatchment.
                </p>
              )}
            </>
          )}
        </COffcanvasBody>
      </COffcanvas>
    </CRow>
  );
};

export default InventoryBucketList;
