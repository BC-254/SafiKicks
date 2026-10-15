import client from './client';

export const receiptApi = {
  // Search for registered jobs
  lookupJobs: async (query, status) => {
    const res = await client.get('/receipt/lookup', {
      params: { q: query, ...(status ? { status } : {}) },
    });
    return res.data;
  },

  // Confirm physical handover and tag shoes
  receiveJob: async (jobId, data) => {
    const res = await client.post(`/receipt/${jobId}/receive`, data);
    return res.data;
  },

  // Upload intake photos (multipart form data)
  uploadPhotos: async (jobId, formData) => {
    const res = await client.post(`/receipt/${jobId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Counter staff creates walk-in job
  createStaffJob: async (data) => {
    const res = await client.post('/receipt/staff-job', data);
    return res.data;
  },

  // Directory of all jobs
  getCounterJobs: async (params = {}) => {
    const res = await client.get('/receipt/jobs', { params });
    return res.data;
  },

  // Complete job details for staff
  getJobDetail: async (jobId) => {
    const res = await client.get(`/receipt/jobs/${jobId}`);
    return res.data;
  },
};
