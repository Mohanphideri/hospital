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

router.post('/send-otp', otpRateLimit, sendAmbulanceOtp);
router.post('/', ambulanceRateLimit, requireCaptcha, createAmbulanceRequest);

router.get('/', authenticate, requireRole('receptionist', 'admin'), getAmbulanceRequests);
router.patch('/:id/status', authenticate, requireRole('receptionist', 'admin'), updateAmbulanceRequestStatus);

export default router;
