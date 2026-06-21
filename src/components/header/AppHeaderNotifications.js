import React from "react";
import { useNavigate } from "react-router-dom";
import { CBadge } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBell } from "@coreui/icons";
import { useNotifications } from "../../context/NotificationContext";
import { useSocket } from "../../context/SocketContext";

const AppHeaderNotifications = () => {
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  const { unreadCount } = useNotifications();

  const goToNotifications = () => {
    navigate("/notifications");
  };

  return (
    <li className="nav-item">
      <button
        type="button"
        className="nav-link position-relative py-1 border-0 bg-transparent"
        onClick={goToNotifications}
        title={
          isConnected
            ? "Open notifications"
            : "Open notifications (live updates disconnected)"
        }
      >
        <CIcon icon={cilBell} size="lg" />
        <span
          className="position-absolute rounded-circle border border-light"
          style={{
            width: "0.55rem",
            height: "0.55rem",
            right: "2px",
            bottom: "4px",
            backgroundColor: isConnected
              ? "var(--cui-success)"
              : "var(--cui-secondary)",
          }}
          aria-hidden
        />
        {unreadCount > 0 ? (
          <CBadge
            color="danger"
            position="top-end"
            className="p-1"
            style={{ fontSize: "0.65rem" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </CBadge>
        ) : null}
      </button>
    </li>
  );
};

export default AppHeaderNotifications;
