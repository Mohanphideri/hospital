import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/', getAuditLogs);

export default router;
