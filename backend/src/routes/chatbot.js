import express from 'express';
import { sendChatbotMessage, getChatbotSuggestions } from '../controllers/chatbotController.js';
import { chatbotRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Public - no auth. Visitors ask questions before they've ever logged in.
router.post('/message', chatbotRateLimit, sendChatbotMessage);
router.get('/suggestions', getChatbotSuggestions);

export default router;
