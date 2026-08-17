import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService, refreshAccessToken } from '../services/api.js';
import { getToken, setToken as setStoredToken, clearToken } from '../services/tokenStore.js';
import { initSocket, disconnectSocket } from '../utils/socket.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // `user` is display-only data (name/role/etc) - not a bearer credential -
  // so caching it in localStorage is fine and lets the UI paint immediately
  // on reload while the session is re-validated in the background below.
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      // Corrupted/stale localStorage value - don't let this crash the whole app on load.
      localStorage.removeItem('user');
      return null;
    }
  });

  // The access token itself is never persisted to localStorage/sessionStorage
  // (see services/tokenStore.js) - it lives only in memory for the lifetime
  // of this tab, so an XSS payload can't simply read it out of browser
  // storage. It's naturally gone on a full page reload; the effect below
  // restores a session afterwards using only the httpOnly refresh cookie.
  const [token, setToken] = useState(() => getToken());
  const [loading, setLoading] = useState(false);

  // True only while we're re-validating a session against the backend on
  // first load (page refresh / app startup) via the httpOnly refresh cookie.
  // Starts true unconditionally so route guards hold off on any redirect
  // decision until this settles - that's what stops a refresh from bouncing
  // straight to /login before we've even asked the backend whether a valid
  // refresh cookie exists.
  const [initializing, setInitializing] = useState(true);

  const login = useCallback((newToken, userData) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget: revoke the refresh-token cookie server-side so this
    // device's session can't be silently refreshed again after logout. We
    // don't block the UI on this - local state clears immediately either way.
    authService.logout().catch(() => {
      // Network error / server down: local session still clears below, and
      // the refresh token will simply expire on its own later. Nothing more
      // useful to do here for the person clicking "logout".
    });
    clearToken();
    setToken(null);
    setUser(null);
    localStorage.removeItem('user');
    disconnectSocket();
  }, []);

  // On first mount, never trust a token from browser storage (there isn't
  // one) - instead ask the backend to exchange the httpOnly refresh-token
  // cookie for a fresh access token, then pull the *current* user record
  // (name/role/active-status) rather than trusting whatever was cached in
  // localStorage. We don't redirect anywhere while this is in flight, and we
  // only clear the session if the backend explicitly says there's no valid
  // refresh cookie / the account no longer exists - never just because the
  // app remounted.
  //
  // This goes through the SAME coalesced refreshAccessToken() the response
  // interceptor uses for 401-triggered refreshes, rather than firing its own
  // independent POST /auth/refresh. That sharing is required, not cosmetic:
  // the refresh token is single-use/rotating, and React StrictMode
  // deliberately double-invokes effects in dev, so two independent refresh
  // calls racing on the same cookie would make the loser look like a
  // replayed/stolen token to the backend - which revokes the *entire*
  // session (including the token the winning call just issued) as a
  // precaution. That previously showed up as "refreshing the page logs the
  // person back out" immediately after a page load. Coalescing means only
  // one physical request is ever made no matter how many times this effect
  // runs, so there's nothing for the backend to see as a replay.
  useEffect(() => {
    let cancelled = false;

    refreshAccessToken()
      .then((newToken) => {
        if (cancelled) return null;
        return authService.getMe().then((response) => {
          if (cancelled) return;
          const { role, user: staffUser, patient } = response.data;
          const restoredUser =
            role === 'patient'
              ? { _id: patient._id, phone: patient.phone, name: patient.name, role: 'patient' }
              : staffUser;

          setToken(newToken);
          setUser(restoredUser);
          localStorage.setItem('user', JSON.stringify(restoredUser));
          // A page refresh loses the in-memory socket connection even though
          // the session itself is still valid - reconnect it here so
          // real-time features (queue updates, ambulance alerts) keep
          // working after reload.
          initSocket(newToken);
        });
      })
      .catch(() => {
        if (cancelled) return;
        // No valid refresh cookie, or it's expired/revoked, or the account
        // was deactivated/removed.
        clearToken();
        setToken(null);
        setUser(null);
        localStorage.removeItem('user');
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally runs once on mount only - login()/logout() manage state afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, login, logout, loading, setLoading, initializing }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
