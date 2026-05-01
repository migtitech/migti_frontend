import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CAlert,
  CListGroup,
  CListGroupItem,
  CBadge,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBasket, cilArrowRight, cilLockLocked } from "@coreui/icons";
import { useAuth } from "../../context/AuthContext";
import usePermissions from "../../hooks/usePermissions";
import proBucketService from "../../services/proBucketService";
import { toastError } from "../../utils/toast";
import { Loader } from "../../components";

/** Purchase / procurement workspace modules we surface on this dashboard */
const ACCESSIBLE_AREAS = [
  {
    module: "pro_bucket",
    title: "Pro Bucket",
    to: "/pro-bucket",
    blurb: "Query lines, rates, and status for assigned product groups.",
  },
  {
    module: "purchase_bucket",
    title: "Purchase Bucket",
    to: "/purchase-bucket",
    blurb: "Purchase queue and PO product follow-up.",
  },
  {
    module: "po_bucket",
    title: "PO Bucket",
    to: "/po-bucket",
    blurb: "Purchase order queue and line management.",
  },
  {
    module: "inventory_bucket",
    title: "Inventory bucket",
    to: "/inventory-bucket",
    blurb: "Inventory-linked purchase lines.",
  },
  {
    module: "dispatchment",
    title: "Dispatchment",
    to: "/dispatchment",
    blurb: "Dispatch and fulfillment.",
  },
  {
    module: "purchase_tasks",
    title: "Procurement Bucket",
    to: "/purchase-tasks",
    blurb: "Purchase tasks and rate work.",
  },
  {
    module: "follow_up",
    title: "Follow up Bucket",
    to: "/follow-up",
    blurb: "Follow-ups on queries and orders.",
  },
  {
    module: "dmg",
    title: "DMG Bucket",
    to: "/dmg",
    blurb: "DMG bucket items.",
  },
  {
    module: "po_payment",
    title: "PO payment",
    to: "/po-payment",
    blurb: "PO payment and billing sidebar.",
  },
];

const emptySummary = () => ({
  pending: 0,
  rateSubmitted: 0,
  fulfilled: 0,
});

/** Derive dashboard counts from the same rows as Pro Bucket list (`status` field). */
const summarizeStatuses = (rows) => {
  const out = emptySummary();
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    const s = row?.status;
    if (s === "pending") out.pending += 1;
    else if (s === "rate_submitted") out.rateSubmitted += 1;
    else if (s === "fulfilled") out.fulfilled += 1;
  }
  return out;
};

