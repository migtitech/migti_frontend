import React from "react";
import { CCard, CCardBody, CCardHeader, CButton, CBadge } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilUser,
  cilClock,
  cilEnvelopeClosed,
  cilPhone,
  cilPencil,
  cilCheckAlt,
} from "@coreui/icons";
import EyeIcon from "../EyeIcon";

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yy = String(d.getFullYear()).slice(-2);
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${dd}/${mm}/${yy} ${hh}:${min}:${ss}`;
};

const getActivityIcon = (type) => {
  switch (type) {
    case "viewed":
      return null;
    case "action":
      return cilPencil;
    case "follow_up":
      return cilCheckAlt;
    default:
      return cilPencil;
  }
};

const getActivityLabel = (type) => {
  switch (type) {
    case "viewed":
      return "Viewed";
    case "action":
      return "Action Recorded";
    case "follow_up":
      return "Follow-up";
    default:
      return type || "Activity";
  }
};

const getActivityBadgeColor = (type) => {
  switch (type) {
    case "viewed":
      return "info";
    case "action":
      return "warning";
    case "follow_up":
      return "success";
    default:
      return "secondary";
  }
};

const getFollowUpStatusColor = (status) => {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "primary";
    case "pending":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "secondary";
  }
};

const getTimestamp = (act) =>
  act.createdAt || act.created_at || act.timestamp || null;

/**
 * Reusable Tracking Timeline - same as Tracking page.
 * @param {Object} query - { createdAt, created_at }
 * @param {Array} activities - list of activities
 * @param {Object} pagination - { currentPage, totalPages, totalItems, hasPrevPage, hasNextPage }
 * @param {boolean} loading
 * @param {Function} onLoadPage - (page) => void
 * @param {Object} creator - { name, email, role }
 * @param {Function} getPerformerInfo - (act) => ({ name, email, phone, role })
 * @param {React.ReactNode} headerActions - optional buttons for header (Action, Follow-up)
 */
const TrackingTimeline = ({
  query,
  activities = [],
  pagination = null,
  loading = false,
  onLoadPage,
  creator,
  getPerformerInfo,
  headerActions,
}) => {
  const totalItems = pagination?.totalItems ?? activities.length;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.currentPage ?? 1;
  const hasPagination = totalPages > 1;

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <strong>Tracking Timeline</strong>
        <div className="d-flex align-items-center gap-2">
          {headerActions}
          <CBadge color="primary" shape="rounded-pill">
            {totalItems} {totalItems === 1 ? "activity" : "activities"}
          </CBadge>
          {hasPagination && (
            <div className="d-flex align-items-center gap-1">
              <CButton
                color="light"
                size="sm"
                disabled={!pagination?.hasPrevPage || loading}
                onClick={() => onLoadPage && onLoadPage(currentPage - 1)}
              >
                Prev
              </CButton>
              <span className="small text-muted px-2">
                Page {currentPage} of {totalPages}
              </span>
              <CButton
                color="light"
                size="sm"
                disabled={!pagination?.hasNextPage || loading}
                onClick={() => onLoadPage && onLoadPage(currentPage + 1)}
              >
                Next
              </CButton>
            </div>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        {/* Created entry */}
        <div className="d-flex align-items-start mb-3 pb-3 border-bottom">
          <div
            className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3"
            style={{ width: 40, height: 40, minWidth: 40 }}
          >
            <CIcon icon={cilUser} className="text-white" />
          </div>
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">Created</CBadge>
              <span className="small text-muted">
                <CIcon icon={cilClock} size="sm" className="me-1" />
                {formatDateTime(query?.createdAt || query?.created_at)}
              </span>
            </div>
            <div className="mt-1">
              <div className="d-flex align-items-center gap-1">
                <CIcon icon={cilUser} size="sm" className="text-muted" />
                <span className="fw-semibold">
                  {(creator && (creator.name || creator.email)) || "—"}
                </span>
                {creator?.role && (
                  <CBadge
                    color="light"
                    textColor="dark"
                    size="sm"
                    className="ms-1"
                  >
                    {creator.role}
                  </CBadge>
                )}
              </div>
              {creator?.email && (
                <div className="small text-muted ms-3">
                  <CIcon icon={cilEnvelopeClosed} size="sm" className="me-1" />
                  {creator.email}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity timeline */}
        {loading ? (
          <div className="text-center py-4 text-muted">
            <span className="spinner-border spinner-border-sm me-2" />
            Loading activities...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <CIcon icon={cilClock} size="xl" className="mb-2 d-block mx-auto" />
            No tracking activities recorded yet.
          </div>
        ) : (
          activities.map((act, index) => {
            const performer = getPerformerInfo
              ? getPerformerInfo(act)
              : { name: null, email: null, phone: null, role: null };
            const timestamp = getTimestamp(act);
            const isLast = index === activities.length - 1;
            return (
              <div
                key={act._id || act.id || index}
                className={`d-flex align-items-start mb-3 ${!isLast ? "pb-3 border-bottom" : ""}`}
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    backgroundColor: `var(--cui-${getActivityBadgeColor(act.type)})`,
                  }}
                >
                  {act.type === "viewed" ? (
                    <EyeIcon size={20} className="text-white" />
                  ) : (
                    <CIcon
                      icon={getActivityIcon(act.type)}
                      className="text-white"
                    />
                  )}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <CBadge color={getActivityBadgeColor(act.type)}>
                      {getActivityLabel(act.type)}
                    </CBadge>
                    <span className="small text-muted">
                      <CIcon icon={cilClock} size="sm" className="me-1" />
                      {formatDateTime(timestamp)}
                    </span>
                  </div>

                  <div className="mt-1">
                    <div className="d-flex align-items-center gap-2">
                      <CIcon icon={cilUser} size="sm" className="text-muted" />
                      <span className="fw-semibold">
                        {performer?.name || act.performByName || "—"}
                      </span>
                      {performer?.role && (
                        <CBadge color="light" textColor="dark" size="sm">
                          {performer.role}
                        </CBadge>
                      )}
                    </div>
                    {performer?.email && (
                      <div className="small text-muted ms-4">
                        <CIcon
                          icon={cilEnvelopeClosed}
                          size="sm"
                          className="me-1"
                        />
                        {performer.email}
                      </div>
                    )}
                    {performer?.phone && (
                      <div className="small text-muted ms-4">
                        <CIcon icon={cilPhone} size="sm" className="me-1" />
                        {performer.phone}
                      </div>
                    )}
                  </div>

                  {act.type === "action" &&
                    (act.meta?.action || act.metadata?.action) && (
                      <div className="mt-2 p-2 bg-light rounded small">
                        <strong>Action:</strong>{" "}
                        {act.meta?.action || act.metadata?.action}
                      </div>
                    )}

                  {act.type === "follow_up" && (
                    <div className="mt-2 p-2 bg-light rounded small">
                      {(act.meta?.followUpStatus ||
                        act.metadata?.followUpStatus) && (
                        <div className="mb-1">
                          <strong>Status:</strong>{" "}
                          <CBadge
                            color={getFollowUpStatusColor(
                              act.meta?.followUpStatus ||
                                act.metadata?.followUpStatus,
                            )}
                          >
                            {act.meta?.followUpStatus ||
                              act.metadata?.followUpStatus}
                          </CBadge>
                        </div>
                      )}
                      {(act.meta?.note || act.metadata?.note) && (
                        <div>
                          <strong>Note:</strong>{" "}
                          {act.meta?.note || act.metadata?.note}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CCardBody>
    </CCard>
  );
};

export default TrackingTimeline;
