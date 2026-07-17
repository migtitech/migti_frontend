import React from "react";
import {
  getNotificationDisplayContent,
  NOTIFICATION_GRID_COLUMNS,
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
        <div className="mb-1 text-xs text-muted-foreground">{intro}</div>
      ) : null}
      {lines.length ? (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${NOTIFICATION_GRID_COLUMNS}, minmax(0, 1fr))`,
          }}
        >
          {lines.map((line, index) => {
            const key = line.label || `line-${index}`;

            if (!line.label) {
              return (
                <div style={{ gridColumn: "1 / -1" }} key={key}>
                  <div className="text-xs text-muted-foreground">
                    {line.value}
                  </div>
                </div>
              );
            }

            return (
              <div key={key}>
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">
                    {line.label}
                  </div>
                  <div className="truncate" title={line.value}>
                    {line.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationDescription;
