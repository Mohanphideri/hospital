import jwt from 'jsonwebtoken';

const PASSWORD_RESET_ALLOWLIST = new Set([
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/refresh',
]);

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

export const requirePasswordReset = (req, res, next) => {
  const fullPath = `${req.baseUrl}${req.path}`.replace(/\/+$/, '') || req.baseUrl;
  if (req.user?.mustResetPassword && !PASSWORD_RESET_ALLOWLIST.has(fullPath)) {
    return res
      .status(403)
      .json({ error: 'You must change your password before accessing other features' });
  }
  next();
};
