
import api from './apiClient.js';

export const financeService = {
  getCashFlow: (from, to) => api.get('/finance/cashflow', { params: { from, to } }),
  createSalarySlip: (data) => api.post('/finance/salary-slips', data),
  getSalarySlips: (filters) => api.get('/finance/salary-slips', { params: filters }),
  markSalaryPaid: (id) => api.patch(`/finance/salary-slips/${id}/pay`),
  
  getMySalarySlips: () => api.get('/finance/my-salary-slips'),
};
