import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Brain,
  Baby,
  Bone,
  Stethoscope,
  Ambulance,
  Pill,
  BedDouble,
  FileText,
  CalendarClock,
  CalendarCheck,
  MapPin,
  Phone,
  Mail,
  Clock,
  Megaphone,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import Navbar from "../components/Navbar";
import PulseDivider from "../components/PulseDivider";
import QuickBookWidget from "../components/QuickBookWidget";
import SiteFooter from "../components/SiteFooter";
import { MessageCircle } from "lucide-react";
import { departmentService, announcementService } from "../services/api.js";
import ambulanceHero from "../assets/ambulance-hero.png";

const steps = [
  { n: "01", label: "Book your visit", desc: "Choose a department and time. We assign the doctor's next open slot." },
  { n: "02", label: "Check in", desc: "Quick registration at reception, then you're guided to the right department." },
  { n: "03", label: "See your doctor", desc: "Your specialist examines you and explains next steps in plain language." },
  { n: "04", label: "Pharmacy & follow-up", desc: "Collect medicines on-site, with any follow-up already scheduled." },
];

const heroPoints = [
  { icon: ShieldCheck, label: "Registered specialists" },
  { icon: Ambulance, label: "24×7 emergency care" },
  { icon: Pill, label: "On-site pharmacy" },
  { icon: BedDouble, label: "In-patient wards" },
];

const facilities = [
  { icon: Ambulance, title: "24/7 emergency care", desc: "A dispatched ambulance reaches you fast, day or night." },
  { icon: CalendarClock, title: "Timely appointments", desc: "Book real availability — know exactly when to arrive." },
  { icon: Pill, title: "In-house pharmacy", desc: "Prescriptions checked against live stock before billing." },
  { icon: BedDouble, title: "In-patient ward care", desc: "Coordinated nursing care from admission to discharge." },
  { icon: FileText, title: "Complete medical records", desc: "Every visit's vitals and diagnosis, kept in one place." },
  { icon: Stethoscope, title: "Specialist-led departments", desc: "Every department is led by a registered specialist." },
];

// Front-desk-style quick actions - the same handful of things a real hospital's
// reception desk (and homepage) always puts within one click: book a visit,
// call for an ambulance, find your department, ask a question. Every link
// here goes to a page that already exists elsewhere on the site (also
// reachable via the floating buttons and the portal section below) - this
// strip just surfaces them together, the way a hospital homepage does.
const quickActions = [
  { icon: CalendarCheck, label: "Book an appointment", desc: "Pick a department & time", to: "/book-appointment", tone: "crimson" },
  { icon: Ambulance, label: "Emergency ambulance", desc: "Request immediate dispatch", to: "/emergency", tone: "navy" },
  { icon: Stethoscope, label: "Find your department", desc: "Browse our specialities", to: "#departments", tone: "gold" },
  { icon: HelpCircle, label: "Ask a question", desc: "Get help from our team", to: "/ask", tone: "teal" },
];

const quickActionTone = {
  crimson: "bg-crimson/10 text-crimson group-hover:bg-crimson group-hover:text-white",
  navy: "bg-navy/10 text-navy group-hover:bg-navy group-hover:text-white",
  gold: "bg-gold/15 text-gold-dark group-hover:bg-gold group-hover:text-white",
  teal: "bg-teal/10 text-teal-dark group-hover:bg-teal group-hover:text-white",
};

// Wayfinding accent rotation - like color-coded hospital signage, used sparingly
// to distinguish cards in a directory grid. Written as full literal class names
// (not template strings) so Tailwind's content scanner picks them up.
const accents = [
  { chip: "bg-crimson/10 text-crimson", hoverBorder: "hover:border-crimson/30", rule: "bg-crimson" },
  { chip: "bg-navy/10 text-navy", hoverBorder: "hover:border-navy/30", rule: "bg-navy" },
  { chip: "bg-gold/10 text-gold-dark", hoverBorder: "hover:border-gold/40", rule: "bg-gold" },
  { chip: "bg-teal/10 text-teal-dark", hoverBorder: "hover:border-teal/30", rule: "bg-teal" },
];

