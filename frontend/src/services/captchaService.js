

import api from './apiClient.js';

export const captchaService = {
  getNew: () => api.get('/captcha/new'),
  
  
  
  verify: (captchaId, captchaAnswer) => api.post('/captcha/verify', { captchaId, captchaAnswer }),
};
