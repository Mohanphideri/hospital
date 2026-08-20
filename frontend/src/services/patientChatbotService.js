

import api from './apiClient.js';

export const patientChatbotService = {
  sendMessage: (message, history) => api.post('/patient-chatbot/message', { message, history }),
};
