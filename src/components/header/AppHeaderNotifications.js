import React from "react";
import {
  CBadge,
  CDropdown,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CAlert,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBell } from "@coreui/icons";
import { useNotifications } from "../../context/NotificationContext";
import { useSocket } from "../../context/SocketContext";

const AppHeaderNotifications = () => {
  const { isConnected } = useSocket();
  const {
    unreadCount,
    unreadList,
    flash,
    refreshUnread,
    markOneRead,
  } = useNotifications();

  return (
    <>
      {flash ? (
        <CAlert
          color="primary"
          className="shadow-sm py-2 px-3 mb-0"
          style={{
            position: "fixed",
            top: "4.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1040,
            maxWidth: "min(420px, 92vw)",
          }}
        >
          <div className="fw-semibold">{flash.title}</div>
          {flash.description ? (
            <div className="small text-body-secondary mt-1">{flash.description}</div>
          ) : null}
        </CAlert>
      ) : null}
      <CDropdown variant="nav-item" placement="bottom-end" autoClose="outside">
        <CDropdownToggle
          caret={false}
          className="position-relative py-1"
          onClick={() => refreshUnread()}
          title={
            isConnected
              ? "Live updates connected"
              : "Live updates disconnected — check API URL and that the backend is running"
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
              backgroundColor: isConnected ? "var(--cui-success)" : "var(--cui-secondary)",
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
        </CDropdownToggle>
        <CDropdownMenu className="pt-0" style={{ minWidth: "320px", maxHeight: "380px", overflowY: "auto" }}>
          <CDropdownHeader className="bg-body-secondary fw-semibold">
            Unread notifications
          </CDropdownHeader>
          {unreadList.length === 0 ? (
            <CDropdownItem disabled className="text-body-secondary">
              No unread notifications
            </CDropdownItem>
          ) : (
            unreadList.map((n) => (
              <CDropdownItem
                key={String(n._id)}
                as="button"
                type="button"
                className="text-start"
                style={{ cursor: "pointer", whiteSpace: "normal" }}
                onClick={() => markOneRead(n._id)}
              >
                <div className="fw-semibold">{n.title}</div>
                {n.description ? (
                  <div className="small text-body-secondary">{n.description}</div>
                ) : null}
              </CDropdownItem>
            ))
          )}
        </CDropdownMenu>
      </CDropdown>
    </>
  );
};

export default AppHeaderNotifications;
