export default function EmptyState({ title, description, accent = "primary" }) {
  const accentBar = accent === "crimson" ? "bg-crimson" : "bg-primary";
  return (
    <div className="rounded-card border border-slate-200 bg-card p-10 md:p-14 text-center max-w-xl mx-auto animate-fadeUp shadow-card">
      <div className={`h-1.5 w-16 ${accentBar} rounded-full mx-auto mb-6`} />
      <h2 className="text-section-title text-text-primary mb-3">{title}</h2>
      <p className="text-body text-text-secondary leading-relaxed">{description}</p>
      <div className="mt-7 rounded-control bg-surface p-4 text-left text-body text-text-secondary">
        <strong className="block text-text-primary mb-2">Hospital dashboard status</strong>
        This section will show active workflows, queue status, and patient assignments once the backend is connected.
      </div>
    </div>
  );
}
