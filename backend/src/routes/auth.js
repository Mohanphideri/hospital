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

router.post('/patient/send-otp', otpRateLimit, sendOTP);
router.post('/patient/verify-otp', otpRateLimit, requireCaptcha, verifyOTP);

router.post('/msg91-login', otpRateLimit, msg91Login);

router.post('/staff/login', loginRateLimit, requireCaptcha, staffLogin);

router.post('/forgot-password/send-otp', passwordResetRateLimit, forgotPasswordSendOtp);
router.post('/forgot-password/verify-otp', passwordResetRateLimit, forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', passwordResetRateLimit, forgotPasswordReset);

router.post('/refresh', refreshAccessToken);

router.post('/logout', logout);

router.get('/me', authenticate, getCurrentUser);

router.post('/change-password', authenticate, changePassword);

router.get('/sessions', authenticate, listSessions);
router.delete('/sessions/:id', authenticate, revokeSession);
router.post('/sessions/revoke-all', authenticate, revokeAllSessions);

export default router;
