import React, { useEffect, useMemo, useRef, useState } from "react";
import { CChartBar, CChartDoughnut } from "@coreui/react-chartjs";
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilX } from "@coreui/icons";
import { getAssetsUrl } from "../../api/endpoints";
import poBillingService from "../../services/poBillingService";
import areaService from "../../services/areaService";
import documentService from "../../services/documentService";
import useBranchContext from "../../hooks/useBranchContext";
import usePermissions from "../../hooks/usePermissions";
import { Loader, TablePagination, FilterLockButton } from "../../components";
import { useFilterLock, useFilterLockPersist } from "../../hooks/useFilterLock";
import { toastError, toastSuccess } from "../../utils/toast";
import { splitDateTimeParts } from "../../utils/dateFormatter";

const PURCHASE_ORDER_SIDEBAR_FILTER_DEFAULTS = {
  period: "all",
  dateFrom: "",
  dateTo: "",
  areaId: "",
};

const TAB_KEYS = { po: "po", billing: "billing" };
const PERIOD_OPTIONS = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const getPeriodRange = (period) => {
  if (!period || period === "all") return { from: "", to: "" };
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(todayEnd);
  if (period === "weekly") start.setDate(todayEnd.getDate() - 6);
  if (period === "monthly")
    start = new Date(todayEnd.getFullYear(), todayEnd.getMonth(), 1);
  const toInputDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  return { from: toInputDate(start), to: toInputDate(todayEnd) };
};

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const getTodayInputDate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const unwrapResponse = (response) => {
  if (response?.data && typeof response.data === "object") return response.data;
  return response || {};
};

const isImageMime = (mime) => /^image\//i.test(String(mime || ""));

