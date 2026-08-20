import express from 'express';
import {
  createQuery,
  createQueryOnBehalf,
  getMyQueries,
  getAllQueries,
  getAssignedQueries,
  manageQuery,
  replyToQuery,
  patientReplyToQuery,
} from '../controllers/queryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('patient'), createQuery);

router.post('/on-behalf', requireRole('receptionist', 'admin'), createQueryOnBehalf);

router.get('/mine', requireRole('patient'), getMyQueries);

router.patch('/:id/patient-reply', requireRole('patient'), patientReplyToQuery);

router.get(
  '/assigned',
  requireRole('doctor', 'nurse', 'receptionist', 'pharmacist'),
  getAssignedQueries
);

router.get('/', requireRole('admin'), getAllQueries);

router.patch('/:id/manage', requireRole('admin'), manageQuery);

router.patch(
  '/:id/reply',
  requireRole('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist'),
  replyToQuery
);

export default router;
