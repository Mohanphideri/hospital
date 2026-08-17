import { createContext, useContext, useState, useCallback, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "../components/Modal.jsx";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, message, confirmLabel, cancelLabel, danger }
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    setState({
      title: "Are you sure?",
      message: "",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      danger: false,
      ...options,
    });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleClose = (result) => {
    setState(null);
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => handleClose(false)} title={state?.title} maxWidth="max-w-md">
        {state && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className={`shrink-0 rounded-full p-2.5 ${state.danger ? "bg-red-50" : "bg-mist"}`}>
                <AlertTriangle className={`w-5 h-5 ${state.danger ? "text-crimson" : "text-navy"}`} />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed pt-1">{state.message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleClose(false)}
                className="flex-1 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors"
              >
                {state.cancelLabel}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`flex-1 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                  state.danger ? "bg-crimson hover:bg-crimson-dark" : "bg-navy hover:bg-navy-light"
                }`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

// Usage: const confirm = useConfirm(); const ok = await confirm({ title, message, danger: true });
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
