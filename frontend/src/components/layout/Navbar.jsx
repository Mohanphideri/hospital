import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Phone, Menu, X, CalendarCheck, Ambulance } from "lucide-react";
import HeartMark from "../ui/HeartMark";

const links = [
  { label: "Departments", href: "#departments" },
  { label: "Your visit", href: "#how-it-works" },
  { label: "FAQs", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {}
      <div className="bg-navy text-white text-xs sm:text-sm">
        <div className="max-w-6xl mx-auto px-6 h-9 flex items-center justify-between">
          <a href="tel:+911610000911" className="flex items-center gap-1.5 font-semibold hover:text-crimson-light transition-colors">
            <Phone className="w-3.5 h-3.5" />
            Emergency: +91-161-000-0911
          </a>
          <span className="hidden sm:inline text-white/70">Open 24 hours, every day · Ludhiana, Punjab</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-mist">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
            <HeartMark size={38} />
            <div className="leading-tight">
              <div className="font-display text-xl">
                <span className="text-crimson">Heart</span>
                <span className="text-navy">Stone</span>
              </div>
              <div className="eyebrow -mt-0.5">Hospital</div>
            </div>
          </Link>

          {isLanding && (
            <nav className="hidden md:flex items-center gap-8">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm font-medium text-ink/80 hover:text-crimson transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center rounded-full bg-navy hover:bg-navy-light text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              Sign in
            </Link>
            {isLanding && (
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-mist text-ink hover:bg-mist transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {}
        {isLanding && mobileOpen && (
          <div className="md:hidden border-t border-mist bg-paper px-6 py-5 space-y-5">
            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-mist transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-mist">
              <Link
                to="/book-appointment"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-crimson px-4 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
              >
                <CalendarCheck className="w-4 h-4" /> Book visit
              </Link>
              <Link
                to="/emergency"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-crimson/30 px-4 py-2.5 text-sm font-semibold text-crimson hover:bg-crimson/5 transition-colors"
              >
                <Ambulance className="w-4 h-4" /> Ambulance
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
