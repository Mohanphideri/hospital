
import api from './apiClient.js';

export const pharmacyService = {
  createPrescription: (data) => api.post('/pharmacy/prescriptions', data),
  getPrescriptions: (filters) => api.get('/pharmacy/prescriptions', { params: filters }),
  getMyPrescriptions: () => api.get('/pharmacy/my-prescriptions'),
  updateMedicineAvailability: (prescriptionId, medicineIndex, availability, medicineId, extra = {}) =>
    api.patch(`/pharmacy/prescriptions/${prescriptionId}/availability`, {
      medicineIndex,
      availability,
      medicineId,
      ...extra,
    }),
  
  setFulfillmentChoice: (prescriptionId, choice) =>
    api.patch(`/pharmacy/prescriptions/${prescriptionId}/fulfillment`, { choice }),
  addMedicine: (data) => api.post('/pharmacy/medicines', data),
  getMedicines: () => api.get('/pharmacy/medicines'),
  getExpiringBatches: (days) => api.get('/pharmacy/medicines/expiring', { params: { days } }),
  deleteMedicine: (id) => api.delete(`/pharmacy/medicines/${id}`),
  addBatch: (medicineId, data) => api.post(`/pharmacy/medicines/${medicineId}/batches`, data),
};
