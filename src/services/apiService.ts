const BASE_URL = 'http://localhost:5000/api';

export const apiService = {
  // Auth
  login: async (phone: string, otp: string) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      return await response.json();
    } catch (error) {
      console.error('API Login Error:', error);
      throw error;
    }
  },

  // Generic GET Request
  get: async (endpoint: string) => {
    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error(`API GET Error [${endpoint}]:`, error);
      throw error;
    }
  }
};
