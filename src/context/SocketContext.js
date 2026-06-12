import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { io } from "socket.io-client";
import { getSocketUrl } from "../api/endpoints";
import { getAccessToken } from "../api/axiosClient";
import { useAuth } from "./AuthContext";
import { emitNotificationNew } from "./notificationSocketBridge";
import { playSirenSound, playRateUpdateSound } from "../utils/sirenSound";
import { toast } from "react-hot-toast";

/** Set true when `wss://…/socket.io` is reachable; false skips all client socket usage (no WS errors in console/UI). */
const SOCKET_IO_ENABLED = true;

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const userId = user._id || user.id;
    if (!userId) return;

    if (!SOCKET_IO_ENABLED) {
      setIsConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = getSocketUrl();
    const token = getAccessToken();
    const socket = io(socketUrl, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      auth: token ? { token } : {},
      autoConnect: true,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("register", { userId: String(userId) });
      if (import.meta.env.DEV) {
        console.info("[socket] connected", socketUrl, "user", String(userId));
      }
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      if (import.meta.env.DEV) {
        console.info("[socket] disconnect", reason);
      }
    });

    socket.on("task:assigned", (payload) => {
      playSirenSound();
      const title = payload?.title || "New task";
      toast.success(`Task assigned: ${title}`, { duration: 5000 });
    });

    socket.on("task:rateUpdated", (payload) => {
      playRateUpdateSound();
      const title = payload?.title || "Task";
      const productName = payload?.productName || "";
      const rate =
        payload?.rate != null && !Number.isNaN(Number(payload.rate))
          ? `₹${Number(payload.rate).toLocaleString()}`
          : "";
      const msgParts = [];
      if (productName) msgParts.push(productName);
      if (rate) msgParts.push(rate);
      const detail = msgParts.length ? ` (${msgParts.join(" - ")})` : "";
      toast.success(`Price updated for ${title}${detail}`, { duration: 5000 });
    });

    socket.on("notification:new", (payload) => {
      if (import.meta.env.DEV) {
        console.info("[socket] notification:new", payload?.title, payload?._id);
      }
      emitNotificationNew(payload);
    });

    socket.on("connect_error", (err) => {
      setIsConnected(false);
      const msg =
        err?.message ||
        (typeof err === "string" ? err : "Could not connect to live updates");
      toast.error(`Realtime: ${msg}`, { duration: 6000 });
      if (import.meta.env.DEV) {
        console.error("[socket] connect_error", socketUrl, err);
      }
    });

    socketRef.current = socket;
    return () => {
      setIsConnected(false);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const value = useMemo(
    () => ({
      get socket() {
        return socketRef.current;
      },
      isConnected,
    }),
    [isConnected],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return ctx;
};
