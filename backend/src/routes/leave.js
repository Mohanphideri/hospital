import express from 'express';
import {
  applyForLeave,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  getLeaveHistory,
  getLeaveConflicts,
  approveLeaveRequest,
  rejectLeaveRequest,
} from '../controllers/leaveController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('doctor', 'nurse', 'receptionist', 'pharmacist'), applyForLeave);

router.get('/mine', getMyLeaveRequests);

router.get('/', requireRole('admin'), getPendingLeaveRequests);

router.get('/history', requireRole('admin'), getLeaveHistory);

router.get('/:id/conflicts', requireRole('admin'), getLeaveConflicts);

router.patch('/:id/approve', requireRole('admin'), approveLeaveRequest);

router.patch('/:id/reject', requireRole('admin'), rejectLeaveRequest);

export default router;
