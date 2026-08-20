import { useEffect, useState, useCallback } from "react";
import { Package, Truck, Store, MapPin, CheckCircle2 } from "lucide-react";
import { pharmacyOrderService } from "../../services/index.js";
import { DataCard, EmptyRow, StatusBadge, SearchInput } from "../../components/ui/DataCard.jsx";
import SkeletonList from "../../components/ui/SkeletonList.jsx";

const NEXT_STEPS = {
  pickup: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready-for-pickup", "cancelled"],
    "ready-for-pickup": ["dispensed", "cancelled"],
  },
  delivery: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready-for-dispatch", "cancelled"],
    "ready-for-dispatch": ["out-for-delivery", "cancelled"],
    "out-for-delivery": ["delivered", "failed-delivery", "cancelled"],
    "failed-delivery": ["out-for-delivery", "cancelled"],
  },
};

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  "ready-for-pickup": "Ready for pickup",
  dispensed: "Dispensed",
  "ready-for-dispatch": "Ready to dispatch",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  "failed-delivery": "Delivery failed",
};

const STATUS_TONE = {
  pending: "warning",
  confirmed: "info",
  preparing: "info",
  "ready-for-pickup": "info",
  "ready-for-dispatch": "info",
  "out-for-delivery": "info",
  dispensed: "success",
  delivered: "success",
  cancelled: "danger",
  "failed-delivery": "danger",
};

function OrderRow({ order, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nextSteps = NEXT_STEPS[order.deliveryMethod]?.[order.status] || [];

  const advance = async (status) => {
    setBusy(true);
    setError("");
    try {
      const res = await pharmacyOrderService.updateStatus(order._id, status);
      onUpdated(res.data.order);
    } catch (err) {
      setError(err.response?.data?.error || "Could not update order");
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      const res = await pharmacyOrderService.markPaid(order._id);
      onUpdated(res.data.order);
    } catch (err) {
      setError(err.response?.data?.error || "Could not update payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DataCard
      title={order.orderNumber}
      subtitle={`${order.patientId?.name || "Patient"} · ${order.patientId?.phone || ""} · ${order.appointmentId?.appointmentCode || ""}`}
      badge={<StatusBadge status={STATUS_LABEL[order.status] || order.status} tone={STATUS_TONE[order.status] || "neutral"} />}
    >
      {error && <p className="mb-2 text-xs text-crimson">{error}</p>}

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-soft mb-2">
        {order.deliveryMethod === "delivery" ? <Truck className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
        {order.deliveryMethod === "delivery" ? "Home delivery" : "Hospital pickup"}
        <span className="ml-auto normal-case font-normal text-slate-soft">
          {order.paymentStatus === "paid" ? (
            <span className="inline-flex items-center gap-1 text-teal-dark"><CheckCircle2 className="w-3.5 h-3.5" /> Paid</span>
          ) : (
            "Unpaid"
          )}
        </span>
      </div>

      <div className="space-y-1.5">
        {order.items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-ink">{it.name} <span className="text-slate-soft">× {it.quantity}</span></span>
            <span className="text-slate-soft">₹{it.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm font-semibold mt-2 pt-2 border-t border-mist">
        <span className="text-ink">Total</span>
        <span className="text-ink">₹{order.finalTotal.toFixed(2)}</span>
      </div>

      {order.deliveryAddress && (
        <div className="mt-3 text-xs text-slate-soft inline-flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {order.deliveryAddress.fullName} · {order.deliveryAddress.phone} — {order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {nextSteps.map((s) => (
          <button
            key={s}
            onClick={() => advance(s)}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
              s === "cancelled" || s === "failed-delivery"
                ? "border border-crimson/30 text-crimson hover:bg-crimson/5"
                : "bg-navy text-white hover:bg-navy/90"
            }`}
          >
            {s === "cancelled" ? "Cancel order" : `Mark ${STATUS_LABEL[s]}`}
          </button>
        ))}
        {order.paymentStatus !== "paid" && (
          <button onClick={markPaid} disabled={busy} className="rounded-full border border-teal/40 text-teal-dark px-4 py-2 text-xs font-semibold hover:bg-teal/5 disabled:opacity-60">
            Mark paid
          </button>
        )}
      </div>
    </DataCard>
  );
}

export default function PharmacyOrdersDesk() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    pharmacyOrderService
      .getAll(statusFilter ? { status: statusFilter } : {})
      .then((res) => setOrders(res.data || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.patientId?.name?.toLowerCase().includes(q) ||
      o.appointmentId?.appointmentCode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search order, patient, or appointment ID..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-mist bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/20"
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_LABEL).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : filtered.length === 0 ? (
        <EmptyRow icon={Package} title="No orders found">No hospital pharmacy orders match this filter yet.</EmptyRow>
      ) : (
        filtered.map((o) => (
          <OrderRow key={o._id} order={o} onUpdated={(updated) => setOrders((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))} />
        ))
      )}
    </div>
  );
}
