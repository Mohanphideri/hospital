import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/index.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { showToast } from "../utils/toastBus.js";
import { Monitor, Smartphone, ShieldCheck, ArrowLeft } from "lucide-react";

function deviceLabel(userAgent) {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone/.test(ua)) return "Mobile browser";
  if (/ipad|tablet/.test(ua)) return "Tablet browser";
  return "Desktop browser";
}

function isMobileUA(userAgent) {
  return /mobile|android|iphone|ipad/i.test(userAgent || "");
}

// Section 1's "My devices" screen - implements the chosen concurrent-session

export default function MySessions() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const load = useCallback(() => {
    authService
      .getSessions()
      .then((res) => setSessions(res.data))
      .catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  
  
  
  
  
  const handleRevoke = async (session) => {
    setBusyId(session.id);
    try {
      await authService.revokeSession(session.id);
      if (session.current) {
        showToast("Signed out.", "success");
        logout();
        navigate("/", { replace: true });
        return;
      }
      showToast("Session signed out.", "success");
      load();
    } catch {
      
    } finally {
      setBusyId(null);
    }
  };

  
  
  
  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      await authService.revokeAllOtherSessions();
      showToast("Signed out of all devices.", "success");
      logout();
      navigate("/", { replace: true });
    } catch {
      
    } finally {
      setRevokingAll(false);
    }
  };

  
  
  const handleRevokeOthers = async () => {
    setRevokingAll(true);
    try {
      await authService.revokeAllOtherSessions();
      showToast("Signed out of all other devices.", "success");
      load();
    } catch {
      
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-xl font-bold text-slate-900">My devices</h1>
      <p className="mt-1 text-sm text-slate-500">
        These are the devices currently signed in to your account. If you don't recognize one, sign it out.
      </p>

      {sessions === null && (
        <div className="mt-8 text-sm text-slate-400">Loading sessions...</div>
      )}

      {sessions?.length === 0 && (
        <div className="mt-8 text-sm text-slate-400">No active sessions found.</div>
      )}

      {sessions && sessions.length > 0 && (
        <>
          <div className="mt-6 space-y-3">
            {sessions.map((s) => {
              const Icon = isMobileUA(s.userAgent) ? Smartphone : Monitor;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        {deviceLabel(s.userAgent)}
                        {s.current && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                            <ShieldCheck className="h-3 w-3" /> This device
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {s.ip ? `${s.ip} · ` : ""}
                        Last active {new Date(s.lastUsedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {!s.current ? (
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => handleRevoke(s)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {busyId === s.id ? "Signing out..." : "Sign out"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => handleRevoke(s)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {busyId === s.id ? "Signing out..." : "Sign out of this device"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {sessions.some((s) => !s.current) && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {revokingAll ? "Signing out..." : "Sign out of all devices"}
              </button>
              <button
                type="button"
                onClick={handleRevokeOthers}
                disabled={revokingAll}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {revokingAll ? "Signing out..." : "Sign out of all other devices (stay signed in here)"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
