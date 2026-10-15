import client from './client';

export const pricingApi = {
  // Get price proposal details for customer review
  getPriceProposal: async (token) => {
    const res = await client.get(`/job/${token}/price`);
    return res.data;
  },

  // Confirm price proposal
  confirmPrice: async (token) => {
    const res = await client.post(`/job/${token}/price/confirm`);
    return res.data;
  },

  // Decline price proposal
  declinePrice: async (token) => {
    const res = await client.post(`/job/${token}/price/decline`);
    return res.data;
  },
};