const PurchaseOrderSidebar = () => {
  const MOBILE_BREAKPOINT = 576;
  const drawerWidth = 420;
  const { branchId } = useBranchContext();
  const { canCreate } = usePermissions();
  const canCreatePurchaseOrders = canCreate("po_payment");
  const { filtersLocked, toggleFiltersLock, initialValues } = useFilterLock(
    "purchase_order_sidebar",
    PURCHASE_ORDER_SIDEBAR_FILTER_DEFAULTS,
  );
  const [loadingInit, setLoadingInit] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_KEYS.po);
  const [period, setPeriod] = useState(initialValues.period);
  const [dateFrom, setDateFrom] = useState(initialValues.dateFrom);
  const [dateTo, setDateTo] = useState(initialValues.dateTo);
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(initialValues.areaId);
  const [tabPages, setTabPages] = useState({
    [TAB_KEYS.po]: 1,
    [TAB_KEYS.billing]: 1,
  });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [metrics, setMetrics] = useState({
    totalPoCount: 0,
    totalBillingCount: 0,
    poAmount: 0,
    billingAmount: 0,
  });

  const [companies, setCompanies] = useState([]);
  const [industrySearchText, setIndustrySearchText] = useState("");

  const [poModal, setPoModal] = useState(false);
  const [billingModal, setBillingModal] = useState(false);
  const [poForm, setPoForm] = useState({
    companyId: "",
    amount: "",
    entryDate: getTodayInputDate(),
    dispatchmentDate: "",
    remark: "",
  });
  const [billingForm, setBillingForm] = useState({
    companyId: "",
    amount: "",
    entryDate: getTodayInputDate(),
    remark: "",
  });
  const [poAttachment, setPoAttachment] = useState(null);
  const [billingAttachment, setBillingAttachment] = useState(null);
  const [poAttachmentUploading, setPoAttachmentUploading] = useState(false);
  const [billingAttachmentUploading, setBillingAttachmentUploading] =
    useState(false);
  const latestAnalyticsRequestRef = useRef(0);
  const [isMobileView, setIsMobileView] = useState(false);

  const pageSize = 10;
  const activePage = tabPages[activeTab] || 1;
  const currentPage = activePage;
  const safePage = pagination.currentPage || currentPage;
  const totalPages = pagination.totalPages || 1;
  const companiesList = useMemo(() => companies, [companies]);
  const poVsBillingChart = useMemo(
    () => ({
      labels: ["Sales Order amount", "Billing amount"],
      datasets: [
        {
          label: "Amount (₹)",
          backgroundColor: [
            "rgba(13, 110, 253, 0.7)",
            "rgba(25, 135, 84, 0.7)",
          ],
          borderColor: ["#0d6efd", "#198754"],
          borderWidth: 1,
          data: [
            Number(metrics.poAmount || 0),
            Number(metrics.billingAmount || 0),
          ],
        },
      ],
    }),
    [metrics.poAmount, metrics.billingAmount],
  );

  const poBillingCountDoughnut = useMemo(
    () => ({
      labels: ["Sales Order entries", "Billing entries"],
      datasets: [
        {
          backgroundColor: ["#0d6efd", "#198754"],
          borderWidth: 1,
          data: [
            Number(metrics.totalPoCount || 0),
            Number(metrics.totalBillingCount || 0),
          ],
        },
      ],
    }),
    [metrics.totalPoCount, metrics.totalBillingCount],
  );

  const visibleCompanies = useMemo(() => {
    const q = industrySearchText.trim().toLowerCase();
    const filtered = !q
      ? companiesList
      : companiesList.filter((c) =>
          String(c?.name || "")
            .toLowerCase()
            .includes(q),
        );
    return filtered.slice(0, 50);
  }, [companiesList, industrySearchText]);
  useEffect(() => {
    const load = async () => {
      setLoadingInit(true);
      try {
        const formOptionsRes = await poBillingService.getFormOptions({
          branchId: branchId || undefined,
        });
        const formOptionsPayload = unwrapResponse(formOptionsRes);
        const companiesData =
          formOptionsPayload?.data?.companies ||
          formOptionsPayload?.companies ||
          [];
        setCompanies(
          (companiesData || []).map((c) => ({ ...c, id: c._id || c.id })),
        );
      } catch (err) {
        toastError(err?.message || "Failed to load form options");
      } finally {
        setLoadingInit(false);
      }
    };
    load();
  }, [branchId]);

  useEffect(() => {
    let cancelled = false;
    const fetchAreas = async () => {
      try {
        const allAreas = [];
        let pageNumber = 1;
        let hasNextPage = true;
        while (hasNextPage) {
          const res = await areaService.getAll({ pageNumber, pageSize: 100 });
          const data = res?.data || res;
          const payload = data || {};
          const pageAreas = payload?.areas || [];
          const pagePagination = payload?.pagination || {};
          allAreas.push(...pageAreas);
          hasNextPage = Boolean(pagePagination?.hasNextPage);
          pageNumber += 1;
        }
        if (cancelled) return;
        setAreas(allAreas);
      } catch {
        if (cancelled) return;
        setAreas([]);
      }
    };
    fetchAreas();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextRange = getPeriodRange(period);
    setDateFrom(nextRange.from);
    setDateTo(nextRange.to);
    setTabPages({ [TAB_KEYS.po]: 1, [TAB_KEYS.billing]: 1 });
  }, [period]);

  useEffect(() => {
    setTabPages((prev) => ({ ...prev, [activeTab]: 1 }));
  }, [dateFrom, dateTo, activeTab]);

  useFilterLockPersist("purchase_order_sidebar", filtersLocked, {
    period,
    dateFrom,
    dateTo,
    areaId: selectedAreaId,
  });

  const handleToggleFiltersLock = () => {
    toggleFiltersLock({
      period,
      dateFrom,
      dateTo,
      areaId: selectedAreaId,
    });
  };

  const loadAnalytics = async () => {
    const requestId = latestAnalyticsRequestRef.current + 1;
    latestAnalyticsRequestRef.current = requestId;
    setLoadingData(true);
    try {
      const res = await poBillingService.getAnalytics({
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        areaIds: selectedAreaId || undefined,
        tab: activeTab,
        pageNumber: activePage,
        pageSize,
      });

      const payload = unwrapResponse(res);
      const data = payload || {};
      if (requestId !== latestAnalyticsRequestRef.current) return;
      setMetrics(data.metrics || {});
      setRows(data?.table?.rows || []);
      setPagination(
        data?.table?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: pageSize,
        },
      );
    } catch (err) {
      if (requestId !== latestAnalyticsRequestRef.current) return;
      setRows([]);
      toastError(err?.message || "Failed to load data");
    } finally {
      if (requestId !== latestAnalyticsRequestRef.current) return;
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [activeTab, period, dateFrom, dateTo, selectedAreaId, activePage]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (event) => setIsMobileView(event.matches);
    setIsMobileView(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }
    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  /** Opens file in a new tab. Uses the signed S3 URL from the API (navigation avoids S3 CORS on XHR). */
  const openAttachmentInNewTab = (attachment) => {
    const raw = attachment?.url;
    const url =
      raw && (raw.startsWith("http://") || raw.startsWith("https://"))
        ? raw
        : raw
          ? getAssetsUrl(raw)
          : "";
    if (!url) {
      toastError("Preview link unavailable. Try refreshing the list.");
      return;
    }
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      toastError(
        "Pop-up blocked. Allow pop-ups for this site to open the file.",
      );
    }
  };

  const onPoAttachmentFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (e?.target) e.target.value = "";
    if (!file) return;
    setPoAttachmentUploading(true);
    try {
      const res = await documentService.uploadAttachments([file]);
      const payload = res?.data || res;
      const docs = payload?.data?.documents || payload?.documents || [];
      const first = docs[0];
      const id = first?._id || first?.id;
      if (!id) {
        toastError("Upload failed");
        return;
      }
      setPoAttachment({
        documentId: String(id),
        fileName: file.name,
        mimeType: file.type || first?.mimeType || "",
        previewUrl: first?.path || "",
      });
      toastSuccess("Attachment uploaded");
    } catch (err) {
      toastError(err?.message || "Failed to upload attachment");
      setPoAttachment(null);
    } finally {
      setPoAttachmentUploading(false);
    }
  };

  const onBillingAttachmentFile = async (e) => {
    const file = e?.target?.files?.[0];
    if (e?.target) e.target.value = "";
    if (!file) return;
    setBillingAttachmentUploading(true);
    try {
      const res = await documentService.uploadAttachments([file]);
      const payload = res?.data || res;
      const docs = payload?.data?.documents || payload?.documents || [];
      const first = docs[0];
      const id = first?._id || first?.id;
      if (!id) {
        toastError("Upload failed");
        return;
      }
      setBillingAttachment({
        documentId: String(id),
        fileName: file.name,
        mimeType: file.type || first?.mimeType || "",
        previewUrl: first?.path || "",
      });
      toastSuccess("Attachment uploaded");
    } catch (err) {
      toastError(err?.message || "Failed to upload attachment");
      setBillingAttachment(null);
    } finally {
      setBillingAttachmentUploading(false);
    }
  };

  const onCreatePo = async () => {
    const amountValue = Number(poForm.amount);
    if (!poForm.companyId || !amountValue || amountValue <= 0) {
      toastError("Company and amount are required");
      return;
    }
    try {
      await poBillingService.createPo({
        companyId: poForm.companyId,
        amount: amountValue,
        entryDate: poForm.entryDate || undefined,
        remark: poForm.remark,
        branchId: branchId || undefined,
        attachmentDocumentId: poAttachment?.documentId || undefined,
      });
      toastSuccess("Sales Order added successfully");
      setPoModal(false);
      setPoAttachment(null);
      setPoForm({
        companyId: "",
        amount: "",
        entryDate: getTodayInputDate(),
        dispatchmentDate: "",
        remark: "",
      });
      loadAnalytics();
    } catch (err) {
      toastError(err?.message || "Failed to add Sales Order");
    }
  };

  const onCreateBilling = async () => {
    const amountValue = Number(billingForm.amount);
    if (!billingForm.companyId || !amountValue || amountValue <= 0) {
      toastError("Company and amount are required");
      return;
    }
    try {
      await poBillingService.createBilling({
        companyId: billingForm.companyId,
        amount: amountValue,
        entryDate: billingForm.entryDate || undefined,
        remark: billingForm.remark,
        branchId: branchId || undefined,
        attachmentDocumentId: billingAttachment?.documentId || undefined,
      });
      toastSuccess("Billing added successfully");
      setBillingModal(false);
      setBillingAttachment(null);
      setBillingForm({
        companyId: "",
        amount: "",
        entryDate: getTodayInputDate(),
        remark: "",
      });
      loadAnalytics();
    } catch (err) {
      toastError(err?.message || "Failed to add billing");
    }
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Sales Order</strong>
              {canCreatePurchaseOrders ? (
                <div className="d-flex gap-2">
                  <CButton
                    color="primary"
                    disabled
                    title="Add Sales Order is not available from this page"
                  >
                    Add Sales Order
                  </CButton>
                  <CButton
                    color="success"
                    onClick={() => {
                      setPoModal(false);
                      setPoAttachment(null);
                      setBillingAttachment(null);
                      setBillingModal(true);
                    }}
                  >
                    Add Billing
                  </CButton>
                </div>
              ) : null}
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3 g-3 align-items-end">
                <CCol md={4}>
                  <CFormLabel className="small text-muted mb-1">
                    Period
                  </CFormLabel>
                  <CFormSelect
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    {PERIOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel className="small text-muted mb-1">
                    From
                  </CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel className="small text-muted mb-1">To</CFormLabel>
                  <CFormInput
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel className="small text-muted mb-1">
                    Zones
                  </CFormLabel>
                  <CFormSelect
                    value={selectedAreaId}
                    onChange={(e) => {
                      setSelectedAreaId(e.target.value);
                      setTabPages({ [TAB_KEYS.po]: 1, [TAB_KEYS.billing]: 1 });
                    }}
                  >
                    <option value="">All Zones</option>
                    {areas.map((a) => {
                      const id = String(a._id || a.id);
                      return (
                        <option key={id} value={id}>
                          {a.name}
                          {a.city ? ` - ${a.city}` : ""}
                        </option>
                      );
                    })}
                  </CFormSelect>
                </CCol>
                <CCol md={4} className="d-flex align-items-end">
                  <FilterLockButton
                    filtersLocked={filtersLocked}
                    onToggle={handleToggleFiltersLock}
                    pageLabel="Purchase Orders"
                  />
                </CCol>
              </CRow>

              {loadingInit || loadingData ? (
                <div className="text-center py-5">
                  <Loader message="Loading purchase analytics..." />
                </div>
              ) : (
                <>
                  <CRow className="g-3 mb-3">
                    {[
                      {
                        label: "Sales Order count",
                        value: metrics.totalPoCount || 0,
                        border: "primary",
                        hint: "Entries in range",
                      },
                      {
                        label: "Billing count",
                        value: metrics.totalBillingCount || 0,
                        border: "success",
                        hint: "Entries in range",
                      },
                      {
                        label: "Sales Order amount",
                        value: formatAmount(metrics.poAmount || 0),
                        border: "primary",
                        hint: "Sum for filters",
                      },
                      {
                        label: "Billing amount",
                        value: formatAmount(metrics.billingAmount || 0),
                        border: "success",
                        hint: "Sum for filters",
                      },
                    ].map((item) => (
                      <CCol md={3} sm={6} xs={12} key={item.label}>
                        <CCard
                          className={`h-100 border-start border-${item.border} border-4 shadow-sm`}
                        >
                          <CCardBody className="py-3">
                            <div className="text-body-secondary small text-uppercase">
                              {item.label}
                            </div>
                            <div className="fs-5 fw-semibold">{item.value}</div>
                            <div className="small text-muted mt-1">
                              {item.hint}
                            </div>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    ))}
                  </CRow>

                  <CRow className="g-3 mb-4">
                    <CCol lg={7}>
                      <CCard className="h-100 shadow-sm">
                        <CCardHeader className="py-2">
                          <strong className="small">Amount comparison</strong>
                          <span className="text-body-secondary small ms-2">
                            Sales Order vs billing (₹)
                          </span>
                        </CCardHeader>
                        <CCardBody style={{ minHeight: 260 }}>
                          <CChartBar
                            data={poVsBillingChart}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    label: (ctx) =>
                                      ` ₹${Number(
                                        ctx.parsed.y || 0,
                                      ).toLocaleString("en-IN", {
                                        maximumFractionDigits: 0,
                                      })}`,
                                  },
                                },
                              },
                              scales: {
                                y: { beginAtZero: true },
                              },
                            }}
                            style={{ height: 240 }}
                          />
                        </CCardBody>
                      </CCard>
                    </CCol>
                    <CCol lg={5}>
                      <CCard className="h-100 shadow-sm">
                        <CCardHeader className="py-2">
                          <strong className="small">Volume split</strong>
                          <span className="text-body-secondary small ms-2">
                            Sales Order vs billing rows
                          </span>
                        </CCardHeader>
                        <CCardBody
                          className="d-flex justify-content-center align-items-center"
                          style={{ minHeight: 260 }}
                        >
                          <CChartDoughnut
                            data={poBillingCountDoughnut}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { position: "bottom" },
                              },
                            }}
                            style={{ height: 220, maxWidth: 320 }}
                          />
                        </CCardBody>
                      </CCard>
                    </CCol>
                  </CRow>

                  <CNav variant="tabs" className="mb-3">
                    <CNavItem>
                      <CNavLink
                        active={activeTab === TAB_KEYS.po}
                        onClick={() => setActiveTab(TAB_KEYS.po)}
                      >
                        Sales Order
                      </CNavLink>
                    </CNavItem>
                    <CNavItem>
                      <CNavLink
                        active={activeTab === TAB_KEYS.billing}
                        onClick={() => setActiveTab(TAB_KEYS.billing)}
                      >
                        Billing
                      </CNavLink>
                    </CNavItem>
                  </CNav>

                  {isMobileView ? (
                    <div>
                      {rows.length > 0 ? (
                        rows.map((item, index) => {
                          const dateInfo = splitDateTimeParts(
                            item.entryDate,
                            "-",
                          );
                          return (
                            <CCard
                              key={item._id || `${index}`}
                              className="mb-3 border"
                            >
                              <CCardBody>
                                <div className="small text-muted mb-1">
                                  #{(safePage - 1) * pageSize + index + 1}
                                </div>
                                <div className="small mb-1">
                                  <strong>Company:</strong>{" "}
                                  {item.companyName || "-"}
                                </div>
                                <div className="small mb-1">
                                  <strong>Amount:</strong>{" "}
                                  {formatAmount(item.amount)}
                                </div>
                                <div className="small mb-1">
                                  <strong>Date:</strong> {dateInfo.date}{" "}
                                  {dateInfo.time ? ` ${dateInfo.time}` : ""}
                                </div>
                                <div className="small">
                                  <strong>Attachment:</strong>{" "}
                                  {item.attachment?.documentId ? (
                                    <span className="d-inline-flex align-items-center gap-2">
                                      <span className="text-muted">
                                        {isImageMime(item.attachment.mimeType)
                                          ? "Image"
                                          : "PDF"}
                                      </span>
                                      <CButton
                                        color="link"
                                        className="p-0 small"
                                        title="Open in new tab"
                                        onClick={() =>
                                          openAttachmentInNewTab(
                                            item.attachment,
                                          )
                                        }
                                      >
                                        View
                                      </CButton>
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </div>
                              </CCardBody>
                            </CCard>
                          );
                        })
                      ) : (
                        <div className="text-center text-muted py-4">
                          No {activeTab} data found for selected filters.
                        </div>
                      )}
                    </div>
                  ) : (
                    <CTable hover responsive bordered>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>S No</CTableHeaderCell>
                          <CTableHeaderCell>Company</CTableHeaderCell>
                          <CTableHeaderCell>Amount</CTableHeaderCell>
                          <CTableHeaderCell>Date</CTableHeaderCell>
                          <CTableHeaderCell>Dispatchment</CTableHeaderCell>
                          <CTableHeaderCell>Attachment</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {rows.length > 0 ? (
                          rows.map((item, index) => {
                            const dateInfo = splitDateTimeParts(
                              item.entryDate,
                              "-",
                            );
                            return (
                              <CTableRow key={item._id || `${index}`}>
                                <CTableDataCell>
                                  {(safePage - 1) * pageSize + index + 1}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {item.companyName || "-"}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {formatAmount(item.amount)}
                                </CTableDataCell>
                                <CTableDataCell>
                                  <div>{dateInfo.date}</div>
                                  {dateInfo.time ? (
                                    <div className="text-muted small">
                                      {dateInfo.time}
                                    </div>
                                  ) : null}
                                </CTableDataCell>
                                <CTableDataCell>
                                  {item.attachment?.documentId ? (
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                      {isImageMime(item.attachment.mimeType) &&
                                      item.attachment.url ? (
                                        <button
                                          type="button"
                                          className="p-0 border-0 bg-transparent"
                                          title="View full size"
                                          onClick={() =>
                                            openAttachmentInNewTab(
                                              item.attachment,
                                            )
                                          }
                                          style={{ cursor: "pointer" }}
                                        >
                                          <img
                                            src={item.attachment.url}
                                            alt=""
                                            style={{
                                              width: 40,
                                              height: 40,
                                              objectFit: "cover",
                                              borderRadius: 4,
                                              border: "1px solid #dee2e6",
                                            }}
                                          />
                                        </button>
                                      ) : (
                                        <span className="small text-muted">
                                          PDF
                                        </span>
                                      )}
                                      <CButton
                                        color="link"
                                        className="p-0 small"
                                        title="Open in new tab"
                                        onClick={() =>
                                          openAttachmentInNewTab(
                                            item.attachment,
                                          )
                                        }
                                      >
                                        View
                                      </CButton>
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </CTableDataCell>
                              </CTableRow>
                            );
                          })
                        ) : (
                          <CTableRow>
                            <CTableDataCell colSpan={6} className="text-center">
                              No {activeTab} data found for selected filters.
                            </CTableDataCell>
                          </CTableRow>
                        )}
                      </CTableBody>
                    </CTable>
                  )}

                  <TablePagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={(newPage) =>
                      setTabPages((prev) => ({ ...prev, [activeTab]: newPage }))
                    }
                    showRange
                    totalItems={pagination?.totalItems ?? 0}
                    itemsPerPage={pagination?.itemsPerPage ?? 10}
                  />
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: poModal ? 0 : -drawerWidth,
          width: drawerWidth,
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #dee2e6",
          boxShadow: "0 0 16px rgba(0,0,0,0.08)",
          zIndex: 2999,
          transition: "right 0.2s ease",
          padding: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Add Sales Order</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => {
              setPoModal(false);
              setPoAttachment(null);
            }}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Amount</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={poForm.amount}
                onChange={(e) =>
                  setPoForm((p) => ({ ...p, amount: e.target.value }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Search client</CFormLabel>
              <CFormInput
                placeholder="Type to search clients"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Company (Client)</CFormLabel>
              <CFormSelect
                value={poForm.companyId}
                onChange={(e) =>
                  setPoForm((p) => ({ ...p, companyId: e.target.value }))
                }
              >
                <option value="">Select company</option>
                {visibleCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </CFormSelect>
              <div className="small text-muted mt-1">
                Showing {visibleCompanies.length} of {companiesList.length}{" "}
                clients
              </div>
            </CCol>
            <CCol md={12}>
              <CFormLabel>Date</CFormLabel>
              <CFormInput
                type="date"
                value={poForm.entryDate}
                onChange={(e) =>
                  setPoForm((p) => ({ ...p, entryDate: e.target.value }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Dispatchment date</CFormLabel>
              <CFormInput
                type="date"
                value={poForm.dispatchmentDate}
                onChange={(e) =>
                  setPoForm((p) => ({ ...p, dispatchmentDate: e.target.value }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Remark</CFormLabel>
              <CFormTextarea
                rows={4}
                placeholder="Write remark..."
                value={poForm.remark}
                onChange={(e) =>
                  setPoForm((p) => ({ ...p, remark: e.target.value }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Attachment (image or PDF)</CFormLabel>
              <CFormInput
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={onPoAttachmentFile}
                disabled={poAttachmentUploading}
              />
              {poAttachmentUploading && (
                <div className="mt-2">
                  <CSpinner size="sm" className="me-2" />
                  Uploading…
                </div>
              )}
              {poAttachment && !poAttachmentUploading && (
                <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                  {isImageMime(poAttachment.mimeType) &&
                  poAttachment.previewUrl ? (
                    <img
                      src={poAttachment.previewUrl}
                      alt=""
                      style={{
                        maxWidth: "100%",
                        maxHeight: 120,
                        borderRadius: 4,
                      }}
                    />
                  ) : (
                    <span className="small">{poAttachment.fileName}</span>
                  )}
                  <CButton
                    color="link"
                    className="p-0 small"
                    onClick={() => setPoAttachment(null)}
                  >
                    Remove
                  </CButton>
                </div>
              )}
            </CCol>
          </CRow>
        </div>
        <div className="d-flex justify-content-end gap-2 pt-3">
          <CButton
            color="secondary"
            onClick={() => {
              setPoModal(false);
              setPoAttachment(null);
            }}
          >
            Cancel
          </CButton>
          <CButton color="primary" onClick={onCreatePo}>
            Save
          </CButton>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: billingModal ? 0 : -drawerWidth,
          width: drawerWidth,
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #dee2e6",
          boxShadow: "0 0 16px rgba(0,0,0,0.08)",
          zIndex: 2999,
          transition: "right 0.2s ease",
          padding: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Add Billing</h6>
          <CButton
            color="light"
            size="sm"
            className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
            style={{ width: 26, height: 26 }}
            onClick={() => {
              setBillingModal(false);
              setBillingAttachment(null);
            }}
          >
            <CIcon icon={cilX} size="sm" />
          </CButton>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel>Amount</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={billingForm.amount}
                onChange={(e) =>
                  setBillingForm((p) => ({ ...p, amount: e.target.value }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Search client</CFormLabel>
              <CFormInput
                placeholder="Type to search clients"
                value={industrySearchText}
                onChange={(e) => setIndustrySearchText(e.target.value)}
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Company (Client)</CFormLabel>
              <CFormSelect
                value={billingForm.companyId}
                onChange={(e) =>
                  setBillingForm((p) => ({ ...p, companyId: e.target.value }))
                }
              >
                <option value="">Select company</option>
                {visibleCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </CFormSelect>
              <div className="small text-muted mt-1">
                Showing {visibleCompanies.length} of {companiesList.length}{" "}
                clients
              </div>
            </CCol>
            <CCol md={12}>
              <CFormLabel>Date</CFormLabel>
              <CFormInput
                type="date"
                value={billingForm.entryDate}
                onChange={(e) =>
                  setBillingForm((p) => ({ ...p, entryDate: e.target.value }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Remark</CFormLabel>
              <CFormTextarea
                rows={4}
                placeholder="Write remark..."
                value={billingForm.remark}
                onChange={(e) =>
                  setBillingForm((p) => ({ ...p, remark: e.target.value }))
                }
              />
            </CCol>
            <CCol md={12}>
              <CFormLabel>Attachment (image or PDF)</CFormLabel>
              <CFormInput
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={onBillingAttachmentFile}
                disabled={billingAttachmentUploading}
              />
              {billingAttachmentUploading && (
                <div className="mt-2">
                  <CSpinner size="sm" className="me-2" />
                  Uploading…
                </div>
              )}
              {billingAttachment && !billingAttachmentUploading && (
                <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                  {isImageMime(billingAttachment.mimeType) &&
                  billingAttachment.previewUrl ? (
                    <img
                      src={billingAttachment.previewUrl}
                      alt=""
                      style={{
                        maxWidth: "100%",
                        maxHeight: 120,
                        borderRadius: 4,
                      }}
                    />
                  ) : (
                    <span className="small">{billingAttachment.fileName}</span>
                  )}
                  <CButton
                    color="link"
                    className="p-0 small"
                    onClick={() => setBillingAttachment(null)}
                  >
                    Remove
                  </CButton>
                </div>
              )}
            </CCol>
          </CRow>
        </div>
        <div className="d-flex justify-content-end gap-2 pt-3">
          <CButton
            color="secondary"
            onClick={() => {
              setBillingModal(false);
              setBillingAttachment(null);
            }}
          >
            Cancel
          </CButton>
          <CButton color="success" onClick={onCreateBilling}>
            Save
          </CButton>
        </div>
      </div>
    </>
  );
};

export default PurchaseOrderSidebar;
