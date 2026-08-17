import express from 'express';
import {
  sendOTP,
  verifyOTP,
  msg91Login,
  staffLogin,
  changePassword,
  getCurrentUser,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  forgotPasswordReset,
  refreshAccessToken,
  logout,
  listSessions,
  revokeSession,
  revokeAllSessions,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { requireCaptcha } from '../middleware/captcha.js';
import { loginRateLimit, otpRateLimit, passwordResetRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Patient OTP flow (demo mode - unchanged)
router.post('/patient/send-otp', otpRateLimit, sendOTP);
router.post('/patient/verify-otp', otpRateLimit, requireCaptcha, verifyOTP);

// Patient OTP flow (real mode - MSG91 OTP Widget). Frontend runs the
// send/verify OTP steps directly against the MSG91 widget; this just
// exchanges the resulting verified access-token for our own JWT.
router.post('/msg91-login', otpRateLimit, msg91Login);

// Staff login
router.post('/staff/login', loginRateLimit, requireCaptcha, staffLogin);

// Forgot password (staff accounts only) - email OTP via Brevo
router.post('/forgot-password/send-otp', passwordResetRateLimit, forgotPasswordSendOtp);
router.post('/forgot-password/verify-otp', passwordResetRateLimit, forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', passwordResetRateLimit, forgotPasswordReset);

// Exchange the httpOnly refresh-token cookie for a new short-lived access
// token (rotates the refresh token too). No `authenticate` here - the whole
// point is this works even after the access token has expired.
router.post('/refresh', refreshAccessToken);

// Revoke this device's refresh token + clear the cookie. Doesn't require a
// still-valid access token (a stale/expired one shouldn't block logout).
router.post('/logout', logout);

// Restore session on page refresh / app startup - re-validates against the DB
router.get('/me', authenticate, getCurrentUser);

// Change password (for all authenticated users)
router.post('/change-password', authenticate, changePassword);

// "My devices" - list/revoke individual sessions, or sign out everywhere else.
router.get('/sessions', authenticate, listSessions);
router.delete('/sessions/:id', authenticate, revokeSession);
router.post('/sessions/revoke-all', authenticate, revokeAllSessions);

export default router;
