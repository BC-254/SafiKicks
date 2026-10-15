import client from './client';

export const approvalApi = {
  // Fetch pending approvals for owner review
  getPendingApprovals: async (type = null) => {
    const res = await client.get('/owner/approvals', {
      params: type ? { type } : {},
    });
    return res.data;
  },

  // Approve or reject an approval request
  decideApproval: async (id, data) => {
    const res = await client.post(`/owner/approvals/${id}/decide`, data);
    return res.data;
  },

  // Owner direct override for pickup without code
  ownerPickupOverride: async (data) => {
    const res = await client.post('/owner/pickup-override', data);
    return res.data;
  },
};
