import jwt from 'jsonwebtoken';

// Routes a mustResetPassword-flagged account is still allowed to hit. Full
// paths (req.baseUrl + req.path) so this is correct regardless of how a
// given router is mounted.
const PASSWORD_RESET_ALLOWLIST = new Set([
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/refresh',
]);

// authenticate() is applied via `router.use(authenticate)` at the top of
// every protected router (see routes/*.js) - meaning it is the ONE place
// that runs on every single mutating and read route in the app. That's why
// the mustResetPassword check lives inside it rather than as a separate
// opt-in middleware: a separate middleware can be forgotten on a route; this
// cannot; this closes the exact bypass the production-readiness audit called
// out ("must be tested against every mutating route, not just the ones
// someone remembered to check manually").
export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (decoded.mustResetPassword) {
      const fullPath = `${req.baseUrl}${req.path}`.replace(/\/+$/, '') || req.baseUrl;
      if (!PASSWORD_RESET_ALLOWLIST.has(fullPath)) {
        return res
          .status(403)
          .json({ error: 'You must change your password before accessing other features' });
      }
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Kept for backward compatibility / explicit use in tests (Section 8's
// permission-matrix test suite asserts this behavior directly), but it is no
// longer required to be manually wired into routes - authenticate() above
// already enforces it everywhere.
export const requirePasswordReset = (req, res, next) => {
  const fullPath = `${req.baseUrl}${req.path}`.replace(/\/+$/, '') || req.baseUrl;
  if (req.user?.mustResetPassword && !PASSWORD_RESET_ALLOWLIST.has(fullPath)) {
    return res
      .status(403)
      .json({ error: 'You must change your password before accessing other features' });
  }
  next();
};
