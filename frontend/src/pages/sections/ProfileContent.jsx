// Split out of ../Section.jsx (see that file's renderProfile usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.

import SkeletonList from "../../components/SkeletonList";

export function renderProfileContentImpl({ error, loading, profileData, profileForm, profileMessage, profileSaving, setProfileForm, submitProfileUpdate }) {
  if (loading) return <SkeletonList count={3} />;
  if (!profileData || !profileForm) return <p className="text-gray-600">Profile not available.</p>;
  return <div className="max-w-xl space-y-6">
        <div className="rounded-2xl border border-mist bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><span className="text-slate-500">Name:</span> <span className="font-semibold text-ink">{profileData.name}</span></div>
            <div><span className="text-slate-500">Username:</span> <span className="font-semibold text-ink">@{profileData.username}</span></div>
            <div><span className="text-slate-500">Role:</span> <span className="font-semibold text-ink capitalize">{profileData.role}</span></div>
            {profileData.department?.name && <div><span className="text-slate-500">Department:</span> <span className="font-semibold text-ink">{profileData.department.name}</span></div>}
            {profileData.designation && <div><span className="text-slate-500">Designation:</span> <span className="font-semibold text-ink">{profileData.designation}</span></div>}
            {profileData.degree && <div><span className="text-slate-500">Degree:</span> <span className="font-semibold text-ink">{profileData.degree}</span></div>}
            {profileData.registrationNo && <div><span className="text-slate-500">Registration no:</span> <span className="font-semibold text-ink">{profileData.registrationNo}</span></div>}
            {profileData.shiftTiming && <div><span className="text-slate-500">Shift:</span> <span className="font-semibold text-ink capitalize">{profileData.shiftTiming}</span></div>}
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
        {profileMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{profileMessage}</div>}

        <form onSubmit={submitProfileUpdate} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-ink">Editable details</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Contact number</span>
              <input type="text" value={profileForm.contactNumber} onChange={e => setProfileForm(prev => ({
            ...prev,
            contactNumber: e.target.value
          }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Email</span>
              <input type="email" value={profileForm.email} onChange={e => setProfileForm(prev => ({
            ...prev,
            email: e.target.value
          }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Blood group</span>
              <input type="text" value={profileForm.bloodGroup} onChange={e => setProfileForm(prev => ({
            ...prev,
            bloodGroup: e.target.value
          }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm text-slate-600">Address</span>
              <input type="text" value={profileForm.address} onChange={e => setProfileForm(prev => ({
            ...prev,
            address: e.target.value
          }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Emergency contact name</span>
              <input type="text" value={profileForm.emergencyContactName} onChange={e => setProfileForm(prev => ({
            ...prev,
            emergencyContactName: e.target.value
          }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Emergency contact number</span>
              <input type="text" value={profileForm.emergencyContactNumber} onChange={e => setProfileForm(prev => ({
            ...prev,
            emergencyContactNumber: e.target.value
          }))} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
          </div>
          <button type="submit" disabled={profileSaving} className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60">
            {profileSaving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>;
}
