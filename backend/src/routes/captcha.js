import express from 'express';
import { issueCaptcha, verifyCaptcha } from '../utils/captcha.js';
import { captchaRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.get('/new', captchaRateLimit, (req, res) => {
  const { id, svg } = issueCaptcha();
  res.json({ captchaId: id, svg });
});

router.post('/verify', captchaRateLimit, (req, res) => {
  const { captchaId, captchaAnswer } = req.body || {};
  if (!verifyCaptcha(captchaId, captchaAnswer)) {
    return res.status(400).json({ error: 'Incorrect or expired captcha - please try again.', code: 'CAPTCHA_FAILED' });
  }
  res.json({ verified: true });
});

export default router;
