
export function Spinner({ size = 18, className = "" }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageLoader({ label = "Loading" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-slate-soft" role="status" aria-live="polite">
      <svg viewBox="0 0 200 60" className="w-40 h-12" aria-hidden="true">
        <polyline
          points="0,30 60,30 78,30 90,10 102,50 114,30 126,30 145,30 158,16 170,44 182,30 200,30"
          fill="none"
          stroke="#C8102E"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="500"
          className="animate-heartbeatLine"
        />
      </svg>
      <div className="text-sm font-medium tracking-wide">{label}…</div>
    </div>
  );
}

export default Spinner;
