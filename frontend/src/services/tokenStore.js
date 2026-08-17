// The short-lived access token is deliberately kept in memory only - never
// in localStorage/sessionStorage. Any XSS that runs in the app's origin can
// read localStorage directly, which would hand over a live bearer token for
// a hospital application handling patient and clinical data. Keeping it in a
// plain module-level variable means it disappears on tab close/reload; the
// httpOnly, Secure refresh-token cookie (set by the backend, never readable
// from JS at all) is what restores a session afterwards - see
// AuthContext.jsx's startup effect, which calls POST /auth/refresh.
let accessToken = null;

export const getToken = () => accessToken;

export const setToken = (token) => {
  accessToken = token || null;
};

export const clearToken = () => {
  accessToken = null;
};
