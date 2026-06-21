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
import { installNotificationAudioUnlock } from "../utils/sirenSound";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadList, setUnreadList] = useState([]);
  const [flash, setFlash] = useState(null);
  const flashTimerRef = useRef(null);
  const alertedIdsRef = useRef(new Set());

  const clearFlashTimer = useCallback(() => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  }, []);

  const deliverLiveNotification = useCallback(
    (payload) => {
      const id = String(payload?._id || "");
      if (!id || alertedIdsRef.current.has(id)) return;
      alertedIdsRef.current.add(id);

      setUnreadCount((c) => c + 1);
      setUnreadList((prev) => {
        const next = [payload, ...prev.filter((p) => String(p?._id) !== id)];
        return next;
      });

      clearFlashTimer();
      setFlash({
        title: payload?.title || "Notification",
        description: payload?.description || "",
        metadata:
          payload?.metadata && typeof payload.metadata === "object"
            ? payload.metadata
            : {},
      });
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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      setUnreadList([]);
      setFlash(null);
      alertedIdsRef.current = new Set();
      clearFlashTimer();
      return undefined;
    }
    installNotificationAudioUnlock();
    return undefined;
  }, [isAuthenticated, user, clearFlashTimer]);

  // useLayoutEffect so the bridge is registered before SocketProvider's useEffect
  // opens the connection (avoids missing the first notification:new).
  useLayoutEffect(() => {
    const unregister = registerNotificationNewHandler((payload) => {
      deliverLiveNotification(payload);
    });
    return () => {
      unregister();
      clearFlashTimer();
    };
  }, [deliverLiveNotification, clearFlashTimer]);

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
      markOneRead,
      markAllRead,
    }),
    [unreadCount, unreadList, flash, clearFlash, markOneRead, markAllRead],
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
