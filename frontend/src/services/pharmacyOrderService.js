

import api from './apiClient.js';

export const pharmacyOrderService = {
  
  
  getAvailability: (prescriptionId) => api.get(`/pharmacy-orders/prescriptions/${prescriptionId}/availability`),
  
  create: (data) => api.post('/pharmacy-orders', data),
  getMine: () => api.get('/pharmacy-orders/mine'),
  getById: (id) => api.get(`/pharmacy-orders/${id}`),
  updateAddress: (id, deliveryAddress) => api.patch(`/pharmacy-orders/${id}/address`, { deliveryAddress }),
  cancel: (id, reason) => api.delete(`/pharmacy-orders/${id}`, { data: { reason } }),

  
  getAll: (filters) => api.get('/pharmacy-orders', { params: filters }),
  updateStatus: (id, status, reason) => api.patch(`/pharmacy-orders/${id}/status`, { status, reason }),
  markPaid: (id) => api.patch(`/pharmacy-orders/${id}/paid`),
};
