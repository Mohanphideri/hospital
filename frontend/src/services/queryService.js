
import api from './apiClient.js';

export const queryService = {
  
  create: (subject, message) => api.post('/queries', { subject, message }),
  getMine: () => api.get('/queries/mine'),
  
  getAll: (status) => api.get('/queries', { params: { status } }),
  
  createOnBehalf: (patientPhone, subject, message) =>
    api.post('/queries/on-behalf', { patientPhone, subject, message }),
  
  getAssigned: () => api.get('/queries/assigned'),
  
  manage: (id, { assignedToId, status } = {}) =>
    api.patch(`/queries/${id}/manage`, { assignedToId, status }),
  
  reply: (id, reply) => api.patch(`/queries/${id}/reply`, { reply }),
  
  patientReply: (id, message) => api.patch(`/queries/${id}/patient-reply`, { message }),
};
