// Split out of ../Section.jsx (see that file's renderAdmin usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.

import { AlertTriangle, Ambulance, Briefcase, Building2, CalendarDays, CheckCircle2, ClipboardList, Clock3, History, IdCard, PenTool, Phone, RotateCcw, Stethoscope, UserCog, UserPlus, Users, Wallet, XCircle } from "lucide-react";
import { DataCard, DataGrid, EmptyRow, SearchInput, SectionToolbar, StatusBadge, statusTone } from "../../components/DataCard";
import EmptyState from "../../components/EmptyState";
import { NavLink } from "react-router-dom";
import { Spinner } from "../../components/Spinner";
import SkeletonList from "../../components/SkeletonList";
import { auditLogService } from "../../services/api.js";
import { DAY_NAMES, STAFF_ROLES, TICKET_STATUSES } from "./sectionShared.js";

export function renderAdminContentImpl({ actionMessage, allAppointments, analytics, approveLeave, assignDoctor, assignDoctorChoice, assignTicket, auditFrom, auditLoading, auditLogs, auditSearched, auditStaffId, auditTo, cancelAppointmentAdmin, cancelDrafts, cancelReasons, config, createDepartment, current, deactivateStaff, departments, doctors, editingStaffId, error, handleSignatureFileChange, handleStaffFormChange, leaveConflicts, leaveHistory, leaveHistoryFilter, leaveRejectDrafts, leaveRequests, leaveTab, loading, newDepartmentName, newStaffResult, openCancelId, payload, rejectLeave, removeDoctor, renderAmbulanceRequests, renderAnnouncementsWorkspace, renderIpdWorkspace, renderMessagesBoard, renderSalarySlipsWorkspace, renderTicketThread, replyToTicket, resetStaffForm, saveDoctorSchedule, scheduleDayOfWeek, scheduleDoctorId, scheduleMessage, scheduleNewCapacity, scheduleNewTime, scheduleSaving, scheduleTimes, searchQuery, section, setAssignDoctorChoice, setAuditFrom, setAuditLoading, setAuditLogs, setAuditSearched, setAuditStaffId, setAuditTo, setCancelDrafts, setLeaveHistoryFilter, setLeaveRejectDrafts, setLeaveTab, setNewDepartmentName, setOpenCancelId, setScheduleDayOfWeek, setScheduleDoctorId, setScheduleMessage, setScheduleNewCapacity, setScheduleNewTime, setScheduleTimes, setSearchQuery, setStaffRoleFilter, setTicketReplyDrafts, setTicketStatus, staffDirectory, staffForm, staffList, staffRoleFilter, startEditStaff, submitAddStaff, ticketActionMessage, ticketReplyDrafts, updateAppointmentStatusAdmin }) {
  if (section === "ambulance-requests") {
    return renderAmbulanceRequests();
  }
  if (section === "messages") {
    return renderMessagesBoard();
  }
  if (section === "announcements") {
    return renderAnnouncementsWorkspace();
  }
  if (section === "staff") {
    const q = searchQuery.trim().toLowerCase();
    const visibleStaff = !q ? staffList : staffList.filter(s => s.name?.toLowerCase().includes(q) || s.username?.toLowerCase().includes(q) || s.contactNumber?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.department?.name?.toLowerCase().includes(q));
    const roleCounts = STAFF_ROLES.map(r => ({
      role: r,
      count: staffList.filter(s => s.role === r).length
    })).filter(rc => rc.count > 0);
    const initials = name => (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
    const AVATAR_TONES = {
      doctor: "bg-crimson/10 text-crimson",
      nurse: "bg-teal/10 text-teal",
      receptionist: "bg-gold/15 text-amber-700",
      pharmacist: "bg-primary-soft text-primary-dark"
    };
    return <div className="space-y-6">
          {!loading && !error && staffList.length > 0 && <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="rounded-card border border-slate-200 bg-card p-4 shadow-card">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/70">Total staff</div>
                <div className="mt-1 text-2xl font-semibold text-ink">{staffList.length}</div>
              </div>
              {roleCounts.slice(0, 3).map(rc => <div key={rc.role} className="rounded-card border border-slate-200 bg-card p-4 shadow-card">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/70">{rc.role.charAt(0).toUpperCase() + rc.role.slice(1)}s</div>
                  <div className="mt-1 text-2xl font-semibold text-ink">{rc.count}</div>
                </div>)}
            </div>}

          <SectionToolbar>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Filter by role</span>
              <select value={staffRoleFilter} onChange={e => setStaffRoleFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10">
                <option value="">All roles</option>
                {STAFF_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, username, phone..." />
              {actionMessage && <div className="text-sm font-medium text-emerald-600 whitespace-nowrap">{actionMessage}</div>}
            </div>
          </SectionToolbar>

          {loading ? <SkeletonList count={3} /> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : staffList.length === 0 ? <EmptyRow>No staff members found. Add one from the Add staff tab.</EmptyRow> : visibleStaff.length === 0 ? <EmptyRow title="No matches">Try a different search term or role filter.</EmptyRow> : <div className="space-y-4">
              <div className="text-sm text-slate-soft">{visibleStaff.length} of {staffList.length} staff member{staffList.length !== 1 ? "s" : ""}</div>
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleStaff.map(s => <DataCard key={s._id} title={<span className="flex items-center gap-3">
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_TONES[s.role] || "bg-mist text-ink"}`}>
                          {initials(s.name)}
                        </span>
                        {s.name}
                      </span>} subtitle={`@${s.username}`} badge={<StatusBadge status={s.role} tone="info" />} actions={<div className="flex items-center gap-2">
                      <button onClick={() => startEditStaff(s)} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:bg-mist transition-colors">
                        Edit
                      </button>
                      <button onClick={() => deactivateStaff(s._id)} className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                        Deactivate
                      </button>
                    </div>}>
                    <DataGrid fields={[{
              label: "Department",
              value: s.department?.name || "—"
            }, {
              label: "Contact",
              value: s.contactNumber || s.email || "—"
            }, {
              label: "Shift",
              value: s.shiftTiming ? s.shiftTiming.charAt(0).toUpperCase() + s.shiftTiming.slice(1) : "—"
            }, {
              label: "Joined",
              value: s.joiningDate ? new Date(s.joiningDate).toLocaleDateString() : "—"
            }]} />
                  </DataCard>)}
              </div>
            </div>}
        </div>;
  }
  if (section === "add-staff") {
    const staffSections = [
      {
        key: "basic",
        icon: Users,
        title: "Basic details",
        desc: "Who they are and how to reach them.",
      },
      {
        key: "emergency",
        icon: Phone,
        title: "Emergency contact",
        desc: "Who to notify if something happens on shift.",
      },
      {
        key: "employment",
        icon: Briefcase,
        title: "Employment details",
        desc: "Role, shift, ID proof and pay.",
      },
    ];
    return <div className="max-w-4xl space-y-6">
          <div className="flex items-start gap-4">
            <span className="hidden sm:inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-crimson/10 text-crimson">
              <UserPlus className="w-5.5 h-5.5" />
            </span>
            <div>
              <h2 className="text-section-title text-ink">{editingStaffId ? "Edit staff member" : "Add a new staff member"}</h2>
              <p className="mt-1 text-sm text-slate-soft">{editingStaffId ? "Update their details below. Their username and login stay the same." : "HeartStone will generate their username and a one-time temporary password automatically — share it with them securely once created."}</p>
            </div>
          </div>

          {newStaffResult && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Staff member added successfully
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white/70 px-4 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Username</div>
                  <div className="font-mono text-sm font-semibold text-emerald-900">{newStaffResult.user.username}</div>
                </div>
                <div className="rounded-xl bg-white/70 px-4 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Temp password</div>
                  <div className="font-mono text-sm font-semibold text-emerald-900">{newStaffResult.user.tempPassword}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-emerald-700">{newStaffResult.warning}</div>
            </div>}

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

          <form onSubmit={submitAddStaff} className="space-y-5">
            {staffSections.map(sec => <div key={sec.key} className="surface-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-crimson">
                    <sec.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">{sec.title}</div>
                    <div className="text-xs text-slate-soft">{sec.desc}</div>
                  </div>
                </div>

                {sec.key === "basic" && <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Full name *</span>
                    <input type="text" value={staffForm.name} onChange={e => handleStaffFormChange("name", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" required />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Role *</span>
                    <select value={staffForm.role} onChange={e => handleStaffFormChange("role", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10">
                      {STAFF_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Contact number *</span>
                    <input type="text" value={staffForm.contactNumber} onChange={e => handleStaffFormChange("contactNumber", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" placeholder="e.g. +91-9876543210" required />
                    <span className="block text-[11px] text-slate-soft/70">Used to generate their username</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Email</span>
                    <input type="email" value={staffForm.email} onChange={e => handleStaffFormChange("email", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Date of birth</span>
                    <input type="date" value={staffForm.dateOfBirth} onChange={e => handleStaffFormChange("dateOfBirth", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Gender</span>
                    <select value={staffForm.gender} onChange={e => handleStaffFormChange("gender", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Blood group</span>
                    <input type="text" value={staffForm.bloodGroup} onChange={e => handleStaffFormChange("bloodGroup", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" placeholder="e.g. O+" />
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Address</span>
                    <input type="text" value={staffForm.address} onChange={e => handleStaffFormChange("address", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  </label>
                </div>}

                {sec.key === "emergency" && <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Name</span>
                    <input type="text" value={staffForm.emergencyContactName} onChange={e => handleStaffFormChange("emergencyContactName", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Number</span>
                    <input type="text" value={staffForm.emergencyContactNumber} onChange={e => handleStaffFormChange("emergencyContactNumber", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  </label>
                </div>}

                {sec.key === "employment" && <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Qualification</span>
                    <input type="text" value={staffForm.qualification} onChange={e => handleStaffFormChange("qualification", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" placeholder="e.g. B.Sc Nursing" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Experience (years)</span>
                    <input type="number" min="0" value={staffForm.experienceYears} onChange={e => handleStaffFormChange("experienceYears", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Joining date</span>
                    <input type="date" value={staffForm.joiningDate} onChange={e => handleStaffFormChange("joiningDate", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Shift timing</span>
                    <select value={staffForm.shiftTiming} onChange={e => handleStaffFormChange("shiftTiming", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10">
                      <option value="">Select</option>
                      <option value="morning">Morning</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                      <option value="rotational">Rotational</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 flex items-center gap-1"><IdCard className="h-3 w-3" /> Government ID / proof number</span>
                    <input type="text" value={staffForm.employeeIdProof} onChange={e => handleStaffFormChange("employeeIdProof", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" placeholder="e.g. Aadhar number" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Monthly salary</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-soft">₹</span>
                      <input type="number" min="0" value={staffForm.salary} onChange={e => handleStaffFormChange("salary", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                    </div>
                  </label>
                </div>}
              </div>)}

            <div className="surface-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-crimson">
                  <PenTool className="h-4.5 w-4.5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">Signature</div>
                  <div className="text-xs text-slate-soft">Auto-stamped onto prescriptions and bills this person generates.</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {staffForm.signatureUrl && <div className="rounded-xl border border-slate-200 bg-mist px-4 py-3">
                    <img src={staffForm.signatureUrl} alt="Signature preview" className="h-12 object-contain" />
                  </div>}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mist transition-colors">
                  <PenTool className="h-3.5 w-3.5" />
                  {staffForm.signatureUrl ? "Replace signature" : "Upload signature"}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => handleSignatureFileChange(e.target.files?.[0])} />
                </label>
                {staffForm.signatureUrl && <button type="button" onClick={() => handleStaffFormChange("signatureUrl", "")} className="text-xs font-semibold text-red-600 hover:text-red-700">
                    Remove
                  </button>}
              </div>
            </div>

            {staffForm.role === "doctor" && <div className="surface-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mist text-crimson">
                    <Stethoscope className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">Doctor-specific details</div>
                    <div className="text-xs text-slate-soft">Shown to patients when they book with this doctor.</div>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Designation</span>
                    <input type="text" value={staffForm.designation} onChange={e => handleStaffFormChange("designation", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" placeholder="e.g. Senior Cardiologist" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Degree</span>
                    <input type="text" value={staffForm.degree} onChange={e => handleStaffFormChange("degree", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" placeholder="e.g. MBBS, MD" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Registration number</span>
                    <input type="text" value={staffForm.registrationNo} onChange={e => handleStaffFormChange("registrationNo", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Department</span>
                    <select value={staffForm.departmentId} onChange={e => handleStaffFormChange("departmentId", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10">
                      <option value="">Select department</option>
                      {departments.map(dept => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Consultation fee</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-soft">₹</span>
                      <input type="number" value={staffForm.consultationFee} onChange={e => handleStaffFormChange("consultationFee", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                    </div>
                  </label>
                </div>
              </div>}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading} className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60 transition-colors">
                {loading ? (editingStaffId ? "Saving..." : "Adding...") : editingStaffId ? "Save changes" : "Add staff member"}
              </button>
              <button type="button" onClick={resetStaffForm} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-mist transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
                {editingStaffId ? "Cancel" : "Reset"}
              </button>
            </div>
          </form>
        </div>;
  }
  if (section === "departments") {
    return <div className="space-y-6">
          <form onSubmit={createDepartment} className="flex flex-wrap items-end gap-3">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">New department name</span>
              <input type="text" value={newDepartmentName} onChange={e => setNewDepartmentName(e.target.value)} className="w-64 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" placeholder="e.g. Orthopedics" />
            </label>
            <button type="submit" className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-light">
              Create department
            </button>
          </form>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

          {loading ? <SkeletonList count={3} /> : departments.length === 0 ? <p className="text-gray-600">No departments yet. Create one above.</p> : <div className="space-y-4">
              {departments.map(dept => {
          const assignedIds = new Set((dept.doctors || []).map(d => d._id));
          const unassignedDoctors = doctors.filter(d => !assignedIds.has(d._id));
          return <div key={dept._id} className="rounded-2xl border border-mist bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="font-semibold text-ink text-lg">{dept.name}</div>
                      <div className="flex items-center gap-2">
                        <select value={assignDoctorChoice[dept._id] || ""} onChange={e => setAssignDoctorChoice(prev => ({
                  ...prev,
                  [dept._id]: e.target.value
                }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                          <option value="">Assign doctor...</option>
                          {unassignedDoctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        <button onClick={() => assignDoctor(dept._id)} className="rounded-2xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light">
                          Assign
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(dept.doctors || []).length === 0 ? <span className="text-sm text-slate-500">No doctors assigned yet.</span> : dept.doctors.map(doc => <span key={doc._id} className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1.5 text-xs text-ink">
                            {doc.name}
                            <button onClick={() => removeDoctor(dept._id, doc._id, doc.name)} className="text-slate-400 hover:text-red-600" title="Remove">
                              ×
                            </button>
                          </span>)}
                    </div>
                  </div>;
        })}
            </div>}
        </div>;
  }
  if (section === "leave-requests") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    const approvedCount = leaveHistory.filter(l => l.status === "approved").length;
    const rejectedCount = leaveHistory.filter(l => l.status === "rejected").length;
    const visibleHistory = leaveHistoryFilter === "all" ? leaveHistory : leaveHistory.filter(l => l.status === leaveHistoryFilter);
    const leaveTypeLabel = lr => lr.leaveType ? lr.leaveType.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase()) : null;
    return <div className="space-y-5">
          <div className="grid gap-3 grid-cols-3">
            <div className="rounded-card border border-slate-200 bg-card p-4 shadow-card">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700"><Clock3 className="h-3 w-3" /> Pending</div>
              <div className="mt-1 text-2xl font-semibold text-ink">{leaveRequests.length}</div>
            </div>
            <div className="rounded-card border border-slate-200 bg-card p-4 shadow-card">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Approved</div>
              <div className="mt-1 text-2xl font-semibold text-ink">{approvedCount}</div>
            </div>
            <div className="rounded-card border border-slate-200 bg-card p-4 shadow-card">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-700"><XCircle className="h-3 w-3" /> Rejected</div>
              <div className="mt-1 text-2xl font-semibold text-ink">{rejectedCount}</div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-mist p-1">
              <button onClick={() => setLeaveTab("pending")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${leaveTab === "pending" ? "bg-white text-ink shadow-xs" : "text-slate-soft hover:text-ink"}`}>
                <Clock3 className="h-3.5 w-3.5" />
                Pending
                {leaveRequests.length > 0 && <span className="ml-0.5 min-w-[18px] rounded-full bg-amber-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-amber-700">
                    {leaveRequests.length}
                  </span>}
              </button>
              <button onClick={() => setLeaveTab("history")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${leaveTab === "history" ? "bg-white text-ink shadow-xs" : "text-slate-soft hover:text-ink"}`}>
                <History className="h-3.5 w-3.5" />
                History
                {leaveHistory.length > 0 && <span className="ml-0.5 min-w-[18px] rounded-full bg-slate-200 px-1.5 py-0.5 text-center text-[10px] font-bold text-slate-600">
                    {leaveHistory.length}
                  </span>}
              </button>
            </div>

            {leaveTab === "history" && leaveHistory.length > 0 && <div className="inline-flex items-center gap-1.5">
                {[{
            key: "all",
            label: "All"
          }, {
            key: "approved",
            label: "Approved"
          }, {
            key: "rejected",
            label: "Rejected"
          }].map(f => <button key={f.key} onClick={() => setLeaveHistoryFilter(f.key)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${leaveHistoryFilter === f.key ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-soft hover:border-slate-300"}`}>
                    {f.label}
                  </button>)}
              </div>}
          </div>

          {/* Pending tab */}
          {leaveTab === "pending" && (leaveRequests.length === 0 ? <EmptyRow icon={CheckCircle2}>All caught up — no pending leave requests right now.</EmptyRow> : <div className="space-y-4">
                {leaveRequests.map(lr => {
          const conflicts = leaveConflicts[lr._id];
          return <DataCard key={lr._id} title={lr.staffId?.name || "Unknown"} subtitle={[lr.staffId?.role ? lr.staffId.role.charAt(0).toUpperCase() + lr.staffId.role.slice(1) : null, leaveTypeLabel(lr)].filter(Boolean).join(" · ") || undefined} badge={<StatusBadge status="Pending" tone="warning" />}>
                      <DataGrid fields={[{
              label: "From",
              value: new Date(lr.fromDate).toLocaleDateString()
            }, {
              label: "To",
              value: new Date(lr.toDate).toLocaleDateString()
            }, ...(lr.timeFrom || lr.timeTo ? [{
              label: "Time",
              value: `${lr.timeFrom || "—"} to ${lr.timeTo || "—"}`
            }] : []), {
              label: "Reason",
              value: lr.reason
            }]} />

                      {conflicts && conflicts.length > 0 && <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <div className="text-sm font-semibold text-amber-800">
                            {conflicts.length} appointment{conflicts.length !== 1 ? "s are" : " is"} affected by this leave request.
                          </div>
                          <div className="space-y-1.5">
                            {conflicts.map(c => <div key={c._id} className="text-xs text-amber-700">
                                {c.patientId?.name || c.patientId?.phone} · {new Date(c.slotTime).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })} · {c.department?.name}
                              </div>)}
                          </div>
                        </div>}

                      <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                        {conflicts && conflicts.length > 0 ? <button onClick={() => approveLeave(lr._id, true)} className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
                            Approve anyway ({conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""})
                          </button> : <button onClick={() => approveLeave(lr._id, false)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>}
                        <input type="text" placeholder="Rejection reason" value={leaveRejectDrafts[lr._id] || ""} onChange={e => setLeaveRejectDrafts(prev => ({
                ...prev,
                [lr._id]: e.target.value
              }))} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none" />
                        <button onClick={() => rejectLeave(lr._id)} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </DataCard>;
        })}
              </div>)}

          {/* History tab */}
          {leaveTab === "history" && (leaveHistory.length === 0 ? <EmptyRow icon={History}>No leave requests have been decided yet — approvals and rejections will appear here.</EmptyRow> : visibleHistory.length === 0 ? <EmptyRow>No {leaveHistoryFilter} leave requests.</EmptyRow> : <div className="space-y-4">
                {leaveTab === "history" && leaveHistoryFilter === "all" && leaveHistory.length > 0 && <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-soft">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {approvedCount} approved
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-red-700 ring-1 ring-inset ring-red-200">
                      <XCircle className="h-3.5 w-3.5" /> {rejectedCount} rejected
                    </span>
                  </div>}
                {visibleHistory.map(lr => <DataCard key={lr._id} title={lr.staffId?.name || "Unknown"} subtitle={[lr.staffId?.role ? lr.staffId.role.charAt(0).toUpperCase() + lr.staffId.role.slice(1) : null, leaveTypeLabel(lr)].filter(Boolean).join(" · ") || undefined} badge={<StatusBadge status={lr.status} tone={statusTone(lr.status)} />}>
                    <DataGrid fields={[{
            label: "From",
            value: new Date(lr.fromDate).toLocaleDateString()
          }, {
            label: "To",
            value: new Date(lr.toDate).toLocaleDateString()
          }, ...(lr.timeFrom || lr.timeTo ? [{
            label: "Time",
            value: `${lr.timeFrom || "—"} to ${lr.timeTo || "—"}`
          }] : []), {
            label: "Reason",
            value: lr.reason
          }, {
            label: lr.status === "approved" ? "Approved by" : "Rejected by",
            value: lr.reviewedBy?.name || "—"
          }, {
            label: "Decided on",
            value: lr.reviewedAt ? new Date(lr.reviewedAt).toLocaleDateString() : "—"
          }]} />
                    {lr.status === "rejected" && lr.rejectionReason && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                        <span className="font-semibold">Reason for rejection:</span> {lr.rejectionReason}
                      </div>}
                  </DataCard>)}
              </div>)}
        </div>;
  }
  if (section === "appointments") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    if (allAppointments.length === 0) {
      return <EmptyRow>No appointments booked yet.</EmptyRow>;
    }
    const q = searchQuery.trim().toLowerCase();
    const visibleAppointments = !q ? allAppointments : allAppointments.filter(appt => appt.patientId?.name?.toLowerCase().includes(q) || appt.patientId?.phone?.toLowerCase().includes(q) || appt.doctorId?.name?.toLowerCase().includes(q) || appt.appointmentCode?.toLowerCase().includes(q) || appt.status?.toLowerCase().includes(q));
    return <div className="space-y-4">
          <SectionToolbar>
            <div className="text-sm text-slate-soft">{allAppointments.length} appointment{allAppointments.length !== 1 ? "s" : ""}</div>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by patient, doctor, code..." />
          </SectionToolbar>
          {visibleAppointments.length === 0 && <EmptyRow title="No matches">Try a different search term.</EmptyRow>}
          {visibleAppointments.map(appt => {
        const draft = cancelDrafts[appt._id] || {
          reason: "",
          note: ""
        };
        const isCancelling = openCancelId === appt._id;
        const isPastAppointment = new Date(appt.slotTime) < new Date();
        const isReceptionistView = config.role === "receptionist" || config.role === "admin";
        return <DataCard key={appt._id} title={appt.patientId?.name || appt.patientId?.phone || "Unknown patient"} subtitle={appt.appointmentCode ? `${appt.appointmentCode} · with ${appt.doctorId?.name || "Unknown doctor"}` : `with ${appt.doctorId?.name || "Unknown doctor"}`} actions={<div className="flex items-center gap-2">
                    <select value={appt.status} onChange={e => updateAppointmentStatusAdmin(appt._id, e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                      {(isPastAppointment && isReceptionistView ? ["completed", "cancelled", "no-show"] : ["booked", "completed", "cancelled", "no-show"]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {appt.status !== "cancelled" && !(isPastAppointment && isReceptionistView) && <button onClick={() => setOpenCancelId(isCancelling ? null : appt._id)} className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors">
                        {isCancelling ? "Never mind" : "Cancel"}
                      </button>}
                  </div>}>
                <DataGrid fields={[{
            label: "Department",
            value: appt.department?.name || "—"
          }, {
            label: "Slot",
            value: new Date(appt.slotTime).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short"
            })
          }, ...(appt.dailyToken != null ? [{
            label: "Token",
            value: `#${appt.dailyToken}${appt.slotPosition > 1 ? ` (${appt.dailyToken - appt.slotPosition}+${appt.slotPosition})` : ""}`
          }] : []), ...(appt.estimatedTime ? [{
            label: "Est. turn",
            value: `~${new Date(appt.estimatedTime).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit"
            })}`
          }] : []), {
            label: "Status",
            value: <StatusBadge status={appt.status} tone={statusTone(appt.status)} />
          }, ...(isPastAppointment && isReceptionistView ? [{
            label: "Note",
            value: "Past slot — reception can update the visit status only."
          }] : [])]} />
                {appt.status === "cancelled" && appt.cancelReason && <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                    <span className="text-slate-500">Cancelled — reason:</span>{" "}
                    <span className="font-medium text-ink">{appt.cancelReason}</span>
                    {appt.cancelNote && <span className="text-slate-500"> · {appt.cancelNote}</span>}
                  </div>}
                {isCancelling && <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                    <select value={draft.reason} onChange={e => setCancelDrafts(prev => ({
              ...prev,
              [appt._id]: {
                ...draft,
                reason: e.target.value
              }
            }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none">
                      <option value="">Select a reason</option>
                      {cancelReasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={() => cancelAppointmentAdmin(appt._id)} disabled={!draft.reason} className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                      Confirm cancellation
                    </button>
                  </div>}
              </DataCard>;
      })}
        </div>;
  }
  if (section === "tickets") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    if (!payload || payload.length === 0) {
      return <EmptyRow>No tickets have been raised by patients yet.</EmptyRow>;
    }
    const q = searchQuery.trim().toLowerCase();
    const visibleTickets = !q ? payload : payload.filter(t => t.subject?.toLowerCase().includes(q) || t.ticketId?.toLowerCase().includes(q) || t.patientId?.name?.toLowerCase().includes(q) || t.patientId?.phone?.toLowerCase().includes(q) || t.status?.toLowerCase().includes(q));
    return <div className="space-y-4">
          {ticketActionMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{ticketActionMessage}</div>}
          <SectionToolbar>
            <div className="text-sm text-slate-soft">{payload.length} ticket{payload.length !== 1 ? "s" : ""}</div>
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by subject, patient, ticket ID..." />
          </SectionToolbar>
          {visibleTickets.length === 0 && <EmptyRow title="No matches">Try a different search term.</EmptyRow>}
          {visibleTickets.map(q => <DataCard key={q._id} title={q.subject} subtitle={`Ticket ${q.ticketId} · ${q.patientId?.name || q.patientId?.phone || "Unknown patient"}`} badge={<StatusBadge status={q.status} tone={statusTone(q.status)} />}>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Redirect to</span>
                <select value={q.assignedToId?._id || ""} onChange={e => assignTicket(q._id, e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                  <option value="">Unassigned</option>
                  {staffDirectory.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                </select>

                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1 ml-4">Status</span>
                <select value={q.status} onChange={e => setTicketStatus(q._id, e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none">
                  {TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="pt-4 mt-4 border-t border-mist">{renderTicketThread(q)}</div>

              <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                <textarea value={ticketReplyDrafts[q._id] || ""} onChange={e => setTicketReplyDrafts(prev => ({
            ...prev,
            [q._id]: e.target.value
          }))} rows={2} placeholder="Reply to this patient..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
                <button onClick={() => replyToTicket(q._id)} className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors">
                  Send reply
                </button>
              </div>
            </DataCard>)}
        </div>;
  }
  if (section === "doctor-schedule") {
    const doctor = doctors.find(d => d._id === scheduleDoctorId);
    return <div className="space-y-6">
          <DataCard title="Set doctor availability" subtitle="Pick a doctor and a day of the week, then add the exact time slots they're available. Patients booking that department will only see these times.">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Doctor</span>
                <select value={scheduleDoctorId} onChange={e => {
              setScheduleDoctorId(e.target.value);
              setScheduleMessage("");
            }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                  <option value="">Select doctor</option>
                  {doctors.map(d => <option key={d._id} value={d._id}>{d.name}{d.department?.name ? ` · ${d.department.name}` : ""}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Day of week</span>
                <select value={scheduleDayOfWeek} onChange={e => setScheduleDayOfWeek(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none">
                  {DAY_NAMES.map((name, i) => <option key={name} value={i}>{name}</option>)}
                </select>
              </label>
            </div>

            {scheduleDoctorId && <div className="mt-5 pt-5 border-t border-mist space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {scheduleTimes.length === 0 && <span className="text-sm text-slate-soft">No slots set for this day yet.</span>}
                  {scheduleTimes.map(t => <span key={t.time} className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-ink">
                      {t.time}
                      {t.capacity > 1 && <span className="rounded-full bg-crimson/10 px-1.5 py-0.5 text-[10px] font-bold text-crimson">up to {t.capacity}</span>}
                      <button onClick={() => setScheduleTimes(prev => prev.filter(x => x.time !== t.time))} className="text-slate-400 hover:text-red-600">×</button>
                    </span>)}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-soft/70">Time</span>
                    <input type="time" value={scheduleNewTime} onChange={e => setScheduleNewTime(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-soft/70">Patients in this slot</span>
                    <input type="number" min="1" max="50" value={scheduleNewCapacity} onChange={e => setScheduleNewCapacity(Math.max(1, Number(e.target.value) || 1))} className="w-28 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-crimson/50 focus:outline-none" />
                  </label>
                  <button onClick={() => {
              if (scheduleNewTime && !scheduleTimes.some(t => t.time === scheduleNewTime)) {
                setScheduleTimes(prev => [...prev, { time: scheduleNewTime, capacity: scheduleNewCapacity }].sort((a, b) => a.time.localeCompare(b.time)));
                setScheduleNewCapacity(1);
              }
            }} className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-ink hover:border-crimson/30 transition-colors">
                    + Add time
                  </button>
                  <button onClick={saveDoctorSchedule} disabled={scheduleSaving || !doctor?.department} className="rounded-full bg-crimson px-5 py-2.5 text-xs font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-40 transition-colors">
                    {scheduleSaving ? "Saving..." : `Save ${DAY_NAMES[scheduleDayOfWeek]} schedule`}
                  </button>
                </div>
                <p className="text-xs text-slate-soft">
                  "Patients in this slot" is the slot's capacity - e.g. a 10:00 slot set to 5 lets up to 5 patients book that exact time; each gets a token and an estimated turn about 15 minutes apart. Leave it at 1 for a normal one-patient-per-slot appointment.
                </p>
                {!doctor?.department && <div className="text-xs text-amber-700">This doctor has no department assigned yet — assign one first under Departments.</div>}
                {scheduleMessage && <div className="text-sm font-medium text-emerald-600">{scheduleMessage}</div>}
              </div>}
          </DataCard>
        </div>;
  }
  if (section === "analytics") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-card border border-red-200 bg-red-50 p-5 text-body text-red-700">{error}</div>;
    if (!analytics) return <EmptyRow>No analytics data available yet.</EmptyRow>;
    const kpis = [{
      label: "Appointments today",
      value: analytics.appointments.today,
      icon: CalendarDays,
      tone: "primary"
    }, {
      label: "Total patients",
      value: analytics.patients.total,
      icon: Users,
      tone: "primary"
    }, {
      label: "Revenue today",
      value: analytics.revenueToday != null ? `₹${analytics.revenueToday.toLocaleString("en-IN")}` : "—",
      icon: Wallet,
      tone: "success"
    }, {
      label: "Pending leave requests",
      value: analytics.leave.pending,
      icon: ClipboardList,
      tone: "warning"
    }, {
      label: "Total staff",
      value: analytics.staff.total,
      icon: UserCog,
      tone: "primary"
    }, {
      label: "Critical alerts",
      value: analytics.criticalAlerts ?? "—",
      icon: AlertTriangle,
      tone: analytics.criticalAlerts > 0 ? "error" : "success"
    }];
    const toneClasses = {
      primary: "bg-primary-soft text-primary-dark",
      success: "bg-success-soft text-emerald-700",
      warning: "bg-warning-soft text-amber-700",
      error: "bg-error-soft text-red-700"
    };

    // On-demand audit search - deliberately NOT fetched automatically.
    // Admin picks a staff member and/or a date range and clicks Search;
    // nothing is queried (and no large unfiltered log list is pulled)
    // until they do, which is what keeps this dashboard fast to load.
    const runAuditSearch = async () => {
      setAuditLoading(true);
      setAuditSearched(true);
      try {
        const res = await auditLogService.getLogs({
          userId: auditStaffId || undefined,
          from: auditFrom || undefined,
          // Include the whole "to" day, not just midnight of it.
          to: auditTo ? `${auditTo}T23:59:59.999` : undefined
        });
        setAuditLogs(res.data || []);
      } catch {
        setAuditLogs([]);
      } finally {
        setAuditLoading(false);
      }
    };
    const clearAuditSearch = () => {
      setAuditStaffId("");
      setAuditFrom("");
      setAuditTo("");
      setAuditLogs([]);
      setAuditSearched(false);
    };

    // Turns a raw audit log entry into a readable one-line sentence, e.g.
    // "Dr. Rina Kapoor checked in patient APT-260723-4F2K". Falls back
    // gracefully for older entries recorded before staffName was captured.
    const describeAuditEntry = log => {
      const who = log.staffName || "A staff member";
      const action = (log.action || "").toLowerCase().replace(/_/g, " ");
      const ref = log.details?.appointmentCode || log.details?.code || (log.resourceId ? `#${String(log.resourceId).slice(-6)}` : "");
      const resource = (log.resource || "").toLowerCase();
      return `${who} ${action}${resource ? ` (${resource})` : ""}${ref ? ` ${ref}` : ""}`.trim();
    };
    const relativeTime = date => {
      const diffMs = Date.now() - new Date(date).getTime();
      const mins = Math.round(diffMs / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.round(hours / 24);
      return `${days}d ago`;
    };
    const quickActions = [{
      label: "Add staff",
      path: "add-staff",
      icon: UserPlus
    }, {
      label: "Doctor schedules",
      path: "doctor-schedule",
      icon: Stethoscope
    }, {
      label: "Departments",
      path: "departments",
      icon: Building2
    }, {
      label: "Emergency requests",
      path: "ambulance-requests",
      icon: Ambulance
    }].filter(a => config.sections.some(s => s.path === a.path));
    return <div className="space-y-sp-4">
          <div className="grid gap-sp-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map(c => <div key={c.label} className="rounded-card border border-slate-200 bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow duration-200">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-control ${toneClasses[c.tone]}`}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="mt-3 text-small font-medium text-text-secondary">{c.label}</div>
                <div className="mt-1 text-page-title text-text-primary">{c.value}</div>
              </div>)}
          </div>

          {quickActions.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Quick actions</div>
              <div className="grid gap-sp-2 grid-cols-2 lg:grid-cols-4">
                {quickActions.map(a => <NavLink key={a.path} to={`/${config.role}/${a.path}`} className="flex items-center gap-3 rounded-card border border-slate-200 bg-card p-4 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary-soft text-primary-dark shrink-0">
                      <a.icon className="w-4 h-4" />
                    </span>
                    <span className="text-body font-medium text-text-primary">{a.label}</span>
                  </NavLink>)}
              </div>
            </div>}

          <div className="grid gap-sp-3 lg:grid-cols-2">
            <DataCard title="Staff by role">
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.staff.byRole).map(([role, count]) => <span key={role} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-small text-text-primary">
                    <span className="capitalize">{role}</span>
                    <span className="font-semibold text-primary-dark">{count}</span>
                  </span>)}
              </div>
            </DataCard>

            <DataCard title="Appointments by status">
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.appointments.byStatus).map(([status, count]) => <StatusBadge key={status} status={`${status}: ${count}`} tone={statusTone(status)} />)}
              </div>
            </DataCard>
          </div>

          <DataCard title="Recent activity" subtitle="Latest appointments booked across the hospital">
            {(analytics.appointments.recent || []).length === 0 ? <p className="text-body text-text-secondary">No appointments booked yet.</p> : <div className="divide-y divide-slate-100">
                {analytics.appointments.recent.map(a => <div key={a._id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                        <CalendarDays className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-body font-medium text-text-primary truncate">
                          {a.patientId?.name || "Patient"} with {a.doctorId?.name || "doctor"}
                        </div>
                        <div className="text-small text-text-secondary truncate">{a.department?.name || "General"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={a.status} tone={statusTone(a.status)} />
                      <span className="text-small text-text-secondary hidden sm:inline">
                        {new Date(a.slotTime).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}
                      </span>
                    </div>
                  </div>)}
              </div>}
          </DataCard>

          <DataCard title="Audit log" subtitle="Search staff actions by name and date range">
            <div className="flex flex-wrap items-end gap-3 pb-4 mb-4 border-b border-slate-100">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Staff member</span>
                <select value={auditStaffId} onChange={e => setAuditStaffId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10 min-w-[200px]">
                  <option value="">All staff</option>
                  {staffDirectory.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">From</span>
                <input type="date" value={auditFrom} onChange={e => setAuditFrom(e.target.value)} max={auditTo || undefined} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">To</span>
                <input type="date" value={auditTo} onChange={e => setAuditTo(e.target.value)} min={auditFrom || undefined} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10" />
              </label>
              <button type="button" onClick={runAuditSearch} disabled={auditLoading} className="flex items-center gap-2 rounded-full bg-crimson px-5 py-2 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors disabled:opacity-60">
                {auditLoading && <Spinner size={14} />}
                {auditLoading ? "Searching..." : "Search"}
              </button>
              {auditSearched && <button type="button" onClick={clearAuditSearch} className="text-sm text-slate-500 hover:text-slate-700">
                  Clear
                </button>}
            </div>

            {!auditSearched ? <p className="text-body text-text-secondary">
                Select a staff member and/or a date range, then search - the log isn't loaded automatically so this page stays fast.
              </p> : auditLoading ? <SkeletonList count={3} /> : (auditLogs || []).length === 0 ? <p className="text-body text-text-secondary">No audited actions found for that filter.</p> : <div className="divide-y divide-slate-100">
                {auditLogs.map(log => <div key={log._id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                        <ClipboardList className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 text-body text-text-primary truncate">{describeAuditEntry(log)}</div>
                    </div>
                    <span className="text-small text-text-secondary shrink-0">{relativeTime(log.createdAt)}</span>
                  </div>)}
              </div>}
          </DataCard>
        </div>;
  }
  if (section === "wards") {
    return renderIpdWorkspace("admin");
  }
  if (section === "salary-slips") {
    return renderSalarySlipsWorkspace();
  }
  if (section === "my-salary") {
    if (loading) return <SkeletonList count={3} />;
    if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    if (!payload || payload.length === 0) {
      return <EmptyRow>No salary slips have been generated for you yet.</EmptyRow>;
    }
    return <div className="space-y-4">
          {payload.map(s => <DataCard key={s._id} title={new Date(0, s.month - 1).toLocaleString([], {
        month: "long"
      }) + " " + s.year} subtitle={s.generatedBy?.name ? `Generated by ${s.generatedBy.name}` : "Salary slip"} badge={<StatusBadge status={s.status} tone={statusTone(s.status)} />}>
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
              {s.notes && <div className="mt-4 pt-4 border-t border-mist text-sm text-slate-600">
                  <span className="font-semibold text-ink">Notes: </span>{s.notes}
                </div>}
              {s.status === "paid" && s.paidAt && <div className="mt-3 text-xs text-slate-soft">
                  Paid on {new Date(s.paidAt).toLocaleDateString([], {
            dateStyle: "medium"
          })}
                </div>}
            </DataCard>)}
        </div>;
  }
  return <EmptyState title={current.label} description={current.desc} accent={config.accent === "crimson" ? "crimson" : "navy"} />;
}
