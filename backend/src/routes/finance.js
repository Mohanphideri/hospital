import express from 'express';
import {
  getCashFlow,
  createSalarySlip,
  getSalarySlips,
  markSalaryPaid,
  getMySalarySlips,
} from '../controllers/financeController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get(
  '/my-salary-slips',
  requireRole('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist'),
  getMySalarySlips
);

router.get('/cashflow', requireRole('admin'), getCashFlow);

router.post('/salary-slips', requireRole('admin'), createSalarySlip);
router.get('/salary-slips', requireRole('admin'), getSalarySlips);
router.patch('/salary-slips/:id/pay', requireRole('admin'), markSalaryPaid);

export default router;
