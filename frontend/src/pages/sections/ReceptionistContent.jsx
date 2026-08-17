// Split out of ../Section.jsx (see that file's renderReceptionist usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.

import { BillBreakdown, DataCard, DataGrid, EmptyRow, SectionToolbar, StatusBadge, statusTone } from "../../components/DataCard";
import EmptyState from "../../components/EmptyState";
import { Mail } from "lucide-react";
import SkeletonList from "../../components/SkeletonList";
import { downloadBillPdf } from "../../utils/generateBillPdf";
import { downloadPrescriptionPdf } from "../../utils/generatePrescriptionPdf";

export function renderReceptionistContentImpl({ OTHER_CHARGE_PRESETS, addBillOtherCharge, assignDraft, assignStatus, availableDoctorsForSlot, billApplicationFee, billAppointmentFee, billConsultationFee, billDiscountAmount, billDiscountTooHigh, billGenerateStatus, billLiveTotal, billLookupCode, billLookupError, billLookupResult, billLookupSearched, billMedicineChoices, billMedicinesTotal, billOtherCharges, billPaymentMethod, billsList, bookAppointmentStatus, bookDetails, bookPatientMode, checkSlotAvailability, checkingAvailability, config, current, departments, doctorReassignChoice, doctors, error, existingPatientEmailInput, loading, markBillPaidAction, newPatientForm, onBehalfTicketForm, onBehalfTicketStatus, patientSearchResults, patientSearchStatus, patientSearchTerm, pendingGeneralRequests, receptionAppointments, receptionDateFilter, receptionDoctorFilter, receptionStatusFilter, removeBillOtherCharge, renderAmbulanceRequests, renderIpdWorkspace, renderMessagesBoard, renderProfileContent, renderStaffContent, runBillLookup, searchExistingPatients, section, selectedDoctorForBooking, selectedPatient, setAssignDraft, setBillApplicationFee, setBillAppointmentFee, setBillConsultationFee, setBillDiscountAmount, setBillLookupCode, setBillPaymentMethod, setBookDetails, setBookPatientMode, setDoctorReassignChoice, setExistingPatientEmailInput, setNewPatientForm, setOnBehalfTicketForm, setPatientSearchResults, setPatientSearchTerm, setReceptionDateFilter, setReceptionDoctorFilter, setReceptionStatusFilter, setSelectedDoctorForBooking, setSelectedPatient, submitAssignSlot, submitBookAppointment, submitGeneralBooking, submitGenerateBill, submitOnBehalfTicket, submitReassignDoctor, toggleBillMedicine, updateBillOtherCharge, updateReceptionApptStatus }) {
  if (section === "ambulance-requests") {
    return renderAmbulanceRequests();
  }
  if (section === "messages") {
    return renderMessagesBoard();
  }
  if (section === "book-appointment") {
    const isGeneralBookingDept = Boolean(departments.find(d => d._id === bookDetails.departmentId)?.isGeneral);
    return <div className="space-y-6">
          {bookAppointmentStatus && <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{bookAppointmentStatus}</div>}

          {/* Patient selection */}
          <DataCard title="Patient">
            <div className="mb-4 flex gap-2">
              <button onClick={() => setBookPatientMode("existing")} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${bookPatientMode === "existing" ? "bg-crimson text-white" : "border border-slate-300 bg-white text-ink"}`}>
                Existing patient
              </button>
              <button onClick={() => setBookPatientMode("new")} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${bookPatientMode === "new" ? "bg-crimson text-white" : "border border-slate-300 bg-white text-ink"}`}>
                New patient
              </button>
            </div>

            {bookPatientMode === "existing" ? <div className="space-y-3">
                {selectedPatient ? <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-mist px-4 py-3">
                      <div>
                        <div className="font-semibold text-ink text-sm">{selectedPatient.name}</div>
                        <div className="text-xs text-slate-soft">{selectedPatient.phone}</div>
                      </div>
                      <button onClick={() => {
                setSelectedPatient(null);
                setExistingPatientEmailInput("");
              }} className="text-xs font-semibold text-crimson hover:underline">Change</button>
                    </div>
                    {selectedPatient.email ? <div className="flex items-center gap-2 rounded-xl bg-mist/70 px-4 py-2.5 text-xs text-slate-soft">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        Confirmation will be sent to <span className="font-semibold text-ink">{selectedPatient.email}</span>
                      </div> : <input type="email" placeholder="Patient's email — required, confirmation is sent here *" value={existingPatientEmailInput} onChange={e => setExistingPatientEmailInput(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />}
                  </div> : <>
                    <form onSubmit={searchExistingPatients} className="flex gap-3">
                      <input type="text" placeholder="Search by name, phone, or email" value={patientSearchTerm} onChange={e => setPatientSearchTerm(e.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                      <button type="submit" className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors">
                        Search
                      </button>
                    </form>
                    {patientSearchStatus && <div className="text-sm text-slate-soft">{patientSearchStatus}</div>}
                    {patientSearchResults && patientSearchResults.length > 0 && <div className="space-y-2">
                        {patientSearchResults.map(p => <button key={p._id} onClick={() => {
                setSelectedPatient(p);
                setPatientSearchResults(null);
              }} className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-crimson/40 transition-colors">
                            <div>
                              <div className="font-semibold text-ink text-sm">{p.name}</div>
                              <div className="text-xs text-slate-soft">{p.phone}{p.email ? ` · ${p.email}` : ""}</div>
                            </div>
                          </button>)}
                      </div>}
                  </>}
              </div> : <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Full name *" value={newPatientForm.name} onChange={e => setNewPatientForm(p => ({
            ...p,
            name: e.target.value
          }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                <input type="text" placeholder="Phone *" value={newPatientForm.phone} onChange={e => setNewPatientForm(p => ({
            ...p,
            phone: e.target.value
          }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                <input type="date" placeholder="Date of birth" value={newPatientForm.dob} onChange={e => setNewPatientForm(p => ({
            ...p,
            dob: e.target.value
          }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                <select value={newPatientForm.gender} onChange={e => setNewPatientForm(p => ({
            ...p,
            gender: e.target.value
          }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none">
                  <option value="">Gender...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <input type="email" placeholder="Email *" value={newPatientForm.email} onChange={e => setNewPatientForm(p => ({
            ...p,
            email: e.target.value
          }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                <input type="text" placeholder="Address" value={newPatientForm.address} onChange={e => setNewPatientForm(p => ({
            ...p,
            address: e.target.value
          }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                <input type="text" placeholder="Emergency contact name" value={newPatientForm.emergencyContactName} onChange={e => setNewPatientForm(p => ({
            ...p,
            emergencyContactName: e.target.value
          }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                <input type="text" placeholder="Emergency contact phone" value={newPatientForm.emergencyContactPhone} onChange={e => setNewPatientForm(p => ({
            ...p,
            emergencyContactPhone: e.target.value
          }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
              </div>}
          </DataCard>

          {/* Appointment details */}
          <DataCard title="Appointment details">
            <div className="grid gap-4 sm:grid-cols-3">
              <select value={bookDetails.departmentId} onChange={e => setBookDetails({
            departmentId: e.target.value,
            date: "",
            time: ""
          })} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none">
                <option value="">Department...</option>
                {departments.map(d => <option key={d._id} value={d._id}>
                    {d.name}
                    {d.isGeneral ? " (no time needed)" : ""}
                  </option>)}
              </select>
              {!isGeneralBookingDept && <>
                  <input type="date" value={bookDetails.date} min={new Date().toISOString().slice(0, 10)} onChange={e => setBookDetails(p => ({
              ...p,
              date: e.target.value
            }))} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                  <div className="sm:col-span-3">
                    <input type="time" value={bookDetails.time} onChange={e => setBookDetails(p => ({
                ...p,
                time: e.target.value
              }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                    <div className="mt-2 text-xs text-slate-soft">Leave the time blank to auto-pick the next available slot for the selected date.</div>
                  </div>
                </>}
            </div>

            {isGeneralBookingDept ? <>
                <div className="mt-4 rounded-xl bg-mist/70 p-4 text-sm text-slate-soft leading-relaxed">
                  General consultations don't need a time up front — book the patient in now and assign a
                  doctor + any time later from the Appointments tab.
                </div>
                <button onClick={submitGeneralBooking} className="mt-4 rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                  Book consultation
                </button>
              </> : <button onClick={checkSlotAvailability} disabled={checkingAvailability} className="mt-4 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-light disabled:opacity-50 transition-colors">
                {checkingAvailability ? "Checking..." : "Check availability"}
              </button>}
          </DataCard>

          {/* Doctor availability results */}
          {!isGeneralBookingDept && availableDoctorsForSlot && <DataCard title="Available doctors">
              {availableDoctorsForSlot.length === 0 ? <EmptyRow>No doctor is scheduled for that department/day/time.</EmptyRow> : <div className="space-y-2">
                  {availableDoctorsForSlot.map(d => <label key={d.doctorId} className={`flex items-center justify-between rounded-xl px-4 py-3 ${d.status === "available" ? "bg-mist cursor-pointer" : "bg-slate-50 opacity-60"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="doctor-pick" disabled={d.status !== "available"} checked={selectedDoctorForBooking === d.doctorId} onChange={() => setSelectedDoctorForBooking(d.doctorId)} />
                        <span className="font-semibold text-ink text-sm">{d.name}</span>
                      </div>
                      <StatusBadge status={d.status === "available" ? "Available" : d.status === "on-leave" ? "On leave" : "Conflict"} tone={d.status === "available" ? "success" : d.status === "on-leave" ? "warning" : "danger"} />
                    </label>)}
                </div>}
              <button onClick={submitBookAppointment} className="mt-5 rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Confirm booking
              </button>
            </DataCard>}
        </div>;
  }
  if (section === "ipd") {
    return renderIpdWorkspace("receptionist");
  }
  if (section === "appointments") {
    // Local calendar date, not UTC - .toISOString() converts to UTC first,
    // which can read as a day behind/ahead of the browser's actual local
    // date depending on the time of day, while the <input type="date">
    // right below always operates in local date terms. Building it from
    // local Date components keeps the "(past date)" label consistent with
    // what the date picker itself shows as "today".
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return <div className="space-y-6">
          <SectionToolbar>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Date</span>
              <input type="date" value={receptionDateFilter} onChange={e => setReceptionDateFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs focus:border-crimson/50 focus:outline-none" />
              {receptionDateFilter && <button onClick={() => setReceptionDateFilter("")} className="rounded-full bg-mist px-3 py-2 text-xs font-semibold text-ink hover:bg-slate-200 transition-colors">
                  Reset to today
                </button>}

              <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Doctor</span>
              <select value={receptionDoctorFilter} onChange={e => setReceptionDoctorFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs focus:border-crimson/50 focus:outline-none">
                <option value="">All doctors</option>
                {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>

              <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Status</span>
              <select value={receptionStatusFilter} onChange={e => setReceptionStatusFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs focus:border-crimson/50 focus:outline-none">
                <option value="">All statuses</option>
                {["booked", "completed", "cancelled", "no-show"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="text-sm text-slate-soft">{receptionAppointments.length} appointment{receptionAppointments.length !== 1 ? "s" : ""}</div>
          </SectionToolbar>

          <div className="text-xs text-slate-soft -mt-2">
            {receptionDateFilter ? `Showing appointments for ${new Date(receptionDateFilter).toLocaleDateString([], {
          dateStyle: "medium"
        })}${receptionDateFilter < todayStr ? " (past date)" : ""}.` : "Showing today's appointments by default. Pick a date above — past or future — to look up any other day's appointments."}
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

          {pendingGeneralRequests.length > 0 && <div className="space-y-3">
              <div className="text-section-title text-text-primary flex items-center gap-2">
                General consultation requests awaiting a doctor & time
                <span className="rounded-full bg-crimson/10 px-2.5 py-0.5 text-xs font-semibold text-crimson">
                  {pendingGeneralRequests.length}
                </span>
              </div>
              <div className="space-y-4">
                {pendingGeneralRequests.map(a => {
            const draft = assignDraft[a._id] || {
              doctorId: "",
              date: "",
              time: ""
            };
            const setDraft = patch => setAssignDraft(prev => ({
              ...prev,
              [a._id]: {
                ...draft,
                ...patch
              }
            }));
            return <DataCard key={a._id} title={a.patientId?.name || a.patientId?.phone || "Unknown patient"} subtitle={`${a.appointmentCode} · General Consultation · requested ${new Date(a.createdAt).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            })}`} badge={<StatusBadge status="Awaiting assignment" tone="warning" />}>
                      <div className="flex flex-wrap items-end gap-2 pt-2">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Doctor</span>
                          <select value={draft.doctorId} onChange={e => setDraft({
                    doctorId: e.target.value
                  })} className="block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                            <option value="">Choose doctor...</option>
                            {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Date</span>
                          <input type="date" value={draft.date} onChange={e => setDraft({
                    date: e.target.value
                  })} className="block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Time</span>
                          <input type="time" value={draft.time} onChange={e => setDraft({
                    time: e.target.value
                  })} className="block rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none" />
                        </div>
                        <button onClick={() => submitAssignSlot(a._id)} className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors">
                          Assign
                        </button>
                      </div>
                      {assignStatus[a._id] && <div className="mt-2 text-xs text-slate-soft">{assignStatus[a._id]}</div>}
                    </DataCard>;
          })}
              </div>
            </div>}

          {loading ? <SkeletonList count={3} /> : receptionAppointments.length === 0 ? <EmptyRow>No appointments match this filter.</EmptyRow> : <div className="space-y-4">
              {receptionAppointments.map(a => <DataCard key={a._id} title={a.patientId?.name || a.patientId?.phone || "Unknown patient"} subtitle={`${a.appointmentCode} · ${a.department?.name || "—"}`} badge={<StatusBadge status={a.status} tone={statusTone(a.status)} />}>
                  <DataGrid fields={[{
            label: "Doctor",
            value: a.doctorId?.name || "—"
          }, {
            label: "Slot",
            value: new Date(a.slotTime).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            })
          }, {
            label: "Patient phone",
            value: a.patientId?.phone || "—"
          }]} />
                  <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                    {a.status === "cancelled" ? <span className="text-xs text-slate-soft italic">
                        This appointment was cancelled and can no longer be changed.
                      </span> : <>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Check-in</span>
                        {["booked", "completed", "cancelled", "no-show"].map(s => <button key={s} onClick={() => updateReceptionApptStatus(a._id, s)} disabled={a.status === s} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${a.status === s ? "bg-mist text-slate-400 cursor-not-allowed" : "border border-slate-300 bg-white text-ink hover:border-crimson/40"}`}>
                            {s}
                          </button>)}
                      </>}
                  </div>
                  {a.status !== "cancelled" && <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-mist">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Reassign doctor</span>
                      <select value={doctorReassignChoice[a._id] || ""} onChange={e => setDoctorReassignChoice(prev => ({
              ...prev,
              [a._id]: e.target.value
            }))} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                        <option value="">Choose doctor...</option>
                        {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                      <button onClick={() => submitReassignDoctor(a._id)} disabled={!doctorReassignChoice[a._id]} className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Reassign
                      </button>
                    </div>}
                </DataCard>)}
            </div>}
        </div>;
  }
  if (section === "billing") {
    const medicines = billLookupResult?.prescription?.medicines || [];
    const selectedTotal = medicines.reduce((sum, med, i) => {
      const isBillable = med.isBillable || Number(med.dispensedQuantity || med.quantity) > 0 && Number(med.dispensedPrice || 0) > 0;
      if (isBillable && billMedicineChoices[i] !== false) {
        return sum + (Number(med.dispensedQuantity || med.quantity) || 1);
      }
      return sum;
    }, 0);
    return <div className="space-y-6">
          <DataCard>
            <form onSubmit={runBillLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2 flex-1 min-w-[220px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Appointment ID</span>
                <input type="text" value={billLookupCode} onChange={e => setBillLookupCode(e.target.value)} placeholder="e.g. APT-260723-4F2K" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wide focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Look up
              </button>
            </form>
          </DataCard>

          {billLookupError && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{billLookupError}</div>}

          {billLookupResult && <DataCard title={billLookupResult.appointment.patientId?.name || billLookupResult.appointment.patientId?.phone} subtitle={billLookupResult.appointment.appointmentCode} badge={<StatusBadge status={billLookupResult.appointment.status} tone={statusTone(billLookupResult.appointment.status)} />} actions={billLookupResult.prescription && <button onClick={() => downloadPrescriptionPdf(billLookupResult.prescription, billLookupResult.appointment.patientId, billLookupResult.appointment.doctorId)} className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-navy/5 px-4 py-2 text-xs font-semibold text-navy hover:bg-navy hover:text-white hover:border-navy transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download prescription
                  </button>}>
              {billLookupResult.alreadyBilled ? <div className="space-y-4">
                  <div className="rounded-xl bg-mist p-4 text-sm text-ink">
                    Bill <span className="font-semibold">{billLookupResult.bill?.billNumber}</span> already generated, status:{" "}
                    <StatusBadge status={billLookupResult.bill?.status} tone={statusTone(billLookupResult.bill?.status)} />
                  </div>
                  <BillBreakdown bill={billLookupResult.bill} />
                  {billLookupResult.bill?.status === "unpaid" && <button onClick={() => markBillPaidAction(billLookupResult.bill._id, billPaymentMethod)} className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors">
                      Mark as paid
                    </button>}
                </div> : <div className="space-y-5">
                  {medicines.length === 0 ? <div className="text-sm text-slate-soft">No dispensed medicines for this visit — only the consultation or a flat visit fee applies.</div> : <div className="space-y-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Dispensed medicines ready to bill</span>
                      {medicines.map((med, i) => {
              const isBillable = med.isBillable || Number(med.dispensedQuantity || med.quantity) > 0 && Number(med.dispensedPrice || 0) > 0;
              return <label key={i} className="flex items-center gap-3 rounded-xl bg-mist px-4 py-3">
                            <input type="checkbox" disabled={!isBillable} checked={isBillable ? billMedicineChoices[i] !== false : false} onChange={() => toggleBillMedicine(i)} />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                              <div className="text-xs text-slate-soft mt-0.5">
                                {med.dosage}{med.dispensedQuantity ? ` · qty ${med.dispensedQuantity}` : med.quantity ? ` · qty ${med.quantity}` : ""}
                                {med.dispensedPrice ? <span className="ml-1">· ₹{med.dispensedPrice} each = ₹{med.amount ?? 0}</span> : <span className="ml-1 text-amber-600">· price pending</span>}
                              </div>
                            </div>
                            <StatusBadge status={isBillable ? "ready" : "pending"} tone={isBillable ? "success" : "neutral"} />
                          </label>;
            })}
                    </div>}

                  <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-mist">
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Appointment fee</span>
                      <input type="number" value={billAppointmentFee} onChange={e => setBillAppointmentFee(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Consultation charges</span>
                      <input type="number" value={billConsultationFee} onChange={e => setBillConsultationFee(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Medicine charges</span>
                      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink">
                        ₹{billMedicinesTotal().toLocaleString("en-IN")}
                        <span className="ml-1 text-xs text-slate-soft">(auto)</span>
                      </div>
                    </label>
                    {selectedTotal === 0 && <label className="space-y-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Visit / application fee</span>
                        <input type="number" value={billApplicationFee} onChange={e => setBillApplicationFee(e.target.value)} placeholder="If patient takes no medicine" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                      </label>}
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Discount</span>
                      <input type="number" value={billDiscountAmount} onChange={e => setBillDiscountAmount(e.target.value)} className={`w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none ${billDiscountTooHigh() ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-crimson/50"}`} />
                      {billDiscountTooHigh() && <span className="text-xs text-red-600">Discount cannot exceed the subtotal</span>}
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Payment method</span>
                      <select value={billPaymentMethod} onChange={e => setBillPaymentMethod(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none">
                        {["cash", "card", "upi", "other"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="space-y-2.5 border-t border-mist pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Other charges</span>
                      <button type="button" onClick={addBillOtherCharge} className="rounded-full border border-navy/15 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/5 transition-colors">
                        + Add charge
                      </button>
                    </div>
                    {billOtherCharges.length === 0 ? <div className="text-xs text-slate-soft">No extra charges added.</div> : billOtherCharges.map((charge, i) => <div key={i} className="flex flex-wrap items-center gap-2">
                          <select value={OTHER_CHARGE_PRESETS.includes(charge.type) ? charge.type : "Other"} onChange={e => updateBillOtherCharge(i, "type", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none">
                            {OTHER_CHARGE_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          {(!OTHER_CHARGE_PRESETS.includes(charge.type) || charge.type === "Other") && <input type="text" value={charge.type === "Other" ? "" : charge.type} onChange={e => updateBillOtherCharge(i, "type", e.target.value)} placeholder="Custom label" className="min-w-[140px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />}
                          <input type="number" value={charge.amount} onChange={e => updateBillOtherCharge(i, "amount", e.target.value)} placeholder="Amount" className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                          <button type="button" onClick={() => removeBillOtherCharge(i)} className="rounded-full p-2 text-slate-soft hover:bg-red-50 hover:text-red-600 transition-colors" aria-label="Remove charge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>)}
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-mist px-4 py-3 text-sm">
                    <span className="font-semibold text-ink">Total (live)</span>
                    <span className="font-semibold text-ink">₹{billLiveTotal().toLocaleString("en-IN")}</span>
                  </div>

                  {billGenerateStatus && <div className="text-sm font-medium text-emerald-600">{billGenerateStatus}</div>}

                  <div className="flex flex-wrap gap-3">
                    {billLookupResult?.bill && <button onClick={() => downloadBillPdf(billLookupResult.bill)} className="rounded-full border border-navy/20 bg-navy/5 px-5 py-2.5 text-sm font-semibold text-navy hover:bg-navy hover:text-white hover:border-navy transition-colors">
                        Download PDF
                      </button>}
                    <button onClick={submitGenerateBill} disabled={billDiscountTooHigh()} className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      Generate bill
                    </button>
                  </div>
                </div>}
            </DataCard>}

          {!billLookupResult && billLookupSearched === false && <EmptyRow>Look up an appointment by its ID to bill it.</EmptyRow>}
        </div>;
  }
  if (section === "bills") {
    if (loading) return <SkeletonList count={3} />;
    if (!billsList || billsList.length === 0) return <EmptyRow>No bills generated yet.</EmptyRow>;
    return <div className="space-y-4">
          {billsList.map(b => <DataCard key={b._id} title={b.patientId?.name || b.patientId?.phone || "Unknown patient"} subtitle={`${b.billNumber} · ${b.appointmentId?.appointmentCode || ""}`} badge={<StatusBadge status={b.status} tone={statusTone(b.status)} />}>
              <BillBreakdown bill={b} />
              <DataGrid fields={[{
          label: "Payment method",
          value: b.paymentMethod
        }, {
          label: "Generated by",
          value: b.generatedBy?.name || "—"
        }]} />
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-mist pt-4">
                <button onClick={() => downloadBillPdf(b)} className="rounded-full border border-navy/20 bg-navy/5 px-4 py-2 text-xs font-semibold text-navy hover:bg-navy hover:text-white hover:border-navy transition-colors">
                  Download PDF
                </button>
                {b.status === "unpaid" && <button onClick={() => markBillPaidAction(b._id, b.paymentMethod)} className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors">
                    Mark as paid
                  </button>}
              </div>
            </DataCard>)}
        </div>;
  }
  if (section === "create-query") {
    return <div className="max-w-lg space-y-6">
          {onBehalfTicketStatus && <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{onBehalfTicketStatus}</div>}
          <form onSubmit={submitOnBehalfTicket} className="space-y-5 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Patient phone number</span>
              <input type="text" value={onBehalfTicketForm.patientPhone} onChange={e => setOnBehalfTicketForm(prev => ({
            ...prev,
            patientPhone: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
            </label>
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Subject</span>
              <input type="text" value={onBehalfTicketForm.subject} onChange={e => setOnBehalfTicketForm(prev => ({
            ...prev,
            subject: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
            </label>
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Message</span>
              <textarea value={onBehalfTicketForm.message} onChange={e => setOnBehalfTicketForm(prev => ({
            ...prev,
            message: e.target.value
          }))} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
            </label>
            <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
              Raise ticket
            </button>
          </form>
        </div>;
  }
  if (section === "leave") {
    return renderStaffContent();
  }
  if (section === "leave-history" || section === "tickets") {
    return renderStaffContent();
  }
  if (section === "profile") {
    return renderProfileContent();
  }
  return <EmptyState title={current.label} description={current.desc} accent={config.accent === "crimson" ? "crimson" : "navy"} />;
}