// Best-effort icon for a department name - falls back to a generic stethoscope for any
// department an admin creates that isn't one of the common specialties below.
const departmentIcon = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("cardio") || n.includes("heart")) return Heart;
  if (n.includes("neuro") || n.includes("brain")) return Brain;
  if (n.includes("pedia") || n.includes("child")) return Baby;
  if (n.includes("ortho") || n.includes("bone")) return Bone;
  return Stethoscope;
};

// Common practical questions a first-time visitor actually has - the kind of
// self-serve content a hospital homepage needs so people don't have to call
// reception just to find out if they need an appointment.
const faqs = [
  {
    q: "Do I need to book an appointment, or can I walk in?",
    a: "Booking ahead gets you an exact time slot and a doctor assigned in advance, but every department also takes walk-ins - you'll be given a live queue token and seen in turn.",
  },
  {
    q: "What should I bring for my first visit?",
    a: "A valid photo ID, any previous prescriptions or reports related to your condition, and your appointment ID or queue token if you have one. Everything else - your medical record with us - is created automatically from your first visit onward.",
  },
  {
    q: "How do I get my prescription or bill afterward?",
    a: "Both are available immediately in your patient portal under Prescriptions and Bills, with a download option, so you don't need to keep paper copies.",
  },
  {
    q: "Can a family member visit someone admitted in the ward?",
    a: "Yes - each ward has set visiting hours, posted at the nursing station, to balance visits with patient rest. Reception can tell you the current timing for a specific ward when you arrive.",
  },
  {
    q: "What if it's an emergency outside these steps?",
    a: "Skip all of the above - use the Emergency button on this site or call our line directly. Ambulance dispatch doesn't require an account, a booking, or a login.",
  },
];

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className="rounded-2xl border border-mist bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-sm sm:text-base font-semibold text-ink">{item.q}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-crimson transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-5 text-sm text-slate-soft leading-relaxed">{item.a}</div>
      )}
    </div>
  );
}

// Small recurring signature mark - a short gold rule beside a section eyebrow,
// standing in for the "accredited standards" strip a hospital brand like this
// would use, without inventing certifications the hospital doesn't have.
function Eyebrow({ children, tone = "crimson" }) {
  const toneClass = tone === "white" ? "text-white/60" : tone === "navy" ? "text-navy" : "text-crimson";
  return (
    <div className={`flex items-center gap-2.5 mb-3 ${toneClass}`}>
      <span className="inline-block h-[2px] w-7 bg-gold" />
      <span className="text-[11px] tracking-widest2 uppercase font-semibold">{children}</span>
    </div>
  );
}

