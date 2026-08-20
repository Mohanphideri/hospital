
import api from './apiClient.js';

export const auditLogService = {
  getLogs: (filters) => api.get('/audit-logs', { params: filters }),
};
