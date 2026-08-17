// Split out of ../Section.jsx (see that file's renderHome usage) to keep Section.jsx a manageable size. All state lives in Section.jsx; this file receives everything it
// needs explicitly via the deps object rather than closing over outer state, so it can
// be reasoned about (and tested) on its own.

import { Ambulance, ArrowRight, BedDouble, Building2, CalendarClock, CalendarDays, ClipboardList, ListChecks, Megaphone, Receipt, Stethoscope, UserCog, Users } from "lucide-react";
import { EmptyRow, StatusBadge, statusTone } from "../../components/DataCard";
import { NavLink } from "react-router-dom";
import SkeletonList from "../../components/SkeletonList";
import { iconForSection } from "../../utils/navGroups.js";

export function renderHomeOverviewImpl({ adminHome, announcements, config, doctorHome, homeStats, homeSummary, loading, nurseHome, overviewDate, receptionHome, setOverviewDate, user }) {
  const quickLinks = config.sections.filter(s => s.path !== "home");

  // "Good morning/afternoon/evening, <name>" - based on the visitor's own
  // clock, not the server's, so it always matches what they see outside
  // the browser window.
  const greetingLabel = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = user?.name ? user.name.split(" ")[0] : null;
  const Greeting = () => <div>
        <div className="text-page-title text-text-primary">
          {greetingLabel}{firstName ? `, ${firstName}` : ""}
        </div>
        <div className="mt-0.5 text-body text-text-secondary">Have a great day.</div>
      </div>;
  if (config.role === "patient") {
    if (loading) return <SkeletonList count={2} />;
    const now = new Date();
    const upcoming = (homeStats?.appointments || []).filter(a => a.status === "booked" && new Date(a.slotTime) >= now).sort((a, b) => new Date(a.slotTime) - new Date(b.slotTime))[0];
    const openTickets = (homeStats?.tickets || []).filter(t => t.status !== "closed").length;
    return <div className="space-y-sp-4">
          <div className="grid gap-sp-3 sm:grid-cols-2">
            <div className="rounded-card border border-slate-200 bg-card p-5 shadow-card">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary-soft text-primary-dark">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="mt-3 text-small font-medium text-text-secondary">Next appointment</div>
              {upcoming ? <div className="mt-1 space-y-0.5">
                  <div className="text-card-title text-text-primary">{upcoming.doctorId?.name || "Doctor"}</div>
                  <div className="text-small text-text-secondary">
                    {new Date(upcoming.slotTime).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short"
              })}
                  </div>
                  {upcoming.dailyToken != null && <div className="text-small text-text-secondary">
                      Token #{upcoming.dailyToken}
                      {upcoming.estimatedTime && <> · est. ~{new Date(upcoming.estimatedTime).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit"
                })}</>}
                    </div>}
                </div> : <p className="mt-1 text-body text-text-secondary">Nothing booked yet.</p>}
            </div>
            <div className="rounded-card border border-slate-200 bg-card p-5 shadow-card">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-warning-soft text-amber-700">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="mt-3 text-small font-medium text-text-secondary">Open tickets</div>
              <div className="mt-1 text-page-title text-text-primary">{openTickets}</div>
            </div>
          </div>

          {announcements.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Announcements</div>
              <div className="space-y-2">
                {announcements.slice(0, 3).map(a => <div key={a._id} className="rounded-card border border-slate-200 bg-card p-4 shadow-card flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-warning-soft text-amber-700">
                      <Megaphone className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-body font-medium text-text-primary truncate">{a.title}</div>
                      <div className="text-small text-text-secondary line-clamp-2">{a.message}</div>
                    </div>
                  </div>)}
              </div>
            </div>}

          <div>
            <div className="mb-sp-2 text-section-title text-text-primary">Quick actions</div>
            <div className="grid gap-sp-2 grid-cols-2 lg:grid-cols-3">
              {quickLinks.map(s => {
            const Icon = iconForSection(s.path);
            return <NavLink key={s.path} to={`/${config.role}/${s.path}`} className="flex items-center gap-3 rounded-card border border-slate-200 bg-card p-4 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary-soft text-primary-dark shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-body font-medium text-text-primary truncate">{s.label}</span>
                  </NavLink>;
          })}
            </div>
          </div>
        </div>;
  }
  if (config.role === "receptionist") {
    if (loading || !receptionHome) return <SkeletonList count={3} />;
    const {
      todaysAppointments,
      queueTokens,
      admissionsTodayCount,
      emergencyRequests,
      pendingBills
    } = receptionHome;
    const waitingCount = queueTokens.filter(t => t.status === "waiting").length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const isOverviewToday = overviewDate === todayStr;
    const overviewDateLabel = isOverviewToday ? "Today's" : `${new Date(overviewDate).toLocaleDateString([], {
      dateStyle: "medium"
    })}'s`;
    const kpiCards = [{
      label: `${overviewDateLabel} Appointments`,
      value: todaysAppointments.length,
      icon: CalendarDays,
      tone: "primary"
    }, {
      label: "Waiting Patients",
      value: waitingCount,
      icon: ListChecks,
      tone: "warning"
    }, {
      label: "Today's Admissions",
      value: admissionsTodayCount,
      icon: BedDouble,
      tone: "primary"
    }, {
      label: "Emergency Requests",
      value: emergencyRequests.length,
      icon: Ambulance,
      tone: "danger"
    }, {
      label: "Pending Bills",
      value: pendingBills.length,
      icon: Receipt,
      tone: "warning"
    }];
    const kpiTone = {
      primary: "bg-primary-soft text-primary-dark",
      warning: "bg-warning-soft text-amber-700",
      danger: "bg-error-soft text-red-700"
    };
    const apptStatusLabel = {
      booked: "Booked",
      completed: "Completed",
      cancelled: "Cancelled",
      "no-show": "No-show"
    };
    const queueStatusLabel = {
      waiting: "Waiting",
      "in-progress": "In Consultation",
      done: "Completed"
    };
    const queueStatusTone = {
      waiting: "warning",
      "in-progress": "info",
      done: "success"
    };
    const quickActions = [{
      path: "book-appointment",
      label: "Book Appointment",
      icon: CalendarDays
    }, {
      path: "ipd",
      label: "New IPD Admission",
      icon: BedDouble
    }, {
      path: "billing",
      label: "Generate Bill",
      icon: Receipt
    }, {
      path: "ambulance-requests",
      label: "Emergency Requests",
      icon: Ambulance
    }].filter(a => config.sections.some(s => s.path === a.path));
    return <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Greeting />
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-card px-3 py-1.5 text-small">
              <CalendarDays className="w-3.5 h-3.5 text-text-secondary shrink-0" />
              <span className="font-medium text-text-secondary shrink-0">Viewing</span>
              <input type="date" value={overviewDate} onChange={e => setOverviewDate(e.target.value || todayStr)} className="bg-transparent text-text-primary focus:outline-none" />
              {!isOverviewToday && <button onClick={() => setOverviewDate(todayStr)} className="ml-1 text-primary font-semibold hover:underline shrink-0">
                  Today
                </button>}
            </label>
          </div>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpiCards.map(c => <div key={c.label} className="rounded-card border border-slate-200 bg-card p-4">
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-control ${kpiTone[c.tone]}`}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="mt-2.5 text-small font-medium text-text-secondary">{c.label}</div>
                <div className="mt-0.5 text-section-title text-text-primary">{c.value}</div>
              </div>)}
          </div>

          {/* Emergency requests - prominent but not overwhelming */}
          {emergencyRequests.length > 0 && <div className="rounded-card border border-red-200 bg-red-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-red-100 text-red-700">
                    <Ambulance className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-body font-semibold text-text-primary">Emergency requests</div>
                    <div className="text-small text-red-700 font-medium">{emergencyRequests.length} new</div>
                  </div>
                </div>
                <NavLink to={`/${config.role}/ambulance-requests`} className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
                  View requests
                  <ArrowRight className="w-3.5 h-3.5" />
                </NavLink>
              </div>
              <div className="mt-3 space-y-1.5">
                {emergencyRequests.slice(0, 3).map(r => <div key={r._id} className="flex items-center justify-between gap-3 rounded-control bg-white/70 px-3 py-2 text-small text-text-secondary">
                    <span className="truncate">
                      <span className="font-medium text-text-primary">{r.callerName}</span> · {r.location}
                    </span>
                    <span className="shrink-0">{r.phone}</span>
                  </div>)}
              </div>
            </div>}

          {/* Appointments for the chosen date */}
          <div>
            <div className="mb-sp-2 flex items-center justify-between">
              <div className="text-section-title text-text-primary">{overviewDateLabel} appointments</div>
              <NavLink to={`/${config.role}/appointments`} className="text-small font-medium text-primary hover:underline">
                View all
              </NavLink>
            </div>
            {todaysAppointments.length === 0 ? <EmptyRow icon={CalendarDays}>
                {isOverviewToday ? "No appointments booked for today yet." : "No appointments booked for this date."}
              </EmptyRow> : <div className="overflow-x-auto rounded-card border border-slate-200 bg-card">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="border-b border-slate-200 text-text-secondary">
                      <th className="px-4 py-2.5 font-semibold">Time</th>
                      <th className="px-4 py-2.5 font-semibold">Token</th>
                      <th className="px-4 py-2.5 font-semibold">Patient</th>
                      <th className="px-4 py-2.5 font-semibold">Doctor</th>
                      <th className="px-4 py-2.5 font-semibold">Type</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysAppointments.slice(0, 8).map(a => <tr key={a._id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 whitespace-nowrap text-text-primary font-medium">
                          {new Date(a.slotTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-text-secondary">
                          {a.dailyToken != null ? <>
                              #{a.dailyToken}
                              {a.slotPosition > 1 && <span className="text-text-secondary/70"> ({a.dailyToken - a.slotPosition}+{a.slotPosition})</span>}
                            </> : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-text-primary truncate">{a.patientId?.name || a.patientId?.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.doctorId?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.department?.name || "—"}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={apptStatusLabel[a.status] || a.status} tone={statusTone(a.status)} />
                        </td>
                      </tr>)}
                  </tbody>
                </table>
                {todaysAppointments.length > 8 && <div className="border-t border-slate-100 px-4 py-2.5 text-small text-text-secondary">
                    +{todaysAppointments.length - 8} more today —{" "}
                    <NavLink to={`/${config.role}/appointments`} className="font-medium text-primary hover:underline">
                      view all
                    </NavLink>
                  </div>}
              </div>}
          </div>

          {/* Current queue */}
          <div>
            <div className="mb-sp-2 text-section-title text-text-primary">Current queue</div>
            {queueTokens.length === 0 ? <EmptyRow icon={ListChecks}>No patients currently in the walk-in queue.</EmptyRow> : <div className="overflow-x-auto rounded-card border border-slate-200 bg-card">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="border-b border-slate-200 text-text-secondary">
                      <th className="px-4 py-2.5 font-semibold">Token</th>
                      <th className="px-4 py-2.5 font-semibold">Patient</th>
                      <th className="px-4 py-2.5 font-semibold">Department</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueTokens.slice(0, 8).map(t => <tr key={t._id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-text-primary">#{t.tokenNumber}</td>
                        <td className="px-4 py-2.5 text-text-primary truncate">{t.patientId?.name || t.patientId?.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{t.deptName || "—"}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={queueStatusLabel[t.status] || t.status} tone={queueStatusTone[t.status] || "neutral"} />
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>}
          </div>

          {/* Quick actions */}
          {quickActions.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Quick actions</div>
              <div className="grid gap-sp-2 grid-cols-2 lg:grid-cols-4">
                {quickActions.map(a => <NavLink key={a.path} to={`/${config.role}/${a.path}`} className="flex items-center gap-2.5 rounded-control border border-slate-200 bg-card px-3.5 py-3 hover:border-primary/30 hover:bg-slate-50 transition-colors duration-150">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-dark">
                      <a.icon className="w-4 h-4" />
                    </span>
                    <span className="text-small font-medium text-text-primary truncate">{a.label}</span>
                  </NavLink>)}
              </div>
            </div>}
        </div>;
  }
  if (config.role === "admin") {
    if (loading || !adminHome) return <SkeletonList count={3} />;
    const {
      overview,
      emergencyRequests,
      pendingLeave
    } = adminHome;
    const recentAppointments = overview?.appointments?.recent || [];
    const kpiCards = [{
      label: "Today's Appointments",
      value: overview?.appointments?.today ?? "—",
      icon: CalendarDays,
      tone: "primary"
    }, {
      label: "Total Patients",
      value: overview?.patients?.total ?? "—",
      icon: Users,
      tone: "primary"
    }, {
      label: "Active Queue",
      value: overview?.queue?.active ?? "—",
      icon: ListChecks,
      tone: "warning"
    }, {
      label: "Pending Leave",
      value: pendingLeave.length,
      icon: CalendarClock,
      tone: "warning"
    }, {
      label: "Emergency Requests",
      value: emergencyRequests.length,
      icon: Ambulance,
      tone: "danger"
    }];
    const kpiTone = {
      primary: "bg-primary-soft text-primary-dark",
      warning: "bg-warning-soft text-amber-700",
      danger: "bg-error-soft text-red-700"
    };
    const apptStatusLabel = {
      booked: "Booked",
      completed: "Completed",
      cancelled: "Cancelled",
      "no-show": "No-show"
    };
    const staffByRole = Object.entries(overview?.staff?.byRole || {});
    const quickActions = [{
      path: "staff",
      label: "Staff Directory",
      icon: Users
    }, {
      path: "departments",
      label: "Departments",
      icon: Building2
    }, {
      path: "wards",
      label: "Wards & Beds",
      icon: BedDouble
    }, {
      path: "leave-requests",
      label: "Leave Requests",
      icon: ClipboardList
    }, {
      path: "announcements",
      label: "Announcements",
      icon: Megaphone
    }, {
      path: "analytics",
      label: "Full Analytics",
      icon: UserCog
    }].filter(a => config.sections.some(s => s.path === a.path));
    return <div className="space-y-5">
          <Greeting />
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpiCards.map(c => <div key={c.label} className="rounded-card border border-slate-200 bg-card p-4">
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-control ${kpiTone[c.tone]}`}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="mt-2.5 text-small font-medium text-text-secondary">{c.label}</div>
                <div className="mt-0.5 text-section-title text-text-primary">{c.value}</div>
              </div>)}
          </div>

          {/* Emergency requests - prominent but not overwhelming */}
          {emergencyRequests.length > 0 && <div className="rounded-card border border-red-200 bg-red-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-red-100 text-red-700">
                    <Ambulance className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-body font-semibold text-text-primary">Emergency requests</div>
                    <div className="text-small text-red-700 font-medium">{emergencyRequests.length} new</div>
                  </div>
                </div>
                <NavLink to={`/${config.role}/ambulance-requests`} className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
                  View requests
                  <ArrowRight className="w-3.5 h-3.5" />
                </NavLink>
              </div>
            </div>}

          {/* Staff breakdown */}
          {staffByRole.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Staff on record</div>
              <div className="flex flex-wrap gap-2">
                {staffByRole.map(([role, count]) => <div key={role} className="flex items-center gap-2 rounded-full border border-slate-200 bg-card px-3.5 py-1.5 text-small">
                    <span className="font-semibold text-text-primary">{count}</span>
                    <span className="text-text-secondary capitalize">{role}</span>
                  </div>)}
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-card px-3.5 py-1.5 text-small">
                  <span className="font-semibold text-text-primary">{overview?.departments?.total ?? 0}</span>
                  <span className="text-text-secondary">departments</span>
                </div>
              </div>
            </div>}

          {/* Recent appointments */}
          <div>
            <div className="mb-sp-2 flex items-center justify-between">
              <div className="text-section-title text-text-primary">Recent appointments</div>
              <NavLink to={`/${config.role}/appointments`} className="text-small font-medium text-primary hover:underline">
                View all
              </NavLink>
            </div>
            {recentAppointments.length === 0 ? <EmptyRow icon={CalendarDays}>No appointments recorded yet.</EmptyRow> : <div className="overflow-x-auto rounded-card border border-slate-200 bg-card">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="border-b border-slate-200 text-text-secondary">
                      <th className="px-4 py-2.5 font-semibold">Time</th>
                      <th className="px-4 py-2.5 font-semibold">Patient</th>
                      <th className="px-4 py-2.5 font-semibold">Doctor</th>
                      <th className="px-4 py-2.5 font-semibold">Department</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map(a => <tr key={a._id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 whitespace-nowrap text-text-primary font-medium">
                          {new Date(a.slotTime).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}
                        </td>
                        <td className="px-4 py-2.5 text-text-primary truncate">{a.patientId?.name || a.patientId?.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.doctorId?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.department?.name || "—"}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={apptStatusLabel[a.status] || a.status} tone={statusTone(a.status)} />
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>}
          </div>

          {announcements.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Announcements</div>
              <div className="space-y-2">
                {announcements.slice(0, 3).map(a => <div key={a._id} className="rounded-card border border-slate-200 bg-card p-4 shadow-card flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-warning-soft text-amber-700">
                      <Megaphone className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-body font-medium text-text-primary truncate">{a.title}</div>
                      <div className="text-small text-text-secondary line-clamp-2">{a.message}</div>
                    </div>
                  </div>)}
              </div>
            </div>}

          {/* Quick actions */}
          {quickActions.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Quick actions</div>
              <div className="grid gap-sp-2 grid-cols-2 lg:grid-cols-3">
                {quickActions.map(a => <NavLink key={a.path} to={`/${config.role}/${a.path}`} className="flex items-center gap-2.5 rounded-control border border-slate-200 bg-card px-3.5 py-3 hover:border-primary/30 hover:bg-slate-50 transition-colors duration-150">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-dark">
                      <a.icon className="w-4 h-4" />
                    </span>
                    <span className="text-small font-medium text-text-primary truncate">{a.label}</span>
                  </NavLink>)}
              </div>
            </div>}
        </div>;
  }
  if (config.role === "doctor") {
    if (loading || !doctorHome) return <SkeletonList count={3} />;
    const {
      todaysAppointments,
      myAdmissions,
      openTickets,
      pendingLeaveCount
    } = doctorHome;
    const kpiCards = [{
      label: "Today's Appointments",
      value: todaysAppointments.length,
      icon: CalendarDays,
      tone: "primary"
    }, {
      label: "My IPD Patients",
      value: myAdmissions.length,
      icon: BedDouble,
      tone: "primary"
    }, {
      label: "Open Tickets",
      value: openTickets.length,
      icon: ClipboardList,
      tone: "warning"
    }, {
      label: "Pending Leave",
      value: pendingLeaveCount,
      icon: CalendarClock,
      tone: "warning"
    }];
    const kpiTone = {
      primary: "bg-primary-soft text-primary-dark",
      warning: "bg-warning-soft text-amber-700"
    };
    const apptStatusLabel = {
      booked: "Booked",
      completed: "Completed",
      cancelled: "Cancelled",
      "no-show": "No-show"
    };
    const quickActions = [{
      path: "appointments",
      label: "My Appointments",
      icon: CalendarDays
    }, {
      path: "clinical",
      label: "Record Vitals",
      icon: Stethoscope
    }, {
      path: "ipd",
      label: "IPD Patients",
      icon: BedDouble
    }, {
      path: "prescriptions",
      label: "Prescriptions",
      icon: ClipboardList
    }].filter(a => config.sections.some(s => s.path === a.path));
    return <div className="space-y-5">
          <Greeting />
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpiCards.map(c => <div key={c.label} className="rounded-card border border-slate-200 bg-card p-4">
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-control ${kpiTone[c.tone]}`}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="mt-2.5 text-small font-medium text-text-secondary">{c.label}</div>
                <div className="mt-0.5 text-section-title text-text-primary">{c.value}</div>
              </div>)}
          </div>

          {/* Today's appointments */}
          <div>
            <div className="mb-sp-2 flex items-center justify-between">
              <div className="text-section-title text-text-primary">Today's appointments</div>
              <NavLink to={`/${config.role}/appointments`} className="text-small font-medium text-primary hover:underline">
                View all
              </NavLink>
            </div>
            {todaysAppointments.length === 0 ? <EmptyRow icon={CalendarDays}>No appointments scheduled for today.</EmptyRow> : <div className="overflow-x-auto rounded-card border border-slate-200 bg-card">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="border-b border-slate-200 text-text-secondary">
                      <th className="px-4 py-2.5 font-semibold">Time</th>
                      <th className="px-4 py-2.5 font-semibold">Token</th>
                      <th className="px-4 py-2.5 font-semibold">Patient</th>
                      <th className="px-4 py-2.5 font-semibold">Department</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysAppointments.slice(0, 8).map(a => <tr key={a._id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 whitespace-nowrap text-text-primary font-medium">
                          {new Date(a.slotTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-text-secondary">
                          {a.dailyToken != null ? <>
                              #{a.dailyToken}
                              {a.slotPosition > 1 && <span className="text-text-secondary/70"> ({a.dailyToken - a.slotPosition}+{a.slotPosition})</span>}
                            </> : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-text-primary truncate">{a.patientId?.name || a.patientId?.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.department?.name || "—"}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={apptStatusLabel[a.status] || a.status} tone={statusTone(a.status)} />
                        </td>
                      </tr>)}
                  </tbody>
                </table>
                {todaysAppointments.length > 8 && <div className="border-t border-slate-100 px-4 py-2.5 text-small text-text-secondary">
                    +{todaysAppointments.length - 8} more today —{" "}
                    <NavLink to={`/${config.role}/appointments`} className="font-medium text-primary hover:underline">
                      view all
                    </NavLink>
                  </div>}
              </div>}
          </div>

          {/* My IPD patients */}
          <div>
            <div className="mb-sp-2 flex items-center justify-between">
              <div className="text-section-title text-text-primary">My IPD patients</div>
              <NavLink to={`/${config.role}/ipd`} className="text-small font-medium text-primary hover:underline">
                View all
              </NavLink>
            </div>
            {myAdmissions.length === 0 ? <EmptyRow icon={BedDouble}>No patients currently admitted under your care.</EmptyRow> : <div className="overflow-x-auto rounded-card border border-slate-200 bg-card">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="border-b border-slate-200 text-text-secondary">
                      <th className="px-4 py-2.5 font-semibold">Patient</th>
                      <th className="px-4 py-2.5 font-semibold">Ward</th>
                      <th className="px-4 py-2.5 font-semibold">Bed</th>
                      <th className="px-4 py-2.5 font-semibold">Admitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAdmissions.slice(0, 8).map(a => <tr key={a._id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 text-text-primary font-medium truncate">{a.patientId?.name || a.patientId?.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.wardId?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.bedNumber || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                          {a.admissionDate ? new Date(a.admissionDate).toLocaleDateString([], {
                    dateStyle: "medium"
                  }) : "—"}
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>}
          </div>

          {announcements.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Announcements from admin</div>
              <div className="space-y-2">
                {announcements.slice(0, 3).map(a => <div key={a._id} className="rounded-card border border-slate-200 bg-card p-4 shadow-card flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-warning-soft text-amber-700">
                      <Megaphone className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-body font-medium text-text-primary truncate">{a.title}</div>
                      <div className="text-small text-text-secondary line-clamp-2">{a.message}</div>
                    </div>
                  </div>)}
              </div>
            </div>}

          {/* Quick actions */}
          {quickActions.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Quick actions</div>
              <div className="grid gap-sp-2 grid-cols-2 lg:grid-cols-4">
                {quickActions.map(a => <NavLink key={a.path} to={`/${config.role}/${a.path}`} className="flex items-center gap-2.5 rounded-control border border-slate-200 bg-card px-3.5 py-3 hover:border-primary/30 hover:bg-slate-50 transition-colors duration-150">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-dark">
                      <a.icon className="w-4 h-4" />
                    </span>
                    <span className="text-small font-medium text-text-primary truncate">{a.label}</span>
                  </NavLink>)}
              </div>
            </div>}
        </div>;
  }
  if (config.role === "nurse") {
    if (loading || !nurseHome) return <SkeletonList count={3} />;
    const {
      admissions,
      occupiedBeds,
      availableBeds,
      openTickets,
      pendingLeaveCount
    } = nurseHome;
    const kpiCards = [{
      label: "Active Admissions",
      value: admissions.length,
      icon: BedDouble,
      tone: "primary"
    }, {
      label: "Available Beds",
      value: availableBeds,
      icon: ListChecks,
      tone: "primary"
    }, {
      label: "Occupied Beds",
      value: occupiedBeds,
      icon: BedDouble,
      tone: "warning"
    }, {
      label: "Open Tickets",
      value: openTickets.length,
      icon: ClipboardList,
      tone: "warning"
    }, {
      label: "Pending Leave",
      value: pendingLeaveCount,
      icon: CalendarClock,
      tone: "warning"
    }];
    const kpiTone = {
      primary: "bg-primary-soft text-primary-dark",
      warning: "bg-warning-soft text-amber-700"
    };
    const quickActions = [{
      path: "ipd",
      label: "Ward & Beds",
      icon: BedDouble
    }, {
      path: "appointment-lookup",
      label: "Appointment Lookup",
      icon: CalendarDays
    }, {
      path: "tickets",
      label: "Assigned Tickets",
      icon: ClipboardList
    }, {
      path: "leave",
      label: "Apply for Leave",
      icon: CalendarDays
    }].filter(a => config.sections.some(s => s.path === a.path));
    return <div className="space-y-5">
          <Greeting />
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpiCards.map(c => <div key={c.label} className="rounded-card border border-slate-200 bg-card p-4">
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-control ${kpiTone[c.tone]}`}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="mt-2.5 text-small font-medium text-text-secondary">{c.label}</div>
                <div className="mt-0.5 text-section-title text-text-primary">{c.value}</div>
              </div>)}
          </div>

          {/* Current admissions */}
          <div>
            <div className="mb-sp-2 flex items-center justify-between">
              <div className="text-section-title text-text-primary">Current admissions</div>
              <NavLink to={`/${config.role}/ipd`} className="text-small font-medium text-primary hover:underline">
                View all
              </NavLink>
            </div>
            {admissions.length === 0 ? <EmptyRow icon={BedDouble}>No patients currently admitted.</EmptyRow> : <div className="overflow-x-auto rounded-card border border-slate-200 bg-card">
                <table className="w-full text-left text-small">
                  <thead>
                    <tr className="border-b border-slate-200 text-text-secondary">
                      <th className="px-4 py-2.5 font-semibold">Patient</th>
                      <th className="px-4 py-2.5 font-semibold">Ward</th>
                      <th className="px-4 py-2.5 font-semibold">Bed</th>
                      <th className="px-4 py-2.5 font-semibold">Doctor</th>
                      <th className="px-4 py-2.5 font-semibold">Admitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.slice(0, 8).map(a => <tr key={a._id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 text-text-primary font-medium truncate">{a.patientId?.name || a.patientId?.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.wardId?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.bedNumber || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary truncate">{a.admittingDoctorId?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                          {a.admissionDate ? new Date(a.admissionDate).toLocaleDateString([], {
                    dateStyle: "medium"
                  }) : "—"}
                        </td>
                      </tr>)}
                  </tbody>
                </table>
                {admissions.length > 8 && <div className="border-t border-slate-100 px-4 py-2.5 text-small text-text-secondary">
                    +{admissions.length - 8} more —{" "}
                    <NavLink to={`/${config.role}/ipd`} className="font-medium text-primary hover:underline">
                      view all
                    </NavLink>
                  </div>}
              </div>}
          </div>

          {announcements.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Announcements from admin</div>
              <div className="space-y-2">
                {announcements.slice(0, 3).map(a => <div key={a._id} className="rounded-card border border-slate-200 bg-card p-4 shadow-card flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-warning-soft text-amber-700">
                      <Megaphone className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-body font-medium text-text-primary truncate">{a.title}</div>
                      <div className="text-small text-text-secondary line-clamp-2">{a.message}</div>
                    </div>
                  </div>)}
              </div>
            </div>}

          {/* Quick actions */}
          {quickActions.length > 0 && <div>
              <div className="mb-sp-2 text-section-title text-text-primary">Quick actions</div>
              <div className="grid gap-sp-2 grid-cols-2 lg:grid-cols-4">
                {quickActions.map(a => <NavLink key={a.path} to={`/${config.role}/${a.path}`} className="flex items-center gap-2.5 rounded-control border border-slate-200 bg-card px-3.5 py-3 hover:border-primary/30 hover:bg-slate-50 transition-colors duration-150">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-dark">
                      <a.icon className="w-4 h-4" />
                    </span>
                    <span className="text-small font-medium text-text-primary truncate">{a.label}</span>
                  </NavLink>)}
              </div>
            </div>}
        </div>;
  }

  // Other staff roles: light KPI strip (reused from their own Tickets / Leave
  // endpoints) plus a quick-actions grid into everything they can do.
  const kpis = [{
    label: "Open tickets",
    value: homeSummary?.openTickets ?? "—",
    icon: ClipboardList,
    tone: "warning"
  }, {
    label: "Pending leave requests",
    value: homeSummary?.pendingLeave ?? "—",
    icon: CalendarDays,
    tone: "primary"
  }];
  const toneClasses = {
    primary: "bg-primary-soft text-primary-dark",
    warning: "bg-warning-soft text-amber-700"
  };

  // A short, static set of practical reminders shown alongside announcements -
  // the kind of thing a front-desk noticeboard would carry every day.
  const usefulInfo = ["Emergency requests submitted from the public website show up instantly under \"Emergency requests\" for admin and reception.", "Leave requests are reviewed by admin - once rejected, you can reapply for the same dates starting the next day.", "Use the staff message board to share shift handover notes with the whole team."].filter(tip => {
    // Only show tips relevant to sections this role actually has.
    if (tip.startsWith("Emergency")) return config.sections.some(s => s.path === "ambulance-requests");
    if (tip.startsWith("Leave")) return config.sections.some(s => s.path === "leave");
    if (tip.startsWith("Use the staff message")) return config.sections.some(s => s.path === "messages");
    return true;
  });
  return <div className="space-y-sp-4">
        <Greeting />
        {config.sections.some(s => s.path === "tickets" || s.path === "leave") && <div className="grid gap-sp-3 grid-cols-2 sm:max-w-md">
            {kpis.map(c => <div key={c.label} className="rounded-card border border-slate-200 bg-card p-5 shadow-card">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-control ${toneClasses[c.tone]}`}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="mt-3 text-small font-medium text-text-secondary">{c.label}</div>
                <div className="mt-1 text-page-title text-text-primary">{c.value}</div>
              </div>)}
          </div>}

        {announcements.length > 0 && <div>
            <div className="mb-sp-2 text-section-title text-text-primary">Announcements from admin</div>
            <div className="space-y-2">
              {announcements.slice(0, 4).map(a => <div key={a._id} className="rounded-card border border-slate-200 bg-card p-4 shadow-card flex items-start gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-warning-soft text-amber-700">
                    <Megaphone className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-body font-medium text-text-primary truncate">{a.title}</div>
                    <div className="text-small text-text-secondary line-clamp-2">{a.message}</div>
                  </div>
                </div>)}
            </div>
          </div>}

        {usefulInfo.length > 0 && <div>
            <div className="mb-sp-2 text-section-title text-text-primary">Useful info</div>
            <div className="rounded-card border border-slate-200 bg-card p-4 shadow-card">
              <ul className="space-y-2">
                {usefulInfo.map((tip, i) => <li key={i} className="flex items-start gap-2.5 text-body text-text-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {tip}
                  </li>)}
              </ul>
            </div>
          </div>}

        <div>
          <div className="mb-sp-2 text-section-title text-text-primary">Quick actions</div>
          <div className="grid gap-sp-2 grid-cols-2 lg:grid-cols-3">
            {quickLinks.map(s => {
          const Icon = iconForSection(s.path);
          return <NavLink key={s.path} to={`/${config.role}/${s.path}`} className="flex items-center gap-3 rounded-card border border-slate-200 bg-card p-4 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary-soft text-primary-dark shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-body font-medium text-text-primary truncate">{s.label}</span>
                </NavLink>;
        })}
          </div>
        </div>
      </div>;
}
