import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CWidgetStatsA,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBasket, cilCart, cilDollar, cilNotes } from "@coreui/icons";
import { useAuth } from "../../context/AuthContext";
import queryService from "../../services/queryService";
import employeeLocationService from "../../services/employeeLocationService";
import { dateFormatter, dateTimeFormatter } from "../../utils/dateFormatter";

const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatQueryStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  if (v === "drafted") return "Draft";
  if (v === "convertedToQuotation") return "Converted";
  if (v === "closed") return "Closed";
  return v;
};

const formatQuotationStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  const map = {
    draft: "Draft",
    partial: "Partial",
    fulfilled: "Fulfilled",
    ready: "Ready",
    hod_approved: "Approved",
    sentToClient: "Sent to client",
    poReceived: "Sales Order received",
    followup01: "Follow-up 1",
    followup02: "Follow-up 2",
    closed: "Closed",
  };
  return map[v] || v;
};

const formatPoStatus = (s) => {
  const v = String(s || "").trim();
  if (!v) return "—";
  const map = {
    draft: "Draft",
    confirmed: "Confirmed",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled",
  };
  return map[v] || v;
};

const formatTodayHeading = () =>
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatUserLocation = (u) => {
  if (!u || typeof u !== "object") return null;
  const addr = String(u.address || "").trim();
  const pc = String(u.pincode || "").trim();
  if (addr && pc) return `${addr} — ${pc}`;
  if (addr) return addr;
  if (pc) return `Pincode: ${pc}`;
  return null;
};

/** Prefer latest `employeeLocation` row (locality, city); pincode from profile when present. */
const formatHeaderLocation = (latestLoc, u) => {
  const locality = String(latestLoc?.locality || "").trim();
  const city = String(latestLoc?.city || "").trim();
  const areaParts = [];
  if (locality) areaParts.push(locality);
  if (city) areaParts.push(city);
  const area = areaParts.join(", ");
  const pc = String(u?.pincode || "").trim();
  if (area && pc) return `${area} — ${pc}`;
  if (area) return area;
  if (pc) return `Pincode: ${pc}`;
  return formatUserLocation(u);
};

const SalesDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [latestEmployeeLocation, setLatestEmployeeLocation] = useState(null);
  const [dashboard, setDashboard] = useState({
    monthlyFrom: "",
    monthlyTo: "",
    monthlyQueriesCount: 0,
    monthlyQuotationsCount: 0,
    monthlyPurchaseOrdersCount: 0,
    pendingQueriesCount: 0,
    pendingQuotationsCount: 0,
    pendingPurchaseOrdersCount: 0,
    pendingCollectionAmount: 0,
    weeklyTarget: 0,
    weeklyBilling: 0,
    monthlyTarget: 0,
    monthlyBilling: 0,
    weeklyPeriodFrom: "",
    weeklyPeriodTo: "",
    monthlyPeriodFrom: "",
    monthlyPeriodTo: "",
    pendingQueries: [],
    pendingQuotations: [],
    pendingPurchaseOrders: [],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cardsResult, locResult] = await Promise.allSettled([
          queryService.getSalesDashboardCards(),
          employeeLocationService.getLatest(),
        ]);

        if (locResult.status === "fulfilled") {
          const locPayload = locResult.value?.data;
          setLatestEmployeeLocation(
            locPayload && typeof locPayload === "object" ? locPayload : null,
          );
        } else {
          setLatestEmployeeLocation(null);
        }

        if (cardsResult.status === "fulfilled") {
          const response = cardsResult.value;
          const data = response?.data ?? {};
          setDashboard({
            monthlyFrom: data.monthlyFrom || "",
            monthlyTo: data.monthlyTo || "",
            monthlyQueriesCount: Number(data.monthlyQueriesCount || 0),
            monthlyQuotationsCount: Number(data.monthlyQuotationsCount || 0),
            monthlyPurchaseOrdersCount: Number(
              data.monthlyPurchaseOrdersCount || 0,
            ),
            pendingQueriesCount: Number(data.pendingQueriesCount || 0),
            pendingQuotationsCount: Number(data.pendingQuotationsCount || 0),
            pendingPurchaseOrdersCount: Number(
              data.pendingPurchaseOrdersCount || 0,
            ),
            pendingCollectionAmount: Number(data.pendingCollectionAmount || 0),
            pendingQueries: Array.isArray(data.pendingQueries)
              ? data.pendingQueries
              : [],
            pendingQuotations: Array.isArray(data.pendingQuotations)
              ? data.pendingQuotations
              : [],
            pendingPurchaseOrders: Array.isArray(data.pendingPurchaseOrders)
              ? data.pendingPurchaseOrders
              : [],
            weeklyTarget: Number(data.weeklyTarget || 0),
            weeklyBilling: Number(data.weeklyBilling || 0),
            monthlyTarget: Number(data.monthlyTarget || 0),
            monthlyBilling: Number(data.monthlyBilling || 0),
            weeklyPeriodFrom: data.weeklyPeriodFrom || "",
            weeklyPeriodTo: data.weeklyPeriodTo || "",
            monthlyPeriodFrom: data.monthlyPeriodFrom || "",
            monthlyPeriodTo: data.monthlyPeriodTo || "",
          });
        } else {
          setDashboard((prev) => ({
            ...prev,
            monthlyQueriesCount: 0,
            monthlyQuotationsCount: 0,
            monthlyPurchaseOrdersCount: 0,
            pendingQueriesCount: 0,
            pendingQuotationsCount: 0,
            pendingPurchaseOrdersCount: 0,
            pendingCollectionAmount: 0,
            pendingQueries: [],
            pendingQuotations: [],
            pendingPurchaseOrders: [],
            weeklyTarget: 0,
            weeklyBilling: 0,
            monthlyTarget: 0,
            monthlyBilling: 0,
            weeklyPeriodFrom: "",
            weeklyPeriodTo: "",
            monthlyPeriodFrom: "",
            monthlyPeriodTo: "",
          }));
        }
      } catch (_e) {
        setLatestEmployeeLocation(null);
        setDashboard((prev) => ({
          ...prev,
          monthlyQueriesCount: 0,
          monthlyQuotationsCount: 0,
          monthlyPurchaseOrdersCount: 0,
          pendingQueriesCount: 0,
          pendingQuotationsCount: 0,
          pendingPurchaseOrdersCount: 0,
          pendingCollectionAmount: 0,
          pendingQueries: [],
          pendingQuotations: [],
          pendingPurchaseOrders: [],
          weeklyTarget: 0,
          weeklyBilling: 0,
          monthlyTarget: 0,
          monthlyBilling: 0,
          weeklyPeriodFrom: "",
          weeklyPeriodTo: "",
          monthlyPeriodFrom: "",
          monthlyPeriodTo: "",
        }));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const targetPeriodLabel = (fromIso, toIso) => {
    const a = dateFormatter(fromIso, "");
    const b = dateFormatter(toIso, "");
    if (!a && !b) return "";
    return `From ${a || "—"} to ${b || "—"}`;
  };

  const locationText = useMemo(
    () => formatHeaderLocation(latestEmployeeLocation, user),
    [latestEmployeeLocation, user],
  );

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <div className="text-body-secondary small mb-2">
            {formatTodayHeading()}
          </div>
          <h2 className="mb-2">Welcome, {user?.name}</h2>
          <p className="text-body-secondary mb-0">
            <span className="fw-semibold text-body">Location</span>
            {locationText ? (
              <> — {locationText}</>
            ) : (
              <span className="text-body-secondary"> — Not set</span>
            )}
          </p>
        </CCol>
      </CRow>

      {loading ? (
        <p className="text-body-secondary">Loading…</p>
      ) : (
        <>
          {/* Phone / small screens: highlight pending counts */}
          <CRow className="d-md-none g-2 mb-2">
            <CCol xs={6}>
              <div className="mb-3">
                <CWidgetStatsA
                  color="primary"
                  value={String(dashboard.pendingQueriesCount)}
                  title="Pending queries"
                  chart={
                    <CIcon
                      icon={cilNotes}
                      height={44}
                      className="my-3 text-white opacity-25"
                    />
                  }
                />
                <div className="small text-body-secondary mt-1 px-1">
                  Draft — action needed
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <CWidgetStatsA
                  color="info"
                  value={String(dashboard.pendingQuotationsCount)}
                  title="Pending quotations"
                  chart={
                    <CIcon
                      icon={cilCart}
                      height={44}
                      className="my-3 text-white opacity-25"
                    />
                  }
                />
                <div className="small text-body-secondary mt-1 px-1">
                  Not closed
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <CWidgetStatsA
                  color="success"
                  value={String(dashboard.pendingPurchaseOrdersCount)}
                  title="Pending Sales Orders"
                  chart={
                    <CIcon
                      icon={cilBasket}
                      height={44}
                      className="my-3 text-white opacity-25"
                    />
                  }
                />
                <div className="small text-body-secondary mt-1 px-1">
                  Open orders
                </div>
              </div>
            </CCol>
            <CCol xs={6}>
              <div className="mb-3">
                <CWidgetStatsA
                  color="warning"
                  value={formatAmount(dashboard.pendingCollectionAmount)}
                  title="Pending collection"
                  chart={
                    <CIcon
                      icon={cilDollar}
                      height={44}
                      className="my-3 text-white opacity-25"
                    />
                  }
                />
                <div className="small text-body-secondary mt-1 px-1">
                  To collect
                </div>
              </div>
            </CCol>
          </CRow>

          {/* Tablet and up: monthly activity cards */}
          <CRow className="d-none d-md-flex">
            <CCol sm={6} lg={3}>
              <div className="mb-4">
                <CWidgetStatsA
                  color="primary"
                  value={String(dashboard.monthlyQueriesCount)}
                  title="Queries"
                  chart={
                    <CIcon
                      icon={cilNotes}
                      height={52}
                      className="my-4 text-white opacity-25"
                    />
                  }
                />
              </div>
            </CCol>
            <CCol sm={6} lg={3}>
              <div className="mb-4">
                <CWidgetStatsA
                  color="info"
                  value={String(dashboard.monthlyQuotationsCount)}
                  title="Quotations"
                  chart={
                    <CIcon
                      icon={cilCart}
                      height={52}
                      className="my-4 text-white opacity-25"
                    />
                  }
                />
              </div>
            </CCol>
            <CCol sm={6} lg={3}>
              <div className="mb-4">
                <CWidgetStatsA
                  color="success"
                  value={String(dashboard.monthlyPurchaseOrdersCount)}
                  title="Sales Orders"
                  chart={
                    <CIcon
                      icon={cilBasket}
                      height={52}
                      className="my-4 text-white opacity-25"
                    />
                  }
                />
              </div>
            </CCol>
            <CCol sm={6} lg={3}>
              <div className="mb-4">
                <CWidgetStatsA
                  color="warning"
                  value={formatAmount(dashboard.pendingCollectionAmount)}
                  title="Pending collection"
                  chart={
                    <CIcon
                      icon={cilDollar}
                      height={52}
                      className="my-4 text-white opacity-25"
                    />
                  }
                />
              </div>
            </CCol>
          </CRow>

          <CRow>
            <CCol lg={12} className="mb-4">
              <CCard>
                <CCardHeader>
                  <strong>Pending queries</strong>
                  <small className="text-body-secondary ms-2">
                    Draft — not yet converted
                  </small>
                </CCardHeader>
                <CCardBody>
                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Query code</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Created</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          Action
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {dashboard.pendingQueries.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell
                            colSpan={5}
                            className="text-body-secondary text-center py-4"
                          >
                            No pending queries
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        dashboard.pendingQueries.map((row) => (
                          <CTableRow key={row.id}>
                            <CTableDataCell>
                              {row.queryCode || "—"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {row.companyName || "—"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {formatQueryStatus(row.status)}
                            </CTableDataCell>
                            <CTableDataCell>
                              {dateTimeFormatter(row.createdAt, "—")}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CButton
                                color="primary"
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/queries/${row.id}`)}
                              >
                                Open
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow>
            <CCol lg={12} className="mb-4">
              <CCard>
                <CCardHeader>
                  <strong>Pending quotations</strong>
                  <small className="text-body-secondary ms-2">
                    Not closed or fulfilled
                  </small>
                </CCardHeader>
                <CCardBody>
                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Quotation code</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Created</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          Action
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {dashboard.pendingQuotations.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell
                            colSpan={5}
                            className="text-body-secondary text-center py-4"
                          >
                            No pending quotations
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        dashboard.pendingQuotations.map((row) => (
                          <CTableRow key={row.id}>
                            <CTableDataCell>
                              {row.quotationCode || "—"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {row.companyName || "—"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {formatQuotationStatus(row.status)}
                            </CTableDataCell>
                            <CTableDataCell>
                              {dateTimeFormatter(row.createdAt, "—")}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              <CButton
                                color="primary"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate(`/quotations/${row.id}`)
                                }
                              >
                                Open
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow>
            <CCol lg={12} className="mb-4">
              <CCard>
                <CCardHeader>
                  <strong>Pending sales orders</strong>
                  <small className="text-body-secondary ms-2">
                    Not fulfilled or cancelled
                  </small>
                </CCardHeader>
                <CCardBody>
                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Sales Order code</CTableHeaderCell>
                        <CTableHeaderCell>Company</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Pending amount</CTableHeaderCell>
                        <CTableHeaderCell>Created</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          Action
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {dashboard.pendingPurchaseOrders.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell
                            colSpan={6}
                            className="text-body-secondary text-center py-4"
                          >
                            No pending sales orders
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        dashboard.pendingPurchaseOrders.map((row) => (
                          <CTableRow key={row.id}>
                            <CTableDataCell>{row.poCode || "—"}</CTableDataCell>
                            <CTableDataCell>
                              {row.companyName || "—"}
                            </CTableDataCell>
                            <CTableDataCell>
                              {formatPoStatus(row.status)}
                            </CTableDataCell>
                            <CTableDataCell>
                              {formatAmount(row.remainingAmount)}
                            </CTableDataCell>
                            <CTableDataCell>
                              {dateTimeFormatter(row.createdAt, "—")}
                            </CTableDataCell>
                            <CTableDataCell className="text-end">
                              {row.quotationId ? (
                                <CButton
                                  color="primary"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    navigate(`/quotations/${row.quotationId}`)
                                  }
                                >
                                  Open quotation
                                </CButton>
                              ) : (
                                "—"
                              )}
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow>
            <CCol>
              <CCard className="mb-4">
                <CCardHeader>
                  <strong>Sales target progress</strong>
                  <small className="text-body-secondary ms-2">
                    Branch employee targets vs billing
                  </small>
                </CCardHeader>
                <CCardBody>
                  <CRow>
                    <CCol md={3}>
                      <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          Weekly target
                        </div>
                        <div className="fs-5 fw-semibold">
                          {formatAmount(dashboard.weeklyTarget)}
                        </div>
                        <div className="small text-body-secondary mt-1">
                          {targetPeriodLabel(
                            dashboard.weeklyPeriodFrom,
                            dashboard.weeklyPeriodTo,
                          )}
                        </div>
                      </div>
                    </CCol>
                    <CCol md={3}>
                      <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          Weekly billing
                        </div>
                        <div className="fs-5 fw-semibold">
                          {formatAmount(dashboard.weeklyBilling)}
                        </div>
                        <div className="small text-body-secondary mt-1">
                          {targetPeriodLabel(
                            dashboard.weeklyPeriodFrom,
                            dashboard.weeklyPeriodTo,
                          )}
                        </div>
                      </div>
                    </CCol>
                    <CCol md={3}>
                      <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          Monthly target
                        </div>
                        <div className="fs-5 fw-semibold">
                          {formatAmount(dashboard.monthlyTarget)}
                        </div>
                        <div className="small text-body-secondary mt-1">
                          {targetPeriodLabel(
                            dashboard.monthlyPeriodFrom,
                            dashboard.monthlyPeriodTo,
                          )}
                        </div>
                      </div>
                    </CCol>
                    <CCol md={3}>
                      <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          Monthly billing
                        </div>
                        <div className="fs-5 fw-semibold">
                          {formatAmount(dashboard.monthlyBilling)}
                        </div>
                        <div className="small text-body-secondary mt-1">
                          {targetPeriodLabel(
                            dashboard.monthlyPeriodFrom,
                            dashboard.monthlyPeriodTo,
                          )}
                        </div>
                      </div>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </>
      )}
    </>
  );
};

export default SalesDashboard;
