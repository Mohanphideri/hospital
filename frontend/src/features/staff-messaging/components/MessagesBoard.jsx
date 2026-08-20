

import { EmptyRow } from "../../../components/ui/DataCard";
import SkeletonList from "../../../components/ui/SkeletonList";

export function renderMessagesBoardImpl({ config, deleteStaffMessageAction, loading, messageStatus, newMessageText, setNewMessageText, staffMessages, submitStaffMessage, user }) {
  return (
<div className="space-y-6">
      {messageStatus && <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{messageStatus}</div>}
      <form onSubmit={submitStaffMessage} className="space-y-3 rounded-2xl border border-mist bg-white p-6 shadow-sm">
        <label className="space-y-2 block">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Post a message to the whole team</span>
          <textarea value={newMessageText} onChange={e => setNewMessageText(e.target.value)} placeholder="e.g. OT-2 will be closed for maintenance this afternoon." rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
        </label>
        <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
          Post message
        </button>
      </form>

      {loading ? <SkeletonList count={3} /> : staffMessages.length === 0 ? <EmptyRow>No messages yet — be the first to post one.</EmptyRow> : <div className="space-y-3">
          {staffMessages.map(m => <div key={m._id} className="rounded-2xl border border-mist bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {m.author?.name || "Unknown"}
                    {m.author?.role && <span className="ml-2 text-xs font-medium uppercase tracking-wide text-slate-soft/70">{m.author.role}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-soft">{new Date(m.createdAt).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            })}</div>
                </div>
                {(m.author?._id === user?._id || config.role === "admin") && <button onClick={() => deleteStaffMessageAction(m._id)} className="text-xs font-semibold text-red-600 hover:underline">
                    Remove
                  </button>}
              </div>
              <p className="mt-3 text-sm text-ink whitespace-pre-wrap">{m.message}</p>
            </div>)}
        </div>}
    </div>
);
}
