import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, ChevronDown, UserCircle, LogOut, Monitor } from "lucide-react";
import NotificationCenter from "./NotificationCenter.jsx";
import MessagesPopover from "./MessagesPopover.jsx";
import { iconForSection } from "../utils/navGroups.js";

export default function TopHeader({ config, user, onToggleSidebar, onLogout }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = query.trim()
    ? config.sections.filter((s) => s.label.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  return (
    <header className="h-16 shrink-0 sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4 md:px-6">
      <button
        onClick={onToggleSidebar}
        className="shrink-0 rounded-control p-2 text-text-primary hover:bg-slate-100 transition-colors duration-150"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Global search */}
      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Search this portal..."
          className="w-full rounded-control border border-slate-200 bg-surface pl-9 pr-4 py-2 text-body text-text-primary placeholder:text-text-secondary focus:border-primary/50 focus:outline-none transition-colors duration-150"
        />

        {searchOpen && matches.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 rounded-card bg-white border border-slate-200 shadow-popover overflow-hidden animate-scaleIn">
            {matches.map((s) => {
              const Icon = iconForSection(s.path);
              return (
                <button
                  key={s.path}
                  onClick={() => {
                    navigate(`/${config.role}/${s.path}`);
                    setQuery("");
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-body text-text-primary hover:bg-slate-50 transition-colors duration-150"
                >
                  <Icon className="w-4 h-4 text-text-secondary shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Single-location deployment - no branch switcher until multi-location data exists */}
      <div className="hidden sm:flex items-center gap-2 rounded-control px-3 py-2 text-small font-medium text-text-secondary">
        HeartStone Hospital
      </div>

      {/* Messages */}
      {config.sections.some((s) => s.path === "messages") && <MessagesPopover config={config} />}

      <NotificationCenter config={config} />

      {/* User menu */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => setUserMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-control pl-1.5 pr-2 py-1.5 hover:bg-slate-100 transition-colors duration-150"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-small font-semibold">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </span>
          <span className="hidden md:block text-body font-medium text-text-primary max-w-[10rem] truncate">
            {user?.name || "Account"}
          </span>
          <ChevronDown className="hidden md:block w-3.5 h-3.5 text-text-secondary" />
        </button>
        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-card bg-white border border-slate-200 shadow-popover overflow-hidden animate-scaleIn">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-body font-medium text-text-primary truncate">{user?.name}</div>
              <div className="text-small text-text-secondary truncate">{config.label} · {user?.username || user?.phone || ""}</div>
            </div>
            {config.sections.some((s) => s.path === "profile") && (
              <button
                onClick={() => {
                  navigate(`/${config.role}/profile`);
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-body text-text-primary hover:bg-slate-50 transition-colors duration-150"
              >
                <UserCircle className="w-4 h-4 text-text-secondary" />
                My profile
              </button>
            )}
            <button
              onClick={() => {
                navigate(`/account/sessions`);
                setUserMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-body text-text-primary hover:bg-slate-50 transition-colors duration-150"
            >
              <Monitor className="w-4 h-4 text-text-secondary" />
              My devices
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-body text-error hover:bg-error/5 transition-colors duration-150"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
