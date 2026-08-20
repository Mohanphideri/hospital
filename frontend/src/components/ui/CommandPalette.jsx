import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, LogOut } from "lucide-react";
import { iconForSection } from "../../utils/navGroups.js";

export default function CommandPalette({ config, onLogout }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      const isK = e.key === "k" || e.key === "K";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    const items = config.sections.map((s) => ({
      type: "nav",
      label: s.label,
      path: `/${config.role}/${s.path}`,
      Icon: iconForSection(s.path),
    }));
    items.push({ type: "action", label: "Log out", action: onLogout, Icon: LogOut });

    if (!query.trim()) return items.slice(0, 8);
    const q = query.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [config, query, onLogout]);

  const runItem = (item) => {
    if (!item) return;
    if (item.type === "action") item.action?.();
    else navigate(item.path);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg rounded-card bg-white shadow-popover border border-slate-200 overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-text-secondary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                runItem(results[activeIndex]);
              }
            }}
            placeholder="Search or jump to a section..."
            className="flex-1 text-body outline-none placeholder:text-text-secondary"
          />
          <kbd className="text-[10px] font-semibold text-text-secondary bg-slate-100 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-body text-text-secondary">No matches</div>
          )}
          {results.map((item, i) => (
            <button
              key={item.label + i}
              onClick={() => runItem(item)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-body transition-colors duration-150 ${
                i === activeIndex ? "bg-primary-soft text-primary-dark" : "text-text-primary hover:bg-slate-50"
              }`}
            >
              <item.Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {i === activeIndex && <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
