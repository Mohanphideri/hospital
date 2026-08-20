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

router.get('/doctors/public', getPublicDoctors);

router.use(authenticate);

router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);

router.post('/', requireRole('admin'), addStaff);
router.get('/', requireRole('admin'), getStaff);

router.get('/id/:id', requireRole('admin'), getStaffById);
router.patch('/:id', requireRole('admin'), updateStaff);
router.delete('/:id', requireRole('admin'), deleteStaff);

router.get('/doctors', getDoctors);

export default router;
