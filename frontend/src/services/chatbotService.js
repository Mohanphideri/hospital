
import api from './apiClient.js';

export const chatbotService = {
  sendMessage: (message, history) => api.post('/chatbot/message', { message, history }),
  getSuggestions: () => api.get('/chatbot/suggestions'),
};
