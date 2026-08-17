import express from 'express';
import { issueCaptcha, verifyCaptcha } from '../utils/captcha.js';
import { captchaRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Public - issues a new captcha challenge. Returns an SVG image and an id;
// the plaintext code is never sent to the client (see utils/captcha.js).
// The frontend posts { captchaId, captchaAnswer } back alongside the actual
// form submission (login, booking, ambulance request), where requireCaptcha
// middleware verifies and consumes it.
router.get('/new', captchaRateLimit, (req, res) => {
  const { id, svg } = issueCaptcha();
  res.json({ captchaId: id, svg });
});

// Public - standalone verification for flows that don't post straight to
// one of our own protected action routes (e.g. the patient booking page
// gates the outbound MSG91 "send OTP" call - which goes directly from the
// browser to MSG91, not through our backend - behind a real server-checked
// captcha instead of the old client-only one). Same single-use/expiry rules
// as requireCaptcha; consumes the challenge either way.
router.post('/verify', captchaRateLimit, (req, res) => {
  const { captchaId, captchaAnswer } = req.body || {};
  if (!verifyCaptcha(captchaId, captchaAnswer)) {
    return res.status(400).json({ error: 'Incorrect or expired captcha - please try again.', code: 'CAPTCHA_FAILED' });
  }
  res.json({ verified: true });
});

export default router;
