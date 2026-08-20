
import api from './apiClient.js';

export const authService = {
  sendOTP: (phone) => api.post('/auth/patient/send-otp', { phone }),
  verifyOTP: (phone, otp, captchaId, captchaAnswer) =>
    api.post('/auth/patient/verify-otp', { phone, otp, captchaId, captchaAnswer }),
  
  
  
  
  msg91Login: (accessToken) => api.post('/auth/msg91-login', { accessToken }),
  staffLogin: (username, password, captchaId, captchaAnswer) =>
    api.post('/auth/staff/login', { username, password, captchaId, captchaAnswer }),
  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),
  
  forgotPasswordSendOtp: (email) => api.post('/auth/forgot-password/send-otp', { email }),
  forgotPasswordVerifyOtp: (email, otp) => api.post('/auth/forgot-password/verify-otp', { email, otp }),
  forgotPasswordReset: (email, otp, newPassword) =>
    api.post('/auth/forgot-password/reset', { email, otp, newPassword }),
  
  getMe: () => api.get('/auth/me'),
  
  
  
  
  
  
  
  
  
  
  
  logout: () => api.post('/auth/logout'),
  
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeAllOtherSessions: () => api.post('/auth/sessions/revoke-all'),
};
