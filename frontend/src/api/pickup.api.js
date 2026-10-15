import client from './client';

export const pickupApi = {
  // Customer or staff requests OTP dispatch to customer phone
  sendPickupCode: async (identifier) => {
    const res = await client.post(`/pickup/${identifier}/send-code`);
    return res.data;
  },

  // Staff verifies verbal 6-digit OTP told by customer
  verifyPickupCode: async (jobId, code) => {
    const res = await client.post(`/pickup/${jobId}/verify`, { code });
    return res.data;
  },

  // Invalidate old code and generate a fresh one
  requestNewCode: async (jobId) => {
    const res = await client.post(`/pickup/${jobId}/request-new-code`);
    return res.data;
  },

  // Check code attempts and pickup readiness
  getPickupStatus: async (jobId) => {
    const res = await client.get(`/pickup/${jobId}/status`);
    return res.data;
  },
};
