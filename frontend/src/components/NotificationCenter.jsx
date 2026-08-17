import { useState, useRef, useEffect } from "react";
import { Bell, Ambulance } from "lucide-react";
import { useAmbulanceAlerts } from "../contexts/AmbulanceAlertContext.jsx";
import { useNavigate } from "react-router-dom";

export default function NotificationCenter({ config }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { incoming, unreadCount, clearUnread } = useAmbulanceAlerts();

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasAmbulanceSection = config.sections.some((s) => s.path === "ambulance-requests");
  const items = hasAmbulanceSection
    ? incoming.slice(0, 8).map((r) => ({
        id: r._id,
        title: "Emergency ambulance request",
        detail: r.patientName ? `${r.patientName} · ${r.location || "location pending"}` : r.location || "New request",
        time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      }))
    : [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
        }}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-control text-text-secondary hover:bg-slate-100 hover:text-text-primary transition-colors duration-150"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {hasAmbulanceSection && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-card bg-white border border-slate-200 shadow-popover overflow-hidden z-50 animate-scaleIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-card-title text-text-primary">Notifications</span>
            {hasAmbulanceSection && items.length > 0 && (
              <button
                onClick={() => {
                  clearUnread();
                  setOpen(false);
                }}
                className="text-small font-medium text-primary hover:text-primary-dark"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-body text-text-secondary">You're all caught up.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/${config.role}/ambulance-requests`);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors duration-150 border-b border-slate-50 last:border-0"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                    <Ambulance className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-text-primary truncate">{n.title}</span>
                    <span className="block text-small text-text-secondary truncate">{n.detail}</span>
                  </span>
                  <span className="text-small text-text-secondary shrink-0">{n.time}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
