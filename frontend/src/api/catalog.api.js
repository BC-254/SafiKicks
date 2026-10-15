import client from './client';

export const catalogApi = {
  // Public catalog (for customer intake form)
  getActiveServices: async () => {
    const res = await client.get('/catalog');
    return res.data;
  },

  // Owner catalog (active + inactive)
  getAllServices: async () => {
    const res = await client.get('/owner/catalog');
    return res.data;
  },

  createService: async (serviceData) => {
    const res = await client.post('/owner/catalog', serviceData);
    return res.data;
  },

  updateService: async (id, serviceData) => {
    const res = await client.patch(`/owner/catalog/${id}`, serviceData);
    return res.data;
  },

  deactivateService: async (id) => {
    const res = await client.delete(`/owner/catalog/${id}`);
    return res.data;
  },
};
