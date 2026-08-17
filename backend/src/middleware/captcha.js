import { verifyCaptcha } from '../utils/captcha.js';

// Applied to public form-submission endpoints (staff login, patient OTP
// verify, ambulance request, appointment booking) so the captcha the
// directive asked to make un-bypassable actually blocks a direct API call,
// not just the browser form. Expects `captchaId` and `captchaAnswer` in the
// request body (alongside whatever else that endpoint needs).
export function requireCaptcha(req, res, next) {
  const { captchaId, captchaAnswer } = req.body || {};

  if (!verifyCaptcha(captchaId, captchaAnswer)) {
    return res.status(400).json({ error: 'Incorrect or expired captcha - please try again.', code: 'CAPTCHA_FAILED' });
  }

  next();
}
