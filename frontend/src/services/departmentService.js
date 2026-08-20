
import api from './apiClient.js';

export const departmentService = {
  getAll: () => api.get('/departments'),
  create: (name) => api.post('/departments', { name }),
  assignDoctor: (id, doctorId) => api.patch(`/departments/${id}/assign-doctor`, { doctorId }),
  removeDoctor: (id, doctorId) => api.patch(`/departments/${id}/remove-doctor`, { doctorId }),
};
