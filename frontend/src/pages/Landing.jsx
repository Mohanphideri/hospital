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
  Sparkles,
  Activity,
  MessageCircle,
} from "lucide-react";
import Navbar from "../components/layout/Navbar";
import QuickBookWidget from "../components/ui/QuickBookWidget";
import SiteFooter from "../components/layout/SiteFooter";
import { departmentService, announcementService } from "../services/index.js";
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

const quickActions = [
  { icon: CalendarCheck, label: "Book an appointment", desc: "Pick a department & time", to: "/book-appointment", tone: "crimson" },
  { icon: Ambulance, label: "Emergency ambulance", desc: "Request immediate dispatch", to: "/emergency", tone: "aqua" },
  { icon: Stethoscope, label: "Find your department", desc: "Browse our specialities", to: "#departments", tone: "gold" },
  { icon: HelpCircle, label: "Ask a question", desc: "Get help from our team", to: "/ask", tone: "teal" },
];

const quickActionTone = {
  crimson: "bg-crimson/15 text-crimson-light group-hover:bg-crimson group-hover:text-white",
  aqua: "bg-aqua/15 text-aqua group-hover:bg-aqua group-hover:text-void",
  gold: "bg-gold/15 text-gold-light group-hover:bg-gold group-hover:text-void",
  teal: "bg-teal/15 text-teal-light group-hover:bg-teal group-hover:text-white",
};

const accents = [
  { chip: "bg-crimson/10 text-crimson", hoverBorder: "hover:border-crimson/40", rule: "bg-gradient-to-r from-crimson to-crimson-light", glow: "group-hover:shadow-glowCrimson" },
  { chip: "bg-navy/10 text-navy", hoverBorder: "hover:border-aqua/40", rule: "bg-gradient-to-r from-navy to-aqua", glow: "group-hover:shadow-glow" },
  { chip: "bg-gold/10 text-gold-dark", hoverBorder: "hover:border-gold/50", rule: "bg-gradient-to-r from-gold to-gold-light", glow: "group-hover:shadow-[0_0_50px_-14px_rgba(201,151,58,0.55)]" },
  { chip: "bg-teal/10 text-teal-dark", hoverBorder: "hover:border-teal/40", rule: "bg-gradient-to-r from-teal to-aqua", glow: "group-hover:shadow-glow" },
];

const departmentIcon = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("cardio") || n.includes("heart")) return Heart;
  if (n.includes("neuro") || n.includes("brain")) return Brain;
  if (n.includes("pedia") || n.includes("child")) return Baby;
  if (n.includes("ortho") || n.includes("bone")) return Bone;
  return Stethoscope;
};

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
    <div className={`rounded-2xl border bg-white overflow-hidden transition-colors ${isOpen ? "border-aqua-dark/40 shadow-card" : "border-mist"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-sm sm:text-base font-semibold text-ink">{item.q}</span>
        <span className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${isOpen ? "bg-navy text-aqua" : "bg-mist text-navy"}`}>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>
      {isOpen && (
        <div className="px-6 pb-5 text-sm text-slate-soft leading-relaxed">{item.a}</div>
      )}
    </div>
  );
}

