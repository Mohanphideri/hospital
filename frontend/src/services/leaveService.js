
import api from './apiClient.js';

export const leaveService = {
  apply: (fromDate, toDate, reason, extra = {}) =>
    api.post('/leave', { fromDate, toDate, reason, ...extra }),
  getMine: () => api.get('/leave/mine'),
  getPending: () => api.get('/leave'),
  getHistory: () => api.get('/leave/history'),
  approve: (id, force) => api.patch(`/leave/${id}/approve`, { force }),
  reject: (id, rejectionReason) => api.patch(`/leave/${id}/reject`, { rejectionReason }),
};
