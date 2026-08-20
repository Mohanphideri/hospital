
import api from './apiClient.js';

export const ipdService = {
  getWards: () => api.get('/ipd/wards'),
  createWard: (data) => api.post('/ipd/wards', data),
  deleteWard: (wardId) => api.delete(`/ipd/wards/${wardId}`),
  addBed: (wardId, data) => api.post(`/ipd/wards/${wardId}/beds`, data),
  deleteBed: (wardId, bedId) => api.delete(`/ipd/wards/${wardId}/beds/${bedId}`),
  updateBedStatus: (wardId, bedId, status) =>
    api.patch(`/ipd/wards/${wardId}/beds/${bedId}/status`, { status }),
  admit: (data) => api.post('/ipd/admissions', data),
  getAdmissions: (status) => api.get('/ipd/admissions', { params: { status } }),
  transfer: (id, data) => api.patch(`/ipd/admissions/${id}/transfer`, data),
  discharge: (id, data) => api.patch(`/ipd/admissions/${id}/discharge`, data),
  createBill: (id, data) => api.post(`/ipd/admissions/${id}/bill`, data),
};
