

import api from './apiClient.js';

export const announcementService = {
  getPublic: () => api.get('/announcements/public'),
  getAll: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
  toggle: (id) => api.patch(`/announcements/${id}/toggle`),
  delete: (id) => api.delete(`/announcements/${id}`),
};
