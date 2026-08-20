import express from 'express';
import { sendChatbotMessage, getChatbotSuggestions } from '../controllers/chatbotController.js';
import { chatbotRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/message', chatbotRateLimit, sendChatbotMessage);
router.get('/suggestions', getChatbotSuggestions);

export default router;
