
import api from './apiClient.js';

export const queueService = {
  getQueueStatus: (departmentId) => api.get(`/queue/status/${departmentId}`),
  getMyToken: () => api.get('/queue/my-token'),
};
