import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Truck, CheckCircle2 } from "lucide-react";
import { pharmacyService } from "../../services/index.js";

export default function PrescriptionFulfillmentChoice({ prescription, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const choice = prescription.fulfillmentChoice || "pending";

  
  
  if (!prescription.medicines || prescription.medicines.length === 0) return null;

  const choose = async (value) => {
    setSaving(true);
    setError("");
    try {
      const res = await pharmacyService.setFulfillmentChoice(prescription._id, value);
      onChanged?.(res.data.prescription);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save your choice - please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (choice === "pending") {
    return (
      <div className="mt-4 pt-4 border-t border-mist">
        <div className="text-sm font-semibold text-ink mb-3">Where would you like to get your medicines?</div>
        {error && <p className="mb-2 text-xs text-crimson">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => choose("hospital")}
            disabled={saving}
            className="flex items-center gap-3 rounded-xl border border-mist hover:border-crimson/40 hover:bg-crimson/5 p-4 text-left transition-colors disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson/10 text-crimson">
              <Building2 className="w-4 h-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Buy from Hospital Pharmacy</span>
              <span className="block text-xs text-slate-soft mt-0.5">Order online, pickup or home delivery</span>
            </span>
          </button>
          <button
            onClick={() => choose("outside")}
            disabled={saving}
            className="flex items-center gap-3 rounded-xl border border-mist hover:border-navy/40 hover:bg-mist p-4 text-left transition-colors disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
              <Truck className="w-4 h-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Get from Outside Pharmacy</span>
              <span className="block text-xs text-slate-soft mt-0.5">Use this prescription anywhere else</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (choice === "outside") {
    return (
      <div className="mt-4 pt-4 border-t border-mist flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 text-sm text-slate-soft">
          <CheckCircle2 className="w-4 h-4 text-teal" />
          You chose to get these medicines from an outside pharmacy. Download the prescription above to use elsewhere.
        </div>
      </div>
    );
  }

  
  return (
    <div className="mt-4 pt-4 border-t border-mist flex items-center justify-between gap-3 flex-wrap">
      <div className="inline-flex items-center gap-2 text-sm text-slate-soft">
        <CheckCircle2 className="w-4 h-4 text-crimson" />
        You chose Hospital Pharmacy for these medicines.
      </div>
      <Link
        to="/patient/pharmacy-orders"
        className="rounded-full bg-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
      >
        Continue to order →
      </Link>
    </div>
  );
}
