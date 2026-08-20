import express from 'express';
import {
  createBill,
  getBills,
  getMyBills,
  getBillableItems,
  markBillPaid,
} from '../controllers/billingController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('receptionist', 'admin'), createBill);

router.get('/my-bills', requireRole('patient'), getMyBills);

router.get('/', requireRole('receptionist', 'admin'), getBills);

router.get(
  '/billable/:code',
  requireRole('receptionist', 'admin'),
  getBillableItems
);

router.patch('/:id/pay', requireRole('receptionist', 'admin'), markBillPaid);

export default router;
