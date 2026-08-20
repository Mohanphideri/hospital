import { useEffect, useState, useCallback } from "react";
import { Video, Clock, ArrowLeft, Loader2, CheckCircle2, UserCircle2 } from "lucide-react";
import { consultationService, encounterService, pharmacyService } from "../../services/index.js";
import { DataCard, StatusBadge, EmptyRow } from "../../components/ui/DataCard.jsx";
import SkeletonList from "../../components/ui/SkeletonList.jsx";
import VideoCallPanel from "../../components/consultation/VideoCallPanel.jsx";

const STATUS_TONE = { scheduled: "neutral", waiting: "warning", active: "info", completed: "success", cancelled: "danger" };
const STATUS_LABEL = { scheduled: "Not started", waiting: "Patient waiting", active: "In progress", completed: "Completed", cancelled: "Cancelled" };
const EMPTY_MEDICINE_LINE = { name: "", dosage: "", quantity: "" };

// One row in the doctor's "Online consultations" list.
function ConsultationRow({ item, onOpen }) {
  const { appointment: appt, consultation } = item;
  const status = consultation?.status || "scheduled";
  const waiting = status === "waiting";
  return (
    <DataCard
      title={appt.patientId?.name || appt.patientId?.phone || "Unknown patient"}
      subtitle={appt.department?.name || "Consultation"}
      badge={<StatusBadge status={STATUS_LABEL[status] || status} tone={STATUS_TONE[status] || "neutral"} />}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-soft">
        <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
        <span className="inline-flex items-center gap-1.5"><UserCircle2 className="w-3.5 h-3.5" /> {appt.appointmentCode}</span>
      </div>
      {status !== "completed" && status !== "cancelled" && (
        <button
          onClick={() => onOpen(appt)}
          className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors ${waiting ? "bg-crimson hover:bg-crimson-dark" : "bg-navy hover:bg-navy-light"}`}
        >
          <Video className="w-4 h-4" /> {waiting ? "Patient is waiting — open" : "Open consultation"}
        </button>
      )}
      {status === "completed" && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" /> Consultation completed
        </div>
      )}
    </DataCard>
  );
}

function ConsultationWorkspace({ appointment, user, onBack, onCompleted }) {
  const [consultation, setConsultation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Notes / diagnosis / follow-up
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [encounterStatus, setEncounterStatus] = useState("");
  const [encounterSaved, setEncounterSaved] = useState(false);

  // Prescription
  const [rxMedicines, setRxMedicines] = useState([{ ...EMPTY_MEDICINE_LINE }]);
  const [rxNotes, setRxNotes] = useState("");
  const [rxStatus, setRxStatus] = useState("");
  const [rxSaved, setRxSaved] = useState(false);

  const refresh = useCallback(() => {
    consultationService
      .join(appointment._id)
      .then((res) => {
        setConsultation(res.data.consultation);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.error || "Could not open this consultation."))
      .finally(() => setLoading(false));
  }, [appointment._id]);

  useEffect(() => {
    refresh();
    // Same rationale as the patient waiting room: keep polling through an
    // active call too (so we notice if the patient's side reports the
    // consultation ended), but stop for good once it actually has -
    // joinConsultation logs an audit entry and broadcasts a socket update on
    // every call.
    const interval = setInterval(() => {
      setConsultation((current) => {
        const done = current && ["completed", "cancelled"].includes(current.status);
        if (!done) refresh();
        return current;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  
  
  
  
  useEffect(() => {
    encounterService
      .getForAppointment(appointment._id)
      .then((res) => {
        if ((res.data || []).length > 0) setEncounterSaved(true);
      })
      .catch(() => {});
    pharmacyService
      .getPrescriptions({ appointmentId: appointment._id })
      .then((res) => {
        if ((res.data || []).length > 0) setRxSaved(true);
      })
      .catch(() => {});
  }, [appointment._id]);

  const startCall = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await consultationService.start(appointment._id);
      setConsultation(res.data.consultation);
    } catch (err) {
      setError(err.response?.data?.error || "Could not start the call.");
    } finally {
      setStarting(false);
    }
  };

  const saveEncounter = async () => {
    setEncounterStatus("Saving...");
    try {
      await encounterService.create({
        appointmentId: appointment._id,
        chiefComplaint: chiefComplaint || undefined,
        diagnosis: diagnosisText.split(",").map((d) => d.trim()).filter(Boolean),
        clinicalNotes: clinicalNotes || undefined,
        followUpDate: followUpDate || undefined,
      });
      setEncounterStatus("Saved.");
      setEncounterSaved(true);
    } catch (err) {
      setEncounterStatus(err.response?.data?.error || "Failed to save notes.");
    }
  };

  const updateRxLine = (index, field, value) => {
    setRxMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };
  const addRxLine = () => setRxMedicines((prev) => [...prev, { ...EMPTY_MEDICINE_LINE }]);
  const removeRxLine = (index) => setRxMedicines((prev) => prev.filter((_, i) => i !== index));

  const savePrescription = async () => {
    const validLines = rxMedicines.filter((m) => m.name.trim());
    if (validLines.length === 0) {
      setRxStatus("Add at least one medicine.");
      return;
    }
    setRxStatus("Saving...");
    try {
      await pharmacyService.createPrescription({
        appointmentId: appointment._id,
        patientId: appointment.patientId?._id,
        medicines: validLines.map((m) => ({ name: m.name, dosage: m.dosage, quantity: m.quantity ? Number(m.quantity) : undefined })),
        notes: rxNotes.trim() || undefined,
      });
      setRxStatus("Prescription saved.");
      setRxSaved(true);
    } catch (err) {
      setRxStatus(err.response?.data?.error || "Failed to save prescription.");
    }
  };

  const hangup = () => {
    consultationService.leave(appointment._id).catch(() => {});
    onBack();
  };

  const completeConsultation = async () => {
    setCompleting(true);
    setError("");
    try {
      await consultationService.complete(appointment._id);
      onCompleted();
    } catch (err) {
      setError(err.response?.data?.error || "Could not complete the consultation.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <SkeletonList count={1} />;

  const status = consultation?.status || "scheduled";
  const isActive = status === "active";
  const isCompleted = status === "completed";

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-soft hover:text-crimson transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to consultations
      </button>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

      {isCompleted ? (
        <EmptyRow icon={CheckCircle2} title="This consultation has been completed">
          Notes, diagnosis and any prescription you saved are recorded on the patient's chart.
        </EmptyRow>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <DataCard title={appointment.patientId?.name || "Patient"} subtitle={appointment.department?.name}>
            {isActive ? (
              <VideoCallPanel
                appointmentId={appointment._id}
                myRole="doctor"
                myName={user?.name ? `Dr. ${user.name}` : "You"}
                peerName={appointment.patientId?.name || "Patient"}
                onHangup={hangup}
              />
            ) : (
              <div className="rounded-2xl bg-mist/70 p-10 text-center">
                {status === "waiting" ? (
                  <>
                    <p className="text-sm font-semibold text-ink">Your patient is in the waiting room</p>
                    <p className="mt-1 text-sm text-slate-soft mb-4">Start the call when you're ready to begin.</p>
                    <button onClick={startCall} disabled={starting} className="inline-flex items-center gap-2 rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark disabled:opacity-60 transition-colors">
                      {starting && <Loader2 className="w-4 h-4 animate-spin" />} Start call
                    </button>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-6 h-6 mx-auto mb-3 text-crimson animate-spin" />
                    <p className="text-sm text-slate-soft">Waiting for your patient to join.</p>
                  </>
                )}
              </div>
            )}
          </DataCard>

          <div className="space-y-5">
            <DataCard title="Consultation notes & diagnosis">
              <div className="space-y-3">
                <input type="text" placeholder="Chief complaint" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                <input type="text" placeholder="Diagnosis (comma-separated)" value={diagnosisText} onChange={(e) => setDiagnosisText(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                <textarea placeholder="Clinical notes" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Follow-up date (optional)</span>
                  <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={saveEncounter} className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition-colors">
                    Save notes
                  </button>
                  {encounterStatus && <span className="text-xs font-medium text-slate-600">{encounterStatus}</span>}
                </div>
              </div>
            </DataCard>

            <DataCard title="Prescription">
              <div className="space-y-3">
                {rxMedicines.map((line, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                    <input type="text" placeholder="Medicine name" value={line.name} onChange={(e) => updateRxLine(index, "name", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Dosage (e.g. 1-0-1)" value={line.dosage} onChange={(e) => updateRxLine(index, "dosage", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => updateRxLine(index, "quantity", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    {rxMedicines.length > 1 && (
                      <button type="button" onClick={() => removeRxLine(index)} className="text-slate-400 hover:text-red-600 text-sm justify-self-start sm:justify-self-auto">Remove</button>
                    )}
                  </div>
                ))}
                <textarea value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} rows={2} placeholder="Advice / follow-up instructions (optional)" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button type="button" onClick={addRxLine} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:border-crimson/30 transition-colors">
                    + Add medicine
                  </button>
                  <button type="button" onClick={savePrescription} className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors">
                    Save prescription
                  </button>
                  {rxStatus && <span className="text-xs font-medium text-slate-600">{rxStatus}</span>}
                </div>
                <p className="text-xs text-slate-soft pt-1">
                  Once saved, your patient independently chooses hospital pharmacy or an outside pharmacy — that choice isn't made here.
                </p>
              </div>
            </DataCard>

            <button
              onClick={completeConsultation}
              disabled={completing || !encounterSaved}
              title={!encounterSaved ? "Save consultation notes before completing" : undefined}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {completing && <Loader2 className="w-4 h-4 animate-spin" />} Complete consultation
            </button>
            {!encounterSaved && <p className="text-xs text-slate-soft text-center">Save your consultation notes first{rxSaved ? "" : " (a prescription is optional)"}.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorConsultations({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAppointment, setActiveAppointment] = useState(null);

  const load = useCallback(() => {
    consultationService
      .getForDoctor()
      .then((res) => setItems(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <SkeletonList count={3} />;

  if (activeAppointment) {
    return (
      <ConsultationWorkspace
        appointment={activeAppointment}
        user={user}
        onBack={() => {
          setActiveAppointment(null);
          load();
        }}
        onCompleted={() => {
          setActiveAppointment(null);
          load();
        }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyRow icon={Video} title="No online consultations">
        Online consultations booked with you will appear here.
      </EmptyRow>
    );
  }

  
  const sorted = [...items].sort((a, b) => {
    const rank = (s) => (s === "waiting" ? 0 : s === "active" ? 1 : s === "scheduled" || !s ? 2 : 3);
    return rank(a.consultation?.status) - rank(b.consultation?.status);
  });

  return (
    <div className="space-y-4">
      {sorted.map((item) => (
        <ConsultationRow key={item.appointment._id} item={item} onOpen={setActiveAppointment} />
      ))}
    </div>
  );
}