const ProDashboard = () => {
  const { user } = useAuth();
  const { hasAnyPermission, isFullAccess } = usePermissions();
  const canProBucket = hasAnyPermission("pro_bucket");
  const [summary, setSummary] = useState(emptySummary);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    if (!canProBucket) {
      setSummary(emptySummary());
      setStatsError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      setStatsError(null);
      try {
        const rows = await proBucketService.listAllForCounts();
        if (cancelled) return;
        setSummary(summarizeStatuses(rows));
      } catch (e) {
        if (!cancelled) {
          const msg = e?.message || "Could not load Pro Bucket counts";
          setStatsError(msg);
          toastError(msg);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canProBucket]);

  const areasYouCanOpen = useMemo(
    () => ACCESSIBLE_AREAS.filter((a) => hasAnyPermission(a.module)),
    [hasAnyPermission],
  );

  const otherModules = useMemo(() => {
    const listed = new Set(ACCESSIBLE_AREAS.map((a) => a.module));
    const keys = new Set();
    for (const p of user?.permissions || []) {
      const mod = String(p).split(":")[0];
      if (mod && !listed.has(mod)) keys.add(mod);
    }
    return [...keys].sort();
  }, [user?.permissions]);

  return (
    <>
      <CRow className="mb-4">
        <CCol>
          <h2 className="mb-1">Pro workspace</h2>
          <p className="text-body-secondary mb-1">
            Welcome{user?.name ? `, ${user.name}` : ""}. Quick links reflect
            your permissions.
          </p>
        </CCol>
      </CRow>

      {canProBucket && (
        <CRow className="mb-4 g-3">
          {statsError ? (
            <CCol xs={12}>
              <CAlert color="danger" className="mb-0">
                {statsError}
              </CAlert>
            </CCol>
          ) : (
            <>
              <CCol sm={6} lg={4}>
                <CCard className="h-100 border-0 shadow-sm text-center border-start border-warning border-4">
                  <CCardBody className="py-4">
                    <div className="text-body-secondary small text-uppercase fw-semibold mb-2">
                      Pending
                    </div>
                    {statsLoading ? (
                      <div className="d-flex justify-content-center py-3">
                        <Loader />
                      </div>
                    ) : (
                      <div className="display-5 fw-bold text-warning">
                        {summary.pending}
                      </div>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol sm={6} lg={4}>
                <CCard className="h-100 border-0 shadow-sm text-center border-start border-info border-4">
                  <CCardBody className="py-4">
                    <div className="text-body-secondary small text-uppercase fw-semibold mb-2">
                      Rate submitted
                    </div>
                    {statsLoading ? (
                      <div className="d-flex justify-content-center py-3">
                        <Loader />
                      </div>
                    ) : (
                      <div className="display-5 fw-bold text-info">
                        {summary.rateSubmitted}
                      </div>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol sm={6} lg={4}>
                <CCard className="h-100 border-0 shadow-sm text-center border-start border-success border-4">
                  <CCardBody className="py-4">
                    <div className="text-body-secondary small text-uppercase fw-semibold mb-2">
                      Fulfilled
                    </div>
                    {statsLoading ? (
                      <div className="d-flex justify-content-center py-3">
                        <Loader />
                      </div>
                    ) : (
                      <div className="display-5 fw-bold text-success">
                        {summary.fulfilled}
                      </div>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            </>
          )}
        </CRow>
      )}

      <CRow className="mb-4">
        <CCol>
          <CCard className="h-100 border-0 shadow-sm">
            <CCardHeader className="d-flex align-items-center gap-2 bg-body-tertiary fw-semibold">
              <CIcon icon={cilLockLocked} className="text-body-secondary" />
              Your access
            </CCardHeader>
            <CCardBody>
              {isFullAccess ? (
                <CAlert color="info" className="mb-0">
                  You have full access; all modules are available from the main
                  sidebar.
                </CAlert>
              ) : areasYouCanOpen.length === 0 && otherModules.length === 0 ? (
                <CAlert color="warning" className="mb-0">
                  No workspace modules are assigned yet. Ask an administrator to
                  grant Pro Bucket (or related) permissions.
                </CAlert>
              ) : (
                <>
                  {areasYouCanOpen.length > 0 && (
                    <CListGroup flush className="mb-3">
                      {areasYouCanOpen.map((a) => (
                        <CListGroupItem
                          key={a.module}
                          className="d-flex justify-content-between align-items-start flex-wrap gap-2"
                        >
                          <div>
                            <div className="fw-semibold">{a.title}</div>
                            <div className="small text-body-secondary">
                              {a.blurb}
                            </div>
                          </div>
                          <Link
                            to={a.to}
                            className="btn btn-sm btn-primary text-nowrap"
                          >
                            Open
                            <CIcon
                              icon={cilArrowRight}
                              className="ms-1"
                              size="sm"
                            />
                          </Link>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  )}
                  {otherModules.length > 0 && (
                    <div>
                      <div className="small text-body-secondary mb-2">
                        Other permission modules on your account (no quick link
                        configured here):
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        {otherModules.map((m) => (
                          <CBadge key={m} color="secondary">
                            {m}
                          </CBadge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol>
          <CCard className="border-0 shadow-sm">
            <CCardHeader className="d-flex align-items-center gap-2 bg-primary text-white">
              <CIcon icon={cilBasket} />
              <strong>Pro Bucket</strong>
            </CCardHeader>
            <CCardBody>
              <p className="text-body-secondary mb-3">
                Open the list to work lines, add rates, and update status.
              </p>
              {hasAnyPermission("pro_bucket") ? (
                <Link to="/pro-bucket" className="btn btn-primary">
                  Go to Pro Bucket list
                  <CIcon icon={cilArrowRight} className="ms-1" size="sm" />
                </Link>
              ) : (
                <span className="text-body-secondary">
                  No access to Pro Bucket.
                </span>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default ProDashboard;
