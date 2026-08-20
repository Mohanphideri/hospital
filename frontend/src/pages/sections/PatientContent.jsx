

import { BillBreakdown, DataCard, DataGrid, EmptyRow, SearchInput, SectionToolbar, StatusBadge, statusTone } from "../../components/ui/DataCard";
import EmptyState from "../../components/ui/EmptyState";
import { Mail, RefreshCw, Building2, Video } from "lucide-react";
import SkeletonList, { SkeletonForm, SkeletonStatCard } from "../../components/ui/SkeletonList";
import { downloadBillPdf } from "../../utils/generateBillPdf";
import { downloadPrescriptionPdf } from "../../utils/generatePrescriptionPdf";
import { getClinicTodayString } from "../../utils/clinicTime.js";
import PrescriptionFulfillmentChoice from "../../components/patient/PrescriptionFulfillmentChoice.jsx";

const LIST_SECTIONS = new Set(["appointments", "prescriptions", "bills", "queries", "medical-records"]);

export function renderPatientContentImpl({ bookEmailInput, bookGeneralAppointment, bookingStatus, bookTypeChosen, cancelDrafts, cancelMyAppointment, cancelReasons, config, confirmAndBookSlot, consultationType, current, departments, error, fetchSlots, loading, myEncounters, newTicketForm, newTicketStatus, openCancelId, patientProfile, patientProfileForm, patientProfileMessage, patientProfileSaving, patientReplyDrafts, patientReplyToTicket, payload, queueRefreshing, refreshQueueStatus, renderTicketThread, searchQuery, section, selectedDate, selectedDepartment, setBookEmailInput, setBookingStatus, setBookTypeChosen, setCancelDrafts, setConsultationType, setError, setNewTicketForm, setOpenCancelId, setPatientProfileForm, setPatientReplyDrafts, setPayload, setSearchQuery, setSelectedDate, setSelectedDepartment, setSlots, slots, submitNewTicket, submitPatientProfileUpdate, user }) {
  if (loading) {
    if (section === "queue") return <SkeletonStatCard />;
    if (section === "book" || section === "profile") return <SkeletonForm fields={4} />;
    if (LIST_SECTIONS.has(section)) return <SkeletonList count={3} />;
    return <SkeletonList count={3} />;
  }
  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }
  if (section === "appointments") {
    if (!payload || payload.length === 0) {
      return <EmptyRow title="No appointments yet">Book one from the Book Appointment tab.</EmptyRow>;
    }
    const canCancel = appt => appt.status === "booked";
    const q = searchQuery.trim().toLowerCase();
    const visible = !q ? payload : payload.filter(appt => appt.doctorId?.name?.toLowerCase().includes(q) || appt.department?.name?.toLowerCase().includes(q) || appt.appointmentCode?.toLowerCase().includes(q) || appt.status?.toLowerCase().includes(q));
    return <div className="space-y-4">
          <SectionToolbar>
            <div className="text-sm text-slate-soft">{payload.length} appointment{payload.length !== 1 ? "s" : ""}</div>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by doctor, department, code..." />
          </SectionToolbar>
          {visible.length === 0 && <EmptyRow title="No matches">Try a different search term.</EmptyRow>}
          {visible.map(appt => {
        const draft = cancelDrafts[appt._id] || {
          reason: "",
          note: ""
        };
        const isCancelling = openCancelId === appt._id;
        return <DataCard key={appt._id} title={appt.doctorId?.name || (appt.department?.isGeneral ? "Doctor to be assigned" : "Unknown doctor")} subtitle={appt.appointmentCode} badge={<StatusBadge status={appt.status} tone={statusTone(appt.status)} />} actions={canCancel(appt) && <button onClick={() => setOpenCancelId(isCancelling ? null : appt._id)} className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                      {isCancelling ? "Never mind" : "Cancel appointment"}
                    </button>}>
                <DataGrid fields={[{
            label: "Appointment ID",
            value: appt.appointmentCode || "—"
          }, {
            label: "Slot",
            value: appt.slotTime ? new Date(appt.slotTime).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            }) : "To be confirmed by front desk"
          }, {
            label: "Department",
            value: appt.department?.name
          }, {
            label: "Doctor",
            value: appt.doctorId?.name || (appt.department?.isGeneral ? "To be assigned" : "—")
          }, ...(appt.status === "booked" && appt.dailyToken != null ? [{
            label: "Your token",
            value: `#${appt.dailyToken}${appt.slotPosition > 1 ? ` (${appt.dailyToken - appt.slotPosition} + ${appt.slotPosition})` : ""}`
          }] : []), ...(appt.status === "booked" && appt.estimatedTime ? [{
            label: "Estimated turn",
            value: `~${new Date(appt.estimatedTime).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit"
            })}`
          }] : [])]} />
                {appt.status === "cancelled" && appt.cancelReason && <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                    <span className="text-slate-500">Cancelled — reason:</span>{" "}
                    <span className="font-medium text-ink">{appt.cancelReason}</span>
                    {appt.cancelNote && <span className="text-slate-500"> · {appt.cancelNote}</span>}
                  </div>}
                {isCancelling && <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                    <label className="space-y-2 block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Reason for cancelling</span>
                      <select value={draft.reason} onChange={e => setCancelDrafts(prev => ({
                ...prev,
                [appt._id]: {
                  ...draft,
                  reason: e.target.value
                }
              }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10">
                        <option value="">Select a reason</option>
                        {cancelReasons.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </label>
                    <textarea value={draft.note} onChange={e => setCancelDrafts(prev => ({
              ...prev,
              [appt._id]: {
                ...draft,
                note: e.target.value
              }
            }))} rows={2} placeholder="Anything else you'd like us to know? (optional)" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                    <button onClick={() => cancelMyAppointment(appt._id)} disabled={!draft.reason} className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                      Confirm cancellation
                    </button>
                  </div>}
              </DataCard>;
      })}
        </div>;
  }
  if (section === "queue") {
    if (!payload) {
      return <EmptyRow>You are not currently in a queue. Join one through the Book Appointment tab.</EmptyRow>;
    }
    return <div className="max-w-md overflow-hidden rounded-2xl border border-mist bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-crimson/10 via-crimson/5 to-white px-8 pt-6 pb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-crimson/80">Your current token</div>
            <button
              onClick={refreshQueueStatus}
              disabled={queueRefreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-crimson/20 bg-white px-3 py-1 text-[11px] font-semibold text-crimson hover:bg-crimson hover:text-white hover:border-crimson transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${queueRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="px-8 pb-8">
            <div className="mt-1 flex h-24 w-24 items-center justify-center rounded-full bg-crimson/10 ring-4 ring-crimson/5 text-4xl font-display font-semibold text-crimson">
              {payload.tokenNumber ?? "—"}
            </div>
            <div className="mt-6 pt-6 border-t border-mist">
              <DataGrid fields={[{
            label: "Department",
            value: payload.department?.name || "N/A"
          }, {
            label: "Position in line",
            value: payload.position ?? "—"
          }, {
            label: "Estimated wait",
            value: `${payload.estimatedWaitTime ?? "—"} min`
          }, {
            label: "Status",
            value: <StatusBadge status={payload.status || "Waiting"} tone={statusTone(payload.status)} />
          }]} />
            </div>
          </div>
        </div>;
  }
  if (section === "bills") {
    if (!payload || payload.length === 0) {
      return <EmptyRow>No bills available yet. They will appear here after a visit is billed.</EmptyRow>;
    }
    return <div className="space-y-4">
          <div className="text-sm text-slate-soft">{payload.length} bill{payload.length !== 1 ? "s" : ""}</div>
          {payload.map(bill => <DataCard key={bill._id} title={bill.patientId?.name || bill.patientId?.phone || "Patient"} subtitle={`${bill.billNumber || "Bill"} · ${bill.appointmentId?.appointmentCode || "Visit"}`} badge={<StatusBadge status={bill.status} tone={statusTone(bill.status)} />} actions={<button onClick={() => downloadBillPdf(bill)} className="inline-flex items-center gap-2 rounded-full border border-crimson/20 bg-crimson/5 px-4 py-2 text-xs font-semibold text-crimson hover:bg-crimson hover:text-white hover:border-crimson transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>}>
              <BillBreakdown bill={bill} />
              <DataGrid fields={[{
          label: "Payment method",
          value: bill.paymentMethod
        }, {
          label: "Generated on",
          value: bill.createdAt ? new Date(bill.createdAt).toLocaleDateString([], {
            dateStyle: "medium"
          }) : "—"
        }]} />
            </DataCard>)}
        </div>;
  }
  if (section === "prescriptions") {
    if (!payload || payload.length === 0) {
      return <EmptyRow>No prescriptions available yet. They will appear here after a doctor visit.</EmptyRow>;
    }
    return <div className="space-y-4">
          <div className="text-sm text-slate-soft">{payload.length} prescription{payload.length !== 1 ? "s" : ""}</div>
          {payload.map(prescription => <DataCard key={prescription._id} title={prescription.doctorId?.name || "Unknown doctor"} subtitle={`Issued ${new Date(prescription.createdAt).toLocaleDateString([], {
        dateStyle: "medium"
      })}`} actions={<button onClick={() => downloadPrescriptionPdf(prescription, user)} className="inline-flex items-center gap-2 rounded-full border border-crimson/20 bg-crimson/5 px-4 py-2 text-xs font-semibold text-crimson hover:bg-crimson hover:text-white hover:border-crimson transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>}>
              <div className="space-y-2.5">
                {prescription.medicines?.map((med, index) => <div key={index} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-mist px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                      <div className="text-xs text-slate-soft mt-0.5">
                        {med.dosage || "Follow doctor's instructions"}{med.quantity ? ` · qty ${med.quantity}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={med.availability || "pending"} tone={statusTone(med.availability)} />
                  </div>)}
              </div>
              {prescription.notes && <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                  <span className="font-semibold text-ink">Doctor's notes: </span>{prescription.notes}
                </div>}
              <PrescriptionFulfillmentChoice
                prescription={prescription}
                onChanged={(updated) => setPayload(payload.map((p) => (p._id === updated._id ? updated : p)))}
              />
            </DataCard>)}
        </div>;
  }
  if (section === "medical-records") {
    if (loading) return <SkeletonList count={3} />;
    if (!myEncounters || myEncounters.length === 0) {
      return <EmptyRow>No clinical records yet. They'll appear here after a doctor records vitals or a diagnosis during a visit.</EmptyRow>;
    }
    return <div className="space-y-4">
          {myEncounters.map(enc => <DataCard key={enc._id} title={new Date(enc.createdAt).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
      })} subtitle={`Dr. ${enc.doctorId?.name || "Unknown"} · ${enc.type === "ipd" ? "Inpatient" : "Outpatient"}`}>
              <div className="space-y-3">
                {enc.chiefComplaint && <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Chief complaint</div>
                    <div className="mt-1 text-sm text-ink">{enc.chiefComplaint}</div>
                  </div>}
                {enc.diagnosis?.length > 0 && <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Diagnosis</div>
                    <div className="mt-1 text-sm text-ink">{enc.diagnosis.map(d => d.description).join(", ")}</div>
                  </div>}
                {enc.vitals && Object.values(enc.vitals).some(Boolean) && <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Vitals</div>
                    <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-ink">
                      {enc.vitals.temperatureF && <div>Temp: {enc.vitals.temperatureF}°F</div>}
                      {enc.vitals.bloodPressure && <div>BP: {enc.vitals.bloodPressure}</div>}
                      {enc.vitals.pulseBpm && <div>Pulse: {enc.vitals.pulseBpm} bpm</div>}
                      {enc.vitals.spo2 && <div>SpO2: {enc.vitals.spo2}%</div>}
                      {enc.vitals.weightKg && <div>Weight: {enc.vitals.weightKg} kg</div>}
                      {enc.vitals.heightCm && <div>Height: {enc.vitals.heightCm} cm</div>}
                    </div>
                  </div>}
                {enc.clinicalNotes && <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Notes</div>
                    <div className="mt-1 text-sm text-slate-soft">{enc.clinicalNotes}</div>
                  </div>}
              </div>
            </DataCard>)}
        </div>;
  }
  if (section === "queries") {
    return <div className="space-y-6">
          <DataCard title="Raise a new ticket">
            <form onSubmit={submitNewTicket} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Subject</span>
                <input type="text" value={newTicketForm.subject} onChange={e => setNewTicketForm(prev => ({
              ...prev,
              subject: e.target.value
            }))} placeholder="e.g. Billing question" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Message</span>
                <input type="text" value={newTicketForm.message} onChange={e => setNewTicketForm(prev => ({
              ...prev,
              message: e.target.value
            }))} placeholder="Describe your query" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Submit
              </button>
            </form>
            {newTicketStatus && <div className="mt-3 text-sm font-medium text-emerald-600">{newTicketStatus}</div>}
          </DataCard>

          {!payload || payload.length === 0 ? <EmptyRow>You haven't raised any tickets yet.</EmptyRow> : <div className="space-y-4">
              {payload.map(query => <DataCard key={query._id} title={query.subject} subtitle={`Ticket ${query.ticketId}`} badge={<StatusBadge status={query.status} tone={statusTone(query.status)} />}>
                  {query.assignedToId?.name && <div className="mb-3 text-xs text-slate-soft">
                      Being handled by <span className="font-semibold text-ink">{query.assignedToId.name}</span>
                      {query.assignedToId.role ? ` (${query.assignedToId.role})` : ""}
                    </div>}
                  {renderTicketThread(query)}
                  {query.status === "closed" ? <div className="mt-3 text-xs text-slate-soft">This ticket is closed.</div> : <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end pt-4 border-t border-mist">
                      <input type="text" value={patientReplyDrafts[query._id] || ""} onChange={e => setPatientReplyDrafts(prev => ({
              ...prev,
              [query._id]: e.target.value
            }))} placeholder="Write a reply..." className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                      <button type="button" onClick={() => patientReplyToTicket(query._id)} disabled={!(patientReplyDrafts[query._id] || "").trim()} className="rounded-full bg-crimson px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-40">
                        Send
                      </button>
                    </div>}
                </DataCard>)}
            </div>}
        </div>;
  }
  if (section === "profile") {
    if (!patientProfile) return <SkeletonForm fields={4} />;
    return <div className="max-w-xl space-y-6">
          {patientProfileMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{patientProfileMessage}</div>}
          <form onSubmit={submitPatientProfileUpdate} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Name</span>
                <input type="text" required value={patientProfileForm.name} onChange={e => setPatientProfileForm(prev => ({
              ...prev,
              name: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Age</span>
                <input type="number" value={patientProfileForm.age} onChange={e => setPatientProfileForm(prev => ({
              ...prev,
              age: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Gender</span>
                <select value={patientProfileForm.gender} onChange={e => setPatientProfileForm(prev => ({
              ...prev,
              gender: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Email</span>
                <input type="email" value={patientProfileForm.email} onChange={e => setPatientProfileForm(prev => ({
              ...prev,
              email: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
              </label>
            </div>
            <button type="submit" disabled={patientProfileSaving} className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60">
              {patientProfileSaving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>;
  }
  if (section === "book") {
    const isGeneralDepartment = Boolean(departments.find((d) => d._id === selectedDepartment)?.isGeneral);

    if (!bookTypeChosen) {
      return <DataCard title="How would you like to consult?" subtitle="Pick one, then continue to choose a department and time.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConsultationType("in-person")}
                className={`flex items-center gap-2.5 rounded-xl border p-4 text-left transition-colors ${consultationType === "in-person" ? "border-crimson bg-crimson/5" : "border-slate-200 bg-white hover:border-crimson/30"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${consultationType === "in-person" ? "bg-crimson text-white" : "bg-mist text-slate-soft"}`}>
                  <Building2 className="w-4.5 h-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">In-person visit</span>
                  <span className="block text-xs text-slate-soft">See the doctor at the hospital</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setConsultationType("online")}
                className={`flex items-center gap-2.5 rounded-xl border p-4 text-left transition-colors ${consultationType === "online" ? "border-crimson bg-crimson/5" : "border-slate-200 bg-white hover:border-crimson/30"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${consultationType === "online" ? "bg-crimson text-white" : "bg-mist text-slate-soft"}`}>
                  <Video className="w-4.5 h-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">Online consultation</span>
                  <span className="block text-xs text-slate-soft">Video call from home</span>
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setBookTypeChosen(true)}
              className="mt-5 w-full rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
            >
              Continue
            </button>
          </DataCard>;
    }

    return <div className="space-y-6">
          <DataCard title="Find a slot" subtitle="You don't choose a doctor — HeartStone assigns you whichever doctor is available for that department and time.">
            <button
              type="button"
              onClick={() => setBookTypeChosen(false)}
              className="mb-5 inline-flex items-center gap-2 rounded-full bg-mist/70 px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-mist transition-colors"
            >
              {consultationType === "online" ? <Video className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              {consultationType === "online" ? "Online consultation" : "In-person visit"}
              <span className="text-slate-soft font-normal">· Change</span>
            </button>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Department</span>
                <select value={selectedDepartment} onChange={e => {
              setSelectedDepartment(e.target.value);
              setSlots([]);
              setBookingStatus("");
              const dept = departments.find(d => d._id === e.target.value);
              if (dept?.isGeneral) setConsultationType("in-person");
            }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10">
                  <option value="">Select department</option>
                  {departments.map(dept => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                </select>
                {isGeneralDepartment && consultationType !== "in-person" && (
                  <span className="block text-xs text-slate-soft">General consultations are always in-person — a doctor and time will be confirmed by our front desk.</span>
                )}
              </label>
              {!isGeneralDepartment && (
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Visit date</span>
                  <input type="date" value={selectedDate} min={getClinicTodayString()} onChange={e => {
              const picked = e.target.value;
              const todayStr = getClinicTodayString();
              if (picked && picked < todayStr) {
                setError("You can't book an appointment for a date that has already passed.");
                return;
              }
              setSelectedDate(picked);
              setSlots([]);
              setBookingStatus("");
              setError("");
            }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                </label>
              )}
            </div>

            {isGeneralDepartment && (
              <p className="mt-4 text-xs text-slate-soft">General consultations aren't tied to a fixed time slot — send a request and our front desk will confirm a doctor and time shortly.</p>
            )}

            {patientProfile?.email ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-mist/70 px-4 py-2.5 text-xs text-slate-soft">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                Confirmation will be sent to <span className="font-semibold text-ink">{patientProfile.email}</span>
              </div> : <label className="mt-4 block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Email address</span>
                <input type="email" value={bookEmailInput} onChange={e => setBookEmailInput(e.target.value)} placeholder="you@example.com" required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                <span className="block text-xs text-slate-soft">We'll send your appointment ID, date and time here — required to book.</span>
              </label>}

            <div className="mt-5 flex flex-wrap items-center gap-4 pt-5 border-t border-mist">
              {isGeneralDepartment ? (
                <button type="button" onClick={bookGeneralAppointment} disabled={!selectedDepartment} className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                  Request consultation
                </button>
              ) : (
                <button type="button" onClick={fetchSlots} disabled={!selectedDepartment || !selectedDate} className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                  Find available slots
                </button>
              )}
              {bookingStatus && <div className="text-sm font-medium text-emerald-600">{bookingStatus}</div>}
            </div>
          </DataCard>

          {!isGeneralDepartment && (slots.length > 0 ? <div>
              <div className="text-sm text-slate-soft mb-3">{slots.length} slot{slots.length !== 1 ? "s" : ""} available</div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {slots.map(slot => <button key={slot.time} onClick={() => confirmAndBookSlot(slot.time)} className="rounded-xl border border-mist bg-white p-4 text-left hover:border-crimson/40 hover:shadow-md transition-all duration-150">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Available slot</div>
                    <div className="mt-1.5 text-lg font-semibold text-ink">{slot.time}</div>
                  </button>)}
              </div>
            </div> : selectedDepartment && selectedDate && !loading && <EmptyRow>No slots available for the selected department and date.</EmptyRow>)}
        </div>;
  }
  return <EmptyState title={current.label} description={current.desc} accent={config.accent === "crimson" ? "crimson" : "navy"} />;
}
