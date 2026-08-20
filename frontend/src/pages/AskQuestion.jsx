import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Sparkles, X } from "lucide-react";
import Spinner from "../components/ui/Spinner";
import HeartMark from "../components/ui/HeartMark";
import { chatbotService } from "../services/index.js";

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Hi! I'm the HeartStone assistant. Ask me about booking an appointment, fees, holidays or special notices, or how to reach us in an emergency.",
};

export default function AskQuestion() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    chatbotService
      .getSuggestions()
      .then((res) => setSuggestions(res.data?.suggestions || []))
      .catch(() => {});
  }, []);

  const close = () => navigate("/");

  const sendText = async (text) => {
    if (!text || loading) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const history = nextMessages.slice(1, -1);
      const response = await chatbotService.sendMessage(text, history);
      setMessages((prev) => [...prev, { role: "assistant", content: response.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong - please try again.");
    } finally {
      setLoading(false);
    }
  };

  const send = (e) => {
    e.preventDefault();
    sendText(input.trim());
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(15,31,61,0.08),_transparent_20%)] flex flex-col items-center justify-center py-10 px-4">
      <div className="w-full max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HeartMark size={26} />
            <span className="text-sm font-semibold uppercase tracking-widest2 text-navy">HeartStone Hospital</span>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-mist bg-white text-slate-soft shadow-sm hover:bg-mist hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[32rem] max-h-[calc(100dvh-11rem)] flex-col overflow-hidden rounded-[1.75rem] border border-mist bg-white shadow-[0_50px_140px_-40px_rgba(15,31,61,0.45)]">
          <div className="flex items-center gap-2 border-b border-mist bg-navy px-6 py-4 text-white shrink-0">
            <Sparkles className="h-4 w-4" />
            <div>
              <div className="text-sm font-semibold">HeartStone Assistant</div>
              <div className="text-[11px] text-white/70">Automated assistant for general hospital information only.</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-crimson text-white" : "bg-mist text-ink"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {messages.length === 1 && suggestions.length > 0 && !loading && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendText(q)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-crimson/40 hover:text-crimson transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-mist px-4 py-2.5 text-sm text-slate-soft">
                  <Spinner size={14} />
                  Looking that up...
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
            )}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-mist p-3 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about fees, booking, holidays..."
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crimson text-white transition-colors hover:bg-crimson-dark disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
