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

// Patient: join queue
router.post('/join', requireRole('patient'), joinQueue);

// Get queue status for a department
router.get('/status/:departmentId', getQueueStatus);

// Patient: get their queue token
router.get('/my-token', getMyQueueToken);

// Staff only: call the next token / change its status ("call next" moves the queue
// along). A patient must never be able to change any patient's queue status.
router.patch('/:id/status', requireRole('doctor', 'nurse', 'receptionist', 'admin'), updateTokenStatus);

// Patient: leave queue (ownership is enforced in the controller - staff may also remove
// a token, e.g. a no-show).
router.delete('/:id/leave', leaveQueue);

export default router;
