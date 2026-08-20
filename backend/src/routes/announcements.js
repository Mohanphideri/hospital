import express from 'express';
import {
  getPublicAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/public', getPublicAnnouncements);

router.use(authenticate);

router.get('/', requireRole('admin'), getAllAnnouncements);
router.post('/', requireRole('admin'), createAnnouncement);
router.patch('/:id/toggle', requireRole('admin'), toggleAnnouncement);
router.delete('/:id', requireRole('admin'), deleteAnnouncement);

export default router;
