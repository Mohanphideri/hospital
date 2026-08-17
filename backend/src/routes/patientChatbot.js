import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendPatientChatbotMessage } from '../controllers/patientChatbotController.js';

const router = express.Router();
router.use(authenticate, requireRole('patient'));
router.post('/message', sendPatientChatbotMessage);
export default router;
