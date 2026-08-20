

import { DataCard, EmptyRow, SectionToolbar, StatusBadge, statusTone } from "../../components/ui/DataCard";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonList from "../../components/ui/SkeletonList";
import { downloadPrescriptionPdf } from "../../utils/generatePrescriptionPdf";
import AppointmentLookupWidget from "../../components/ui/AppointmentLookupWidget.jsx";

export function renderPharmacistContentImpl({ actionMessage, addMedicineForm, config, current, deleteMedicineRow, error, expiringBatches, getBatchDraft, getDispenseDraft, linkedMedicineChoice, loading, lookupResults, lookupSearched, lookupType, lookupValue, medicineCatalog, payload, renderMessagesBoard, renderTicketThread, replyToTicket, runLookup, saveDispenseDraft, section, setAddMedicineForm, setBatchDraft, setDispenseDraft, setLinkedMedicineChoice, setLookupType, setLookupValue, setTicketReplyDrafts, submitAddMedicine, submitRestock, ticketReplyDrafts }) {
  if (section === "messages") {
    return renderMessagesBoard();
  }
  if (section === "lookup") {
    return <div className="space-y-6">
          <DataCard title="Find Prescription / Appointment">
            <form onSubmit={runLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Search by</span>
                <select value={lookupType} onChange={e => setLookupType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                  <option value="appointment">Appointment ID</option>
                  <option value="patient">Patient name</option>
                </select>
              </label>
              <label className="space-y-2 flex-1 min-w-[200px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">{lookupType === "appointment" ? "Appointment ID" : "Patient name"}</span>
                <input type="text" value={lookupValue} onChange={e => setLookupValue(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Search
              </button>
            </form>
            <div className="mt-4 border-t border-mist pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Or search by the last 4 characters</span>
              <div className="mt-2">
                <AppointmentLookupWidget
                  onFound={(appt) => {
                    setLookupType("appointment");
                    setLookupValue(appt.appointmentCode);
                    runLookup(null, appt.appointmentCode);
                  }}
                />
              </div>
            </div>
          </DataCard>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

          {loading ? <div className="text-gray-600">Searching...</div> : lookupSearched && (!lookupResults || lookupResults.length === 0) ? <EmptyRow>No matching prescriptions found.</EmptyRow> : lookupResults && lookupResults.length > 0 ? <div className="space-y-4">
              {lookupResults.map(rx => <DataCard key={rx._id} title={rx.patientId?.name || rx.patientId?.phone || "Unknown patient"} subtitle={`Prescribed by ${rx.doctorId?.name || "Unknown doctor"}`} actions={<button onClick={() => downloadPrescriptionPdf(rx)} className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-navy/5 px-4 py-2 text-xs font-semibold text-navy hover:bg-navy hover:text-white hover:border-navy transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download PDF
                    </button>}>
                  <div className="space-y-2.5">
                    {rx.medicines?.map((med, i) => {
              const draft = getDispenseDraft(rx._id, i);
              const rowStatus = String(draft.status || (med.dispensedQuantity > 0 ? "dispensed" : med.dispenseStatus || "pending")).toLowerCase();
              const rowQuantity = draft.quantity === "" ? String(med.dispensedQuantity || 0) : draft.quantity;
              const rowPrice = draft.price === "" ? String(med.dispensedPrice || 0) : draft.price;
              const locked = med.dispenseStatus === "dispensed";
              const linkedId = linkedMedicineChoice[`${rx._id}:${i}`] || "";
              const matched = medicineCatalog.find(m => m._id === linkedId) || null;
              const inStock = matched ? Number(matched.totalQuantity || 0) : 0;
              const isAvailable = !locked && !!matched && inStock > 0;
              const isUnavailable = !locked && !isAvailable;
              return <div key={i} className="rounded-xl bg-mist px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                              <div className="text-xs text-slate-soft mt-0.5">{med.dosage}{med.quantity ? ` · prescribed ${med.quantity}` : ""}</div>
                            </div>
                            {locked ? <StatusBadge status="Dispensed" tone="success" /> : isAvailable ? <StatusBadge status={`In stock · ${inStock} ${matched.unit}`} tone="success" /> : <StatusBadge status="Not available" tone="danger" />}
                          </div>

                          {!locked && isAvailable && <div className="mt-3 flex flex-wrap items-center gap-3">
                              <div className="text-xs text-slate-soft">Auto-matched to <span className="font-medium text-ink">{matched.name}</span> at ₹{matched.nextBatch?.price ?? "—"}/{matched.unit}</div>
                              <button type="button" onClick={() => saveDispenseDraft(rx, i, med)} className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                                Mark as dispensed
                              </button>
                            </div>}

                          {!locked && isUnavailable && <div className="mt-3 text-xs text-red-600">
                              No matching stock found{med.quantity ? ` for the prescribed quantity (${med.quantity})` : ""}. Link it to a catalog item manually below if it's just a naming mismatch, or restock it first.
                            </div>}

                          {!locked && <details className="mt-3 group">
                              <summary className="cursor-pointer text-xs font-semibold text-navy/70 hover:text-navy select-none">
                                {isAvailable ? "Adjust manually (partial dispense, different item, etc.)" : "Link to stock item manually"}
                              </summary>
                              <div className="mt-3 space-y-3">
                                <select value={linkedId} onChange={e => setLinkedMedicineChoice(prev => ({
                        ...prev,
                        [`${rx._id}:${i}`]: e.target.value
                      }))} className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                                  <option value="">Link to stock item...</option>
                                  {medicineCatalog.map(m => <option key={m._id} value={m._id}>{m.name} ({m.totalQuantity} {m.unit})</option>)}
                                </select>
                                <div className="grid gap-3 md:grid-cols-[1.1fr_0.7fr_0.7fr_auto]">
                                  <select value={rowStatus} onChange={e => setDispenseDraft(rx._id, i, "status", e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                                    <option value="pending">Pending</option>
                                    <option value="dispensed">Dispensed</option>
                                    <option value="partially-dispensed">Partially dispensed</option>
                                    <option value="not-dispensed">Not dispensed</option>
                                  </select>
                                  <input type="number" min="0" value={rowQuantity} onChange={e => setDispenseDraft(rx._id, i, "quantity", e.target.value)} placeholder="Qty" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none" />
                                  <input type="number" min="0" value={rowPrice} onChange={e => setDispenseDraft(rx._id, i, "price", e.target.value)} placeholder="Price" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none" />
                                  <button type="button" onClick={() => saveDispenseDraft(rx, i, med)} className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition-colors">
                                    Save
                                  </button>
                                </div>
                              </div>
                            </details>}
                        </div>;
            })}
                  </div>
                  {rx.notes && <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                      <span className="font-semibold text-ink">Doctor's notes: </span>{rx.notes}
                    </div>}
                </DataCard>)}
            </div> : <EmptyRow>Search by appointment ID or patient name to check a prescription against stock.</EmptyRow>}
        </div>;
  }
  if (section === "inventory") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    if (!payload || payload.length === 0) {
      return <EmptyRow>No medicines in inventory yet. Add one from the Add medicine tab.</EmptyRow>;
    }
    return <div className="space-y-4">
          <SectionToolbar>
            <div className="text-sm text-slate-soft">{payload.length} medicine{payload.length !== 1 ? "s" : ""} in catalog</div>
            {actionMessage && <div className="text-sm font-medium text-emerald-600">{actionMessage}</div>}
          </SectionToolbar>
          {payload.map(med => {
        const draft = getBatchDraft(med._id);
        return <DataCard key={med._id} title={med.name} subtitle={`${med.totalQuantity} ${med.unit} in stock across ${med.batches?.length || 0} batch${med.batches?.length !== 1 ? "es" : ""}`} badge={<StatusBadge status={med.isAvailable ? "Available" : "Unavailable"} tone={med.isAvailable ? "success" : "danger"} />}>
                {med.batches?.length > 0 && <div className="space-y-2 mb-4">
                    {med.batches.map(b => {
              const expired = new Date(b.expiryDate) < new Date();
              return <div key={b._id} className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-mist px-4 py-2.5 text-sm">
                          <div className="font-semibold text-ink">{b.batchNumber}</div>
                          <div className="text-slate-soft">{b.quantity} {med.unit}</div>
                          <div className="text-slate-soft">₹{b.price}</div>
                          <div className={expired ? "font-semibold text-red-600" : "text-slate-soft"}>
                            {new Date(b.expiryDate).toLocaleDateString()}{expired ? " (expired)" : ""}
                          </div>
                        </div>;
            })}
                  </div>}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 pt-4 border-t border-mist">
                  <input type="text" placeholder="Batch #" value={draft.batchNumber} onChange={e => setBatchDraft(med._id, "batchNumber", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  <input type="number" placeholder="Quantity" value={draft.quantity} onChange={e => setBatchDraft(med._id, "quantity", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  <input type="number" placeholder="Price" value={draft.price} onChange={e => setBatchDraft(med._id, "price", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                  <input type="date" value={draft.expiryDate} onChange={e => setBatchDraft(med._id, "expiryDate", e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none" />
                </div>
                <div className="mt-4 flex gap-2 pt-4 border-t border-mist">
                  <button onClick={() => submitRestock(med._id)} className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition-colors">
                    Add batch (restock)
                  </button>
                  <button onClick={() => deleteMedicineRow(med._id)} className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                    Delete medicine
                  </button>
                </div>
              </DataCard>;
      })}
        </div>;
  }
  if (section === "expiry-alerts") {
    if (loading) return <SkeletonList count={3} />;
    if (!expiringBatches) return <EmptyRow>No data yet.</EmptyRow>;
    const {
      expiring,
      expired,
      windowDays
    } = expiringBatches;
    return <div className="space-y-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-3">Already expired ({expired.length})</div>
            {expired.length === 0 ? <EmptyRow>No expired stock sitting in inventory.</EmptyRow> : <div className="space-y-3">
                {expired.map((item, i) => <DataCard key={i} title={item.medicineName} subtitle={`Batch ${item.batch.batchNumber}`}>
                    <div className="text-sm text-red-600 font-medium">
                      {item.batch.quantity} {item.unit} · expired {new Date(item.batch.expiryDate).toLocaleDateString()}
                    </div>
                  </DataCard>)}
              </div>}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-3">Expiring within {windowDays} days ({expiring.length})</div>
            {expiring.length === 0 ? <EmptyRow>Nothing expiring soon.</EmptyRow> : <div className="space-y-3">
                {expiring.map((item, i) => <DataCard key={i} title={item.medicineName} subtitle={`Batch ${item.batch.batchNumber}`}>
                    <div className="text-sm text-amber-600 font-medium">
                      {item.batch.quantity} {item.unit} · expires {new Date(item.batch.expiryDate).toLocaleDateString()}
                    </div>
                  </DataCard>)}
              </div>}
          </div>
        </div>;
  }
  if (section === "add-medicine") {
    return <div className="max-w-xl space-y-6">
          {actionMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{actionMessage}</div>}
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
          <form onSubmit={submitAddMedicine} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Medicine name *</span>
                <input type="text" value={addMedicineForm.name} onChange={e => setAddMedicineForm(prev => ({
              ...prev,
              name: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" required />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Unit</span>
                <select value={addMedicineForm.unit} onChange={e => setAddMedicineForm(prev => ({
              ...prev,
              unit: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  {["tablets", "ml", "strips", "vials", "capsules"].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Batch number *</span>
                <input type="text" value={addMedicineForm.batchNumber} onChange={e => setAddMedicineForm(prev => ({
              ...prev,
              batchNumber: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" required />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Quantity *</span>
                <input type="number" min="0" value={addMedicineForm.quantity} onChange={e => setAddMedicineForm(prev => ({
              ...prev,
              quantity: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" required />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Price *</span>
                <input type="number" min="0" value={addMedicineForm.price} onChange={e => setAddMedicineForm(prev => ({
              ...prev,
              price: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" required />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Expiry date *</span>
                <input type="date" value={addMedicineForm.expiryDate} onChange={e => setAddMedicineForm(prev => ({
              ...prev,
              expiryDate: e.target.value
            }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" required />
              </label>
            </div>
            <button type="submit" disabled={loading} className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Adding..." : "Add medicine"}
            </button>
          </form>
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
  return <EmptyState title={current.label} description={current.desc} accent={config.accent === "crimson" ? "crimson" : "navy"} />;
}
