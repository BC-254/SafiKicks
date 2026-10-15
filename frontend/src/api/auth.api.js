import client from './client';

export const authApi = {
  login: async (credentials) => {
    const response = await client.post('/auth/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await client.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await client.get('/auth/me');
    return response.data;
  },

  getStaff: async () => {
    const response = await client.get('/owner/staff');
    return response.data;
  },

  createStaff: async (staffData) => {
    const response = await client.post('/owner/staff', staffData);
    return response.data;
  },

  updateStaff: async (id, staffData) => {
    const response = await client.patch(`/owner/staff/${id}`, staffData);
    return response.data;
  },
};
