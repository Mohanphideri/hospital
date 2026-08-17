import express from 'express';
import {
  getMyPatientProfile,
  updateMyPatientProfile,
  findPatientByPhone,
  searchPatients,
  createPatient,
} from '../controllers/patientController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', requireRole('patient'), getMyPatientProfile);
router.patch('/me', requireRole('patient'), updateMyPatientProfile);

// Doctor / nurse / receptionist / admin: look up a patient by phone (e.g. for IPD admission)
router.get(
  '/by-phone/:phone',
  requireRole('doctor', 'nurse', 'receptionist', 'admin'),
  findPatientByPhone
);

// Doctor / nurse / receptionist / admin: search patients by name/phone/email
router.get('/search', requireRole('doctor', 'nurse', 'receptionist', 'admin'), searchPatients);

// Receptionist / admin: create a new patient profile (walk-in / phone booking)
router.post('/', requireRole('receptionist', 'admin'), createPatient);

export default router;
