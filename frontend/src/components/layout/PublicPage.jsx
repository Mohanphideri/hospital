import { Link } from "react-router-dom";
import { Phone, ArrowLeft } from "lucide-react";
import Navbar from "./Navbar";
import SiteFooter from "./SiteFooter";

export default function PublicPage({ title, eyebrow, updated, icon: Icon, intro, toc, children }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-mist via-white to-mist/60 border-b border-mist">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle,#0F1F3D_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <div className="relative max-w-5xl mx-auto px-6 pt-10 pb-16 md:pt-14 md:pb-20">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-soft hover:text-crimson transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>

          <div className="flex items-start gap-5">
            {Icon && (
              <span className="hidden sm:inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-crimson/10 text-crimson">
                <Icon className="w-6 h-6" />
              </span>
            )}
            <div>
              {eyebrow && (
                <div className="flex items-center gap-2.5 text-crimson">
                  <span className="inline-block h-[2px] w-7 bg-crimson" />
                  <span className="text-[11px] tracking-widest2 uppercase font-semibold">{eyebrow}</span>
                </div>
              )}
              <h1 className="mt-3 font-editorial font-medium text-3xl sm:text-4xl text-ink tracking-tight leading-[1.1]">
                {title}
              </h1>
              {intro && <p className="mt-4 max-w-2xl text-slate-soft leading-relaxed">{intro}</p>}
              {updated && (
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-soft/70">{updated}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-14 md:py-16">
        <div className="grid lg:grid-cols-[220px_1fr] gap-12">
          {toc && toc.length > 1 && (
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-0.5">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-soft/70">
                  On this page
                </div>
                {toc.map((t) => (
                  <a
                    key={t.id}
                    href={`#${t.id}`}
                    className="block rounded-lg px-3 py-1.5 text-sm text-slate-soft hover:bg-mist hover:text-crimson transition-colors"
                  >
                    {t.heading}
                  </a>
                ))}
              </div>
            </aside>
          )}
          <div className="min-w-0">{children}</div>
        </div>
      </section>

      {}
      <section className="border-t border-mist bg-mist/40">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <div className="font-display text-lg text-ink">Still have questions?</div>
            <p className="mt-1 text-sm text-slate-soft">Our reception team is happy to help with anything not covered here.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/contact-us"
              className="inline-flex items-center rounded-full border border-mist bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:border-crimson/30 hover:text-crimson transition-colors"
            >
              Contact us
            </Link>
            <a
              href="tel:+911610000911"
              className="inline-flex items-center gap-2 rounded-full bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
            >
              <Phone className="w-4 h-4" /> Emergency line
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
