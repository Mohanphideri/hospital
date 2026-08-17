import express from 'express';
import {
  sendAmbulanceOtp,
  createAmbulanceRequest,
  getAmbulanceRequests,
  updateAmbulanceRequestStatus,
} from '../controllers/ambulanceController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requireCaptcha } from '../middleware/captcha.js';
import { ambulanceRateLimit, otpRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Public - no auth. An emergency request must never be gated behind a login screen.
// Phone verification (OTP) is still public/no-login - it just confirms the
// number is real before dispatch is requested.
router.post('/send-otp', otpRateLimit, sendAmbulanceOtp);
router.post('/', ambulanceRateLimit, requireCaptcha, createAmbulanceRequest);

// Reception / admin: view and action requests
router.get('/', authenticate, requireRole('receptionist', 'admin'), getAmbulanceRequests);
router.patch('/:id/status', authenticate, requireRole('receptionist', 'admin'), updateAmbulanceRequestStatus);

export default router;