function Eyebrow({ children, tone = "crimson" }) {
  const toneClass = tone === "white" ? "text-white/70" : tone === "navy" ? "text-navy" : "text-crimson";
  const ruleClass = tone === "white" ? "bg-aqua" : "bg-gold";
  return (
    <div className={`flex items-center gap-2.5 mb-3 ${toneClass}`}>
      <span className={`inline-block h-[2px] w-7 ${ruleClass}`} />
      <span className="text-[11px] tracking-widest2 uppercase font-semibold">{children}</span>
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.25] animate-gridPan"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125,232,248,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(125,232,248,0.14) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute -top-24 -left-16 h-96 w-96 rounded-full bg-crimson/30 blur-[110px] animate-orbFloat" />
      <div className="absolute top-1/3 -right-20 h-[28rem] w-[28rem] rounded-full bg-aqua/20 blur-[130px] animate-orbFloat [animation-delay:-4s]" />
      <div className="absolute inset-0 bg-gradient-to-b from-void via-void/95 to-void" />
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
        
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-white">
      <Navbar />

      {}
      <section className="relative overflow-hidden bg-void">
        <HeroBackdrop />
        <div className="relative max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-28">
          <div className="grid lg:grid-cols-[1.3fr_0.95fr] gap-14 items-center">
            <div className="space-y-8 animate-fadeUp">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-1.5 text-aqua-light">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px] tracking-widest2 uppercase font-semibold">
                  Multi-specialty hospital · Ludhiana, Punjab
                </span>
              </div>
              <h1 className="font-display font-semibold text-4xl md:text-6xl text-white tracking-tight leading-[1.05]">
                Healthcare, engineered
                <span className="block bg-gradient-to-r from-aqua-light via-white to-aqua bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                  around every patient.
                </span>
              </h1>
              <p className="max-w-xl text-white/60 text-lg leading-relaxed">
                Consultations, emergencies, and in-patient care — all under one roof, with real-time booking, a live queue, and a pharmacy on-site.
              </p>

              <div className="flex flex-wrap gap-4 items-center pt-1">
                <QuickBookWidget />
                <a
                  href="#departments"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-6 py-3 text-sm font-semibold text-white hover:border-aqua/40 hover:text-aqua-light transition-colors"
                >
                  Explore departments <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {heroPoints.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur px-4 py-3.5">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aqua/15 text-aqua-light">
                      <item.icon className="w-4 h-4" />
                    </span>
                    <div className="text-sm font-semibold text-white/90 leading-snug">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {}
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_30px_90px_-30px_rgba(2,3,10,0.8)] overflow-hidden animate-fadeUp">
              <div className="relative h-40">
                <img src={ambulanceHero} alt="HeartStone Hospital ambulance" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
                <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-crimson/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  Live dispatch
                </div>
                <div className="absolute bottom-3 left-5 text-xs font-semibold uppercase tracking-widest2 text-white/90">
                  We're here, day or night
                </div>
              </div>
              <div className="p-7 space-y-5">
                <div>
                  <div className="font-display text-2xl font-semibold text-white">Medical emergency?</div>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    Request an ambulance instantly, or call us directly — no login needed.
                  </p>
                  <a
                    href="tel:+911610000911"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-crimson hover:bg-crimson-dark px-5 py-2.5 text-sm font-semibold text-white shadow-glowCrimson transition-colors"
                  >
                    <Phone className="w-4 h-4" /> +91-161-000-0911
                  </a>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3 text-sm font-semibold text-white">
                    <Activity className="h-4 w-4 text-aqua-light" />
                    A team-based, doctor-led model of care
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">
                    Reception, your treating doctor, and the pharmacy stay coordinated on your visit, so you don't have to repeat yourself at every desk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {}
      <section className="relative z-10 max-w-6xl mx-auto px-6 -mt-12 md:-mt-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-[1.75rem] border border-mist bg-white/90 backdrop-blur-xl p-4 shadow-[0_30px_80px_-30px_rgba(15,31,61,0.35)]">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="group rounded-2xl bg-white p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition flex items-center gap-4 border border-transparent hover:border-mist"
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

      {}
      <section className="mt-14 md:mt-16 border-y border-mist bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-x divide-mist">
          <div>
            <div className="font-display text-3xl font-semibold text-navy">{loadingDirectory ? "—" : `${departments.length}+`}</div>
            <div className="mx-auto mt-2 h-[2px] w-6 bg-gold" />
            <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-soft">Specialities</div>
          </div>
          <div>
            <div className="font-display text-3xl font-semibold text-navy">24×7</div>
            <div className="mx-auto mt-2 h-[2px] w-6 bg-gold" />
            <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-soft">Emergency care</div>
          </div>
          <div>
            <div className="font-display text-3xl font-semibold text-navy">On-site</div>
            <div className="mx-auto mt-2 h-[2px] w-6 bg-gold" />
            <div className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-soft">Pharmacy & lab</div>
          </div>
        </div>
      </section>

      {}
      <section id="departments" className="bg-white border-b border-mist scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <Eyebrow>Departments</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink max-w-2xl">
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
                    className={`group overflow-hidden rounded-2xl border border-mist bg-white shadow-sm transition hover:-translate-y-1 ${accent.hoverBorder} ${accent.glow}`}
                  >
                    <div className={`h-1 w-full ${accent.rule}`} />
                    <div className="p-6">
                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent.chip}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="mt-4 font-display text-lg font-semibold text-ink">
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

      {}
      <section id="how-it-works" className="scroll-mt-16 bg-slate-50/60 border-b border-mist">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <Eyebrow tone="navy">Your visit</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink max-w-2xl">What to expect, from booking to follow-up.</h2>

          <div className="mt-14 relative">
            <div className="hidden md:block absolute top-7 left-0 right-0 h-[2px] bg-gradient-to-r from-crimson via-gold to-aqua-dark opacity-40" />
            <div className="grid md:grid-cols-4 gap-8">
              {steps.map((s) => (
                <div key={s.n} className="relative">
                  <div className="hidden md:flex h-14 w-14 items-center justify-center rounded-full border-2 border-navy bg-white font-display text-lg font-semibold text-navy shadow-card">
                    {s.n}
                  </div>
                  <div className="mt-5 rounded-2xl border border-mist bg-white p-6 shadow-sm md:mt-4">
                    <div className="md:hidden font-display text-3xl text-crimson">{s.n}</div>
                    <h3 className="mt-1 md:mt-0 text-lg font-semibold text-ink">{s.label}</h3>
                    <p className="mt-3 text-sm text-slate-soft leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <Eyebrow>Why HeartStone</Eyebrow>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink max-w-2xl">
          Care designed around you, from your first visit to full recovery.
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((f, i) => {
            const accent = accents[i % accents.length];
            return (
              <div key={f.title} className={`group overflow-hidden rounded-2xl border border-mist bg-white shadow-sm transition hover:-translate-y-1 ${accent.hoverBorder} ${accent.glow}`}>
                <div className={`h-1 w-full ${accent.rule}`} />
                <div className="p-7">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent.chip}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div className="mt-4 font-display text-lg font-semibold text-ink">{f.title}</div>
                  <p className="mt-2 text-sm text-slate-soft leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-void px-6 py-6 md:px-8 md:py-7 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-crimson/30 blur-[90px]" />
          <div className="relative flex items-center gap-4">
            <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crimson text-white shadow-glowCrimson">
              <Ambulance className="w-5 h-5" />
            </span>
            <div>
              <div className="font-display text-xl font-semibold text-white">Medical emergency?</div>
              <p className="mt-0.5 text-sm text-white/60">Request an ambulance now — no login needed.</p>
            </div>
          </div>
          <div className="relative flex flex-wrap items-center gap-3">
            <Link
              to="/emergency"
              className="inline-flex items-center gap-2 rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark shadow-glowCrimson transition-colors"
            >
              <Ambulance className="w-4 h-4" /> Request ambulance
            </Link>
            <a
              href="tel:+911610000911"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <Phone className="w-4 h-4" /> +91-161-000-0911
            </a>
          </div>
        </div>
      </section>

      {announcements.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <Eyebrow>News & updates</Eyebrow>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink mb-8">What's happening at HeartStone</h2>
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

      {}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-void p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="pointer-events-none absolute -left-16 -bottom-20 h-64 w-64 rounded-full bg-aqua/20 blur-[100px]" />
          <div className="relative">
            <Eyebrow tone="white">Patient portal</Eyebrow>
            <h3 className="font-display text-2xl font-semibold text-white">Manage your appointments, bills, and prescriptions online.</h3>
            <p className="mt-2 text-sm text-white/60 max-w-xl">
              Register with your phone number to book visits, track your queue, and view records anytime.
            </p>
          </div>
          <Link
            to="/login"
            className="relative shrink-0 inline-flex items-center rounded-full bg-aqua hover:bg-aqua-dark text-void text-sm font-semibold px-7 py-3.5 shadow-glow transition-colors"
          >
            Sign in / Register →
          </Link>
        </div>
      </section>

      {}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-16 md:py-20 scroll-mt-24">
        <Eyebrow>Frequently asked</Eyebrow>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Answers before you visit.</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((item, i) => (
            <FaqItem key={item.q} item={item} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </section>

      {}
      <section id="contact" className="max-w-7xl mx-auto px-6 py-16 md:py-20 scroll-mt-24">
        <Eyebrow>Visit us</Eyebrow>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Contact HeartStone Hospital</h2>

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

          {}
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
