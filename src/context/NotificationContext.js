import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { registerNotificationNewHandler } from "./notificationSocketBridge";
import * as notificationService from "../services/notificationService";
import { playNotificationSiren } from "../utils/sirenSound";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadList, setUnreadList] = useState([]);
  const [flash, setFlash] = useState(null);
  const flashTimerRef = useRef(null);

  const clearFlashTimer = useCallback(() => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  }, []);

  const showFlash = useCallback(
    (payload) => {
      clearFlashTimer();
      setFlash({
        title: payload?.title || "Notification",
        description: payload?.description || "",
      });
      playNotificationSiren();
      flashTimerRef.current = setTimeout(() => {
        setFlash(null);
        flashTimerRef.current = null;
      }, 5000);
    },
    [clearFlashTimer],
  );

  const clearFlash = useCallback(() => {
    clearFlashTimer();
    setFlash(null);
  }, [clearFlashTimer]);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const res = await notificationService.fetchNotifications({
        unreadOnly: true,
        pageNumber: 1,
        pageSize: 100,
      });
      const data = res?.data;
      const items = Array.isArray(data?.items) ? data.items : [];
      const total =
        typeof data?.totalItems === "number" ? data.totalItems : items.length;
      setUnreadList(items);
      setUnreadCount(total);
    } catch {
      // silent
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      setUnreadList([]);
      setFlash(null);
      clearFlashTimer();
      return undefined;
    }
    refreshUnread();
    return undefined;
  }, [isAuthenticated, user, refreshUnread, clearFlashTimer]);

  // useLayoutEffect so the bridge is registered before SocketProvider's useEffect
  // opens the connection (avoids missing the first notification:new).
  useLayoutEffect(() => {
    const unregister = registerNotificationNewHandler((payload) => {
      setUnreadCount((c) => c + 1);
      setUnreadList((prev) => {
        const next = [payload, ...prev.filter((p) => p?._id !== payload?._id)];
        return next;
      });
      showFlash(payload);
    });
    return () => {
      unregister();
      clearFlashTimer();
    };
  }, [showFlash, clearFlashTimer]);

  const markOneRead = useCallback(async (id) => {
    if (!id) return;
    try {
      await notificationService.markNotificationRead(id);
      setUnreadList((prev) => prev.filter((n) => String(n._id) !== String(id)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllNotificationsRead();
      setUnreadList([]);
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      unreadList,
      flash,
      clearFlash,
      refreshUnread,
      markOneRead,
      markAllRead,
    }),
    [
      unreadCount,
      unreadList,
      flash,
      clearFlash,
      refreshUnread,
      markOneRead,
      markAllRead,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return ctx;
};

export default NotificationContext;
