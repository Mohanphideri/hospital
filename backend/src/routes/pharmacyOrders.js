import express from 'express';
import {
  getPrescriptionAvailability,
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderAddress,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  markOrderPaid,
} from '../controllers/pharmacyOrderController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/prescriptions/:prescriptionId/availability', requireRole('patient'), getPrescriptionAvailability);

router.post('/', requireRole('patient'), createOrder);
router.get('/mine', requireRole('patient'), getMyOrders);
router.patch('/:id/address', requireRole('patient'), updateOrderAddress);
router.delete('/:id', requireRole('patient'), cancelOrder);

router.get('/', requireRole('pharmacist', 'admin'), getAllOrders);
router.patch('/:id/status', requireRole('pharmacist', 'admin'), updateOrderStatus);
router.patch('/:id/paid', requireRole('pharmacist', 'admin'), markOrderPaid);

router.get('/:id', requireRole('patient', 'pharmacist', 'admin', 'receptionist'), getOrderById);

export default router;
