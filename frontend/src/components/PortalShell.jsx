import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import Sidebar from "./Sidebar.jsx";
import TopHeader from "./TopHeader.jsx";
import CommandPalette from "./CommandPalette.jsx";
import PatientChatbot from "./PatientChatbot.jsx";

export default function PortalShell({ config }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const handleLogout = () => {
    setLoggingOut(true);
    logout();
    navigate("/login");
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileNavOpen((open) => !open);
    } else {
      setSidebarVisible((visible) => !visible);
    }
  };

  const handleSelectNavItem = () => {
    if (window.innerWidth >= 768) {
      setSidebarVisible(false);
    }
    setMobileNavOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden flex bg-surface">
      <Sidebar
        config={config}
        user={user}
        sidebarVisible={sidebarVisible || mobileNavOpen}
        onToggleSidebar={handleToggleSidebar}
        onSelectNavItem={handleSelectNavItem}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          config={config}
          user={user}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
        />
        <main className="flex-1 min-h-0 overflow-y-auto p-sp-3 sm:p-sp-4 md:p-sp-5">
          <Outlet context={config} />
        </main>
      </div>

      <CommandPalette config={config} onLogout={handleLogout} />
      {config.role === "patient" && <PatientChatbot />}
    </div>
  );
}
