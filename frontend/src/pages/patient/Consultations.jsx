import { useEffect, useState, useCallback } from "react";
import { Video, Clock, Stethoscope, Building2, ArrowLeft, Loader2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { consultationService } from "../../services/index.js";
import { DataCard, StatusBadge, EmptyRow } from "../../components/ui/DataCard.jsx";
import SkeletonList from "../../components/ui/SkeletonList.jsx";
import VideoCallPanel from "../../components/consultation/VideoCallPanel.jsx";
import PreJoinCheck from "../../components/consultation/PreJoinCheck.jsx";

const STATUS_TONE = { scheduled: "neutral", waiting: "warning", active: "info", completed: "success", cancelled: "danger" };
const STATUS_LABEL = { scheduled: "Not started", waiting: "Waiting for doctor", active: "In progress", completed: "Completed", cancelled: "Cancelled" };

const JOIN_WINDOW_MS = 10 * 60 * 1000;

function ConsultationRow({ item, onEnter }) {
  const { appointment: appt, consultation } = item;
  const status = consultation?.status || "scheduled";
  const eligible = appt.status !== "cancelled" && status !== "completed" && status !== "cancelled";

  return (
    <DataCard
      title={`Dr. ${appt.doctorId?.name || "—"}`}
      subtitle={appt.department?.name || "Consultation"}
      badge={<StatusBadge status={STATUS_LABEL[status] || status} tone={STATUS_TONE[status] || "neutral"} />}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-soft">
        <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
        <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {appt.appointmentCode}</span>
      </div>
      {eligible && (
        <button
          onClick={() => onEnter(item)}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
        >
          <Video className="w-4 h-4" /> {status === "active" ? "Rejoin call" : "Join meeting"}
        </button>
      )}
      {status === "completed" && (
        <Link to="/patient/prescriptions" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-crimson hover:underline">
          <FileText className="w-3.5 h-3.5" /> View consultation summary & prescription
        </Link>
      )}
    </DataCard>
  );
}

function ConsultationRoom({ appointment, user, onBack, initialStream }) {
  const [consultation, setConsultation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    consultationService
      .join(appointment._id)
      .then((res) => {
        setConsultation(res.data.consultation);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.error || "Could not join this consultation."))
      .finally(() => setLoading(false));
  }, [appointment._id]);

  useEffect(() => {
    refresh();
    // Poll for the doctor starting the call while we're still in the
    // waiting room, and to notice when they end the call while we're on it
    // (VideoCallPanel only reacts to the peer disconnecting, not to the
    // consultation being marked complete) - the socket connection also
    // pushes some of this, but polling is simple and resilient to a missed
    // event. Stops for good once the consultation has actually ended, since
    // joinConsultation logs an audit entry and broadcasts a socket update on
    // every call and there's nothing left to detect after that.
    const interval = setInterval(() => {
      setConsultation((current) => {
        const done = current && ["completed", "cancelled"].includes(current.status);
        if (!done) refresh();
        return current;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  
  
  const inCall = consultation?.status === "active";

  const leave = () => {
    consultationService.leave(appointment._id).catch(() => {});
    onBack();
  };

  if (loading) return <SkeletonList count={1} />;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-soft hover:text-crimson transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to consultations
      </button>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      {!error && consultation?.status === "completed" && (
        <EmptyRow icon={FileText} title="This consultation has ended">
          Your doctor has completed the visit. Your consultation summary and prescription are ready in Prescriptions.
        </EmptyRow>
      )}

      {!error && consultation && consultation.status !== "completed" && (
        <DataCard title={`Dr. ${appointment.doctorId?.name || "—"}`} subtitle={appointment.department?.name}>
          {inCall ? (
            <VideoCallPanel
              appointmentId={appointment._id}
              myRole="patient"
              myName={user?.name}
              peerName={appointment.doctorId?.name ? `Dr. ${appointment.doctorId.name}` : "Doctor"}
              onHangup={leave}
              initialStream={initialStream}
            />
          ) : (
            <div className="rounded-2xl bg-mist/70 p-10 text-center">
              <Loader2 className="w-6 h-6 mx-auto mb-3 text-crimson animate-spin" />
              <p className="text-sm font-semibold text-ink">You're in the waiting room</p>
              <p className="mt-1 text-sm text-slate-soft">Your doctor will start the call shortly. This page will connect automatically.</p>
            </div>
          )}
        </DataCard>
      )}
    </div>
  );
}

export default function PatientConsultations({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null); 
  
  
  
  const [deviceStream, setDeviceStream] = useState(null);

  useEffect(() => {
    consultationService
      .getMine()
      .then((res) => setItems(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  const reset = () => {
    
    
    
    
    deviceStream?.getTracks().forEach((t) => t.stop());
    setDeviceStream(null);
    setActiveItem(null);
  };

  if (loading) return <SkeletonList count={3} />;

  if (activeItem && !deviceStream) {
    const status = activeItem.consultation?.status || "scheduled";
    const opensAt = new Date(activeItem.appointment.slotTime).getTime() - JOIN_WINDOW_MS;
    const exemptFromTimeGate = status === "waiting" || status === "active";
    return (
      <div className="space-y-5">
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-soft hover:text-crimson transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to consultations
        </button>
        <PreJoinCheck
          title="Check your camera and microphone"
          subtitle="We'll ask for access before joining your doctor."
          opensAt={exemptFromTimeGate ? null : opensAt}
          onAllow={(stream) => setDeviceStream(stream)}
          onCancel={reset}
        />
      </div>
    );
  }

  if (activeItem && deviceStream) {
    return <ConsultationRoom appointment={activeItem.appointment} user={user} onBack={reset} initialStream={deviceStream} />;
  }

  if (items.length === 0) {
    return (
      <EmptyRow icon={Stethoscope} title="No online consultations yet">
        Book an online consultation from "Book appointment" to see a doctor by video from home.
      </EmptyRow>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ConsultationRow key={item.appointment._id} item={item} onEnter={setActiveItem} />
      ))}
    </div>
  );
}
