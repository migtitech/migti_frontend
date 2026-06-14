import React, { useEffect, useState } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CAlert,
} from "@coreui/react";
import { useAuth } from "../../context/AuthContext";
import usePermissions from "../../hooks/usePermissions";
import proBucketService from "../../services/proBucketService";
import { toastError } from "../../utils/toast";
import { Loader } from "../../components";

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
  const { hasAnyPermission } = usePermissions();
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
    </>
  );
};

export default ProDashboard;
