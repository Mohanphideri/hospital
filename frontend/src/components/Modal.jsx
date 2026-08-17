import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// Module-level counter so multiple independent <Modal> instances - e.g. the
// booking widget and the emergency-request button, both mounted at the same
// time on the landing page - never fight over document.body's scroll lock.
// The page only becomes scrollable again once every open modal has closed.
let scrollLockCount = 0;

function lockBodyScroll() {
  scrollLockCount += 1;
  if (scrollLockCount === 1) {
    document.body.style.overflow = "hidden";
  }
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = "";
  }
}

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = "max-w-lg" }) {
  // Keep the latest onClose in a ref so the lock/unlock effect below only
  // ever depends on `open` - previously it also depended on `onClose`, which
  // is a new function on every parent re-render (every keystroke while
  // booking, for example), causing the lock to be torn down and re-applied
  // constantly and occasionally leaving the page stuck unscrollable.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKeyDown);
    lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockBodyScroll();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Fixed (not absolute) so it always covers the full visible viewport,
          even while the overlay below scrolls. */}
      <div
        className="fixed inset-0 bg-navy/50 backdrop-blur-sm animate-fadeUp"
        style={{ animationDuration: "0.15s" }}
        onClick={onClose}
      />
      {/* This wrapper - not the modal box itself - handles scrolling. On
          mobile, 100vh-style centering can compute against a taller "layout"
          viewport than what's actually visible once the address bar/navbar
          are showing, leaving the top of a centered, internally-scrolling box
          rendered off-screen with no way to reach it. Making the overlay
          itself scrollable guarantees every part of the modal can always be
          scrolled into view, regardless of viewport quirks. */}
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full ${maxWidth} rounded-[1.75rem] bg-white shadow-[0_50px_140px_-40px_rgba(15,31,61,0.45)] animate-scaleIn`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-mist bg-white/95 backdrop-blur px-6 py-5 rounded-t-[1.75rem]">
            <div>
              {title && <h2 className="font-display text-xl text-ink">{title}</h2>}
              {subtitle && <p className="mt-1 text-sm text-slate-soft">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-full p-2 text-slate-soft hover:bg-mist hover:text-ink transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}