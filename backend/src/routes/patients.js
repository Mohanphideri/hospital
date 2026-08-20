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

router.get(
  '/by-phone/:phone',
  requireRole('doctor', 'nurse', 'receptionist', 'admin'),
  findPatientByPhone
);

router.get('/search', requireRole('doctor', 'nurse', 'receptionist', 'admin'), searchPatients);

router.post('/', requireRole('receptionist', 'admin'), createPatient);

export default router;
