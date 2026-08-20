import express from 'express';
import {
  createStaffMessage,
  getStaffMessages,
  deleteStaffMessage,
} from '../controllers/staffMessageController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

const STAFF_ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist'];

router.post('/', requireRole(...STAFF_ROLES), createStaffMessage);
router.get('/', requireRole(...STAFF_ROLES), getStaffMessages);
router.delete('/:id', requireRole(...STAFF_ROLES), deleteStaffMessage);

export default router;
