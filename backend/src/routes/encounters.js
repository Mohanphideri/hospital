import express from 'express';
import {
  createEncounter,
  updateEncounter,
  getEncountersForPatient,
  getMyEncounters,
  getEncountersForAppointment,
  getEncountersForAdmission,
} from '../controllers/encounterController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('doctor'), createEncounter);

router.patch('/:id', requireRole('doctor', 'admin'), updateEncounter);

router.get('/mine', requireRole('patient'), getMyEncounters);

router.get('/patient/:patientId', requireRole('doctor', 'nurse', 'admin'), getEncountersForPatient);

router.get(
  '/appointment/:appointmentId',
  requireRole('doctor', 'nurse', 'receptionist', 'admin'),
  getEncountersForAppointment
);
router.get(
  '/admission/:admissionId',
  requireRole('doctor', 'nurse', 'receptionist', 'admin'),
  getEncountersForAdmission
);

export default router;
