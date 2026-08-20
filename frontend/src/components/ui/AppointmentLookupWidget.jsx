import { useState } from "react";
import { Search, User, Calendar, Stethoscope, Building2 } from "lucide-react";
import { appointmentService } from "../../services/index.js";
import Modal from "./Modal.jsx";

export default function AppointmentLookupWidget({ onFound, placeholder = "e.g. A7K9", className = "" }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState(null); // null = closed picker

  const runSearch = async (e) => {
    e?.preventDefault();
    setError("");
    const trimmed = code.trim();
    if (!/^[A-Za-z0-9]{4}$/.test(trimmed)) {
      setError("Enter exactly 4 letters/numbers from the appointment ID.");
      return;
    }
    setLoading(true);
    try {
      const res = await appointmentService.lookupByShortCode(trimmed);
      if (res.data.multiple) {
        setMatches(res.data.matches);
      } else {
        onFound?.(res.data.appointment);
        setCode("");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not look up that code.");
    } finally {
      setLoading(false);
    }
  };

  const pick = (appt) => {
    setMatches(null);
    setCode("");
    onFound?.(appt);
  };

  return (
    <>
      <form onSubmit={runSearch} className={`flex items-start gap-2 ${className}`}>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder={placeholder}
              maxLength={4}
              className="w-full rounded-xl border border-mist bg-white pl-9 pr-3 py-2.5 text-sm font-semibold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-crimson/30 focus:border-crimson"
            />
          </div>
          {error && <p className="mt-1.5 text-xs text-crimson">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60 transition-colors"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <Modal
        open={Boolean(matches)}
        onClose={() => setMatches(null)}
        title="Multiple appointments found"
        subtitle={`${matches?.length || 0} appointments match that code — pick the right one.`}
      >
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
          {matches?.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m)}
              className="w-full text-left rounded-xl border border-mist hover:border-crimson/40 hover:bg-crimson/5 p-4 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <User className="w-4 h-4 text-crimson shrink-0" />
                  {m.patientName}
                  <span className="text-xs font-normal text-slate-soft">({m.maskedPhone})</span>
                </div>
                <span className="text-xs font-mono text-slate-soft">{m.appointmentCode}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-soft">
                <span className="inline-flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> {m.doctorName}</span>
                <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {m.department}</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {m.slotTime ? new Date(m.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Time TBD"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
