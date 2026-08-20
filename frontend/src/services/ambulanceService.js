

import api from './apiClient.js';

export const ambulanceService = {
  
  
  sendOtp: (phone) => api.post('/ambulance/send-otp', { phone }),
  create: (data, captchaId, captchaAnswer) => api.post('/ambulance', { ...data, captchaId, captchaAnswer }),
  
  getAll: (status) => api.get('/ambulance', { params: { status } }),
  updateStatus: (id, status) => api.patch(`/ambulance/${id}/status`, { status }),
};
