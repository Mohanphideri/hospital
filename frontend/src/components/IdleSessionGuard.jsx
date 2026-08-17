import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import Modal from './Modal.jsx';

// Idle timeout per Section 1: staff portals touch PII and controlled
// substances so they get a tighter window than the patient portal.
const STAFF_IDLE_MINUTES = 15;
const PATIENT_IDLE_MINUTES = 30;
const WARNING_BEFORE_MINUTES = 1;

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

// Mounted once near the root, active for the whole app whenever someone is
// authenticated. Tracks real user activity (not network activity - a
// dashboard auto-refreshing in the background must NOT count as "still
// here") and forces a logout after the idle window, showing a "you're about
// to be signed out" warning with a chance to stay signed in during the final
// minute, per Section 1's requirement.
export default function IdleSessionGuard() {
  const { isAuthenticated, user, logout } = useAuth();
  const idleMinutes = user?.role === 'patient' ? PATIENT_IDLE_MINUTES : STAFF_IDLE_MINUTES;
  const idleMs = idleMinutes * 60 * 1000;
  const warningMs = WARNING_BEFORE_MINUTES * 60 * 1000;

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_BEFORE_MINUTES * 60);

  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const clearAllTimers = () => {
    clearTimeout(warningTimerRef.current);
    clearTimeout(logoutTimerRef.current);
    clearInterval(countdownIntervalRef.current);
  };

  const scheduleTimers = useCallback(() => {
    clearAllTimers();
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(WARNING_BEFORE_MINUTES * 60);
      countdownIntervalRef.current = setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, idleMs - warningMs);

    logoutTimerRef.current = setTimeout(() => {
      setShowWarning(false);
      logout();
    }, idleMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleMs, warningMs, logout]);

  const registerActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      // Any activity while the warning is up counts as "stay signed in" too -
      // the explicit button below is just the obvious affordance for someone
      // who's stepped away and is now looking at the modal specifically.
      setShowWarning(false);
    }
    scheduleTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleTimers, showWarning]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    scheduleTimers();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, registerActivity, { passive: true }));

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, registerActivity));
    };
    // Deliberately NOT depending on registerActivity/scheduleTimers on every
    // render - only re-run when auth state or the idle window itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, idleMs]);

  if (!isAuthenticated) return null;

  return (
    <Modal
      open={showWarning}
      onClose={() => registerActivity()}
      title="Still there?"
      subtitle="You've been inactive for a while."
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          For your security, you'll be signed out automatically in{' '}
          <span className="font-semibold text-slate-900">{secondsLeft}s</span> due to inactivity.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => registerActivity()}
            className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={() => {
              setShowWarning(false);
              logout();
            }}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Sign out now
          </button>
        </div>
      </div>
    </Modal>
  );
}
