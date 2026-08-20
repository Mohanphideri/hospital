import { useEffect, useState, useCallback } from "react";
import { Package, Truck, Store, MapPin, XCircle, Loader2 } from "lucide-react";
import { pharmacyService, pharmacyOrderService, patientService } from "../../services/index.js";
import { DataCard, EmptyRow, StatusBadge, statusTone } from "../../components/ui/DataCard.jsx";
import SkeletonList from "../../components/ui/SkeletonList.jsx";

const PICKUP_STEPS = ["pending", "confirmed", "preparing", "ready-for-pickup", "dispensed"];
const DELIVERY_STEPS = ["pending", "confirmed", "preparing", "ready-for-dispatch", "out-for-delivery", "delivered"];
const STEP_LABELS = {
  pending: "Order placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "ready-for-pickup": "Ready for pickup",
  dispensed: "Picked up",
  "ready-for-dispatch": "Ready to dispatch",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
};

const EMPTY_ADDRESS = { fullName: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", landmark: "" };

function OrderTracker({ order }) {
  if (order.status === "cancelled") {
    return <div className="mt-3 text-xs font-semibold text-crimson inline-flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cancelled{order.cancelReason ? ` — ${order.cancelReason}` : ""}</div>;
  }
  if (order.status === "failed-delivery") {
    return <div className="mt-3 text-xs font-semibold text-crimson inline-flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Delivery attempt failed — the pharmacy will retry or contact you.</div>;
  }
  const steps = order.deliveryMethod === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentIdx = steps.indexOf(order.status);
  return (
    <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5 shrink-0">
          <div className="flex flex-col items-center gap-1">
            <div className={`h-2.5 w-2.5 rounded-full ${i <= currentIdx ? "bg-crimson" : "bg-mist"}`} />
            <div className={`text-[10px] whitespace-nowrap ${i <= currentIdx ? "text-ink font-semibold" : "text-slate-300"}`}>{STEP_LABELS[s]}</div>
          </div>
          {i < steps.length - 1 && <div className={`h-[2px] w-6 ${i < currentIdx ? "bg-crimson" : "bg-mist"}`} />}
        </div>
      ))}
    </div>
  );
}

function AddressForm({ value, onChange, prefillName, prefillPhone }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <div className="grid sm:grid-cols-2 gap-3 mt-3">
      <input value={value.fullName} onChange={set("fullName")} placeholder={prefillName ? `Full name (e.g. ${prefillName})` : "Full name"} className="rounded-xl border border-mist px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson" />
      <input value={value.phone} onChange={set("phone")} placeholder={prefillPhone ? `Phone (e.g. ${prefillPhone})` : "Phone"} className="rounded-xl border border-mist px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson" />
      <input value={value.addressLine1} onChange={set("addressLine1")} placeholder="Address line 1" className="sm:col-span-2 rounded-xl border border-mist px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson" />
      <input value={value.addressLine2} onChange={set("addressLine2")} placeholder="Address line 2 (optional)" className="sm:col-span-2 rounded-xl border border-mist px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson" />
      <input value={value.city} onChange={set("city")} placeholder="City" className="rounded-xl border border-mist px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson" />
      <input value={value.state} onChange={set("state")} placeholder="State" className="rounded-xl border border-mist px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson" />
      <input value={value.postalCode} onChange={set("postalCode")} placeholder="Postal code" className="rounded-xl border border-mist px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson" />
      <input value={value.landmark} onChange={set("landmark")} placeholder="Landmark (optional)" className="rounded-xl border border-mist px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20 focus:border-crimson" />
    </div>
  );
}

