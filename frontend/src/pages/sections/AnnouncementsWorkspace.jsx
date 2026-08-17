// Split out of ../Section.jsx (see that file's renderAnnouncements usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.

import { DataCard, EmptyRow, StatusBadge } from "../../components/DataCard";
import { Megaphone } from "lucide-react";
import SkeletonList from "../../components/SkeletonList";

export function renderAnnouncementsWorkspaceImpl({ announcementStatus, announcements, deleteAnnouncementAction, loading, newAnnouncementForm, setNewAnnouncementForm, submitAnnouncement, toggleAnnouncementAction }) {
  return (
<div className="space-y-6">
      {announcementStatus && <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{announcementStatus}</div>}
      <form onSubmit={submitAnnouncement} className="grid gap-4 sm:grid-cols-2 items-end rounded-2xl border border-mist bg-white p-6 shadow-sm">
        <label className="space-y-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Title</span>
          <input type="text" value={newAnnouncementForm.title} onChange={e => setNewAnnouncementForm(prev => ({
        ...prev,
        title: e.target.value
      }))} placeholder="e.g. Free OPD consultations" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Message</span>
          <textarea value={newAnnouncementForm.message} onChange={e => setNewAnnouncementForm(prev => ({
        ...prev,
        message: e.target.value
      }))} placeholder="e.g. Free OPD consultations for all departments this Saturday, 9am-1pm. No appointment needed." rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Event date (optional)</span>
          <input type="date" value={newAnnouncementForm.eventDate} onChange={e => setNewAnnouncementForm(prev => ({
        ...prev,
        eventDate: e.target.value
      }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
        </label>
        <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
          Post announcement
        </button>
      </form>

      {loading ? <SkeletonList count={3} /> : announcements.length === 0 ? <EmptyRow icon={Megaphone} title="No announcements">No announcements yet.</EmptyRow> : <div className="space-y-4">
          {announcements.map(a => <DataCard key={a._id} title={a.title} subtitle={a.eventDate ? new Date(a.eventDate).toLocaleDateString([], {
      dateStyle: "medium"
    }) : "No specific date"} badge={<StatusBadge status={a.isActive ? "active" : "hidden"} tone={a.isActive ? "success" : "neutral"} />} actions={<div className="flex gap-2">
                  <button onClick={() => toggleAnnouncementAction(a._id)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-ink hover:bg-mist transition-colors">
                    {a.isActive ? "Take down" : "Republish"}
                  </button>
                  <button onClick={() => deleteAnnouncementAction(a._id)} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors">
                    Remove
                  </button>
                </div>}>
              <p className="text-sm text-ink whitespace-pre-wrap">{a.message}</p>
            </DataCard>)}
        </div>}
    </div>
);
}
