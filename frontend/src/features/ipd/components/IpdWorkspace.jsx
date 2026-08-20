

import { BedDouble } from "lucide-react";
import { DataCard, DataGrid, EmptyRow, StatusBadge, statusTone } from "../../../components/ui/DataCard";
import SkeletonList from "../../../components/ui/SkeletonList";
import { can } from "../../../utils/permissions.js";

export function renderIpdWorkspaceImpl(role, { admissionStatusFilter, admissions, admitForm, admitStatus, departments, dischargeDrafts, doctors, ipdActionStatus, ipdBillDrafts, loading, newBedForm, newBedStatus, newWardForm, newWardStatus, setAdmissionStatusFilter, setAdmitForm, setDischargeDrafts, setIpdBillDrafts, setNewBedForm, setNewWardForm, setTransferChoice, submitAddBed, submitAdmitPatient, submitCreateWard, submitDeleteBed, submitDeleteWard, submitDischarge, submitIpdBill, submitSetBedStatus, submitTransferBed, transferChoice, wards }) {
  
  
  const me = { role };
  const allBeds = wards.flatMap(w => w.beds.map(b => ({
    ...b,
    wardId: w._id,
    wardName: w.name
  })));
  const vacantByWard = wardId => wards.find(w => w._id === wardId)?.beds.filter(b => b.status === "vacant") || [];
  return <div className="space-y-8">
        {ipdActionStatus && <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{ipdActionStatus}</div>}

        {}
        {can(me, 'create', 'ipdWard') && <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Create a ward</div>
            {newWardStatus && <div className="mb-3 text-sm font-medium text-ink">{newWardStatus}</div>}
            <form onSubmit={submitCreateWard} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end rounded-2xl border border-mist bg-white p-6 shadow-sm">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Ward name</span>
                <input type="text" value={newWardForm.name} onChange={e => setNewWardForm(prev => ({
            ...prev,
            name: e.target.value
          }))} placeholder="e.g. ICU - East Wing" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Type</span>
                <select value={newWardForm.type} onChange={e => setNewWardForm(prev => ({
            ...prev,
            type: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                  <option value="general">General</option>
                  <option value="icu">ICU</option>
                  <option value="private">Private</option>
                  <option value="semi-private">Semi-private</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Floor</span>
                <input type="text" value={newWardForm.floor} onChange={e => setNewWardForm(prev => ({
            ...prev,
            floor: e.target.value
          }))} placeholder="e.g. 2nd floor" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Department (optional)</span>
                <select value={newWardForm.departmentId} onChange={e => setNewWardForm(prev => ({
            ...prev,
            departmentId: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                  <option value="">None</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors sm:col-span-2 lg:col-span-1">
                Create ward
              </button>
            </form>
          </div>}

        {}
        {can(me, 'create', 'ipdBed') && wards.length > 0 && <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Add a bed</div>
            {newBedStatus && <div className="mb-3 text-sm font-medium text-ink">{newBedStatus}</div>}
            <form onSubmit={submitAddBed} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end rounded-2xl border border-mist bg-white p-6 shadow-sm">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Ward</span>
                <select value={newBedForm.wardId} onChange={e => setNewBedForm(prev => ({
            ...prev,
            wardId: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                  <option value="">Choose ward...</option>
                  {wards.map(w => <option key={w._id} value={w._id}>{w.name} ({w.type})</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Bed number</span>
                <input type="text" value={newBedForm.bedNumber} onChange={e => setNewBedForm(prev => ({
            ...prev,
            bedNumber: e.target.value
          }))} placeholder="e.g. B-12" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Daily charge (₹)</span>
                <input type="number" value={newBedForm.dailyCharge} onChange={e => setNewBedForm(prev => ({
            ...prev,
            dailyCharge: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Care level</span>
                <select value={newBedForm.careLevel} onChange={e => setNewBedForm(prev => ({
            ...prev,
            careLevel: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                  <option value="normal">Normal</option>
                  <option value="critical">Critical (more intensive)</option>
                </select>
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Add bed
              </button>
            </form>
          </div>}

        {}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Wards & beds</div>
          {loading ? <SkeletonList count={3} /> : wards.length === 0 ? <EmptyRow icon={BedDouble} title="No wards yet">No wards have been set up yet.</EmptyRow> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {wards.map(w => <DataCard key={w._id} title={w.name} subtitle={`${w.type} · Floor ${w.floor || "—"}`} actions={can(me, 'delete', 'ipdWard') && w.beds.length === 0 ? <button onClick={() => submitDeleteWard(w._id)} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors">
                        Remove ward
                      </button> : null}>
                  {w.beds.length > 0 && (() => {
            const occupied = w.beds.filter(b => b.status === "occupied").length;
            const pct = Math.round(occupied / w.beds.length * 100);
            return <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-soft mb-1">
                          <span>Occupancy</span>
                          <span>{occupied}/{w.beds.length} beds · {pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-mist overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-crimson" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{
                  width: `${pct}%`
                }} />
                        </div>
                      </div>;
          })()}
                  <div className="flex flex-wrap gap-2">
                    {w.beds.length === 0 && <span className="text-xs text-slate-soft">No beds added yet.</span>}
                    {w.beds.map(b => <span key={b._id} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${b.status === "vacant" ? "bg-emerald-50 text-emerald-700" : b.status === "occupied" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                        {b.bedNumber} · {b.status}
                        {w.type === "icu" && <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                            {b.careLevel === "critical" ? "critical" : "normal"}
                          </span>}
                        {can(me, 'update', 'ipdBedStatus') && b.status !== "occupied" && <button type="button" onClick={() => submitSetBedStatus(w._id, b._id, b.status === "maintenance" ? "vacant" : "maintenance")} className="ml-1 underline decoration-dotted underline-offset-2 hover:opacity-70" title={b.status === "maintenance" ? "Mark vacant" : "Mark under maintenance"}>
                            {b.status === "maintenance" ? "restore" : "maintain"}
                          </button>}
                        {can(me, 'delete', 'ipdBed') && b.status === "vacant" && <button type="button" onClick={() => submitDeleteBed(w._id, b._id)} className="ml-1 text-red-600 hover:opacity-70" title="Remove bed">
                            ✕
                          </button>}
                      </span>)}
                  </div>
                </DataCard>)}
            </div>}
        </div>

        {}
        {can(me, 'admit', 'ipdPatient') && <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mb-3">Admit a patient</div>
            {admitStatus && <div className="mb-3 text-sm font-medium text-ink">{admitStatus}</div>}
            <form onSubmit={submitAdmitPatient} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Patient phone number</span>
                  <input type="text" value={admitForm.patientPhone} onChange={e => setAdmitForm(prev => ({
              ...prev,
              patientPhone: e.target.value
            }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Admitting doctor</span>
                  <select value={admitForm.admittingDoctorId} onChange={e => setAdmitForm(prev => ({
              ...prev,
              admittingDoctorId: e.target.value
            }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                    <option value="">Choose doctor...</option>
                    {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Ward</span>
                  <select value={admitForm.wardId} onChange={e => setAdmitForm(prev => ({
              ...prev,
              wardId: e.target.value,
              bedId: ""
            }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                    <option value="">Choose ward...</option>
                    {wards.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Bed</span>
                  <select value={admitForm.bedId} onChange={e => setAdmitForm(prev => ({
              ...prev,
              bedId: e.target.value
            }))} disabled={!admitForm.wardId} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none disabled:opacity-50">
                    <option value="">Choose vacant bed...</option>
                    {vacantByWard(admitForm.wardId).map(b => <option key={b._id} value={b._id}>
                        {b.bedNumber} (₹{b.dailyCharge}/day{b.careLevel === "critical" ? " · critical care" : ""})
                      </option>)}
                  </select>
                </label>
              </div>
              <label className="space-y-2 block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Reason for admission</span>
                <input type="text" value={admitForm.reasonForAdmission} onChange={e => setAdmitForm(prev => ({
            ...prev,
            reasonForAdmission: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
              </label>
              <label className="space-y-2 block">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Diagnosis (optional)</span>
                <input type="text" value={admitForm.diagnosis} onChange={e => setAdmitForm(prev => ({
            ...prev,
            diagnosis: e.target.value
          }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Admit patient
              </button>
            </form>
          </div>}

        {}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Admissions</span>
            <select value={admissionStatusFilter} onChange={e => setAdmissionStatusFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs focus:border-crimson/50 focus:outline-none">
              <option value="admitted">Currently admitted</option>
              <option value="discharged">Discharged</option>
              <option value="">All</option>
            </select>
          </div>

          {loading ? <SkeletonList count={3} /> : admissions.length === 0 ? <EmptyRow>No admissions match this filter.</EmptyRow> : <div className="space-y-4">
              {admissions.map(a => <DataCard key={a._id} title={a.patientId?.name || a.patientId?.phone || "Unknown patient"} subtitle={`${a.wardId?.name || "—"} · Dr. ${a.admittingDoctorId?.name || "—"}`} badge={<StatusBadge status={a.status} tone={statusTone(a.status)} />}>
                  <DataGrid fields={[{
            label: "Reason",
            value: a.reasonForAdmission
          }, {
            label: "Diagnosis",
            value: a.diagnosis || "—"
          }, {
            label: "Admitted",
            value: new Date(a.admissionDate).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            })
          }, ...(a.dischargeDate ? [{
            label: "Discharged",
            value: new Date(a.dischargeDate).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            })
          }] : [])]} />

                  {a.status === "admitted" && can(me, 'transfer', 'ipdPatient') && <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Transfer to</span>
                      <select value={transferChoice[a._id]?.wardId || ""} onChange={e => setTransferChoice(prev => ({
              ...prev,
              [a._id]: {
                wardId: e.target.value,
                bedId: ""
              }
            }))} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                        <option value="">Ward...</option>
                        {wards.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                      </select>
                      <select value={transferChoice[a._id]?.bedId || ""} onChange={e => setTransferChoice(prev => ({
              ...prev,
              [a._id]: {
                ...prev[a._id],
                bedId: e.target.value
              }
            }))} disabled={!transferChoice[a._id]?.wardId} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none disabled:opacity-50">
                        <option value="">Bed...</option>
                        {vacantByWard(transferChoice[a._id]?.wardId).map(b => <option key={b._id} value={b._id}>
                            {b.bedNumber}{b.careLevel === "critical" ? " · critical care" : ""}
                          </option>)}
                      </select>
                      <button onClick={() => submitTransferBed(a._id)} disabled={!transferChoice[a._id]?.bedId} className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light disabled:opacity-50 transition-colors">
                        Transfer
                      </button>
                    </div>}

                  {a.status === "admitted" && can(me, 'discharge', 'ipdPatient') && <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Discharge</span>
                      <textarea placeholder="Discharge summary" value={dischargeDrafts[a._id]?.summary || ""} onChange={e => setDischargeDrafts(prev => ({
              ...prev,
              [a._id]: {
                ...prev[a._id],
                summary: e.target.value
              }
            }))} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
                      <textarea placeholder="Follow-up instructions (optional)" value={dischargeDrafts[a._id]?.followUpInstructions || ""} onChange={e => setDischargeDrafts(prev => ({
              ...prev,
              [a._id]: {
                ...prev[a._id],
                followUpInstructions: e.target.value
              }
            }))} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
                      <button onClick={() => submitDischarge(a._id)} className="rounded-full bg-crimson px-5 py-2 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors">
                        Discharge patient
                      </button>
                    </div>}

                  {a.status === "discharged" && can(me, 'bill', 'ipdDischarge') && <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Generate stay bill</span>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <input type="number" placeholder="Consultation fee" value={ipdBillDrafts[a._id]?.consultationFee || ""} onChange={e => setIpdBillDrafts(prev => ({
                ...prev,
                [a._id]: {
                  ...prev[a._id],
                  consultationFee: e.target.value
                }
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                        <input type="number" placeholder="Other charges" value={ipdBillDrafts[a._id]?.otherCharges || ""} onChange={e => setIpdBillDrafts(prev => ({
                ...prev,
                [a._id]: {
                  ...prev[a._id],
                  otherCharges: e.target.value
                }
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                        <select value={ipdBillDrafts[a._id]?.paymentMethod || "cash"} onChange={e => setIpdBillDrafts(prev => ({
                ...prev,
                [a._id]: {
                  ...prev[a._id],
                  paymentMethod: e.target.value
                }
              }))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none">
                          {["cash", "card", "upi", "other"].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <button onClick={() => submitIpdBill(a._id)} className="rounded-full bg-crimson px-5 py-2 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors">
                        Generate bill
                      </button>
                    </div>}
                </DataCard>)}
            </div>}
        </div>
      </div>;
}
