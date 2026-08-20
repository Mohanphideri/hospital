
import api from './apiClient.js';

export const billingService = {
  create: (data) => api.post('/billing', data),
  getBills: (filters) => api.get('/billing', { params: filters }),
  getMyBills: () => api.get('/billing/my-bills'),
  getBillableItems: (appointmentCode) =>
    api.get(`/billing/billable/${encodeURIComponent(appointmentCode)}`),
  markPaid: (id, paymentMethod) => api.patch(`/billing/${id}/pay`, { paymentMethod }),
};
