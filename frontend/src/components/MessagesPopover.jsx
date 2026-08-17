import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Send } from "lucide-react";
import { messageService } from "../services/api.js";

// Clicking the header's message icon used to navigate straight to the full
// "Staff messages" page. This shows the last few messages right in a
// dropdown instead - a "View all" link at the bottom is still there for
// anyone who wants the full board.
export default function MessagesPopover({ config }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    messageService
      .getAll()
      .then((res) => setMessages(res.data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [open]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await messageService.create(text);
      setMessages((prev) => [res.data.staffMessage, ...prev]);
      setDraft("");
    } catch {
      // Silently ignore - the full "Staff messages" page surfaces errors.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="hidden sm:inline-flex items-center justify-center h-9 w-9 rounded-control text-text-secondary hover:bg-slate-100 hover:text-text-primary transition-colors duration-150"
        aria-label="Messages"
      >
        <MessageSquare className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-card bg-white border border-slate-200 shadow-popover overflow-hidden z-50 animate-scaleIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-card-title text-text-primary">Staff messages</span>
            <button
              onClick={() => {
                setOpen(false);
                navigate(`/${config.role}/messages`);
              }}
              className="text-small font-medium text-primary hover:text-primary-dark"
            >
              View all
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-body text-text-secondary">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="px-4 py-8 text-center text-body text-text-secondary">No messages yet.</div>
            ) : (
              messages.slice(0, 8).map((m) => (
                <div key={m._id} className="px-4 py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-small font-semibold text-text-primary truncate">
                      {m.author?.name || "Staff"}
                    </span>
                    <span className="text-[11px] text-text-secondary shrink-0">
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <div className="mt-0.5 text-small text-text-secondary line-clamp-2">{m.message}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 p-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Quick message..."
              className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-small focus:border-primary/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
