import { Navigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import PublicPage from "../components/PublicPage";
import { staticPages } from "../data/staticPages";

const slugifyHeading = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function StaticPage({ slug }) {
  const page = staticPages[slug];

  if (!page) return <Navigate to="/" replace />;

  const toc = page.sections.map((s) => ({ id: slugifyHeading(s.heading), heading: s.heading }));

  return (
    <PublicPage title={page.title} eyebrow={page.eyebrow} updated={page.updated} icon={page.icon} intro={page.intro} toc={toc}>
      <div className="space-y-6">
        {page.sections.map((s, i) => (
          <div
            key={i}
            id={slugifyHeading(s.heading)}
            className="scroll-mt-28 rounded-[1.5rem] border border-mist bg-white p-6 sm:p-7 shadow-sm"
          >
            <h2 className="font-display text-lg text-ink">{s.heading}</h2>
            {Array.isArray(s.body) ? (
              <ul className="mt-3 space-y-2">
                {s.body.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-slate-soft leading-relaxed">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-crimson/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-soft leading-relaxed">{s.body}</p>
            )}
          </div>
        ))}
      </div>
    </PublicPage>
  );
}
