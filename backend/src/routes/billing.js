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

// Receptionist / admin: generate a bill for an appointment
router.post('/', requireRole('receptionist', 'admin'), createBill);

// Patient: view own bills
router.get('/my-bills', requireRole('patient'), getMyBills);

// Receptionist / admin: view bills (list + filters)
router.get('/', requireRole('receptionist', 'admin'), getBills);

// Receptionist / admin: pull billable items (prescription + fees) for an appointment code
router.get(
  '/billable/:code',
  requireRole('receptionist', 'admin'),
  getBillableItems
);

// Receptionist / admin: mark a bill paid
router.patch('/:id/pay', requireRole('receptionist', 'admin'), markBillPaid);

export default router;
