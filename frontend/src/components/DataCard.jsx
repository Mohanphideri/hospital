// Shared presentational building blocks used across Section.jsx so every
// portal (patient, admin, doctor, staff, pharmacist) renders lists and
// records with consistent spacing, alignment, and visual hierarchy.

export function DataCard({ title, subtitle, actions, badge, children, className = "" }) {
  const hasHeader = title || subtitle || actions || badge;
  return (
    <div className={`surface-card hover:shadow-card-hover p-5 sm:p-6 ${className}`}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <div className="text-card-title text-text-primary dark:text-slate-100 truncate">{title}</div>}
            {subtitle && <div className="mt-0.5 text-small text-text-secondary dark:text-slate-400">{subtitle}</div>}
          </div>
          {(actions || badge) && (
            <div className="flex items-center gap-2 shrink-0">
              {badge}
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// Renders a tidy label/value grid — the column count stays fixed and
// responsive so fields always line up instead of wrapping unevenly.
export function DataGrid({ fields }) {
  const visible = fields.filter(Boolean);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
      {visible.map((f, i) => (
        <div key={i} className="min-w-0">
          <div className="text-small font-semibold uppercase tracking-wider text-text-secondary/80 dark:text-slate-400">{f.label}</div>
          <div className="mt-1 text-body font-medium text-text-primary dark:text-slate-200 truncate">{f.value ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

const TONES = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-success-soft text-emerald-700 ring-1 ring-inset ring-emerald-200",
  warning: "bg-warning-soft text-amber-700 ring-1 ring-inset ring-amber-200",
  danger: "bg-error-soft text-red-700 ring-1 ring-inset ring-red-200",
  info: "bg-primary-soft text-primary-dark ring-1 ring-inset ring-primary/20",
};

export function StatusBadge({ status, tone = "neutral" }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${TONES[tone] || TONES.neutral}`}>
      {status}
    </span>
  );
}

// Maps common status strings across the app to a visual tone.
export function statusTone(status) {
  const s = (status || "").toLowerCase();
  if (["completed", "approved", "available", "answered", "done"].includes(s)) return "success";
  if (["pending", "booked", "waiting", "in-progress", "open"].includes(s)) return "warning";
  if (["cancelled", "rejected", "unavailable", "no-show", "closed"].includes(s)) return "danger";
  return "neutral";
}

export function EmptyRow({ children, icon: Icon, title }) {
  return (
    <div className="rounded-card border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-white/[0.02] p-10 text-center">
      {Icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-xs">
          <Icon className="w-5 h-5 text-text-secondary dark:text-slate-400" />
        </div>
      )}
      {title && <div className="mb-1.5 text-card-title text-text-primary dark:text-slate-100">{title}</div>}
      <div className="text-body text-text-secondary dark:text-slate-400">{children}</div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative w-full sm:w-72">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-control border border-slate-200 bg-white px-4 py-2.5 text-body focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors duration-150"
      />
    </div>
  );
}

export function SectionToolbar({ children }) {
  return <div className="flex flex-wrap items-center justify-between gap-3">{children}</div>;
}

// Itemized bill display used everywhere a bill's charges need to be shown
// (receptionist lookup, receptionist bill list). Reads
// every new field defensively (`?? 0` / `?? []`) so bills generated before
// appointmentFee/discountAmount/otherCharges existed still render safely.
export function BillBreakdown({ bill }) {
  if (!bill) return null;
  const appointmentFee = bill.appointmentFee ?? 0;
  const consultationFee = bill.consultationFee ?? 0;
  const medicinesTotal = bill.medicinesTotal ?? 0;
  const applicationFee = bill.applicationFee ?? 0;
  const otherCharges = bill.otherCharges ?? [];
  const discountAmount = bill.discountAmount ?? 0;
  const totalAmount = bill.totalAmount ?? 0;
  // Itemized medicines dispensed for this bill (name+dosage, qty, unit
  // price, amount) - see billingController.createBill's normalizedItems.
  const medicineItems = bill.items ?? [];

  const Row = ({ label, value, muted, negative, bold }) => (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? "text-ink font-semibold" : muted ? "text-slate-soft" : "text-ink"}>{label}</span>
      <span className={negative ? "text-emerald-600" : bold ? "text-ink font-semibold" : "text-ink font-medium"}>
        {negative ? "-" : ""}₹{Math.abs(value).toLocaleString("en-IN")}
      </span>
    </div>
  );

  return (
    <div className="space-y-1.5 rounded-xl bg-mist p-4">
      <Row label="Appointment fee" value={appointmentFee} muted />
      <Row label="Consultation fee" value={consultationFee} muted />
      {/* Medicine charges shown as a real itemized breakdown (each medicine,
          its dosage, quantity, and amount) rather than one opaque lump sum -
          this is what actually backs the "Medicine charges" total below it,
          not a separate table bolted on somewhere else in the page. */}
      {medicinesTotal > 0 && (
        <div className="rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-soft">Medicine charges</span>
            <span className="text-ink font-medium">₹{medicinesTotal.toLocaleString("en-IN")}</span>
          </div>
          {medicineItems.length > 0 && (
            <div className="mt-1.5 space-y-1 border-t border-slate-200/70 pt-1.5">
              {medicineItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-xs text-slate-soft">
                  <span className="truncate">{item.description || item.name || "Item"}</span>
                  <span className="shrink-0 text-ink">
                    ₹{Number(item.amount ?? (item.quantity || 1) * (item.unitPrice || item.price || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {applicationFee > 0 && <Row label="Visit / application fee" value={applicationFee} muted />}
      {otherCharges.map((c, i) => (
        <Row key={i} label={c.type} value={c.amount ?? 0} muted />
      ))}
      {discountAmount > 0 && <Row label="Discount" value={discountAmount} negative />}
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
        <span className="text-ink">Grand total</span>
        <span className="text-ink">₹{totalAmount.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
