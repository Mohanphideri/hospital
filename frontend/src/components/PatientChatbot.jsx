import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { patientChatbotService } from "../services/api.js";

const WELCOME = {
  role: "assistant",
  content:
    "Hi! I’m your HeartStone patient assistant. I can help you book or cancel appointments, check your visits, prescriptions, bills, queue status, raise a ticket, and answer hospital questions.",
};

// Animated "typing…" indicator (three staggered bouncing dots), shown in
// place of the assistant's next message while a reply is in flight.
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-mist px-4 py-3.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  );
}

export default function PatientChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  const sendText = async (text) => {
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const history = next.slice(1, -1);
      const response = await patientChatbotService.sendMessage(text, history);
      setMessages((prev) => [...prev, { role: "assistant", content: response.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const send = (e) => {
    e.preventDefault();
    sendText(input.trim());
  };

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-crimson px-5 py-4 text-sm font-semibold text-white shadow-[0_20px_50px_-15px_rgba(124,29,45,0.55)] transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? "Close patient assistant" : "Open patient assistant"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span className="hidden sm:inline">{open ? "Close" : "Patient assistant"}</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[34rem] max-h-[calc(100dvh-7rem)] w-[23rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[1.5rem] border border-mist bg-white shadow-[0_40px_120px_-40px_rgba(15,31,61,0.5)]">
          <div className="flex items-center gap-2 border-b border-mist bg-navy px-5 py-4 text-white">
            <Sparkles className="h-4 w-4" />
            <div>
              <div className="text-sm font-semibold">Patient Assistant</div>
              <div className="text-[11px] text-white/70">Powered by Gemini • Connected to your portal</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, index) => (
              <div key={index} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-crimson text-white" : "bg-mist text-ink"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-mist p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Book an appointment, check my bills…"
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crimson text-white hover:bg-crimson-dark disabled:opacity-50" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
