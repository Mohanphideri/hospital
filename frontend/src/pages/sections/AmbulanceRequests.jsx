// Split out of ../Section.jsx (see that file's renderAmbulance usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.

import { Ambulance } from "lucide-react";
import { DataCard, DataGrid, EmptyRow, StatusBadge } from "../../components/DataCard";
import SkeletonList from "../../components/SkeletonList";

export function renderAmbulanceRequestsImpl({ AMBULANCE_NEXT_ACTIONS, AMBULANCE_STATUS_TONE, error, loading, payload, updateAmbulanceStatus }) {
  if (loading) return <SkeletonList count={3} />;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  if (!payload || payload.length === 0) {
    return <EmptyRow icon={Ambulance} title="No emergency requests yet">
          Ambulance requests submitted from the public website's Emergency button will show up here the moment they come in.
        </EmptyRow>;
  }
  return <div className="space-y-4">
        {payload.map(r => <DataCard key={r._id} title={r.callerName} subtitle={new Date(r.createdAt).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short"
    })} badge={<StatusBadge status={r.status} tone={AMBULANCE_STATUS_TONE[r.status] || "neutral"} />}>
            <DataGrid fields={[{
        label: "Phone",
        value: r.phone
      }, {
        label: "Location",
        value: r.location
      }, ...(r.notes ? [{
        label: "Notes",
        value: r.notes
      }] : []), ...(r.handledBy?.name ? [{
        label: "Handled by",
        value: `${r.handledBy.name} (${r.handledBy.role})`
      }] : [])]} />
            {(AMBULANCE_NEXT_ACTIONS[r.status] || []).length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                {AMBULANCE_NEXT_ACTIONS[r.status].map(action => <button key={action.status} onClick={() => updateAmbulanceStatus(r._id, action.status)} className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${action.cls}`}>
                    {action.label}
                  </button>)}
              </div>}
          </DataCard>)}
      </div>;
}
