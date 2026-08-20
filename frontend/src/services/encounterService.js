
import api from './apiClient.js';

export const encounterService = {
  create: (data) => api.post('/encounters', data),
  getMine: () => api.get('/encounters/mine'),
  getForAppointment: (appointmentId) => api.get(`/encounters/appointment/${appointmentId}`),
};
