import express from 'express';
import {
  addStaff,
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  getDoctors,
  getPublicDoctors,
  getMyProfile,
  updateMyProfile,
} from '../controllers/staffController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Public: safe, non-sensitive doctor directory for the marketing landing page.
// Declared before authenticate so it never requires a login.
router.get('/doctors/public', getPublicDoctors);

// All routes below require authentication
router.use(authenticate);

// Self-service profile (any authenticated staff/doctor)
router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);

// Admin only
router.post('/', requireRole('admin'), addStaff);
router.get('/', requireRole('admin'), getStaff);
// Staff-by-ID returns the full HR/personal record (DOB, address, emergency
// contact, blood group, salary, employee ID, etc.) - restricted to admins.
// Any authenticated staff member who just needs another colleague's basic
// professional info should use /doctors (which returns a minimized DTO for
// non-admin callers - see getDoctors below); self-service is /me.
router.get('/id/:id', requireRole('admin'), getStaffById);
router.patch('/:id', requireRole('admin'), updateStaff);
router.delete('/:id', requireRole('admin'), deleteStaff);

// Public staff endpoints
router.get('/doctors', getDoctors);

export default router;
