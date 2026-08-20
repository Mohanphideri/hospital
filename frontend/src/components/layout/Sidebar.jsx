import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { ChevronDown, LogOut, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import HeartMark from "../ui/HeartMark";
import Spinner from "../ui/Spinner";
import { groupSections, iconForSection } from "../../utils/navGroups.js";
import { useAmbulanceAlerts } from "../../contexts/AmbulanceAlertContext.jsx";

export default function Sidebar({ config, user, sidebarVisible, onToggleSidebar, onSelectNavItem, mobileOpen, onCloseMobile, onLogout, loggingOut }) {
  const groups = groupSections(config.sections, config.role);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const { unreadCount, clearUnread } = useAmbulanceAlerts();

  const toggleGroup = (key) => setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  
  
  
  
  const portalLabel = config.portalLabel || `${config.label} Portal`;

  
  
  
  
  
  const sidebarTagline = user?.name
    ? [user.name, user.designation].filter(Boolean).join(" · ")
    : config.tagline;

  const handleNavClick = (path) => {
    onCloseMobile();
    onSelectNavItem();
    if (path === "ambulance-requests") clearUnread();
  };

  const homePath = config.sections.find((section) => section.path === "home" || section.path === "analytics")?.path || config.sections[0]?.path || "home";
  const isOpen = sidebarVisible || mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`shrink-0 bg-white/95 text-[#172033] flex flex-col fixed md:sticky inset-y-0 left-0 z-50 border-r border-gray-200 shadow-[10px_0_30px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out overflow-hidden ${
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
        } ${sidebarVisible ? "md:w-72" : "md:w-0"} w-72`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-200 shrink-0">
          <Link to={`/${config.role}/${homePath}`} className="flex items-center gap-2.5 min-w-0">
            <HeartMark size={26} />
            {isOpen && (
              <div className="leading-tight min-w-0">
                <div className="text-card-title text-[#172033] truncate">HeartStone</div>
                <div className="text-[10px] tracking-wider uppercase text-slate-400">Hospital Suite</div>
              </div>
            )}
          </Link>
          <button onClick={onToggleSidebar} className="hidden md:flex rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-[#172033] transition-colors duration-150" aria-label="Hide sidebar">
            {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <button onClick={onCloseMobile} className="md:hidden text-slate-400 hover:text-[#172033] p-1" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isOpen && (
          <div className="px-4 py-3 border-b border-gray-200 shrink-0">
            <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">{portalLabel}</div>
            <div className="text-small font-medium text-[#172033] mt-0.5 truncate">{sidebarTagline}</div>
          </div>
        )}

        <nav
          className="flex-1 min-h-0 px-2.5 py-3 space-y-3 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(148,163,184,0.4) transparent" }}
        >
          {groups.map((group) => {
            const isCollapsed = collapsedGroups[group.key];
            return (
              <div key={group.key}>
                {isOpen && (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors duration-150"
                  >
                    {group.label}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                )}
                {!isCollapsed && (
                  <div className="space-y-1 mt-0.5">
                    {group.items.map((s) => {
                      const Icon = iconForSection(s.path);
                      
                      
                      
                      
                      
                      
                      const isCrimson = config.accent === "crimson";
                      const activeClasses = isCrimson
                        ? "bg-crimson/10 text-crimson-dark"
                        : "bg-navy/10 text-navy";
                      const hoverClasses = isCrimson
                        ? "hover:bg-crimson/10 hover:text-crimson-dark"
                        : "hover:bg-navy/10 hover:text-navy";
                      const activeDot = isCrimson ? "bg-crimson" : "bg-navy";
                      const iconActive = isCrimson ? "text-crimson" : "text-navy";
                      const iconHover = isCrimson ? "group-hover:text-crimson" : "group-hover:text-navy";
                      return (
                        <NavLink
                          key={s.path}
                          to={`/${config.role}/${s.path}`}
                          onClick={() => handleNavClick(s.path)}
                          className={({ isActive }) =>
                            `group relative flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-body transition-all duration-200 ${
                              isActive
                                ? `${activeClasses} font-semibold shadow-sm`
                                : `text-slate-600 ${hoverClasses}`
                            } ${isOpen ? "justify-between" : "justify-center"}`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full ${activeDot}`} />
                              )}
                              <span className="flex items-center gap-3 min-w-0">
                                <Icon
                                  className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                    isActive ? iconActive : `text-slate-500 ${iconHover}`
                                  }`}
                                />
                                {isOpen && <span className="truncate">{s.label}</span>}
                              </span>
                              {isOpen && s.path === "ambulance-requests" && unreadCount > 0 && (
                                <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${activeDot}`}>
                                  {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-2.5 py-3 border-t border-gray-200 shrink-0 space-y-1">
          <button
            onClick={onLogout}
            disabled={loggingOut}
            className={`w-full flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-body text-slate-500 hover:bg-slate-50 hover:text-[#172033] transition-colors duration-150 disabled:opacity-60 ${
              isOpen ? "" : "justify-center"
            }`}
          >
            {loggingOut ? <Spinner size={16} /> : <LogOut className="w-4 h-4" />}
            {isOpen && <span>{loggingOut ? "Signing out..." : "Log out"}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