function StartOrderCard({ prescription, user, onOrderCreated }) {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({}); 
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS, fullName: user?.name || "", phone: user?.phone || "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pharmacyOrderService
      .getAvailability(prescription._id)
      .then((res) => {
        if (cancelled) return;
        setAvailability(res.data);
        const initial = {};
        res.data.lines.forEach((l) => {
          if (l.available) initial[l.index] = l.requestedQuantity;
        });
        setSelected(initial);
      })
      .catch((err) => !cancelled && setError(err.response?.data?.error || "Could not check medicine availability"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [prescription._id]);

  const toggle = (index, requestedQuantity) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (index in next) delete next[index];
      else next[index] = requestedQuantity;
      return next;
    });
  };

  const submit = async () => {
    const items = Object.entries(selected).map(([medicineIndex, quantity]) => ({ medicineIndex: Number(medicineIndex), quantity: Number(quantity) }));
    if (items.length === 0) {
      setError("Select at least one medicine to order.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await pharmacyOrderService.create({
        prescriptionId: prescription._id,
        items,
        deliveryMethod,
        deliveryAddress: deliveryMethod === "delivery" ? address : undefined,
      });
      onOrderCreated(res.data.order);
    } catch (err) {
      setError(err.response?.data?.error || "Could not place order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DataCard title="Checking availability…"><SkeletonList count={2} /></DataCard>;

  const availableLines = availability?.lines.filter((l) => l.available) || [];
  const unavailableLines = availability?.lines.filter((l) => !l.available) || [];

  return (
    <DataCard title="Order these medicines from the hospital pharmacy" subtitle={`Prescription from ${new Date(prescription.createdAt).toLocaleDateString([], { dateStyle: "medium" })}`}>
      {error && <p className="mb-3 text-xs text-crimson">{error}</p>}

      {availableLines.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-soft">Available</div>
          {availableLines.map((l) => (
            <label key={l.index} className="flex items-center gap-3 rounded-xl bg-mist px-4 py-3 cursor-pointer">
              <input type="checkbox" checked={l.index in selected} onChange={() => toggle(l.index, l.requestedQuantity)} className="h-4 w-4 accent-crimson" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink truncate">{l.name}</div>
                <div className="text-xs text-slate-soft">{l.dosage || "—"} · qty {l.requestedQuantity}{l.unitPrice ? ` · ₹${l.unitPrice}/unit` : ""}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {unavailableLines.length > 0 && (
        <div className="space-y-2 mt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-soft">Unavailable</div>
          {unavailableLines.map((l) => (
            <div key={l.index} className="rounded-xl border border-dashed border-mist px-4 py-3 opacity-70">
              <div className="text-sm font-semibold text-ink">{l.name}</div>
              <div className="text-xs text-slate-soft">{l.reason}</div>
            </div>
          ))}
        </div>
      )}

      {availableLines.length === 0 && (
        <EmptyRow>None of these medicines are currently in stock at the hospital pharmacy. You can switch to an outside pharmacy from the Prescriptions tab.</EmptyRow>
      )}

      {availableLines.length > 0 && (
        <>
          <div className="mt-5 pt-4 border-t border-mist">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-soft mb-2">Pickup or delivery?</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={() => setDeliveryMethod("pickup")} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${deliveryMethod === "pickup" ? "border-crimson bg-crimson/5" : "border-mist hover:border-crimson/30"}`}>
                <Store className="w-4 h-4 text-crimson" />
                <span className="text-sm font-semibold text-ink">Hospital pickup</span>
              </button>
              <button onClick={() => setDeliveryMethod("delivery")} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${deliveryMethod === "delivery" ? "border-crimson bg-crimson/5" : "border-mist hover:border-crimson/30"}`}>
                <Truck className="w-4 h-4 text-crimson" />
                <span className="text-sm font-semibold text-ink">Home delivery</span>
              </button>
            </div>
            {deliveryMethod === "delivery" && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-soft mt-4 mb-1">Delivery address</div>
                <AddressForm value={address} onChange={setAddress} prefillName={user?.name} prefillPhone={user?.phone} />
              </div>
            )}
          </div>

          <button onClick={submit} disabled={submitting} className="mt-5 w-full sm:w-auto rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Place order
          </button>
        </>
      )}
    </DataCard>
  );
}

function OrderCard({ order, onUpdated }) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState(order.deliveryAddress || EMPTY_ADDRESS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const saveAddress = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await pharmacyOrderService.updateAddress(order._id, address);
      onUpdated(res.data.order);
      setEditingAddress(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not update address");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await pharmacyOrderService.cancel(order._id, "Cancelled by patient");
      onUpdated(res.data.order);
    } catch (err) {
      setError(err.response?.data?.error || "Could not cancel order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DataCard
      title={order.orderNumber}
      subtitle={`Placed ${new Date(order.createdAt).toLocaleDateString([], { dateStyle: "medium" })}`}
      badge={<StatusBadge status={order.status} tone={order.status === "cancelled" || order.status === "failed-delivery" ? "danger" : order.status === "delivered" || order.status === "dispensed" ? "success" : "info"} />}
    >
      {error && <p className="mb-2 text-xs text-crimson">{error}</p>}
      <div className="space-y-2">
        {order.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-sm rounded-xl bg-mist px-4 py-2.5">
            <span className="text-ink font-medium">{it.name} <span className="text-slate-soft font-normal">× {it.quantity}</span></span>
            <span className="text-slate-soft">₹{it.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-soft">Medicine subtotal</span>
        <span className="text-ink font-medium">₹{order.medicineSubtotal.toFixed(2)}</span>
      </div>
      {order.deliveryFee > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-soft">Delivery fee</span>
          <span className="text-ink font-medium">₹{order.deliveryFee.toFixed(2)}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-sm font-semibold mt-1 pt-1 border-t border-mist">
        <span className="text-ink">Total</span>
        <span className="text-ink">₹{order.finalTotal.toFixed(2)}</span>
      </div>

      {order.deliveryMethod === "delivery" && order.deliveryAddress && (
        <div className="mt-4 pt-4 border-t border-mist">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-soft mb-2 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Delivery address</div>
          {!editingAddress ? (
            <div className="text-sm text-slate-soft leading-relaxed">
              {order.deliveryAddress.fullName} · {order.deliveryAddress.phone}<br />
              {order.deliveryAddress.addressLine1}{order.deliveryAddress.addressLine2 ? `, ${order.deliveryAddress.addressLine2}` : ""}<br />
              {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}
              {order.status === "pending" && (
                <button onClick={() => setEditingAddress(true)} className="block mt-2 text-xs font-semibold text-crimson hover:underline">Edit address</button>
              )}
            </div>
          ) : (
            <>
              <AddressForm value={address} onChange={setAddress} />
              <div className="mt-3 flex gap-2">
                <button onClick={saveAddress} disabled={busy} className="rounded-full bg-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-crimson-dark disabled:opacity-60">Save address</button>
                <button onClick={() => setEditingAddress(false)} className="rounded-full border border-mist px-4 py-2 text-xs font-semibold text-slate-soft hover:bg-mist">Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      <OrderTracker order={order} />

      {order.status === "pending" && (
        <button onClick={cancel} disabled={busy} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-crimson hover:underline disabled:opacity-60">
          <XCircle className="w-3.5 h-3.5" /> Cancel order
        </button>
      )}
    </DataCard>
  );
}

export default function PharmacyOrders({ user }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([pharmacyService.getMyPrescriptions(), pharmacyOrderService.getMine()])
      .then(([presRes, ordersRes]) => {
        setPrescriptions(presRes.data || []);
        setOrders(ordersRes.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <SkeletonList count={3} />;

  const orderedPrescriptionIds = new Set(orders.filter((o) => o.status !== "cancelled").map((o) => String(o.prescriptionId?._id || o.prescriptionId)));
  const needsOrder = prescriptions.filter((p) => p.fulfillmentChoice === "hospital" && !orderedPrescriptionIds.has(String(p._id)));

  return (
    <div className="space-y-6">
      {needsOrder.length === 0 && orders.length === 0 && (
        <EmptyRow icon={Package} title="No pharmacy orders yet">
          Once a doctor prescribes medicines and you choose "Hospital Pharmacy" from the Prescriptions tab, you can place your order here.
        </EmptyRow>
      )}

      {needsOrder.map((p) => (
        <StartOrderCard
          key={p._id}
          prescription={p}
          user={user}
          onOrderCreated={(order) => {
            setOrders((prev) => [order, ...prev]);
          }}
        />
      ))}

      {orders.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-ink">Your orders</div>
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} onUpdated={(updated) => setOrders((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))} />
          ))}
        </div>
      )}
    </div>
  );
}
