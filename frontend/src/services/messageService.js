

import api from './apiClient.js';

export const messageService = {
  getAll: () => api.get('/messages'),
  create: (message) => api.post('/messages', { message }),
  delete: (id) => api.delete(`/messages/${id}`),
};
