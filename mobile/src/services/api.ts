import axios from 'axios';

// In production, this would be the actual API URL
// For emulator, use your machine's IP or localhost
const API_URL = 'http://10.0.2.2:3000/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchCards = async () => {
  const response = await api.get('/cards');
  return response.data.cards;
};

export const fetchEphemeralKey = async (cardId: string) => {
  const response = await api.post('/cards/ephemeral-key', { cardId });
  return response.data;
};

export const activateCard = async (cardId: string) => {
    const response = await api.post(`/cards/${cardId}/activate`);
    return response.data;
}

export default api;