export default function Landing() {
  const [departments, setDepartments] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let cancelled = false;
    departmentService
      .getAll()
      .then((deptRes) => {
        if (cancelled) return;
        setDepartments(deptRes.data || []);
      })
      .catch(() => {
        // Landing page still works fine without live directory data - the portals
        // and booking widget below don't depend on it.
      })
      .finally(() => {
        if (!cancelled) setLoadingDirectory(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    announcementService
      .getPublic()
      .then((res) => {
        if (!cancelled) setAnnouncements(res.data || []);
      })
      .catch(() => {
        // No announcements right now - the tab below just shows an empty state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Navbar />

      {/* Hero - light, warm background instead of a heavy dark navy band,
          so the page opens airy rather than imposing. Serif headline and
          gold rule keep the same editorial identity, just on white. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-crimson/5 via-white to-white">
        <div className="relative max-w-7xl mx-auto px-6 pt-14 md:pt-20 pb-20">
          <div className="grid lg:grid-cols-[1.3fr_0.95fr] gap-14 items-center">
            <div className="space-y-8 animate-fadeUp">
              <div className="flex items-center gap-2.5 text-crimson">
                <span className="inline-block h-[2px] w-7 bg-gold" />
                <span className="text-[11px] tracking-widest2 uppercase font-semibold">
                  Multi-specialty hospital · Ludhiana, Punjab
                </span>
              </div>
              <h1 className="font-editorial font-medium text-4xl md:text-5xl text-ink tracking-tight leading-[1.1]">
                Specialist-led care, start to finish.
              </h1>
              <p className="max-w-xl text-slate-soft text-lg leading-relaxed">
                Consultations, emergencies, and in-patient care — all under one roof, with a pharmacy on-site.
              </p>

              <div className="flex flex-wrap gap-4 items-center pt-1">
                <QuickBookWidget />
                <a href="#departments" className="inline-flex items-center text-sm font-semibold text-navy hover:text-crimson transition">
                  Explore departments →
                </a>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {heroPoints.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-mist bg-white px-4 py-3.5 shadow-xs">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark">
                      <item.icon className="w-4 h-4" />
                    </span>
                    <div className="text-sm font-semibold text-ink leading-snug">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency panel - a real ambulance photo, not an icon, so this
                reads as an actual hospital service rather than a mock-up. */}
            <div className="relative rounded-[2rem] border border-mist bg-white shadow-[0_30px_90px_-40px_rgba(15,31,61,0.25)] overflow-hidden animate-fadeUp">
              <div className="relative h-40">
                <img src={ambulanceHero} alt="HeartStone Hospital ambulance" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/20 to-transparent" />
                <div className="absolute bottom-3 left-5 text-xs font-semibold uppercase tracking-widest2 text-white/90">
                  We're here, day or night
                </div>
              </div>
              <div className="p-7 space-y-5">
                <div>
                  <div className="font-editorial text-2xl text-ink">Medical emergency?</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Request an ambulance instantly, or call us directly — no login needed.
                  </p>
                  <a
                    href="tel:+911610000911"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-crimson-dark px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                  >
                    <Phone className="w-4 h-4" /> +91-161-000-0911
                  </a>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 p-5">
                  <div className="flex items-center gap-3 text-sm font-semibold text-ink">
                    <span className="inline-flex h-3.5 w-3.5 rounded-full bg-gold" />
                    A team-based, doctor-led model of care
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Reception, your treating doctor, and the pharmacy stay coordinated on your visit, so you don't have to repeat yourself at every desk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <PulseDivider className="mb-0" />

      {/* Trust band - honest, live-data-backed numbers only (no invented awards/patient counts) */}
      <section className="border-b border-mist bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-x divide-mist">
          <div>
            <div className="font-editorial text-3xl text-navy">{loadingDirectory ? "—" : `${departments.length}+`}</div>
            <div className="mx-auto mt-2 h-[2px] w-6 bg-gold" />
            <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-soft">Specialities</div>
          </div>
          <div>
            <div className="font-editorial text-3xl text-navy">24×7</div>
            <div className="mx-auto mt-2 h-[2px] w-6 bg-gold" />
            <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-soft">Emergency care</div>
          </div>
          <div>
            <div className="font-editorial text-3xl text-navy">On-site</div>
            <div className="mx-auto mt-2 h-[2px] w-6 bg-gold" />
            <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-soft">Pharmacy & lab</div>
          </div>
        </div>
      </section>

      {/* Quick actions - the front-desk-style shortcut row every hospital
          homepage leads with, right under the fold: book a visit, call for
          an ambulance, find a department, ask a question. Every card links
          to a page that already exists on the site; nothing new here, just
          surfaced together instead of scattered. Placed directly under the
          trust band - the first thing a visitor reaches for after landing,
          the way a hospital's real front desk sits just past the entrance. */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="group rounded-xl border border-mist bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition flex items-center gap-4"
            >
              <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${quickActionTone[a.tone]}`}>
                <a.icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{a.label}</div>
                <div className="mt-0.5 text-xs text-slate-soft">{a.desc}</div>
              </div>
              <ArrowRight className="ml-auto w-4 h-4 text-slate-300 group-hover:text-crimson shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* Departments / Specialties - led with early, the way a hospital
          homepage puts its specialities front and center rather than
          burying them mid-page. Cards use a clinical signage-style top
          accent bar (colour-coded like real hospital department signage)
          instead of a purely decorative icon chip. */}
      <section id="departments" className="bg-slate-50/60 border-y border-mist scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <Eyebrow>Departments</Eyebrow>
          <h2 className="font-editorial text-3xl md:text-4xl text-ink max-w-2xl">
            Specialist care across every department.
          </h2>
          <p className="mt-4 text-slate-soft leading-relaxed max-w-2xl">
            Book directly into a department — we assign the right doctor's next open slot.
          </p>

          {!loadingDirectory && departments.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-mist bg-white p-10 text-center text-sm text-slate-soft">
              Departments will appear here once the hospital admin sets them up.
            </div>
          ) : (
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {(loadingDirectory ? Array.from({ length: 4 }) : departments).map((dept, i) => {
                const Icon = departmentIcon(dept?.name);
                const accent = accents[i % accents.length];
                return (
                  <div
                    key={dept?._id || i}
                    className={`overflow-hidden rounded-2xl border border-mist bg-white shadow-sm transition hover:-translate-y-1 ${accent.hoverBorder}`}
                  >
                    <div className={`h-1 w-full ${accent.rule}`} />
                    <div className="p-6">
                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent.chip}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="mt-4 font-editorial text-lg text-ink">
                        {dept?.name || <span className="inline-block h-4 w-24 rounded bg-mist animate-pulse" />}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-soft leading-relaxed">
                        {dept?.isGeneral ? "Not sure what's wrong? Start here." : "Registered specialist · book direct"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How it works - moved up to sit right after "find your department":
          the natural next question once a visitor knows where to go is
          what actually happens once they book. Light background, navy
          accents - matches the rest of the page instead of a dark band. */}
      <section id="how-it-works" className="scroll-mt-16">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <Eyebrow tone="navy">Your visit</Eyebrow>
          <h2 className="font-editorial text-3xl md:text-4xl text-ink max-w-2xl">What to expect, from booking to follow-up.</h2>

          <div className="mt-12 grid md:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-mist bg-white p-8 shadow-sm">
                <div className="font-editorial text-4xl text-crimson">{s.n}</div>
                <h3 className="mt-4 text-xl font-semibold text-ink">{s.label}</h3>
                <p className="mt-3 text-sm text-slate-soft leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities / why choose us */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <Eyebrow>Why HeartStone</Eyebrow>
        <h2 className="font-editorial text-3xl md:text-4xl text-ink max-w-2xl">
          Care designed around you, from your first visit to full recovery.
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((f, i) => {
            const accent = accents[i % accents.length];
            return (
              <div key={f.title} className="overflow-hidden rounded-2xl border border-mist bg-white shadow-sm">
                <div className={`h-1 w-full ${accent.rule}`} />
                <div className="p-7">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent.chip}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div className="mt-4 font-editorial text-lg text-ink">{f.title}</div>
                  <p className="mt-2 text-sm text-slate-soft leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Emergency reminder - a quiet, compact card instead of a large
          full-bleed photo band repeating the same ambulance image already
          shown in the hero. Still unmissable (crimson accent, always
          visible), just not a heavy, dominating section. */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-crimson/20 bg-crimson/5 px-6 py-6 md:px-8 md:py-7 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crimson text-white">
              <Ambulance className="w-5 h-5" />
            </span>
            <div>
              <div className="font-editorial text-xl text-ink">Medical emergency?</div>
              <p className="mt-0.5 text-sm text-slate-soft">Request an ambulance now — no login needed.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/emergency"
              className="inline-flex items-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
            >
              <Ambulance className="w-4 h-4" /> Request ambulance
            </Link>
            <a
              href="tel:+911610000911"
              className="inline-flex items-center gap-2 rounded-full border border-crimson/30 px-6 py-3 text-sm font-semibold text-crimson hover:bg-crimson/10 transition-colors"
            >
              <Phone className="w-4 h-4" /> +91-161-000-0911
            </a>
          </div>
        </div>
      </section>

      {announcements.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <Eyebrow>News & updates</Eyebrow>
          <h2 className="font-editorial text-2xl md:text-3xl text-ink mb-8">What's happening at HeartStone</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <div key={a._id} className="rounded-2xl border border-mist bg-white p-6 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-crimson/10">
                  <Megaphone className="h-5 w-5 text-crimson" />
                </div>
                <div className="text-sm font-semibold text-ink">{a.title}</div>
                {a.eventDate && (
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-crimson/80">
                    {new Date(a.eventDate).toLocaleDateString([], { dateStyle: "medium" })}
                  </div>
                )}
                <p className="mt-3 text-sm text-slate-soft leading-relaxed">{a.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Patient portal + staff access - kept low-key, the way a real hospital
          site treats "MyChart"/staff login: useful and reachable, not the
          homepage's main pitch. Sign-in itself is unchanged (Navbar/footer). */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="rounded-2xl border border-mist bg-white p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <Eyebrow tone="navy">Patient portal</Eyebrow>
            <h3 className="font-editorial text-2xl text-ink">Manage your appointments, bills, and prescriptions online.</h3>
            <p className="mt-2 text-sm text-slate-soft max-w-xl">
              Register with your phone number to book visits, track your queue, and view records anytime.
            </p>
          </div>
          <Link
            to="/login"
            className="shrink-0 inline-flex items-center rounded-full bg-navy hover:bg-navy-light text-white text-sm font-semibold px-7 py-3.5 transition-colors"
          >
            Sign in / Register →
          </Link>
        </div>
      </section>

      {/* FAQ - the self-serve answers a first-time visitor actually looks for
          before calling reception: walk-ins, what to bring, visiting hours. */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-16 md:py-20 scroll-mt-24">
        <Eyebrow>Frequently asked</Eyebrow>
        <h2 className="font-editorial text-2xl sm:text-3xl text-ink">Answers before you visit.</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((item, i) => (
            <FaqItem key={item.q} item={item} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </section>

      {/* Visit / contact */}
      <section id="contact" className="max-w-7xl mx-auto px-6 py-16 md:py-20 scroll-mt-24">
        <Eyebrow>Visit us</Eyebrow>
        <h2 className="font-editorial text-2xl sm:text-3xl text-ink">Contact HeartStone Hospital</h2>

        <div className="mt-8 grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-mist bg-white p-6 flex items-start gap-4">
              <MapPin className="w-5 h-5 text-crimson shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-ink">Address</div>
                <p className="mt-1 text-sm text-slate-soft leading-relaxed">123 Wellness Avenue, Ludhiana, Punjab, India</p>
              </div>
            </div>
            <div className="rounded-2xl border border-mist bg-white p-6 flex items-start gap-4">
              <Phone className="w-5 h-5 text-crimson shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-ink">Phone</div>
                <p className="mt-1 text-sm text-slate-soft leading-relaxed">+91-161-000-0000</p>
              </div>
            </div>
            <div className="rounded-2xl border border-mist bg-white p-6 flex items-start gap-4">
              <Mail className="w-5 h-5 text-crimson shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-ink">Email</div>
                <p className="mt-1 text-sm text-slate-soft leading-relaxed">care@heartstone.com</p>
              </div>
            </div>
            <div className="rounded-2xl border border-crimson/20 bg-crimson/5 p-6 flex items-start gap-4">
              <Clock className="w-5 h-5 text-crimson shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-ink">Emergency contact</div>
                <p className="mt-1 text-sm text-slate-soft leading-relaxed">+91-161-000-0911 · open 24 hours, every day</p>
              </div>
            </div>
          </div>

          {/* Live map embed - update the query string once the hospital's exact
              registered address/Google listing is finalized, to pin the exact building. */}
          <div className="lg:col-span-3 rounded-2xl border border-mist overflow-hidden min-h-[280px]">
            <iframe
              title="HeartStone Hospital location"
              className="h-full w-full min-h-[280px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=Chandigarh+University&output=embed"
            />
          </div>
        </div>
      </section>

      <SiteFooter />
      <Link
        to="/ask"
        className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-full bg-navy px-5 py-4 text-sm font-semibold text-white shadow-[0_20px_50px_-15px_rgba(15,31,61,0.6)] transition-transform hover:scale-105 active:scale-95"
        aria-label="Ask a question"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">Ask a question</span>
      </Link>
      <Link
        to="/emergency"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-crimson px-5 py-4 text-sm font-semibold text-white shadow-[0_20px_50px_-15px_rgba(200,16,46,0.6)] transition-transform hover:scale-105 active:scale-95"
        aria-label="Request an ambulance"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        Emergency
      </Link>
    </div>
  );
}
