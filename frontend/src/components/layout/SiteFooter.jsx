import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import HeartMark from "../ui/HeartMark";

const HOSPITAL_INFO_LINKS = [
  { label: "About Us", to: "/about-us" },
  { label: "Contact Us", to: "/contact-us" },
  { label: "Careers", to: "/careers" },
  { label: "Insurance Partners", to: "/insurance-partners" },
];

const PATIENT_LINKS = [
  { label: "Admission Process", to: "/admission-process" },
  { label: "Discharge Process", to: "/discharge-process" },
  { label: "Visitor Guidelines", to: "/visitor-guidelines" },
  { label: "Patient Rights & Responsibilities", to: "/patient-rights" },
  { label: "FAQ", to: "/faq" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Cookie Policy", to: "/cookie-policy" },
  { label: "Terms & Conditions", to: "/terms-conditions" },
  { label: "Refund & Cancellation Policy", to: "/refund-policy" },
  { label: "Accessibility Statement", to: "/accessibility-statement" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-mist bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Link to="/" className="flex items-center gap-3">
            <HeartMark size={30} />
            <div className="font-display text-lg">
              <span className="text-crimson">Heart</span><span className="text-navy">Stone</span>
            </div>
          </Link>
          <p className="mt-4 text-sm text-slate-soft leading-relaxed">
            Multi-specialty care, when it matters most.
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-soft/70">Hospital</div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {HOSPITAL_INFO_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="block hover:text-crimson transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-soft/70">Patient info</div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {PATIENT_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="block hover:text-crimson transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-soft/70">Legal</div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="block hover:text-crimson transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-soft/70">Contact</div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-crimson shrink-0" /> +91-161-000-0000</div>
            <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-crimson shrink-0" /> care@heartstone.com</div>
            <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-crimson shrink-0 mt-0.5" /> 123 Wellness Avenue, Ludhiana, Punjab, India</div>
            <Link
              to="/login"
              className="inline-flex items-center rounded-full bg-navy hover:bg-navy-light text-white text-sm font-semibold px-5 py-2.5 transition-colors mt-2"
            >
              Sign in to your portal
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-mist">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-soft">© {new Date().getFullYear()} HeartStone Hospital</span>
          <div className="text-xs uppercase tracking-widest2 text-slate-soft/70">
            Hospital-grade queue & appointment management
          </div>
        </div>
      </div>
    </footer>
  );
}
