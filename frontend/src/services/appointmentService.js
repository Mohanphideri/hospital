
import api from './apiClient.js';

export const appointmentService = {
  
  
  bookAppointment: (data) => api.post('/appointments', data),
  
  bookForPatient: (data) => api.post('/appointments/for-patient', data),
  
  getAvailableDoctors: (departmentId, date, time) =>
    api.get('/appointments/available-doctors', { params: { departmentId, date, time } }),
  getMyAppointments: (date) => api.get('/appointments/mine', { params: date ? { date } : {} }),
  getAllAppointments: (filters) => api.get('/appointments', { params: filters }),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  reassignDoctor: (id, doctorId) => api.patch(`/appointments/${id}/assign-doctor`, { doctorId }),
  
  
  assignSlot: (id, doctorId, slotTime) => api.patch(`/appointments/${id}/assign`, { doctorId, slotTime }),
  cancel: (id, reason, note) => api.delete(`/appointments/${id}`, { data: { reason, note } }),
  getCancelReasons: () => api.get('/appointments/cancel-reasons'),
  getByCode: (code) => api.get(`/appointments/lookup/${encodeURIComponent(code)}`),
  
  
  lookupByShortCode: (code) => api.get(`/appointments/lookup-code/${encodeURIComponent(code)}`),
};
