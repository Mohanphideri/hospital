

import { CalendarCheck2, CalendarClock, CalendarDays, CheckCircle2, Clock3, Info, XCircle } from "lucide-react";
import { DataCard, DataGrid, EmptyRow, StatusBadge, statusTone } from "../../components/ui/DataCard";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonList from "../../components/ui/SkeletonList";
import { getClinicTodayString } from "../../utils/clinicTime.js";

export function renderStaffContentImpl({ apptLookupError, apptLookupResult, apptLookupSearched, apptLookupValue, config, current, error, leaveApplyStatus, leaveForm, leaveTotalDays, loading, payload, renderIpdWorkspace, renderMessagesBoard, renderProfileContent, renderTicketThread, replyToTicket, runAppointmentLookup, section, setApptLookupValue, setLeaveForm, setTicketReplyDrafts, submitLeaveApplication, ticketReplyDrafts, updateApptLookupStatus }) {
  if (section === "messages") {
    return renderMessagesBoard();
  }
  if (section === "ipd") {
    return renderIpdWorkspace("nurse");
  }
  if (section === "appointment-lookup") {
    return <div className="space-y-6">
          <DataCard>
            <form onSubmit={runAppointmentLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2 flex-1 min-w-[220px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Appointment ID</span>
                <input type="text" value={apptLookupValue} onChange={e => setApptLookupValue(e.target.value)} placeholder="e.g. APT-260723-4F2K" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wide focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <button type="submit" className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Look up
              </button>
            </form>
          </DataCard>

          {apptLookupError && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{apptLookupError}</div>}

          {apptLookupResult ? <DataCard title={apptLookupResult.patientId?.name || apptLookupResult.patientId?.phone || "Unknown patient"} subtitle={apptLookupResult.appointmentCode} badge={<StatusBadge status={apptLookupResult.status} tone={statusTone(apptLookupResult.status)} />}>
              <DataGrid fields={[{
          label: "Doctor",
          value: apptLookupResult.doctorId?.name || "—"
        }, {
          label: "Department",
          value: apptLookupResult.department?.name || "—"
        }, {
          label: "Slot",
          value: new Date(apptLookupResult.slotTime).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
          })
        }, {
          label: "Patient phone",
          value: apptLookupResult.patientId?.phone || "—"
        }]} />
              <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Update status</span>
                {["booked", "in-progress", "completed", "cancelled", "no-show"].map(s => <button key={s} onClick={() => updateApptLookupStatus(s)} disabled={apptLookupResult.status === s} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${apptLookupResult.status === s ? "bg-mist text-slate-400 cursor-not-allowed" : "border border-slate-300 bg-white text-ink hover:border-crimson/40"}`}>
                    {s}
                  </button>)}
              </div>
            </DataCard> : apptLookupSearched === false && <EmptyRow>Enter an appointment ID to view its details and update its status.</EmptyRow>}
        </div>;
  }
  if (section === "leave") {
    const LEAVE_TYPES = [{
      value: "casual",
      label: "Casual leave"
    }, {
      value: "sick",
      label: "Sick leave"
    }, {
      value: "emergency",
      label: "Emergency leave"
    }, {
      value: "night-out",
      label: "Night out"
    }, {
      value: "day-out",
      label: "Day out"
    }, {
      value: "other",
      label: "Other"
    }];
    return <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-section-title text-ink flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-crimson" />
              Apply for leave
            </h2>
            <p className="mt-1 text-sm text-slate-soft">Submit a leave request for admin's review. You'll be able to track its status under Leave history.</p>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Once a leave request is rejected, you can reapply for the same dates starting the next day.
          </div>
          {leaveApplyStatus && <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{leaveApplyStatus}</div>}
          <form onSubmit={submitLeaveApplication} className="space-y-6 rounded-2xl border border-mist bg-white p-6 sm:p-8 shadow-sm">
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Type of leave</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LEAVE_TYPES.map(t => <button key={t.value} type="button" onClick={() => setLeaveForm(prev => ({
              ...prev,
              leaveType: t.value
            }))} className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${leaveForm.leaveType === t.value ? "border-crimson bg-crimson/5 text-crimson" : "border-slate-200 bg-white text-ink hover:border-slate-300"}`}>
                    {t.label}
                  </button>)}
              </div>
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">From date for leave</span>
                <input type="date" value={leaveForm.fromDate} min={getClinicTodayString()} onChange={e => setLeaveForm(prev => ({
              ...prev,
              fromDate: e.target.value
            }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">To date for leave</span>
                <input type="date" value={leaveForm.toDate} min={leaveForm.fromDate || getClinicTodayString()} onChange={e => setLeaveForm(prev => ({
              ...prev,
              toDate: e.target.value
            }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Time from (optional)</span>
                <input type="time" value={leaveForm.timeFrom} onChange={e => setLeaveForm(prev => ({
              ...prev,
              timeFrom: e.target.value
            }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Time to (optional)</span>
                <input type="time" value={leaveForm.timeTo} onChange={e => setLeaveForm(prev => ({
              ...prev,
              timeTo: e.target.value
            }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Total no. of days</span>
                <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-mist px-4 py-3 text-sm font-semibold text-ink">
                  <CalendarDays className="h-4 w-4 text-crimson" />
                  {leaveTotalDays() ? `${leaveTotalDays()} day${leaveTotalDays() !== 1 ? "s" : ""}` : "—"}
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Purpose of leave</span>
                <input type="text" value={leaveForm.reason} onChange={e => setLeaveForm(prev => ({
              ...prev,
              reason: e.target.value
            }))} placeholder="Enter purpose" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-mist/60 px-4 py-3 text-sm text-slate-soft">
              <input type="checkbox" checked={leaveForm.confirmed} onChange={e => setLeaveForm(prev => ({
            ...prev,
            confirmed: e.target.checked
          }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-crimson focus:ring-crimson/40" />
              I confirm the details above are accurate and I take full responsibility for this leave.
            </label>

            <div className="flex items-center gap-3 border-t border-mist pt-5">
              <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
                Submit request
              </button>
              <button type="button" onClick={() => setLeaveForm({
            leaveType: "casual",
            fromDate: "",
            toDate: "",
            timeFrom: "",
            timeTo: "",
            reason: "",
            confirmed: false
          })} className="rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors">
                Reset
              </button>
            </div>
          </form>
        </div>;
  }
  if (section === "leave-history") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    if (!payload || payload.length === 0) {
      return <EmptyRow icon={CalendarClock}>No leave requests submitted yet — apply for leave to see it tracked here.</EmptyRow>;
    }
    const pendingCount = payload.filter(l => l.status === "pending").length;
    const approvedCount = payload.filter(l => l.status === "approved").length;
    const rejectedCount = payload.filter(l => l.status === "rejected").length;
    const statusIcon = status => status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock3;
    const statusIconTone = {
      approved: "text-emerald-600",
      rejected: "text-red-600",
      pending: "text-amber-600"
    };
    return <div className="space-y-5">
          <div>
            <h2 className="text-section-title text-ink flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5 text-crimson" />
              Leave history
            </h2>
            <p className="mt-1 text-sm text-slate-soft">Every leave request you've submitted, and its current status.</p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-inset ring-amber-200">
              <Clock3 className="h-3.5 w-3.5" /> {pendingCount} pending
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> {approvedCount} approved
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-red-700 ring-1 ring-inset ring-red-200">
              <XCircle className="h-3.5 w-3.5" /> {rejectedCount} rejected
            </span>
          </div>

          <div className="space-y-4">
            {payload.map(lr => {
          const Icon = statusIcon(lr.status);
          return <DataCard key={lr._id} title={<span className="inline-flex items-center gap-2">
                      <Icon className={`h-4 w-4 shrink-0 ${statusIconTone[lr.status] || "text-slate-soft"}`} />
                      {new Date(lr.fromDate).toLocaleDateString()} – {new Date(lr.toDate).toLocaleDateString()}
                    </span>} subtitle={lr.leaveType ? lr.leaveType.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase()) : undefined} badge={<StatusBadge status={lr.status} tone={statusTone(lr.status)} />}>
                  {(lr.timeFrom || lr.timeTo) && <div className="mb-2 text-xs text-slate-soft">
                      {lr.timeFrom || "—"} to {lr.timeTo || "—"}
                    </div>}
                  <p className="text-sm text-slate-600 leading-relaxed">{lr.reason}</p>
                  {lr.status === "approved" && lr.reviewedBy?.name && <div className="mt-3 text-xs text-slate-soft">Approved by {lr.reviewedBy.name}{lr.reviewedAt ? ` on ${new Date(lr.reviewedAt).toLocaleDateString()}` : ""}.</div>}
                  {lr.status === "rejected" && lr.rejectionReason && <div className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">
                      Rejected — reason: {lr.rejectionReason}. You can reapply for these dates starting the next day.
                    </div>}
                </DataCard>;
        })}
          </div>
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
  if (section === "profile") {
    return renderProfileContent();
  }
  return <EmptyState title={current.label} description={current.desc} accent={config.accent === "crimson" ? "crimson" : "navy"} />;
}
