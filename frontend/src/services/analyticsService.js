
import api from './apiClient.js';

export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
};
