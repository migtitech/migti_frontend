import React from "react";
import { useNavigate } from "react-router-dom";
import { CAlert } from "@coreui/react";
import { useNotifications } from "../context/NotificationContext";
import NotificationDescription from "./notifications/NotificationDescription";

const RealtimeNotificationAlert = () => {
  const navigate = useNavigate();
  const { flash, clearFlash } = useNotifications();

  if (!flash) return null;

  return (
    <CAlert
      color="primary"
      dismissible
      className="shadow-sm py-2 px-3 mb-0"
      onClose={clearFlash}
      style={{
        position: "fixed",
        top: "4.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1040,
        maxWidth: "min(420px, 92vw)",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        style={{ cursor: "pointer" }}
        onClick={() => navigate("/notifications")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate("/notifications");
        }}
      >
        <div className="fw-semibold">{flash.title}</div>
        {flash.title || flash.description ? (
          <NotificationDescription
            notification={flash}
            className="small mt-1"
          />
        ) : null}
      </div>
    </CAlert>
  );
};

export default RealtimeNotificationAlert;
