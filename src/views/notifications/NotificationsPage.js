import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CButtonGroup,
  CBadge,
  CSpinner,
  CAlert,
  CFormSelect,
  CPagination,
  CPaginationItem,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilCheck, cilCheckAlt } from "@coreui/icons";
import * as notificationService from "../../services/notificationService";
import { useNotifications } from "../../context/NotificationContext";
import { registerNotificationNewHandler } from "../../context/notificationSocketBridge";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
};

const NotificationsPage = () => {
  const { refreshUnread } = useNotifications();
  const [filter, setFilter] = useState("unread");
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await notificationService.fetchNotifications({
        unreadOnly: filter === "unread",
        pageNumber,
        pageSize,
      });
      const data = res?.data;
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      setTotalItems(
        typeof data?.totalItems === "number" ? data.totalItems : list.length,
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load notifications");
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [filter, pageNumber, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates: when a new notification arrives via socket, refresh page 1
  useEffect(() => {
    const unregister = registerNotificationNewHandler(() => {
      if (pageNumber === 1) load();
    });
    return () => unregister();
  }, [load, pageNumber]);

  const handleMarkOne = async (id, isRead) => {
    if (!id || isRead) return;
    try {
      await notificationService.markNotificationRead(id);
      setItems((prev) =>
        prev.map((n) =>
          String(n._id) === String(id)
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n,
        ),
      );
      refreshUnread();
    } catch {
      // silent
    }
  };

  const handleMarkAll = async () => {
    setMarking(true);
    try {
      await notificationService.markAllNotificationsRead();
      setItems((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        })),
      );
      refreshUnread();
      if (filter === "unread") load();
    } catch {
      // silent
    } finally {
      setMarking(false);
    }
  };

  const handleFilter = (next) => {
    if (next === filter) return;
    setFilter(next);
    setPageNumber(1);
  };

  const handlePageSize = (value) => {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      setPageSize(parsed);
      setPageNumber(1);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, pageNumber - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);

    return (
      <CPagination className="mb-0" align="end">
        <CPaginationItem
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
        >
          Prev
        </CPaginationItem>
        {pages.map((p) => (
          <CPaginationItem
            key={p}
            active={p === pageNumber}
            onClick={() => setPageNumber(p)}
          >
            {p}
          </CPaginationItem>
        ))}
        <CPaginationItem
          disabled={pageNumber >= totalPages}
          onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </CPaginationItem>
      </CPagination>
    );
  };

  return (
    <CCard>
      <CCardHeader className="d-flex flex-wrap align-items-center gap-2">
        <div className="me-auto">
          <h5 className="mb-0">Notifications</h5>
          <small className="text-body-secondary">
            {totalItems} {filter === "unread" ? "unread" : "total"}
          </small>
        </div>
        <CButtonGroup size="sm" role="group" aria-label="Filter">
          <CButton
            color={filter === "all" ? "primary" : "secondary"}
            variant={filter === "all" ? undefined : "outline"}
            onClick={() => handleFilter("all")}
          >
            All
          </CButton>
          <CButton
            color={filter === "unread" ? "primary" : "secondary"}
            variant={filter === "unread" ? undefined : "outline"}
            onClick={() => handleFilter("unread")}
          >
            Unread
          </CButton>
        </CButtonGroup>
        <CButton
          size="sm"
          color="primary"
          variant="outline"
          onClick={handleMarkAll}
          disabled={marking || items.every((n) => n.isRead)}
        >
          <CIcon icon={cilCheckAlt} className="me-1" />
          Mark all read
        </CButton>
      </CCardHeader>
      <CCardBody>
        {error ? (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        ) : null}

        {loading ? (
          <div className="d-flex justify-content-center py-4">
            <CSpinner color="primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-body-secondary py-4">
            No notifications to show
          </div>
        ) : (
          <ul className="list-unstyled mb-0">
            {items.map((n) => (
              <li
                key={String(n._id)}
                className="d-flex align-items-start gap-3 py-2 border-bottom"
                style={{
                  cursor: n.isRead ? "default" : "pointer",
                  background: n.isRead
                    ? "transparent"
                    : "var(--cui-tertiary-bg)",
                  paddingLeft: "0.75rem",
                  paddingRight: "0.75rem",
                  borderRadius: "0.25rem",
                }}
                onClick={() => handleMarkOne(n._id, n.isRead)}
              >
                <span
                  className="rounded-circle mt-2"
                  style={{
                    width: "0.55rem",
                    height: "0.55rem",
                    flex: "0 0 auto",
                    background: n.isRead
                      ? "var(--cui-secondary)"
                      : "var(--cui-primary)",
                  }}
                  aria-hidden
                />
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold">{n.title}</span>
                    {n.isRead ? (
                      <CBadge color="secondary" shape="rounded-pill">
                        Read
                      </CBadge>
                    ) : (
                      <CBadge color="primary" shape="rounded-pill">
                        Unread
                      </CBadge>
                    )}
                  </div>
                  {n.description ? (
                    <div className="small text-body-secondary mt-1">
                      {n.description}
                    </div>
                  ) : null}
                  <div className="small text-body-secondary mt-1">
                    {formatDateTime(n.createdAt)}
                  </div>
                </div>
                {!n.isRead ? (
                  <CButton
                    size="sm"
                    color="primary"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkOne(n._id, n.isRead);
                    }}
                  >
                    <CIcon icon={cilCheck} className="me-1" />
                    Mark read
                  </CButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <div className="d-flex align-items-center gap-2 me-auto">
            <span className="small text-body-secondary">Per page</span>
            <CFormSelect
              size="sm"
              style={{ width: "5rem" }}
              value={String(pageSize)}
              onChange={(e) => handlePageSize(e.target.value)}
            >
              {PAGE_SIZE_OPTIONS.map((v) => (
                <option key={v} value={String(v)}>
                  {v}
                </option>
              ))}
            </CFormSelect>
          </div>
          {renderPagination()}
        </div>
      </CCardBody>
    </CCard>
  );
};

export default NotificationsPage;
