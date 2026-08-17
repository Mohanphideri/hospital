// Split out of ../Section.jsx (see that file's renderDoctor usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.

import { DataCard, EmptyRow, SectionToolbar, StatusBadge, statusTone } from "../../components/DataCard";
import EmptyState from "../../components/EmptyState";
import SkeletonList from "../../components/SkeletonList";
import { downloadPrescriptionPdf } from "../../utils/generatePrescriptionPdf";
import { DAY_NAMES, EMPTY_MEDICINE_LINE } from "./sectionShared.js";

export function renderDoctorContentImpl({ addRxMedicineLine, clinicalLookupCode, clinicalLookupError, clinicalLookupResult, config, current, doctorApptDate, encounterForm, encounterSaveStatus, error, loading, myWeeklySchedule, payload, removeRxMedicineLine, renderIpdWorkspace, renderMessagesBoard, renderProfileContent, renderStaffContent, renderTicketThread, replyToTicket, runClinicalLookup, rxAppointmentId, rxMedicines, rxNotes, rxStatus, section, setClinicalLookupCode, setDoctorApptDate, setEncounterForm, setRxAppointmentId, setRxMedicines, setRxNotes, setRxStatus, setTicketReplyDrafts, submitEncounter, submitPrescription, ticketReplyDrafts, updateDoctorAppointmentStatus, updateRxMedicineLine }) {
  if (section === "messages") {
    return renderMessagesBoard();
  }
  if (section === "appointments") {
    const todayStr = new Date().toISOString().slice(0, 10);
    const shiftDate = days => {
      const d = new Date(doctorApptDate);
      d.setDate(d.getDate() + days);
      setDoctorApptDate(d.toISOString().slice(0, 10));
    };
    const isFutureAppt = appt => {
      const apptDay = new Date(appt.slotTime);
      apptDay.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return apptDay > today;
    };
    const dateToolbar = <SectionToolbar>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(-1)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-soft hover:bg-mist transition-colors" aria-label="Previous day">
              ←
            </button>
            <input type="date" value={doctorApptDate} onChange={e => setDoctorApptDate(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
            <button onClick={() => shiftDate(1)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-soft hover:bg-mist transition-colors" aria-label="Next day">
              →
            </button>
            {doctorApptDate !== todayStr && <button onClick={() => setDoctorApptDate(todayStr)} className="rounded-full bg-mist px-4 py-2 text-xs font-semibold text-ink hover:bg-slate-200 transition-colors">
                Today
              </button>}
          </div>
        </SectionToolbar>;
    if (loading) return <div className="space-y-4">{dateToolbar}<SkeletonList count={3} /></div>;
    if (error) return <div className="space-y-4">{dateToolbar}<div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div></div>;
    if (!payload || payload.length === 0) {
      return <div className="space-y-4">
            {dateToolbar}
            <EmptyRow title="Nothing scheduled">
              {doctorApptDate === todayStr ? "No appointments scheduled for today." : `No appointments scheduled for ${new Date(doctorApptDate).toLocaleDateString([], {
            dateStyle: "medium"
          })}.`}
            </EmptyRow>
          </div>;
    }
    return <div className="space-y-4">
          {dateToolbar}
          <div className="text-sm text-slate-soft">{payload.length} appointment{payload.length !== 1 ? "s" : ""}</div>
          {payload.map(appt => {
        const locked = isFutureAppt(appt);
        return <DataCard key={appt._id} title={appt.patientId?.name || appt.patientId?.phone || "Unknown patient"} subtitle={appt.appointmentCode ? `${appt.appointmentCode} · ${new Date(appt.slotTime).toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short"
        })}` : new Date(appt.slotTime).toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short"
        })} actions={locked ? <span className="rounded-full bg-mist px-4 py-1.5 text-xs font-medium text-slate-soft">
                    Available on {new Date(appt.slotTime).toLocaleDateString([], {
            dateStyle: "medium"
          })}
                  </span> : <div className="flex items-center gap-2">
                  <select value={appt.status} onChange={e => updateDoctorAppointmentStatus(appt._id, e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                    {["booked", "completed", "cancelled", "no-show"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => {
            setRxAppointmentId(rxAppointmentId === appt._id ? null : appt._id);
            setRxStatus("");
            setRxMedicines([{
              ...EMPTY_MEDICINE_LINE
            }]);
            setRxNotes("");
          }} className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition-colors">
                    {rxAppointmentId === appt._id ? "Close" : "Write prescription"}
                  </button>
                </div>}>
              {rxAppointmentId === appt._id && <div className="rounded-xl bg-mist p-5 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">New prescription</div>
                  {rxMedicines.map((line, index) => <div key={index} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                      <input type="text" placeholder="Medicine name" value={line.name} onChange={e => updateRxMedicineLine(index, "name", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                      <input type="text" placeholder="Dosage (e.g. 1-0-1)" value={line.dosage} onChange={e => updateRxMedicineLine(index, "dosage", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                      <input type="number" placeholder="Qty" value={line.quantity} onChange={e => updateRxMedicineLine(index, "quantity", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                      {rxMedicines.length > 1 && <button type="button" onClick={() => removeRxMedicineLine(index)} className="text-slate-400 hover:text-red-600 text-sm justify-self-start sm:justify-self-auto">
                          Remove
                        </button>}
                    </div>)}
                  <label className="block space-y-2 pt-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">
                      Doctor's notes / advice (optional)
                    </span>
                    <textarea value={rxNotes} onChange={e => setRxNotes(e.target.value)} rows={3} placeholder="Diagnosis summary, dietary advice, follow-up instructions..." className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  </label>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button type="button" onClick={addRxMedicineLine} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:border-crimson/30 transition-colors">
                      + Add medicine
                    </button>
                    <button type="button" onClick={() => submitPrescription(appt)} className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors">
                      Save prescription
                    </button>
                    {rxStatus && <span className="text-xs font-medium text-slate-600">{rxStatus}</span>}
                  </div>
                </div>}
            </DataCard>;
      })}
        </div>;
  }
  if (section === "prescriptions") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    if (!payload || payload.length === 0) {
      return <EmptyRow>You haven't written any prescriptions yet.</EmptyRow>;
    }
    return <div className="space-y-4">
          {payload.map(rx => <DataCard key={rx._id} title={rx.patientId?.name || rx.patientId?.phone || "Unknown patient"} subtitle={`Written ${new Date(rx.createdAt).toLocaleDateString()}`} actions={<button onClick={() => downloadPrescriptionPdf(rx)} className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-navy/5 px-4 py-2 text-xs font-semibold text-navy hover:bg-navy hover:text-white hover:border-navy transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>}>
              <div className="space-y-2.5">
                {rx.medicines?.map((med, i) => <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-mist px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                      <div className="text-xs text-slate-soft mt-0.5">{med.dosage}{med.quantity ? ` · qty ${med.quantity}` : ""}</div>
                    </div>
                    <StatusBadge status={med.availability} tone={statusTone(med.availability)} />
                  </div>)}
              </div>
              {rx.notes && <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                  <span className="font-semibold text-ink">Notes: </span>{rx.notes}
                </div>}
            </DataCard>)}
        </div>;
  }
  if (section === "schedule") {
    if (loading) return <SkeletonList count={3} />;
    if (!myWeeklySchedule) return <EmptyRow>Your availability hasn't been set by the admin yet.</EmptyRow>;
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DAY_NAMES.map((name, i) => {
        const times = myWeeklySchedule.schedule?.[i] || [];
        return <DataCard key={name} title={name}>
                {times.length === 0 ? <div className="text-sm text-slate-soft">No slots set.</div> : <div className="flex flex-wrap gap-2">
                    {times.map(t => <span key={t} className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink">{t}</span>)}
                  </div>}
              </DataCard>;
      })}
        </div>;
  }
  if (section === "tickets") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    if (!payload || payload.length === 0) {
      return <EmptyRow>No patient tickets have been redirected to you.</EmptyRow>;
    }
    return <div className="space-y-4">
          {payload.map(q => <DataCard key={q._id} title={q.subject} subtitle={`Ticket ${q.ticketId} · ${q.patientId?.name || q.patientId?.phone || "Unknown patient"}`} badge={<StatusBadge status={q.status} tone={statusTone(q.status)} />}>
              {renderTicketThread(q)}
              {q.status !== "closed" && q.status !== "completed" && <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                  <textarea value={ticketReplyDrafts[q._id] || ""} onChange={e => setTicketReplyDrafts(prev => ({
            ...prev,
            [q._id]: e.target.value
          }))} rows={2} placeholder="Reply to this patient..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  <button onClick={() => replyToTicket(q._id)} className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors">
                    Send reply
                  </button>
                  <span className="ml-2 text-xs text-slate-soft">Only admin can change the ticket's status.</span>
                </div>}
            </DataCard>)}
        </div>;
  }
  if (section === "clinical") {
    return <div className="space-y-6">
          <DataCard>
            <form onSubmit={runClinicalLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2 flex-1 min-w-[220px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Appointment ID</span>
                <input type="text" value={clinicalLookupCode} onChange={e => setClinicalLookupCode(e.target.value)} placeholder="e.g. APT-260723-4F2K" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wide focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Look up
              </button>
            </form>
          </DataCard>

          {clinicalLookupError && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{clinicalLookupError}</div>}

          {clinicalLookupResult && <>
              {(() => {
          const apptDay = new Date(clinicalLookupResult.appointment.slotTime);
          apptDay.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return apptDay > today;
        })() ? <DataCard title={clinicalLookupResult.appointment.patientId?.name || clinicalLookupResult.appointment.patientId?.phone} subtitle={clinicalLookupResult.appointment.appointmentCode}>
                  <EmptyRow title="This appointment hasn't happened yet">
                    You can record vitals and diagnosis for this visit starting on {new Date(clinicalLookupResult.appointment.slotTime).toLocaleDateString([], {
              dateStyle: "medium"
            })}.
                  </EmptyRow>
                </DataCard> : <DataCard title={clinicalLookupResult.appointment.patientId?.name || clinicalLookupResult.appointment.patientId?.phone} subtitle={clinicalLookupResult.appointment.appointmentCode}>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <input type="text" placeholder="Temp (°F)" value={encounterForm.temperatureF} onChange={e => setEncounterForm(p => ({
                ...p,
                temperatureF: e.target.value
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="BP (e.g. 120/80)" value={encounterForm.bloodPressure} onChange={e => setEncounterForm(p => ({
                ...p,
                bloodPressure: e.target.value
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Pulse (bpm)" value={encounterForm.pulseBpm} onChange={e => setEncounterForm(p => ({
                ...p,
                pulseBpm: e.target.value
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="SpO2 (%)" value={encounterForm.spo2} onChange={e => setEncounterForm(p => ({
                ...p,
                spo2: e.target.value
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Resp. rate" value={encounterForm.respiratoryRate} onChange={e => setEncounterForm(p => ({
                ...p,
                respiratoryRate: e.target.value
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Weight (kg)" value={encounterForm.weightKg} onChange={e => setEncounterForm(p => ({
                ...p,
                weightKg: e.target.value
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="text" placeholder="Height (cm)" value={encounterForm.heightCm} onChange={e => setEncounterForm(p => ({
                ...p,
                heightCm: e.target.value
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    <input type="date" value={encounterForm.followUpDate} onChange={e => setEncounterForm(p => ({
                ...p,
                followUpDate: e.target.value
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  </div>
                  <input type="text" placeholder="Chief complaint" value={encounterForm.chiefComplaint} onChange={e => setEncounterForm(p => ({
              ...p,
              chiefComplaint: e.target.value
            }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  <input type="text" placeholder="Diagnosis (comma-separated if more than one)" value={encounterForm.diagnosisText} onChange={e => setEncounterForm(p => ({
              ...p,
              diagnosisText: e.target.value
            }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  <textarea placeholder="Clinical notes" value={encounterForm.clinicalNotes} onChange={e => setEncounterForm(p => ({
              ...p,
              clinicalNotes: e.target.value
            }))} rows={3} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  {encounterSaveStatus && <div className="text-sm font-medium text-emerald-600">{encounterSaveStatus}</div>}
                  <button onClick={submitEncounter} className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                    Save encounter
                  </button>
                </div>
              </DataCard>}

              {clinicalLookupResult.encounters.length > 0 && <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Previous encounters for this visit</div>
                  <div className="space-y-3">
                    {clinicalLookupResult.encounters.map(enc => <DataCard key={enc._id} title={new Date(enc.createdAt).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            })} subtitle={enc.chiefComplaint}>
                        {enc.diagnosis?.length > 0 && <div className="text-sm text-ink">Diagnosis: {enc.diagnosis.map(d => d.description).join(", ")}</div>}
                        {enc.clinicalNotes && <div className="mt-1 text-sm text-slate-soft">{enc.clinicalNotes}</div>}
                      </DataCard>)}
                  </div>
                </div>}
            </>}
        </div>;
  }
  if (section === "ipd") {
    return renderIpdWorkspace("doctor");
  }
  if (section === "leave" || section === "leave-history") {
    return renderStaffContent();
  }
  if (section === "profile") {
    return renderProfileContent();
  }
  return <EmptyState title={current.label} description={current.desc} accent={config.accent === "crimson" ? "crimson" : "navy"} />;
}
