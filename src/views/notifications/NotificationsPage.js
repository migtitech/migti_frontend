import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CheckCheck } from "lucide-react";
import { TablePagination } from "../../components";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Spinner,
  Alert,
  AlertDescription,
  Select,
} from "../../components/ui";
import * as notificationService from "../../services/notificationService";
import { useNotifications } from "../../context/NotificationContext";
import { registerNotificationNewHandler } from "../../context/notificationSocketBridge";
import NotificationDescription from "../../components/notifications/NotificationDescription";
import { dateTimeFormatter } from "../../utils/dateFormatter";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const NotificationsPage = () => {
  const { markOneRead, markAllRead } = useNotifications();
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

  // Live updates: prepend socket payload on page 1 (no API refetch).
  useEffect(() => {
    const unregister = registerNotificationNewHandler((payload) => {
      if (pageNumber !== 1 || !payload?._id) return;
      if (filter === "unread" && payload.isRead) return;
      const id = String(payload._id);
      setItems((prev) => {
        if (prev.some((n) => String(n._id) === id)) return prev;
        return [payload, ...prev].slice(0, pageSize);
      });
      setTotalItems((t) => t + 1);
    });
    return () => unregister();
  }, [filter, pageNumber, pageSize]);

  const handleMarkOne = async (id, isRead) => {
    if (!id || isRead) return;
    try {
      await markOneRead(id);
      if (filter === "unread") {
        setItems((prev) => prev.filter((n) => String(n._id) !== String(id)));
        setTotalItems((t) => Math.max(0, t - 1));
      } else {
        setItems((prev) =>
          prev.map((n) =>
            String(n._id) === String(id)
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n,
          ),
        );
      }
    } catch {
      // silent
    }
  };

  const handleMarkAll = async () => {
    setMarking(true);
    try {
      await markAllRead();
      if (filter === "unread") {
        setItems([]);
        setTotalItems(0);
      } else {
        setItems((prev) =>
          prev.map((n) => ({
            ...n,
            isRead: true,
            readAt: n.readAt || new Date().toISOString(),
          })),
        );
      }
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

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-2 border-b border-border py-4">
        <div className="mr-auto">
          <h5 className="text-base font-semibold">Notifications</h5>
          <small className="text-muted-foreground">
            {totalItems} {filter === "unread" ? "unread" : "total"}
          </small>
        </div>
        <div className="inline-flex gap-1" role="group" aria-label="Filter">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => handleFilter("all")}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "unread" ? "default" : "outline"}
            onClick={() => handleFilter("unread")}
          >
            Unread
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleMarkAll}
          disabled={marking || items.every((n) => n.isRead)}
        >
          <CheckCheck className="mr-1 h-4 w-4" />
          Mark all read
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {error ? (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            No notifications to show
          </div>
        ) : (
          <ul className="mb-0 list-none p-0">
            {items.map((n) => (
              <li
                key={String(n._id)}
                className={`flex items-start gap-3 rounded border-b border-border px-3 py-2 ${
                  n.isRead ? "bg-transparent" : "cursor-pointer bg-accent"
                }`}
                onClick={() => handleMarkOne(n._id, n.isRead)}
              >
                <span
                  className={`mt-2 h-2 w-2 flex-none rounded-full ${
                    n.isRead ? "bg-muted-foreground" : "bg-primary!"
                  }`}
                  aria-hidden
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{n.title}</span>
                    {n.isRead ? (
                      <Badge variant="secondary">Read</Badge>
                    ) : (
                      <Badge>Unread</Badge>
                    )}
                  </div>
                  {n.description ? (
                    <NotificationDescription
                      notification={n}
                      className="small mt-1"
                    />
                  ) : null}
                  <div className="mt-1 text-sm text-muted-foreground">
                    {dateTimeFormatter(n.createdAt, "")}
                  </div>
                </div>
                {!n.isRead ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkOne(n._id, n.isRead);
                    }}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Mark read
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="mr-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Per page</span>
            <Select
              className="h-8 w-20"
              value={String(pageSize)}
              onChange={(e) => handlePageSize(e.target.value)}
            >
              {PAGE_SIZE_OPTIONS.map((v) => (
                <option key={v} value={String(v)}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <TablePagination
            currentPage={pageNumber}
            totalPages={totalPages}
            onPageChange={setPageNumber}
            align="end"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationsPage;
