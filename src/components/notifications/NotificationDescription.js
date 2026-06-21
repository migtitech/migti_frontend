import React from "react";
import { CRow, CCol } from "@coreui/react";
import {
  getNotificationDisplayContent,
  NOTIFICATION_GRID_COL_SIZE,
} from "../../utils/notificationDisplay";

/**
 * Renders any notification description using centralized display rules:
 * optional intro + 3-column grid of label/value fields.
 */
const NotificationDescription = ({
  notification,
  description,
  className = "",
}) => {
  const source =
    notification && typeof notification === "object"
      ? notification
      : { description };

  const { intro, lines } = getNotificationDisplayContent(source);
  if (!intro && !lines.length) return null;

  return (
    <div className={className}>
      {intro ? (
        <div className="mb-1 small text-body-secondary">{intro}</div>
      ) : null}
      {lines.length ? (
        <CRow className="g-2">
          {lines.map((line, index) => {
            const key = line.label || `line-${index}`;

            if (!line.label) {
              return (
                <CCol xs={12} key={key}>
                  <div className="small text-body-secondary">{line.value}</div>
                </CCol>
              );
            }

            return (
              <CCol xs={NOTIFICATION_GRID_COL_SIZE} key={key}>
                <div className="small text-body-secondary">
                  <div className="fw-medium text-body">{line.label}</div>
                  <div className="text-truncate" title={line.value}>
                    {line.value}
                  </div>
                </div>
              </CCol>
            );
          })}
        </CRow>
      ) : null}
    </div>
  );
};

export default NotificationDescription;
