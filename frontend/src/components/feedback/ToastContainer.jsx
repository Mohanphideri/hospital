import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { subscribeToast } from "../../utils/toastBus.js";

const STYLES = {
  success: { bg: "bg-white", border: "border-emerald-200", icon: CheckCircle2, iconColor: "text-emerald-600" },
  error: { bg: "bg-white", border: "border-red-200", icon: XCircle, iconColor: "text-crimson" },
  info: { bg: "bg-white", border: "border-navy/20", icon: Info, iconColor: "text-navy" },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast]);
      const timeout = toast.type === "error" ? 6000 : 4000;
      setTimeout(() => remove(toast.id), timeout);
    });
    return unsubscribe;
  }, [remove]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[200] flex flex-col gap-2.5 w-[calc(100%-3rem)] max-w-sm">
      {toasts.map((toast) => {
        const style = STYLES[toast.type] || STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={`animate-scaleIn flex items-start gap-3 rounded-2xl border ${style.border} ${style.bg} p-4 shadow-[0_20px_50px_-20px_rgba(15,31,61,0.35)]`}
            role="status"
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
            <p className="text-sm text-ink leading-snug flex-1">{toast.message}</p>
            <button
              onClick={() => remove(toast.id)}
              className="shrink-0 text-slate-400 hover:text-ink transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
