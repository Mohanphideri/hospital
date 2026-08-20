

import api from './apiClient.js';

export const consultationService = {
  getMine: () => api.get('/consultations/mine'),
  getForDoctor: () => api.get('/consultations/doctor'),
  join: (appointmentId) => api.post(`/consultations/${appointmentId}/join`),
  start: (appointmentId) => api.post(`/consultations/${appointmentId}/start`),
  complete: (appointmentId) => api.post(`/consultations/${appointmentId}/complete`),
  leave: (appointmentId) => api.post(`/consultations/${appointmentId}/leave`),
};
