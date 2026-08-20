import { verifyCaptcha } from '../utils/captcha.js';

export function requireCaptcha(req, res, next) {
  const { captchaId, captchaAnswer } = req.body || {};

  if (!verifyCaptcha(captchaId, captchaAnswer)) {
    return res.status(400).json({ error: 'Incorrect or expired captcha - please try again.', code: 'CAPTCHA_FAILED' });
  }

  next();
}
