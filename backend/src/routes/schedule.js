import express from 'express';
import {
  setDoctorSlots,
  getDoctorSlots,
  getMyDoctorSlots,
  getAvailableSlotsForBooking,
} from '../controllers/scheduleController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/available', requireRole('patient'), getAvailableSlotsForBooking);

router.get('/mine', requireRole('doctor'), getMyDoctorSlots);

router.get('/doctor/:doctorId', requireRole('admin'), getDoctorSlots);
router.put('/doctor/:doctorId', requireRole('admin'), setDoctorSlots);

export default router;
