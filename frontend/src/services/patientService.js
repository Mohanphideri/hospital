
import api from './apiClient.js';

export const patientService = {
  getMyProfile: () => api.get('/patients/me'),
  updateMyProfile: (data) => api.patch('/patients/me', data),
  findByPhone: (phone) => api.get(`/patients/by-phone/${encodeURIComponent(phone)}`),
  search: (q) => api.get('/patients/search', { params: { q } }),
};
