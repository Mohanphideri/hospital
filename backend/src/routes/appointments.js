import express from 'express';
import {
  bookAppointment,
  bookAppointmentForPatient,
  getAvailableDoctorsForSlot,
  getMyAppointments,
  getAllAppointments,
  getAvailableSlots,
  updateAppointmentStatus,
  reassignDoctor,
  assignAppointmentSlot,
  cancelAppointment,
  getAppointmentByCode,
  lookupAppointmentsByShortCode,
  getCancelReasons,
} from '../controllers/appointmentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('patient'), bookAppointment);

router.post('/for-patient', requireRole('receptionist', 'admin'), bookAppointmentForPatient);

router.get(
  '/available-doctors',
  requireRole('receptionist', 'admin'),
  getAvailableDoctorsForSlot
);

router.get('/available-slots', getAvailableSlots);

router.get('/cancel-reasons', getCancelReasons);

router.get('/mine', getMyAppointments);

router.get('/lookup/:code', getAppointmentByCode);

router.get(
  '/lookup-code/:code',
  requireRole('admin', 'receptionist', 'doctor', 'nurse', 'pharmacist'),
  lookupAppointmentsByShortCode
);

router.get('/', requireRole('admin', 'receptionist'), getAllAppointments);

router.patch(
  '/:id/status',
  requireRole('admin', 'doctor', 'nurse', 'receptionist'),
  updateAppointmentStatus
);

router.patch('/:id/assign-doctor', requireRole('admin', 'receptionist'), reassignDoctor);

router.patch('/:id/assign', requireRole('admin', 'receptionist'), assignAppointmentSlot);

router.delete('/:id', cancelAppointment);

export default router;
