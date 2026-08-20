import express from 'express';
import {
  joinQueue,
  getQueueStatus,
  getMyQueueToken,
  updateTokenStatus,
  leaveQueue,
} from '../controllers/queueController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/join', requireRole('patient'), joinQueue);

router.get('/status/:departmentId', getQueueStatus);

router.get('/my-token', getMyQueueToken);

router.patch('/:id/status', requireRole('doctor', 'nurse', 'receptionist', 'admin'), updateTokenStatus);

router.delete('/:id/leave', leaveQueue);

export default router;
