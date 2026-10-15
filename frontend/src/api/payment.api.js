import client from './client';

export const paymentApi = {
  // Record customer payment (cash, mpesa, card)
  recordPayment: async (data) => {
    const res = await client.post('/counter/payments', data);
    return res.data;
  },

  // Record payment reversal (owner only)
  recordReversal: async (data) => {
    const res = await client.post('/counter/payments/reversal', data);
    return res.data;
  },

  // Fetch full payment ledger and balance summary for a job
  getJobPayments: async (jobId) => {
    const res = await client.get(`/counter/jobs/${jobId}/payments`);
    return res.data;
  },

  // Request/apply owner payment override for pickup
  overridePayment: async (data) => {
    const res = await client.post('/counter/override', data);
    return res.data;
  },
};
