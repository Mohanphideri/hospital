// Animated placeholder cards shown while data is loading - gives a sense of
// the content's shape (title, badge, a couple of fields) instead of a blank
// screen or a generic spinner, so pages feel faster and less jarring once
// real data arrives.
function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded-full bg-mist ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="space-y-2 flex-1">
          <Bar className="h-4 w-1/3" />
          <Bar className="h-3 w-1/4" />
        </div>
        <Bar className="h-6 w-20 shrink-0" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-full hidden sm:block" />
      </div>
    </div>
  );
}

export default function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Single stat-style card - e.g. the patient's current queue token, a KPI
// tile - where the real content is one big headline number plus a couple of
// labeled fields underneath, rather than a repeating list.
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-mist bg-white p-8 shadow-sm max-w-md">
      <Bar className="h-3 w-1/3" />
      <Bar className="mt-4 h-10 w-24" />
      <div className="mt-6 pt-6 border-t border-mist space-y-4">
        <div className="flex items-center justify-between">
          <Bar className="h-3 w-1/4" />
          <Bar className="h-3 w-1/5" />
        </div>
        <div className="flex items-center justify-between">
          <Bar className="h-3 w-1/3" />
          <Bar className="h-3 w-1/6" />
        </div>
        <div className="flex items-center justify-between">
          <Bar className="h-3 w-1/4" />
          <Bar className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// A handful of labeled-field-shaped bars - for forms (booking, profile
// edit) that are still waiting on reference data (departments, existing
// profile values) before they can render for real.
export function SkeletonForm({ fields = 4 }) {
  return (
    <div className="rounded-2xl border border-mist bg-white p-5 sm:p-6 space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bar className="h-3 w-1/4" />
          <Bar className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <Bar className="h-11 w-32 rounded-full" />
    </div>
  );
}

// Grid of small KPI/stat tiles - dashboard "home" overviews.
export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-mist bg-white p-5 space-y-3">
          <Bar className="h-3 w-1/2" />
          <Bar className="h-7 w-1/3" />
        </div>
      ))}
    </div>
  );
}
