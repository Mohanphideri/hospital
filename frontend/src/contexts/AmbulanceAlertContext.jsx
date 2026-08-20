import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import { getSocket } from "../utils/socket.js";
import { playAlertBeep } from "../utils/alertSound.js";
import { showToast } from "../utils/toastBus.js";

const AmbulanceAlertContext = createContext(null);

const ROLES_THAT_HANDLE_AMBULANCE = ["receptionist", "admin"];

export function AmbulanceAlertProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [incoming, setIncoming] = useState([]); 
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const canHandle = user && ROLES_THAT_HANDLE_AMBULANCE.includes(user.role);
  const canHandleRef = useRef(canHandle);
  canHandleRef.current = canHandle;

  useEffect(() => {
    if (!canHandle) return undefined;

    
    
    
    let cancelled = false;
    let attempts = 0;
    let handler;

    const attach = () => {
      if (cancelled) return;
      const socket = getSocket();
      if (!socket) {
        if (attempts++ < 20) setTimeout(attach, 250);
        return;
      }

      handler = (request) => {
        if (!canHandleRef.current) return;
        setUnreadCount((c) => c + 1);
        setIncoming((prev) => [request, ...prev]);
        showToast(`New ambulance request from ${request.callerName} — ${request.location}`, "error");
        playAlertBeep();

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const notif = new Notification("New ambulance request", {
              body: `${request.callerName} · ${request.location}`,
              tag: request._id,
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          } catch {
            
          }
        }
      };

      socket.on("ambulance-request-created", handler);
    };

    attach();

    return () => {
      cancelled = true;
      const socket = getSocket();
      if (socket && handler) socket.off("ambulance-request-created", handler);
    };
  }, [canHandle]);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  const consumeIncoming = useCallback(() => {
    setIncoming([]);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported";
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    return result;
  }, []);

  return (
    <AmbulanceAlertContext.Provider
      value={{ unreadCount, incoming, clearUnread, consumeIncoming, notifPermission, requestNotificationPermission }}
    >
      {children}
    </AmbulanceAlertContext.Provider>
  );
}

export function useAmbulanceAlerts() {
  const ctx = useContext(AmbulanceAlertContext);
  if (!ctx) throw new Error("useAmbulanceAlerts must be used within AmbulanceAlertProvider");
  return ctx;
}
