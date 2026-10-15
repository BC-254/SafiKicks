import client from './client';

export const registrationApi = {
  // Step 1: Send SMS OTP
  verifyPhone: async (phone) => {
    const res = await client.post('/register/verify-phone', { phone });
    return res.data;
  },

  // Step 2: Validate OTP and get phone session token
  confirmPhone: async (phone, code) => {
    const res = await client.post('/register/confirm-phone', { phone, code });
    return res.data;
  },

  // Step 3: Register the job
  registerJob: async (data, phoneSessionToken) => {
    const res = await client.post('/register/job', data, {
      headers: {
        Authorization: `Bearer ${phoneSessionToken}`,
      },
    });
    return res.data;
  },

  // Public job tracking
  getJobStatus: async (accessToken) => {
    const res = await client.get(`/job/${accessToken}`);
    return res.data;
  },
};
