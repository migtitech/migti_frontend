import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Alert } from "./ui";
import { useNotifications } from "../context/NotificationContext";
import NotificationDescription from "./notifications/NotificationDescription";

const RealtimeNotificationAlert = () => {
  const navigate = useNavigate();
  const { flash, clearFlash } = useNotifications();

  if (!flash) return null;

  return (
    <Alert
      variant="info"
      className="mb-0 py-2 pr-8 shadow-sm"
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
        className="flex-1"
        onClick={() => navigate("/notifications")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate("/notifications");
        }}
      >
        <div className="font-semibold">{flash.title}</div>
        {flash.title || flash.description ? (
          <NotificationDescription
            notification={flash}
            className="mt-1 text-xs"
          />
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={clearFlash}
        className="absolute right-2 top-2 rounded p-0.5 text-current opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
};

export default RealtimeNotificationAlert;
