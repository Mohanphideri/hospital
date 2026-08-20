import express from 'express';
import {
  getMyConsultations,
  getDoctorConsultations,
  joinConsultation,
  startConsultation,
  completeConsultation,
  leaveConsultation,
} from '../controllers/consultationController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/mine', requireRole('patient'), getMyConsultations);
router.get('/doctor', requireRole('doctor'), getDoctorConsultations);

router.post('/:appointmentId/join', requireRole('patient', 'doctor'), joinConsultation);
router.post('/:appointmentId/leave', requireRole('patient', 'doctor'), leaveConsultation);

router.post('/:appointmentId/start', requireRole('doctor'), startConsultation);
router.post('/:appointmentId/complete', requireRole('doctor'), completeConsultation);

export default router;
