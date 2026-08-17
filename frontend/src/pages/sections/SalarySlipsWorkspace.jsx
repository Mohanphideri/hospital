// Split out of ../Section.jsx (see that file's renderSalarySlips usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.

import { DataCard, DataGrid, EmptyRow, StatusBadge, statusTone } from "../../components/DataCard";
import SkeletonList from "../../components/SkeletonList";

export function renderSalarySlipsWorkspaceImpl({ loading, markSalaryPaidAction, salaryForm, salaryFormStatus, salarySlips, salaryStaffList, setSalaryForm, submitSalarySlip }) {
  return (
<div className="space-y-6">
      {salaryFormStatus && <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{salaryFormStatus}</div>}
      <form onSubmit={submitSalarySlip} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Staff member</span>
            <select value={salaryForm.staffId} onChange={e => {
          const staffId = e.target.value;
          const selectedStaff = salaryStaffList.find(s => s._id === staffId);
          setSalaryForm(prev => ({
            ...prev,
            staffId,
            // Pre-fill from the staff member's on-file monthly salary so the
            // admin isn't retyping it every time - still editable below.
            basicSalary: selectedStaff?.salary != null ? String(selectedStaff.salary) : prev.basicSalary
          }));
        }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
              <option value="">Choose staff...</option>
              {salaryStaffList.map(s => <option key={s._id} value={s._id}>{s.name} · {s.role}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Month</span>
            <select value={salaryForm.month} onChange={e => setSalaryForm(prev => ({
          ...prev,
          month: e.target.value
        }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
              {Array.from({
            length: 12
          }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Year</span>
            <input type="number" value={salaryForm.year} onChange={e => setSalaryForm(prev => ({
          ...prev,
          year: e.target.value
        }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Basic salary</span>
            <input type="number" value={salaryForm.basicSalary} onChange={e => setSalaryForm(prev => ({
          ...prev,
          basicSalary: e.target.value
        }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Bonus</span>
            <input type="number" value={salaryForm.bonus} onChange={e => setSalaryForm(prev => ({
          ...prev,
          bonus: e.target.value
        }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Deductions</span>
            <input type="number" value={salaryForm.deductions} onChange={e => setSalaryForm(prev => ({
          ...prev,
          deductions: e.target.value
        }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none" />
          </label>
        </div>
        <button type="submit" className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors">
          Generate salary slip
        </button>
      </form>

      {loading ? <SkeletonList count={3} /> : !salarySlips || salarySlips.length === 0 ? <EmptyRow>No salary slips generated yet.</EmptyRow> : <div className="space-y-4">
          {salarySlips.map(s => <DataCard key={s._id} title={s.staffId?.name || "Unknown staff"} subtitle={`${s.month}/${s.year} · ${s.staffId?.role || ""}`} badge={<StatusBadge status={s.status} tone={statusTone(s.status)} />}>
              <DataGrid fields={[{
        label: "Basic",
        value: `₹${s.basicSalary}`
      }, {
        label: "Bonus",
        value: `₹${s.bonus}`
      }, {
        label: "Deductions",
        value: `₹${s.deductions}`
      }, {
        label: "Net pay",
        value: `₹${s.netPay}`
      }]} />
              {s.status === "pending" && <div className="mt-4 pt-4 border-t border-mist">
                  <button onClick={() => markSalaryPaidAction(s._id)} className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors">
                    Mark as paid
                  </button>
                </div>}
            </DataCard>)}
        </div>}
    </div>
);
}
