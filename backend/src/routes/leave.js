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

// Staff: apply for leave
router.post('/', requireRole('doctor', 'nurse', 'receptionist', 'pharmacist'), applyForLeave);

// Staff: get my leave requests
router.get('/mine', getMyLeaveRequests);

// Admin: get pending leave requests
router.get('/', requireRole('admin'), getPendingLeaveRequests);

// Admin: get decided (approved/rejected) leave requests across all staff
router.get('/history', requireRole('admin'), getLeaveHistory);

// Admin: check appointment conflicts before approving
router.get('/:id/conflicts', requireRole('admin'), getLeaveConflicts);

// Admin: approve leave
router.patch('/:id/approve', requireRole('admin'), approveLeaveRequest);

// Admin: reject leave
router.patch('/:id/reject', requireRole('admin'), rejectLeaveRequest);

export default router;
