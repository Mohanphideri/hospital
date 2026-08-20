
import api from './apiClient.js';

export const staffService = {
  addStaff: (staffData) => api.post('/staff', staffData),
  getStaff: (role) => api.get('/staff', { params: { role } }),
  updateStaff: (id, data) => api.patch(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),
  getDoctors: (departmentId) => api.get('/staff/doctors', { params: { departmentId } }),
  getMyProfile: () => api.get('/staff/me'),
  updateMyProfile: (data) => api.patch('/staff/me', data),
};
