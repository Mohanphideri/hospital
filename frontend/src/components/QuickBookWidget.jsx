import { useNavigate } from "react-router-dom";
import { CalendarCheck } from "lucide-react";

// "Book an appointment" CTA - takes the visitor straight to the dedicated
// /book-appointment page (phone OTP verify -> pick department/slot -> done)
// instead of opening a modal over the landing page. Keeping it as its own
// page means that flow has nothing else competing for attention on it.
export default function QuickBookWidget() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/book-appointment")}
      className="group inline-flex items-center gap-3 rounded-full bg-crimson hover:bg-crimson-dark text-white text-sm font-semibold pl-3 pr-6 py-2.5 transition"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
        <CalendarCheck className="w-4 h-4" />
      </span>
      Book an appointment
    </button>
  );
}
