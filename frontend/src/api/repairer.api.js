import client from './client';

export const repairerApi = {
  // Fetch unassigned jobs in queue (FIFO)
  getQueue: async () => {
    const res = await client.get('/repairer/queue');
    return res.data;
  },

  // Claim a job atomically
  claimJob: async (jobId) => {
    const res = await client.post(`/repairer/jobs/${jobId}/claim`);
    return res.data;
  },

  // Propose price (in-band or out-of-band)
  proposePrice: async (jobId, data) => {
    const res = await client.post(`/repairer/jobs/${jobId}/price`, data);
    return res.data;
  },

  // Fetch claimed jobs for this repairer
  getClaimedJobs: async (params = {}) => {
    const res = await client.get('/repairer/jobs', { params });
    return res.data;
  },

  // Full job inspection view for repairer
  getJobDetail: async (jobId) => {
    const res = await client.get(`/repairer/jobs/${jobId}`);
    return res.data;
  },

  // Update status (e.g., Started -> Completed or Started -> On Hold)
  updateStatus: async (jobId, data) => {
    const res = await client.patch(`/repairer/jobs/${jobId}/status`, data);
    return res.data;
  },

  // Upload completion photos
  uploadCompletionPhotos: async (jobId, formData) => {
    const res = await client.post(`/repairer/jobs/${jobId}/completion-photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Repairer stats and recent activity
  getActivity: async () => {
    const res = await client.get('/repairer/activity');
    return res.data;
  },
};
