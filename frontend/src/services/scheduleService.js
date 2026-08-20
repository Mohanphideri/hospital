
import api from './apiClient.js';

export const scheduleService = {
  
  getAvailable: (departmentId, date) =>
    api.get('/schedule/available', { params: { departmentId, date } }),
  
  getMine: () => api.get('/schedule/mine'),
  
  getForDoctor: (doctorId) => api.get(`/schedule/doctor/${doctorId}`),
  setForDoctor: (doctorId, departmentId, dayOfWeek, times) =>
    api.put(`/schedule/doctor/${doctorId}`, { departmentId, dayOfWeek, times }),
};
