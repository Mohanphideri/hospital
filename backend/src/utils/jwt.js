import jwt from 'jsonwebtoken';

// Access tokens are now short-lived (default 15 min) - they're meant to live
// in memory/localStorage and be sent on every request, so a leaked one (XSS,
// a stray log line, a browser extension) is only useful for a short window.
// Long-lived sessions are handled by the separate httpOnly refresh-token
// cookie (see utils/session.js), which can be revoked server-side.
const ACCESS_TOKEN_EXPIRE = process.env.ACCESS_TOKEN_EXPIRE || '15m';

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      username: user.username,
      role: user.role,
      name: user.name,
      mustResetPassword: user.mustResetPassword,
      // Needed server-side (e.g. Socket.IO department-room authorization) to
      // know which department a doctor/nurse/pharmacist actually belongs to
      // without a DB round trip on every socket event.
      department: user.department,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRE }
  );
};

// Kept as an alias so any other call site importing `generateToken` keeps
// working - all new code should prefer issueSession() from utils/session.js,
// which also creates the paired refresh token.
export const generateToken = generateAccessToken;
